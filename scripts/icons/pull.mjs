#!/usr/bin/env node
/**
 * Pull icon SVGs by name (exact Figma frames for size 16/20/24).
 *
 * Sources (in order):
 *   1. Figma Images API when FIGMA_ACCESS_TOKEN is set
 *   2. Local icon-library/ 100×24 strip exports
 *
 * Usage:
 *   node scripts/icons/pull.mjs Search chevron-down --size 16,20,24
 *   node scripts/icons/pull.mjs --used
 *   node scripts/icons/pull.mjs --from used-icons.txt
 */
import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  FIGMA_FILE_KEY,
  getFigmaToken,
  ICON_LIBRARY_DIR,
  loadManifest,
  resolveManifestEntry,
  slugifyIconName,
  SIZES,
  SVG_DIR,
  USED_ICON_ALIASES,
} from "./lib.mjs";
import {
  extractStripSize,
  normalizeExportedSvg,
} from "./extract-strip.mjs";

function parseArgs(argv) {
  const args = {
    names: [],
    sizes: [...SIZES],
    used: false,
    from: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--size") {
      args.sizes = argv[++i]
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => SIZES.includes(n));
    } else if (a === "--used") {
      args.used = true;
    } else if (a === "--from") {
      args.from = argv[++i];
    } else if (!a.startsWith("-")) {
      args.names.push(a);
    }
  }
  return args;
}

function findLocalStrip(figmaName) {
  if (!fs.existsSync(ICON_LIBRARY_DIR)) return null;
  const files = fs.readdirSync(ICON_LIBRARY_DIR).filter((f) => f.endsWith(".svg"));
  const lower = figmaName.trim().toLowerCase();
  for (const f of files) {
    if (f.toLowerCase() === `${lower}.svg`) {
      return path.join(ICON_LIBRARY_DIR, f);
    }
  }
  return null;
}

async function pullFromFigma(entries, sizes) {
  const token = getFigmaToken();
  if (!token) return { ok: false, reason: "no-token" };

  const idToTarget = [];
  for (const entry of entries) {
    for (const size of sizes) {
      const nodeId = entry.sizes[String(size)];
      if (!nodeId) {
        console.warn(`  ⚠ ${entry.name}: missing size=${size} in catalog`);
        continue;
      }
      idToTarget.push({ nodeId, entry, size });
    }
  }

  if (idToTarget.length === 0) return { ok: true, pulled: 0 };

  const batchSize = 80;
  let pulled = 0;

  for (let i = 0; i < idToTarget.length; i += batchSize) {
    const batch = idToTarget.slice(i, i + batchSize);
    const ids = batch.map((b) => b.nodeId).join(",");
    const url = `https://api.figma.com/v1/images/${FIGMA_FILE_KEY}?ids=${encodeURIComponent(ids)}&format=svg`;
    console.log(`  Figma export batch ${i / batchSize + 1} (${batch.length} nodes)…`);
    const res = await fetch(url, { headers: { "X-Figma-Token": token } });
    if (!res.ok) {
      throw new Error(`Figma Images API ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    if (data.err) throw new Error(`Figma Images error: ${data.err}`);

    for (const target of batch) {
      const imageUrl = data.images?.[target.nodeId];
      if (!imageUrl) {
        console.warn(`  ⚠ no image URL for ${target.entry.name} size=${target.size}`);
        continue;
      }
      const svgRes = await fetch(imageUrl);
      if (!svgRes.ok) {
        console.warn(`  ⚠ download failed ${target.entry.name} size=${target.size}`);
        continue;
      }
      let svg = await svgRes.text();
      svg = normalizeExportedSvg(svg, target.size);
      const outDir = path.join(SVG_DIR, target.entry.slug);
      ensureDir(outDir);
      fs.writeFileSync(path.join(outDir, `${target.size}.svg`), svg);
      pulled++;
    }
  }

  return { ok: true, pulled };
}

function pullFromStrips(entries, sizes) {
  let pulled = 0;
  let missed = [];

  for (const entry of entries) {
    const stripPath = findLocalStrip(entry.name);
    if (!stripPath) {
      missed.push(entry.name);
      continue;
    }
    const strip = fs.readFileSync(stripPath, "utf8");
    const outDir = path.join(SVG_DIR, entry.slug);
    ensureDir(outDir);

    for (const size of sizes) {
      try {
        const svg = extractStripSize(strip, size);
        fs.writeFileSync(path.join(outDir, `${size}.svg`), svg + "\n");
        pulled++;
      } catch (err) {
        console.warn(`  ⚠ strip extract ${entry.name} size=${size}: ${err.message}`);
      }
    }
  }

  return { pulled, missed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = loadManifest();

  let queries = [...args.names];
  if (args.from) {
    const lines = fs
      .readFileSync(path.resolve(args.from), "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    queries.push(...lines);
  }
  if (args.used) {
    queries.push(...Object.values(USED_ICON_ALIASES));
  }
  if (queries.length === 0) {
    console.error("Pass icon names, --used, or --from file");
    process.exit(1);
  }

  const entries = [];
  const unresolved = [];
  for (const q of queries) {
    const entry = resolveManifestEntry(manifest, q);
    if (!entry) {
      // Try alias reverse
      const aliasTarget = USED_ICON_ALIASES[q] || USED_ICON_ALIASES[`Icon${q}`];
      const viaAlias = aliasTarget
        ? resolveManifestEntry(manifest, aliasTarget)
        : null;
      if (viaAlias) entries.push(viaAlias);
      else unresolved.push(q);
    } else {
      entries.push(entry);
    }
  }

  // Dedupe by slug
  const bySlug = new Map();
  for (const e of entries) bySlug.set(e.slug, e);
  const unique = [...bySlug.values()];

  console.log(`Pulling ${unique.length} icons (sizes: ${args.sizes.join(",")})…`);
  if (unresolved.length) {
    console.warn(`Unresolved names:\n  - ${unresolved.join("\n  - ")}`);
  }

  ensureDir(SVG_DIR);

  const token = getFigmaToken();
  if (token) {
    const result = await pullFromFigma(unique, args.sizes);
    console.log(`Pulled ${result.pulled} SVG files via Figma API`);
  } else {
    console.log("No FIGMA_ACCESS_TOKEN — using local icon-library strips");
    const { pulled, missed } = pullFromStrips(unique, args.sizes);
    console.log(`Extracted ${pulled} SVG files from strips`);
    if (missed.length) {
      console.warn(
        `No local strip for ${missed.length} icons (need Figma token or strip export):\n  - ${missed.join("\n  - ")}`
      );
      // Write a hint file for MCP / manual follow-up
      const hintPath = path.join(SVG_DIR, "_missing.json");
      fs.writeFileSync(
        hintPath,
        JSON.stringify(
          missed.map((name) => {
            const e = unique.find((u) => u.name === name);
            return { name, slug: e?.slug, sizes: e?.sizes };
          }),
          null,
          2
        ) + "\n"
      );
      console.warn(`Wrote missing list → ${hintPath}`);
    }
  }

  // Write index of pulled icons
  const pulledSlugs = fs
    .readdirSync(SVG_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  fs.writeFileSync(
    path.join(SVG_DIR, "index.json"),
    JSON.stringify({ icons: pulledSlugs.sort(), updatedAt: new Date().toISOString() }, null, 2) +
      "\n"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
