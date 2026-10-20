// Flat config used by tests/integration/cli.test.ts on ESLint 9 and 10.
// The plugin is loaded from the build output exactly as a consumer's node_modules copy would be.
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
  ...sitecoreJss.configs["flat/recommended"],
];
