// Desired behaviour for bugs found in the v2 review (docs/v2-plan.md, "Per-rule behaviour changes").
// Every case is registered with `it.fails`: it passes while the bug exists and fails with
// "expected test to fail" once the fix lands. When that happens, move the case to tests/rules/.
import { describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/enforce-text-component";
import {
  asRuleModule,
  createRuleTester,
  FIELD_TYPES,
  JSS,
  SDK,
  withProps,
} from "../helpers/fixtures";

RuleTester.it = it.fails as unknown as typeof RuleTester.it;

const ruleTester = createRuleTester();
const textRule = asRuleModule<"useTextComponent">(rule);

describe("enforce-text-component: known bugs (expected failures until fixed)", () => {
  ruleTester.run("enforce-text-component", textRule, {
    valid: [],
    invalid: [
      // Phase 3: detection through optional chaining
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
      // Phase 3: never produce a lossy fix
      {
        name: "mixed children: report without a fix",
        code: withProps(`<h3>Hello {props.fields.title.value}</h3>;`),
        output: null,
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "custom component wrapper: report without a fix",
        code: withProps(
          `declare const Typography: (p: { children?: unknown }) => unknown;\n<Typography>{props.fields.title.value}</Typography>;`
        ),
        output: null,
        errors: [{ messageId: "useTextComponent" }],
      },
      // Phase 4: import auto-fixer
      {
        name: "fix adds Text to the existing Sitecore import",
        code: withProps(`<h1>{props.fields.title.value}</h1>;`, { imports: FIELD_TYPES }),
        output: withProps(`<Text field={props.fields.title} tag="h1" />;`, {
          imports: `${FIELD_TYPES}, Text`,
        }),
        errors: [{ messageId: "useTextComponent" }],
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
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "fix imports from the Content SDK package when the field type comes from it",
        code: withProps(`<h1>{props.fields.title.value}</h1>;`, {
          pkg: SDK,
          imports: FIELD_TYPES,
        }),
        output: withProps(`<Text field={props.fields.title} tag="h1" />;`, {
          pkg: SDK,
          imports: `${FIELD_TYPES}, Text`,
        }),
        errors: [{ messageId: "useTextComponent" }],
      },
      {
        name: "name conflict: report without a fix when Text is already bound to something else",
        code: withProps(`declare function Text(): null;\n<h1>{props.fields.title.value}</h1>;`, {
          imports: FIELD_TYPES,
        }),
        output: null,
        errors: [{ messageId: "useTextComponent" }],
      },
    ],
  });
});
