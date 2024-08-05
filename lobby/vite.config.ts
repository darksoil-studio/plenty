import path from "path";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import { viteStaticCopy } from "vite-plugin-static-copy";

// @ts-ignore
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host: host,
          port: 1430,
        }
      : undefined,
  },
  plugins: [
    checker({
      typescript: true,
      eslint: {
        lintCommand: "eslint",
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(
            __dirname,
            "node_modules/@shoelace-style/shoelace/dist/assets",
          ),
          dest: path.resolve(__dirname, "dist/shoelace"),
        },
        {
          src: path.resolve(__dirname, "icon.png"),
          dest: path.resolve(__dirname, "dist/"),
        },
      ],
    }),
  ],
});
