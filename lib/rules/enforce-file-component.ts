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
const { getType, isFileField } = typeUtils;

export default {
  defaultOptions: [] as never[],
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensure `<File>` is used instead of raw `<a>` for `FileField`.",
      recommended: "recommended",
    },
    messages: {
      useFileComponent:
        "Use `<File field={{fieldName}} />` instead of `<a>` for Sitecore file fields.",
    },
    fixable: "code",
    schema: [],
  },

  create(context: RuleContext<"useFileComponent", never[]>) {
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

        // Find the `href` attribute
        const hrefAttr = node.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === AST_NODE_TYPES.JSXAttribute &&
            attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
            attr.name.name === "href"
        );
        if (
          !hrefAttr?.value ||
          hrefAttr.value.type !== AST_NODE_TYPES.JSXExpressionContainer
        )
          return;

        const expression = hrefAttr.value.expression;
        if (expression.type !== AST_NODE_TYPES.MemberExpression) return;

        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(
          expression.object
        );
        if (!tsNode) {
          console.warn("⚠️ TypeScript Node not found.");
          return;
        }

        const type = getType(tsNode, checker);

        if (isFileField(type)) {
          let fieldName = expression as TSESTree.MemberExpression;

          // Step back to remove ".value" if it exists
          while (fieldName.type === AST_NODE_TYPES.MemberExpression) {
            if (
              fieldName.property.type === AST_NODE_TYPES.Identifier &&
              (fieldName.property.name === "value" ||
                fieldName.property.name === "src")
            ) {
              fieldName = fieldName.object as TSESTree.MemberExpression;
            } else {
              break;
            }
          }

          const fieldNameText = context.getSourceCode().getText(fieldName);

          // Extract all attributes from the opening element except 'href'
          const attributes = node.attributes
            .filter((attr) => {
              if (attr.type === AST_NODE_TYPES.JSXAttribute) {
                return (
                  attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
                  attr.name.name !== "href"
                );
              }
              return attr.type === AST_NODE_TYPES.JSXSpreadAttribute;
            })
            .map((attr) => context.getSourceCode().getText(attr))
            .join(" ");

          const attributesStr = attributes ? ` ${attributes}` : "";

          context.report({
            node,
            messageId: "useFileComponent",
            data: { fieldName: fieldNameText },
            fix(fixer: RuleFixer) {
              return fixer.replaceText(
                node.parent as TSESTree.JSXElement,
                `<File field={${fieldNameText}}${attributesStr} />`
              );
            },
          });
        }
      },
    };
  },
};
