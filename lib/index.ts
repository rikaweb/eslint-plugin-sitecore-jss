import type { TSESLint } from "@typescript-eslint/utils";
import enforceAllComponents from "./rules/enforce-all-components";
import enforceFileComponent from "./rules/enforce-file-component";
import enforceImageComponent from "./rules/enforce-image-component";
import enforceLinkComponent from "./rules/enforce-link-component";
import enforceRichTextComponent from "./rules/enforce-richtext-component";
import enforceTextComponent from "./rules/enforce-text-component";

// package.json lives outside rootDir, so read it at runtime instead of importing it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require("../package.json") as { name: string; version: string };

const PLUGIN_NAME = "sitecore-jss";

const rules: Record<string, TSESLint.LooseRuleDefinition> = {
  "enforce-text-component": enforceTextComponent,
  "enforce-richtext-component": enforceRichTextComponent,
  "enforce-image-component": enforceImageComponent,
  "enforce-link-component": enforceLinkComponent,
  "enforce-file-component": enforceFileComponent,
  // Deprecated meta-rule kept for backward compatibility; prefer the configs below.
  "enforce-all-components": enforceAllComponents,
};

type Severity = "warn" | "error";
type PluginConfigs = Record<
  string,
  TSESLint.ClassicConfig.Config | TSESLint.FlatConfig.ConfigArray
>;

const componentRuleNames = Object.keys(rules).filter(
  (name) => name !== "enforce-all-components"
);

function ruleSet(severity: Severity): Record<string, Severity> {
  return Object.fromEntries(
    componentRuleNames.map((name) => [`${PLUGIN_NAME}/${name}`, severity])
  );
}

const plugin = {
  meta: { name: pkg.name, version: pkg.version },
  rules,
  configs: {} as PluginConfigs,
};

// Legacy (.eslintrc) configs: `extends: ["plugin:sitecore-jss/recommended"]`
const legacyRecommended: TSESLint.ClassicConfig.Config = {
  plugins: [PLUGIN_NAME],
  rules: ruleSet("warn"),
};
const legacyStrict: TSESLint.ClassicConfig.Config = {
  plugins: [PLUGIN_NAME],
  rules: ruleSet("error"),
};

// Flat configs (ESLint 9+): `import sitecoreJss from "eslint-plugin-sitecore-jss"`
// then spread `sitecoreJss.configs["flat/recommended"]` into your config array.
const flatRecommended: TSESLint.FlatConfig.ConfigArray = [
  {
    name: `${PLUGIN_NAME}/recommended`,
    plugins: { [PLUGIN_NAME]: plugin },
    rules: ruleSet("warn"),
  },
];
const flatStrict: TSESLint.FlatConfig.ConfigArray = [
  {
    name: `${PLUGIN_NAME}/strict`,
    plugins: { [PLUGIN_NAME]: plugin },
    rules: ruleSet("error"),
  },
];

Object.assign(plugin.configs, {
  recommended: legacyRecommended,
  // `all` is kept as an alias of `recommended` (same rules, same severity as v1).
  all: legacyRecommended,
  strict: legacyStrict,
  "flat/recommended": flatRecommended,
  "flat/all": flatRecommended,
  "flat/strict": flatStrict,
} satisfies PluginConfigs);

export = plugin;
