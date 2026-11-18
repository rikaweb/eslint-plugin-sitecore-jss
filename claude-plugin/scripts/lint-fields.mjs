#!/usr/bin/env node
// Runs the project's own ESLint on the given files and prints a compact JSON summary of the
// eslint-plugin-sitecore-jss findings: position, rule, message id, the source line, and whether
// ESLint carries an automatic fix. Never writes files (no --fix).
//
//   node lint-fields.mjs <file|dir|glob> [...]      (run from the project root)
//
// Used by /jss:review so that the explanation starts from the same facts every time, without
// pasting ESLint's full JSON output into the conversation.
import { createRequire } from "node:module";
import { existsSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const PREFIX = "sitecore-jss/";
const cwd = process.cwd();
const print = (value) => process.stdout.write(`${JSON.stringify(value, null, 2)}
`);

const patterns = process.argv.slice(2).map((arg) => {
  // A folder means its .tsx files: the rules only look at JSX in type-checked TypeScript.
  const full = resolve(cwd, arg);
  const isDir = existsSync(full) && statSync(full).isDirectory();
  return isDir ? `${arg.replace(/[\\/]+$/, "").replace(/\\/g, "/")}/**/*.tsx` : arg.replace(/\\/g, "/");
});
if (patterns.length === 0) {
  print({ error: "No files given. Usage: node lint-fields.mjs <file|dir|glob> [...]" });
  process.exit(0);
}

let eslintModule;
try {
  // Resolve ESLint from the project, not from this plugin.
  const require = createRequire(pathToFileURL(join(cwd, "package.json")));
  eslintModule = await import(pathToFileURL(require.resolve("eslint")).href);
} catch {
  print({ error: `ESLint is not installed in ${cwd}. Run this from the project root.`, kind: "no-eslint" });
  process.exit(0);
}

let results;
let version;
try {
  // loadESLint (ESLint 8.57+) picks the flat or the legacy class from the project's config.
  const ESLint = eslintModule.loadESLint ? await eslintModule.loadESLint({ cwd }) : eslintModule.ESLint;
  version = ESLint.version;
  results = await new ESLint({ cwd, errorOnUnmatchedPattern: false }).lintFiles(patterns);
} catch (error) {
  const message = String(error?.message ?? error);
  print({
    error: message.split("\n").slice(0, 6).join("\n"),
    kind: /requires type information|parserServices/.test(message)
      ? "no-type-information"
      : /Cannot find (package|module)|Failed to load plugin/.test(message)
        ? "missing-dependency"
        : "eslint-failed",
  });
  process.exit(0);
}

const findings = [];
const fatal = [];
const clean = [];
let importFixes = 0;
let otherRules = 0;

for (const result of results) {
  const file = relative(cwd, result.filePath).replace(/\\/g, "/");
  const lines = (result.source ?? "").split(/\r?\n/);
  let own = 0;
  for (const message of result.messages) {
    if (message.fatal || message.ruleId === null) {
      fatal.push({ file, line: message.line, message: message.message });
    } else if (!message.ruleId.startsWith(PREFIX)) {
      otherRules += 1;
    } else if (message.messageId === "missingImport") {
      // Belongs to the element finding beside it; its fix only adds the import.
      importFixes += 1;
      own += 1;
    } else {
      own += 1;
      findings.push({
        file,
        line: message.line,
        column: message.column,
        rule: message.ruleId.slice(PREFIX.length),
        messageId: message.messageId,
        severity: message.severity === 2 ? "error" : "warn",
        fixable: message.fix !== undefined,
        source: (lines[message.line - 1] ?? "").trim(),
        message: message.message,
      });
    }
  }
  if (own === 0 && !result.messages.some((m) => m.fatal)) clean.push(file);
}

const fixable = findings.filter((finding) => finding.fixable).length;
print({
  eslint: version,
  filesLinted: results.length,
  // Element findings only: `missingImport` messages are counted in importFixes.
  counts: { findings: findings.length, fixable, manual: findings.length - fixable, importFixes, otherRules },
  findings,
  cleanFiles: clean,
  fatal,
  ...(results.length === 0 ? { note: "No file matched. The flat configs only apply to .tsx files." } : {}),
});
