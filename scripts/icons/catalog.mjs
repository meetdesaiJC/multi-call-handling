#!/usr/bin/env node
/**
 * Build icons.manifest.json from Figma Icons page metadata XML.
 *
 * Sources (first match wins):
 *   1. scripts/icons/icons-page.meta.xml  (cached)
 *   2. FIGMA_ICONS_META env path
 *   3. Figma File API nodes?ids=3464:126133&depth=4  (needs FIGMA_ACCESS_TOKEN)
 *
 * Usage: node scripts/icons/catalog.mjs [--meta path/to.xml]
 */
import fs from "node:fs";
import path from "node:path";
import {
  decodeXmlName,
  FIGMA_FILE_KEY,
  getFigmaToken,
  ICONS_PAGE_ID,
  MANIFEST_PATH,
  ROOT,
  slugifyIconName,
  SIZES,
} from "./lib.mjs";

function parseArgs(argv) {
  const args = { meta: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--meta") args.meta = argv[++i];
  }
  return args;
}

async function fetchMetadataFromFigma() {
  const token = getFigmaToken();
  if (!token) return null;

  // depth=3: page → category frames → icon strips → size symbols
  const url = `https://api.figma.com/v1/files/${FIGMA_FILE_KEY}/nodes?ids=${encodeURIComponent(ICONS_PAGE_ID)}&depth=4`;
  console.log("Fetching Icons page from Figma API…");
  const res = await fetch(url, {
    headers: { "X-Figma-Token": token },
  });
  if (!res.ok) {
    throw new Error(`Figma API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const node = data.nodes?.[ICONS_PAGE_ID]?.document;
  if (!node) throw new Error("Icons page node missing from Figma response");

  // Convert JSON tree to a lightweight XML-like string the same parser can use,
  // or build the manifest directly from JSON.
  return { type: "json", node };
}

function findDefaultMetaPath(cliMeta) {
  if (cliMeta) return path.resolve(cliMeta);
  if (process.env.FIGMA_ICONS_META) return path.resolve(process.env.FIGMA_ICONS_META);

  const cached = path.join(ROOT, "scripts/icons/icons-page.meta.xml");
  if (fs.existsSync(cached)) return cached;

  // Cursor agent-tools cache from a prior MCP get_metadata call
  const agentTools = path.join(
    process.env.HOME || "",
    ".cursor/projects/Users-meet-Desktop-Design-System-2-0-Code/agent-tools"
  );
  if (fs.existsSync(agentTools)) {
    const files = fs
      .readdirSync(agentTools)
      .filter((f) => f.endsWith(".txt"))
      .map((f) => path.join(agentTools, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    for (const f of files) {
      const head = fs.readFileSync(f, "utf8").slice(0, 200);
      if (head.includes('name="Icons"') || head.includes('id="3464:126133"')) {
        return f;
      }
    }
  }
  return null;
}

function buildFromXml(xml) {
  const icons = {};
  // Match any frame that contains size=N symbols (standard 100×24 strips + odd layouts).
  const frameRe =
    /<frame id="([^"]+)" name="([^"]+)"[^>]*>([\s\S]*?)<\/frame>/g;

  let match;
  const categoryHints = [];
  const catRe =
    /<frame id="([^"]+)" name="([^"]+)"[^>]*width="(1920|3916|2157|1470|716)"[^>]*>/g;
  while ((match = catRe.exec(xml))) {
    categoryHints.push({
      index: match.index,
      name: decodeXmlName(match[2]),
    });
  }

  function categoryAt(index) {
    let current = "Uncategorized";
    for (const hint of categoryHints) {
      if (hint.index < index) current = hint.name;
      else break;
    }
    return current;
  }

  while ((match = frameRe.exec(xml))) {
    const [, frameId, rawName, body] = match;
    const name = decodeXmlName(rawName).trim();
    if (!name || name === "Frame 1" || /^Frame \d/.test(name)) continue;

    const sizes = {};
    const symbolRe =
      /<symbol id="([^"]+)" name="(?:size=|Property 1=)(\d+)(?:px)?"[^>]*\/?>/g;
    let sm;
    while ((sm = symbolRe.exec(body))) {
      const size = Number(sm[2]);
      if (SIZES.includes(size)) sizes[String(size)] = sm[1];
    }

    // Only keep frames that look like icon sets (have size variants, shallow body)
    if (Object.keys(sizes).length < 2) continue;
    // Skip huge category containers that nest many icons
    if ((body.match(/<frame /g) || []).length > 3) continue;

    const slug = slugifyIconName(name);
    const entry = {
      name,
      slug,
      frameId,
      category: categoryAt(match.index),
      sizes,
    };

    if (!icons[slug]) {
      icons[slug] = entry;
    } else {
      const existing = icons[slug];
      const merged = { ...existing.sizes, ...sizes };
      const preferNew =
        Object.keys(sizes).length >= Object.keys(existing.sizes).length &&
        match.index > 22000;
      icons[slug] = preferNew
        ? { ...entry, sizes: merged }
        : { ...existing, sizes: merged };
    }
  }

  return icons;
}

function walkJson(node, category, icons) {
  if (!node) return;
  const name = node.name || "";
  const children = node.children || [];

  const isCategory =
    (node.type === "FRAME" || node.type === "SECTION") &&
    typeof node.absoluteBoundingBox?.width === "number" &&
    node.absoluteBoundingBox.width >= 700 &&
    children.some(
      (c) =>
        c.type === "FRAME" &&
        Math.round(c.absoluteBoundingBox?.width || 0) === 100 &&
        Math.round(c.absoluteBoundingBox?.height || 0) === 24
    );

  const nextCategory = isCategory ? name : category;

  const w = Math.round(node.absoluteBoundingBox?.width || node.width || 0);
  const h = Math.round(node.absoluteBoundingBox?.height || node.height || 0);

  if (
    (node.type === "FRAME" || node.type === "COMPONENT_SET" || node.type === "GROUP") &&
    w === 100 &&
    h === 24
  ) {
    const sizes = {};
    for (const child of children) {
      const m = /size=(\d+)/.exec(child.name || "");
      if (m && SIZES.includes(Number(m[1]))) {
        sizes[m[1]] = child.id;
      }
    }
    if (Object.keys(sizes).length > 0 && name && name !== "Frame 1") {
      const slug = slugifyIconName(name);
      icons[slug] = {
        name,
        slug,
        frameId: node.id,
        category: nextCategory || "Uncategorized",
        sizes,
      };
    }
  }

  for (const child of children) {
    walkJson(child, nextCategory, icons);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let icons = {};

  const metaPath = findDefaultMetaPath(args.meta);
  if (metaPath) {
    console.log(`Parsing metadata: ${metaPath}`);
    const xml = fs.readFileSync(metaPath, "utf8");
    icons = buildFromXml(xml);

    // Cache under scripts/icons for reproducible builds
    const cachePath = path.join(ROOT, "scripts/icons/icons-page.meta.xml");
    if (path.resolve(metaPath) !== path.resolve(cachePath)) {
      // Don't copy 1.6MB by default — only if --cache-meta
      if (process.argv.includes("--cache-meta")) {
        fs.copyFileSync(metaPath, cachePath);
        console.log(`Cached metadata → ${cachePath}`);
      }
    }
  } else {
    const remote = await fetchMetadataFromFigma();
    if (!remote) {
      console.error(
        "No Icons metadata found.\n" +
          "Provide --meta path/to.xml, set FIGMA_ICONS_META, or FIGMA_ACCESS_TOKEN."
      );
      process.exit(1);
    }
    walkJson(remote.node, "Uncategorized", icons);
  }

  const count = Object.keys(icons).length;
  const withAllSizes = Object.values(icons).filter(
    (i) => i.sizes["16"] && i.sizes["20"] && i.sizes["24"]
  ).length;

  const manifest = {
    source: {
      fileKey: FIGMA_FILE_KEY,
      pageId: ICONS_PAGE_ID,
      pageUrl: `https://www.figma.com/design/${FIGMA_FILE_KEY}/Design-System-2.0?node-id=3464-126133`,
      generatedAt: new Date().toISOString(),
    },
    stats: { icons: count, withAllSizes },
    icons,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `Wrote ${MANIFEST_PATH}\n  icons: ${count}\n  complete 16/20/24: ${withAllSizes}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
