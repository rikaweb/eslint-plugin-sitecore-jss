import { describe } from "vitest";
import rule from "../../lib/rules/enforce-link-component";
import { createRuleTester, FIELD_TYPES, JSS, SDK, withProps } from "../helpers/fixtures";

const ruleTester = createRuleTester();

describe("enforce-link-component", () => {
  ruleTester.run("enforce-link-component", rule, {
    valid: [
      {
        name: "a LinkField the project declares itself is not a Sitecore field",
        code: [
          `interface LinkField { value: { href: string } }`,
          `declare const nav: { home: LinkField };`,
          `<a href={nav.home.value.href}>Home</a>;`,
          "",
        ].join("\n"),
      },
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
      {
        name: "next/link in a file without Sitecore link fields is left alone",
        code: [
          `import Link from "next/link";`,
          `import { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<Link href="/about">{String(title.value)}</Link>;`,
          "",
        ].join("\n"),
      },
    ],
    invalid: [
      {
        name: "an anchor without children would start rendering the link text: report without a fix",
        code: withProps(
          `<a href={props.fields.link.value.href} aria-label="Home" className="logo" />;`
        ),
        output: null,
        errors: [{ messageId: "useLinkComponent", data: { fieldName: "props.fields.link" } }],
      },
      {
        name: "an anchor with an empty body is not fixed either, and no import is added for it",
        code: withProps(`<a href={props.fields.link.value.href}>\n</a>;`, { imports: FIELD_TYPES }),
        output: null,
        errors: [{ messageId: "useLinkComponent" }],
      },
      {
        name: "a comment-only anchor is not fixed",
        code: withProps(`<a href={props.fields.link.value.href}>{/* icon via CSS */}</a>;`),
        output: null,
        errors: [{ messageId: "useLinkComponent" }],
      },
      {
        name: "a comment next to the field's own text would be deleted: report without a fix",
        code: withProps(
          `<a href={props.fields.link.value.href}>{/* label */}{props.fields.link.value.text}</a>;`
        ),
        output: null,
        errors: [{ messageId: "useLinkComponent" }],
      },
      {
        name: "a comment among children that are kept is carried over",
        code: withProps(
          `<a href={props.fields.link.value.href}>{/* icon */}<span>Read more</span></a>;`
        ),
        output: withProps(
          `<Link field={props.fields.link}>{/* icon */}<span>Read more</span></Link>;`
        ),
        errors: [{ messageId: "useLinkComponent" }],
      },
      {
        name: "an optional link field is passed on as written (may need a guard for the required prop)",
        code: withProps(
          `declare const card: { link?: LinkField };\n<a href={card.link?.value.href}>Go</a>;`
        ),
        output: withProps(
          `declare const card: { link?: LinkField };\n<Link field={card.link}>Go</Link>;`
        ),
        errors: [{ messageId: "useLinkComponent", data: { fieldName: "card.link" } }],
      },
      {
        name: "Link imported under an alias next to next/link: the fix renders the alias",
        code: [
          `import Link from "next/link";`,
          `import { LinkField, Link as SitecoreLink } from "${JSS}";`,
          `declare const link: LinkField;`,
          `<Link href="/about">About</Link>;`,
          `<a href={link.value.href}>{link.value.text}</a>;`,
          "",
        ].join("\n"),
        output: [
          `import Link from "next/link";`,
          `import { LinkField, Link as SitecoreLink } from "${JSS}";`,
          `declare const link: LinkField;`,
          `<Link href="/about">About</Link>;`,
          `<SitecoreLink field={link} />;`,
          "",
        ].join("\n"),
        errors: [{ messageId: "useLinkComponent" }],
      },
      {
        name: "LinkField href with the field text as child, attributes preserved",
        code: withProps(
          `<a href={props.fields.link.value.href} className="btn">{props.fields.link.value.text}</a>;`
        ),
        output: withProps(`<Link field={props.fields.link} className="btn" />;`),
        errors: [{ messageId: "useLinkComponent", data: { fieldName: "props.fields.link" } }],
      },
      {
        name: "optional chaining on value",
        code: withProps(
          `<a href={props.fields.link.value?.href}>{props.fields.link.value?.text}</a>;`
        ),
        output: withProps(`<Link field={props.fields.link} />;`),
        errors: [{ messageId: "useLinkComponent" }],
      },
      {
        name: "optional chaining on the field",
        code: withProps(
          `<a href={props.fields.link?.value.href}>{props.fields.link?.value.text}</a>;`
        ),
        output: withProps(`<Link field={props.fields.link} />;`),
        errors: [{ messageId: "useLinkComponent" }],
      },
      {
        name: "element children are preserved inside <Link>",
        code: withProps(
          `<a href={props.fields.link.value.href} className="btn"><span>Read more</span></a>;`
        ),
        output: withProps(
          `<Link field={props.fields.link} className="btn"><span>Read more</span></Link>;`
        ),
        errors: [{ messageId: "useLinkComponent" }],
      },
      {
        name: "text children are preserved inside <Link>",
        code: withProps(`<a href={props.fields.link.value.href}>Go</a>;`),
        output: withProps(`<Link field={props.fields.link}>Go</Link>;`),
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

      // Import auto-fixer
      {
        name: "fix extends the existing Sitecore import",
        code: withProps(`<a href={props.fields.link.value.href}>{props.fields.link.value.text}</a>;`, {
          imports: FIELD_TYPES,
        }),
        output: withProps(`<Link field={props.fields.link} />;`, {
          imports: `${FIELD_TYPES}, Link`,
        }),
        errors: [
          { messageId: "useLinkComponent" },
          { messageId: "missingImport", data: { name: "Link", source: JSS } },
        ],
      },
      {
        name: "Link from next/link is a name conflict: report without a fix",
        code: [
          `import Link from "next/link";`,
          `import { LinkField } from "${JSS}";`,
          `declare const link: LinkField;`,
          `<a href={link.value.href}>{link.value.text}</a>;`,
          "",
        ].join("\n"),
        output: null,
        errors: [{ messageId: "useLinkComponent" }],
      },
    ],
  });
});
