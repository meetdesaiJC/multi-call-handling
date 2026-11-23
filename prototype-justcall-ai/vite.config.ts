import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Standalone dev server for the JustCall AI prototype. Mirrors
// prototype-add-ons-flow so the same design-system alias and Tailwind
// content scanning apply.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  // GitHub Pages serves the site from /<repo>/, so the Pages workflow sets
  // PAGES_BASE. Everywhere else (dev, Vercel, local builds) it stays "/".
  // Routing is hash-based, so no 404 fallback is needed on Pages.
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
