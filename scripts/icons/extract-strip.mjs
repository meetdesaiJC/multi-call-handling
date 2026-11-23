/**
 * Extract a single size frame from a 100×24 Figma strip SVG.
 * Uses viewBox cropping (no path rewriting) so padding/strokes stay exact.
 */
import { STRIP_FRAMES } from "./lib.mjs";

/**
 * @param {string} svg
 * @param {16|20|24} size
 * @returns {string}
 */
export function extractStripSize(svg, size) {
  const frame = STRIP_FRAMES[size];
  if (!frame) throw new Error(`Unsupported size ${size}`);

  // Already a single-frame export (e.g. circle.svg is 24×24 only)
  const single = detectSingleFrame(svg);
  if (single) {
    if (single !== size) {
      throw new Error(
        `Strip is a single ${single}px frame; size=${size} not available offline`
      );
    }
    return normalizeExportedSvg(svg, size);
  }

  let body = "";
  if (hasPerSizeClips(svg)) {
    const targetClipId = findClipIdForFrame(svg, frame);
    if (targetClipId) {
      const groupRe = new RegExp(
        `<g\\s+clip-path="url\\(#${escapeRegExp(targetClipId)}\\)"\\s*>([\\s\\S]*?)</g>`,
        "i"
      );
      const gm = svg.match(groupRe);
      if (gm) body = gm[1].trim();
    }
  }

  // Flat strips (chevron/check/sales dialer): filter drawing elements by frame bounds.
  if (!body) {
    body = filterElementsByFrame(svg, frame);
  }

  if (!body) {
    throw new Error(`Could not extract size=${size} from strip SVG`);
  }

  // Drop clip-path wrappers (frame already cropped); keep children.
  body = body
    .replace(/<g\s+clip-path="[^"]*"\s*>/gi, "")
    .replace(/<\/g>/gi, (match, offset, str) => {
      // Only remove orphan closings later — handled by unwrap below
      return match;
    });
  // Simpler: unwrap all clip-path groups by removing open tags and matching closes via stack
  body = unwrapClipGroups(body);

  // Keep original path coords; shift the frame origin to 0,0 via translate
  // so viewBox is always "0 0 N N" (exact Figma padding preserved).
  const normalized = normalizeColors(body);
  const needsShift = frame.x !== 0 || frame.y !== 0;
  const content = needsShift
    ? `<g transform="translate(${-frame.x} ${-frame.y})">\n${normalized}\n</g>`
    : normalized;

  return [
    `<svg width="${frame.size}" height="${frame.size}" viewBox="0 0 ${frame.size} ${frame.size}" fill="none" xmlns="http://www.w3.org/2000/svg">`,
    content,
    `</svg>`,
  ].join("\n");
}

/** Remove clip-path <g> wrappers while preserving nested markup balance. */
function unwrapClipGroups(markup) {
  // Iteratively remove <g clip-path="...">...</g> innermost-first
  let out = markup;
  let prev;
  do {
    prev = out;
    out = out.replace(
      /<g\s+clip-path="[^"]*"\s*>([\s\S]*?)<\/g>/gi,
      "$1"
    );
  } while (out !== prev);
  return out.trim();
}

function detectSingleFrame(svg) {
  const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!vb) return null;
  const w = Number(vb[1]);
  const h = Number(vb[2]);
  if (w === 100 && h === 24) return null;
  if (w === h && STRIP_FRAMES[w]) return w;
  return null;
}

function hasPerSizeClips(svg) {
  let count = 0;
  const re =
    /<clipPath id="([^"]+)"[^>]*>\s*<rect([^>]*)\/>\s*<\/clipPath>/gi;
  let m;
  while ((m = re.exec(svg))) {
    const width = Number(/width="([^"]+)"/.exec(m[2])?.[1]);
    if (width === 16 || width === 20 || width === 24) count++;
  }
  return count >= 2;
}

/**
 * Pick drawing elements whose coordinates fall primarily inside the frame.
 */
function filterElementsByFrame(svg, frame) {
  const content = svg
    .replace(/<defs[\s\S]*?<\/defs>/gi, "")
    .replace(/<\/?svg[^>]*>/gi, "")
    .replace(/<\/?g[^>]*>/gi, "");

  const elRe =
    /<(path|circle|rect|line|polyline|polygon|ellipse)(\s[^>]*?)(\/>|>[\s\S]*?<\/\1>)/gi;
  const picked = [];
  let m;
  while ((m = elRe.exec(content))) {
    const full = m[0];
    const tag = m[1].toLowerCase();

    if (tag === "rect") {
      const w = Number(/width="([^"]+)"/.exec(full)?.[1]);
      const h = Number(/height="([^"]+)"/.exec(full)?.[1]);
      if (w === 100) continue;
      const xAttr = /(?:^|\s)x="([^"]+)"/.exec(full)?.[1];
      const x = xAttr !== undefined ? Number(xAttr) : 0;
      if (w === frame.size && h === frame.size && Math.abs(x - frame.x) < 0.5) {
        // Skip solid white circular backgrounds for brand marks? Keep them — they're part of the icon.
        picked.push(full);
      }
      continue;
    }

    const nums = [...full.matchAll(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi)].map((n) =>
      Number(n[0])
    );
    if (!nums.length) continue;

    const inFrame = nums.filter(
      (n) => n >= frame.x - 0.5 && n <= frame.x + frame.size + 0.5
    ).length;

    let inOther;
    if (frame.size === 24) {
      inOther = nums.filter((n) => n < 30 || n > 65).length;
    } else if (frame.size === 16) {
      inOther = nums.filter((n) => n > 22).length;
    } else {
      inOther = nums.filter((n) => n < 75).length;
    }

    if (inFrame >= 2 && inFrame >= inOther * 0.5) {
      const hasXInFrame = nums.some(
        (n) => n >= frame.x && n <= frame.x + frame.size
      );
      if (hasXInFrame) picked.push(full);
    }
  }

  return picked.length ? picked.join("\n") : "";
}

function findClipIdForFrame(svg, frame) {
  // Prefer clipPath whose rect matches width/height + translate(x [y])
  const re =
    /<clipPath id="([^"]+)"[^>]*>\s*<rect([^>]*)\/>\s*<\/clipPath>/gi;
  let m;
  while ((m = re.exec(svg))) {
    const [, id, attrs] = m;
    const width = Number(/width="([^"]+)"/.exec(attrs)?.[1]);
    const height = Number(/height="([^"]+)"/.exec(attrs)?.[1]);
    if (width !== frame.size || height !== frame.size) continue;

    const translate = /transform="translate\(([^)]+)\)"/.exec(attrs)?.[1];
    if (!translate) {
      if (frame.x === 0) return id;
      continue;
    }
    const parts = translate.trim().split(/[\s,]+/).map(Number);
    const tx = parts[0] ?? 0;
    const ty = parts[1] ?? 0;
    if (tx === frame.x && ty === frame.y) return id;
    // size=24 often uses translate(36) with implicit y=0
    if (tx === frame.x && frame.y === 0 && (ty === 0 || Number.isNaN(ty))) {
      return id;
    }
  }
  return null;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replace near-black strokes/fills with currentColor; keep multi-color fills. */
export function normalizeColors(svg, { forceCurrentColor = false } = {}) {
  const NEAR_BLACK = new Set([
    "#101828",
    "#000",
    "#000000",
    "#111",
    "#111111",
    "#1a1a1a",
    "#333",
    "#333333",
    "#313131",
    "black",
  ]);

  return svg
    .replace(/\sstroke="([^"]+)"/gi, (m, color) => {
      if (forceCurrentColor || NEAR_BLACK.has(color.toLowerCase())) {
        return ` stroke="currentColor"`;
      }
      return m;
    })
    .replace(/\sfill="([^"]+)"/gi, (m, color) => {
      if (color === "none" || color === "white" || color === "#fff" || color === "#ffffff") {
        return m;
      }
      if (forceCurrentColor || NEAR_BLACK.has(color.toLowerCase())) {
        return ` fill="currentColor"`;
      }
      return m;
    });
}

/**
 * Normalize a Figma-exported single-frame SVG (already correct viewBox).
 */
export function normalizeExportedSvg(svg, size) {
  let out = svg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\sxmlns:xlink="[^"]*"/g, "");

  if (!/<svg[\s\S]*?>/i.test(out)) {
    out = `<svg xmlns="http://www.w3.org/2000/svg">${out}</svg>`;
  }

  out = out.replace(/<svg([^>]*)>/i, (_, attrs) => {
    let a = attrs
      .replace(/\swidth="[^"]*"/gi, "")
      .replace(/\sheight="[^"]*"/gi, "")
      .replace(/\sviewBox="[^"]*"/gi, "");
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"${a}>`;
  });

  out = normalizeColors(out);
  return out.trim() + "\n";
}

/**
 * Extract size frames from irregular multi-size layouts (e.g. Agent unavailability).
 * @param {string} svg
 * @param {{ x: number, y: number, size: number }} frame
 */
export function extractArbitraryFrame(svg, frame) {
  // Use full SVG content cropped by viewBox — works when glyphs sit at known offsets.
  const withoutOuter = svg
    .replace(/<\/?svg[^>]*>/gi, "")
    .replace(/<rect[^>]*stroke-dasharray[^/]*\/>/gi, ""); // decorative dashed border

  const normalized = normalizeColors(withoutOuter.trim());
  return [
    `<svg width="${frame.size}" height="${frame.size}" viewBox="${frame.x} ${frame.y} ${frame.size} ${frame.size}" fill="none" xmlns="http://www.w3.org/2000/svg">`,
    normalized,
    `</svg>`,
  ].join("\n");
}
