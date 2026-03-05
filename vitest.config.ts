import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

import path from "path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "src/__tests__/__mocks__/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
