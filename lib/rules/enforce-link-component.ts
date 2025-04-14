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
const { getType, isLinkField } = typeUtils;

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensure `<Link>` is used instead of raw `<a>` for `LinkField`.",
      recommended: true,
    },
    messages: {
      useLinkComponent:
        "Use `<Link field={{{fieldName}}} />` instead of `<a>`. Make sure you are using `LinkField`.",
    },
    fixable: "code",
    schema: [],
  },

  create(context: RuleContext<"useLinkComponent", never[]>) {
    const parserServices = ESLintUtils.getParserServices(context);
    if (!parserServices || !parserServices.program) return {};
    const checker = parserServices.program.getTypeChecker();

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (
          node.name.type !== AST_NODE_TYPES.JSXIdentifier ||
          node.name.name !== "a"
        )
          return;

        const hrefAttr = node.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === AST_NODE_TYPES.JSXAttribute &&
            attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
            attr.name.name === "href"
        );
        if (
          !hrefAttr?.value ||
          hrefAttr.value.type !== AST_NODE_TYPES.JSXExpressionContainer
        ) {
          console.warn("⚠️ `href` does not contain an expression, skipping.");
          return;
        }

        const expression = hrefAttr.value.expression;
        if (expression.type !== AST_NODE_TYPES.MemberExpression) {
          console.warn(
            "⚠️ `href` is not a MemberExpression, skipping:",
            context.getSourceCode().getText(expression)
          );
          return;
        }

        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(
          expression.object
        );
        if (!tsNode) {
          console.warn("⚠️ TypeScript Node not found.");
          return;
        }

        const type = getType(tsNode, checker);

        if (isLinkField(type)) {
          let fieldName = expression as TSESTree.MemberExpression;
          while (fieldName.type === AST_NODE_TYPES.MemberExpression) {
            if (
              fieldName.property.type === AST_NODE_TYPES.Identifier &&
              (fieldName.property.name === "value" ||
                fieldName.property.name === "href")
            ) {
              fieldName = fieldName.object as TSESTree.MemberExpression;
            } else {
              break;
            }
          }

          const fieldNameText = context.getSourceCode().getText(fieldName);
          const parentElement = node.parent as TSESTree.JSXElement;

          context.report({
            node,
            messageId: "useLinkComponent",
            data: { fieldName: fieldNameText },
            fix(fixer: RuleFixer) {
              return fixer.replaceText(
                parentElement,
                `<Link field={${fieldNameText}} />`
              );
            },
          });
        }
      },
    };
  },
};
