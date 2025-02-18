const { ESLintUtils } = require("@typescript-eslint/utils");
const { getType, isLinkField } = require("./utils/type-checking");

module.exports = {
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

  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    if (!parserServices || !parserServices.program) return {};
    const checker = parserServices.program.getTypeChecker();

    return {
      JSXOpeningElement(node) {
        if (node.name.name !== "a") return;

        const hrefAttr = node.attributes.find(
          (attr) => attr.type === "JSXAttribute" && attr.name.name === "href"
        );
        if (!hrefAttr) return;

        if (
          !hrefAttr.value ||
          hrefAttr.value.type !== "JSXExpressionContainer"
        ) {
          console.warn("⚠️ `href` does not contain an expression, skipping.");
          return;
        }

        const expression = hrefAttr.value.expression;

        if (expression.type !== "MemberExpression") {
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

        // ✅ Fix: Check for both `LinkField` and `LinkFieldValue`
        if (isLinkField(type)) {
          let fieldName = expression;
          while (fieldName.type === "MemberExpression") {
            if (
              fieldName.property.name === "value" ||
              fieldName.property.name === "href"
            ) {
              fieldName = fieldName.object; // Go one step up
            } else {
              break;
            }
          }

          const fieldNameText = context.getSourceCode().getText(fieldName);

          const innerText =
            node.children && node.children.length > 0
              ? context.getSourceCode().getText(node.children[0])
              : "";

          context.report({
            node,
            messageId: "useLinkComponent",
            data: { fieldName: fieldNameText },
            fix(fixer) {
              return fixer.replaceText(
                node.parent,
                `<Link field={${fieldNameText}} />`
              );
            },
          });
        }
      },
    };
  },
};
