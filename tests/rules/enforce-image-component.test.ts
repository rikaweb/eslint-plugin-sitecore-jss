import { describe } from "vitest";
import rule from "../../lib/rules/enforce-image-component";
import { asRuleModule, createRuleTester, SDK, withProps } from "../helpers/fixtures";

const ruleTester = createRuleTester();
const imageRule = asRuleModule<"useImageComponent">(rule);

describe("enforce-image-component", () => {
  ruleTester.run("enforce-image-component", imageRule, {
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
        name: "Content SDK field types are detected",
        code: withProps(`declare const image: ImageFieldValue;\n<img src={image.src} />;`, {
          pkg: SDK,
        }),
        output: withProps(`declare const image: ImageFieldValue;\n<Image field={image} />;`, {
          pkg: SDK,
        }),
        errors: [{ messageId: "useImageComponent" }],
      },
    ],
  });
});
