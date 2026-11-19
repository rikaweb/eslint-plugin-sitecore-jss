#!/usr/bin/env node
// Prints one JSON object describing the Sitecore front-end project around a directory:
// package family (JSS / Content SDK), Next.js router, ESLint setup and whether
// eslint-plugin-sitecore-jss is installed and configured. Read-only; no dependencies.
//
//   node detect-project.mjs [startDir]
//
// Used by /jss:review and /jss:component so that both start from the same facts.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import process from "node:process";

const LINTER = "eslint-plugin-sitecore-jss";
const FAMILIES = {
  "content-sdk": ["@sitecore-content-sdk/nextjs", "@sitecore-content-sdk/react"],
  jss: ["@sitecore-jss/sitecore-jss-nextjs", "@sitecore-jss/sitecore-jss-react"],
};
const FLAT_CONFIGS = ["js", "mjs", "cjs", "ts", "mts", "cts"].map((ext) => `eslint.config.${ext}`);
const LEGACY_CONFIGS = [
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.json",
  ".eslintrc.yml",
  ".eslintrc.yaml",
];

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
};
const isDir = (path) => existsSync(path) && statSync(path).isDirectory();

/** Nearest directory at or above `start` that has a package.json. */
function findRoot(start) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** Version of an installed package, looking in `root` and its ancestors (workspaces hoist). */
function installedVersion(root, name) {
  let dir = root;
  for (;;) {
    const pkg = readJson(join(dir, "node_modules", name, "package.json"));
    if (pkg) return pkg.version;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** True when the directory tree holds a file whose name matches `pattern` (bounded walk). */
function hasFile(dir, pattern, depth = 4) {
  if (!isDir(dir) || depth < 0) return false;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && pattern.test(entry.name)) return true;
    if (entry.isDirectory() && hasFile(join(dir, entry.name), pattern, depth - 1)) return true;
  }
  return false;
}

function detectRouter(root) {
  const first = (names) => names.map((name) => join(root, name)).find(isDir);
  const appDir = first(["src/app", "app"]);
  const pagesDir = first(["src/pages", "pages"]);
  const app = appDir !== undefined && hasFile(appDir, /^(page|layout)\.(tsx|jsx|ts|js)$/);
  // `pages/api` alone does not make a Pages Router app, and neither do the error pages
  // (`404`, `500`, `_error`) that an App Router project may keep in `pages/`.
  const isRoute = (entry) =>
    entry.isDirectory()
      ? entry.name !== "api"
      : /\.(tsx|jsx|ts|js|mdx)$/.test(entry.name) && !/^(404|500|_error|_document)\./.test(entry.name);
  const pages = pagesDir !== undefined && readdirSync(pagesDir, { withFileTypes: true }).some(isRoute);
  return { router: app && pages ? "both" : app ? "app" : pages ? "pages" : "unknown", appDir, pagesDir };
}

function detectEslintConfig(root, pkg) {
  const flat = FLAT_CONFIGS.find((name) => existsSync(join(root, name)));
  const legacy = LEGACY_CONFIGS.find((name) => existsSync(join(root, name)));
  const file = flat ?? legacy;
  const format = flat ? "flat" : legacy ? "legacy" : pkg.eslintConfig ? "legacy" : "none";
  const text = file ? readFileSync(join(root, file), "utf8") : JSON.stringify(pkg.eslintConfig ?? "");
  return {
    format,
    file: file ?? (pkg.eslintConfig ? "package.json#eslintConfig" : null),
    // Text heuristics: a config can pull these in through another module.
    // Not a bare /sitecore-jss/: a JSS project's config can name `@sitecore-jss/...` packages.
    mentionsLinter: /eslint-plugin-sitecore-jss|(?<![@/\w-])sitecore-jss(?![\w-])/.test(text),
    mentionsTypeInfo: /projectService|\bproject\s*:|"project"\s*:/.test(text),
  };
}

function changedTsx(root) {
  // `-z` output is NUL-separated and unquoted, so names with spaces or non-ASCII characters survive.
  const git = (args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\0")
      .filter(Boolean);
  const tryGit = (args) => {
    try {
      return git(args);
    } catch {
      return []; // e.g. `diff HEAD` in a repository that has no commit yet
    }
  };
  try {
    const top = git(["rev-parse", "--show-toplevel"])[0].trim();
    // Tracked changes against HEAD plus untracked .tsx files inside this project. Git reports
    // paths relative to the repository top, which can be above the project in a monorepo.
    const files = [
      ...tryGit(["diff", "--name-only", "-z", "--diff-filter=d", "HEAD"]),
      ...git(["ls-files", "-z", "--others", "--exclude-standard", "--full-name"]),
    ];
    return [...new Set(files)]
      .map((file) => relative(root, resolve(top, file)).replace(/\\/g, "/"))
      .filter((file) => !file.startsWith("..") && file.endsWith(".tsx"));
  } catch {
    return null; // not a git repository, or git is unavailable
  }
}

const start = process.argv[2] ?? process.cwd();
const root = findRoot(start);
if (!root) {
  process.stdout.write(`${JSON.stringify({ error: `No package.json found at or above ${resolve(start)}` }, null, 2)}
`);
  process.exit(0);
}

const pkg = readJson(join(root, "package.json")) ?? {};
const dependenciesOf = (manifest) => ({
  ...manifest?.dependencies,
  ...manifest?.devDependencies,
  ...manifest?.peerDependencies,
});
const declared = dependenciesOf(pkg);

/** Range a package is declared with, here or in a package.json above (a workspace root). */
function declaredRange(name) {
  if (declared[name]) return declared[name];
  for (let dir = dirname(root); ; dir = dirname(dir)) {
    const range = dependenciesOf(readJson(join(dir, "package.json")))[name];
    if (range) return range;
    if (dirname(dir) === dir) return null;
  }
}
// Tooling (ESLint, the linter, TypeScript) is often declared once at a workspace root; the
// Sitecore packages decide the family, so only this project's own package.json counts for them.
const packageInfo = (name, { ownOnly = false } = {}) => ({
  name,
  declared: (ownOnly ? declared[name] : declaredRange(name)) ?? null,
  installed: installedVersion(root, name) ?? null,
});

const sitecorePackages = Object.entries(FAMILIES).flatMap(([family, names]) =>
  names.filter((name) => declared[name] || installedVersion(root, name)).map((name) => ({ family, ...packageInfo(name, { ownOnly: true }) })),
);
const families = [...new Set(sitecorePackages.filter((p) => p.declared).map((p) => p.family))];
const eslintConfig = detectEslintConfig(root, pkg);
const linter = packageInfo(LINTER);
const eslint = packageInfo("eslint");

const LOCKFILES = {
  "package-lock.json": "npm",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "bun.lockb": "bun",
  "bun.lock": "bun",
};
/** Package manager from the nearest lockfile at or above the project (workspaces keep it at the top). */
function packageManager(start) {
  let dir = start;
  for (;;) {
    const lock = Object.keys(LOCKFILES).find((name) => existsSync(join(dir, name)));
    if (lock) return LOCKFILES[lock];
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const result = {
  root: root.replace(/\\/g, "/"),
  packageManager: packageManager(root),
  node: process.versions.node,
  // "content-sdk", "jss", "both" (a migration in progress) or "none".
  family: families.length === 1 ? families[0] : families.length > 1 ? "both" : "none",
  // The package to import field components from: the Next.js flavour when the app has it.
  importSource:
    sitecorePackages.find((p) => p.declared && /nextjs$/.test(p.name))?.name ??
    sitecorePackages.find((p) => p.declared)?.name ??
    null,
  sitecorePackages,
  next: packageInfo("next"),
  react: packageInfo("react"),
  ...detectRouter(root),
  typescript: packageInfo("typescript"),
  componentsDir: ["src/components", "components"].find((dir) => isDir(join(root, dir))) ?? null,
  // The starters' shared `ComponentProps` type (rendering + params), when the project has it.
  sharedPropsType:
    ["src/lib/component-props", "lib/component-props"].find(
      (path) => isDir(join(root, path)) || existsSync(join(root, `${path}.ts`)),
    ) ?? null,
  componentMap: [".sitecore/component-map.ts", "src/temp/componentBuilder.ts"].filter((file) =>
    existsSync(join(root, file)),
  ),
  eslint: { ...eslint, config: eslintConfig, parser: packageInfo("@typescript-eslint/parser") },
  linter: {
    ...linter,
    // Ready when the package is a declared dependency, installed, and named in the ESLint config.
    status: !linter.installed
      ? linter.declared
        ? "declared-not-installed"
        : "not-installed"
      : !linter.declared
        ? "installed-not-declared" // a leftover in node_modules: a clean install removes it
        : eslintConfig.mentionsLinter
          ? "configured"
          : "installed-not-configured",
    ruleDocsDir: linter.installed ? `node_modules/${LINTER}/docs/rules` : null,
  },
  scripts: Object.fromEntries(
    Object.entries(pkg.scripts ?? {}).filter(([name]) =>
      /lint|type|tsc|generate-map|bootstrap|^dev$|^build$|format|prettier/.test(name),
    ),
  ),
  changedTsx: changedTsx(root),
};
for (const key of ["appDir", "pagesDir"]) {
  result[key] = result[key] ? relative(root, result[key]).replace(/\\/g, "/") : null;
}

process.stdout.write(`${JSON.stringify(result, null, 2)}
`);
