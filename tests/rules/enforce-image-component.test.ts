import { describe } from "vitest";
import rule from "../../lib/rules/enforce-image-component";
import { createRuleTester, SDK, withProps } from "../helpers/fixtures";

const ruleTester = createRuleTester();

describe("enforce-image-component", () => {
  ruleTester.run("enforce-image-component", rule, {
    valid: [
      {
        name: "plain string src",
        code: withProps(`declare const logo: string;\n<img src={logo} alt="logo" />;`),
      },
      {
        name: "literal src",
        code: withProps(`<img src="/static/hero.png" alt="" />;`),
      },
      {
        name: "member of a non-field object",
        code: withProps(`declare const meta: { src: string };\n<img src={meta.src} alt="" />;`),
      },
      {
        name: "already uses <Image>",
        code: withProps(`<Image field={props.fields.image} />;`),
      },
    ],
    invalid: [
      {
        name: "ImageField under strict mode (optional value is a union type)",
        code: withProps(`<img src={props.fields.image.value.src} alt="x" />;`),
        output: withProps(`<Image field={props.fields.image} alt="x" />;`),
        errors: [{ messageId: "useImageComponent", data: { fieldName: "props.fields.image" } }],
      },
      {
        name: "optional chaining on value",
        code: withProps(`<img src={props.fields.image.value?.src} alt="x" />;`),
        output: withProps(`<Image field={props.fields.image} alt="x" />;`),
        errors: [{ messageId: "useImageComponent" }],
      },
      {
        name: "non-null assertion: the fix targets the field, not value!",
        code: withProps(`<img src={props.fields.image.value!.src} alt="y" loading="lazy" />;`),
        output: withProps(`<Image field={props.fields.image} alt="y" loading="lazy" />;`),
        errors: [{ messageId: "useImageComponent" }],
      },
      {
        name: "optional chaining on the field and on value",
        code: withProps(`<img src={props.fields.image?.value?.src} />;`),
        output: withProps(`<Image field={props.fields.image} />;`),
        errors: [{ messageId: "useImageComponent" }],
      },
      {
        name: "ImageFieldValue src, other attributes preserved",
        code: withProps(
          `declare const image: ImageFieldValue;\n<img src={image.src} alt="x" loading="lazy" />;`
        ),
        output: withProps(
          `declare const image: ImageFieldValue;\n<Image field={image} alt="x" loading="lazy" />;`
        ),
        errors: [{ messageId: "useImageComponent", data: { fieldName: "image" } }],
      },
      {
        name: "attributes that read the field value are kept verbatim",
        code: withProps(
          `<img src={props.fields.image.value?.src} alt={props.fields.image.value?.alt} />;`
        ),
        output: withProps(`<Image field={props.fields.image} alt={props.fields.image.value?.alt} />;`),
        errors: [{ messageId: "useImageComponent" }],
      },
      {
        name: "Content SDK field types are detected",
        code: withProps(`<img src={props.fields.image.value?.src} />;`, { pkg: SDK }),
        output: withProps(`<Image field={props.fields.image} />;`, { pkg: SDK }),
        errors: [{ messageId: "useImageComponent" }],
      },
    ],
  });
});
