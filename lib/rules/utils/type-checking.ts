import ts from "typescript";

function getType(tsNode: ts.Node, checker: ts.TypeChecker): ts.Type {
  let type = checker.getTypeAtLocation(tsNode);
  if (type.aliasSymbol)
    type = checker.getDeclaredTypeOfSymbol(type.aliasSymbol);
  return type;
}

function isFieldString(type: ts.Type): boolean {
  return (
    type.symbol?.escapedName === "Field" &&
    (type as ts.TypeReference).typeArguments?.length === 1 &&
    ((type as ts.TypeReference).typeArguments?.[0] as ts.StringLiteralType)
      ?.value === "string"
  );
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
