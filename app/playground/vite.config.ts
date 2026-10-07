import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: [repo] },
  },
});
