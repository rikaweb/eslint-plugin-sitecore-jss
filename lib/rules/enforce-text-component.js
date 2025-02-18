const { ESLintUtils } = require("@typescript-eslint/utils");
const {
  getType,
  isFieldString,
  isTextField,
} = require("./utils/type-checking");

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ensure `<Text>` is used instead of raw JSX elements for `Field<string>`",
      recommended: true,
    },
    messages: {
      useTextComponent:
        "Use `<Text field={{fieldName}} tag='{{tagName}}' />` instead of `{props.fields.title.value}` inside `<{{tagName}}>`. If using `Field<string>`, `<RichText field={{fieldName}} />` is also allowed.",
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
        const tagName = node.name.name;
        const parentElement = node.parent;
        if (!parentElement || !parentElement.children) return;

        parentElement.children.forEach((child) => {
          if (
            child.type === "JSXExpressionContainer" &&
            child.expression.type === "MemberExpression"
          ) {
            const tsNode = parserServices.esTreeNodeToTSNodeMap.get(
              child.expression.object
            );
            if (!tsNode) return;

            const type = getType(tsNode, checker);
            if (isFieldString(type) || isTextField(type)) {
              // Extract the correct field name (remove `.value`)
              let fieldName = child.expression;
              while (fieldName.type === "MemberExpression") {
                if (fieldName.property.name === "value") {
                  fieldName = fieldName.object; // Step back to remove `.value`
                } else {
                  break;
                }
              }
              const fieldNameText = context.getSourceCode().getText(fieldName);

              context.report({
                node,
                messageId: "useTextComponent",
                data: { tagName, fieldName: fieldNameText },
                fix(fixer) {
                  return fixer.replaceText(
                    parentElement,
                    `<Text field={${fieldNameText}} tag="${tagName}" />`
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
