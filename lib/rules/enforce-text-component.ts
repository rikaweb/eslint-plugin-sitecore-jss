import { ESLintUtils } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";
import { findFieldChildren } from "../utils/field-children";
import { serializeAttributes } from "../utils/jsx";
import { isTextLike } from "../utils/type-checking";

type MessageIds = "useTextComponent" | "useTextComponentInWrapper";

export default createRule<[], MessageIds>({
  name: "enforce-text-component",
  meta: {
    type: "problem",
    docs: {
      description:
        "Render Sitecore text fields (`Field<string>`, `TextField`) with `<Text>` instead of reading `.value` inside a JSX element",
      recommended: true,
      requiresTypeChecking: true,
    },
    fixable: "code",
    messages: {
      useTextComponent:
        'Render `{{fieldName}}` with `<Text field={{{fieldName}}} tag="{{tagName}}" />` instead of reading its value inside `<{{tagName}}>`, so the field stays editable in Sitecore.',
      useTextComponentInWrapper:
        "`<{{tagName}}>` renders the value of `{{fieldName}}` directly. Pass the field to `<Text field={{{fieldName}}} />` (or let `{{tagName}}` accept the field) so it stays editable in Sitecore.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const { sourceCode } = context;

    return {
      JSXElement(element) {
        const matches = findFieldChildren(sourceCode, services, element, (type) =>
          isTextLike(type, checker)
        );
        for (const { opening, tagName, intrinsic, fieldText, soleChild } of matches) {
          if (!intrinsic) {
            context.report({
              node: opening,
              messageId: "useTextComponentInWrapper",
              data: { tagName, fieldName: fieldText },
            });
            continue;
          }
          context.report({
            node: opening,
            messageId: "useTextComponent",
            data: { tagName, fieldName: fieldText },
            // Only replace the element when the field is its sole content; otherwise a fix would drop text.
            fix: soleChild
              ? (fixer) =>
                  fixer.replaceText(
                    element,
                    `<Text field={${fieldText}} tag="${tagName}"${serializeAttributes(sourceCode, opening.attributes)} />`
                  )
              : null,
          });
        }
      },
    };
  },
});
