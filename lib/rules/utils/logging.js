const DEBUG = false; // Set to `true` to enable logging

function log(...args) {
  if (DEBUG) {
    console.log("🔍 [ESLint Debug]:", ...args);
  }
}

module.exports = { log };
