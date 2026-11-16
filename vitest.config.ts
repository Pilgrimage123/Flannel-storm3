import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)/, replacement: path.resolve(import.meta.dirname, "./src/$1") },
      { find: "@", replacement: path.resolve(import.meta.dirname, "./src") },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
