import { AST_NODE_TYPES, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { getFieldExpression, normalizeFieldText } from "./fields";
import { innerText, meaningfulChildren, serializeAttributes } from "./jsx";

function isFieldTextChild(
  sourceCode: TSESLint.SourceCode,
  child: TSESTree.JSXChild,
  fieldText: string,
  textProperties: readonly string[]
): boolean {
  if (
    child.type !== AST_NODE_TYPES.JSXExpressionContainer ||
    child.expression.type === AST_NODE_TYPES.JSXEmptyExpression
  ) {
    return false;
  }
  const field = getFieldExpression(child.expression, textProperties);
  return (
    field !== undefined &&
    normalizeFieldText(sourceCode.getText(field)) === normalizeFieldText(fieldText)
  );
}

/**
 * Builds the `<Link>` / `<File>` replacement for an `<a href={field...}>` element.
 * `href` is dropped (the component derives it from the field); every other attribute is kept.
 * Children are kept too, unless they only re-render the field's own text
 * (`{link.value.text}`, `{file.value.title}`), which the component renders by itself.
 */
export function buildAnchorReplacement(
  sourceCode: TSESLint.SourceCode,
  element: TSESTree.JSXElement,
  component: "Link" | "File",
  fieldText: string,
  textProperties: readonly string[]
): string {
  const attributes = serializeAttributes(sourceCode, element.openingElement.attributes, ["href"]);
  const children = meaningfulChildren(element);
  const onlyFieldText =
    children.length === 1 &&
    isFieldTextChild(sourceCode, children[0], fieldText, textProperties);

  if (children.length === 0 || onlyFieldText) {
    return `<${component} field={${fieldText}}${attributes} />`;
  }
  return `<${component} field={${fieldText}}${attributes}>${innerText(sourceCode, element)}</${component}>`;
}
