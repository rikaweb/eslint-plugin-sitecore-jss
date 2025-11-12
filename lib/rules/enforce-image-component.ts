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
const { getType, isImageField } = typeUtils;

export default {
  defaultOptions: [] as never[],
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensure `<Image>` is used instead of raw `<img>` for `ImageField`",
      recommended: "recommended",
    },
    messages: {
      useImageComponent:
        "Use `<Image field={{fieldName}} />` instead of `<img>`. Ensure you are using `ImageField` correctly.",
    },
    fixable: "code",
    schema: [],
  },

  create(context: RuleContext<"useImageComponent", never[]>) {
    const parserServices = ESLintUtils.getParserServices(context);
    if (!parserServices || !parserServices.program) return {};
    const checker = parserServices.program.getTypeChecker();

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (
          node.name.type !== AST_NODE_TYPES.JSXIdentifier ||
          node.name.name !== "img"
        )
          return;

        const srcAttribute = node.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === AST_NODE_TYPES.JSXAttribute &&
            attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
            attr.name.name === "src"
        );
        if (
          !srcAttribute?.value ||
          srcAttribute.value.type !== AST_NODE_TYPES.JSXExpressionContainer
        )
          return;

        const expression = srcAttribute.value.expression;
        if (expression.type !== AST_NODE_TYPES.MemberExpression) return;

        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(
          expression.object
        );
        if (!tsNode) return;

        const type = getType(tsNode, checker);

        if (isImageField(type)) {
          let fieldName = expression as TSESTree.MemberExpression;

          while (fieldName.type === AST_NODE_TYPES.MemberExpression) {
            if (
              fieldName.property.type === AST_NODE_TYPES.Identifier &&
              ["value", "src"].includes(fieldName.property.name)
            ) {
              fieldName = fieldName.object as TSESTree.MemberExpression;
            } else {
              break;
            }
          }

          const fieldNameText = context.getSourceCode().getText(fieldName);
          const parentElement = node.parent as TSESTree.JSXElement;

          // Extract all attributes from the opening element except 'src'
          const attributes = node.attributes
            .filter((attr) => {
              if (attr.type === AST_NODE_TYPES.JSXAttribute) {
                return (
                  attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
                  attr.name.name !== "src"
                );
              }
              return attr.type === AST_NODE_TYPES.JSXSpreadAttribute;
            })
            .map((attr) => context.getSourceCode().getText(attr))
            .join(" ");

          const attributesStr = attributes ? ` ${attributes}` : "";

          context.report({
            node,
            messageId: "useImageComponent",
            data: { fieldName: fieldNameText },
            fix(fixer: RuleFixer) {
              return fixer.replaceText(
                parentElement,
                `<Image field={${fieldNameText}}${attributesStr} />`
              );
            },
          });
        } else {
          console.warn("⚠️ Type is not ImageField, skipping.");
        }
      },
    };
  },
};
