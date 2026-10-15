// Desired behaviour for bugs found in the v2 review (docs/v2-plan.md, "Per-rule behaviour changes").
// Every case is registered with `it.fails`: it passes while the bug exists and fails with
// "expected test to fail" once the fix lands. When that happens, move the case to tests/rules/.
import { describe, it } from "vitest";
import { RuleTester } from "@typescript-eslint/rule-tester";
import rule from "../../lib/rules/enforce-link-component";
import { asRuleModule, createRuleTester, withProps } from "../helpers/fixtures";

RuleTester.it = it.fails as unknown as typeof RuleTester.it;

const ruleTester = createRuleTester();
const linkRule = asRuleModule<"useLinkComponent">(rule);

describe("enforce-link-component: known bugs (expected failures until fixed)", () => {
  ruleTester.run("enforce-link-component", linkRule, {
    valid: [],
    invalid: [
      // Phase 3: detection through optional chaining
      {
        name: "optional chaining on value is detected",
        code: withProps(
          `<a href={props.fields.link.value?.href}>{props.fields.link.value?.text}</a>;`
        ),
        output: withProps(`<Link field={props.fields.link} />;`),
        errors: [{ messageId: "useLinkComponent" }],
      },
      {
        name: "optional chaining on the field is detected",
        code: withProps(
          `<a href={props.fields.link?.value.href}>{props.fields.link?.value.text}</a>;`
        ),
        output: withProps(`<Link field={props.fields.link} />;`),
        errors: [{ messageId: "useLinkComponent" }],
      },
      // Phase 3: children other than the field's own text are kept
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
    ],
  });
});
