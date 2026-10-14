import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    maxWorkers: 1,
  },
});
