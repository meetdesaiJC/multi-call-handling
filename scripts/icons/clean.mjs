#!/usr/bin/env node
/**
 * Clean pulled SVGs: drop Figma artboard chrome, normalize viewBox, currentColor.
 */
import fs from "node:fs";
import path from "node:path";
import {
  normalizeColors,
  normalizeExportedSvg,
  extractStripSize,
} from "./extract-strip.mjs";
import { ensureDir, SVG_DIR, slugifyIconName } from "./lib.mjs";

function cleanSvg(svg, size, { forceCurrentColor = false, isFilled = false } = {}) {
  let out = svg;
  // Drop artboard / page background rects
  out = out.replace(/<rect[^>]*width="1920"[^/]*\/>/gi, "");
  out = out.replace(/<rect[^>]*height="5\d{3}"[^/]*\/>/gi, "");
  out = out.replace(/<rect[^>]*fill="#F5F5F5"[^/]*\/>/gi, "");
  out = out.replace(
    /<rect[^>]*(?:width="(?:16|20|24)"[^>]*height="(?:16|20|24)"|height="(?:16|20|24)"[^>]*width="(?:16|20|24)")[^>]*fill="(?:white|#fff|#ffffff|#F5F5F5)"[^/]*\/>/gi,
    ""
  );
  // Unwrap pointless id groups but keep their children — soft approach: leave groups
  if (isFilled) {
    out = out.replace(
      /\sfill="(?!none|white|#fff|#ffffff|currentColor)([^"]+)"/gi,
      ' fill="currentColor"'
    );
    out = out.replace(
      /\sstroke="(?!none|white|#fff|#ffffff|currentColor)([^"]+)"/gi,
      ' stroke="currentColor"'
    );
  } else if (forceCurrentColor) {
    out = normalizeColors(out, { forceCurrentColor: true });
  } else {
    out = normalizeColors(out);
  }
  return normalizeExportedSvg(out, size);
}

// Ensure sales-dialer-1 from local strip
{
  const stripPath = path.join(
    path.dirname(SVG_DIR),
    "../icon-library/Sales dialer-1.svg"
  );
  // ROOT-relative
  const alt = new URL("../../icon-library/Sales dialer-1.svg", import.meta.url);
  const file = fs.existsSync(alt) ? alt.pathname : stripPath;
  // On macOS URL pathname may need decode
  const resolved = decodeURIComponent(
    new URL("../../icon-library/Sales dialer-1.svg", import.meta.url).pathname
  );
  if (fs.existsSync(resolved)) {
    const slug = "sales-dialer-1";
    const outDir = path.join(SVG_DIR, slug);
    ensureDir(outDir);
    const strip = fs.readFileSync(resolved, "utf8");
    for (const size of [16, 20, 24]) {
      const svg = cleanSvg(extractStripSize(strip, size), size);
      fs.writeFileSync(path.join(outDir, `${size}.svg`), svg);
    }
    console.log("seeded sales-dialer-1");
  } else {
    console.warn("Sales dialer-1.svg not found at", resolved);
  }
}

const FILLED = new Set([
  "alert-triangle-filled",
  "info-circle-filled",
  "circle-x-filled",
  "circle-check-filled",
]);

for (const dirEnt of fs.readdirSync(SVG_DIR, { withFileTypes: true })) {
  if (!dirEnt.isDirectory()) continue;
  const dir = dirEnt.name;
  for (const file of fs.readdirSync(path.join(SVG_DIR, dir))) {
    if (!file.endsWith(".svg")) continue;
    const size = Number(file.replace(".svg", ""));
    const p = path.join(SVG_DIR, dir, file);
    let svg = fs.readFileSync(p, "utf8");
    svg = cleanSvg(svg, size, {
      forceCurrentColor: dir === "cancel-close-x",
      isFilled: FILLED.has(dir),
    });
    fs.writeFileSync(p, svg);
  }
}

console.log("cleaned", SVG_DIR);
