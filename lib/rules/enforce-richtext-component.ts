import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";
import { findFieldChildren } from "../utils/field-children";
import { getFieldExpression } from "../utils/fields";
import {
  getAttribute,
  getAttributeExpression,
  getAttributeStringValue,
  getTagName,
  isElementNamed,
  isIntrinsicElement,
  meaningfulChildren,
  removeAttribute,
  serializeAttributes,
} from "../utils/jsx";
import { isRichTextField, resolveType } from "../utils/type-checking";

type MessageIds =
  | "useRichTextComponent"
  | "useRichTextComponentInWrapper"
  | "avoidNestedPTags"
  | "avoidRichTextPTag"
  | "avoidDangerouslySetInnerHTML";

/** The `__html` expression of `dangerouslySetInnerHTML={{ __html: ... }}`, looking through `?? ""` / `|| ""`. */
function getDangerousHtmlExpression(
  opening: TSESTree.JSXOpeningElement
): TSESTree.Node | undefined {
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

    let value: TSESTree.Node = property.value;
    while (value.type === AST_NODE_TYPES.LogicalExpression) value = value.left;
    return value;
  }
  return undefined;
}

export default createRule<[], MessageIds>({
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
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const { sourceCode } = context;

    const replacement = (
      element: TSESTree.JSXElement,
      tagName: string,
      fieldText: string,
      omit: readonly string[] = []
    ): string => {
      // `<p>` would nest paragraphs; leave the tag off so RichText falls back to its <div> wrapper.
      const tag = tagName === "p" ? "" : ` tag="${tagName}"`;
      return `<RichText field={${fieldText}}${tag}${serializeAttributes(sourceCode, element.openingElement.attributes, omit)} />`;
    };

    return {
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

        const html = getDangerousHtmlExpression(opening);
        if (html) {
          const field = getFieldExpression(html);
          if (field && isRichTextField(resolveType(services, field))) {
            const fieldText = sourceCode.getText(field);
            const safe = intrinsic && meaningfulChildren(element).length === 0;
            context.report({
              node: opening,
              messageId: "avoidDangerouslySetInnerHTML",
              data: { fieldName: fieldText },
              fix: safe
                ? (fixer) =>
                    fixer.replaceText(
                      element,
                      replacement(element, tagName, fieldText, ["dangerouslySetInnerHTML"])
                    )
                : null,
            });
          }
        }

        for (const { fieldText, soleChild } of findFieldChildren(
          sourceCode,
          services,
          element,
          isRichTextField
        )) {
          if (!intrinsic) {
            context.report({
              node: opening,
              messageId: "useRichTextComponentInWrapper",
              data: { tagName, fieldName: fieldText },
            });
            continue;
          }
          context.report({
            node: opening,
            messageId: tagName === "p" ? "avoidNestedPTags" : "useRichTextComponent",
            data: { tagName, fieldName: fieldText },
            fix: soleChild
              ? (fixer) => fixer.replaceText(element, replacement(element, tagName, fieldText))
              : null,
          });
        }
      },
    };
  },
});
