import { ESLintUtils } from "@typescript-eslint/utils";
import { buildAnchorReplacement } from "../utils/anchor";
import { createRule } from "../utils/create-rule";
import { getFieldExpression } from "../utils/fields";
import { getAttribute, getAttributeExpression, isElementNamed } from "../utils/jsx";
import { isFileField, resolveType } from "../utils/type-checking";

export default createRule<[], "useFileComponent">({
  name: "enforce-file-component",
  meta: {
    type: "problem",
    docs: {
      description:
        "Render Sitecore file fields (`FileField`) with `<File>` instead of a raw `<a href={...}>`",
      recommended: true,
      requiresTypeChecking: true,
    },
    fixable: "code",
    messages: {
      useFileComponent:
        "Use `<File field={{{fieldName}}} />` instead of `<a>` for the Sitecore file field `{{fieldName}}`, so the file link stays editable in Sitecore.",
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

        const field = getFieldExpression(expression, ["src"]);
        if (!field || !isFileField(resolveType(services, field))) return;

        const fieldText = sourceCode.getText(field);
        context.report({
          node: opening,
          messageId: "useFileComponent",
          data: { fieldName: fieldText },
          fix: (fixer) =>
            fixer.replaceText(
              element,
              buildAnchorReplacement(sourceCode, element, "File", fieldText, [
                "title",
                "displayName",
              ])
            ),
        });
      },
    };
  },
});
