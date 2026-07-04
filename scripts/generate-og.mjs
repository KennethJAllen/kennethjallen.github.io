// Generates public/og.png (1200x630 social share image) and
// public/apple-touch-icon.png (180x180) from existing site assets.
// Run with: npm run og — output is committed, not built in CI.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const asset = (p) => path.join(root, 'src/assets/images', p);
const out = (p) => path.join(root, 'public', p);

const WIDTH = 1200;
const HEIGHT = 630;
const AVATAR_SIZE = 280;
const AVATAR_X = 120;
const AVATAR_Y = Math.round((HEIGHT - AVATAR_SIZE) / 2);

// The banner is wider than 1200x630 (1920x768), so a cover crop would cut
// off its left and right edges. Instead, fit the full banner width at the
// top and fill the strip below with the banner's own background color.
const BANNER_HEIGHT = Math.round((768 / 1920) * WIDTH);
const banner = await sharp(asset('banner.png'))
  .resize(WIDTH, BANNER_HEIGHT)
  .toBuffer();

const background = await sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 3,
    background: { r: 63, g: 57, b: 57 },
  },
})
  .composite([{ input: banner, left: 0, top: 0 }])
  .png()
  .toBuffer();

const circleMask = Buffer.from(
  `<svg width="${AVATAR_SIZE}" height="${AVATAR_SIZE}">
     <circle cx="${AVATAR_SIZE / 2}" cy="${AVATAR_SIZE / 2}" r="${AVATAR_SIZE / 2}" fill="#fff"/>
   </svg>`,
);

const avatar = await sharp(asset('avatar.png'))
  .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
  .composite([{ input: circleMask, blend: 'dest-in' }])
  .png()
  .toBuffer();

// Scrim + text. DejaVu Sans is rendered by fontconfig on the machine that
// runs this script; the PNG is committed so CI never renders text.
const overlay = Buffer.from(
  `<svg width="${WIDTH}" height="${HEIGHT}">
     <defs>
       <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#000" stop-opacity="0.35"/>
         <stop offset="1" stop-color="#000" stop-opacity="0.6"/>
       </linearGradient>
     </defs>
     <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scrim)"/>
     <text x="460" y="300" font-family="DejaVu Sans, sans-serif" font-size="72"
           font-weight="bold" fill="#ffffff">Kenneth Allen</text>
     <text x="462" y="368" font-family="DejaVu Sans, sans-serif" font-size="34"
           fill="#e8e4dc">Data Scientist &amp; Mathematician, PhD</text>
   </svg>`,
);

await sharp(background)
  .composite([
    { input: overlay },
    { input: avatar, left: AVATAR_X, top: AVATAR_Y },
  ])
  .png()
  .toFile(out('og.png'));

await sharp(asset('avatar.png'))
  .resize(180, 180, { fit: 'cover' })
  .png()
  .toFile(out('apple-touch-icon.png'));

console.log('Wrote public/og.png and public/apple-touch-icon.png');
