// Legacy (eslintrc) config used by tests/integration/cli.test.ts on ESLint 8.
// A .cjs file so `tsconfigRootDir` can be absolute; a JSON config would resolve the
// project relative to process.cwd(), which is the repo root when the suite runs.
//
// Same shape as the README's legacy example: parser, project and the plugin config live inside
// `overrides`, so plain JavaScript files (next.config.js) are not parsed with the TypeScript project
// and the type-aware rules never run on them.
module.exports = {
  root: true,
  overrides: [
    {
      files: ["*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      extends: ["plugin:sitecore-jss/recommended"],
    },
  ],
};
