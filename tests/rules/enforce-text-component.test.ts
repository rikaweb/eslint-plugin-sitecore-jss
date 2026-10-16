import { describe } from "vitest";
import rule from "../../lib/rules/enforce-text-component";
import { createRuleTester, SDK, withProps } from "../helpers/fixtures";

const ruleTester = createRuleTester();

describe("enforce-text-component", () => {
  ruleTester.run("enforce-text-component", rule, {
    valid: [
      {
        name: "already uses <Text>",
        code: withProps(`<Text field={props.fields.title} tag="h1" />;`),
      },
      {
        name: "RichTextField belongs to enforce-richtext-component",
        code: withProps(`<div>{props.fields.body.value}</div>;`),
      },
      {
        name: "plain string variable",
        code: withProps(`declare const label: string;\n<p>{label}</p>;`),
      },
      {
        name: "member of a non-field object",
        code: withProps(`declare const meta: { label: string };\n<p>{meta.label}</p>;`),
      },
      {
        name: "Field<number> is not Field<string>",
        code: withProps(`declare const count: Field<number>;\n<span>{count.value}</span>;`),
      },
      {
        name: "a value derived from the field is not the field",
        code: withProps(`<p>{props.fields.title.value.length}</p>;`),
      },
      {
        name: "field passed as a prop, not rendered as a child",
        code: withProps(
          `declare const Card: (p: { title: Field<string> }) => unknown;\n<Card title={props.fields.title} />;`
        ),
      },
    ],
    invalid: [
      {
        name: "Field<string> inside <h1>, attributes preserved",
        code: withProps(`<h1 className="title">{props.fields.title.value}</h1>;`),
        output: withProps(`<Text field={props.fields.title} tag="h1" className="title" />;`),
        errors: [
          {
            messageId: "useTextComponent",
            data: { tagName: "h1", fieldName: "props.fields.title" },
          },
        ],
      },
      {
        name: "TextField inside <h2>",
        code: withProps(`<h2>{props.fields.heading.value}</h2>;`),
        output: withProps(`<Text field={props.fields.heading} tag="h2" />;`),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "destructured field",
        code: withProps(`const { heading } = props.fields;\n<p>{heading.value}</p>;`),
        output: withProps(`const { heading } = props.fields;\n<Text field={heading} tag="p" />;`),
        errors: [{ messageId: "useTextComponent", data: { tagName: "p", fieldName: "heading" } }],
      },
      {
        name: "multi-line element with whitespace around the expression",
        code: withProps(`<h1>\n  {props.fields.title.value}\n</h1>;`),
        output: withProps(`<Text field={props.fields.title} tag="h1" />;`),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "a comment sibling does not block the fix",
        code: withProps(`<h1>{/* page heading */}{props.fields.title.value}</h1>;`),
        output: withProps(`<Text field={props.fields.title} tag="h1" />;`),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "spread attributes preserved",
        code: withProps(
          `declare const rest: Record<string, unknown>;\n<p id="x" {...rest}>{props.fields.title.value}</p>;`
        ),
        output: withProps(
          `declare const rest: Record<string, unknown>;\n<Text field={props.fields.title} tag="p" id="x" {...rest} />;`
        ),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "optional chaining on the field is detected",
        code: withProps(`<p>{props.fields.title?.value}</p>;`),
        output: withProps(`<Text field={props.fields.title} tag="p" />;`),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "optional chaining on the fields object keeps the chain in the fix",
        code: withProps(
          `declare const fields: Props["fields"] | undefined;\n<p>{fields?.title.value}</p>;`
        ),
        output: withProps(
          `declare const fields: Props["fields"] | undefined;\n<Text field={fields?.title} tag="p" />;`
        ),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "optional field type",
        code: withProps(
          `declare const subtitle: Field<string> | undefined;\n<p>{subtitle?.value}</p>;`
        ),
        output: withProps(
          `declare const subtitle: Field<string> | undefined;\n<Text field={subtitle} tag="p" />;`
        ),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "non-null assertion and type assertion are looked through",
        code: withProps(`<p>{props.fields.title.value!}</p>;\n<p>{props.fields.title.value as string}</p>;`),
        output: withProps(
          `<Text field={props.fields.title} tag="p" />;\n<Text field={props.fields.title} tag="p" />;`
        ),
        errors: [{ messageId: "useTextComponent" }, { messageId: "useTextComponent" }],
      },
      {
        name: "field object rendered without .value",
        code: withProps(`<p>{props.fields.title}</p>;`),
        output: withProps(`<Text field={props.fields.title} tag="p" />;`),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "field held in a plain variable",
        code: withProps(`declare const title: Field<string>;\n<p>{title.value}</p>;`),
        output: withProps(`declare const title: Field<string>;\n<Text field={title} tag="p" />;`),
        errors: [{ messageId: "useTextComponent", data: { tagName: "p", fieldName: "title" } }],
      },
      {
        name: "mixed children: report without a fix",
        code: withProps(`<h3>Hello {props.fields.title.value}</h3>;`),
        output: null,
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "two fields in one element: both reported, no fix",
        code: withProps(`<p>{props.fields.title.value} {props.fields.heading.value}</p>;`),
        output: null,
        errors: [{ messageId: "useTextComponent" }, { messageId: "useTextComponent" }],
      },
      {
        name: "custom component wrapper: report without a fix",
        code: withProps(
          `declare const Typography: (p: { children?: unknown }) => unknown;\n<Typography>{props.fields.title.value}</Typography>;`
        ),
        output: null,
        errors: [
          {
            messageId: "useTextComponentInWrapper",
            data: { tagName: "Typography", fieldName: "props.fields.title" },
          },
        ],
      },
      {
        name: "Content SDK field types are detected",
        code: withProps(`<h1>{props.fields.title.value}</h1>;`, { pkg: SDK }),
        output: withProps(`<Text field={props.fields.title} tag="h1" />;`, { pkg: SDK }),
        errors: [{ messageId: "useTextComponent" }],
      },
    ],
  });
});
