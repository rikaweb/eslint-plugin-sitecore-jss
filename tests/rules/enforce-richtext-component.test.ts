import { describe } from "vitest";
import rule from "../../lib/rules/enforce-richtext-component";
import { createRuleTester, FIELD_TYPES, JSS, SDK, withProps } from "../helpers/fixtures";

const ruleTester = createRuleTester();

describe("enforce-richtext-component", () => {
  ruleTester.run("enforce-richtext-component", rule, {
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
      {
        name: "dangerouslySetInnerHTML with a text field is not this rule's concern",
        code: withProps(
          `<div dangerouslySetInnerHTML={{ __html: String(props.fields.title.value) }} />;`
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
        name: "optional chaining on the field is detected",
        code: withProps(`<div>{props.fields.body?.value}</div>;`),
        output: withProps(`<RichText field={props.fields.body} tag="div" />;`),
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
        name: "optional chaining inside <p> still triggers the nested-paragraph message",
        code: withProps(`<p>{props.fields.body?.value}</p>;`),
        output: withProps(`<RichText field={props.fields.body} />;`),
        errors: [{ messageId: "avoidNestedPTags" }],
      },
      {
        name: "mixed children: report without a fix",
        code: withProps(`<div>Intro {props.fields.body.value}</div>;`),
        output: null,
        errors: [{ messageId: "useRichTextComponent" }],
      },
      {
        name: "custom component wrapper: report without a fix",
        code: withProps(
          `declare const Prose: (p: { children?: unknown }) => unknown;\n<Prose>{props.fields.body.value}</Prose>;`
        ),
        output: null,
        errors: [
          {
            messageId: "useRichTextComponentInWrapper",
            data: { tagName: "Prose", fieldName: "props.fields.body" },
          },
        ],
      },
      {
        name: '<RichText tag="p"> is removed',
        code: withProps(`<RichText field={props.fields.body} tag="p" />;`),
        output: withProps(`<RichText field={props.fields.body} />;`),
        errors: [{ messageId: "avoidRichTextPTag" }],
      },
      {
        name: '<RichText tag={"p"}> is removed too',
        code: withProps(`<RichText field={props.fields.body} tag={"p"} />;`),
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
        name: "dangerouslySetInnerHTML with a RichTextField value, attributes preserved",
        code: withProps(
          `<div className="rte" dangerouslySetInnerHTML={{ __html: props.fields.body.value }} />;`
        ),
        output: withProps(`<RichText field={props.fields.body} tag="div" className="rte" />;`),
        errors: [
          { messageId: "avoidDangerouslySetInnerHTML", data: { fieldName: "props.fields.body" } },
        ],
      },
      {
        name: "dangerouslySetInnerHTML with a nullish fallback",
        code: withProps(
          `<div dangerouslySetInnerHTML={{ __html: props.fields.body.value ?? "" }} />;`
        ),
        output: withProps(`<RichText field={props.fields.body} tag="div" />;`),
        errors: [{ messageId: "avoidDangerouslySetInnerHTML" }],
      },
      {
        name: "dangerouslySetInnerHTML on a <p> drops the tag to avoid nested paragraphs",
        code: withProps(`<p dangerouslySetInnerHTML={{ __html: props.fields.body.value }} />;`),
        output: withProps(`<RichText field={props.fields.body} />;`),
        errors: [{ messageId: "avoidDangerouslySetInnerHTML" }],
      },
      {
        name: "Content SDK field types are detected",
        code: withProps(`<div>{props.fields.body.value}</div>;`, { pkg: SDK }),
        output: withProps(`<RichText field={props.fields.body} tag="div" />;`, { pkg: SDK }),
        errors: [{ messageId: "useRichTextComponent" }],
      },

      // Import auto-fixer
      {
        name: "fix extends the existing Sitecore import",
        code: withProps(`<div>{props.fields.body.value}</div>;`, { imports: FIELD_TYPES }),
        output: withProps(`<RichText field={props.fields.body} tag="div" />;`, {
          imports: `${FIELD_TYPES}, RichText`,
        }),
        errors: [
          { messageId: "useRichTextComponent" },
          { messageId: "missingImport", data: { name: "RichText", source: JSS } },
        ],
      },
      {
        name: "the dangerouslySetInnerHTML fix adds the import too",
        code: withProps(`<div dangerouslySetInnerHTML={{ __html: props.fields.body.value }} />;`, {
          imports: FIELD_TYPES,
        }),
        output: withProps(`<RichText field={props.fields.body} tag="div" />;`, {
          imports: `${FIELD_TYPES}, RichText`,
        }),
        errors: [{ messageId: "avoidDangerouslySetInnerHTML" }, { messageId: "missingImport" }],
      },
      {
        name: "name conflict: report without a fix",
        code: withProps(`declare const RichText: unknown;\n<div>{props.fields.body.value}</div>;`, {
          imports: FIELD_TYPES,
        }),
        output: null,
        errors: [{ messageId: "useRichTextComponent" }],
      },
    ],
  });
});
