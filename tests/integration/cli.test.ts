// End-to-end: the built plugin (dist/) loaded by the real ESLint installed in this repo, against the
// fixture project in tests/fixtures/integration. CI runs this under ESLint 8.57, 9 and 10.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const load = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const projectDir = path.join(repoRoot, "tests/fixtures/integration");
// "eslint/bin/eslint.js" is not in the package exports map, so resolve it through package.json.
const eslintBin = path.join(path.dirname(load.resolve("eslint/package.json")), "bin/eslint.js");
const eslintMajor = Number(load("eslint/package.json").version.split(".")[0]);

const SAMPLE = path.join(projectDir, "src/Sample.tsx");
const SCRATCH = path.join(projectDir, "src/__fixme__.tsx");

interface LintMessage {
  fatal?: boolean;
  message: string;
  ruleId: string | null;
  messageId?: string;
  severity: number;
  fix?: unknown;
}
interface LintResult {
  messages: LintMessage[];
  errorCount: number;
  warningCount: number;
}

/** 14 element findings + 4 missing-import reports (RichText is already imported in the sample). */
const EXPECTED_BY_RULE = {
  "sitecore-jss/enforce-text-component": 7,
  "sitecore-jss/enforce-richtext-component": 4,
  "sitecore-jss/enforce-image-component": 3,
  "sitecore-jss/enforce-link-component": 2,
  "sitecore-jss/enforce-file-component": 2,
};
const EXPECTED_TOTAL = 18;
const EXPECTED_FIXABLE = 16;
const UNFIXABLE = ["useTextComponent", "useTextComponentInWrapper"];
const COMPONENTS = ["Text", "RichText", "Image", "Link", "File"];

function countByRule(messages: LintMessage[]): Record<string, number> {
  const fatal = messages.find((message) => message.fatal);
  if (fatal) throw new Error(`ESLint reported a fatal problem:\n${fatal.message}`);
  const counts: Record<string, number> = {};
  for (const message of messages) {
    const key = message.ruleId ?? "(fatal)";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Specifier list of the sample's (multi-line) import from the JSS package, after fixes. */
function sitecoreImportSpecifiers(file: string): string {
  const match = /import\s*\{([^}]*)\}\s*from\s*"@sitecore-jss\/sitecore-jss-nextjs"/.exec(
    fs.readFileSync(file, "utf8")
  );
  if (!match) throw new Error(`no import from @sitecore-jss/sitecore-jss-nextjs found in ${file}`);
  return match[1];
}

afterEach(() => {
  fs.rmSync(SCRATCH, { force: true });
});

describe.skipIf(eslintMajor < 9)(`ESLint ${eslintMajor} CLI with the flat config`, () => {
  function runCli(args: string[]): { results: LintResult[]; stderr: string; status: number | null } {
    const run = spawnSync(process.execPath, [eslintBin, "--format", "json", ...args], {
      cwd: projectDir,
      encoding: "utf8",
    });
    if (!run.stdout) {
      throw new Error(`eslint printed no JSON (status ${run.status}):\n${run.stderr}`);
    }
    return { results: JSON.parse(run.stdout) as LintResult[], stderr: run.stderr, status: run.status };
  }

  it("reports every finding in the sample and prints nothing on stderr", () => {
    const { results, stderr, status } = runCli(["src/Sample.tsx"]);
    expect(stderr.trim()).toBe("");
    expect(status).toBe(0); // warnings only
    const [result] = results;
    expect(countByRule(result.messages)).toEqual(EXPECTED_BY_RULE);
    expect(result.warningCount).toBe(EXPECTED_TOTAL);
    expect(result.errorCount).toBe(0);
    expect(result.messages.filter((message) => message.fix).length).toBe(EXPECTED_FIXABLE);
  });

  it("flat/strict reports the same findings as errors", () => {
    const { results, status } = runCli(["-c", "eslint.strict.config.mjs", "src/Sample.tsx"]);
    expect(status).toBe(1);
    expect(results[0].errorCount).toBe(EXPECTED_TOTAL);
    expect(results[0].warningCount).toBe(0);
  });

  it("--fix converges: every import is added and only the unfixable findings remain", () => {
    fs.copyFileSync(SAMPLE, SCRATCH);
    const fixRun = runCli(["--fix", "src/__fixme__.tsx"]);
    expect(fixRun.stderr.trim()).toBe("");

    const specifiers = sitecoreImportSpecifiers(SCRATCH);
    for (const component of COMPONENTS) expect(specifiers).toContain(component);

    const { results } = runCli(["src/__fixme__.tsx"]);
    expect(results[0].messages.map((message) => message.messageId).sort()).toEqual(UNFIXABLE);
  });
});

describe.skipIf(eslintMajor >= 9)(`ESLint ${eslintMajor} with a legacy .eslintrc.cjs config`, () => {
  // ESLint 8 resolves `plugins: ["sitecore-jss"]` from node_modules, which this repo does not contain
  // itself, so the plugin is preloaded through the ESLint class API — the same code path the CLI uses.
  const plugin = load("../../dist/index.js");
  const { ESLint } = load("eslint");

  function createEngine(fix: boolean) {
    return new ESLint({
      cwd: projectDir,
      useEslintrc: false,
      overrideConfigFile: ".eslintrc.cjs",
      plugins: { "sitecore-jss": plugin },
      fix,
    });
  }

  it("reports every finding through plugin:sitecore-jss/recommended", async () => {
    const [result] = (await createEngine(false).lintFiles(["src/Sample.tsx"])) as LintResult[];
    expect(countByRule(result.messages)).toEqual(EXPECTED_BY_RULE);
    expect(result.warningCount).toBe(EXPECTED_TOTAL);
    expect(result.errorCount).toBe(0);
  });

  it("fix converges: every import is added and only the unfixable findings remain", async () => {
    fs.copyFileSync(SAMPLE, SCRATCH);
    const results = await createEngine(true).lintFiles(["src/__fixme__.tsx"]);
    await ESLint.outputFixes(results);

    const specifiers = sitecoreImportSpecifiers(SCRATCH);
    for (const component of COMPONENTS) expect(specifiers).toContain(component);

    const [after] = (await createEngine(false).lintFiles(["src/__fixme__.tsx"])) as LintResult[];
    expect(after.messages.map((message) => message.messageId).sort()).toEqual(UNFIXABLE);
  });
});
