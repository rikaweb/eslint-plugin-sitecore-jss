import {
  ESLintUtils,
  TSESTree,
  AST_NODE_TYPES,
} from "@typescript-eslint/utils";
import {
  RuleContext,
  RuleFixer,
} from "@typescript-eslint/utils/dist/ts-eslint";
import typeUtils from "./utils/type-checking";
const { getType, isRichTextField } = typeUtils;

export default {
  defaultOptions: [] as never[],
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensure `<RichText>` is used for `RichTextField` instead of raw JSX elements.",
      recommended: "recommended",
    },
    messages: {
      useRichTextComponent:
        "Use `<RichText field={{fieldName}} tag='{{tagName}}' />` instead of `{props.fields.body.value}` inside `<{{tagName}}>`. `RichTextField` should always use `<RichText />`.",
      avoidNestedPTags:
        "RichTextField in `<p>` tags creates nested `<p>` elements which is invalid HTML. Use `<RichText field={{fieldName}} />` or change the wrapper to `<div>`.",
      avoidRichTextPTag:
        'Using `<RichText>` with `tag="p"` creates nested `<p>` elements since Sitecore automatically adds `<p>` tags. Remove the `tag` attribute or use `tag="div"`.',
    },
    fixable: "code",
    schema: [],
  },

  create(
    context: RuleContext<
      "useRichTextComponent" | "avoidNestedPTags" | "avoidRichTextPTag",
      never[]
    >
  ) {
    const parserServices = ESLintUtils.getParserServices(context);
    if (!parserServices || !parserServices.program) return {};
    const checker = parserServices.program.getTypeChecker();

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== AST_NODE_TYPES.JSXIdentifier) return;
        const tagName = node.name.name;

        // Check for RichText component with tag="p"
        if (tagName === "RichText") {
          const tagAttribute = node.attributes.find(
            (attr): attr is TSESTree.JSXAttribute =>
              attr.type === AST_NODE_TYPES.JSXAttribute &&
              attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
              attr.name.name === "tag"
          );

          if (
            tagAttribute?.value &&
            tagAttribute.value.type === AST_NODE_TYPES.Literal &&
            tagAttribute.value.value === "p"
          ) {
            context.report({
              node,
              messageId: "avoidRichTextPTag",
              fix(fixer: RuleFixer) {
                // Auto-fix: remove the tag="p" attribute
                return fixer.removeRange([
                  tagAttribute.range![0] - 1, // Include the space before the attribute
                  tagAttribute.range![1],
                ]);
              },
            });
          }
          return; // Don't process RichText components further
        }

        const parentElement = node.parent as TSESTree.JSXElement;
        if (!parentElement?.children) return;

        parentElement.children.forEach((child: TSESTree.JSXChild) => {
          if (
            child.type === AST_NODE_TYPES.JSXExpressionContainer &&
            child.expression.type === AST_NODE_TYPES.MemberExpression
          ) {
            const tsNode = parserServices.esTreeNodeToTSNodeMap.get(
              child.expression.object
            );
            if (!tsNode) return;

            const type = getType(tsNode, checker);
            if (isRichTextField(type)) {
              let fieldName = child.expression as TSESTree.MemberExpression;
              while (fieldName.type === AST_NODE_TYPES.MemberExpression) {
                if (
                  fieldName.property.type === AST_NODE_TYPES.Identifier &&
                  fieldName.property.name === "value"
                ) {
                  fieldName = fieldName.object as TSESTree.MemberExpression;
                } else {
                  break;
                }
              }
              const fieldNameText = context.getSourceCode().getText(fieldName);

              // Extract all attributes from the opening element
              const attributes = node.attributes
                .map((attr) => {
                  if (attr.type === AST_NODE_TYPES.JSXAttribute) {
                    return context.getSourceCode().getText(attr);
                  } else if (attr.type === AST_NODE_TYPES.JSXSpreadAttribute) {
                    return context.getSourceCode().getText(attr);
                  }
                  return "";
                })
                .filter((attr) => attr !== "")
                .join(" ");

              const attributesStr = attributes ? ` ${attributes}` : "";

              // Special case: if RichTextField is inside a <p> tag, warn about nested <p> tags
              if (tagName === "p") {
                context.report({
                  node,
                  messageId: "avoidNestedPTags",
                  data: { fieldName: fieldNameText },
                  fix(fixer: RuleFixer) {
                    // Auto-fix: use <RichText> without specifying tag (defaults to div)
                    // or explicitly use div to avoid nested p tags
                    return fixer.replaceText(
                      parentElement,
                      `<RichText field={${fieldNameText}}${attributesStr} />`
                    );
                  },
                });
              } else {
                // Original behavior for other tags
                context.report({
                  node,
                  messageId: "useRichTextComponent",
                  data: { tagName, fieldName: fieldNameText },
                  fix(fixer: RuleFixer) {
                    return fixer.replaceText(
                      parentElement,
                      `<RichText field={${fieldNameText}} tag="${tagName}"${attributesStr} />`
                    );
                  },
                });
              }
            }
          }
        });
      },
    };
  },
};
