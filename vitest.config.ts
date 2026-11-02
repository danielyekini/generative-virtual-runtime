import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "evaluation/harness/**/*.test.ts",
      "app/playground/src/**/*.test.ts",
      "tools/native-reference/**/*.test.ts",
      "tools/native-generation/**/*.test.ts",
    ],
  },
});
