import ts from "typescript";
import type { ParserServicesWithTypeInformation, TSESTree } from "@typescript-eslint/utils";
import logging from "./logging";

export type FieldPackage = "@sitecore-content-sdk/nextjs" | "@sitecore-jss/sitecore-jss-nextjs";

/**
 * Type of `node` with `null` / `undefined` removed, so optional fields (`title?: Field<string>`)
 * and the optional `.value` of `ImageField` still resolve to the field type under strictNullChecks.
 */
export function resolveType(
  services: ParserServicesWithTypeInformation,
  node: TSESTree.Node
): ts.Type {
  const checker = services.program.getTypeChecker();
  const type = checker.getNonNullableType(services.getTypeAtLocation(node));
  logging.logType(type, "Resolved type");
  return type;
}

const CONTENT_SDK_PATH = /[\\/]@sitecore-content-sdk[\\/]/;
const JSS_PATH = /[\\/]@sitecore-jss[\\/]/;

/**
 * Which Sitecore package family declares `type`, judged by the path of the declaring file
 * (`…/node_modules/@sitecore-jss/sitecore-jss-react/types/…`). A type that is only re-exported or
 * aliased locally still resolves to the package's declaration; a type the project declares itself
 * under the same name (`interface Field<T> { value: T; touched: boolean }` in a form library) has
 * no declaration there and is not a Sitecore field.
 */
function declaringPackage(type: ts.Type): FieldPackage | undefined {
  const declarations = [
    ...(type.symbol?.declarations ?? []),
    ...(type.aliasSymbol?.declarations ?? []),
  ];
  const fileNames = declarations.map((declaration) => declaration.getSourceFile().fileName);
  if (fileNames.some((fileName) => CONTENT_SDK_PATH.test(fileName))) {
    return "@sitecore-content-sdk/nextjs";
  }
  if (fileNames.some((fileName) => JSS_PATH.test(fileName))) {
    return "@sitecore-jss/sitecore-jss-nextjs";
  }
  return undefined;
}

/** The type's name, or undefined when it is not declared by a Sitecore package. */
function symbolName(type: ts.Type): string | undefined {
  const name = type.symbol?.escapedName ?? type.aliasSymbol?.escapedName;
  if (name === undefined || declaringPackage(type) === undefined) return undefined;
  return String(name);
}

/** True when every member of a (possibly union) type satisfies the predicate. */
function everyMember(type: ts.Type, predicate: (member: ts.Type) => boolean): boolean {
  const members = type.isUnion() ? type.types : [type];
  return members.length > 0 && members.every(predicate);
}

function hasSymbolName(names: readonly string[]): (type: ts.Type) => boolean {
  return (type) => everyMember(type, (member) => names.includes(symbolName(member) ?? ""));
}

function isStringLike(type: ts.Type, checker: ts.TypeChecker): boolean {
  const nonNullable = checker.getNonNullableType(type);
  if (nonNullable.isUnion()) {
    return nonNullable.types.every((member) => isStringLike(member, checker));
  }
  if (nonNullable.isIntersection()) {
    return nonNullable.types.some((member) => (member.flags & ts.TypeFlags.StringLike) !== 0);
  }
  return (nonNullable.flags & ts.TypeFlags.StringLike) !== 0;
}

function typeArgumentsOf(type: ts.Type, checker: ts.TypeChecker): readonly ts.Type[] {
  if (!(type.flags & ts.TypeFlags.Object)) return [];
  if (!((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference)) return [];
  return checker.getTypeArguments(type as ts.TypeReference);
}

/** `Field<string>`, including string literal, template literal and nullable string arguments. */
export function isFieldString(type: ts.Type, checker: ts.TypeChecker): boolean {
  return everyMember(type, (member) => {
    if (symbolName(member) !== "Field") return false;
    const args = typeArgumentsOf(member, checker);
    return args.length === 1 && isStringLike(args[0], checker);
  });
}

export const isTextField = hasSymbolName(["TextField"]);

/** Anything `<Text>` renders: `TextField` or `Field<string>`. */
export function isTextLike(type: ts.Type, checker: ts.TypeChecker): boolean {
  return everyMember(
    type,
    (member) => symbolName(member) === "TextField" || isFieldString(member, checker)
  );
}

export const isRichTextField = hasSymbolName(["RichTextField"]);
export const isImageField = hasSymbolName(["ImageField", "ImageFieldValue"]);
export const isLinkField = hasSymbolName(["LinkField", "LinkFieldValue"]);
export const isFileField = hasSymbolName(["FileField", "FileFieldValue"]);

/** Which Sitecore package family declares the field type (the first member of a union decides). */
export function getFieldPackage(type: ts.Type): FieldPackage | undefined {
  const member = type.isUnion() ? type.types[0] : type;
  return member ? declaringPackage(member) : undefined;
}
