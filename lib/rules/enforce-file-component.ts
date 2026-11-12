import { ESLintUtils } from "@typescript-eslint/utils";
import { buildAnchorReplacement } from "../utils/anchor";
import { createRule } from "../utils/create-rule";
import { getFieldExpression } from "../utils/fields";
import {
  createImportTracker,
  importOptionsSchema,
  MISSING_IMPORT_MESSAGE,
  type ImportOptions,
} from "../utils/imports";
import { getAttribute, getAttributeExpression, isElementNamed } from "../utils/jsx";
import { getFieldPackage, isFileField, resolveType } from "../utils/type-checking";

type Options = [ImportOptions];
type MessageIds = "useFileComponent" | "missingImport";

export default createRule<Options, MessageIds>({
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
      missingImport: MISSING_IMPORT_MESSAGE,
    },
    schema: [importOptionsSchema],
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const services = ESLintUtils.getParserServices(context);
    const { sourceCode } = context;
    const imports = createImportTracker(sourceCode, "File", options, (descriptor) =>
      context.report({ messageId: "missingImport", ...descriptor })
    );

    return {
      ...imports.listeners,
      JSXElement(element) {
        const opening = element.openingElement;
        if (!isElementNamed(opening, "a")) return;

        const href = getAttribute(opening, "href");
        const expression = href && getAttributeExpression(href);
        if (!expression) return;

        const field = getFieldExpression(expression, ["src"]);
        const type = field && resolveType(services, field);
        if (!field || !type || !isFileField(type)) return;

        const fieldText = sourceCode.getText(field);
        const binding = imports.binding(element);
        const fixable = binding !== "conflict";
        if (binding === "missing") imports.require(opening, getFieldPackage(type));

        context.report({
          node: opening,
          messageId: "useFileComponent",
          data: { fieldName: fieldText },
          fix: fixable
            ? (fixer) =>
                fixer.replaceText(
                  element,
                  buildAnchorReplacement(sourceCode, element, "File", fieldText, [
                    "title",
                    "displayName",
                  ])
                )
            : null,
        });
      },
    };
  },
});
