import { ESLintUtils } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";
import { findFieldChildren } from "../utils/field-children";
import {
  createImportTracker,
  importOptionsSchema,
  MISSING_IMPORT_MESSAGE,
  type ImportOptions,
} from "../utils/imports";
import { serializeAttributes } from "../utils/jsx";
import { getFieldPackage, isTextLike } from "../utils/type-checking";

type Options = [ImportOptions];
type MessageIds = "useTextComponent" | "useTextComponentInWrapper" | "missingImport";

export default createRule<Options, MessageIds>({
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
      missingImport: MISSING_IMPORT_MESSAGE,
    },
    schema: [importOptionsSchema],
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const { sourceCode } = context;
    const imports = createImportTracker(sourceCode, "Text", options, (descriptor) =>
      context.report({ messageId: "missingImport", ...descriptor })
    );

    return {
      ...imports.listeners,
      JSXElement(element) {
        const matches = findFieldChildren(sourceCode, services, element, (type) =>
          isTextLike(type, checker)
        );
        for (const { opening, tagName, intrinsic, fieldText, type, soleChild } of matches) {
          if (!intrinsic) {
            context.report({
              node: opening,
              messageId: "useTextComponentInWrapper",
              data: { tagName, fieldName: fieldText },
            });
            continue;
          }

          // Only replace the element when the field is its sole content (a fix must not drop text)
          // and `Text` is free to import (a fix must not shadow another binding).
          const binding = imports.binding(element);
          const fixable = soleChild && binding !== "conflict";
          if (fixable && binding === "missing") imports.require(opening, getFieldPackage(type));

          context.report({
            node: opening,
            messageId: "useTextComponent",
            data: { tagName, fieldName: fieldText },
            fix: fixable
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
