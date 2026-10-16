import { ESLintUtils } from "@typescript-eslint/utils";
import { buildAnchorReplacement } from "../utils/anchor";
import { createRule } from "../utils/create-rule";
import { getFieldExpression } from "../utils/fields";
import { getAttribute, getAttributeExpression, isElementNamed } from "../utils/jsx";
import { isLinkField, resolveType } from "../utils/type-checking";

export default createRule<[], "useLinkComponent">({
  name: "enforce-link-component",
  meta: {
    type: "problem",
    docs: {
      description:
        "Render Sitecore link fields (`LinkField`) with `<Link>` instead of a raw `<a href={...}>`",
      recommended: true,
      requiresTypeChecking: true,
    },
    fixable: "code",
    messages: {
      useLinkComponent:
        "Use `<Link field={{{fieldName}}} />` instead of `<a>` for the Sitecore link field `{{fieldName}}`, so the link stays editable in Sitecore.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const { sourceCode } = context;

    return {
      JSXElement(element) {
        const opening = element.openingElement;
        if (!isElementNamed(opening, "a")) return;

        const href = getAttribute(opening, "href");
        const expression = href && getAttributeExpression(href);
        if (!expression) return;

        const field = getFieldExpression(expression, ["href"]);
        if (!field || !isLinkField(resolveType(services, field))) return;

        const fieldText = sourceCode.getText(field);
        context.report({
          node: opening,
          messageId: "useLinkComponent",
          data: { fieldName: fieldText },
          fix: (fixer) =>
            fixer.replaceText(
              element,
              buildAnchorReplacement(sourceCode, element, "Link", fieldText, ["text"])
            ),
        });
      },
    };
  },
});
