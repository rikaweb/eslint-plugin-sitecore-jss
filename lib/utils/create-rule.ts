import { ESLintUtils } from "@typescript-eslint/utils";

export interface PluginDocs {
  description: string;
  /** Whether the rule is part of the plugin's `recommended` configs. */
  recommended?: boolean;
  /** Every rule in this plugin needs type information (`parserOptions.project` / `projectService`). */
  requiresTypeChecking?: boolean;
}

export const createRule = ESLintUtils.RuleCreator<PluginDocs>(
  (name) =>
    `https://github.com/rikaweb/eslint-plugin-sitecore-jss/blob/main/docs/rules/${name}.md`
);
