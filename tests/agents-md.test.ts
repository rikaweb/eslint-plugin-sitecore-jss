import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// docs/AGENTS.sitecore-fields.md is generated from the Claude Code skill. This fails when the skill
// changed and the file was not regenerated with `node scripts/build-agents-md.mjs`.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("docs/AGENTS.sitecore-fields.md", () => {
  it("is up to date with the skill", () => {
    const check = () =>
      execFileSync(process.execPath, ["scripts/build-agents-md.mjs", "--check"], {
        cwd: root,
        stdio: "pipe",
      });
    expect(check, "run: node scripts/build-agents-md.mjs").not.toThrow();
  });
});
