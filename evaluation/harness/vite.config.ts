import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const alias = (name: string) => resolve(repo, "packages", name, "src/index.ts");

export default defineConfig({
  root: resolve(repo, "evaluation/harness/render"),
  publicDir: resolve(repo, "evaluation/evidence"),
  server: {
    port: 5199,
    strictPort: true,
    host: "127.0.0.1",
    fs: { allow: [repo] },
  },
  resolve: {
    alias: {
      "@gvr/canvas-renderer": alias("canvas-renderer"),
      "@gvr/runtime": alias("runtime"),
      "@gvr/schema": alias("schema"),
      "lottie-web": resolve(repo, "node_modules/lottie-web/build/player/lottie.js"),
    },
  },
});
