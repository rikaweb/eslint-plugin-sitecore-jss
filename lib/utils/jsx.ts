import { AST_NODE_TYPES, type TSESLint, type TSESTree } from "@typescript-eslint/utils";

export function isElementNamed(opening: TSESTree.JSXOpeningElement, name: string): boolean {
  return opening.name.type === AST_NODE_TYPES.JSXIdentifier && opening.name.name === name;
}

/** Lower-case JSX identifiers are intrinsic HTML elements; anything else is a component. */
export function isIntrinsicElement(opening: TSESTree.JSXOpeningElement): boolean {
  return opening.name.type === AST_NODE_TYPES.JSXIdentifier && /^[a-z]/.test(opening.name.name);
}

export function getTagName(
  opening: TSESTree.JSXOpeningElement,
  sourceCode: TSESLint.SourceCode
): string {
  return sourceCode.getText(opening.name);
}

export function getAttribute(
  opening: TSESTree.JSXOpeningElement,
  name: string
): TSESTree.JSXAttribute | undefined {
  for (const attribute of opening.attributes) {
    if (
      attribute.type === AST_NODE_TYPES.JSXAttribute &&
      attribute.name.type === AST_NODE_TYPES.JSXIdentifier &&
      attribute.name.name === name
    ) {
      return attribute;
    }
  }
  return undefined;
}

/** The expression inside `name={...}`, or undefined for literals, empty braces and missing values. */
export function getAttributeExpression(
  attribute: TSESTree.JSXAttribute
): TSESTree.Expression | undefined {
  const { value } = attribute;
  if (
    value?.type === AST_NODE_TYPES.JSXExpressionContainer &&
    value.expression.type !== AST_NODE_TYPES.JSXEmptyExpression
  ) {
    return value.expression;
  }
  return undefined;
}

/** The static string of `name="x"`, `name={"x"}` or `name={`x`}`; undefined for anything dynamic. */
export function getAttributeStringValue(attribute: TSESTree.JSXAttribute): string | undefined {
  const { value } = attribute;
  if (!value) return undefined;
  if (value.type === AST_NODE_TYPES.Literal) {
    return typeof value.value === "string" ? value.value : undefined;
  }
  if (value.type === AST_NODE_TYPES.JSXExpressionContainer) {
    const expression = value.expression;
    if (expression.type === AST_NODE_TYPES.Literal && typeof expression.value === "string") {
      return expression.value;
    }
    if (expression.type === AST_NODE_TYPES.TemplateLiteral && expression.expressions.length === 0) {
      return expression.quasis[0]?.value.cooked ?? undefined;
    }
  }
  return undefined;
}

/**
 * Re-serialises the element's attributes (spreads included) in source order, minus `omit`,
 * as a string that can follow `field={...}` in a replacement. Starts with a space when non-empty.
 */
export function serializeAttributes(
  sourceCode: TSESLint.SourceCode,
  attributes: readonly (TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute)[],
  omit: readonly string[] = []
): string {
  const kept = attributes.filter(
    (attribute) =>
      attribute.type === AST_NODE_TYPES.JSXSpreadAttribute ||
      attribute.name.type !== AST_NODE_TYPES.JSXIdentifier ||
      !omit.includes(attribute.name.name)
  );
  return kept.length === 0 ? "" : ` ${kept.map((attribute) => sourceCode.getText(attribute)).join(" ")}`;
}

/** Children that render something: whitespace-only text and JSX comment containers are ignored. */
export function meaningfulChildren(element: TSESTree.JSXElement): TSESTree.JSXChild[] {
  return element.children.filter((child) => {
    if (child.type === AST_NODE_TYPES.JSXText) return child.value.trim() !== "";
    if (child.type === AST_NODE_TYPES.JSXExpressionContainer) {
      return child.expression.type !== AST_NODE_TYPES.JSXEmptyExpression;
    }
    return true;
  });
}

/** Raw source between the opening and closing tags (empty for self-closing elements). */
export function innerText(sourceCode: TSESLint.SourceCode, element: TSESTree.JSXElement): string {
  if (!element.closingElement) return "";
  return sourceCode.text.slice(element.openingElement.range[1], element.closingElement.range[0]);
}

/** Removes an attribute together with the whitespace that precedes it. */
export function removeAttribute(
  fixer: TSESLint.RuleFixer,
  sourceCode: TSESLint.SourceCode,
  attribute: TSESTree.JSXAttribute
): TSESLint.RuleFix {
  const before = sourceCode.getTokenBefore(attribute);
  const start = before ? before.range[1] : attribute.range[0];
  return fixer.removeRange([start, attribute.range[1]]);
}
