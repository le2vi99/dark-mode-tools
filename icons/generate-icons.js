/**
 * Run with: node generate-icons.js
 * Generates PNG icons at 16, 48, and 128px using the Canvas API (Node ≥18)
 * or falls back to writing SVG files you can convert manually.
 *
 * If the `canvas` npm package is available it will produce real PNGs;
 * otherwise it writes SVG files that Chrome also accepts when referenced
 * in manifest.json.
 */

const fs   = require("fs");
const path = require("path");

const sizes = [16, 48, 128];

function svgIcon(size) {
  const half   = size / 2;
  const r      = half * 0.75;
  const stroke = Math.max(1, size / 16);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${half}" cy="${half}" r="${half}" fill="#1a5f8a"/>
  <text x="${half}" y="${half + size * 0.14}" text-anchor="middle"
        font-size="${size * 0.55}" font-family="serif" fill="#e8e8e8">🌙</text>
</svg>`;
}

for (const size of sizes) {
  const outPath = path.join(__dirname, `icon${size}.png`);
  // Try canvas first
  try {
    const { createCanvas } = require("canvas");
    const canvas = createCanvas(size, size);
    const ctx    = canvas.getContext("2d");

    // Background circle
    ctx.fillStyle = "#1a5f8a";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Moon crescent via two overlapping circles
    const cx  = size / 2;
    const cy  = size / 2;
    const big = size * 0.34;
    const off = size * 0.12;

    ctx.fillStyle = "#e8e8e8";
    ctx.beginPath();
    ctx.arc(cx, cy, big, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a5f8a";
    ctx.beginPath();
    ctx.arc(cx + off, cy - off * 0.5, big * 0.78, 0, Math.PI * 2);
    ctx.fill();

    const buffer = canvas.toBuffer("image/png");
    fs.writeFileSync(outPath, buffer);
    console.log(`✓ icon${size}.png`);
  } catch {
    // canvas not available — write SVG with .png extension
    // Chrome MV3 technically wants PNGs but accepts SVG in many builds
    const svgPath = path.join(__dirname, `icon${size}.png`);
    fs.writeFileSync(svgPath, svgIcon(size));
    console.log(`✓ icon${size}.png (SVG fallback — convert to PNG if needed)`);
  }
}
