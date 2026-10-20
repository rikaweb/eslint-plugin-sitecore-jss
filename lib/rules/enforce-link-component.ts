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
import { getFieldPackage, isLinkField, resolveType } from "../utils/type-checking";

type Options = [ImportOptions];
type MessageIds = "useLinkComponent" | "missingImport";

export default createRule<Options, MessageIds>({
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
      missingImport: MISSING_IMPORT_MESSAGE,
    },
    schema: [importOptionsSchema],
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const services = ESLintUtils.getParserServices(context);
    const { sourceCode } = context;
    const imports = createImportTracker(sourceCode, "Link", options, (descriptor) =>
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

        const field = getFieldExpression(expression, ["href"]);
        const type = field && resolveType(services, field);
        if (!field || !type || !isLinkField(type)) return;

        const fieldText = sourceCode.getText(field);
        // `Link` is commonly bound to next/link; never shadow it.
        const binding = imports.binding(element);
        const fixable = binding !== "conflict";
        if (binding === "missing") imports.require(opening, getFieldPackage(type));

        context.report({
          node: opening,
          messageId: "useLinkComponent",
          data: { fieldName: fieldText },
          fix: fixable
            ? (fixer) =>
                fixer.replaceText(
                  element,
                  buildAnchorReplacement(sourceCode, element, "Link", fieldText, ["text"])
                )
            : null,
        });
      },
    };
  },
});
