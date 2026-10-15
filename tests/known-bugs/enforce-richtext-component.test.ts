// Desired behaviour for bugs found in the v2 review (docs/v2-plan.md, "Per-rule behaviour changes").
// Every case is registered with `it.fails`: it passes while the bug exists and fails with
// "expected test to fail" once the fix lands. When that happens, move the case to tests/rules/.
import { describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/enforce-richtext-component";
import { asRuleModule, createRuleTester, withProps } from "../helpers/fixtures";

RuleTester.it = it.fails as unknown as typeof RuleTester.it;

const ruleTester = createRuleTester();
const richTextRule = asRuleModule<
  | "useRichTextComponent"
  | "avoidNestedPTags"
  | "avoidRichTextPTag"
  // new message, added in Phase 3
  | "avoidDangerouslySetInnerHTML"
>(rule);

describe("enforce-richtext-component: known bugs (expected failures until fixed)", () => {
  ruleTester.run("enforce-richtext-component", richTextRule, {
    valid: [],
    invalid: [
      // Phase 3: detection through optional chaining
      {
        name: "optional chaining on the field is detected",
        code: withProps(`<div>{props.fields.body?.value}</div>;`),
        output: withProps(`<RichText field={props.fields.body} tag="div" />;`),
        errors: [{ messageId: "useRichTextComponent" }],
      },
      {
        name: "optional chaining inside <p> still triggers the nested-paragraph message",
        code: withProps(`<p>{props.fields.body?.value}</p>;`),
        output: withProps(`<RichText field={props.fields.body} />;`),
        errors: [{ messageId: "avoidNestedPTags" }],
      },
      // Phase 3: never produce a lossy fix
      {
        name: "mixed children: report without a fix",
        code: withProps(`<div>Intro {props.fields.body.value}</div>;`),
        output: null,
        errors: [{ messageId: "useRichTextComponent" }],
      },
      // Phase 3 stretch: dangerouslySetInnerHTML with a RichTextField value
      {
        name: "dangerouslySetInnerHTML with a RichTextField value, attributes preserved",
        code: withProps(
          `<div className="rte" dangerouslySetInnerHTML={{ __html: props.fields.body.value }} />;`
        ),
        output: withProps(`<RichText field={props.fields.body} tag="div" className="rte" />;`),
        errors: [{ messageId: "avoidDangerouslySetInnerHTML" }],
      },
      {
        name: "dangerouslySetInnerHTML with a nullish fallback",
        code: withProps(
          `<div dangerouslySetInnerHTML={{ __html: props.fields.body.value ?? "" }} />;`
        ),
        output: withProps(`<RichText field={props.fields.body} tag="div" />;`),
        errors: [{ messageId: "avoidDangerouslySetInnerHTML" }],
      },
    ],
  });
});
