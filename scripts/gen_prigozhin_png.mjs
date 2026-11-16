import fs from "fs";
import zlib from "zlib";

function createPng(width, height, getPixel) {
  const lineSize = 1 + width * 4;
  const rawData = Buffer.alloc(lineSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * lineSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const toCrc = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);
    return Buffer.concat([len, toCrc, crcBuf]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressed),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

// High-Detail 32-bit Pixel-Art Generator for Big Zombie Prigožin Clone
const W = 180;
const H = 210;
const pixels = Array.from({ length: H }, () => Array.from({ length: W }, () => [0, 0, 0, 0]));

function blendPx(x, y, r, g, b, a = 255) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || ix >= W || iy < 0 || iy >= H || a <= 0) return;
  const dst = pixels[iy][ix];
  if (a >= 255 || dst[3] === 0) {
    pixels[iy][ix] = [
      Math.max(0, Math.min(255, Math.round(r))),
      Math.max(0, Math.min(255, Math.round(g))),
      Math.max(0, Math.min(255, Math.round(b))),
      Math.max(0, Math.min(255, Math.round(a))),
    ];
    return;
  }
  const srcA = a / 255;
  const dstA = dst[3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  pixels[iy][ix] = [
    Math.round((r * srcA + dst[0] * dstA * (1 - srcA)) / outA),
    Math.round((g * srcA + dst[1] * dstA * (1 - srcA)) / outA),
    Math.round((b * srcA + dst[2] * dstA * (1 - srcA)) / outA),
    Math.round(outA * 255),
  ];
}

// Shaded ellipse with dark pixel-art ink outline and directional lighting
function drawShadedEllipse(cx, cy, rx, ry, baseRGB, outlineThick = 2.6) {
  const [br, bg, bb] = baseRGB;
  for (let y = Math.floor(cy - ry - outlineThick); y <= Math.ceil(cy + ry + outlineThick); y++) {
    for (let x = Math.floor(cx - rx - outlineThick); x <= Math.ceil(cx + rx + outlineThick); x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = Math.hypot(nx, ny);
      const outNx = (x - cx) / (rx + outlineThick);
      const outNy = (y - cy) / (ry + outlineThick);
      const outD = Math.hypot(outNx, outNy);
      if (outD > 1) continue;
      if (d > 1) {
        blendPx(x, y, 16, 18, 12, 255);
      } else {
        // Directional top-left highlight & bottom-right shadow
        const light = -nx * 0.35 - ny * 0.45;
        const shade = d > 0.82 ? 0.72 : 1 + light * 0.42;
        blendPx(x, y, br * shade, bg * shade, bb * shade, 255);
      }
    }
  }
}

// Shaded rounded box with dark ink outline
function drawShadedBox(x0, y0, w, h, rad, baseRGB, outline = 2.5) {
  const [br, bg, bb] = baseRGB;
  const x1 = x0 + w;
  const y1 = y0 + h;
  for (let y = Math.floor(y0 - outline); y <= Math.ceil(y1 + outline); y++) {
    for (let x = Math.floor(x0 - outline); x <= Math.ceil(x1 + outline); x++) {
      const qx = Math.max(x0 + rad, Math.min(x1 - rad, x));
      const qy = Math.max(y0 + rad, Math.min(y1 - rad, y));
      const dist = Math.hypot(x - qx, y - qy) - rad;
      if (dist > outline) continue;
      if (dist > 0) {
        blendPx(x, y, 16, 18, 12, 255);
      } else {
        const nx = (x - (x0 + w * 0.5)) / (w * 0.5);
        const ny = (y - (y0 + h * 0.5)) / (h * 0.5);
        const edgeDark = dist > -2.2 ? 0.76 : 1;
        const shade = (1 - nx * 0.14 - ny * 0.22) * edgeDark;
        blendPx(x, y, br * shade, bg * shade, bb * shade, 255);
      }
    }
  }
}

// 1. Subtle Necrotic Green Aura
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - 90, y - 108);
    if (d < 86) {
      const a = Math.floor(Math.pow(1 - d / 86, 2) * 65);
      blendPx(x, y, 57, 255, 20, a);
    }
  }
}

// 2. Giant Wagner Sledgehammer ("Кувалда") on right side
for (let t = 0; t < 145; t++) {
  const hx = 132 + t * 0.18;
  const hy = 32 + t * 1.12;
  drawShadedEllipse(hx, hy, 5, 4, [118, 68, 34], 2);
}
// Forged steel sledgehammer head
drawShadedBox(102, 14, 58, 34, 6, [96, 106, 118], 3);
// Blood-stained left face of hammer
drawShadedBox(102, 16, 12, 30, 3, [175, 28, 28], 1.5);
// White skull emblem on hammer
drawShadedEllipse(134, 29, 7, 6.5, [242, 240, 232], 1.8);
drawShadedBox(130, 33, 8, 5, 1.5, [242, 240, 232], 1.5);
blendPx(132, 28, 15, 15, 15, 255);
blendPx(136, 28, 15, 15, 15, 255);

// 3. Heavy Camo Cargo Legs, Spiked Knee Armor & Combat Boots
drawShadedBox(54, 142, 30, 42, 7, [74, 88, 60], 3);
drawShadedBox(96, 142, 30, 42, 7, [74, 88, 60], 3);
// Knee pads
drawShadedBox(52, 154, 34, 16, 5, [38, 42, 36], 2.5);
drawShadedBox(94, 154, 34, 16, 5, [38, 42, 36], 2.5);
drawShadedEllipse(69, 162, 4, 4, [210, 215, 220], 1.5);
drawShadedEllipse(111, 162, 4, 4, [210, 215, 220], 1.5);
// Combat Boots
drawShadedBox(48, 178, 38, 22, 7, [26, 28, 26], 3);
drawShadedBox(94, 178, 38, 22, 7, [26, 28, 26], 3);

// 4. Hulking Wagner Tactical Plate Carrier & Torso
drawShadedBox(40, 76, 100, 72, 15, [96, 86, 66], 3.5);
// Molle webbing & plate carrier front panel
drawShadedBox(48, 84, 84, 58, 10, [78, 70, 54], 2.5);

// St. George ribbon on left shoulder
drawShadedBox(44, 80, 22, 10, 2, [255, 115, 0], 2);
for (let ry = 82; ry <= 88; ry += 3) {
  for (let rx = 45; rx < 65; rx++) blendPx(rx, ry, 20, 20, 20, 255);
}

// 4 Tactical Mag Pouches at waist
for (let p = 0; p < 4; p++) {
  drawShadedBox(51 + p * 20, 116, 17, 24, 4, [62, 56, 42], 2.2);
}

// Dark Chest Patch with glowing red "AMMO?!" stencil
drawShadedBox(54, 90, 72, 20, 4, [24, 26, 24], 2.2);

// Pixel font for "AMMO?!"
const glyphs = {
  A: ["01110", "10001", "11111", "10001", "10001"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "01110"],
  "?": ["01110", "00001", "00110", "00000", "00100"],
  "!": ["00100", "00100", "00100", "00000", "00100"],
};
const word = ["A", "M", "M", "O", "?", "!"];
for (let idx = 0; idx < word.length; idx++) {
  const g = glyphs[word[idx]];
  const gx = 59 + idx * 10;
  const gy = 95;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (g[r][c] === "1") {
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            blendPx(gx + c * 1.8 + dx, gy + r * 2 + dy, 255, 42, 42, 255);
          }
        }
      }
    }
  }
}

// 5. Muscular Veined Zombie Arms
drawShadedEllipse(31, 98, 16, 18, [122, 162, 102], 3);
drawShadedEllipse(25, 122, 14, 16, [110, 148, 90], 3);
// Left hand clutching olive "БК" ammo box
drawShadedBox(8, 128, 34, 22, 4, [72, 90, 50], 2.8);
drawShadedBox(14, 134, 22, 10, 2, [235, 195, 35], 1.5);

drawShadedEllipse(149, 98, 16, 18, [122, 162, 102], 3);
drawShadedEllipse(154, 120, 14, 16, [110, 148, 90], 3);

// 6. Stitched Bull Neck & Iconic Bald Domed Head of Prigozhin
drawShadedBox(70, 62, 40, 22, 6, [124, 160, 104], 3);
// Neck stitches
for (let x = 74; x <= 106; x++) blendPx(x, 71, 25, 35, 20, 255);
for (let x = 76; x <= 104; x += 6) {
  for (let y = 68; y <= 74; y++) blendPx(x, y, 25, 35, 20, 255);
}

// Ears
drawShadedEllipse(58, 44, 6, 10, [120, 154, 98], 2.5);
drawShadedEllipse(122, 44, 6, 10, [120, 154, 98], 2.5);

// Bald Domed Head with 3D shading
drawShadedEllipse(90, 42, 30, 28, [142, 178, 118], 3.5);

// Forehead wrinkles & battle scar
for (let x = 73; x <= 107; x++) {
  blendPx(x, 26, 82, 108, 66, 255);
  blendPx(x, 30, 82, 108, 66, 255);
}
for (let s = 0; s < 18; s++) {
  blendPx(74 + s, 21 + s * 0.45, 195, 24, 24, 255);
  blendPx(74 + s, 22 + s * 0.45, 120, 12, 12, 255);
}

// Glowing Red & Neon-Green Zombie Eyes + Furrowed Brow
drawShadedEllipse(78, 41, 6.5, 5.5, [255, 25, 40], 2.2);
drawShadedEllipse(102, 41, 6.5, 5.5, [255, 25, 40], 2.2);
drawShadedEllipse(78, 41, 2.8, 2.8, [57, 255, 20], 0);
drawShadedEllipse(102, 41, 2.8, 2.8, [57, 255, 20], 0);

// Angry Slanted Brows
for (let b = 0; b < 14; b++) {
  drawShadedEllipse(70 + b, 33 + b * 0.35, 2.5, 2.2, [42, 56, 32], 0);
  drawShadedEllipse(110 - b, 33 + b * 0.35, 2.5, 2.2, [42, 56, 32], 0);
}

// Bulbous Nose
drawShadedEllipse(90, 47, 7, 6, [122, 158, 98], 2.2);

// Wide Roaring Mouth ("ШОЙГУ! ГЕРАСИМОВ!")
drawShadedBox(74, 54, 32, 15, 5, [42, 10, 12], 2.8);
for (let tx = 77; tx <= 102; tx += 5) {
  drawShadedBox(tx, 55, 3.5, 4, 1, [245, 240, 200], 1);
  drawShadedBox(tx, 64, 3.5, 4, 1, [245, 240, 200], 1);
}

const pngBuffer = createPng(W, H, (x, y) => pixels[y][x]);
fs.writeFileSync("public/sprites/prigozhin.png", pngBuffer);
console.log(`Generated upgraded public/sprites/prigozhin.png (${pngBuffer.length} bytes)!`);
