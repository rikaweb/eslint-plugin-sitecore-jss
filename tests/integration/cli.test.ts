// End-to-end: the built plugin (dist/) loaded by the real ESLint installed in this repo, against the
// fixture project in tests/fixtures/integration. CI runs this under ESLint 8.57, 9 and 10.
//
// Every lint runs in a process of its own (the ESLint CLI, or tests/integration/legacy-eslint.cjs for
// the ESLint 8 class API), so typescript-eslint builds a fresh program that already contains the file
// under test; its in-process program cache does not reliably pick up files created mid-process.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const load = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const projectDir = path.join(repoRoot, "tests/fixtures/integration");
// "eslint/bin/eslint.js" is not in the package exports map, so resolve it through package.json.
const eslintBin = path.join(path.dirname(load.resolve("eslint/package.json")), "bin/eslint.js");
const legacyRunner = path.join(testDir, "legacy-eslint.cjs");
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
  output?: string | null;
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

function messageIds(result: LintResult): string[] {
  return result.messages.map((message) => message.messageId ?? "(none)").sort();
}

/**
 * Local names imported from the JSS package in `file`, as exact identifiers. (A substring check
 * would pass vacuously: the sample already imports `TextField`, `ImageField`, `LinkField`, `FileField`.)
 */
function importedFromJss(file: string): string[] {
  const match = /import\s*\{([^}]*)\}\s*from\s*"@sitecore-jss\/sitecore-jss-nextjs"/.exec(
    fs.readFileSync(file, "utf8")
  );
  if (!match) throw new Error(`no import from @sitecore-jss/sitecore-jss-nextjs found in ${file}`);
  return match[1]
    .split(",")
    .map((specifier) => specifier.trim().split(/\s+as\s+/).pop() ?? "")
    .filter(Boolean);
}

function expectAllComponentsImported(file: string): void {
  const imported = importedFromJss(file);
  for (const component of COMPONENTS) expect(imported, imported.join(", ")).toContain(component);
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
    expectAllComponentsImported(SCRATCH);

    const { results } = runCli(["src/__fixme__.tsx"]);
    expect(messageIds(results[0])).toEqual(UNFIXABLE);
  });
});

describe.skipIf(eslintMajor >= 9)(`ESLint ${eslintMajor} with a legacy .eslintrc.cjs config`, () => {
  function runLegacy(file: string, fix = false): LintResult {
    const run = spawnSync(
      process.execPath,
      [legacyRunner, projectDir, file, ...(fix ? ["--fix"] : [])],
      { cwd: repoRoot, encoding: "utf8" }
    );
    if (run.status !== 0 || !run.stdout) {
      throw new Error(`legacy runner failed (status ${run.status}):\n${run.stderr}`);
    }
    return JSON.parse(run.stdout) as LintResult;
  }

  it("reports every finding through plugin:sitecore-jss/recommended", () => {
    const result = runLegacy("src/Sample.tsx");
    expect(countByRule(result.messages)).toEqual(EXPECTED_BY_RULE);
    expect(result.warningCount).toBe(EXPECTED_TOTAL);
    expect(result.errorCount).toBe(0);
  });

  it("fix converges: every import is added and only the unfixable findings remain", () => {
    fs.copyFileSync(SAMPLE, SCRATCH);
    const fixRun = runLegacy("src/__fixme__.tsx", true);
    expect(fixRun.output, "the fix run should rewrite the file").toBeTruthy();
    expectAllComponentsImported(SCRATCH);

    const after = runLegacy("src/__fixme__.tsx");
    expect(messageIds(after)).toEqual(UNFIXABLE);
  });
});
