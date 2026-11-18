// Same as eslint.config.mjs but with the `flat/strict` config (every rule as an error).
import tsParser from "@typescript-eslint/parser";
import sitecoreJss from "../../../dist/index.js";

export default [
  {
    files: ["**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
  },
  ...sitecoreJss.configs["flat/strict"],
];
