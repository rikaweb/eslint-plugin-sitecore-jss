import { AST_NODE_TYPES, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import { getFieldExpression, normalizeFieldText } from "./fields";
import { dropsComments, innerRange, innerText, meaningfulChildren, serializeAttributes } from "./jsx";

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
 *
 * `component` is the JSX name to render (`Link`, `File`, or the alias they are imported under).
 *
 * Returns `undefined` when no replacement renders the same thing without losing code:
 * - an anchor without children renders nothing, but `<Link>` / `<File>` without children render the
 *   field's text (`<Link>` even falls back to the href), so an icon or `aria-label`-only link would
 *   start showing text;
 * - a comment that the replacement would not carry over.
 */
export function buildAnchorReplacement(
  sourceCode: TSESLint.SourceCode,
  element: TSESTree.JSXElement,
  component: string,
  field: TSESTree.Node,
  textProperties: readonly string[]
): string | undefined {
  const fieldText = sourceCode.getText(field);
  const attributes = serializeAttributes(sourceCode, element.openingElement.attributes, ["href"]);
  const children = meaningfulChildren(element);
  if (children.length === 0) return undefined;

  const onlyFieldText =
    children.length === 1 &&
    isFieldTextChild(sourceCode, children[0], fieldText, textProperties);

  if (onlyFieldText) {
    if (dropsComments(sourceCode, element, ["href"], [field])) return undefined;
    return `<${component} field={${fieldText}}${attributes} />`;
  }
  if (dropsComments(sourceCode, element, ["href"], [field, innerRange(element)])) return undefined;
  return `<${component} field={${fieldText}}${attributes}>${innerText(sourceCode, element)}</${component}>`;
}
