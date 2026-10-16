import { ESLintUtils } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";
import { getFieldExpression } from "../utils/fields";
import {
  getAttribute,
  getAttributeExpression,
  isElementNamed,
  serializeAttributes,
} from "../utils/jsx";
import { isImageField, resolveType } from "../utils/type-checking";

export default createRule<[], "useImageComponent">({
  name: "enforce-image-component",
  meta: {
    type: "problem",
    docs: {
      description:
        "Render Sitecore image fields (`ImageField`) with `<Image>` instead of a raw `<img src={...}>`",
      recommended: true,
      requiresTypeChecking: true,
    },
    fixable: "code",
    messages: {
      useImageComponent:
        "Use `<Image field={{{fieldName}}} />` instead of `<img>` for the Sitecore image field `{{fieldName}}`, so the image stays editable and gets Sitecore media handling.",
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
        if (!isElementNamed(opening, "img")) return;

        const src = getAttribute(opening, "src");
        const expression = src && getAttributeExpression(src);
        if (!expression) return;

        const field = getFieldExpression(expression, ["src"]);
        if (!field || !isImageField(resolveType(services, field))) return;

        const fieldText = sourceCode.getText(field);
        context.report({
          node: opening,
          messageId: "useImageComponent",
          data: { fieldName: fieldText },
          fix: (fixer) =>
            fixer.replaceText(
              element,
              `<Image field={${fieldText}}${serializeAttributes(sourceCode, opening.attributes, ["src"])} />`
            ),
        });
      },
    };
  },
});
