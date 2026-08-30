// Regenerates the app-icon PNGs from design/appicon/master-32.png — the
// 32x32 source of truth (see design/APP_IDENTITY.md). Nearest-neighbor
// integer upscales only; never anti-alias, never scale by a non-integer
// factor, never derive from the 16x16 in-app coin sprite (that sprite is
// unchanged and untouched).
//
// The maskable pair (icon-maskable-192/512) upscales a separate maskable
// master (coin shrunk to clear the 80% safe zone) that the design export
// does not ship, so those two are committed assets copied from
// design/appicon/, not regenerated here.
import fs from 'node:fs';
import { PNG } from 'pngjs';

const master = PNG.sync.read(fs.readFileSync('design/appicon/master-32.png'));

function upscale(png, factor) {
  const out = new PNG({ width: png.width * factor, height: png.height * factor });
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const sx = Math.floor(x / factor);
      const sy = Math.floor(y / factor);
      const si = (sy * png.width + sx) << 2;
      const di = (y * out.width + x) << 2;
      for (let c = 0; c < 4; c++) out.data[di + c] = png.data[si + c];
    }
  }
  return out;
}

function onPlate(png, size, bg) {
  const out = new PNG({ width: size, height: size });
  for (let i = 0; i < size * size; i++) {
    out.data[i * 4] = bg[0];
    out.data[i * 4 + 1] = bg[1];
    out.data[i * 4 + 2] = bg[2];
    out.data[i * 4 + 3] = 255;
  }
  const ox = Math.floor((size - png.width) / 2);
  const oy = Math.floor((size - png.height) / 2);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const si = (y * png.width + x) << 2;
      if (png.data[si + 3] === 0) continue;
      const di = ((y + oy) * size + (x + ox)) << 2;
      for (let c = 0; c < 4; c++) out.data[di + c] = png.data[si + c];
    }
  }
  return out;
}

// The icon's ink ground (#2b2b24) — only used to letterbox the 180px
// apple-touch composition, since 180 is not a multiple of 32.
const ink = [0x2b, 0x2b, 0x24];

fs.writeFileSync('public/icons/icon-192.png', PNG.sync.write(upscale(master, 6)));
fs.writeFileSync('public/icons/icon-512.png', PNG.sync.write(upscale(master, 16)));
fs.writeFileSync('public/icons/favicon-32.png', PNG.sync.write(upscale(master, 1)));
fs.writeFileSync(
  'public/icons/apple-touch-icon.png',
  PNG.sync.write(onPlate(upscale(master, 5), 180, ink)),
);
console.log('icons written (maskable pair is a committed asset — not regenerated)');
