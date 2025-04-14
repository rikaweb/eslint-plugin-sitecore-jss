const DEBUG = false; // Set to `true` to enable logging

function log(...args: unknown[]): void {
  if (DEBUG) {
    console.log("🔍 [ESLint Debug]:", ...args);
  }
}

export default { log };
