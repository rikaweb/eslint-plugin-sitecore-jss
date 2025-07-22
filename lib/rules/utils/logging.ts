import ts from "typescript";

const DEBUG = process.env.ESLINT_DEBUG === "true"; // Enable with ESLINT_DEBUG=true

function log(...args: unknown[]): void {
  if (DEBUG) {
    console.log("🔍 [ESLint Debug]:", ...args);
  }
}

function logType(type: ts.Type, label: string = "Type"): void {
  if (DEBUG) {
    console.log(`🔍 [ESLint Debug] ${label}:`, {
      symbol: type.symbol?.escapedName,
      flags: type.flags,
      typeArguments: (type as ts.TypeReference).typeArguments?.map(
        (t: ts.Type) => ({
          symbol: t.symbol?.escapedName,
          flags: t.flags,
          value: (t as ts.StringLiteralType).value,
          isStringLiteral: t.isStringLiteral?.(),
        })
      ),
      isStringLiteral: type.isStringLiteral?.(),
    });
  }
}

export default { log, logType };
