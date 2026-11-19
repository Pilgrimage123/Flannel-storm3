import type * as Phaser from "phaser";

const INK = "#10140d";

// 4x5 crisp pixel bitmap font for in-world stencils (upright on both Left & Right baked sprites!)
const BITMAP_GLYPHS: Record<string, string[]> = {
  Z: ["1111", "0010", "0100", "1000", "1111"],
  L: ["100", "100", "100", "100", "111"],
  I: ["111", "010", "010", "010", "111"],
  V: ["101", "101", "101", "101", "010"],
  E: ["111", "100", "110", "100", "111"],
  S: ["111", "100", "111", "001", "111"],
  A: ["010", "101", "111", "101", "101"],
  T: ["111", "010", "010", "010", "010"],
  K: ["101", "101", "110", "101", "101"],
  O: ["111", "101", "101", "101", "111"],
  C: ["111", "100", "100", "100", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "0": ["111", "101", "101", "101", "111"],
  "-": ["000", "000", "111", "000", "000"],
  "!": ["1", "1", "1", "0", "1"],
  " ": ["00", "00", "00", "00", "00"],
  // Cyrillic stencils
  О: ["111", "101", "101", "101", "111"],
  М: ["10001", "11011", "10101", "10001", "10001"],
  Н: ["101", "101", "111", "101", "101"],
  В: ["110", "101", "110", "101", "110"],
  Ф: ["01010", "11111", "10101", "11111", "00100"],
  Б: ["111", "100", "111", "101", "111"],
  У: ["101", "101", "011", "001", "110"],
  Х: ["101", "101", "010", "101", "101"],
  А: ["010", "101", "111", "101", "101"],
  К: ["101", "101", "110", "101", "101"],
  С: ["111", "100", "100", "100", "111"],
};

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function getSourceImage(
  textures: Phaser.Textures.TextureManager,
  key: string,
): HTMLImageElement | HTMLCanvasElement | null {
  if (!textures.exists(key)) return null;
  const src = textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement | undefined;
  if (!src || !("width" in src) || src.width === 0) return null;
  return src;
}

function registerCanvas(textures: Phaser.Textures.TextureManager, key: string, canvas: HTMLCanvasElement) {
  if (textures.exists(key)) {
    textures.remove(key);
  }
  textures.addCanvas(key, canvas);
}

/**
 * Pixel-art integer-grid drawing helper operating on logical pixel coordinates
 * (each logical pixel = `pxSize x pxSize` physical pixels, default 2px) so
 * every new vehicle, uniform addition, prop, and damage effect matches the
 * chunky 32-bit pixel-art grid of the base cast with zero anti-aliasing blur.
 */
class PixelPen {
  ctx: CanvasRenderingContext2D;
  s: number;
  constructor(ctx: CanvasRenderingContext2D, pxSize = 2) {
    this.ctx = ctx;
    this.s = pxSize;
    this.ctx.imageSmoothingEnabled = false;
  }

  px(x: number, y: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x) * this.s, Math.round(y) * this.s, this.s, this.s);
  }

  rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x) * this.s, Math.round(y) * this.s, Math.round(w) * this.s, Math.round(h) * this.s);
  }

  box(x: number, y: number, w: number, h: number, fill: string, outline: string | null = INK) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    if (outline) {
      this.rect(rx, ry, rw, rh, outline);
      if (rw > 2 && rh > 2) {
        this.rect(rx + 1, ry + 1, rw - 2, rh - 2, fill);
      }
    } else {
      this.rect(rx, ry, rw, rh, fill);
    }
  }

  ditherBox(x: number, y: number, w: number, h: number, c1: string, c2: string) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    for (let yy = 0; yy < rh; yy++) {
      for (let xx = 0; xx < rw; xx++) {
        this.px(rx + xx, ry + yy, ((xx + yy) & 1) === 0 ? c1 : c2);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, thickness = 1) {
    let ix0 = Math.round(x0);
    let iy0 = Math.round(y0);
    const ix1 = Math.round(x1);
    const iy1 = Math.round(y1);
    const dx = Math.abs(ix1 - ix0);
    const dy = Math.abs(iy1 - iy0);
    const sx = ix0 < ix1 ? 1 : -1;
    const sy = iy0 < iy1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (thickness <= 1) {
        this.px(ix0, iy0, color);
      } else {
        this.rect(ix0, iy0, thickness, thickness, color);
      }
      if (ix0 === ix1 && iy0 === iy1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        ix0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        iy0 += sy;
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, outline: string | null = INK) {
    const icx = Math.round(cx);
    const icy = Math.round(cy);
    const irx = Math.max(1, Math.round(rx));
    const iry = Math.max(1, Math.round(ry));
    if (outline) {
      for (let dy = -iry - 1; dy <= iry + 1; dy++) {
        for (let dx = -irx - 1; dx <= irx + 1; dx++) {
          const n = (dx * dx) / ((irx + 0.8) * (irx + 0.8)) + (dy * dy) / ((iry + 0.8) * (iry + 0.8));
          if (n <= 1) this.px(icx + dx, icy + dy, outline);
        }
      }
    }
    for (let dy = -iry; dy <= iry; dy++) {
      for (let dx = -irx; dx <= irx; dx++) {
        const n = (dx * dx) / (irx * irx) + (dy * dy) / (iry * iry);
        if (n <= 1) this.px(icx + dx, icy + dy, fill);
      }
    }
  }

  stGeorge(x: number, y: number, w: number, h = 5) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.max(3, Math.round(h));
    this.rect(rx - 1, ry - 1, rw + 2, rh + 2, INK);
    for (let row = 0; row < rh; row++) {
      this.rect(rx, ry + row, rw, 1, (row & 1) === 0 ? "#ff7300" : "#18181b");
    }
  }

  telnyashka(x: number, y: number, w: number, h: number) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rw = Math.round(w);
    const rh = Math.round(h);
    this.rect(rx - 1, ry - 1, rw + 2, rh + 2, INK);
    for (let row = 0; row < rh; row++) {
      this.rect(rx, ry + row, rw, 1, (row & 1) === 0 ? "#f8fafc" : "#1d4ed8");
    }
  }

  /** Crisp bitmap pixel text centered horizontally at (cx, y) with 1px dark outline */
  textCentered(text: string, cx: number, y: number, color = "#ffffff", outline: string | null = INK) {
    const chars = [...text.toUpperCase()];
    let totalW = 0;
    for (const ch of chars) {
      const g = BITMAP_GLYPHS[ch];
      if (!g) continue;
      totalW += g[0]!.length + 1;
    }
    if (totalW > 0) totalW -= 1;
    let curX = Math.round(cx - totalW / 2);
    const topY = Math.round(y);

    if (outline) {
      for (const ch of chars) {
        const g = BITMAP_GLYPHS[ch];
        if (!g) continue;
        for (let row = 0; row < g.length; row++) {
          const line = g[row]!;
          for (let col = 0; col < line.length; col++) {
            if (line[col] === "1") {
              this.px(curX + col - 1, topY + row, outline);
              this.px(curX + col + 1, topY + row, outline);
              this.px(curX + col, topY + row - 1, outline);
              this.px(curX + col, topY + row + 1, outline);
            }
          }
        }
        curX += g[0]!.length + 1;
      }
      curX = Math.round(cx - totalW / 2);
    }

    for (const ch of chars) {
      const g = BITMAP_GLYPHS[ch];
      if (!g) continue;
      for (let row = 0; row < g.length; row++) {
        const line = g[row]!;
        for (let col = 0; col < line.length; col++) {
          if (line[col] === "1") {
            this.px(curX + col, topY + row, color);
          }
        }
      }
      curX += g[0]!.length + 1;
    }
  }

  /** Bold chunky pixel-art "Z" centered at (cx, cy) */
  sloppyZ(cx: number, cy: number, size: "sm" | "md" | "lg" = "md", color = "#ffffff", outline = INK) {
    const map =
      size === "sm"
        ? ["1111", "0010", "0100", "1111"]
        : size === "md"
          ? ["11111", "00010", "00100", "01000", "11111"]
          : ["1111111", "1111111", "0000110", "0001100", "0011000", "1111111", "1111111"];
    const h = map.length;
    const w = map[0]!.length;
    const ox = Math.round(cx - w / 2);
    const oy = Math.round(cy - h / 2);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (map[r]![c] === "1") {
          this.px(ox + c - 1, oy + r, outline);
          this.px(ox + c + 1, oy + r, outline);
          this.px(ox + c, oy + r - 1, outline);
          this.px(ox + c, oy + r + 1, outline);
        }
      }
    }
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (map[r]![c] === "1") {
          this.px(ox + c, oy + r, color);
        }
      }
    }
  }
}

/**
 * Unifies photorealistic/smooth PNG cutouts (riot, k9, kamikaze) into crisp 2px
 * pixel art with subtle palette quantization and a dark 1px pixel ink outline.
 */
function pixelizeSourceImage(
  src: HTMLImageElement | HTMLCanvasElement | null,
  outW: number,
  outH: number,
  pxSize = 2,
): HTMLCanvasElement | null {
  if (!src) return null;
  const lw = Math.max(8, Math.round(outW / pxSize));
  const lh = Math.max(8, Math.round(outH / pxSize));
  const [lowC, lowCtx] = makeCanvas(lw, lh);
  lowCtx.imageSmoothingEnabled = true;
  lowCtx.drawImage(src, 1, 1, lw - 2, lh - 2);

  const imgData = lowCtx.getImageData(0, 0, lw, lh);
  const d = imgData.data;
  const solid = new Uint8Array(lw * lh);

  // Quantize RGB into a crisp arcade palette and threshold alpha cleanly
  for (let i = 0; i < lw * lh; i++) {
    const idx = i * 4;
    const a = d[idx + 3]!;
    if (a < 110) {
      d[idx + 3] = 0;
    } else {
      solid[i] = 1;
      d[idx] = Math.round(d[idx]! / 20) * 20;
      d[idx + 1] = Math.round(d[idx + 1]! / 20) * 20;
      d[idx + 2] = Math.round(d[idx + 2]! / 20) * 20;
      d[idx + 3] = 255;
    }
  }

  // Add 1px dark pixel-art ink outline around silhouette edges
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const i = y * lw + x;
      if (solid[i] === 1) continue;
      const hasNeighbor =
        (x > 0 && solid[i - 1] === 1) ||
        (x < lw - 1 && solid[i + 1] === 1) ||
        (y > 0 && solid[i - lw] === 1) ||
        (y < lh - 1 && solid[i + lw] === 1);
      if (hasNeighbor) {
        const idx = i * 4;
        d[idx] = 16;
        d[idx + 1] = 20;
        d[idx + 2] = 13;
        d[idx + 3] = 255;
      }
    }
  }

  lowCtx.putImageData(imgData, 0, 0);
  const [hiC, hiCtx] = makeCanvas(outW, outH);
  hiCtx.imageSmoothingEnabled = false;
  hiCtx.drawImage(lowC, 0, 0, outW, outH);
  return hiC;
}

/**
 * Draws an image onto ctx, horizontally mirrored around the canvas center when flipX is true.
 */
function drawOrientedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  flipX: boolean,
) {
  if (!img) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (flipX) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.drawImage(img, x, y, w, h);
  }
  ctx.restore();
}

type StencilOp = (pen: PixelPen, cx: number, cy: number) => void;
interface StencilAnchor {
  /** Logical pixel X when facing RIGHT */
  x: number;
  /** Logical pixel Y */
  y: number;
  draw: StencilOp;
}

/**
 * Helper to bake BOTH right-facing ("r") and left-facing ("l") variants from a single
 * right-facing body drawing callback, stamping all text/stencils UPRIGHT after flipping!
 */
function buildDirectionalPair(
  W: number,
  H: number,
  pxSize: number,
  drawRightBody: (ctx: CanvasRenderingContext2D, pen: PixelPen) => StencilAnchor[],
): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const [bodyC, bodyCtx] = makeCanvas(W, H);
  const bodyPen = new PixelPen(bodyCtx, pxSize);
  const stencils = drawRightBody(bodyCtx, bodyPen);
  const logicalW = W / pxSize;

  // Right-facing final canvas
  const [rC, rCtx] = makeCanvas(W, H);
  rCtx.imageSmoothingEnabled = false;
  rCtx.drawImage(bodyC, 0, 0);
  const rPen = new PixelPen(rCtx, pxSize);
  for (const st of stencils) {
    st.draw(rPen, st.x, st.y);
  }

  // Left-facing final canvas (flip body horizontally, then stamp upright stencils at mirrored X)
  const [lC, lCtx] = makeCanvas(W, H);
  lCtx.imageSmoothingEnabled = false;
  lCtx.save();
  lCtx.translate(W, 0);
  lCtx.scale(-1, 1);
  lCtx.drawImage(bodyC, 0, 0);
  lCtx.restore();
  const lPen = new PixelPen(lCtx, pxSize);
  for (const st of stencils) {
    st.draw(lPen, logicalW - st.x, st.y);
  }

  return { r: rC, l: lC };
}

/**
 * 1. Enhanced Organic Steppe Battlefield Terrain (`ground`)
 * Crisp pixelated steppe soil & grass mottling matching the 2px art grid.
 */
function buildGroundTexture(baseImg: HTMLImageElement | HTMLCanvasElement | null): HTMLCanvasElement {
  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  if (baseImg) {
    ctx.drawImage(baseImg, 0, 0, S, S);
    ctx.fillStyle = "rgba(34, 44, 24, 0.16)";
    ctx.fillRect(0, 0, S, S);
  } else {
    ctx.fillStyle = "#5c683c";
    ctx.fillRect(0, 0, S, S);
  }

  const pen = new PixelPen(ctx, 2);
  let seed = 4242;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Organic pixel soil & moss clusters
  for (let i = 0; i < 200; i++) {
    const px = Math.floor(rnd() * 256);
    const py = Math.floor(rnd() * 256);
    const col = rnd() < 0.5 ? "rgba(38, 45, 24, 0.24)" : "rgba(122, 134, 74, 0.18)";
    for (let j = 0; j < 6; j++) {
      const ox = Math.floor((rnd() - 0.5) * 9);
      const oy = Math.floor((rnd() - 0.5) * 6);
      pen.rect((px + ox + 256) % 256, (py + oy + 256) % 256, 2, 1, col);
    }
  }

  // Subtle pixelated tank-tread ruts
  for (let step = 0; step < 256; step += 6) {
    const y1 = (step + 55) % 256;
    pen.rect(step, y1, 4, 1, "rgba(42, 34, 22, 0.22)");
    pen.rect((step + 9) % 256, (y1 - 6 + 256) % 256, 4, 1, "rgba(42, 34, 22, 0.22)");
  }

  // Crisp pixel grass tufts & tiny Ukrainian wildflowers
  for (let i = 0; i < 260; i++) {
    const gx = Math.floor(rnd() * 256);
    const gy = Math.floor(rnd() * 256);
    const gcol = rnd() < 0.45 ? "rgba(134, 152, 82, 0.55)" : "rgba(44, 54, 28, 0.5)";
    pen.px(gx, gy, gcol);
    pen.px(gx - 1, gy - 1, gcol);
    pen.px(gx + 1, gy - 1, gcol);
    if (rnd() < 0.08) {
      pen.px(gx, gy - 2, rnd() < 0.65 ? "rgba(255, 214, 10, 0.78)" : "rgba(76, 201, 240, 0.72)");
    }
  }

  return c;
}

/**
 * 2. Mobik Conscript (`conscript_r_0/1`, `conscript_l_0/1`)
 * Base PNG faces RIGHT (+1). Compact proportional stolen toilet brush,
 * gauze bandage, Telnyashka collar, St. George ribbon, 3-stripe Adidas pants,
 * Blue Isolenta on AK rifle, and upright pixel-art "Z" on helmet & armband.
 */
function buildConscriptPair(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 112;
  const H = 136;
  const bob = frame === 0 ? 0 : -1;

  return buildDirectionalPair(W, H, 2, (ctx, pen) => {
    // Proportional stolen porcelain toilet brush peeking from backpack behind left shoulder
    pen.line(18, 25 + bob, 13, 15 + bob, INK, 2);
    pen.line(18, 25 + bob, 14, 16 + bob, "#cbd5e1", 1);
    pen.ellipse(12, 13 + bob, 3, 2, "#f8fafc", INK);
    pen.px(12, 13 + bob, "#38bdf8");

    // Draw base right-facing pixel-art conscript
    drawOrientedImage(ctx, baseImg, 10, 8 + bob * 2, 92, 120, false);

    // White gauze head bandage peeking under SSh-68 helmet rim
    pen.box(21, 15 + bob, 16, 3, "#f1f5f9", INK);
    // Blue-and-white striped Telnyashka at chest collar
    pen.telnyashka(24, 27 + bob, 6, 5);
    // St. George Ribbon on chest
    pen.stGeorge(18, 29 + bob, 5, 3);
    // White armband base on right sleeve
    pen.box(10, 29 + bob, 6, 5, "#f8fafc", INK);

    // Crisp pixel 3-stripe tracksuit stripes down both legs
    for (let s = 0; s < 3; s++) {
      pen.line(13 + s, 44 + bob, 11 + s, 54 + bob, "#f8fafc", 1);
      pen.line(31 + s, 44 + bob, 32 + s, 53 + bob, "#f8fafc", 1);
    }

    // Blue Isolenta ("Синяя изолента") wrapping rifle stock, handguard, and banana mag
    pen.box(20, 36 + bob, 4, 5, "#0077ff", INK);
    pen.box(34, 30 + bob, 4, 5, "#0077ff", INK);
    pen.box(26, 38 + bob, 5, 3, "#0077ff", INK);

    return [
      { x: 28, y: 10 + bob, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "sm", "#ffffff", INK) },
      { x: 13, y: 31 + bob, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "sm", "#111111", "#f8fafc") },
    ];
  });
}

/**
 * 3. Kadyrovite "Akhmat" TikTok Battalion Streamer (`tiktok_r_0/1`, `tiktok_l_0/1`)
 * Base PNG faces LEFT (-1), so we normalize it to RIGHT (+1) first!
 * Pixel-art neon LED Ring-Light around phone, upright LIVE badge, bushy chin beard,
 * clout sunglasses, gold AK-74, St. George helmet band, and red-bottom Prada soles.
 */
function buildTikTokPair(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 120;
  const H = 140;
  const bob = frame === 0 ? 0 : -1;

  return buildDirectionalPair(W, H, 2, (ctx, pen) => {
    // Gold-plated AK-74 slung behind back / hip firing sideways
    pen.line(6, 34 + bob, 20, 31 + bob, INK, 3);
    pen.line(7, 34 + bob, 19, 31 + bob, "#ffd60a", 1);
    pen.box(10, 35 + bob, 3, 5, "#eab308", INK);
    if (frame === 1) {
      pen.ellipse(5, 34 + bob, 2, 2, "#fffbeb", "#ff5400");
    }

    // Flip base PNG horizontally so streamer faces RIGHT (phone held out to the right!)
    drawOrientedImage(ctx, baseImg, 12, 6 + bob * 2, 94, 130, true);

    // Bushy Kadyrovite chin beard (pixelated)
    pen.box(27, 22 + bob, 12, 7, "#26160c", INK);
    pen.rect(29, 21 + bob, 8, 2, "#f2b27a"); // shaved upper lip / mouth cutout

    // Dark clout sunglasses with gold bridge
    pen.box(28, 16 + bob, 6, 4, "#0f172a", "#ffd60a");
    pen.box(35, 16 + bob, 6, 4, "#0f172a", "#ffd60a");
    pen.px(34, 17 + bob, "#ffd60a");

    // St. George band on helmet
    pen.stGeorge(24, 10 + bob, 14, 3);

    // Pixelated Neon LED Ring-Light around the smartphone on right side (x=47, y=24)
    const ringCol = frame === 0 ? "#ff0055" : "#00f5d4";
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const rx = Math.round(47 + Math.cos(ang) * 7);
      const ry = Math.round(24 + bob + Math.sin(ang) * 7);
      pen.px(rx, ry, ringCol);
      if ((a & 1) === 0) pen.px(rx, ry, "#ffffff");
    }
    // Red "LIVE" pill box above ring-light
    pen.box(41, 11 + bob, 15, 7, "#dc2626", INK);

    // Crimson "Prada" combat boot soles
    pen.rect(12, 64 + bob, 10, 2, "#ff0a36");
    pen.rect(36, 65 + bob, 11, 2, "#ff0a36");

    return [{ x: 48, y: 12 + bob, draw: (p, cx, cy) => p.textCentered("LIVE", cx, cy, "#ffffff", null) }];
  });
}

/**
 * 4. Storm-Z Electric Assault Scooter (`scooter_r_0/1`, `scooter_l_0/1`)
 * 100% crisp 2px pixel art: Mobik rider standing cleanly on a dark electric kick-scooter
 * with glowing cyan deck LEDs, supermarket wire basket, and Blue-Isolenta-taped RPG-7!
 */
function buildScooterPair(
  baseConscript: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 124;
  const H = 144;
  const bounce = frame === 0 ? 0 : -1;

  return buildDirectionalPair(W, H, 2, (ctx, pen) => {
    // Rear & Front pixel scooter wheels
    pen.ellipse(15, 62 + bounce, 5, 4, "#1e293b", INK);
    pen.ellipse(15, 62 + bounce, 2, 2, "#94a3b8", null);
    pen.ellipse(47, 62 + bounce, 5, 4, "#1e293b", INK);
    pen.ellipse(47, 62 + bounce, 2, 2, "#94a3b8", null);
    if (frame === 1) {
      pen.px(15, 60 + bounce, "#cbd5e1");
      pen.px(47, 64 + bounce, "#cbd5e1");
    }

    // Scooter footboard deck with glowing cyan LED strip
    pen.box(14, 57 + bounce, 34, 6, "#334155", INK);
    pen.rect(16, 61 + bounce, 30, 1, frame === 0 ? "#00f5d4" : "#38bdf8");

    // Draw right-facing Mobik rider standing cleanly on deck
    drawOrientedImage(ctx, baseConscript, 14, 6 + bounce * 2, 78, 108, false);

    // Mobik Telnyashka + 3-stripe Adidas track pants
    pen.telnyashka(25, 25 + bounce, 6, 4);
    pen.stGeorge(18, 26 + bounce, 5, 3);
    for (let s = 0; s < 3; s++) {
      pen.line(15 + s, 40 + bounce, 14 + s, 50 + bounce, "#f8fafc", 1);
    }

    // Steering column stem & handlebars (right side)
    pen.line(46, 58 + bounce, 42, 26 + bounce, INK, 3);
    pen.line(46, 58 + bounce, 42, 26 + bounce, "#64748b", 1);
    pen.box(38, 24 + bounce, 9, 4, "#0f172a", INK);
    pen.rect(41, 24 + bounce, 3, 2, "#ff0055"); // LED speedo

    // Stolen supermarket wire basket on stem front
    pen.box(45, 34 + bounce, 11, 9, "#ec4899", INK);
    pen.ditherBox(46, 35 + bounce, 9, 7, "#ec4899", "#be185d");
    pen.ellipse(50, 33 + bounce, 3, 2, "#f8fafc", INK); // stolen kettle

    // Compact RPG-7 launcher taped to handlebars with Blue Isolenta
    pen.box(34, 28 + bounce, 16, 4, "#5c4033", INK);
    // Green conical RPG-7 warhead
    pen.box(50, 27 + bounce, 6, 6, "#4d6b3c", INK);
    pen.box(55, 28 + bounce, 4, 4, "#658a4f", INK);
    pen.px(59, 29 + bounce, "#94a3b8");
    // Blue Isolenta straps
    pen.box(40, 27 + bounce, 3, 6, "#0077ff", INK);
    pen.box(46, 27 + bounce, 3, 6, "#0077ff", INK);

    return [
      { x: 28, y: 10 + bounce, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "sm", "#ffffff", INK) },
      { x: 50, y: 38 + bounce, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "sm", "#ffffff", INK) },
    ];
  });
}

/**
 * 5. Chinese Desertcross-1000-3 Assault Golf Cart (`cart_r_0/1`, `cart_l_0/1`)
 * Base PNG faces LEFT (-1), so we flip it horizontally to build the RIGHT-facing body!
 * Crisp pixel-art rebar Cope Cage ("Мангал"), stolen porcelain toilet lashed to rear bed,
 * St. George stripe, and upright pixel-art "Z" stencils on hood & helmets.
 */
function buildGolfCartPair(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 156;
  const H = 144;
  const bounce = frame === 0 ? 0 : -1;

  return buildDirectionalPair(W, H, 2, (ctx, pen) => {
    // Stolen White Porcelain Toilet Bowl strapped to REAR cargo rack (left side when facing right)
    pen.box(10, 20 + bounce, 8, 9, "#e2e8f0", INK); // cistern
    pen.ellipse(16, 28 + bounce, 6, 4, "#ffffff", INK); // bowl
    pen.ellipse(16, 27 + bounce, 3, 2, "#38bdf8", null); // blue seat/water
    pen.line(10, 24 + bounce, 21, 30 + bounce, "#e63946", 1); // red lashing rope

    // Draw base cart flipped to face RIGHT!
    drawOrientedImage(ctx, baseImg, 10, 14 + bounce * 2, 136, 124, true);

    // Pixel-art welded rebar Cope Cage ("Мангал") above canopy
    pen.line(16, 15 + bounce, 16, 7 + bounce, "#334155", 1);
    pen.line(38, 9 + bounce, 38, 3 + bounce, "#334155", 1);
    pen.line(58, 15 + bounce, 58, 8 + bounce, "#334155", 1);
    pen.line(36, 20 + bounce, 36, 13 + bounce, "#334155", 1);
    // Cage top diamond rails
    pen.line(16, 7 + bounce, 38, 3 + bounce, "#475569", 1);
    pen.line(38, 3 + bounce, 58, 8 + bounce, "#475569", 1);
    pen.line(58, 8 + bounce, 36, 13 + bounce, "#475569", 1);
    pen.line(36, 13 + bounce, 16, 7 + bounce, "#475569", 1);
    // Cross-mesh wires
    pen.line(23, 6 + bounce, 43, 11 + bounce, "#94a3b8", 1);
    pen.line(30, 4 + bounce, 50, 9 + bounce, "#94a3b8", 1);
    // Pixel camo rag draped over cope cage
    pen.box(30, 6 + bounce, 14, 4, "#4a5d32", INK);
    pen.ditherBox(31, 7 + bounce, 12, 2, "#4a5d32", "#6b7d42");

    // St. George stripe on side body
    pen.stGeorge(22, 48 + bounce, 14, 3);

    // Mud specks flung from tires on frame 1
    if (frame === 1) {
      pen.rect(11, 58, 2, 2, "#5c4732");
      pen.rect(40, 66, 2, 2, "#5c4732");
      pen.rect(60, 62, 2, 2, "#5c4732");
    }

    return [
      { x: 59, y: 44 + bounce, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "md", "#ffffff", INK) },
      { x: 47, y: 22 + bounce, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "sm", "#ffffff", INK) },
      { x: 29, y: 23 + bounce, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "sm", "#ffffff", INK) },
    ];
  });
}

/**
 * 6. UAZ-452 "Bukhanka" ("Tactical Loaf") Van (`bukhanka_r_0/1`, `bukhanka_l_0/1`)
 * Fully re-rendered in chunky 2px 32-bit pixel art with stepped military olive shading,
 * organic birch-log side armor (no barcode look!), pine bumper logs, rolled Persian carpet
 * on the roof cope cage, and upright pixel-art "БУХАНКА" + "Z" stencils.
 */
function buildBukhankaPair(frame: 0 | 1): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 160;
  const H = 144;
  const bounce = frame === 0 ? 0 : -1;

  return buildDirectionalPair(W, H, 2, (_ctx, pen) => {
    const wy = frame === 0 ? 58 : 59;

    // Chunky pixel off-road mud tires
    pen.ellipse(22, wy, 8, 7, "#1e2229", INK);
    pen.ellipse(22, wy, 4, 3, "#64748b", INK);
    pen.ellipse(59, wy, 8, 7, "#1e2229", INK);
    pen.ellipse(59, wy, 4, 3, "#64748b", INK);
    if (frame === 1) {
      pen.px(22, wy - 4, "#94a3b8");
      pen.px(59, wy + 4, "#94a3b8");
    }

    // Loaf van body (3/4 shaded olive hull)
    pen.box(9, 19 + bounce, 63, 37, "#4b5b36", INK);
    // Rounded roof highlight cap + dithered side shading
    pen.box(11, 17 + bounce, 58, 9, "#6d8150", INK);
    pen.ditherBox(11, 26 + bounce, 59, 6, "#5a6d42", "#4b5b36");
    pen.rect(10, 48 + bounce, 61, 7, "#344024");
    // Rusty bottom trim & door seams
    pen.line(10, 42 + bounce, 70, 42 + bounce, "#6b3214", 1);
    pen.line(48, 22 + bounce, 48, 54 + bounce, INK, 1);

    // Split front windshield & side cab window
    pen.box(54, 24 + bounce, 14, 11, "#334155", INK);
    pen.rect(56, 25 + bounce, 4, 3, "#64748b"); // glass highlight
    pen.box(37, 25 + bounce, 13, 9, "#1e293b", INK);
    // Mobik helmet peeking inside cab window
    pen.ellipse(44, 30 + bounce, 4, 3, "#4a5d32", INK);

    // Iconic round UAZ-452 headlight with black tape X
    pen.ellipse(70, 43 + bounce, 3, 3, "#fef08a", INK);
    pen.px(69, 42 + bounce, INK);
    pen.px(71, 44 + bounce, INK);
    pen.px(71, 42 + bounce, INK);
    pen.px(69, 44 + bounce, INK);

    // Improvised raw birch-log armor lashed to side panel (natural bark texture + cut ends)
    for (let i = 0; i < 3; i++) {
      const ly = 36 + i * 4 + bounce;
      pen.box(13, ly, 34, 4, "#d6d3d1", INK);
      pen.rect(14, ly + 1, 32, 1, "#f5f5f4");
      // Organic black birch bark knots
      pen.rect(18 + i * 3, ly + 1, 2, 1, "#292524");
      pen.rect(30 - i * 2, ly + 2, 3, 1, "#292524");
      pen.rect(40, ly + 1, 2, 1, "#292524");
      // Warm wooden end-cap
      pen.rect(45, ly + 1, 2, 2, "#b45309");
    }
    // Iron chains + two neat Blue Isolenta bindings
    pen.rect(20, 36 + bounce, 2, 12, "#0077ff");
    pen.rect(38, 36 + bounce, 2, 12, "#0077ff");

    // Front pine bumper logs
    pen.box(64, 46 + bounce, 4, 9, "#92400e", INK);
    pen.box(68, 46 + bounce, 4, 9, "#78350f", INK);

    // Pixel rebar Cope Cage on roof + stolen rolled-up crimson/gold Persian carpet
    pen.line(14, 17 + bounce, 14, 9 + bounce, "#334155", 1);
    pen.line(62, 17 + bounce, 62, 9 + bounce, "#334155", 1);
    pen.line(14, 9 + bounce, 62, 9 + bounce, "#475569", 1);
    pen.box(18, 10 + bounce, 38, 6, "#991b1b", INK);
    pen.ditherBox(20, 11 + bounce, 34, 4, "#b91c1c", "#d97706");
    pen.rect(54, 11 + bounce, 2, 4, "#fef08a");

    // St. George ribbon
    pen.stGeorge(14, 27 + bounce, 19, 3);

    return [
      { x: 60, y: 44 + bounce, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "md", "#ffffff", INK) },
      { x: 24, y: 31 + bounce, draw: (p, cx, cy) => p.textCentered("БУХАНКА", cx, cy, "#f8fafc", INK) },
    ];
  });
}

/**
 * 7. MT-LB 2M-3 "Franken-Tank" (`mtlb_r_0/1`, `mtlb_l_0/1`)
 * Fully re-rendered in chunky 2px 32-bit pixel art: tracked MT-LB chassis with
 * dithered olive slopes, road wheels, conveyor-belt skirts, rusty weld collar,
 * towering battleship-grey 1950s 2M-3 twin naval gun turret, and upright "ВМФ" + "Z"!
 */
function buildMtlbPair(frame: 0 | 1): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 164;
  const H = 156;
  const rumble = frame === 0 ? 0 : -1;

  return buildDirectionalPair(W, H, 2, (_ctx, pen) => {
    // Tracked chassis running gear
    pen.box(8, 57 + rumble, 66, 14, "#1e2229", INK);
    pen.rect(10, 58 + rumble, 62, 2, "#3f3f46");
    for (let i = 0; i < 6; i++) {
      const wx = 15 + i * 10 + (frame === 1 ? 1 : 0);
      pen.ellipse(wx, 64 + rumble, 4, 4, "#4b5563", INK);
      pen.px(wx, 64 + rumble, "#9ca3af");
    }

    // Low-profile sloped olive MT-LB hull
    pen.box(9, 43 + rumble, 58, 16, "#4d5e3a", INK);
    pen.ditherBox(10, 44 + rumble, 55, 5, "#63764b", "#4d5e3a");
    // Sloped front glacis plate (right side)
    pen.box(65, 47 + rumble, 11, 12, "#425132", INK);
    pen.line(63, 43 + rumble, 76, 50 + rumble, INK, 1);
    pen.rect(68, 49 + rumble, 4, 3, "#94a3b8"); // driver viewport

    // Black rubber conveyor-belt side skirts
    for (let fx = 11; fx <= 62; fx += 9) {
      pen.box(fx, 55 + rumble, 8, 5, "#27272a", INK);
    }

    // St. George ribbon along hull flank
    pen.stGeorge(38, 48 + rumble, 22, 3);

    // Rusty welded adapter ring on rear engine deck
    pen.box(19, 32 + rumble, 22, 12, "#7c2d12", INK);
    pen.ditherBox(20, 33 + rumble, 20, 10, "#9a3412", "#7c2d12");
    for (let rx = 21; rx <= 37; rx += 4) {
      pen.px(rx, 42 + rumble, "#facc15"); // sloppy weld beads
    }

    // Twin 25mm naval autocannon barrels pointing right
    const bLift = frame === 0 ? 0 : -1;
    pen.box(41, 17 + rumble + bLift, 28, 3, "#334155", INK);
    pen.rect(42, 18 + rumble + bLift, 25, 1, "#94a3b8");
    pen.box(41, 22 + rumble + bLift, 28, 3, "#1e293b", INK);
    pen.rect(42, 23 + rumble + bLift, 25, 1, "#64748b");
    if (frame === 1) {
      pen.ellipse(71, 18 + rumble + bLift, 4, 2, "#ffd60a", "#ff5400");
      pen.ellipse(71, 23 + rumble + bLift, 4, 2, "#ffd60a", "#ff5400");
    }

    // Towering 1950s battleship-grey 2M-3 beehive turret cupola
    pen.box(16, 12 + rumble, 28, 22, "#64748b", INK);
    pen.box(19, 8 + rumble, 22, 6, "#94a3b8", INK);
    pen.ditherBox(17, 13 + rumble, 26, 7, "#94a3b8", "#64748b");
    pen.rect(17, 27 + rumble, 26, 5, "#475569");

    return [
      { x: 25, y: 50 + rumble, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "md", "#ffffff", INK) },
      { x: 30, y: 23 + rumble, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "md", "#ffffff", INK) },
      { x: 30, y: 12 + rumble, draw: (p, cx, cy) => p.textCentered("ВМФ", cx, cy, "#fef08a", INK) },
    ];
  });
}

/**
 * 8. Tsar-Mangal / Blyatmobile Barn-Armored Turtle Tank (`turtle_r_0/1`, `turtle_l_0/1`)
 * Base PNG faces LEFT (-1) and ALREADY has a hand-drawn white "Z" on the wooden barn front!
 * We build BOTH left (original PNG with upright Z) and right (mirrored PNG with wooden plank
 * patch over the mirrored Z + fresh crisp upright pixel-art Z) so the Z is NEVER backwards!
 */
function buildTurtleTankPair(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 156;
  const H = 154;
  const rumble = frame === 0 ? 0 : -1;

  const buildOne = (faceRight: boolean): HTMLCanvasElement => {
    const [c, ctx] = makeCanvas(W, H);
    const pen = new PixelPen(ctx, 2);
    const mapX = (rx: number) => (faceRight ? rx : 78 - rx);

    // Smoking brick stove chimney on barn roof rear
    const chimX = faceRight ? 22 : 50;
    pen.box(chimX, 6 + rumble, 6, 11, "#9a3412", INK);
    pen.ditherBox(chimX + 1, 7 + rumble, 4, 9, "#c2410c", "#9a3412");
    pen.ellipse(chimX + 3 + (faceRight ? -frame * 2 : frame * 2), 4 - frame, frame === 0 ? 3 : 4, 2, "#3f3f46", INK);

    // Tin-can EW jammer antennas on roof ridge
    const antX = mapX(38);
    pen.line(antX, 11 + rumble, antX - 3, 3 + rumble, INK, 1);
    pen.line(antX + 3, 10 + rumble, antX + 6, 3 + rumble, INK, 1);
    pen.box(antX - 4, 1 + rumble, 3, 3, "#facc15", INK);
    pen.box(antX + 5, 1 + rumble, 3, 3, "#facc15", INK);

    // Draw base tank (original faces LEFT; mirror when faceRight is true)
    drawOrientedImage(ctx, baseImg, 10, 14 + rumble * 2, 136, 136, faceRight);

    // If mirrored to face right, patch the mirrored baked-in "Z" on the barn front with matching planks & re-stamp upright Z!
    if (faceRight) {
      pen.box(42, 26 + rumble, 14, 14, "#6b5039", "#3b2a1c");
      for (let px = 44; px <= 54; px += 3) {
        pen.line(px, 27 + rumble, px, 38 + rumble, "#4a3525", 1);
      }
      pen.sloppyZ(49, 33 + rumble, "lg", "#f4f1de", "#3b2a1c");
    }

    // Front anti-drone chicken-wire cope cage over the cannon barrel
    const cageX = faceRight ? 54 : 6;
    pen.rect(cageX, 32 + rumble, 17, 1, "#94a3b8");
    pen.rect(cageX, 46 + rumble, 17, 1, "#94a3b8");
    for (let gx = 0; gx <= 16; gx += 4) {
      pen.line(cageX + gx, 32 + rumble, cageX + gx, 46 + rumble, "#cbd5e1", 1);
    }

    // St. George ribbon along armored side hull
    pen.stGeorge(faceRight ? 18 : 38, 49 + rumble, 20, 3);

    // Stolen blue wooden outhouse door patch on barn side
    const doorX = faceRight ? 20 : 49;
    pen.box(doorX, 29 + rumble, 9, 14, "#2563eb", INK);
    pen.px(doorX + 4, 34 + rumble, "#111111");
    pen.px(doorX + 5, 34 + rumble, "#111111");

    return c;
  };

  return { r: buildOne(true), l: buildOne(false) };
}

/**
 * 9. Storm-Z / OMON Riot Shield Trooper (`riot_r_0/1`, `riot_l_0/1`)
 * Applies pixel-unification pass to `riot.png`, normalizes facing, and stamps
 * a crisp pixel-art stolen yellow/red road warning sign + upright "ОМОН" & "Z".
 */
function buildRiotPair(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 104;
  const H = 160;
  const bob = frame === 0 ? 0 : -1;
  const pixBase = pixelizeSourceImage(baseImg, 84, 152, 2);

  return buildDirectionalPair(W, H, 2, (ctx, pen) => {
    // Flip base (originally facing slightly left) so trooper faces RIGHT
    drawOrientedImage(ctx, pixBase ?? baseImg, 10, 4 + bob * 2, 84, 152, true);

    // St. George ribbon on shoulder
    pen.stGeorge(13, 21 + bob, 7, 3);

    // Pixel-art stolen Yellow/Red Triangular Road Warning Sign bolted to center of ballistic shield
    const sx = 28;
    const sy = 42 + bob;
    for (let row = 0; row < 12; row++) {
      const halfW = Math.floor((row * 8) / 11);
      pen.rect(sx - halfW - 1, sy - 6 + row, halfW * 2 + 3, 1, "#dc2626");
      if (row >= 2 && row <= 9) {
        const innerW = Math.max(0, halfW - 2);
        pen.rect(sx - innerW, sy - 6 + row, innerW * 2 + 1, 1, "#ffd60a");
      }
    }

    return [
      { x: 26, y: 8 + bob, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "sm", "#ffffff", INK) },
      { x: 28, y: 29 + bob, draw: (p, cx, cy) => p.textCentered("ОМОН", cx, cy, "#f8fafc", INK) },
      { x: 28, y: 43 + bob, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "sm", "#111111", "#ffd60a") },
    ];
  });
}

/**
 * Centered Pixel-Art Directional Guard Arc (`shield`)
 * Symmetrically centered at (32, 32) on a 64x64 canvas so rotation around
 * the riot trooper's torso always aligns cleanly with the frontal block angle!
 */
function buildDirectionalShieldArcTexture(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(64, 64);
  const pen = new PixelPen(ctx, 2);
  const cx = 16;
  const cy = 16;
  const r = 12;
  for (let deg = -54; deg <= 54; deg += 4) {
    const rad = (deg * Math.PI) / 180;
    const px = Math.round(cx + Math.cos(rad) * r);
    const py = Math.round(cy + Math.sin(rad) * r);
    pen.px(px, py, "rgba(255, 214, 10, 0.85)");
    const ix = Math.round(cx + Math.cos(rad) * (r - 1));
    const iy = Math.round(cy + Math.sin(rad) * (r - 1));
    pen.px(ix, iy, "rgba(255, 183, 3, 0.4)");
  }
  return c;
}

/**
 * 10. Geran-2 / Lancet Kamikaze Drone (`kamikaze_r_0/1`, `kamikaze_l_0/1`)
 * Applies pixel-unification pass to `kamikaze.png`, adds crisp pixel-art spinning
 * rotor blurs, Blue Isolenta straps on the payload, blinking red LED, and upright "Z".
 */
function buildKamikazePair(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 136;
  const H = 108;
  const pixBase = pixelizeSourceImage(baseImg, 128, 98, 2);

  return buildDirectionalPair(W, H, 2, (ctx, pen) => {
    drawOrientedImage(ctx, pixBase ?? baseImg, 4, 5, 128, 98, false);

    // Pixelated rotor blur ellipses at 4 motor mounts
    const rotors: Array<[number, number]> = [
      [15, 9],
      [54, 10],
      [11, 36],
      [54, 37],
    ];
    for (const [rx, ry] of rotors) {
      const col = frame === 0 ? "rgba(226, 232, 240, 0.65)" : "rgba(56, 189, 248, 0.65)";
      const radX = frame === 0 ? 8 : 6;
      const radY = frame === 0 ? 3 : 2;
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        pen.px(Math.round(rx + Math.cos(ang) * radX), Math.round(ry + Math.sin(ang) * radY), col);
      }
    }

    // Blue Isolenta straps wrapping the explosive payload underneath
    pen.box(24, 34, 3, 10, "#0077ff", INK);
    pen.box(34, 34, 3, 10, "#0077ff", INK);

    // Blinking warhead LED eye
    if (frame === 1) {
      pen.ellipse(31, 30, 2, 2, "#ffea00", "#ff0000");
    }

    return [{ x: 34, y: 20, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "md", "#ffffff", INK) }];
  });
}

/**
 * 11. Conscript K9 Recon Hound (`k9_r_0/1`, `k9_l_0/1`)
 * Pixel-unified German Shepherd with tilted pixel SSh-68 steel pot helmet,
 * St. George vest ribbon, spinning tin-can sniffer radar, and upright "Z".
 */
function buildK9Pair(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 112;
  const H = 136;
  const bob = frame === 0 ? 0 : -1;
  const pixBase = pixelizeSourceImage(baseImg, 96, 126, 2);

  return buildDirectionalPair(W, H, 2, (ctx, pen) => {
    // Tin-can sniffer radar antenna on back
    pen.box(22, 10 + bob, 4, 5, "#94a3b8", INK);
    const waveCol = frame === 0 ? "#38bdf8" : "#ffd60a";
    pen.line(21, 7 + bob, 26, 7 + bob, waveCol, 1);
    if (frame === 1) pen.line(19, 4 + bob, 28, 4 + bob, waveCol, 1);

    // Flip base PNG (originally facing down-left) to face RIGHT
    drawOrientedImage(ctx, pixBase ?? baseImg, 8, 6 + bob * 2, 96, 126, true);

    // St. George ribbon on olive flak vest
    pen.stGeorge(21, 16 + bob, 11, 3);

    // Tilted SSh-68 steel pot helmet on Shepherd's head (right-lower head position)
    pen.ellipse(36, 35 + bob, 7, 4, "#4a5d32", INK);
    pen.rect(31, 33 + bob, 8, 1, "#6b8447");

    return [
      { x: 26, y: 23 + bob, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "sm", "#ffffff", INK) },
      { x: 36, y: 35 + bob, draw: (p, cx, cy) => p.sloppyZ(cx, cy, "sm", "#ffffff", INK) },
    ];
  });
}

/**
 * 12. Inflatable S-400 Triumph Decoy Boss (`boss_l_0/1`, `boss_r_0/1`)
 * Base PNG faces LEFT (-1) and never flips horizontally, with pixel-art yellow brass
 * air-pump valve, flapping SALE! tag, and crisp pixel-art "С-400 Z" stencil.
 */
function buildInflatableBossPair(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 188;
  const H = 196;
  const [c, ctx] = makeCanvas(W, H);
  const pen = new PixelPen(ctx, 2);

  // Draw bouncy rubber boss (frame 1 slightly squashed)
  const padX = frame === 0 ? 10 : 6;
  const padY = frame === 0 ? 8 : 13;
  const dw = frame === 0 ? 162 : 170;
  const dh = frame === 0 ? 180 : 172;
  drawOrientedImage(ctx, baseImg, padX, padY, dw, dh, false);

  // Yellow brass air-pump valve nozzle & flapping "SALE!" price tag on right side
  pen.box(80, 58, 9, 7, "#facc15", INK);
  pen.box(88, 56, 4, 11, "#eab308", INK);
  const tagOff = frame === 0 ? 0 : 2;
  pen.box(79 + tagOff, 67, 15, 7, "#ffffff", INK);
  pen.textCentered("SALE", 86 + tagOff, 68, "#dc2626", null);

  // Bold pixel-art "С-400 Z" stencil on inflatable flank
  pen.textCentered("С-400 Z", 62, 57, "#fef08a", INK);

  return { r: c, l: c };
}

/**
 * 13. Big Zombie Prigožin Clone (`prigozhin_r_0/1`, `prigozhin_l_0/1`)
 */
function buildPrigozhinPair(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): { r: HTMLCanvasElement; l: HTMLCanvasElement } {
  const W = 188;
  const H = 216;
  const bob = frame === 0 ? 0 : -2;

  return buildDirectionalPair(W, H, 2, (ctx, pen) => {
    drawOrientedImage(ctx, baseImg, 4, 3 + bob * 2, 180, 210, false);
    if (frame === 1) {
      pen.ellipse(41, 22 + bob, 2, 2, "#39ff14", "#ff0033");
      pen.ellipse(53, 22 + bob, 2, 2, "#39ff14", "#ff0033");
    }
    return [];
  });
}

/**
 * 14. Dynamic Pixel-Art Battle-Damaged Variant (< 50% HP -> `<key>_dmg_r/l_0/1`)
 * Composites crisp pixel-art scorched shrapnel craters, bent cope-cage rebar,
 * flickering 2-frame pixel flames, and hissing Blue Isolenta patches on S-400!
 */
function buildDamagedVariant(healthyCanvas: HTMLCanvasElement, baseKey: string, frame: 0 | 1): HTMLCanvasElement {
  const W = healthyCanvas.width;
  const H = healthyCanvas.height;
  const [c, ctx] = makeCanvas(W, H);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(healthyCanvas, 0, 0);

  const pen = new PixelPen(ctx, 2);
  const lw = Math.round(W / 2);
  const lh = Math.round(H / 2);
  const cx = Math.round(lw * 0.5);
  const cy = Math.round(lh * 0.54);

  // Pixelated scorched soot craters with glowing orange/yellow cracks
  pen.ellipse(cx - 7, cy + 3, 7, 5, "rgba(18, 20, 24, 0.78)", "#27272a");
  pen.ellipse(cx + 8, cy - 4, 5, 4, "rgba(18, 20, 24, 0.72)", "#27272a");
  const ember = frame === 0 ? "#ff5400" : "#ffd60a";
  pen.line(cx - 10, cy + 2, cx - 4, cy + 4, ember, 1);
  pen.line(cx + 5, cy - 5, cx + 10, cy - 2, ember, 1);

  if (baseKey === "cart" || baseKey === "turtle" || baseKey === "bukhanka" || baseKey === "mtlb") {
    // Bent, buckled rebar cope cage struts
    pen.line(Math.round(lw * 0.28), Math.round(lh * 0.24), Math.round(lw * 0.5), Math.round(lh * 0.1) + frame, "#475569", 1);
    pen.line(Math.round(lw * 0.5), Math.round(lh * 0.1) + frame, Math.round(lw * 0.74), Math.round(lh * 0.28), "#334155", 1);

    // Crisp 2-frame pixelated engine/roof flame tongue
    const fx = Math.round(lw * 0.48);
    const fy = Math.round(lh * 0.36);
    const fh = frame === 0 ? 11 : 14;
    for (let row = 0; row < fh; row++) {
      const t = row / fh;
      const halfW = Math.max(1, Math.round((1 - t * 0.85) * 6));
      const sway = frame === 0 ? Math.round(Math.sin(t * 3) * 1.2) : Math.round(Math.cos(t * 3) * 1.5);
      pen.rect(fx - halfW + sway - 1, fy - row, halfW * 2 + 2, 1, INK);
      pen.rect(fx - halfW + sway, fy - row, halfW * 2, 1, row > fh * 0.6 ? "#ff5400" : "#ff4500");
      if (row < fh * 0.65 && halfW > 2) {
        pen.rect(fx - (halfW - 2) + sway, fy - row, (halfW - 2) * 2, 1, "#ffd60a");
      }
    }
  } else if (baseKey === "boss") {
    // Inflatable S-400 (<50% HP): Blue Isolenta X-patch + hissing pixel air jets
    pen.box(cx - 10, cy - 7, 9, 3, "#0077ff", INK);
    pen.box(cx - 7, cy - 10, 3, 9, "#0077ff", INK);
    pen.line(cx - 6, cy - 6, cx - 14 - frame * 3, cy - 14 - frame * 2, "#e0f2fe", 1);
    pen.line(cx - 4, cy - 8, cx - 9 - frame * 2, cy - 16 - frame * 3, "#bae6fd", 1);
  } else {
    // Riot / Prigozhin pixel flame spark
    pen.ellipse(cx, cy - 6, frame === 0 ? 4 : 5, frame === 0 ? 5 : 7, "#ff5400", INK);
    pen.ellipse(cx, cy - 5, 2, 3, "#ffd60a", null);
  }

  return c;
}

/**
 * 15. General Petr Pavel (`pavel-loud_0/1` & `pavel-stealth_0/1`)
 */
function buildHeroFrame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
  isLoud: boolean,
): HTMLCanvasElement {
  const w = baseImg ? baseImg.width : 90;
  const h = baseImg ? baseImg.height : 138;
  const [c, ctx] = makeCanvas(w + 12, h + 8);
  const pen = new PixelPen(ctx, 2);
  const bob = frame === 0 ? 0 : -2;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(6, 4 + bob);
  if (baseImg) {
    ctx.drawImage(baseImg, 0, 0);
  }
  ctx.restore();

  if (isLoud && frame === 1) {
    pen.ellipse(Math.round((w + 2) / 2), Math.round((h * 0.56 + 4 + bob) / 2), 2, 2, "#ffd60a", "#ff7b00");
  }
  return c;
}

/**
 * 16. Pixel-Art Concrete Anti-Tank Pyramids ("Dragon's Teeth" / `dragon_teeth`)
 * Replaces the smooth vector triangles with shaded, dithered pixel-art concrete
 * pyramids with rebar lifting loops and grass tufts at the base.
 */
function buildDragonTeethProp(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(112, 88);
  const pen = new PixelPen(ctx, 2);

  const drawPyramid = (cx: number, baseY: number, h: number) => {
    // Ground contact shadow
    pen.ellipse(cx + 1, baseY + 1, Math.round(h * 0.85), 3, "rgba(10, 14, 8, 0.42)", null);

    // Rusty steel rebar lifting loop at apex
    pen.rect(cx - 2, baseY - h - 2, 5, 2, "#7c2d12");
    pen.px(cx, baseY - h - 1, "#1e293b");

    // Pyramid body (lit left facet + shaded right facet with concrete pixel speckles)
    for (let row = 0; row <= h; row++) {
      const halfW = Math.round((row / h) * (h * 0.78));
      const y = baseY - h + row;
      // Outer ink border
      pen.px(cx - halfW - 1, y, INK);
      pen.px(cx + halfW + 1, y, INK);
      if (row === h) {
        pen.rect(cx - halfW, y + 1, halfW * 2 + 1, 1, INK);
      }
      // Left sunlit face
      if (halfW > 0) {
        pen.rect(cx - halfW, y, halfW + 1, 1, (row & 1) === 0 ? "#cbd5e1" : "#94a3b8");
        // Right shaded face
        pen.rect(cx + 1, y, halfW, 1, (row & 1) === 0 ? "#64748b" : "#475569");
      } else {
        pen.px(cx, y, "#e2e8f0");
      }
    }
    // Weathered concrete cracks & moss tufts at base
    pen.px(cx - 3, baseY - 4, "#475569");
    pen.px(cx + 4, baseY - 3, "#334155");
    pen.px(cx - 6, baseY, "#4d6b3c");
    pen.px(cx + 7, baseY, "#4d6b3c");
  };

  drawPyramid(18, 35, 16);
  drawPyramid(39, 39, 18);
  return c;
}

export function installUpgradedGraphics(scene: Phaser.Scene) {
  const tex = scene.textures;
  // Scene restarts reuse Phaser's global TextureManager — never re-bake over already-upgraded textures!
  if (tex.exists("bukhanka_r_0")) return;

  const srcGround = getSourceImage(tex, "ground");
  const srcConscript = getSourceImage(tex, "conscript");
  const srcTikTok = getSourceImage(tex, "tiktok");
  const srcCart = getSourceImage(tex, "cart");
  const srcTurtle = getSourceImage(tex, "turtle");
  const srcRiot = getSourceImage(tex, "riot");
  const srcKamikaze = getSourceImage(tex, "kamikaze");
  const srcK9 = getSourceImage(tex, "k9");
  const srcBoss = getSourceImage(tex, "boss");
  const srcPrigozhin = getSourceImage(tex, "prigozhin");
  const srcPavelLoud = getSourceImage(tex, "pavel-loud");
  const srcPavelStealth = getSourceImage(tex, "pavel-stealth");

  registerCanvas(tex, "ground", buildGroundTexture(srcGround));

  const registerDirectional = (
    baseKey: string,
    p0: { r: HTMLCanvasElement; l: HTMLCanvasElement },
    p1: { r: HTMLCanvasElement; l: HTMLCanvasElement },
    withDamage = false,
  ) => {
    registerCanvas(tex, baseKey, p0.r);
    registerCanvas(tex, `${baseKey}_r_0`, p0.r);
    registerCanvas(tex, `${baseKey}_r_1`, p1.r);
    registerCanvas(tex, `${baseKey}_l_0`, p0.l);
    registerCanvas(tex, `${baseKey}_l_1`, p1.l);
    if (withDamage) {
      registerCanvas(tex, `${baseKey}_dmg_r_0`, buildDamagedVariant(p0.r, baseKey, 0));
      registerCanvas(tex, `${baseKey}_dmg_r_1`, buildDamagedVariant(p1.r, baseKey, 1));
      registerCanvas(tex, `${baseKey}_dmg_l_0`, buildDamagedVariant(p0.l, baseKey, 0));
      registerCanvas(tex, `${baseKey}_dmg_l_1`, buildDamagedVariant(p1.l, baseKey, 1));
    }
  };

  registerDirectional("conscript", buildConscriptPair(srcConscript, 0), buildConscriptPair(srcConscript, 1), false);
  registerDirectional("tiktok", buildTikTokPair(srcTikTok, 0), buildTikTokPair(srcTikTok, 1), false);
  registerDirectional("scooter", buildScooterPair(srcConscript, 0), buildScooterPair(srcConscript, 1), false);
  registerDirectional("cart", buildGolfCartPair(srcCart, 0), buildGolfCartPair(srcCart, 1), true);
  registerDirectional("bukhanka", buildBukhankaPair(0), buildBukhankaPair(1), true);
  registerDirectional("mtlb", buildMtlbPair(0), buildMtlbPair(1), true);
  registerDirectional("turtle", buildTurtleTankPair(srcTurtle, 0), buildTurtleTankPair(srcTurtle, 1), true);
  registerDirectional("riot", buildRiotPair(srcRiot, 0), buildRiotPair(srcRiot, 1), true);
  registerDirectional("kamikaze", buildKamikazePair(srcKamikaze, 0), buildKamikazePair(srcKamikaze, 1), false);
  registerDirectional("k9", buildK9Pair(srcK9, 0), buildK9Pair(srcK9, 1), false);
  registerDirectional("boss", buildInflatableBossPair(srcBoss, 0), buildInflatableBossPair(srcBoss, 1), true);
  registerDirectional("prigozhin", buildPrigozhinPair(srcPrigozhin, 0), buildPrigozhinPair(srcPrigozhin, 1), true);

  // Hero 2-frame sprites
  const pLoud0 = buildHeroFrame(srcPavelLoud, 0, true);
  const pLoud1 = buildHeroFrame(srcPavelLoud, 1, true);
  registerCanvas(tex, "pavel-loud", pLoud0);
  registerCanvas(tex, "pavel-loud_0", pLoud0);
  registerCanvas(tex, "pavel-loud_1", pLoud1);

  const pStealth0 = buildHeroFrame(srcPavelStealth, 0, false);
  const pStealth1 = buildHeroFrame(srcPavelStealth, 1, false);
  registerCanvas(tex, "pavel-stealth", pStealth0);
  registerCanvas(tex, "pavel-stealth_0", pStealth0);
  registerCanvas(tex, "pavel-stealth_1", pStealth1);

  registerCanvas(tex, "shield", buildDirectionalShieldArcTexture());
  registerCanvas(tex, "dragon_teeth", buildDragonTeethProp());
}
