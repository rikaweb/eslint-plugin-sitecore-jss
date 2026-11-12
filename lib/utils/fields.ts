import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

/**
 * Removes wrappers that do not change which value is read:
 * `a?.b` chains, `a!`, `a as T`, `a satisfies T` and `<T>a`.
 */
export function unwrapExpression(node: TSESTree.Node): TSESTree.Node {
  let current: TSESTree.Node = node;
  for (;;) {
    switch (current.type) {
      case AST_NODE_TYPES.ChainExpression:
      case AST_NODE_TYPES.TSNonNullExpression:
      case AST_NODE_TYPES.TSAsExpression:
      case AST_NODE_TYPES.TSSatisfiesExpression:
      case AST_NODE_TYPES.TSTypeAssertion:
        current = current.expression;
        break;
      default:
        return current;
    }
  }
}

function propertyName(node: TSESTree.MemberExpression): string | undefined {
  return !node.computed && node.property.type === AST_NODE_TYPES.Identifier
    ? node.property.name
    : undefined;
}

export type FieldExpression = TSESTree.MemberExpression | TSESTree.Identifier;

/**
 * Finds the expression that names a Sitecore field inside a value read such as
 * `props.fields.image.value?.src`, `fields?.title.value`, `image.src` or plain `title`.
 *
 * `valueProperties` lists the sub-properties of the field *value* that may trail `.value`
 * (for example `src` for images, `href`/`text` for links). Only one trailing sub-property and
 * one `.value` are stripped, so a field that is itself named `title` or `src` is never cut short.
 *
 * Returns `undefined` when the expression is not a plain property path (calls, templates, …);
 * the caller then checks the returned expression's type to decide whether it is a field.
 */
export function getFieldExpression(
  expression: TSESTree.Node,
  valueProperties: readonly string[] = []
): FieldExpression | undefined {
  let node = unwrapExpression(expression);

  if (node.type === AST_NODE_TYPES.MemberExpression) {
    const name = propertyName(node);
    if (name !== undefined && valueProperties.includes(name)) {
      node = unwrapExpression(node.object);
    }
  }

  if (node.type === AST_NODE_TYPES.MemberExpression && propertyName(node) === "value") {
    node = unwrapExpression(node.object);
  }

  if (node.type === AST_NODE_TYPES.MemberExpression || node.type === AST_NODE_TYPES.Identifier) {
    return node;
  }
  return undefined;
}

/** `props.fields.title?.value!` and `props.fields.title.value` name the same field. */
export function normalizeFieldText(text: string): string {
  return text.replace(/\?\./g, ".").replace(/!/g, "").replace(/\s+/g, "");
}
