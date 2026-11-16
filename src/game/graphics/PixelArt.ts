/**
 * PixelArt.ts - Authentic 16-bit Retro Pixel Art Generator
 * Operation: Flannel Storm
 *
 * Provides razor-sharp, grid-aligned pixel-art textures for Phaser 3
 * with integer scaling, rich retro palettes, and walk-cycle frames.
 */

export class PixelCanvas {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  private grid: string[][];

  constructor(w: number, h: number, scale = 2) {
    this.width = w;
    this.height = h;
    this.scale = scale;
    this.grid = Array.from({ length: h }, () => Array(w).fill(""));
  }

  set(x: number, y: number, color: string) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.grid[y][x] = color;
    }
  }

  get(x: number, y: number): string {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.grid[y][x];
    }
    return "";
  }

  clone(): PixelCanvas {
    const copy = new PixelCanvas(this.width, this.height, this.scale);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        copy.set(x, y, this.get(x, y));
      }
    }
    return copy;
  }

  rect(x: number, y: number, w: number, h: number, color: string) {
    for (let cy = y; cy < y + h; cy++) {
      for (let cx = x; cx < x + w; cx++) {
        this.set(cx, cy, color);
      }
    }
  }

  dither(x: number, y: number, w: number, h: number, colA: string, colB: string) {
    for (let cy = y; cy < y + h; cy++) {
      for (let cx = x; cx < x + w; cx++) {
        this.set(cx, cy, (cx + cy) % 2 === 0 ? colA : colB);
      }
    }
  }

  addOutline(outlineColor = "#10140e") {
    const toOutline: Array<[number, number]> = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.grid[y][x]) {
          if (
            (y > 0 && this.grid[y - 1][x] && this.grid[y - 1][x] !== outlineColor) ||
            (y < this.height - 1 && this.grid[y + 1][x] && this.grid[y + 1][x] !== outlineColor) ||
            (x > 0 && this.grid[y][x - 1] && this.grid[y][x - 1] !== outlineColor) ||
            (x < this.width - 1 && this.grid[y][x + 1] && this.grid[y][x + 1] !== outlineColor)
          ) {
            toOutline.push([x, y]);
          }
        }
      }
    }
    for (const [x, y] of toOutline) {
      this.grid[y][x] = outlineColor;
    }
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = this.width * this.scale;
    canvas.height = this.height * this.scale;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const col = this.grid[y][x];
        if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(x * this.scale, y * this.scale, this.scale, this.scale);
        }
      }
    }
    return canvas;
  }
}

/**
 * 1. General Petr Pavel (Loud & Stealth Modes)
 * Dimensions: 28x40 (scaled 2x -> 56x80)
 */
export function buildPixelHeroFrame(frame: 0 | 1, isLoud: boolean): HTMLCanvasElement {
  const g = new PixelCanvas(28, 40, 2);
  const bob = frame === 1 ? 1 : 0;

  // Colors
  const cHairHigh = "#f8fafc";
  const cHairMid = "#cbd5e1";
  const cHairShadow = "#64748b";
  const cSkin = "#f6ad55";
  const cSkinShadow = "#dd6b20";
  const cGlasses = "#0f172a";
  const cGlassesGlint = "#38bdf8";

  // Flannel palette (Red buffalo check vs Stealth blue check)
  const f1 = isLoud ? "#ef4444" : "#3b82f6";
  const f2 = isLoud ? "#991b1b" : "#1d4ed8";
  const f3 = isLoud ? "#450a0a" : "#0f172a";

  const cVest = isLoud ? "#3f4f2e" : "#1e293b";
  const cVestDark = isLoud ? "#27331c" : "#0f172a";

  const cPants = isLoud ? "#334155" : "#1e293b";
  const cPantsDark = isLoud ? "#1e293b" : "#0f172a";
  const cBoot = "#18181b";
  const cBootHighlight = "#52525b";

  const cGun = "#27272a";
  const cGunLight = "#52525b";
  const cSight = "#dc2626";

  // 1. HAIR (Silver swept pompadour)
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

  // 3. FLANNEL SHIRT & TACTICAL VEST
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
    // Carbon suppressor
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
  return g.toCanvas();
}

/**
 * 2. Mobik Conscript (`conscript`)
 * Dimensions: 28x34 (scaled 2x -> 56x68)
 */
export function buildPixelConscriptFrame(frame: 0 | 1): HTMLCanvasElement {
  const g = new PixelCanvas(28, 34, 2);
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
  return g.toCanvas();
}

/**
 * 3. TikTok Battalion Streamer (`tiktok`)
 * Dimensions: 28x35 (scaled 2x -> 56x70)
 */
export function buildPixelTikTokFrame(frame: 0 | 1): HTMLCanvasElement {
  const g = new PixelCanvas(28, 35, 2);
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
  return g.toCanvas();
}

/**
 * 4. Storm-Scooter Assault Rider (`scooter`)
 * Dimensions: 36x36 (scaled 2x -> 72x72)
 */
export function buildPixelScooterFrame(frame: 0 | 1): HTMLCanvasElement {
  const g = new PixelCanvas(36, 36, 2);
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
  return g.toCanvas();
}

/**
 * 5. Dragon's Teeth Concrete Obstacle (`dragon_teeth`)
 * Dimensions: 48x33 (scaled 2x -> 96x66)
 */
export function buildPixelDragonTeethProp(): HTMLCanvasElement {
  const g = new PixelCanvas(48, 33, 2);

  const cHigh = "#e2e8f0";
  const cMid = "#94a3b8";
  const cShadow = "#475569";
  const cDark = "#1e293b";
  const cRebar = "#7c2d12";
  const cGrassShadow = "#1f2e14";

  g.rect(4, 28, 40, 4, cGrassShadow);

  const drawPyramid = (cx: number, cy: number, s: number) => {
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
  return g.toCanvas();
}

/**
 * 6. Seamless Steppe Ground Texture (`ground`)
 * Dimensions: 128x128 (scaled 2x -> 256x256)
 */
export function buildPixelGroundTexture(): HTMLCanvasElement {
  const S = 128;
  const g = new PixelCanvas(S, S, 2);

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

  return g.toCanvas();
}

/**
 * 7. Pixel Explosion Frames (`boom0`, `boom1`, `boom2`, `boom3`)
 * Dimensions: 32x32 (scaled 2x -> 64x64)
 */
export function buildPixelExplosionFrame(frame: 0 | 1 | 2 | 3): HTMLCanvasElement {
  const g = new PixelCanvas(32, 32, 2);
  const cx = 16;
  const cy = 16;

  const cWhite = "#ffffff";
  const cYellow = "#fef08a";
  const cOrange = "#f97316";
  const cRed = "#dc2626";
  const cSmoke = "#334155";
  const cDarkSmoke = "#1e293b";

  if (frame === 0) {
    for (let r = 8; r >= 1; r--) {
      const col = r <= 3 ? cWhite : r <= 6 ? cYellow : cOrange;
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if (Math.hypot(x - cx, y - cy) <= r) g.set(x, y, col);
        }
      }
    }
  } else if (frame === 1) {
    for (let r = 14; r >= 2; r--) {
      const col = r <= 4 ? cWhite : r <= 8 ? cYellow : r <= 11 ? cOrange : cRed;
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if (Math.hypot(x - cx, y - cy) <= r + Math.sin(x * 7 + y * 5) * 1.5) {
            g.set(x, y, col);
          }
        }
      }
    }
    g.set(cx - 15, cy - 3, cYellow);
    g.set(cx + 14, cy + 4, cYellow);
    g.set(cx - 2, cy - 15, cOrange);
    g.set(cx + 3, cy + 15, cOrange);
  } else if (frame === 2) {
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
    g.set(cx - 12, cy - 10, "#fbbf24");
    g.set(cx + 11, cy - 9, "#fbbf24");
    g.set(cx - 9, cy + 12, "#ea580c");
    g.set(cx + 13, cy + 10, "#ea580c");
  } else {
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
  return g.toCanvas();
}

/**
 * 8. Pixel Smoke Puff (`smoke`)
 * Dimensions: 16x16 (scaled 2x -> 32x32)
 */
export function buildPixelSmokePuff(): HTMLCanvasElement {
  const g = new PixelCanvas(16, 16, 2);
  const cx = 8;
  const cy = 8;
  const cSmoke = "#64748b";
  const cDark = "#334155";

  for (let r = 7; r >= 2; r--) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (Math.hypot(x - cx, y - cy) <= r) {
          g.set(x, y, (x + y) % 2 === 0 ? cSmoke : cDark);
        }
      }
    }
  }
  g.addOutline("#1e293b");
  return g.toCanvas();
}

/**
 * 9. Pixel Flame (`flame`)
 * Dimensions: 16x16 (scaled 2x -> 32x32)
 */
export function buildPixelFlamePuff(): HTMLCanvasElement {
  const g = new PixelCanvas(16, 16, 2);
  const cx = 8;
  const cy = 8;
  const cYellow = "#facc15";
  const cOrange = "#f97316";

  for (let r = 7; r >= 2; r--) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (Math.hypot(x - cx, y - cy) <= r) {
          g.set(x, y, r <= 3 ? cYellow : cOrange);
        }
      }
    }
  }
  g.addOutline("#7c2d12");
  return g.toCanvas();
}

/**
 * 10. Desertcross Assault Golf Cart (`cart`)
 * Dimensions: 50x39 (scaled 2x -> 100x78)
 */
export function getPixelCartGrid(frame: 0 | 1): PixelCanvas {
  const g = new PixelCanvas(50, 39, 2);
  const bob = frame === 1 ? 1 : 0;

  const cTan = "#d4b982";
  const cTanDark = "#a88a54";
  const cRebar = "#475569";
  const cTire = "#18181b";
  const cRim = "#94a3b8";
  const cToilet = "#ffffff";
  const cHelmet = "#4d5d36";

  // Rebar Cope Cage Roof
  g.rect(10, 3 + bob, 32, 2, cRebar);
  for (let x = 12; x <= 40; x += 4) {
    g.set(x, 4 + bob, "#cbd5e1");
  }
  // Cage vertical struts
  g.rect(12, 5 + bob, 2, 14, cRebar);
  g.rect(26, 5 + bob, 2, 14, cRebar);
  g.rect(40, 5 + bob, 2, 14, cRebar);

  // Stolen Toilet on rear bed
  g.rect(4, 9 + bob, 7, 10, cToilet);
  g.rect(3, 9 + bob, 3, 5, "#e2e8f0");
  g.rect(6, 12 + bob, 6, 4, "#38bdf8");
  g.rect(5, 11 + bob, 6, 1, "#ef4444");

  // Mobik Driver in seat
  g.rect(20, 9 + bob, 6, 5, cHelmet);
  g.rect(21, 14 + bob, 5, 5, "#3a4d2c");
  g.set(24, 11 + bob, "#e2a478");

  // Cart body
  g.rect(10, 19 + bob, 36, 9, cTan);
  g.rect(10, 23 + bob, 36, 5, cTanDark);
  // White Z on hood
  g.rect(38, 21 + bob, 5, 1, "#ffffff");
  g.set(40, 22 + bob, "#ffffff");
  g.rect(38, 23 + bob, 5, 1, "#ffffff");

  // Wheels
  const wheelY = 25;
  g.rect(6, wheelY, 10, 10, cTire);
  g.rect(8, wheelY + 2, 6, 6, cRim);
  g.rect(9, wheelY + 3, 4, 4, cTire);

  g.rect(34, wheelY, 10, 10, cTire);
  g.rect(36, wheelY + 2, 6, 6, cRim);
  g.rect(37, wheelY + 3, 4, 4, cTire);

  g.addOutline("#10140e");
  return g;
}

export function buildPixelCartFrame(frame: 0 | 1): HTMLCanvasElement {
  return getPixelCartGrid(frame).toCanvas();
}

/**
 * 11. Bukhanka "Tactical Loaf" Van (`bukhanka`)
 * Dimensions: 52x41 (scaled 2x -> 104x82)
 */
export function getPixelBukhankaGrid(frame: 0 | 1): PixelCanvas {
  const g = new PixelCanvas(52, 41, 2);
  const bob = frame === 1 ? 1 : 0;

  const cOlive = "#4d5d36";
  const cOliveDark = "#3a4628";
  const cGlass = "#38bdf8";
  const cBirch = "#f8fafc";
  const cBark = "#18181b";
  const cCarpet = "#991b1b";
  const cCarpetGold = "#f59e0b";
  const cTire = "#18181b";
  const cRim = "#64748b";

  // Grandmother's Persian carpet rolled on roof
  g.rect(12, 2 + bob, 28, 4, cCarpet);
  for (let x = 14; x <= 38; x += 3) {
    g.set(x, 3 + bob, cCarpetGold);
  }

  // Van rounded loaf roof
  g.rect(8, 6 + bob, 38, 3, cOlive);
  g.rect(10, 5 + bob, 34, 1, "#657d47");

  // Van Body & Windows
  g.rect(5, 9 + bob, 43, 19, cOlive);
  g.rect(5, 20 + bob, 43, 8, cOliveDark);

  // Front windshield & side windows
  g.rect(38, 10 + bob, 8, 7, cGlass);
  g.rect(26, 10 + bob, 9, 6, cGlass);
  g.rect(12, 10 + bob, 11, 6, cGlass);

  // Stenciled "БУХАНКА Z" on side
  g.rect(14, 21 + bob, 20, 2, "#f8fafc");
  g.set(24, 21 + bob, "#18181b");
  g.rect(36, 20 + bob, 4, 1, "#ffffff");
  g.set(38, 21 + bob, "#ffffff");
  g.rect(36, 22 + bob, 4, 1, "#ffffff");

  // Raw Birch Logs strapped to doors & front bumper
  g.rect(48, 18 + bob, 3, 9, cBirch);
  g.set(49, 20 + bob, cBark);
  g.set(48, 24 + bob, cBark);

  g.rect(6, 23 + bob, 36, 3, cBirch);
  g.set(12, 24 + bob, cBark);
  g.set(22, 24 + bob, cBark);
  g.set(32, 24 + bob, cBark);

  g.rect(48, 14 + bob, 2, 3, "#fef08a");

  // Wheels
  const wY = 27;
  g.rect(8, wY, 11, 11, cTire);
  g.rect(10, wY + 2, 7, 7, cRim);
  g.rect(12, wY + 4, 3, 3, cTire);

  g.rect(35, wY, 11, 11, cTire);
  g.rect(37, wY + 2, 7, 7, cRim);
  g.rect(39, wY + 4, 3, 3, cTire);

  g.addOutline("#10140e");
  return g;
}

export function buildPixelBukhankaFrame(frame: 0 | 1): HTMLCanvasElement {
  return getPixelBukhankaGrid(frame).toCanvas();
}

/**
 * 12. MT-LB Tracked Carrier (`mtlb`)
 * Dimensions: 54x46 (scaled 2x -> 108x92)
 */
export function getPixelMtlbGrid(frame: 0 | 1): PixelCanvas {
  const g = new PixelCanvas(54, 46, 2);
  const bob = frame === 1 ? 1 : 0;

  const cHull = "#3f4f2e";
  const cHullDark = "#27331c";
  const cTurret = "#475569";
  const cGun = "#18181b";
  const cLog = "#78350f";
  const cTrack = "#1e293b";
  const cWheel = "#64748b";

  // Naval 2M-3 Gun Turret on roof
  g.rect(20, 4 + bob, 14, 9, cTurret);
  g.rect(22, 2 + bob, 10, 2, "#64748b");
  g.rect(34, 7 + bob, 16, 2, cGun);
  g.rect(34, 10 + bob, 16, 2, cGun);

  // Flat armored hull
  g.rect(4, 13 + bob, 46, 15, cHull);
  g.rect(4, 21 + bob, 46, 7, cHullDark);
  g.rect(44, 15 + bob, 7, 10, cHull);

  // Unditching Pine Log on side
  g.rect(8, 20 + bob, 34, 3, cLog);
  g.rect(8, 21 + bob, 34, 1, "#451a03");

  // Track Assembly & Roadwheels
  const tY = 28;
  g.rect(2, tY, 50, 14, cTrack);
  g.rect(4, tY + 2, 46, 10, "#0f172a");

  for (let wx = 5; wx <= 42; wx += 7.5) {
    const rx = Math.floor(wx);
    g.rect(rx, tY + 3, 6, 7, cWheel);
    g.rect(rx + 2, tY + 5, 2, 3, cTrack);
  }

  g.addOutline("#10140e");
  return g;
}

export function buildPixelMtlbFrame(frame: 0 | 1): HTMLCanvasElement {
  return getPixelMtlbGrid(frame).toCanvas();
}

/**
 * 13. Turtle Tank / Tsar Mangal (`turtle`)
 * Dimensions: 56x44 (scaled 2x -> 112x88)
 */
export function getPixelTurtleGrid(frame: 0 | 1): PixelCanvas {
  const g = new PixelCanvas(56, 44, 2);
  const bob = frame === 1 ? 1 : 0;

  const cSteel = "#64748b";
  const cSteelDark = "#334155";
  const cSteelHighlight = "#94a3b8";
  const cJammer = "#18181b";
  const cLed = frame === 0 ? "#ef4444" : "#eab308";
  const cGun = "#18181b";
  const cTrack = "#1e293b";

  // Roof Jammer Mast
  g.rect(18, 2 + bob, 2, 8, cJammer);
  g.rect(14, 2 + bob, 10, 2, cJammer);
  g.set(15, 1 + bob, cLed);
  g.set(22, 1 + bob, cLed);

  // Main 125mm Gun poking through front slit
  g.rect(42, 22 + bob, 13, 3, cGun);
  g.rect(54, 21 + bob, 2, 5, "#334155");

  // Corrugated Barn Shed Shell
  for (let dy = 0; dy < 10; dy++) {
    const rx = 10 - dy;
    const rw = 36 + dy * 2;
    g.rect(rx, 9 + dy + bob, rw, 1, cSteel);
    for (let cx = rx; cx < rx + rw; cx += 4) {
      g.set(cx, 9 + dy + bob, cSteelDark);
      g.set(cx + 1, 9 + dy + bob, cSteelHighlight);
    }
  }

  g.rect(2, 19 + bob, 52, 14, cSteel);
  for (let x = 2; x < 54; x += 4) {
    g.rect(x, 19 + bob, 1, 14, cSteelDark);
    g.rect(x + 1, 19 + bob, 1, 14, cSteelHighlight);
  }

  // Hanging Anti-Drone Chains
  for (let x = 4; x <= 50; x += 3) {
    g.rect(x, 33 + bob, 1, 3, "#cbd5e1");
  }

  g.rect(4, 35, 48, 5, cTrack);

  g.addOutline("#10140e");
  return g;
}

export function buildPixelTurtleFrame(frame: 0 | 1): HTMLCanvasElement {
  return getPixelTurtleGrid(frame).toCanvas();
}

/**
 * 14. Riot Shielder (`riot`)
 * Dimensions: 28x37 (scaled 2x -> 56x74)
 */
export function getPixelRiotGrid(frame: 0 | 1): PixelCanvas {
  const g = new PixelCanvas(28, 37, 2);
  const bob = frame === 1 ? 1 : 0;

  const cArmor = "#1e293b";
  const cShield = "#334155";
  const cVisor = "#38bdf8";
  const cBaton = "#0f172a";
  const cSpark = "#00e5ff";

  g.rect(12, 2 + bob, 10, 8, cArmor);
  g.rect(13, 1 + bob, 8, 2, "#475569");
  g.rect(16, 5 + bob, 6, 3, cVisor);

  g.rect(10, 10 + bob, 11, 14, cArmor);
  g.rect(8, 12 + bob, 4, 10, "#0f172a");

  g.rect(14, 11 + bob, 9, 21, cShield);
  g.rect(15, 12 + bob, 7, 19, "#475569");
  g.rect(16, 17 + bob, 5, 2, "#ffffff");
  g.rect(16, 21 + bob, 5, 2, "#ffffff");

  g.rect(4, 15 + bob, 3, 12, cBaton);
  g.set(5, 14 + bob, cSpark);
  g.set(5, 13 + bob, "#ffffff");

  const legY = 24 + bob;
  if (frame === 0) {
    g.rect(9, legY, 5, 9, cArmor);
    g.rect(8, legY + 8, 6, 3, "#0f172a");
    g.rect(16, legY, 5, 9, cArmor);
    g.rect(15, legY + 8, 6, 3, "#0f172a");
  } else {
    g.rect(8, legY, 5, 8, cArmor);
    g.rect(7, legY + 7, 6, 3, "#0f172a");
    g.rect(17, legY, 5, 9, cArmor);
    g.rect(16, legY + 8, 6, 3, "#0f172a");
  }

  g.addOutline("#10140e");
  return g;
}

export function buildPixelRiotFrame(frame: 0 | 1): HTMLCanvasElement {
  return getPixelRiotGrid(frame).toCanvas();
}

/**
 * 15. Directional Shield Arc (`shield`)
 * Dimensions: 32x24 (scaled 2x -> 64x48)
 */
export function buildPixelShieldArc(): HTMLCanvasElement {
  const g = new PixelCanvas(32, 24, 2);
  const cx = 16;
  const cy = 20;

  for (let a = 0; a < Math.PI; a += 0.05) {
    const rx = cx + Math.cos(a) * 13;
    const ry = cy - Math.sin(a) * 15;
    g.set(Math.floor(rx), Math.floor(ry), "#00d4ff");
    g.set(Math.floor(rx), Math.floor(ry) + 1, "#0284c7");
  }
  return g.toCanvas();
}

/**
 * 16. Kamikaze FPV Drone (`kamikaze`)
 * Dimensions: 32x29 (scaled 2x -> 64x58)
 */
export function buildPixelKamikazeFrame(frame: 0 | 1): HTMLCanvasElement {
  const g = new PixelCanvas(32, 29, 2);
  const propCol = frame === 0 ? "#38bdf8" : "#94a3b8";

  g.rect(12, 10, 8, 8, "#18181b");
  g.rect(7, 6, 6, 4, "#27272a");
  g.rect(19, 6, 6, 4, "#27272a");
  g.rect(7, 18, 6, 4, "#27272a");
  g.rect(19, 18, 6, 4, "#27272a");

  g.rect(3, 3, 8, 4, propCol);
  g.rect(21, 3, 8, 4, propCol);
  g.rect(3, 21, 8, 4, propCol);
  g.rect(21, 21, 8, 4, propCol);

  g.rect(13, 8, 6, 14, "#3f6212");
  g.rect(14, 2, 4, 7, "#ea580c");

  g.set(13, 0, "#f59e0b");
  g.set(14, 1, "#f59e0b");
  g.set(18, 0, "#f59e0b");
  g.set(17, 1, "#f59e0b");

  g.set(15, 23, "#ef4444");

  g.addOutline("#10140e");
  return g.toCanvas();
}

/**
 * 17. Tactical Attack K9 Dog (`k9`)
 * Dimensions: 32x31 (scaled 2x -> 64x62)
 */
export function buildPixelK9Frame(frame: 0 | 1): HTMLCanvasElement {
  const g = new PixelCanvas(32, 31, 2);
  const bob = frame === 1 ? 1 : 0;

  const cFurDark = "#18181b";
  const cFurBrown = "#78350f";
  const cFurLight = "#b45309";
  const cVest = "#3f4f2e";

  g.rect(20, 5 + bob, 5, 8, cFurBrown);
  g.rect(19, 2 + bob, 3, 4, cFurDark);
  g.rect(24, 7 + bob, 6, 5, cFurDark);
  g.set(23, 7 + bob, "#fef08a");
  g.set(24, 7 + bob, "#09090b");
  g.set(27, 10 + bob, "#ffffff");
  g.set(28, 10 + bob, "#ef4444");

  g.rect(8, 11 + bob, 15, 10, cFurBrown);
  g.rect(11, 10 + bob, 10, 9, cVest);
  g.set(15, 13 + bob, "#ffffff");
  g.set(16, 14 + bob, "#ffffff");
  g.set(15, 15 + bob, "#ffffff");

  g.rect(3, 9 + bob, 6, 4, cFurDark);

  const legY = 20 + bob;
  if (frame === 0) {
    g.rect(20, legY, 3, 8, cFurLight);
    g.rect(22, legY + 7, 4, 2, cFurDark);
    g.rect(7, legY, 4, 8, cFurDark);
    g.rect(6, legY + 7, 4, 2, cFurDark);
  } else {
    g.rect(17, legY, 3, 7, cFurLight);
    g.rect(18, legY + 6, 4, 2, cFurDark);
    g.rect(11, legY, 4, 7, cFurDark);
    g.rect(10, legY + 6, 4, 2, cFurDark);
  }

  g.addOutline("#10140e");
  return g.toCanvas();
}

/**
 * 18. Inflatable Decoy Boss (`boss`)
 * Dimensions: 60x67 (scaled 2x -> 120x134)
 */
export function getPixelBossGrid(frame: 0 | 1): PixelCanvas {
  const g = new PixelCanvas(60, 67, 2);
  const bob = frame === 1 ? 1 : 0;

  const cRubber = "#4d5d36";
  const cRubberDark = "#27331c";
  const cSheen = "#718f4a";
  const cGenerator = "#facc15";

  g.rect(18, 14 + bob, 24, 16, cRubber);
  g.rect(20, 12 + bob, 20, 3, cSheen);
  g.rect(40, 20 + bob, 16, 5, cRubber);
  g.rect(48, 22 + bob, 10, 6, cRubberDark);

  g.rect(8, 28 + bob, 44, 24, cRubber);
  g.rect(10, 26 + bob, 40, 3, cSheen);
  g.rect(8, 42 + bob, 44, 12, cRubberDark);

  g.rect(26, 34 + bob, 9, 2, "#ffffff");
  g.set(32, 36 + bob, "#ffffff");
  g.set(30, 37 + bob, "#ffffff");
  g.set(28, 38 + bob, "#ffffff");
  g.rect(26, 39 + bob, 9, 2, "#ffffff");

  for (let y = 30 + bob; y <= 50 + bob; y += 5) {
    g.rect(10, y, 40, 1, cRubberDark);
  }

  g.rect(4, 52, 10, 9, cGenerator);
  g.rect(6, 54, 6, 5, "#18181b");
  g.rect(13, 55, 6, 3, "#18181b");

  g.addOutline("#10140e");
  return g;
}

export function buildPixelBossFrame(frame: 0 | 1): HTMLCanvasElement {
  return getPixelBossGrid(frame).toCanvas();
}

/**
 * 19. Zombie Prigožin Clone Boss (`prigozhin`)
 * Dimensions: 70x82 (scaled 2x -> 140x164)
 */
export function getPixelPrigozhinGrid(frame: 0 | 1): PixelCanvas {
  const g = new PixelCanvas(70, 82, 2);
  const bob = frame === 1 ? 1 : 0;

  const cSkin = "#7a9670";
  const cSkinDark = "#556e50";
  const cEye = "#ff0033";
  const cVest = "#27272a";
  const cPants = "#334155";
  const cBoot = "#18181b";
  const cHammerHead = "#64748b";
  const cHammerHandle = "#78350f";

  for (let i = 0; i < 44; i++) {
    const hx = 14 + Math.floor(i * 0.9);
    const hy = 8 + i + bob;
    g.rect(hx, hy, 3, 2, cHammerHandle);
  }

  g.rect(46, 6 + bob, 18, 14, cHammerHead);
  g.rect(48, 8 + bob, 14, 10, "#94a3b8");
  g.rect(53, 10 + bob, 4, 4, "#ffffff");
  g.set(54, 14 + bob, "#ffffff");
  g.set(53, 11 + bob, "#09090b");
  g.set(55, 11 + bob, "#09090b");

  g.rect(20, 24 + bob, 32, 26, cVest);
  g.rect(22, 26 + bob, 28, 22, "#18181b");

  g.rect(26, 32 + bob, 20, 3, "#ef4444");
  g.rect(26, 38 + bob, 20, 3, "#ef4444");

  g.rect(30, 8 + bob, 14, 14, cSkin);
  g.rect(32, 6 + bob, 10, 3, cSkin);
  g.rect(31, 7 + bob, 8, 2, "#9bb591");
  g.rect(33, 13 + bob, 3, 2, cEye);
  g.rect(38, 13 + bob, 3, 2, cEye);
  g.rect(33, 17 + bob, 8, 4, "#2b0000");
  g.set(34, 17 + bob, "#ffffff");
  g.set(39, 17 + bob, "#ffffff");

  g.rect(13, 26 + bob, 8, 16, cSkin);
  g.rect(14, 41 + bob, 6, 7, cSkinDark);
  g.rect(51, 26 + bob, 8, 16, cSkin);
  g.rect(52, 41 + bob, 6, 7, cSkinDark);

  const legY = 50 + bob;
  if (frame === 0) {
    g.rect(22, legY, 11, 20, cPants);
    g.rect(23, legY + 8, 9, 6, "#18181b");
    g.set(27, legY + 10, "#cbd5e1");
    g.rect(20, legY + 18, 14, 8, cBoot);

    g.rect(38, legY, 11, 20, cPants);
    g.rect(39, legY + 8, 9, 6, "#18181b");
    g.set(43, legY + 10, "#cbd5e1");
    g.rect(37, legY + 18, 14, 8, cBoot);
  } else {
    g.rect(20, legY, 11, 18, cPants);
    g.rect(21, legY + 7, 9, 6, "#18181b");
    g.set(25, legY + 9, "#cbd5e1");
    g.rect(18, legY + 16, 14, 8, cBoot);

    g.rect(40, legY, 11, 20, cPants);
    g.rect(41, legY + 8, 9, 6, "#18181b");
    g.set(45, legY + 10, "#cbd5e1");
    g.rect(39, legY + 18, 14, 8, cBoot);
  }

  g.addOutline("#10140e");
  return g;
}

export function buildPixelPrigozhinFrame(frame: 0 | 1): HTMLCanvasElement {
  return getPixelPrigozhinGrid(frame).toCanvas();
}

/**
 * 20. Pixel Battle-Damaged Compositor (< 50% HP -> `<key>_dmg_0` & `<key>_dmg_1`)
 */
export function buildPixelDamagedVariant(
  baseKey: string,
  frame: 0 | 1,
): HTMLCanvasElement {
  let g: PixelCanvas;
  if (baseKey === "cart") g = getPixelCartGrid(frame);
  else if (baseKey === "bukhanka") g = getPixelBukhankaGrid(frame);
  else if (baseKey === "mtlb") g = getPixelMtlbGrid(frame);
  else if (baseKey === "turtle") g = getPixelTurtleGrid(frame);
  else if (baseKey === "riot") g = getPixelRiotGrid(frame);
  else if (baseKey === "boss") g = getPixelBossGrid(frame);
  else if (baseKey === "prigozhin") g = getPixelPrigozhinGrid(frame);
  else g = new PixelCanvas(32, 32, 2);

  const W = g.width;
  const H = g.height;
  const cx = Math.floor(W * 0.5);
  const cy = Math.floor(H * 0.55);

  // Blackened shrapnel craters
  g.rect(cx - 6, cy - 2, 7, 5, "#18181b");
  g.rect(cx + 4, cy + 1, 6, 4, "#18181b");
  g.set(cx - 3, cy, frame === 0 ? "#ea580c" : "#facc15");
  g.set(cx + 6, cy + 2, frame === 0 ? "#f97316" : "#ef4444");

  if (baseKey === "cart" || baseKey === "turtle" || baseKey === "bukhanka" || baseKey === "mtlb") {
    const fx = Math.floor(W * 0.45);
    const fy = Math.floor(H * 0.25);
    const flameH = frame === 0 ? 7 : 9;

    for (let dy = 0; dy < flameH; dy++) {
      const fw = Math.max(1, Math.floor((1 - dy / flameH) * 5));
      g.rect(fx - fw, fy - dy, fw * 2 + 1, 1, dy > flameH * 0.6 ? "#ef4444" : "#f97316");
    }
    g.rect(fx - 1, fy - 3, 3, 3, "#fef08a");
  } else if (baseKey === "boss") {
    g.rect(cx - 8, cy - 6, 6, 2, "#0284c7");
    g.rect(cx - 6, cy - 8, 2, 6, "#0284c7");
    g.set(cx - 10 - frame, cy - 10 - frame, "#e0f2fe");
    g.set(cx - 12 - frame, cy - 12 - frame, "#ffffff");
  } else {
    g.set(cx + 3, cy - 10 - frame, "#ef4444");
    g.set(cx - 5, cy - 8 - frame, "#f97316");
  }

  return g.toCanvas();
}
