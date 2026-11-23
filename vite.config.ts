import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// ─────────────────────────────────────────────────────────────────────
// DO NOT DELETE. No npm script references this file, so it looks dead —
// it isn't. `.storybook/main.ts` declares no `viteFinal`, so
// @storybook/react-vite auto-loads the Vite config at the repo root.
// This is the ONLY thing giving Storybook the `@` → src alias and the
// Tailwind v4 plugin. Remove it and every story fails to resolve
// `@/components/*` and renders unstyled.
//
// Prototypes do NOT use this config; each has its own
// (prototype-*/vite.config.ts) with `root` pointed at itself.
// ─────────────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
