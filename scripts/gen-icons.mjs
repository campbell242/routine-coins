// Generates PWA icons from the 16x16 pixel-art coin: nearest-neighbor upscale,
// plus a maskable variant on a parchment plate (safe zone padding).
import fs from 'node:fs';
import { PNG } from 'pngjs';

const src = PNG.sync.read(fs.readFileSync('public/assets/coin.png'));

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

const parchment = [0xf3, 0xee, 0xe1];
fs.writeFileSync('public/icons/icon-192.png', PNG.sync.write(onPlate(upscale(src, 10), 192, parchment)));
fs.writeFileSync('public/icons/icon-512.png', PNG.sync.write(onPlate(upscale(src, 28), 512, parchment)));
fs.writeFileSync('public/icons/maskable-512.png', PNG.sync.write(onPlate(upscale(src, 18), 512, parchment)));
console.log('icons written');
