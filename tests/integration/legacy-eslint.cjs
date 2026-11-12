/* eslint-disable @typescript-eslint/no-require-imports */
// Runs ESLint 8 with the legacy .eslintrc.cjs config in a process of its own, so typescript-eslint
// builds a fresh program that already contains the file under test (its in-process program cache does
// not reliably pick up files created after the first lint). The plugin is preloaded through the class
// API because this repo has no node_modules/eslint-plugin-sitecore-jss to resolve by name.
//
// Usage: node legacy-eslint.cjs <projectDir> <file> [--fix]
// Prints JSON: { messages, errorCount, warningCount, output }
const path = require("path");

const [projectDir, file, flag] = process.argv.slice(2);
const root = path.resolve(__dirname, "../..");
const plugin = require(path.join(root, "dist/index.js"));
const { ESLint } = require("eslint");

(async () => {
  const fix = flag === "--fix";
  const eslint = new ESLint({
    cwd: projectDir,
    useEslintrc: false,
    overrideConfigFile: ".eslintrc.cjs",
    plugins: { "sitecore-jss": plugin },
    fix,
  });
  const results = await eslint.lintFiles([file]);
  if (fix) await ESLint.outputFixes(results);
  const [result] = results;
  process.stdout.write(
    JSON.stringify({
      messages: result.messages,
      errorCount: result.errorCount,
      warningCount: result.warningCount,
      output: result.output ?? null,
    })
  );
})().catch((error) => {
  console.error(error);
  process.exit(2);
});
