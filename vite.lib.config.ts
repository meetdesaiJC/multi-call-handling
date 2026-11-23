import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import dts from "vite-plugin-dts";
import { existsSync, rmSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const src = resolve(root, "src");

/** Dependencies that must stay external — consumers provide these. */
const external = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
];

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      include: ["src"],
      exclude: [
        "src/**/*.stories.ts",
        "src/**/*.stories.tsx",
        "src/styles/entry.ts",
        "src/tokens/**",
      ],
      entryRoot: "src",
      outDir: "dist",
      tsconfigPath: resolve(root, "tsconfig.build.json"),
    }),
    {
      name: "remove-styles-js-shim",
      apply: "build",
      closeBundle() {
        // CSS is the public export; the empty styles.js entry shim is not needed.
        for (const file of [
          resolve(root, "dist/styles.js"),
          resolve(root, "dist/styles.js.map"),
          resolve(root, "dist/styles/entry.d.ts"),
        ]) {
          if (existsSync(file)) unlinkSync(file);
        }
        const stylesDir = resolve(root, "dist/styles");
        if (existsSync(stylesDir)) rmSync(stylesDir, { recursive: true, force: true });
      },
    },
  ],
  resolve: {
    alias: {
      "@": src,
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    // CSS entry is processed by Tailwind; emit one stylesheet for consumers.
    cssCodeSplit: false,
    lib: {
      entry: {
        index: resolve(src, "index.ts"),
        styles: resolve(src, "styles/entry.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external,
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith(".css")) {
            return "styles.css";
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
});
