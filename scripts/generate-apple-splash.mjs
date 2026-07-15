/**
 * Apple Splash Screen Generator for BLACK ROSE CAFE
 * Generates proper splash screens for all iPhone/iPad models
 */
import sharp from "sharp";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public");

const BG = "#0D0D0D";
const GREEN = "#2D9B6E";

// Find best available logo
const logoCandidates = [
  path.join(root, "attached_assets/qirox-logo-customer.png"),
  path.join(root, "public/logo-512.png"),
  path.join(root, "public/icon-512.png"),
];
const logoPath = logoCandidates.find(p => existsSync(p)) || logoCandidates[0];

console.log("Using logo:", logoPath);

// All Apple device splash screen sizes (portrait, physical pixels)
const SPLASH_SIZES = [
  { name: "640x1136",  w: 640,  h: 1136 }, // iPhone SE 1st gen / iPhone 5
  { name: "750x1334",  w: 750,  h: 1334 }, // iPhone 8/6s/7
  { name: "1242x2208", w: 1242, h: 2208 }, // iPhone 8+/6s+/7+
  { name: "1125x2436", w: 1125, h: 2436 }, // iPhone X/XS/11 Pro
  { name: "1080x2340", w: 1080, h: 2340 }, // iPhone 12 mini/13 mini
  { name: "1170x2532", w: 1170, h: 2532 }, // iPhone 12/13/14
  { name: "1179x2556", w: 1179, h: 2556 }, // iPhone 14 Pro / 15 Pro
  { name: "828x1792",  w: 828,  h: 1792 }, // iPhone XR/11
  { name: "1242x2688", w: 1242, h: 2688 }, // iPhone XS Max/11 Pro Max
  { name: "1284x2778", w: 1284, h: 2778 }, // iPhone 12 Pro Max/13 Pro Max
  { name: "1290x2796", w: 1290, h: 2796 }, // iPhone 15 Plus/Pro Max/14 Plus
  { name: "1536x2048", w: 1536, h: 2048 }, // iPad mini / iPad 9.7"
  { name: "1640x2360", w: 1640, h: 2360 }, // iPad Air 4/5
  { name: "1668x2388", w: 1668, h: 2388 }, // iPad Pro 11"
  { name: "2048x2732", w: 2048, h: 2732 }, // iPad Pro 12.9"
];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

async function makeSplashScreen({ w, h, name }) {
  const outputPath = path.join(outDir, `splash-${name}.png`);

  // Logo size: ~22% of screen height
  const logoSize = Math.round(h * 0.22);

  // Load and resize logo (with transparent background preserved)
  const logoBuffer = await sharp(logoPath)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Green glow circle behind logo
  const glowSize = Math.round(logoSize * 1.6);
  const glowSvg = `
    <svg width="${glowSize}" height="${glowSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#2D9B6E" stop-opacity="0.18"/>
          <stop offset="60%"  stop-color="#2D9B6E" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#2D9B6E" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${glowSize/2}" cy="${glowSize/2}" r="${glowSize/2}" fill="url(#glow)"/>
    </svg>`;

  const glowBuffer = await sharp(Buffer.from(glowSvg))
    .png()
    .toBuffer();

  // App name text in Arabic (SVG text)
  const textW = Math.round(w * 0.75);
  const fontSize = Math.round(h * 0.034);
  const subFontSize = Math.round(h * 0.022);
  const textSvg = `
    <svg width="${textW}" height="${Math.round(h * 0.14)}" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="42%" 
        font-family="'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="${fontSize}" font-weight="700" fill="#F5F5F5" text-anchor="middle"
        letter-spacing="3">BLACK ROSE CAFE</text>
      <text x="50%" y="72%"
        font-family="'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
        font-size="${subFontSize}" font-weight="400" fill="#2D9B6E" text-anchor="middle"
        letter-spacing="1">اطلب مشروبك المفضل</text>
    </svg>`;

  const textBuffer = await sharp(Buffer.from(textSvg)).png().toBuffer();

  // Green accent line
  const lineW = Math.round(w * 0.15);
  const lineH = Math.round(h * 0.003);
  const lineSvg = `
    <svg width="${lineW}" height="${Math.max(lineH, 2)}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${lineW}" height="${Math.max(lineH, 2)}" 
        rx="${Math.max(lineH, 2)/2}" fill="#2D9B6E"/>
    </svg>`;
  const lineBuffer = await sharp(Buffer.from(lineSvg)).png().toBuffer();

  // Layout positions
  const logoTop  = Math.round(h * 0.35);
  const logoLeft = Math.round((w - logoSize) / 2);
  const glowTop  = Math.round(h * 0.35) - Math.round((glowSize - logoSize) / 2);
  const glowLeft = Math.round((w - glowSize) / 2);
  const lineTop  = Math.round(h * 0.35) + logoSize + Math.round(h * 0.04);
  const lineLeft = Math.round((w - lineW) / 2);
  const textTop  = lineTop + Math.round(lineH + h * 0.025);
  const textLeft = Math.round((w - textW) / 2);

  const bg = hexToRgb(BG);

  await sharp({
    create: {
      width: w,
      height: h,
      channels: 3,
      background: bg,
    },
  })
    .composite([
      { input: glowBuffer, top: glowTop,  left: glowLeft },
      { input: logoBuffer, top: logoTop,  left: logoLeft },
      { input: lineBuffer, top: lineTop,  left: lineLeft },
      { input: textBuffer, top: textTop,  left: textLeft },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`✅ ${name} → splash-${name}.png`);
}

async function main() {
  console.log("🎨 Generating Apple splash screens...\n");
  for (const size of SPLASH_SIZES) {
    await makeSplashScreen(size);
  }
  console.log("\n✅ All splash screens generated!");
}

main().catch(console.error);
