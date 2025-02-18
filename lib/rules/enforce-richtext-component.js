const { ESLintUtils } = require("@typescript-eslint/utils");
const { getType, isRichTextField } = require("./utils/type-checking");

module.exports = {
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
            if (isRichTextField(type)) {
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
                messageId: "useRichTextComponent",
                data: { tagName, fieldName: fieldNameText },
                fix(fixer) {
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
