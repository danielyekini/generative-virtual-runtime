import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  build: {
    rollupOptions: {
      // Player is the Studio landing page; legacy.html is the temporary
      // Stream / Import-Split / Stage route until P002 and P004 move them.
      input: {
        player: resolve(dirname(fileURLToPath(import.meta.url)), "index.html"),
        legacy: resolve(dirname(fileURLToPath(import.meta.url)), "legacy.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [repo] },
    // Studio Generate (P019) reaches local Ollama without browser CORS.
    proxy: {
      "/ollama": {
        target: "http://127.0.0.1:11434",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ""),
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/ollama": {
        target: "http://127.0.0.1:11434",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ""),
      },
    },
  },
});
