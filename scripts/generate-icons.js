import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal pure-Node script to generate solid gradient PNG icons with a crisp FrameNova symbol
function createPNG(width, height) {
  // CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // Raw image data: filter byte (0) + RGBA per pixel
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const rPlay = width * 0.22;

  for (let y = 0; y < height; y++) {
    const offset = y * rowBytes;
    rawData[offset] = 0; // Filter type None
    const ny = y / height;

    for (let x = 0; x < width; x++) {
      const pxOffset = offset + 1 + x * 4;
      const nx = x / width;

      // Base background: Dark charcoal gradient (#121520 to #0B0D13)
      let r = Math.round(18 - 7 * ny);
      let g = Math.round(21 - 8 * ny);
      let b = Math.round(32 - 13 * ny);
      let a = 255;

      // Play button triangle roughly centered:
      // Triangle vertices: (cx - rPlay*0.6, cy - rPlay), (cx - rPlay*0.6, cy + rPlay), (cx + rPlay*0.9, cy)
      const x0 = cx - rPlay * 0.55;
      const x1 = cx + rPlay * 0.85;
      const yTop = cy - rPlay * 0.8;
      const yBot = cy + rPlay * 0.8;

      if (x >= x0 && x <= x1) {
        const progress = (x - x0) / (x1 - x0);
        const curTop = cy - (rPlay * 0.8) * (1 - progress);
        const curBot = cy + (rPlay * 0.8) * (1 - progress);
        if (y >= curTop && y <= curBot) {
          // Inside play triangle: violet to electric cyan gradient
          const t = progress;
          r = Math.round(139 * (1 - t) + 6 * t);
          g = Math.round(92 * (1 - t) + 182 * t);
          b = Math.round(246 * (1 - t) + 212 * t);
        }
      }

      // Small accent spark dot
      const dxDot = x - (cx + rPlay * 0.9);
      const dyDot = y - (cy - rPlay * 0.85);
      if (dxDot * dxDot + dyDot * dyDot <= (width * 0.05) ** 2) {
        r = 6;
        g = 182;
        b = 212;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Header chunk IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const compressed = zlib.deflateSync(rawData);

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180));
console.log('Icons generated successfully.');
