import { describe } from "vitest";
import rule from "../../lib/rules/enforce-richtext-component";
import { asRuleModule, createRuleTester, SDK, withProps } from "../helpers/fixtures";

const ruleTester = createRuleTester();
const richTextRule = asRuleModule<
  "useRichTextComponent" | "avoidNestedPTags" | "avoidRichTextPTag"
>(rule);

describe("enforce-richtext-component", () => {
  ruleTester.run("enforce-richtext-component", richTextRule, {
    valid: [
      {
        name: "already uses <RichText> without a tag",
        code: withProps(`<RichText field={props.fields.body} />;`),
      },
      {
        name: "already uses <RichText> with a non-p tag",
        code: withProps(`<RichText field={props.fields.body} tag="div" />;`),
      },
      {
        name: "Field<string> belongs to enforce-text-component",
        code: withProps(`<div>{props.fields.title.value}</div>;`),
      },
      {
        name: "dangerouslySetInnerHTML with a plain string is not a field",
        code: withProps(
          `declare const html: string;\n<div dangerouslySetInnerHTML={{ __html: html }} />;`
        ),
      },
    ],
    invalid: [
      {
        name: "RichTextField inside <div>, attributes preserved",
        code: withProps(`<div className="rte">{props.fields.body.value}</div>;`),
        output: withProps(`<RichText field={props.fields.body} tag="div" className="rte" />;`),
        errors: [
          {
            messageId: "useRichTextComponent",
            data: { tagName: "div", fieldName: "props.fields.body" },
          },
        ],
      },
      {
        name: "RichTextField inside <section>",
        code: withProps(`<section>{props.fields.body.value}</section>;`),
        output: withProps(`<RichText field={props.fields.body} tag="section" />;`),
        errors: [{ messageId: "useRichTextComponent" }],
      },
      {
        name: "RichTextField inside <p> creates nested paragraphs: fix drops the tag",
        code: withProps(`<p>{props.fields.body.value}</p>;`),
        output: withProps(`<RichText field={props.fields.body} />;`),
        errors: [{ messageId: "avoidNestedPTags", data: { fieldName: "props.fields.body" } }],
      },
      {
        name: "RichTextField inside <p> keeps the other attributes",
        code: withProps(`<p className="lead">{props.fields.body.value}</p>;`),
        output: withProps(`<RichText field={props.fields.body} className="lead" />;`),
        errors: [{ messageId: "avoidNestedPTags" }],
      },
      {
        name: '<RichText tag="p"> is removed',
        code: withProps(`<RichText field={props.fields.body} tag="p" />;`),
        output: withProps(`<RichText field={props.fields.body} />;`),
        errors: [{ messageId: "avoidRichTextPTag" }],
      },
      {
        name: '<RichText tag="p"> removal keeps the other attributes',
        code: withProps(`<RichText field={props.fields.body} tag="p" className="rte" />;`),
        output: withProps(`<RichText field={props.fields.body} className="rte" />;`),
        errors: [{ messageId: "avoidRichTextPTag" }],
      },
      {
        name: "Content SDK field types are detected",
        code: withProps(`<div>{props.fields.body.value}</div>;`, { pkg: SDK }),
        output: withProps(`<RichText field={props.fields.body} tag="div" />;`, { pkg: SDK }),
        errors: [{ messageId: "useRichTextComponent" }],
      },
    ],
  });
});
