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

type Attribute = TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute;

/** The attributes a replacement keeps: all of them (spreads included) except those named in `omit`. */
function keptAttributes(attributes: readonly Attribute[], omit: readonly string[]): Attribute[] {
  return attributes.filter(
    (attribute) =>
      attribute.type === AST_NODE_TYPES.JSXSpreadAttribute ||
      attribute.name.type !== AST_NODE_TYPES.JSXIdentifier ||
      !omit.includes(attribute.name.name)
  );
}

/**
 * Re-serialises the element's attributes (spreads included) in source order, minus `omit`,
 * as a string that can follow `field={...}` in a replacement. Starts with a space when non-empty.
 */
export function serializeAttributes(
  sourceCode: TSESLint.SourceCode,
  attributes: readonly Attribute[],
  omit: readonly string[] = []
): string {
  const kept = keptAttributes(attributes, omit);
  return kept.length === 0 ? "" : ` ${kept.map((attribute) => sourceCode.getText(attribute)).join(" ")}`;
}

/**
 * Whether replacing `element` with text rebuilt from its attributes (minus `omit`) and the `kept`
 * nodes or ranges would delete a comment. The source of the kept attributes and of `kept` is reused
 * verbatim, so comments inside them survive. Any other comment in the element (a JSX comment next to
 * the field, a comment between two attributes) would be lost, and a fix must not lose code.
 */
export function dropsComments(
  sourceCode: TSESLint.SourceCode,
  element: TSESTree.JSXElement,
  omit: readonly string[],
  kept: readonly (TSESTree.Node | TSESTree.Range)[]
): boolean {
  const ranges = [...keptAttributes(element.openingElement.attributes, omit), ...kept].map(
    (item): TSESTree.Range => (Array.isArray(item) ? item : (item as TSESTree.Node).range)
  );
  return sourceCode
    .getCommentsInside(element)
    .some(
      (comment) =>
        !ranges.some(([start, end]) => start <= comment.range[0] && comment.range[1] <= end)
    );
}

/**
 * Elements whose content model is plain text. `<Text tag="title">` cannot work there: frameworks only
 * pick up a literal `<title>` (next/head), and the editing markup `<Text>` emits is not valid inside
 * them. Reading `.value` is the right thing in these elements, so the text rules leave them alone.
 */
const TEXT_ONLY_ELEMENTS: readonly string[] = ["title", "option", "textarea", "script", "style"];

export function isTextOnlyElement(opening: TSESTree.JSXOpeningElement): boolean {
  return (
    opening.name.type === AST_NODE_TYPES.JSXIdentifier &&
    TEXT_ONLY_ELEMENTS.includes(opening.name.name)
  );
}

/**
 * `<a href=…>`: the anchor belongs to the link / file rules. Rewriting it into `<Text tag="a" href=…>`
 * would keep the hand-written href and hide the link finding, so the text rules never fix it.
 */
export function isAnchorWithHref(opening: TSESTree.JSXOpeningElement): boolean {
  return isElementNamed(opening, "a") && getAttribute(opening, "href") !== undefined;
}

/**
 * Children that render something: whitespace-only text and JSX comment containers are ignored.
 * Only source whitespace counts: an entity such as `&nbsp;` renders a character and is kept
 * (`String.prototype.trim` on the decoded value would swallow U+00A0).
 */
export function meaningfulChildren(element: TSESTree.JSXElement): TSESTree.JSXChild[] {
  return element.children.filter((child) => {
    if (child.type === AST_NODE_TYPES.JSXText) return !/^[ \t\r\n]*$/.test(child.raw);
    if (child.type === AST_NODE_TYPES.JSXExpressionContainer) {
      return child.expression.type !== AST_NODE_TYPES.JSXEmptyExpression;
    }
    return true;
  });
}

/** Range between the opening and closing tags (empty for self-closing elements). */
export function innerRange(element: TSESTree.JSXElement): TSESTree.Range {
  const end = element.openingElement.range[1];
  return [end, element.closingElement ? element.closingElement.range[0] : end];
}

/** Raw source between the opening and closing tags (empty for self-closing elements). */
export function innerText(sourceCode: TSESLint.SourceCode, element: TSESTree.JSXElement): string {
  const [start, end] = innerRange(element);
  return sourceCode.text.slice(start, end);
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
