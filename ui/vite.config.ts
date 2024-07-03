import path from "path";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
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
      ],
    }),
  ],
});
