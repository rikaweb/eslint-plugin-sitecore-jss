import { describe } from "vitest";
import rule from "../../lib/rules/enforce-file-component";
import { createRuleTester, FIELD_TYPES, JSS, SDK, withProps } from "../helpers/fixtures";

const ruleTester = createRuleTester();

describe("enforce-file-component", () => {
  ruleTester.run("enforce-file-component", rule, {
    valid: [
      {
        name: "literal href",
        code: withProps(`<a href="/docs/guide.pdf">Guide</a>;`),
      },
      {
        name: "plain string href",
        code: withProps(`declare const url: string;\n<a href={url}>Download</a>;`),
      },
      {
        name: "already uses <File>",
        code: withProps(`<File field={props.fields.file} />;`),
      },
      {
        name: "LinkField anchors belong to enforce-link-component",
        code: withProps(
          `<a href={props.fields.link.value.href}>{props.fields.link.value.text}</a>;`
        ),
      },
    ],
    invalid: [
      {
        name: "FileField src with the field title as child",
        code: withProps(
          `<a href={props.fields.file.value.src}>{props.fields.file.value.title}</a>;`
        ),
        output: withProps(`<File field={props.fields.file} />;`),
        errors: [{ messageId: "useFileComponent", data: { fieldName: "props.fields.file" } }],
      },
      {
        name: "FileField src with the field displayName as child",
        code: withProps(
          `<a href={props.fields.file.value.src}>{props.fields.file.value.displayName}</a>;`
        ),
        output: withProps(`<File field={props.fields.file} />;`),
        errors: [{ messageId: "useFileComponent" }],
      },
      {
        name: "other attributes preserved",
        code: withProps(
          `<a className="dl" href={props.fields.file.value.src}>{props.fields.file.value.title}</a>;`
        ),
        output: withProps(`<File field={props.fields.file} className="dl" />;`),
        errors: [{ messageId: "useFileComponent" }],
      },
      {
        name: "optional chaining on value",
        code: withProps(
          `<a href={props.fields.file.value?.src}>{props.fields.file.value?.title}</a>;`
        ),
        output: withProps(`<File field={props.fields.file} />;`),
        errors: [{ messageId: "useFileComponent" }],
      },
      {
        name: "text children are preserved inside <File>",
        code: withProps(`<a href={props.fields.file.value.src}>Download</a>;`),
        output: withProps(`<File field={props.fields.file}>Download</File>;`),
        errors: [{ messageId: "useFileComponent" }],
      },
      {
        name: "element children are preserved inside <File>",
        code: withProps(
          `<a href={props.fields.file.value.src} className="dl"><Icon name="pdf" /> Download</a>;`
        ),
        output: withProps(
          `<File field={props.fields.file} className="dl"><Icon name="pdf" /> Download</File>;`
        ),
        errors: [{ messageId: "useFileComponent" }],
      },
      {
        name: "FileFieldValue used directly",
        code: withProps(`declare const file: FileFieldValue;\n<a href={file.src}>{file.title}</a>;`),
        output: withProps(`declare const file: FileFieldValue;\n<File field={file} />;`),
        errors: [{ messageId: "useFileComponent", data: { fieldName: "file" } }],
      },
      {
        name: "Content SDK field types are detected",
        code: withProps(
          `<a href={props.fields.file.value.src}>{props.fields.file.value.title}</a>;`,
          { pkg: SDK }
        ),
        output: withProps(`<File field={props.fields.file} />;`, { pkg: SDK }),
        errors: [{ messageId: "useFileComponent" }],
      },

      // Import auto-fixer
      {
        name: "fix extends the existing Sitecore import",
        code: withProps(`<a href={props.fields.file.value.src}>{props.fields.file.value.title}</a>;`, {
          imports: FIELD_TYPES,
        }),
        output: withProps(`<File field={props.fields.file} />;`, {
          imports: `${FIELD_TYPES}, File`,
        }),
        errors: [
          { messageId: "useFileComponent" },
          { messageId: "missingImport", data: { name: "File", source: JSS } },
        ],
      },
      {
        name: "a local File binding is a name conflict: report without a fix",
        code: withProps(
          `declare const File: unknown;\n<a href={props.fields.file.value.src}>{props.fields.file.value.title}</a>;`,
          { imports: FIELD_TYPES }
        ),
        output: null,
        errors: [{ messageId: "useFileComponent" }],
      },
    ],
  });
});
