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
      "@journey-os/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@web": path.resolve(__dirname, "src"),
    },
  },
});
