// Desired behaviour for bugs found in the v2 review (docs/v2-plan.md, "Per-rule behaviour changes").
// Every case is registered with `it.fails`: it passes while the bug exists and fails with
// "expected test to fail" once the fix lands. When that happens, move the case to tests/rules/.
import { describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/enforce-image-component";
import { asRuleModule, createRuleTester, withProps } from "../helpers/fixtures";

RuleTester.it = it.fails as unknown as typeof RuleTester.it;

const ruleTester = createRuleTester();
const imageRule = asRuleModule<"useImageComponent">(rule);

describe("enforce-image-component: known bugs (expected failures until fixed)", () => {
  ruleTester.run("enforce-image-component", imageRule, {
    valid: [],
    invalid: [
      // Phase 3: ImageField.value is optional, so under strictNullChecks `.value.src` reads from a
      // union type (ImageFieldValue | undefined); the rule must look through the union.
      {
        name: "optional ImageField.value under strict mode is detected",
        code: withProps(`<img src={props.fields.image.value.src} alt="x" />;`),
        output: withProps(`<Image field={props.fields.image} alt="x" />;`),
        errors: [{ messageId: "useImageComponent" }],
      },
      // Phase 3: detection through optional chaining and non-null assertions
      {
        name: "optional chaining on value is detected",
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
    ],
  });
});
