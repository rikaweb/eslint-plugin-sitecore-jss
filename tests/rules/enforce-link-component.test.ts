import { describe } from "vitest";
import rule from "../../lib/rules/enforce-link-component";
import { asRuleModule, createRuleTester, SDK, withProps } from "../helpers/fixtures";

const ruleTester = createRuleTester();
const linkRule = asRuleModule<"useLinkComponent">(rule);

describe("enforce-link-component", () => {
  ruleTester.run("enforce-link-component", linkRule, {
    valid: [
      {
        name: "literal href",
        code: withProps(`<a href="/about">About</a>;`),
      },
      {
        name: "plain string href",
        code: withProps(`declare const url: string;\n<a href={url}>Go</a>;`),
      },
      {
        name: "member of a non-field object",
        code: withProps(`declare const meta: { href: string };\n<a href={meta.href}>Go</a>;`),
      },
      {
        name: "already uses <Link>",
        code: withProps(`<Link field={props.fields.link} />;`),
      },
      {
        name: "FileField anchors belong to enforce-file-component",
        code: withProps(
          `<a href={props.fields.file.value.src}>{props.fields.file.value.title}</a>;`
        ),
      },
    ],
    invalid: [
      {
        name: "LinkField href with the field text as child, attributes preserved",
        code: withProps(
          `<a href={props.fields.link.value.href} className="btn">{props.fields.link.value.text}</a>;`
        ),
        output: withProps(`<Link field={props.fields.link} className="btn" />;`),
        errors: [{ messageId: "useLinkComponent", data: { fieldName: "props.fields.link" } }],
      },
      {
        name: "self-closing anchor",
        code: withProps(`<a href={props.fields.link.value.href} />;`),
        output: withProps(`<Link field={props.fields.link} />;`),
        errors: [{ messageId: "useLinkComponent" }],
      },
      {
        name: "LinkFieldValue used directly",
        code: withProps(`declare const link: LinkFieldValue;\n<a href={link.href}>{link.text}</a>;`),
        output: withProps(`declare const link: LinkFieldValue;\n<Link field={link} />;`),
        errors: [{ messageId: "useLinkComponent", data: { fieldName: "link" } }],
      },
      {
        name: "Content SDK field types are detected",
        code: withProps(
          `<a href={props.fields.link.value.href}>{props.fields.link.value.text}</a>;`,
          { pkg: SDK }
        ),
        output: withProps(`<Link field={props.fields.link} />;`, { pkg: SDK }),
        errors: [{ messageId: "useLinkComponent" }],
      },
    ],
  });
});
