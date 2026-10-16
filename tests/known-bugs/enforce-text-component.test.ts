// Desired behaviour that is not implemented yet (docs/v2-plan.md, decision 6: import auto-fixer,
// Phase 4). Every case is registered with `it.fails`: it passes while the gap exists and fails with
// "expected test to fail" once the fix lands. When that happens, move the case to tests/rules/.
import { describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/enforce-text-component";
import { createRuleTester, FIELD_TYPES, JSS, SDK, withProps } from "../helpers/fixtures";

RuleTester.it = it.fails as unknown as typeof RuleTester.it;

const ruleTester = createRuleTester();

describe("enforce-text-component: import auto-fixer (expected failures until Phase 4)", () => {
  ruleTester.run("enforce-text-component", rule, {
    valid: [],
    invalid: [
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
