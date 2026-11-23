import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Standalone dev server for the JustCall AI prototype. Mirrors
// prototype-add-ons-flow so the same design-system alias and Tailwind
// content scanning apply.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  // Deployed on Vercel, which serves from "/". PAGES_BASE is only for a host
  // that serves from a sub-path (GitHub Pages serves from /<repo>/) — routing
  // is hash-based, so no 404 fallback is needed there.
  base: process.env.PAGES_BASE ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    },
  },
  server: {
    port: 5679,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  preview: {
    port: 5679,
  },
});
