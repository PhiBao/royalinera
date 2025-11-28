import { defineConfig } from "vite";

export default defineConfig({
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    // Avoid prebundling the wasm client; Vite's dep optimizer cannot handle the wasm_thread snippet path.
    exclude: ["@linera/client"],
  },
});
