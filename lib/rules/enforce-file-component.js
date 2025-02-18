const { ESLintUtils } = require("@typescript-eslint/utils");
const { getType, isFileField } = require("./utils/type-checking");

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensure `<File>` is used instead of raw `<a>` for `FileField`.",
      recommended: true,
    },
    messages: {
      useFileComponent:
        "Use `<File field={{fieldName}} />` instead of `<a>` for Sitecore file fields.",
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
        if (node.name.name !== "a") return;

        // Find the `href` attribute
        const hrefAttr = node.attributes.find(
          (attr) => attr.type === "JSXAttribute" && attr.name.name === "href"
        );
        if (
          !hrefAttr ||
          !hrefAttr.value ||
          hrefAttr.value.type !== "JSXExpressionContainer"
        )
          return;

        const expression = hrefAttr.value.expression;
        if (expression.type !== "MemberExpression") return;

        const tsNode = parserServices.esTreeNodeToTSNodeMap.get(
          expression.object
        );
        if (!tsNode) {
          console.warn("⚠️ TypeScript Node not found.");
          return;
        }

        const type = getType(tsNode, checker);

        if (isFileField(type)) {
          let fieldName = expression;

          // Step back to remove ".value" if it exists
          while (fieldName.type === "MemberExpression") {
            if (
              fieldName.property.name === "value" ||
              fieldName.property.name === "src"
            ) {
              fieldName = fieldName.object; // Step back to remove ".value" or ".src"
            } else {
              break;
            }
          }

          const fieldNameText = context.getSourceCode().getText(fieldName);

          context.report({
            node,
            messageId: "useFileComponent",
            data: { fieldName: fieldNameText },
            fix(fixer) {
              return fixer.replaceText(
                node.parent,
                `<File field={${fieldNameText}} />`
              );
            },
          });
        }
      },
    };
  },
};
