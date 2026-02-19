import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
  },
  resolve: {
    alias: {
      "@journey-os/types": path.resolve(__dirname, "../../packages/types/src"),
      "@test/fixtures": path.resolve(
        __dirname,
        "../../packages/types/src/frameworks/__tests__",
      ),
    },
  },
});
