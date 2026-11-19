import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Keeps the Claude Code plugin in `claude-plugin/` in step with the linter: a rule or message id
// that is added, renamed or removed in `lib/` must also be explained in the skill's `linter.md`.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = createRequire(import.meta.url);
const plugin = load("../dist/index.js") as {
  rules: Record<string, { meta: { messages?: Record<string, string> } }>;
};

const read = (...path: string[]) => readFileSync(join(root, ...path), "utf8");
const readJson = (...path: string[]) => JSON.parse(read(...path)) as Record<string, unknown>;

const pluginDir = "claude-plugin";
const skillsDir = join(pluginDir, "skills");
const linterDoc = read(skillsDir, "sitecore-fields", "references", "linter.md");
// Names written as inline code in the document, e.g. `useTextComponent`.
const documented = new Set([...linterDoc.matchAll(/`([\w-]+)`/g)].map((match) => match[1]));

describe("claude-plugin: linter.md covers the rules", () => {
  const rules = Object.entries(plugin.rules);

  it.each(rules.map(([name]) => name))("documents the rule %s", (name) => {
    expect(documented, `add \`${name}\` to ${skillsDir}/sitecore-fields/references/linter.md`).toContain(name);
  });

  const messageIds = [...new Set(rules.flatMap(([, rule]) => Object.keys(rule.meta.messages ?? {})))];

  it.each(messageIds)("documents the message id %s", (messageId) => {
    expect(
      documented,
      `add \`${messageId}\` to the "Rules and message ids" tables in linter.md and bump the plugin version`,
    ).toContain(messageId);
  });

  it("does not document a message id that no rule has", () => {
    const table = linterDoc.slice(
      linterDoc.indexOf("## Rules and message ids"),
      linterDoc.indexOf("## Findings without a fix"),
    );
    // Message ids are camelCase and start with a verb the rules use.
    const listed = [...table.matchAll(/`((?:use|avoid|missing)[A-Z]\w+)`/g)].map((match) => match[1]);
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.filter((id) => !messageIds.includes(id))).toEqual([]);
  });
});

describe("claude-plugin: manifests and skills", () => {
  const manifest = readJson(pluginDir, ".claude-plugin", "plugin.json");
  const marketplace = readJson(".claude-plugin", "marketplace.json") as {
    plugins: { name: string; source: string }[];
  };

  it("has a plugin manifest with a name and a version", () => {
    expect(manifest.name).toBe("jss");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("lists the plugin in the marketplace, pointing at its directory", () => {
    const entry = marketplace.plugins.find((item) => item.name === manifest.name);
    expect(entry?.source).toBe(`./${pluginDir}`);
  });

  const skills = readdirSync(join(root, skillsDir));

  it.each(skills)("skill %s has a SKILL.md with a name and a description", (skill) => {
    const text = read(skillsDir, skill, "SKILL.md");
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
    expect(frontmatter).toMatch(new RegExp(`^name: ${skill}$`, "m"));
    expect(frontmatter).toMatch(/^description: \S/m);
  });

  it("only links to reference files and scripts that exist", () => {
    const missing: string[] = [];
    for (const skill of skills) {
      const text = read(skillsDir, skill, "SKILL.md");
      // Relative markdown links, and ${CLAUDE_PLUGIN_ROOT}/... paths.
      for (const [, target] of text.matchAll(/\]\((references\/[^)#]+)\)/g)) {
        if (!existsSync(join(root, skillsDir, skill, target))) missing.push(`${skill}: ${target}`);
      }
      for (const [, target] of text.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+\.(?:md|mjs))/g)) {
        if (!existsSync(join(root, pluginDir, target))) missing.push(`${skill}: ${target}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
