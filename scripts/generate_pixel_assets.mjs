import fs from "fs";
import path from "path";
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

function hexToRgba(hex) {
  if (!hex || hex === "none") return [0, 0, 0, 0];
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  let a = 255;
  if (h.length === 8) {
    a = parseInt(h.substring(6, 8), 16);
  }
  return [r, g, b, a];
}

class PixelGrid {
  constructor(w, h, scale = 2) {
    this.w = w;
    this.h = h;
    this.scale = scale;
    this.pixels = Array.from({ length: h }, () => Array(w).fill(""));
  }

  set(x, y, color) {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) {
      this.pixels[y][x] = color;
    }
  }

  get(x, y) {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) {
      return this.pixels[y][x];
    }
    return "";
  }

  rect(x, y, w, h, color) {
    for (let cy = y; cy < y + h; cy++) {
      for (let cx = x; cx < x + w; cx++) {
        this.set(cx, cy, color);
      }
    }
  }

  dither(x, y, w, h, colA, colB) {
    for (let cy = y; cy < y + h; cy++) {
      for (let cx = x; cx < x + w; cx++) {
        this.set(cx, cy, (cx + cy) % 2 === 0 ? colA : colB);
      }
    }
  }

  addOutline(outlineColor = "#10140e") {
    const toOutline = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!this.pixels[y][x]) {
          if (
            (y > 0 && this.pixels[y - 1][x] && this.pixels[y - 1][x] !== outlineColor) ||
            (y < this.h - 1 && this.pixels[y + 1][x] && this.pixels[y + 1][x] !== outlineColor) ||
            (x > 0 && this.pixels[y][x - 1] && this.pixels[y][x - 1] !== outlineColor) ||
            (x < this.w - 1 && this.pixels[y][x + 1] && this.pixels[y][x + 1] !== outlineColor)
          ) {
            toOutline.push([x, y]);
          }
        }
      }
    }
    for (const [x, y] of toOutline) {
      this.pixels[y][x] = outlineColor;
    }
  }

  toPngBuffer() {
    const outW = this.w * this.scale;
    const outH = this.h * this.scale;
    return createPng(outW, outH, (x, y) => {
      const srcX = Math.floor(x / this.scale);
      const srcY = Math.floor(y / this.scale);
      const col = this.get(srcX, srcY);
      return hexToRgba(col);
    });
  }
}

export function drawPavel(frame, isLoud) {
  const g = new PixelGrid(28, 40, 2);
  const bob = frame === 1 ? 1 : 0;

  // Colors
  const cHairHigh = "#f8fafc";
  const cHairMid = "#cbd5e1";
  const cHairShadow = "#64748b";
  const cSkin = "#f6ad55";
  const cSkinShadow = "#dd6b20";
  const cGlasses = "#0f172a";
  const cGlassesGlint = "#38bdf8";

  // Flannel palette
  const cRed1 = "#ef4444";
  const cRed2 = "#991b1b";
  const cRed3 = "#450a0a";
  const cBlue1 = "#3b82f6";
  const cBlue2 = "#1d4ed8";
  const cBlue3 = "#0f172a";

  const f1 = isLoud ? cRed1 : cBlue1;
  const f2 = isLoud ? cRed2 : cBlue2;
  const f3 = isLoud ? cRed3 : cBlue3;

  // Tactical vest
  const cVest = isLoud ? "#3f4f2e" : "#1e293b";
  const cVestDark = isLoud ? "#27331c" : "#0f172a";

  // Cargo pants & Boots
  const cPants = isLoud ? "#334155" : "#1e293b";
  const cPantsDark = isLoud ? "#1e293b" : "#0f172a";
  const cBoot = "#18181b";
  const cBootHighlight = "#52525b";

  // Gun CZ BREN
  const cGun = "#27272a";
  const cGunLight = "#52525b";
  const cSight = "#dc2626";

  // 1. HAIR
  g.rect(10, 2 + bob, 8, 3, cHairMid);
  g.rect(11, 1 + bob, 6, 2, cHairHigh);
  g.rect(9, 3 + bob, 2, 4, cHairShadow);
  g.rect(17, 3 + bob, 2, 3, cHairShadow);

  // 2. FACE & BEARD & GLASSES
  g.rect(11, 4 + bob, 7, 4, cSkin);
  g.rect(11, 5 + bob, 3, 2, cGlasses);
  g.rect(15, 5 + bob, 3, 2, cGlasses);
  g.set(12, 5 + bob, cGlassesGlint);
  g.set(16, 5 + bob, cGlassesGlint);
  g.set(14, 7 + bob, cSkinShadow);
  g.rect(11, 8 + bob, 7, 3, cHairMid);
  g.set(14, 8 + bob, cHairShadow);
  g.set(12, 9 + bob, cHairHigh);
  g.set(16, 9 + bob, cHairHigh);
  g.rect(12, 10 + bob, 5, 2, cHairShadow);

  // 3. FLANNEL SHIRT & VEST
  for (let y = 11 + bob; y <= 23 + bob; y++) {
    for (let x = 7; x <= 21; x++) {
      const gx = Math.floor(x / 2) % 2;
      const gy = Math.floor((y - bob) / 2) % 2;
      if (gx === 0 && gy === 0) g.set(x, y, f1);
      else if (gx === 1 && gy === 1) g.set(x, y, f3);
      else g.set(x, y, f2);
    }
  }

  g.rect(10, 13 + bob, 9, 8, cVest);
  g.rect(11, 14 + bob, 7, 6, cVestDark);
  g.rect(11, 17 + bob, 2, 3, "#475569");
  g.rect(14, 17 + bob, 2, 3, "#475569");
  g.rect(17, 17 + bob, 2, 3, "#475569");
  g.rect(9, 7 + bob, 1, 6, "#64748b");
  g.set(9, 6 + bob, "#38bdf8");

  // 4. ARMS & HANDS
  g.rect(5, 12 + bob, 3, 5, f2);
  g.rect(5, 17 + bob, 3, 4, cSkin);
  g.rect(6, 21 + bob, 3, 3, cSkinShadow);

  g.rect(21, 12 + bob, 3, 5, f2);
  g.rect(20, 17 + bob, 3, 4, cSkin);
  g.rect(19, 20 + bob, 3, 3, cSkinShadow);

  // 5. WEAPON (CZ BREN 2)
  g.rect(14, 19 + bob, 11, 3, cGun);
  g.rect(16, 18 + bob, 7, 2, cGunLight);
  g.rect(25, 20 + bob, 3, 1, cGunLight);
  g.rect(17, 22 + bob, 2, 4, "#18181b");
  g.rect(18, 16 + bob, 3, 2, cGun);
  g.set(19, 16 + bob, cSight);

  if (isLoud) {
    if (frame === 1) {
      g.set(28, 20 + bob, "#fde047");
      g.rect(29, 19 + bob, 2, 3, "#f97316");
    }
  } else {
    g.rect(25, 19 + bob, 4, 3, "#18181b");
    g.rect(25, 20 + bob, 4, 1, "#3f3f46");
  }

  // 6. LEGS & COMBAT BOOTS
  const legLY = 24 + bob;
  const legRY = 24 + bob;

  if (frame === 0) {
    g.rect(9, legLY, 4, 9, cPants);
    g.rect(10, legLY + 4, 3, 3, cPantsDark);
    g.rect(8, legLY + 9, 5, 4, cBoot);
    g.rect(8, legLY + 12, 6, 2, cBootHighlight);

    g.rect(16, legRY, 4, 9, cPants);
    g.rect(16, legRY + 4, 3, 3, cPantsDark);
    g.rect(16, legRY + 9, 5, 4, cBoot);
    g.rect(16, legRY + 12, 6, 2, cBootHighlight);
  } else {
    g.rect(8, legLY, 4, 8, cPants);
    g.rect(9, legLY + 3, 3, 3, cPantsDark);
    g.rect(7, legLY + 8, 5, 4, cBoot);
    g.rect(7, legLY + 11, 6, 2, cBootHighlight);

    g.rect(17, legRY, 4, 9, cPants);
    g.rect(17, legRY + 4, 3, 3, cPantsDark);
    g.rect(17, legRY + 9, 5, 4, cBoot);
    g.rect(17, legRY + 12, 6, 2, cBootHighlight);
  }

  g.addOutline("#10140e");
  return g;
}

export function drawConscript(frame) {
  const g = new PixelGrid(28, 34, 2);
  const bob = frame === 1 ? 1 : 0;

  const cHelmet = "#4d5d36";
  const cHelmetHigh = "#6f824e";
  const cRust = "#9a3412";
  const cBandage = "#f1f5f9";
  const cSkin = "#e2a478";
  const cSkinDirt = "#78350f";

  const cEmr = "#3a4d2c";
  const cEmrDark = "#24331a";

  const cTelWhite = "#f8fafc";
  const cTelBlue = "#0284c7";

  const cTrackNavy = "#1e293b";
  const cTrackStripe = "#f8fafc";
  const cBoot = "#18181b";
  const cSneaker = "#475569";

  const cBrushHandle = "#38bdf8";
  const cBrushHead = "#ffffff";
  const cBrushShadow = "#94a3b8";

  // 1. TOILET BRUSH
  const brushTilt = frame === 0 ? 0 : 1;
  g.rect(20 + brushTilt, 2, 2, 9, cBrushHandle);
  g.rect(19 + brushTilt, 1, 4, 3, cBrushHead);
  g.rect(19 + brushTilt, 3, 4, 1, cBrushShadow);

  // 2. HELMET SSh-68
  g.rect(8, 2 + bob, 12, 6, cHelmet);
  g.rect(9, 1 + bob, 10, 2, cHelmetHigh);
  g.set(15, 3 + bob, cRust);
  g.set(16, 4 + bob, cRust);
  g.rect(7, 7 + bob, 14, 2, cBandage);
  g.set(11, 7 + bob, "#cbd5e1");

  // 3. FACE
  g.rect(9, 8 + bob, 10, 4, cSkin);
  g.set(11, 9 + bob, "#ffffff");
  g.set(12, 9 + bob, "#0f172a");
  g.set(15, 9 + bob, "#ffffff");
  g.set(16, 9 + bob, "#0f172a");
  g.set(13, 10 + bob, cSkinDirt);
  g.rect(11, 11 + bob, 6, 1, "#451a03");

  // 4. TORSO & TELNYASHKA & EMR JACKET
  g.rect(7, 12 + bob, 14, 10, cEmr);
  g.rect(7, 13 + bob, 3, 8, cEmrDark);
  g.rect(18, 13 + bob, 3, 8, cEmrDark);

  g.rect(11, 12 + bob, 6, 7, cTelWhite);
  g.rect(11, 13 + bob, 6, 1, cTelBlue);
  g.rect(11, 15 + bob, 6, 1, cTelBlue);
  g.rect(11, 17 + bob, 6, 1, cTelBlue);

  g.rect(19, 14 + bob, 3, 3, "#ffffff");
  g.set(20, 15 + bob, "#0a0e0a");

  g.rect(10, 16 + bob, 2, 3, "#ff7700");
  g.set(10, 17 + bob, "#111111");

  // 5. WEAPON: AK-74 with Blue Isolenta
  g.rect(15, 17 + bob, 10, 2, "#451a03");
  g.rect(21, 16 + bob, 4, 1, "#27272a");
  g.rect(18, 19 + bob, 3, 4, "#78350f");
  g.rect(18, 20 + bob, 3, 2, "#0284c7");

  // 6. TRACKSUIT PANTS & SNEAKERS
  const legY = 22 + bob;
  if (frame === 0) {
    g.rect(8, legY, 5, 8, cTrackNavy);
    g.rect(8, legY, 1, 8, cTrackStripe);
    g.rect(7, legY + 8, 6, 3, cSneaker);
    g.rect(7, legY + 10, 6, 1, "#ffffff");

    g.rect(15, legY, 5, 8, cTrackNavy);
    g.rect(19, legY, 1, 8, cTrackStripe);
    g.rect(15, legY + 8, 6, 3, cBoot);
    g.rect(15, legY + 10, 6, 1, "#52525b");
  } else {
    g.rect(7, legY, 5, 7, cTrackNavy);
    g.rect(7, legY, 1, 7, cTrackStripe);
    g.rect(6, legY + 7, 6, 3, cSneaker);
    g.rect(6, legY + 9, 6, 1, "#ffffff");

    g.rect(16, legY, 5, 8, cTrackNavy);
    g.rect(20, legY, 1, 8, cTrackStripe);
    g.rect(16, legY + 8, 6, 3, cBoot);
    g.rect(16, legY + 10, 6, 1, "#52525b");
  }

  g.addOutline("#10140e");
  return g;
}

export function drawTikTok(frame) {
  const g = new PixelGrid(28, 35, 2);
  const bob = frame === 1 ? 1 : 0;

  const cBlack = "#18181b";
  const cVest = "#27272a";
  const cGold = "#fbbf24";
  const cGoldDark = "#b45309";
  const cSkin = "#d97706";
  const cRingPink = "#f43f5e";
  const cRingCyan = "#06b6d4";
  const cRedPrada = "#ef4444";

  // 1. SELFIE STICK & RING LIGHT
  const ringY = 1 + bob;
  g.rect(4, ringY, 6, 6, cRingPink);
  g.rect(5, ringY + 1, 4, 4, "#ffffff");
  g.rect(6, ringY + 2, 2, 2, cRingCyan);
  g.set(6, ringY + 2, "#18181b");
  g.set(7, ringY + 2, "#ef4444");
  g.rect(7, ringY + 6, 2, 8, "#94a3b8");

  // 2. HEAD & CLOUT GLASSES & CHIN BEARD
  g.rect(12, 3 + bob, 9, 4, cBlack);
  g.rect(12, 7 + bob, 4, 3, cGold);
  g.rect(17, 7 + bob, 4, 3, cGold);
  g.rect(13, 8 + bob, 2, 2, "#09090b");
  g.rect(18, 8 + bob, 2, 2, "#09090b");
  g.set(16, 9 + bob, cSkin);
  g.rect(12, 10 + bob, 9, 4, cBlack);
  g.rect(13, 13 + bob, 7, 2, cBlack);

  // 3. DESIGNER TACTICAL VEST & GOLD CHAIN
  g.rect(10, 13 + bob, 11, 9, cVest);
  g.rect(12, 14 + bob, 7, 8, cBlack);
  g.rect(13, 14 + bob, 5, 2, cGold);
  g.set(15, 16 + bob, cGold);

  // 4. SOLID GOLD AK-74
  g.rect(18, 16 + bob, 8, 3, cGold);
  g.rect(20, 15 + bob, 5, 1, cGoldDark);
  g.rect(22, 19 + bob, 2, 4, cGoldDark);
  g.set(26, 17 + bob, "#fef08a");

  // 5. SLIM BLACK CARGO PANTS & PRADA COMBAT BOOTS WITH RED SOLE
  const legY = 23 + bob;
  if (frame === 0) {
    g.rect(10, legY, 4, 8, cBlack);
    g.rect(10, legY + 8, 4, 3, "#18181b");
    g.rect(9, legY + 10, 6, 1, cRedPrada);

    g.rect(16, legY, 4, 8, cBlack);
    g.rect(16, legY + 8, 4, 3, "#18181b");
    g.rect(15, legY + 10, 6, 1, cRedPrada);
  } else {
    g.rect(9, legY, 4, 7, cBlack);
    g.rect(9, legY + 7, 4, 3, "#18181b");
    g.rect(8, legY + 9, 6, 1, cRedPrada);

    g.rect(17, legY, 4, 8, cBlack);
    g.rect(17, legY + 8, 4, 3, "#18181b");
    g.rect(16, legY + 10, 6, 1, cRedPrada);
  }

  g.addOutline("#10140e");
  return g;
}

export function drawScooter(frame) {
  const g = new PixelGrid(36, 36, 2);
  const bob = frame === 1 ? 1 : 0;

  const cScooter = "#334155";
  const cNeonBlue = "#00f0ff";
  const cTire = "#0f172a";
  const cRpgGreen = "#3f6212";
  const cRpgCopper = "#ea580c";
  const cTapeBlue = "#0284c7";
  const cHelmet = "#4d5d36";
  const cTrackNavy = "#1e293b";

  g.rect(12, 6 + bob, 8, 5, cHelmet);
  g.rect(13, 5 + bob, 6, 2, "#6f824e");
  g.rect(15, 9 + bob, 5, 3, "#e2a478");
  g.set(18, 10 + bob, "#ffffff");
  g.set(19, 10 + bob, "#09090b");
  g.rect(10, 11 + bob, 9, 7, cTrackNavy);
  g.rect(17, 12 + bob, 6, 3, cTrackNavy);

  g.rect(22, 13, 2, 14, cScooter);
  g.rect(20, 10, 8, 3, cRpgGreen);
  g.rect(27, 9, 3, 5, cRpgGreen);
  g.rect(30, 10, 3, 3, cRpgCopper);
  g.rect(22, 9, 2, 6, cTapeBlue);

  g.rect(6, 26, 20, 3, cScooter);
  g.rect(7, 29, 18, 2, cNeonBlue);

  g.rect(3, 24, 6, 6, cTire);
  g.rect(4, 25, 4, 4, "#94a3b8");
  g.rect(23, 24, 6, 6, cTire);
  g.rect(24, 25, 4, 4, "#94a3b8");

  if (frame === 0) {
    g.rect(9, 18 + bob, 5, 8, cTrackNavy);
    g.rect(10, 25 + bob, 6, 2, "#18181b");
  } else {
    g.rect(7, 17 + bob, 5, 7, cTrackNavy);
    g.rect(4, 23 + bob, 4, 3, "#18181b");
  }

  g.addOutline("#10140e");
  return g;
}

export function drawDragonTeeth() {
  const g = new PixelGrid(48, 33, 2);

  const cHigh = "#e2e8f0";
  const cMid = "#94a3b8";
  const cShadow = "#475569";
  const cDark = "#1e293b";
  const cRebar = "#7c2d12";
  const cGrassShadow = "#1f2e14";

  g.rect(4, 28, 40, 4, cGrassShadow);

  const drawPyramid = (cx, cy, s) => {
    for (let dy = 0; dy <= s; dy++) {
      const w = Math.floor((dy / s) * (s * 1.3));
      g.rect(cx - w, cy + dy, w, 1, dy % 3 === 0 ? cHigh : cMid);
      g.rect(cx, cy + dy, w, 1, dy % 2 === 0 ? cShadow : cDark);
    }
    g.set(cx - 2, cy + Math.floor(s * 0.4), cRebar);
    g.set(cx - 1, cy + Math.floor(s * 0.5), cRebar);
  };

  drawPyramid(14, 4, 20);
  drawPyramid(34, 6, 18);
  drawPyramid(24, 8, 22);

  g.set(22, 19, "#ffffff");
  g.set(23, 19, "#ffffff");
  g.set(24, 19, "#ffffff");
  g.set(23, 20, "#ffffff");
  g.set(22, 21, "#ffffff");
  g.set(23, 21, "#ffffff");
  g.set(24, 21, "#ffffff");

  g.addOutline("#10140e");
  return g;
}

export function drawSeamlessGround() {
  const S = 128;
  const g = new PixelGrid(S, S, 2);

  const cBase = "#4a5d2e";
  const cGrassMid = "#586e35";
  const cGrassHigh = "#6c8541";
  const cDirtMid = "#5c4d36";
  const cDirtDark = "#423726";
  const cFlowerYellow = "#facc15";
  const cFlowerBlue = "#38bdf8";

  let seed = 1337;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  g.rect(0, 0, S, S, cBase);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if ((x + y) % 4 === 0) g.set(x, y, cGrassMid);
      if ((x * 3 + y * 7) % 17 === 0) g.set(x, y, cGrassHigh);
    }
  }

  const dirtCenters = [
    [24, 32, 14, 8],
    [88, 76, 16, 9],
    [40, 100, 12, 7],
    [104, 20, 10, 6],
  ];

  for (const [cx, cy, rx, ry] of dirtCenters) {
    for (let dy = -ry; dy <= ry; dy++) {
      for (let dx = -rx; dx <= rx; dx++) {
        const dist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
        const wx = (cx + dx + S) % S;
        const wy = (cy + dy + S) % S;
        if (dist <= 0.6) {
          g.set(wx, wy, (dx + dy) % 2 === 0 ? cDirtMid : cDirtDark);
        } else if (dist <= 1.0) {
          if ((wx + wy) % 2 === 0) {
            g.set(wx, wy, cDirtMid);
          }
        }
      }
    }
  }

  for (let step = 0; step < S; step++) {
    const y1 = (step + 20) % S;
    const y2 = (step + 44) % S;
    if (step % 3 !== 0) {
      g.set(step, y1, cDirtDark);
      g.set((step + 1) % S, y1, cDirtMid);
      g.set(step, y2, cDirtDark);
      g.set((step + 1) % S, y2, cDirtMid);
    }
  }

  for (let i = 0; i < 90; i++) {
    const fx = Math.floor(rnd() * S);
    const fy = Math.floor(rnd() * S);
    const isDirt = g.get(fx, fy) === cDirtDark || g.get(fx, fy) === cDirtMid;
    if (!isDirt) {
      const isYellow = rnd() < 0.55;
      g.set(fx, fy, isYellow ? cFlowerYellow : cFlowerBlue);
      g.set((fx + 1) % S, fy, isYellow ? "#eab308" : "#0284c7");
    }
  }

  return g;
}

export function drawPixelExplosion(frame) {
  const g = new PixelGrid(32, 32, 2);
  const cx = 16;
  const cy = 16;

  const cWhite = "#ffffff";
  const cYellow = "#fef08a";
  const cOrange = "#f97316";
  const cRed = "#dc2626";
  const cSmoke = "#334155";
  const cDarkSmoke = "#1e293b";

  if (frame === 0) {
    // Initial detonation flash
    for (let r = 8; r >= 1; r--) {
      const col = r <= 3 ? cWhite : r <= 6 ? cYellow : cOrange;
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if (Math.hypot(x - cx, y - cy) <= r) g.set(x, y, col);
        }
      }
    }
  } else if (frame === 1) {
    // Max fireball blast
    for (let r = 14; r >= 2; r--) {
      const col = r <= 4 ? cWhite : r <= 8 ? cYellow : r <= 11 ? cOrange : cRed;
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if (Math.hypot(x - cx, y - cy) <= r + (Math.sin(x * 7 + y * 5) * 1.5)) {
            g.set(x, y, col);
          }
        }
      }
    }
    // Sparks
    g.set(cx - 15, cy - 3, cYellow);
    g.set(cx + 14, cy + 4, cYellow);
    g.set(cx - 2, cy - 15, cOrange);
    g.set(cx + 3, cy + 15, cOrange);
  } else if (frame === 2) {
    // Expanding smoke ring + fiery debris
    for (let r = 15; r >= 6; r--) {
      const col = r <= 8 ? cOrange : r <= 11 ? cSmoke : cDarkSmoke;
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= r && d >= 5) {
            if ((x + y) % 2 === 0) g.set(x, y, col);
          }
        }
      }
    }
    g.rect(cx - 3, cy - 3, 6, 6, cDarkSmoke);
    // Flying shrapnel
    g.set(cx - 12, cy - 10, "#fbbf24");
    g.set(cx + 11, cy - 9, "#fbbf24");
    g.set(cx - 9, cy + 12, "#ea580c");
    g.set(cx + 13, cy + 10, "#ea580c");
  } else {
    // Billowing lingering smoke clouds
    for (let r = 14; r >= 4; r--) {
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          const d = Math.hypot(x - cx, y - cy);
          if (d <= r && (x * 3 + y * 2) % 3 === 0) {
            g.set(x, y, d < 8 ? cDarkSmoke : cSmoke);
          }
        }
      }
    }
    g.set(cx + 6, cy - 5, "#ea580c");
    g.set(cx - 5, cy + 6, "#f59e0b");
  }

  g.addOutline("#10140e");
  return g;
}

// Write sprites to public/sprites/
const outDir = path.resolve("public/sprites");
console.log(`Writing pixel art assets to ${outDir}...`);

const pavelLoud0 = drawPavel(0, true).toPngBuffer();
const pavelLoud1 = drawPavel(1, true).toPngBuffer();
const pavelStealth0 = drawPavel(0, false).toPngBuffer();
const pavelStealth1 = drawPavel(1, false).toPngBuffer();

const conscript0 = drawConscript(0).toPngBuffer();
const conscript1 = drawConscript(1).toPngBuffer();

const tiktok0 = drawTikTok(0).toPngBuffer();
const tiktok1 = drawTikTok(1).toPngBuffer();

const scooter0 = drawScooter(0).toPngBuffer();
const scooter1 = drawScooter(1).toPngBuffer();

const ground = drawSeamlessGround().toPngBuffer();
const dragonTeeth = drawDragonTeeth().toPngBuffer();

const boom0 = drawPixelExplosion(0).toPngBuffer();
const boom1 = drawPixelExplosion(1).toPngBuffer();
const boom2 = drawPixelExplosion(2).toPngBuffer();
const boom3 = drawPixelExplosion(3).toPngBuffer();

fs.writeFileSync(path.join(outDir, "pavel-loud.png"), pavelLoud0);
fs.writeFileSync(path.join(outDir, "pavel-loud_1.png"), pavelLoud1);
fs.writeFileSync(path.join(outDir, "pavel-stealth.png"), pavelStealth0);
fs.writeFileSync(path.join(outDir, "pavel-stealth_1.png"), pavelStealth1);
fs.writeFileSync(path.join(outDir, "conscript.png"), conscript0);
fs.writeFileSync(path.join(outDir, "conscript_1.png"), conscript1);
fs.writeFileSync(path.join(outDir, "tiktok.png"), tiktok0);
fs.writeFileSync(path.join(outDir, "tiktok_1.png"), tiktok1);
fs.writeFileSync(path.join(outDir, "scooter.png"), scooter0);
fs.writeFileSync(path.join(outDir, "scooter_1.png"), scooter1);
fs.writeFileSync(path.join(outDir, "ground.png"), ground);
fs.writeFileSync(path.join(outDir, "dragon_teeth.png"), dragonTeeth);
fs.writeFileSync(path.join(outDir, "boom0.png"), boom0);
fs.writeFileSync(path.join(outDir, "boom1.png"), boom1);
fs.writeFileSync(path.join(outDir, "boom2.png"), boom2);
fs.writeFileSync(path.join(outDir, "boom3.png"), boom3);

console.log("All pixel art PNG assets successfully generated and written!");
