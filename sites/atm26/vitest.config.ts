import { defineConfig } from "vitest/config";

// The site's browser tests live in tests/. The GoatCounter snapshot tool keeps
// its own node:test suite in tools/; Vitest must not try to run that file.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
