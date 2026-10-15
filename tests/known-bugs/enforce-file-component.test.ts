// Desired behaviour for bugs found in the v2 review (docs/v2-plan.md, "Per-rule behaviour changes").
// Every case is registered with `it.fails`: it passes while the bug exists and fails with
// "expected test to fail" once the fix lands. When that happens, move the case to tests/rules/.
import { describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/enforce-file-component";
import { asRuleModule, createRuleTester, withProps } from "../helpers/fixtures";

RuleTester.it = it.fails as unknown as typeof RuleTester.it;

const ruleTester = createRuleTester();
const fileRule = asRuleModule<"useFileComponent">(rule);

describe("enforce-file-component: known bugs (expected failures until fixed)", () => {
  ruleTester.run("enforce-file-component", fileRule, {
    valid: [],
    invalid: [
      // Phase 3: detection through optional chaining
      {
        name: "optional chaining on value is detected",
        code: withProps(
          `<a href={props.fields.file.value?.src}>{props.fields.file.value?.title}</a>;`
        ),
        output: withProps(`<File field={props.fields.file} />;`),
        errors: [{ messageId: "useFileComponent" }],
      },
      // Phase 3: children other than the field's own title/displayName are kept
      {
        name: "text children are preserved inside <File>",
        code: withProps(`<a href={props.fields.file.value.src}>Download</a>;`),
        output: withProps(`<File field={props.fields.file}>Download</File>;`),
        errors: [{ messageId: "useFileComponent" }],
      },
      {
        name: "element children are preserved inside <File>",
        code: withProps(
          `<a href={props.fields.file.value.src} className="dl"><Icon name="pdf" /> Download</a>;`
        ),
        output: withProps(
          `<File field={props.fields.file} className="dl"><Icon name="pdf" /> Download</File>;`
        ),
        errors: [{ messageId: "useFileComponent" }],
      },
    ],
  });
});
