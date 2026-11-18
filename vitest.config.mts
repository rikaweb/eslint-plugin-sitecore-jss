import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/fixtures/**", "node_modules/**"],
    setupFiles: ["tests/setup.ts"],
    environment: "node",
    // Type-aware linting builds a TypeScript program per test file; give it room.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
