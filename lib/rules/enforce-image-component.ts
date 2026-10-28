import { ESLintUtils } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";
import { getFieldExpression } from "../utils/fields";
import {
  createImportTracker,
  importOptionsSchema,
  MISSING_IMPORT_MESSAGE,
  type ImportOptions,
} from "../utils/imports";
import {
  getAttribute,
  getAttributeExpression,
  isElementNamed,
  serializeAttributes,
} from "../utils/jsx";
import { getFieldPackage, isImageField, resolveType } from "../utils/type-checking";

type Options = [ImportOptions];
type MessageIds = "useImageComponent" | "missingImport";

export default createRule<Options, MessageIds>({
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
      missingImport: MISSING_IMPORT_MESSAGE,
    },
    schema: [importOptionsSchema],
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const services = ESLintUtils.getParserServices(context);
    const { sourceCode } = context;
    const imports = createImportTracker(sourceCode, "Image", options, (descriptor) =>
      context.report({ messageId: "missingImport", ...descriptor })
    );

    return {
      ...imports.listeners,
      JSXElement(element) {
        const opening = element.openingElement;
        if (!isElementNamed(opening, "img")) return;

        const src = getAttribute(opening, "src");
        const expression = src && getAttributeExpression(src);
        if (!expression) return;

        const field = getFieldExpression(expression, ["src"]);
        const type = field && resolveType(services, field);
        if (!field || !type || !isImageField(type)) return;

        const fieldText = sourceCode.getText(field);
        const binding = imports.binding(element);
        const fixable = binding !== "conflict";
        if (binding === "missing") imports.require(opening, getFieldPackage(type));

        context.report({
          node: opening,
          messageId: "useImageComponent",
          data: { fieldName: fieldText },
          fix: fixable
            ? (fixer) =>
                fixer.replaceText(
                  element,
                  `<Image field={${fieldText}}${serializeAttributes(sourceCode, opening.attributes, ["src"])} />`
                )
            : null,
        });
      },
    };
  },
});
