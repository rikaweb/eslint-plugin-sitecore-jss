import ts from "typescript";
import logging from "./logging";

function getType(tsNode: ts.Node, checker: ts.TypeChecker): ts.Type {
  let type = checker.getTypeAtLocation(tsNode);
  if (type.aliasSymbol)
    type = checker.getDeclaredTypeOfSymbol(type.aliasSymbol);
  return type;
}

function isFieldString(type: ts.Type): boolean {
  logging.logType(type, "Field<String> check");

  if (type.symbol?.escapedName !== "Field") return false;

  const typeRef = type as ts.TypeReference;
  if (!typeRef.typeArguments || typeRef.typeArguments.length !== 1)
    return false;

  const typeArg = typeRef.typeArguments[0];
  logging.logType(typeArg, "Type argument");

  // Check if it's a string literal type
  if (typeArg.isStringLiteral()) {
    return typeArg.value === "string";
  }

  // Check if it's the built-in string type
  if (typeArg.flags & ts.TypeFlags.String) {
    return true;
  }

  // Check if it's a type reference to string
  if (
    typeArg.symbol?.escapedName === "String" ||
    typeArg.symbol?.escapedName === "string"
  ) {
    return true;
  }

  // Check if it's a primitive string type
  if (typeArg.flags & ts.TypeFlags.StringLiteral) {
    return true;
  }

  // Check if it's a union type that includes string
  if (typeArg.flags & ts.TypeFlags.Union) {
    const unionType = typeArg as ts.UnionType;
    return unionType.types.some(
      (t) =>
        t.flags & ts.TypeFlags.String ||
        t.symbol?.escapedName === "String" ||
        t.symbol?.escapedName === "string"
    );
  }

  // Check if it's an intersection type that includes string
  if (typeArg.flags & ts.TypeFlags.Intersection) {
    const intersectionType = typeArg as ts.IntersectionType;
    return intersectionType.types.some(
      (t) =>
        t.flags & ts.TypeFlags.String ||
        t.symbol?.escapedName === "String" ||
        t.symbol?.escapedName === "string"
    );
  }

  return false;
}

function isTextField(type: ts.Type): boolean {
  return type.symbol?.escapedName === "TextField";
}

function isRichTextField(type: ts.Type): boolean {
  return type.symbol?.escapedName === "RichTextField";
}

function isImageField(type: ts.Type): boolean {
  return (
    type.symbol?.escapedName === "ImageField" ||
    type.symbol?.escapedName === "ImageFieldValue"
  );
}

function isLinkField(type: ts.Type): boolean {
  return (
    type.symbol?.escapedName === "LinkField" ||
    type.symbol?.escapedName === "LinkFieldValue"
  );
}

function isFileField(type: ts.Type): boolean {
  return (
    type.symbol?.escapedName === "FileField" ||
    type.symbol?.escapedName === "FileFieldValue"
  );
}

export default {
  getType,
  isFieldString,
  isTextField,
  isRichTextField,
  isImageField,
  isLinkField,
  isFileField,
};
