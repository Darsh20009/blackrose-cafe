import sharp from 'sharp';
import { readFileSync } from 'fs';

const W = 1242, H = 2688;
const phoneW = 780, phoneH = 1620;
const phoneX = Math.floor((W - phoneW) / 2);
const phoneY = 700;
const screenW = 720, screenH = 1540;
const screenX = phoneX + 30;
const screenY = phoneY + 40;

const frameSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d0d0d"/>
      <stop offset="100%" stop-color="#1a0610"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="${W/2}" cy="380" rx="500" ry="280" fill="rgba(190,24,69,0.10)"/>
  <rect x="${phoneX}" y="${phoneY}" width="${phoneW}" height="${phoneH}" rx="68" ry="68" fill="#1c1c1e" stroke="#3a3a3c" stroke-width="2"/>
  <rect x="${phoneX - 4}" y="${phoneY + 200}" width="6" height="80" rx="3" fill="#2c2c2e"/>
  <rect x="${phoneX - 4}" y="${phoneY + 310}" width="6" height="120" rx="3" fill="#2c2c2e"/>
  <rect x="${phoneX - 4}" y="${phoneY + 460}" width="6" height="120" rx="3" fill="#2c2c2e"/>
  <rect x="${phoneX + phoneW - 2}" y="${phoneY + 280}" width="6" height="160" rx="3" fill="#2c2c2e"/>
  <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="44" ry="44" fill="#000"/>
  <rect x="${phoneX + Math.floor(phoneW/2) - 60}" y="${screenY + 12}" width="120" height="34" rx="17" fill="#000"/>
  <rect x="${phoneX + Math.floor(phoneW/2) - 65}" y="${screenY + screenH - 24}" width="130" height="5" rx="3" fill="rgba(255,255,255,0.25)"/>
  <rect x="${screenX}" y="${screenY}" width="${screenW}" height="${screenH}" rx="44" ry="44" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="1.5"/>
</svg>`;

const screens = [
  {
    raw: 'screenshots/raw-welcome.jpg',
    out: 'screenshots/store-iphone-1.png',
    line1: 'Your Coffee Story',
    line2: 'Starts Here',
    sub: 'ORDER IN SECONDS  .  TRACK IN REAL TIME',
  },
  {
    raw: 'screenshots/raw-menu.jpg',
    out: 'screenshots/store-iphone-2.png',
    line1: 'Full Menu',
    line2: 'At Your Fingertips',
    sub: 'HOT . COLD . BAKERY . ROSE BOUQUETS',
  },
];

async function make(item) {
  const screenImg = await sharp(item.raw)
    .resize(screenW, screenH, { fit: 'cover', position: 'top' })
    .toBuffer();

  const textSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <text x="${W/2}" y="160" text-anchor="middle"
      font-family="Helvetica Neue, Arial, sans-serif"
      font-size="108" font-weight="800"
      fill="white">${item.line1}</text>
    <text x="${W/2}" y="295" text-anchor="middle"
      font-family="Helvetica Neue, Arial, sans-serif"
      font-size="108" font-weight="800"
      fill="hsl(345,70%,56%)">${item.line2}</text>
    <text x="${W/2}" y="420" text-anchor="middle"
      font-family="Helvetica Neue, Arial, sans-serif"
      font-size="46" font-weight="400"
      letter-spacing="3"
      fill="rgba(255,255,255,0.45)">${item.sub}</text>
  </svg>`;

  await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite([
    { input: Buffer.from(frameSvg), top: 0, left: 0 },
    { input: screenImg, top: screenY, left: screenX },
    { input: Buffer.from(textSvg), top: 0, left: 0 },
  ])
  .flatten({ background: '#0d0d0d' })
  .png()
  .toFile(item.out);

  console.log('Created:', item.out);
}

Promise.all(screens.map(make)).then(() => console.log('All screenshots done!'));
