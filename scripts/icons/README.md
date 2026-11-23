# Icon sync pipeline

Framed icons from Figma **Design System 2.0 → Icons**  
`https://www.figma.com/design/nkEfgf0iNgksHjD4irjIaJ/Design-System-2.0?node-id=3464-126133`

Each icon has three frames: **16 / 20 / 24** (different stroke weights). Do not ship all ~4,500 icons — pull on demand.

## Commands

| Script | Purpose |
|--------|---------|
| `pnpm icons:catalog` | Build `icons.manifest.json` (name → size node IDs) from Icons page metadata |
| `pnpm icons:pull <names…> --size 16,20,24` | Download SVGs via Figma API, or extract from `icon-library/` strips |
| `pnpm icons:pull --used` | Pull the set used by this design system |
| `pnpm icons:clean` | Strip Figma artboard chrome; normalize `currentColor` |
| `pnpm icons:generate` | Write `src/components/Icon/icons.generated.tsx` |
| `pnpm icons:sync-used` | pull --used → clean → generate |

## Auth

Set `FIGMA_ACCESS_TOKEN` (or `FIGMA_TOKEN`) for API pulls. Without it, pull falls back to local `icon-library/*.svg` strips (`viewBox="0 0 100 24"`).

## Layout

```
scripts/icons/
  icons.manifest.json   # catalog (~4.4k icons)
  catalog.mjs / pull.mjs / clean.mjs / generate.mjs / extract-strip.mjs / lib.mjs
src/icons/svg/{slug}/{16|20|24}.svg
src/components/Icon/icons.generated.tsx
src/components/Icon/icons.tsx          # public re-export
```

## Consumer usage

```tsx
import { IconSearch, IconClose } from "@/components/Icon";

<IconSearch size={24} className="size-6" />
<IconClose size={16} className="size-4" />
```
