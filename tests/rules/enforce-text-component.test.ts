import { describe } from "vitest";
import rule from "../../lib/rules/enforce-text-component";
import { createRuleTester, FIELD_TYPES, JSS, SDK, withProps } from "../helpers/fixtures";

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
      {
        name: "Text imported from the JSS React package counts as imported",
        code: [
          `import { Text } from "@sitecore-jss/sitecore-jss-react";`,
          `import { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<Text field={title} tag="h1" />;`,
          "",
        ].join("\n"),
      },
      {
        name: "an unbound <Text> in a file without Sitecore imports is not ours",
        code: `<Text tag="h1" />;\n`,
      },
      {
        name: "<title> can only hold text: reading .value there is correct",
        code: withProps(`<title>{props.fields.title.value}</title>;`),
      },
      {
        name: "<option> and <textarea> are text-only too",
        code: withProps(
          `<select><option value="a">{props.fields.title.value}</option></select>;\n<textarea>{props.fields.heading.value}</textarea>;`
        ),
      },
      {
        name: "Text imported from the importSource package counts as imported",
        options: [{ importSource: "@acme/sitecore-ui" }],
        code: [
          `import { Text } from "@acme/sitecore-ui";`,
          `import type { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<Text field={title} tag="h1" />;`,
          "",
        ].join("\n"),
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
        name: "an entity next to the field renders a character: report without a fix",
        code: withProps(`<span>{props.fields.title.value}&nbsp;</span>;`),
        output: null,
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "a numeric entity before the field blocks the fix too",
        code: withProps(`<span>&#160;{props.fields.heading.value}</span>;`),
        output: null,
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "<a href> with a text field child is never rewritten to <Text tag=\"a\">",
        code: withProps(
          `<a href={props.fields.link.value.href} className="cta">{props.fields.title.value}</a>;`
        ),
        output: null,
        errors: [
          {
            messageId: "useTextComponentInWrapper",
            data: { tagName: "a", fieldName: "props.fields.title" },
          },
        ],
      },
      {
        name: "<a href> with a literal href is left to the author as well",
        code: withProps(`<a href="/about">{props.fields.title.value}</a>;`),
        output: null,
        errors: [{ messageId: "useTextComponentInWrapper" }],
      },
      {
        name: "an <a> without href is an ordinary element",
        code: withProps(`<a id="top">{props.fields.title.value}</a>;`),
        output: withProps(`<Text field={props.fields.title} tag="a" id="top" />;`),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "the fix reuses a Text that is imported from the importSource package",
        options: [{ importSource: "@acme/sitecore-ui" }],
        code: [
          `import { Text } from "@acme/sitecore-ui";`,
          `import type { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<h2>{title.value}</h2>;`,
          "",
        ].join("\n"),
        output: [
          `import { Text } from "@acme/sitecore-ui";`,
          `import type { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<Text field={title} tag="h2" />;`,
          "",
        ].join("\n"),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "an existing import from the importSource package is extended",
        options: [{ importSource: "@acme/sitecore-ui" }],
        code: [
          `import { Placeholder } from "@acme/sitecore-ui";`,
          `import { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<h2>{title.value}</h2>;`,
          `Placeholder;`,
          "",
        ].join("\n"),
        output: [
          `import { Placeholder, Text } from "@acme/sitecore-ui";`,
          `import { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<Text field={title} tag="h2" />;`,
          `Placeholder;`,
          "",
        ].join("\n"),
        errors: [
          { messageId: "useTextComponent" },
          { messageId: "missingImport", data: { name: "Text", source: "@acme/sitecore-ui" } },
        ],
      },
      {
        name: "the DOM global Text used in the file is a conflict: report without a fix",
        code: withProps(
          `declare const node: unknown;\nexport const isText = node instanceof Text;\n<h1>{props.fields.title.value}</h1>;`,
          { imports: FIELD_TYPES }
        ),
        output: null,
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

      // Import auto-fixer
      {
        name: "fix extends the existing Sitecore import",
        code: withProps(`<h1>{props.fields.title.value}</h1>;`, { imports: FIELD_TYPES }),
        output: withProps(`<Text field={props.fields.title} tag="h1" />;`, {
          imports: `${FIELD_TYPES}, Text`,
        }),
        errors: [
          { messageId: "useTextComponent" },
          { messageId: "missingImport", data: { name: "Text", source: JSS } },
        ],
      },
      {
        name: "the import is added once for several elements",
        code: withProps(
          `<h1>{props.fields.title.value}</h1>;\n<h2>{props.fields.heading.value}</h2>;`,
          { imports: FIELD_TYPES }
        ),
        output: withProps(
          `<Text field={props.fields.title} tag="h1" />;\n<Text field={props.fields.heading} tag="h2" />;`,
          { imports: `${FIELD_TYPES}, Text` }
        ),
        errors: [
          { messageId: "useTextComponent" },
          { messageId: "missingImport" },
          { messageId: "useTextComponent" },
        ],
      },
      {
        name: "fix adds a new import after a type-only Sitecore import",
        code: [
          `import type { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<h1>{title.value}</h1>;`,
          "",
        ].join("\n"),
        output: [
          `import type { Field } from "${JSS}";`,
          `import { Text } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<Text field={title} tag="h1" />;`,
          "",
        ].join("\n"),
        errors: [
          { messageId: "useTextComponent" },
          { messageId: "missingImport", data: { name: "Text", source: JSS } },
        ],
      },
      {
        name: "a multi-line import with a trailing comma is extended cleanly",
        code: [
          "import {",
          "  Field,",
          "  TextField,",
          `} from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<h1>{title.value}</h1>;`,
          "",
        ].join("\n"),
        output: [
          "import {",
          "  Field,",
          "  TextField, Text,",
          `} from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<Text field={title} tag="h1" />;`,
          "",
        ].join("\n"),
        errors: [{ messageId: "useTextComponent" }, { messageId: "missingImport" }],
      },
      {
        name: "a new import keeps the file's quote style",
        code: [
          `import type { Field } from '${JSS}';`,
          `declare const title: Field<string>;`,
          `<h1>{title.value}</h1>;`,
          "",
        ].join("\n"),
        output: [
          `import type { Field } from '${JSS}';`,
          `import { Text } from '${JSS}';`,
          `declare const title: Field<string>;`,
          `<Text field={title} tag="h1" />;`,
          "",
        ].join("\n"),
        errors: [{ messageId: "useTextComponent" }, { messageId: "missingImport" }],
      },
      {
        name: "Content SDK fields extend the Content SDK import",
        code: withProps(`<h1>{props.fields.title.value}</h1>;`, {
          pkg: SDK,
          imports: FIELD_TYPES,
        }),
        output: withProps(`<Text field={props.fields.title} tag="h1" />;`, {
          pkg: SDK,
          imports: `${FIELD_TYPES}, Text`,
        }),
        errors: [
          { messageId: "useTextComponent" },
          { messageId: "missingImport", data: { name: "Text", source: SDK } },
        ],
      },
      {
        name: "Content SDK fields get a Content SDK import when none can be extended",
        code: [
          `import type { Field } from "${SDK}";`,
          `declare const title: Field<string>;`,
          `<h1>{title.value}</h1>;`,
          "",
        ].join("\n"),
        output: [
          `import type { Field } from "${SDK}";`,
          `import { Text } from "${SDK}";`,
          `declare const title: Field<string>;`,
          `<Text field={title} tag="h1" />;`,
          "",
        ].join("\n"),
        errors: [
          { messageId: "useTextComponent" },
          { messageId: "missingImport", data: { name: "Text", source: SDK } },
        ],
      },
      {
        name: "the importSource option names the package for a new import",
        options: [{ importSource: "@sitecore-jss/sitecore-jss-react" }],
        code: [
          `import type { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<h1>{title.value}</h1>;`,
          "",
        ].join("\n"),
        output: [
          `import type { Field } from "${JSS}";`,
          `import { Text } from "@sitecore-jss/sitecore-jss-react";`,
          `declare const title: Field<string>;`,
          `<Text field={title} tag="h1" />;`,
          "",
        ].join("\n"),
        errors: [
          { messageId: "useTextComponent" },
          {
            messageId: "missingImport",
            data: { name: "Text", source: "@sitecore-jss/sitecore-jss-react" },
          },
        ],
      },
      {
        name: "a file without imports gets the import as its first statement",
        code: [
          `declare const title: import("${SDK}").Field<string>;`,
          `<h1>{title.value}</h1>;`,
          "",
        ].join("\n"),
        output: [
          `import { Text } from "${SDK}";`,
          `declare const title: import("${SDK}").Field<string>;`,
          `<Text field={title} tag="h1" />;`,
          "",
        ].join("\n"),
        errors: [
          { messageId: "useTextComponent" },
          { messageId: "missingImport", data: { name: "Text", source: SDK } },
        ],
      },
      {
        name: 'a file without imports keeps "use client" first: the import goes after the directives',
        code: [
          `"use client";`,
          `"use strict";`,
          `// a comment`,
          `declare const title: import("${SDK}").Field<string>;`,
          `<h1>{title.value}</h1>;`,
          "",
        ].join("\n"),
        output: [
          `"use client";`,
          `"use strict";`,
          `import { Text } from "${SDK}";`,
          `// a comment`,
          `declare const title: import("${SDK}").Field<string>;`,
          `<Text field={title} tag="h1" />;`,
          "",
        ].join("\n"),
        errors: [
          { messageId: "useTextComponent" },
          { messageId: "missingImport", data: { name: "Text", source: SDK } },
        ],
      },
      {
        name: "Text already imported from another Sitecore package needs no import",
        code: [
          `import { Text } from "@sitecore-jss/sitecore-jss-react";`,
          `import { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<h1>{title.value}</h1>;`,
          "",
        ].join("\n"),
        output: [
          `import { Text } from "@sitecore-jss/sitecore-jss-react";`,
          `import { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `<Text field={title} tag="h1" />;`,
          "",
        ].join("\n"),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "a <Text> already in the file but unbound gets the import",
        code: withProps(`<Text field={props.fields.title} tag="h1" />;`, { imports: FIELD_TYPES }),
        output: withProps(`<Text field={props.fields.title} tag="h1" />;`, {
          imports: `${FIELD_TYPES}, Text`,
        }),
        errors: [{ messageId: "missingImport", data: { name: "Text", source: JSS } }],
      },
      {
        name: "name conflict with a local declaration: report without a fix",
        code: withProps(`declare function Text(): null;\n<h1>{props.fields.title.value}</h1>;`, {
          imports: FIELD_TYPES,
        }),
        output: null,
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "name conflict with an import from another package: report without a fix",
        code: [
          `import { Field } from "${JSS}";`,
          `import Text from "./Text";`,
          `declare const title: Field<string>;`,
          `<h1>{title.value}</h1>;`,
          "",
        ].join("\n"),
        output: null,
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "a type-only import of Text is a conflict",
        code: withProps(`<h1>{props.fields.title.value}</h1>;`, {
          imports: `${FIELD_TYPES}, type Text`,
        }),
        output: null,
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "a shadowing local inside the component blocks the fix",
        code: [
          `import { Field } from "${JSS}";`,
          `declare const title: Field<string>;`,
          `function Component() {`,
          `  const Text = "shadow";`,
          `  return <h1>{title.value}</h1>;`,
          `}`,
          "",
        ].join("\n"),
        output: null,
        errors: [{ messageId: "useTextComponent" }],
      },
    ],
  });
});
