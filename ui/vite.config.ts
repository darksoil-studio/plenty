import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import path from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { internalIpV4Sync } from "internal-ip";

const mobile = !!/android|ios/.exec(process.env.TAURI_ENV_PLATFORM);

export default defineConfig({
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    host: mobile ? "0.0.0.0" : false,
    port: 1420,
    // strictPort: true,
    hmr: mobile ? {
      protocol: 'ws',
      host: internalIpV4Sync(),
      port: 1421
    } : undefined,
  },
  plugins: [
    checker({
      typescript: true,
      eslint: {
        lintCommand: "eslint --ext .ts,.html . --ignore-path .gitignore",
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(
            __dirname,
            "node_modules/@shoelace-style/shoelace/dist/assets"
          ),
          dest: path.resolve(__dirname, "dist/shoelace"),
        },
      ],
    }),
  ],
});

