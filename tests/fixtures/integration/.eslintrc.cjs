// Legacy (eslintrc) config used by tests/integration/cli.test.ts on ESLint 8.
// A .cjs file so `tsconfigRootDir` can be absolute; a JSON config would resolve the
// project relative to process.cwd(), which is the repo root when the suite runs.
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["sitecore-jss"],
  extends: ["plugin:sitecore-jss/recommended"],
};
