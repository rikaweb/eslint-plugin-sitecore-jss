const { ESLintUtils } = require("@typescript-eslint/utils");
const { getType, isImageField } = require("./utils/type-checking");

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensure `<Image>` is used instead of raw `<img>` for `ImageField`",
      recommended: true,
    },
    messages: {
      useImageComponent:
        "Use `<Image field={{fieldName}} />` instead of `<img>`. Ensure you are using `ImageField` correctly.",
    },
    fixable: "code",
    schema: [],
  },

  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    if (!parserServices || !parserServices.program) return {};
    const checker = parserServices.program.getTypeChecker();

    return {
      JSXOpeningElement(node) {
        if (node.name.name !== "img") return;

        const srcAttribute = node.attributes.find(
          (attr) => attr.type === "JSXAttribute" && attr.name.name === "src"
        );
        if (
          !srcAttribute ||
          !srcAttribute.value ||
          srcAttribute.value.type !== "JSXExpressionContainer"
        )
          return;

        const expression = srcAttribute.value.expression;
        if (expression.type !== "MemberExpression") return;

        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(
          expression.object
        );
        if (!tsNode) return;

        const type = getType(tsNode, checker);

        if (isImageField(type)) {
          // Extract `props.fields.image` instead of `props.fields.image.value.src`
          let fieldName = expression;

          // Traverse back up the MemberExpression chain to remove `.value.src`
          while (fieldName.type === "MemberExpression") {
            if (["value", "src"].includes(fieldName.property.name)) {
              fieldName = fieldName.object; // Step back to remove ".value.src"
            } else {
              break;
            }
          }

          const fieldNameText = context.getSourceCode().getText(fieldName);

          context.report({
            node,
            messageId: "useImageComponent",
            data: { fieldName: fieldNameText },
            fix(fixer) {
              return fixer.replaceText(
                node.parent,
                `<Image field={${fieldNameText}} />`
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
