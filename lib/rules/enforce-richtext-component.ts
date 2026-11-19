import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";
import { findFieldChildren } from "../utils/field-children";
import { getFieldExpression } from "../utils/fields";
import {
  createImportTracker,
  importOptionsSchema,
  MISSING_IMPORT_MESSAGE,
  type ImportOptions,
} from "../utils/imports";
import {
  dropsComments,
  getAttribute,
  getAttributeExpression,
  getAttributeStringValue,
  getTagName,
  isAnchorWithHref,
  isElementNamed,
  isIntrinsicElement,
  meaningfulChildren,
  removeAttribute,
  serializeAttributes,
} from "../utils/jsx";
import { getFieldPackage, isRichTextField, resolveType } from "../utils/type-checking";

type Options = [ImportOptions];
type MessageIds =
  | "useRichTextComponent"
  | "useRichTextComponentInWrapper"
  | "avoidNestedPTags"
  | "avoidRichTextPTag"
  | "avoidDangerouslySetInnerHTML"
  | "missingImport";

/** `""`, an empty template literal, `null` or `undefined`: a fallback that renders nothing. */
function isEmptyFallback(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Literal) return node.value === "" || node.value === null;
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.expressions.length === 0 && node.quasis.every((quasi) => quasi.value.raw === "");
  }
  return node.type === AST_NODE_TYPES.Identifier && node.name === "undefined";
}

interface DangerousHtml {
  /** The expression that supplies the HTML, with fallbacks and guards stripped. */
  expression: TSESTree.Node;
  /** False when stripping dropped something that renders (`|| "<p>Default</p>"`, `?? other.value`). */
  lossless: boolean;
}

/**
 * The `__html` expression of `dangerouslySetInnerHTML={{ __html: ... }}`, looking through `?? ""` / `|| ""`.
 * Any other fallback or guard is looked through too, so the misuse is still reported, but marked as
 * lossy so that no fix is offered: `<RichText>` could not reproduce it.
 */
function getDangerousHtml(opening: TSESTree.JSXOpeningElement): DangerousHtml | undefined {
  const attribute = getAttribute(opening, "dangerouslySetInnerHTML");
  const object = attribute && getAttributeExpression(attribute);
  if (!object || object.type !== AST_NODE_TYPES.ObjectExpression) return undefined;

  for (const property of object.properties) {
    if (property.type !== AST_NODE_TYPES.Property) continue;
    const { key } = property;
    const isHtml =
      (key.type === AST_NODE_TYPES.Identifier && key.name === "__html") ||
      (key.type === AST_NODE_TYPES.Literal && key.value === "__html");
    if (!isHtml) continue;

    let expression: TSESTree.Node = property.value;
    let lossless = true;
    while (expression.type === AST_NODE_TYPES.LogicalExpression) {
      if (expression.operator === "&&" || !isEmptyFallback(expression.right)) lossless = false;
      expression = expression.left;
    }
    return { expression, lossless };
  }
  return undefined;
}

export default createRule<Options, MessageIds>({
  name: "enforce-richtext-component",
  meta: {
    type: "problem",
    docs: {
      description:
        "Render Sitecore rich text fields (`RichTextField`) with `<RichText>` instead of reading `.value` or using `dangerouslySetInnerHTML`, and avoid nested `<p>` elements",
      recommended: true,
      requiresTypeChecking: true,
    },
    fixable: "code",
    messages: {
      useRichTextComponent:
        'Render `{{fieldName}}` with `<RichText field={{{fieldName}}} tag="{{tagName}}" />` instead of reading its value inside `<{{tagName}}>`; `<RichText>` renders the HTML and keeps the field editable in Sitecore.',
      useRichTextComponentInWrapper:
        "`<{{tagName}}>` renders the value of `{{fieldName}}` directly. Pass the field to `<RichText field={{{fieldName}}} />` so its HTML renders and stays editable in Sitecore.",
      avoidNestedPTags:
        "Rendering the rich text field `{{fieldName}}` inside `<p>` creates nested `<p>` elements, because Sitecore wraps rich text in paragraphs. Use `<RichText field={{{fieldName}}} />` (a `<div>` wrapper by default) or change the wrapper.",
      avoidRichTextPTag:
        '`<RichText tag="p">` creates nested `<p>` elements, because Sitecore wraps rich text in paragraphs. Remove the `tag` attribute or use a block wrapper such as `tag="div"`.',
      avoidDangerouslySetInnerHTML:
        "Render `{{fieldName}}` with `<RichText field={{{fieldName}}} />` instead of `dangerouslySetInnerHTML`; `<RichText>` already renders the field's HTML and keeps it editable in Sitecore.",
      missingImport: MISSING_IMPORT_MESSAGE,
    },
    schema: [importOptionsSchema],
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const services = ESLintUtils.getParserServices(context);
    const { sourceCode } = context;
    const imports = createImportTracker(sourceCode, "RichText", options, (descriptor) =>
      context.report({ messageId: "missingImport", ...descriptor })
    );

    /**
     * The `<RichText>` replacement for `element`, or undefined when no fix may be offered: `RichText`
     * is bound to something else, or the replacement would drop a comment. Records the import need.
     */
    const replacement = (
      element: TSESTree.JSXElement,
      tagName: string,
      field: TSESTree.Node,
      type: Parameters<typeof getFieldPackage>[0],
      omit: readonly string[] = []
    ): string | undefined => {
      const { binding, name: component } = imports.resolve(element);
      if (binding === "conflict" || dropsComments(sourceCode, element, omit, [field])) {
        return undefined;
      }
      if (binding === "missing") imports.require(element.openingElement, getFieldPackage(type));
      // `<p>` would nest paragraphs; leave the tag off so RichText falls back to its <div> wrapper.
      const tag = tagName === "p" ? "" : ` tag="${tagName}"`;
      return `<${component} field={${sourceCode.getText(field)}}${tag}${serializeAttributes(sourceCode, element.openingElement.attributes, omit)} />`;
    };

    return {
      ...imports.listeners,
      JSXElement(element) {
        const opening = element.openingElement;

        if (isElementNamed(opening, "RichText")) {
          const tag = getAttribute(opening, "tag");
          if (tag && getAttributeStringValue(tag) === "p") {
            context.report({
              node: tag,
              messageId: "avoidRichTextPTag",
              fix: (fixer) => removeAttribute(fixer, sourceCode, tag),
            });
          }
          return;
        }

        const tagName = getTagName(opening, sourceCode);
        const intrinsic = isIntrinsicElement(opening);

        const html = getDangerousHtml(opening);
        if (html) {
          const field = getFieldExpression(html.expression);
          const type = field && resolveType(services, field);
          if (field && type && isRichTextField(type)) {
            const fieldText = sourceCode.getText(field);
            const safe = intrinsic && html.lossless && meaningfulChildren(element).length === 0;
            const text = safe
              ? replacement(element, tagName, field, type, ["dangerouslySetInnerHTML"])
              : undefined;
            context.report({
              node: opening,
              messageId: "avoidDangerouslySetInnerHTML",
              data: { fieldName: fieldText },
              fix: text !== undefined ? (fixer) => fixer.replaceText(element, text) : null,
            });
          }
        }

        for (const { field, fieldText, type, soleChild } of findFieldChildren(
          sourceCode,
          services,
          element,
          isRichTextField
        )) {
          // Like a component wrapper, an `<a href>` is never rewritten: see `isAnchorWithHref`.
          if (!intrinsic || isAnchorWithHref(opening)) {
            context.report({
              node: opening,
              messageId: "useRichTextComponentInWrapper",
              data: { tagName, fieldName: fieldText },
            });
            continue;
          }
          const text = soleChild ? replacement(element, tagName, field, type) : undefined;
          context.report({
            node: opening,
            messageId: tagName === "p" ? "avoidNestedPTags" : "useRichTextComponent",
            data: { tagName, fieldName: fieldText },
            fix: text !== undefined ? (fixer) => fixer.replaceText(element, text) : null,
          });
        }
      },
    };
  },
});
