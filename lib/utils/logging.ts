import ts from "typescript";

const DEBUG = process.env.ESLINT_DEBUG === "true"; // Enable with ESLINT_DEBUG=true

function log(...args: unknown[]): void {
  if (DEBUG) {
    console.log("[eslint-plugin-sitecore-jss]", ...args);
  }
}

function logType(type: ts.Type, label: string = "Type"): void {
  if (DEBUG) {
    console.log(`[eslint-plugin-sitecore-jss] ${label}:`, {
      symbol: type.symbol?.escapedName,
      aliasSymbol: type.aliasSymbol?.escapedName,
      flags: type.flags,
      typeArguments: (type as ts.TypeReference).typeArguments?.map((t: ts.Type) => ({
        symbol: t.symbol?.escapedName,
        flags: t.flags,
        value: (t as ts.StringLiteralType).value,
      })),
    });
  }
}

export default { log, logType };
