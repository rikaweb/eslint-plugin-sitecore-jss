import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// The entry point uses `export =` (CommonJS), so exercise the built artifact exactly the way
// ESLint loads it. `npm test` builds first via the `pretest` script.
const load = createRequire(import.meta.url);
const plugin = load("../dist/index.js");
const pkg = load("../package.json");

const COMPONENT_RULES = [
  "enforce-text-component",
  "enforce-richtext-component",
  "enforce-image-component",
  "enforce-link-component",
  "enforce-file-component",
];

const severityMap = (severity: "warn" | "error") =>
  Object.fromEntries(COMPONENT_RULES.map((name) => [`sitecore-jss/${name}`, severity]));

describe("plugin entry (dist/index.js)", () => {
  it("exposes meta taken from package.json", () => {
    expect(plugin.meta).toEqual({ name: pkg.name, version: pkg.version });
  });

  it("registers every rule", () => {
    expect(Object.keys(plugin.rules).sort()).toEqual(
      [...COMPONENT_RULES, "enforce-all-components"].sort()
    );
  });

  it("every rule declares messages, an options schema and code fixes", () => {
    for (const [name, rule] of Object.entries<{ meta: Record<string, unknown>; create: unknown }>(
      plugin.rules
    )) {
      expect(rule.meta.messages, name).toBeTruthy();
      expect(rule.meta.schema, name).toEqual([]);
      expect(rule.meta.fixable, name).toBe("code");
      expect(typeof rule.create, name).toBe("function");
    }
  });

  it("flat/recommended enables the component rules as warnings and references the plugin object", () => {
    const configs = plugin.configs["flat/recommended"];
    expect(Array.isArray(configs)).toBe(true);
    expect(configs).toHaveLength(1);
    expect(configs[0].name).toBe("sitecore-jss/recommended");
    expect(configs[0].plugins["sitecore-jss"]).toBe(plugin);
    expect(configs[0].rules).toEqual(severityMap("warn"));
  });

  it("flat/strict enables the component rules as errors", () => {
    const [config] = plugin.configs["flat/strict"];
    expect(config.plugins["sitecore-jss"]).toBe(plugin);
    expect(config.rules).toEqual(severityMap("error"));
  });

  it("flat/all is an alias of flat/recommended", () => {
    expect(plugin.configs["flat/all"]).toBe(plugin.configs["flat/recommended"]);
  });

  it("legacy configs reference the plugin by name", () => {
    expect(plugin.configs.recommended).toEqual({
      plugins: ["sitecore-jss"],
      rules: severityMap("warn"),
    });
    expect(plugin.configs.all).toBe(plugin.configs.recommended);
    expect(plugin.configs.strict).toEqual({
      plugins: ["sitecore-jss"],
      rules: severityMap("error"),
    });
  });

  it("does not enable the deprecated meta-rule in any config", () => {
    for (const [name, config] of Object.entries<unknown>(plugin.configs)) {
      const entries = Array.isArray(config) ? config : [config];
      for (const entry of entries as Array<{ rules: Record<string, unknown> }>) {
        expect(entry.rules, name).not.toHaveProperty("sitecore-jss/enforce-all-components");
      }
    }
  });
});
