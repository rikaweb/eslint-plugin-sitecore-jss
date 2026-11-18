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

function symbolName(type: ts.Type): string | undefined {
  const name = type.symbol?.escapedName ?? type.aliasSymbol?.escapedName;
  return name === undefined ? undefined : String(name);
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

/** Which Sitecore package declares the field type, judged by the declaring file's path. */
export function getFieldPackage(type: ts.Type): FieldPackage | undefined {
  const member = type.isUnion() ? type.types[0] : type;
  const fileName = member?.symbol?.declarations?.[0]?.getSourceFile().fileName ?? "";
  if (/[\\/]@sitecore-content-sdk[\\/]/.test(fileName)) return "@sitecore-content-sdk/nextjs";
  if (/[\\/]@sitecore-jss[\\/]/.test(fileName)) return "@sitecore-jss/sitecore-jss-nextjs";
  return undefined;
}
