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
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensure `<RichText>` is used for `RichTextField` instead of raw JSX elements.",
      recommended: true,
    },
    messages: {
      useRichTextComponent:
        "Use `<RichText field={{fieldName}} tag='{{tagName}}' />` instead of `{props.fields.body.value}` inside `<{{tagName}}>`. `RichTextField` should always use `<RichText />`.",
    },
    fixable: "code",
    schema: [],
  },

  create(context: RuleContext<"useRichTextComponent", never[]>) {
    const parserServices = ESLintUtils.getParserServices(context);
    if (!parserServices || !parserServices.program) return {};
    const checker = parserServices.program.getTypeChecker();

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== AST_NODE_TYPES.JSXIdentifier) return;
        const tagName = node.name.name;
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

              context.report({
                node,
                messageId: "useRichTextComponent",
                data: { tagName, fieldName: fieldNameText },
                fix(fixer: RuleFixer) {
                  return fixer.replaceText(
                    parentElement,
                    `<RichText field={${fieldNameText}} tag="${tagName}" />`
                  );
                },
              });
            }
          }
        });
      },
    };
  },
};
