import {
  AST_NODE_TYPES,
  type ParserServicesWithTypeInformation,
  type TSESLint,
  type TSESTree,
} from "@typescript-eslint/utils";
import type ts from "typescript";
import { getFieldExpression, type FieldExpression } from "./fields";
import { getTagName, isIntrinsicElement, meaningfulChildren } from "./jsx";
import { resolveType } from "./type-checking";

export interface FieldChild {
  element: TSESTree.JSXElement;
  opening: TSESTree.JSXOpeningElement;
  /** Source text of the tag name (`h1`, `Typography`, `Foo.Bar`). */
  tagName: string;
  /** Lower-case HTML element (fixable) vs. a component (report only). */
  intrinsic: boolean;
  container: TSESTree.JSXExpressionContainer;
  field: FieldExpression;
  fieldText: string;
  type: ts.Type;
  /** The field expression is the element's only meaningful child, so replacing the element loses nothing. */
  soleChild: boolean;
}

/**
 * Finds `{...field.value}` children of a JSX element whose field type satisfies `matches`.
 * Shared by the text and rich text rules.
 */
export function findFieldChildren(
  sourceCode: TSESLint.SourceCode,
  services: ParserServicesWithTypeInformation,
  element: TSESTree.JSXElement,
  matches: (type: ts.Type) => boolean
): FieldChild[] {
  const children = meaningfulChildren(element);
  const opening = element.openingElement;
  const result: FieldChild[] = [];

  for (const child of children) {
    if (
      child.type !== AST_NODE_TYPES.JSXExpressionContainer ||
      child.expression.type === AST_NODE_TYPES.JSXEmptyExpression
    ) {
      continue;
    }
    const field = getFieldExpression(child.expression);
    if (!field) continue;

    const type = resolveType(services, field);
    if (!matches(type)) continue;

    result.push({
      element,
      opening,
      tagName: getTagName(opening, sourceCode),
      intrinsic: isIntrinsicElement(opening),
      container: child,
      field,
      fieldText: sourceCode.getText(field),
      type,
      soleChild: children.length === 1,
    });
  }
  return result;
}
