import { describe, expect, it } from "vitest";
import rule from "../../lib/rules/enforce-all-components";
import { createRuleTester, withProps } from "../helpers/fixtures";

const ruleTester = createRuleTester();

// Deprecated meta-rule (use the plugin configs instead); it must keep working for v1 users.
describe("enforce-all-components", () => {
  it("is marked deprecated with the individual rules as replacements", () => {
    const deprecated = rule.meta.deprecated;
    expect(deprecated).toBeTypeOf("object");
    expect(deprecated && typeof deprecated === "object" ? deprecated.replacedBy : []).toHaveLength(5);
  });

  ruleTester.run("enforce-all-components", rule, {
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
            `<img src={props.fields.image.value?.src} />;`,
            `<a href={props.fields.link.value.href}>{props.fields.link.value.text}</a>;`,
            `<a href={props.fields.file.value.src}>{props.fields.file.value.title}</a>;`,
          ].join("\n")
        ),
        output: withProps(
          [
            `<Text field={props.fields.title} tag="h1" />;`,
            `<RichText field={props.fields.body} tag="div" />;`,
            `<Image field={props.fields.image} />;`,
            `<Link field={props.fields.link} />;`,
            `<File field={props.fields.file} />;`,
          ].join("\n")
        ),
        errors: [
          { messageId: "useTextComponent" },
          { messageId: "useRichTextComponent" },
          { messageId: "useImageComponent" },
          { messageId: "useLinkComponent" },
          { messageId: "useFileComponent" },
        ],
      },
    ],
  });
});
