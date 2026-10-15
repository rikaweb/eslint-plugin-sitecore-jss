import { describe } from "vitest";
import rule from "../../lib/rules/enforce-all-components";
import { asRuleModule, createRuleTester, withProps } from "../helpers/fixtures";

const ruleTester = createRuleTester();
const allRule = asRuleModule<
  | "useTextComponent"
  | "useRichTextComponent"
  | "avoidNestedPTags"
  | "avoidRichTextPTag"
  | "useImageComponent"
  | "useLinkComponent"
  | "useFileComponent"
>(rule);

// Deprecated meta-rule (use the plugin configs instead); it must keep working for v1 users.
describe("enforce-all-components", () => {
  ruleTester.run("enforce-all-components", allRule, {
    valid: [
      {
        name: "components already in use",
        code: withProps(
          `<Text field={props.fields.title} tag="h1" />;\n<RichText field={props.fields.body} />;\n<Link field={props.fields.link} />;`
        ),
      },
    ],
    invalid: [
      {
        name: "reports and fixes every component rule in one pass",
        code: withProps(
          [
            `<h1>{props.fields.title.value}</h1>;`,
            `<div>{props.fields.body.value}</div>;`,
            `<a href={props.fields.link.value.href}>{props.fields.link.value.text}</a>;`,
            `<a href={props.fields.file.value.src}>{props.fields.file.value.title}</a>;`,
          ].join("\n")
        ),
        output: withProps(
          [
            `<Text field={props.fields.title} tag="h1" />;`,
            `<RichText field={props.fields.body} tag="div" />;`,
            `<Link field={props.fields.link} />;`,
            `<File field={props.fields.file} />;`,
          ].join("\n")
        ),
        errors: [
          { messageId: "useTextComponent" },
          { messageId: "useRichTextComponent" },
          { messageId: "useLinkComponent" },
          { messageId: "useFileComponent" },
        ],
      },
    ],
  });
});
