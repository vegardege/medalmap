import preact from "@preact/preset-vite";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  build: {
    // Rolldown/Oxc minifier (Vite 8 default) miscompiles maplibre-gl; use esbuild until fixed
    minify: "esbuild",
  },
  test: {
    globals: true,
  },
});
