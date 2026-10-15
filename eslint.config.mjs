// ESLint config for this repository's own source (not the config consumers use).
// @ts-check
import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/", "docs/", "coverage/", "node_modules/", "tests/fixtures/"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      // Rule objects are built from plain literals until the RuleCreator rewrite (Phase 3).
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);
