function getType(tsNode, checker) {
  let type = checker.getTypeAtLocation(tsNode);
  if (type.aliasSymbol)
    type = checker.getDeclaredTypeOfSymbol(type.aliasSymbol);
  return type;
}

function isFieldString(type) {
  return (
    type.symbol?.escapedName === "Field" &&
    type.typeArguments?.length &&
    type.typeArguments[0].intrinsicName === "string"
  );
}

function isTextField(type) {
  return type.symbol?.escapedName === "TextField";
}

function isRichTextField(type) {
  return type.symbol?.escapedName === "RichTextField";
}

function isImageField(type) {
  return (
    type.symbol?.escapedName === "ImageField" ||
    type.symbol?.escapedName === "ImageFieldValue"
  );
}

function isLinkField(type) {
  return (
    type.symbol?.escapedName === "LinkField" ||
    type.symbol?.escapedName === "LinkFieldValue"
  );
}

function isFileField(type) {
  return (
    type.symbol?.escapedName === "FileField" ||
    type.symbol?.escapedName === "FileFieldValue"
  );
}

module.exports = {
  getType,
  isFieldString,
  isTextField,
  isRichTextField,
  isImageField,
  isLinkField,
  isFileField,
};
