import { describe } from "vitest";
import rule from "../../lib/rules/enforce-text-component";
import { asRuleModule, createRuleTester, SDK, withProps } from "../helpers/fixtures";

const ruleTester = createRuleTester();
const textRule = asRuleModule<"useTextComponent">(rule);

describe("enforce-text-component", () => {
  ruleTester.run("enforce-text-component", textRule, {
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
        name: "Content SDK field types are detected",
        code: withProps(`<h1>{props.fields.title.value}</h1>;`, { pkg: SDK }),
        output: withProps(`<Text field={props.fields.title} tag="h1" />;`, { pkg: SDK }),
        errors: [{ messageId: "useTextComponent" }],
      },
    ],
  });
});
