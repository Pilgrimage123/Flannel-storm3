import type * as Phaser from "phaser";
import type { FireballVariant } from "./explosionProfiles";

const INK = "#121016";

function paintTex(
  textures: Phaser.Textures.TextureManager,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  if (textures.exists(key)) return;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  textures.addCanvas(key, c);
}

/** Integer-grid 2px pixel pen for crisp 16-bit explosion sprites */
class FxPen {
  ctx: CanvasRenderingContext2D;
  s: number;
  constructor(ctx: CanvasRenderingContext2D, s = 2) {
    this.ctx = ctx;
    this.s = s;
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

  disc(cx: number, cy: number, r: number, color: string, outline?: string) {
    const icx = Math.round(cx);
    const icy = Math.round(cy);
    const ir = Math.max(1, Math.round(r));
    if (outline) {
      const or = ir + 1;
      for (let dy = -or; dy <= or; dy++) {
        for (let dx = -or; dx <= or; dx++) {
          if (dx * dx + dy * dy <= or * or + 1) {
            this.px(icx + dx, icy + dy, outline);
          }
        }
      }
    }
    for (let dy = -ir; dy <= ir; dy++) {
      for (let dx = -ir; dx <= ir; dx++) {
        if (dx * dx + dy * dy <= ir * ir) {
          this.px(icx + dx, icy + dy, color);
        }
      }
    }
  }

  ditherDisc(cx: number, cy: number, r: number, c1: string, c2: string | null) {
    const icx = Math.round(cx);
    const icy = Math.round(cy);
    const ir = Math.max(1, Math.round(r));
    for (let dy = -ir; dy <= ir; dy++) {
      for (let dx = -ir; dx <= ir; dx++) {
        if (dx * dx + dy * dy <= ir * ir) {
          const even = ((icx + dx + icy + dy) & 1) === 0;
          if (even) this.px(icx + dx, icy + dy, c1);
          else if (c2) this.px(icx + dx, icy + dy, c2);
        }
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string) {
    const icx = Math.round(cx);
    const icy = Math.round(cy);
    const irx = Math.max(1, Math.round(rx));
    const iry = Math.max(1, Math.round(ry));
    for (let dy = -iry; dy <= iry; dy++) {
      for (let dx = -irx; dx <= irx; dx++) {
        if ((dx * dx) / (irx * irx) + (dy * dy) / (iry * iry) <= 1) {
          this.px(icx + dx, icy + dy, color);
        }
      }
    }
  }

  ray(x0: number, y0: number, ang: number, len: number, width: number, color: string) {
    const steps = Math.max(2, Math.ceil(len));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(x0 + Math.cos(ang) * len * t);
      const y = Math.round(y0 + Math.sin(ang) * len * t);
      const w = Math.max(1, Math.round(width * (1 - t * 0.65)));
      this.rect(x - Math.floor(w / 2), y - Math.floor(w / 2), w, w, color);
    }
  }
}

interface FirePalette {
  core: string;
  inner: string;
  mid: string;
  outer: string;
  smokeDark: string;
  smokeMid: string;
  accent: string;
}

const PAL_CLASSIC: FirePalette = {
  core: "#ffffff",
  inner: "#fff3a1",
  mid: "#ff9e00",
  outer: "#d62828",
  smokeDark: "#242429",
  smokeMid: "#4a4e57",
  accent: "#ffd60a",
};

const PAL_FLANNEL: FirePalette = {
  core: "#ffffff",
  inner: "#ffd60a",
  mid: "#e63946",
  outer: "#660708",
  smokeDark: "#1a171c",
  smokeMid: "#00f5d4",
  accent: "#72efdd",
};

const PAL_TOXIC: FirePalette = {
  core: "#f7ffbf",
  inner: "#9ef01a",
  mid: "#39ff14",
  outer: "#ff0054",
  smokeDark: "#1b261e",
  smokeMid: "#38523d",
  accent: "#ffbe0b",
};

const PAL_POP: FirePalette = {
  core: "#ffffff",
  inner: "#e0fbfc",
  mid: "#72efdd",
  outer: "#ffd60a",
  smokeDark: "#94a3b8",
  smokeMid: "#e2e8f0",
  accent: "#ff4d6d",
};

function drawFireballFrames(
  textures: Phaser.Textures.TextureManager,
  variant: FireballVariant,
  pal: FirePalette,
  mode: "round" | "star" | "asymmetric" | "flannel" | "pop",
) {
  const S = variant === "flannel" || variant === "toxic" ? 112 : 96;
  const cx = S / 4;
  const cy = S / 4;
  const maxR = S / 4 - 4;

  // Asymmetric billowing cluster puffs: (dx factor, dy factor, radius factor)
  // Biased into varied big-main + small-satellite clouds so explosions never look like symmetric petals
  const puffs: ReadonlyArray<readonly [number, number, number]> =
    mode === "asymmetric"
      ? [
          [-0.22, -0.26, 0.46],
          [0.34, -0.14, 0.36],
          [-0.36, 0.2, 0.34],
          [0.18, 0.3, 0.4],
          [0.02, -0.44, 0.28],
        ]
      : mode === "star"
        ? [
            [0.24, -0.28, 0.44],
            [-0.34, -0.12, 0.38],
            [0.36, 0.22, 0.32],
            [-0.18, 0.32, 0.38],
            [-0.08, -0.46, 0.26],
          ]
        : [
            [-0.16, -0.28, 0.46],
            [0.3, -0.18, 0.4],
            [-0.34, 0.16, 0.34],
            [0.24, 0.26, 0.36],
            [0.06, 0.02, 0.44],
          ];

  for (let frame = 0; frame < 6; frame++) {
    paintTex(textures, `exp_${variant}_${frame}`, S, S, (ctx) => {
      const pen = new FxPen(ctx, 2);

      if (frame === 0) {
        // Frame 0: Blinding flash core + jagged blast spikes
        const r = maxR * 0.54;
        for (let i = 0; i < 9; i++) {
          const ang = (i / 9) * Math.PI * 2 + (mode === "asymmetric" ? 0.35 : 0.1);
          const rayLen = r * (i % 2 === 0 ? 1.65 : 1.15);
          pen.ray(cx, cy, ang, rayLen, 3, INK);
          pen.ray(cx, cy, ang, rayLen - 1, 2, pal.mid);
        }
        pen.disc(cx, cy, r + 1, pal.outer, INK);
        pen.disc(cx, cy, r * 0.8, pal.inner);
        pen.disc(cx, cy, r * 0.52, pal.core);
      } else if (frame === 1) {
        // Frame 1: Full-power expanding asymmetric fireball
        const baseR = maxR * 0.82;
        if (mode === "star" || mode === "flannel" || mode === "pop") {
          for (let i = 0; i < 10; i++) {
            const ang = (i / 10) * Math.PI * 2 + 0.18;
            const len = maxR * (i % 2 === 0 ? 0.98 : 0.74);
            pen.ray(cx, cy, ang, len, 2, pal.accent);
          }
        }
        pen.disc(cx, cy, baseR * 0.74, pal.outer, INK);
        for (let i = 0; i < puffs.length; i++) {
          const [dx, dy, radF] = puffs[i]!;
          pen.disc(cx + dx * baseR, cy + dy * baseR, baseR * radF, pal.outer, INK);
        }
        pen.disc(cx, cy, baseR * 0.72, pal.mid);
        for (let i = 0; i < puffs.length; i++) {
          const [dx, dy, radF] = puffs[i]!;
          pen.disc(cx + dx * baseR * 0.88, cy + dy * baseR * 0.88, baseR * radF * 0.76, pal.mid);
        }

        // Signature flannel tartan dither inside the Article 5 blast!
        if (mode === "flannel") {
          const rr = Math.round(baseR * 0.68);
          for (let dy = -rr; dy <= rr; dy++) {
            for (let dx = -rr; dx <= rr; dx++) {
              if (dx * dx + dy * dy > rr * rr) continue;
              const gx = Math.abs(dx) % 4;
              const gy = Math.abs(dy) % 4;
              if (gx === 0 || gy === 0) {
                pen.px(cx + dx, cy + dy, gx === 0 && gy === 0 ? "#121016" : "#ffd60a");
              } else if ((gx + gy) % 2 === 0) {
                pen.px(cx + dx, cy + dy, "#e63946");
              }
            }
          }
        } else {
          pen.disc(cx - 1, cy - 1, baseR * 0.52, pal.inner);
        }
        pen.disc(cx, cy, baseR * 0.34, pal.core);
      } else if (frame === 2) {
        // Frame 2: Peak fiery cloud billowing upward + bright hot pockets
        const baseR = maxR * 0.9;
        for (let i = 0; i < puffs.length; i++) {
          const [dx, dy, radF] = puffs[i]!;
          const lx = cx + dx * baseR * 1.15;
          const ly = cy + dy * baseR * 1.15 - 1;
          const lr = baseR * radF * 0.95;
          pen.disc(lx, ly, lr, pal.outer, INK);
        }
        pen.disc(cx, cy, baseR * 0.66, pal.mid);
        for (let i = 0; i < puffs.length; i++) {
          const [dx, dy, radF] = puffs[i]!;
          const lx = cx + dx * baseR * 1.02;
          const ly = cy + dy * baseR * 1.02 - 1;
          pen.disc(lx, ly, baseR * radF * 0.72, pal.mid);
        }
        pen.ditherDisc(cx - 1, cy, baseR * 0.46, pal.inner, pal.mid);
        if (mode === "flannel") {
          pen.ditherDisc(cx, cy, baseR * 0.3, pal.accent, pal.core);
        } else {
          pen.disc(cx - 1, cy + 1, baseR * 0.24, pal.core);
        }
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          pen.px(cx + Math.cos(a) * maxR * 0.96, cy + Math.sin(a) * maxR * 0.96, pal.accent);
        }
      } else if (frame === 3) {
        // Frame 3: Rising smoke canopy over glowing lower fire embers (cohesive cloud, not petals)
        const baseR = maxR * 0.92;
        for (let i = 0; i < puffs.length; i++) {
          const [dx, dy, radF] = puffs[i]!;
          const lx = cx + dx * baseR * 1.25;
          const ly = cy + dy * baseR * 1.25 - 2;
          pen.disc(lx, ly, baseR * radF * 0.88, pal.smokeDark);
          pen.ditherDisc(lx, ly - 1, baseR * radF * 0.72, pal.smokeMid, pal.smokeDark);
        }
        pen.disc(cx, cy - 1, baseR * 0.56, pal.smokeDark);
        // Burning lower-center ember core
        pen.ditherDisc(cx, cy + 2, baseR * 0.42, pal.outer, pal.smokeDark);
        pen.disc(cx - 1, cy + 2, baseR * 0.24, pal.mid);
        pen.px(cx - 1, cy + 2, pal.accent);
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2 + 0.4;
          pen.rect(cx + Math.cos(a) * baseR * 0.82, cy + Math.sin(a) * baseR * 0.82, 2, 2, pal.accent);
        }
      } else if (frame === 4) {
        // Frame 4: Drifting dithered smoke puffs with sparse ember flecks
        const baseR = maxR * 0.95;
        for (let i = 0; i < puffs.length; i++) {
          const [dx, dy, radF] = puffs[i]!;
          const lx = cx + dx * baseR * 1.32;
          const ly = cy + dy * baseR * 1.32 - 3;
          pen.ditherDisc(lx, ly, baseR * radF * 0.72, pal.smokeDark, pal.smokeMid);
          if (i % 2 === 0) pen.px(lx, ly + 1, pal.mid);
        }
        pen.ditherDisc(cx, cy - 2, baseR * 0.34, pal.smokeMid, null);
      } else {
        // Frame 5: Delicate fading smoke wisps
        const baseR = maxR * 0.98;
        for (let i = 0; i < puffs.length; i++) {
          const [dx, dy, radF] = puffs[i]!;
          const lx = cx + dx * baseR * 1.38;
          const ly = cy + dy * baseR * 1.38 - 4;
          pen.ditherDisc(lx, ly, baseR * radF * 0.48, pal.smokeMid, null);
        }
      }
    });
  }
}

/** High-contrast glittering starburst firework animation */
function drawStarburstFrames(textures: Phaser.Textures.TextureManager) {
  const S = 112;
  const cx = S / 4;
  const cy = S / 4;
  const maxR = S / 4 - 3;

  for (let frame = 0; frame < 6; frame++) {
    paintTex(textures, `exp_starburst_${frame}`, S, S, (ctx) => {
      const pen = new FxPen(ctx, 2);
      const rays = 12;
      if (frame === 0) {
        pen.disc(cx, cy, 8, "#ffffff", INK);
        for (let i = 0; i < rays; i++) {
          const a = (i / rays) * Math.PI * 2;
          pen.ray(cx, cy, a, 13, 3, INK);
          pen.ray(cx, cy, a, 12, 2, "#ffffff");
        }
      } else {
        const innerDist = (frame - 1) * 4.2 + 3;
        const outerDist = Math.min(maxR, frame * 5.0 + 8);
        for (let i = 0; i < rays; i++) {
          const a = (i / rays) * Math.PI * 2 + (frame % 2) * 0.04;
          const len = i % 2 === 0 ? outerDist : outerDist * 0.8;
          const start = Math.min(len - 2, innerDist);
          const steps = Math.max(2, Math.ceil(len - start));
          for (let s = 0; s <= steps; s++) {
            const d = start + (len - start) * (s / steps);
            const px = Math.round(cx + Math.cos(a) * d);
            const py = Math.round(cy + Math.sin(a) * d);
            const tip = s === steps;
            if (tip) {
              pen.rect(px - 1, py - 1, 3, 3, INK);
              pen.rect(px - 1, py - 1, 2, 2, "#ffffff");
            } else if (frame <= 4) {
              pen.px(px, py, frame <= 2 ? "#ffffff" : "#e2f8ff");
            }
          }
        }
        // Twinkling diamond sparkles between rays
        if (frame >= 2) {
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2 + 0.39;
            const d = outerDist * 0.62;
            const sx = Math.round(cx + Math.cos(a) * d);
            const sy = Math.round(cy + Math.sin(a) * d);
            pen.px(sx, sy, "#ffffff");
            if (frame % 2 === 0) {
              pen.px(sx - 1, sy, "#ffffff");
              pen.px(sx + 1, sy, "#ffffff");
              pen.px(sx, sy - 1, "#ffffff");
              pen.px(sx, sy + 1, "#ffffff");
            }
          }
        }
      }
    });
  }
}

/** Tall vertical dirt + fire geyser eruption for 155mm artillery shells */
function drawGeyserFrames(textures: Phaser.Textures.TextureManager) {
  const W = 96;
  const H = 112;
  const cx = W / 4; // 24
  const groundY = H / 2 - 12; // logical 44

  for (let frame = 0; frame < 6; frame++) {
    paintTex(textures, `exp_geyser_${frame}`, W, H, (ctx) => {
      const pen = new FxPen(ctx, 2);

      if (frame === 0) {
        pen.ellipse(cx, groundY, 15, 7, "#ff9e00");
        pen.ellipse(cx, groundY - 2, 10, 5, "#ffffff");
        pen.rect(cx - 4, groundY - 18, 8, 18, "#fff3a1");
        pen.rect(cx - 2, groundY - 22, 4, 22, "#ffffff");
      } else if (frame === 1) {
        // Erupting pillar of steppe dirt + white-hot flame base
        pen.ellipse(cx, groundY, 18, 8, INK);
        pen.ellipse(cx, groundY, 16, 7, "#d62828");
        pen.ellipse(cx, groundY - 1, 11, 5, "#ffd60a");
        // Dirt column shooting upward
        for (let row = 0; row < 26; row++) {
          const t = row / 26;
          const w = Math.max(3, Math.round(9 - t * 4 + Math.sin(t * 5) * 2));
          pen.rect(cx - Math.floor(w / 2) - 1, groundY - row - 4, w + 2, 2, INK);
          pen.rect(cx - Math.floor(w / 2), groundY - row - 4, w, 2, row < 12 ? "#ff8c00" : "#5c4732");
        }
        pen.disc(cx, groundY - 28, 7, "#4a3828", INK);
        pen.disc(cx, groundY - 12, 6, "#fff3a1");
      } else if (frame === 2) {
        // Full mushroom dirt & fire plume!
        pen.ellipse(cx, groundY, 20, 9, "#3d3024");
        pen.ellipse(cx, groundY - 1, 14, 6, "#ff7b00");
        pen.rect(cx - 5, groundY - 30, 10, 28, "#3d3024");
        pen.ditherDisc(cx, groundY - 18, 7, "#ff9e00", "#5c4732");
        // Mushroom cap
        pen.disc(cx - 8, groundY - 30, 8, "#4a3828", INK);
        pen.disc(cx + 8, groundY - 30, 8, "#4a3828", INK);
        pen.disc(cx, groundY - 34, 10, "#6b553f", INK);
        pen.ditherDisc(cx, groundY - 32, 7, "#ff9e00", "#5c4732");
        pen.disc(cx, groundY - 36, 5, "#ffe66d");
      } else if (frame === 3) {
        // Cooling dust plume + flying clods
        pen.ellipse(cx, groundY, 21, 8, "#352c24");
        pen.ditherDisc(cx, groundY - 16, 8, "#4a3f35", "#29231d");
        pen.disc(cx - 10, groundY - 31, 8, "#3d352e", INK);
        pen.disc(cx + 10, groundY - 31, 8, "#3d352e", INK);
        pen.disc(cx, groundY - 36, 9, "#594e45", INK);
        pen.ditherDisc(cx, groundY - 34, 6, "#d62828", "#3d352e");
      } else if (frame === 4) {
        pen.ditherDisc(cx - 11, groundY - 33, 7, "#4a443f", null);
        pen.ditherDisc(cx + 11, groundY - 33, 7, "#4a443f", null);
        pen.ditherDisc(cx, groundY - 38, 8, "#635c55", null);
        pen.ditherDisc(cx, groundY - 8, 9, "#3d3630", null);
      } else {
        pen.ditherDisc(cx - 12, groundY - 36, 5, "#59534d", null);
        pen.ditherDisc(cx + 12, groundY - 36, 5, "#59534d", null);
        pen.ditherDisc(cx, groundY - 40, 6, "#756e67", null);
      }
    });
  }
}

function drawShockwaves(textures: Phaser.Textures.TextureManager) {
  const rings: Array<{ key: string; outer: string; inner: string; dashed?: boolean; jagged?: boolean }> = [
    { key: "ring_fire", outer: "#ff9e00", inner: "#fff3b0" },
    { key: "ring_dust", outer: "#c2a878", inner: "#ffbe0b", dashed: true },
    { key: "ring_emp", outer: "#00f5d4", inner: "#ffffff", jagged: true },
    { key: "ring_flannel", outer: "#e63946", inner: "#ffd60a", dashed: true },
    { key: "ring_toxic", outer: "#39ff14", inner: "#ff0054", jagged: true },
    { key: "ring_air", outer: "#72efdd", inner: "#ffffff" },
  ];

  // Crisp high-res 256x256 pixel rings so large shockwaves never look overly blocky
  for (const r of rings) {
    paintTex(textures, r.key, 256, 256, (ctx) => {
      const steps = 128;
      for (let i = 0; i < steps; i++) {
        if (r.dashed && i % 6 === 5) continue;
        const ang = (i / steps) * Math.PI * 2;
        const jag = r.jagged ? ((i & 1) === 0 ? 5 : -4) : 0;
        const radOut = 114 + jag;
        const radIn = 104 + jag * 0.5;
        const ox = Math.round((128 + Math.cos(ang) * radOut) / 2) * 2;
        const oy = Math.round((128 + Math.sin(ang) * radOut) / 2) * 2;
        ctx.fillStyle = r.outer;
        ctx.fillRect(ox - 2, oy - 2, 4, 4);

        if ((i & 1) === 0 || !r.dashed) {
          const ix = Math.round((128 + Math.cos(ang) * radIn) / 2) * 2;
          const iy = Math.round((128 + Math.sin(ang) * radIn) / 2) * 2;
          ctx.fillStyle = r.inner;
          ctx.fillRect(ix - 1, iy - 1, 2, 2);
        }
      }
    });
  }
}

function drawCraters(textures: Phaser.Textures.TextureManager) {
  const specs: Array<{ key: string; w: number; h: number; rx: number; ry: number }> = [
    { key: "crater_sm", w: 64, h: 44, rx: 13, ry: 8 },
    { key: "crater_md", w: 92, h: 64, rx: 19, ry: 12 },
    { key: "crater_lg", w: 124, h: 86, rx: 27, ry: 17 },
  ];

  for (const sp of specs) {
    paintTex(textures, sp.key, sp.w, sp.h, (ctx) => {
      const pen = new FxPen(ctx, 2);
      const cx = sp.w / 4;
      const cy = sp.h / 4;

      // Outer blast scorch rays
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2 + 0.15;
        const len = sp.rx * (0.95 + (i % 3) * 0.1);
        const rx = cx + Math.cos(ang) * len;
        const ry = cy + Math.sin(ang) * (sp.ry * (0.95 + (i % 3) * 0.1));
        pen.rect(rx - 1, ry - 1, 2, 2, "rgba(24, 20, 16, 0.55)");
      }
      // Upturned brown steppe dirt rim
      pen.ellipse(cx, cy, sp.rx, sp.ry, "rgba(58, 44, 30, 0.72)");
      // Outer soot ring
      pen.ellipse(cx, cy, sp.rx * 0.82, sp.ry * 0.8, "rgba(26, 23, 20, 0.82)");
      // Deep charred crater center
      pen.ellipse(cx, cy + 1, sp.rx * 0.54, sp.ry * 0.52, "rgba(12, 11, 10, 0.88)");
      // Tiny glowing embers inside large/medium craters
      if (sp.key !== "crater_sm") {
        pen.px(cx - 3, cy, "#ff5400");
        pen.px(cx + 4, cy + 1, "#ff9e00");
        pen.px(cx + 1, cy - 2, "#d62828");
      }
    });
  }
}

function drawDebrisAndFlash(textures: Phaser.Textures.TextureManager) {
  // Bright radial pixel flash pop
  paintTex(textures, "exp_flash", 96, 96, (ctx) => {
    const pen = new FxPen(ctx, 2);
    pen.ditherDisc(24, 24, 22, "rgba(255,255,255,0.45)", null);
    pen.disc(24, 24, 15, "rgba(255,255,255,0.75)");
    pen.disc(24, 24, 9, "#ffffff");
  });

  // Spinning Tank Turret ("Turret Toss"!)
  paintTex(textures, "deb_turret", 40, 28, (ctx) => {
    const pen = new FxPen(ctx, 2);
    // Cannon barrel
    pen.rect(11, 5, 9, 3, INK);
    pen.rect(11, 6, 8, 1, "#64748b");
    // Rounded cast Soviet turret dome
    pen.disc(7, 7, 5, "#4b5b36", INK);
    pen.rect(4, 4, 6, 2, "#6d8150");
    // Open smoking commander hatch
    pen.rect(5, 3, 3, 2, "#18181b");
    // Tiny white Z mark
    pen.px(6, 7, "#ffffff");
    pen.px(7, 7, "#ffffff");
    pen.px(6, 8, "#ffffff");
    pen.px(7, 9, "#ffffff");
  });

  // Twisted armor scrap plate
  paintTex(textures, "deb_scrap", 18, 18, (ctx) => {
    const pen = new FxPen(ctx, 2);
    pen.rect(1, 2, 7, 5, INK);
    pen.rect(2, 3, 5, 3, "#52525b");
    pen.rect(2, 3, 3, 1, "#a1a1aa");
    pen.px(6, 5, "#ff7b00");
  });

  // Bouncing rubber tire
  paintTex(textures, "deb_wheel", 20, 20, (ctx) => {
    const pen = new FxPen(ctx, 2);
    pen.disc(5, 5, 4, "#1e2229", INK);
    pen.disc(5, 5, 2, "#64748b");
    pen.px(5, 5, "#cbd5e1");
  });

  // Splintered birch armor log
  paintTex(textures, "deb_log", 24, 12, (ctx) => {
    const pen = new FxPen(ctx, 2);
    pen.rect(1, 1, 10, 4, INK);
    pen.rect(2, 2, 8, 2, "#f5f5f4");
    pen.px(4, 2, "#292524");
    pen.px(7, 3, "#292524");
    pen.rect(9, 2, 1, 2, "#b45309");
  });

  // Flying stolen porcelain shard
  paintTex(textures, "deb_porcelain", 18, 18, (ctx) => {
    const pen = new FxPen(ctx, 2);
    pen.rect(2, 2, 5, 5, INK);
    pen.rect(3, 3, 3, 3, "#ffffff");
    pen.px(4, 4, "#38bdf8");
  });

  // Inflatable green/yellow rubber scrap
  paintTex(textures, "deb_rubber", 20, 14, (ctx) => {
    const pen = new FxPen(ctx, 2);
    pen.rect(1, 2, 8, 4, INK);
    pen.rect(2, 3, 6, 2, "#65a30d");
    pen.rect(3, 3, 2, 1, "#facc15");
  });

  // Fluttering red/white "SALE" tag from S-400
  paintTex(textures, "deb_tag", 24, 14, (ctx) => {
    const pen = new FxPen(ctx, 2);
    pen.rect(1, 1, 10, 5, INK);
    pen.rect(2, 2, 8, 3, "#ffffff");
    pen.rect(3, 3, 6, 1, "#dc2626");
  });

  // Kamikaze drone rotor blade with blue isolenta
  paintTex(textures, "deb_rotor", 22, 12, (ctx) => {
    const pen = new FxPen(ctx, 2);
    pen.rect(1, 2, 9, 2, INK);
    pen.rect(2, 2, 7, 1, "#cbd5e1");
    pen.rect(4, 1, 3, 4, "#0077ff");
  });

  // Steppe mud/sod clod
  paintTex(textures, "deb_sod", 16, 14, (ctx) => {
    const pen = new FxPen(ctx, 2);
    pen.disc(4, 4, 3, "#4a3828", INK);
    pen.rect(2, 2, 3, 1, "#6d8150");
  });

  // Flying SSh-68 steel pot helmet
  paintTex(textures, "deb_helmet", 18, 14, (ctx) => {
    const pen = new FxPen(ctx, 2);
    pen.ellipse(4, 4, 3, 2, INK);
    pen.rect(2, 2, 5, 3, "#4a5d32");
    pen.rect(3, 2, 3, 1, "#6b8447");
  });

  // Hot glowing ember chunk
  paintTex(textures, "deb_ember", 12, 12, (ctx) => {
    const pen = new FxPen(ctx, 2);
    pen.rect(1, 1, 4, 4, "#d62828");
    pen.rect(2, 2, 2, 2, "#ffd60a");
  });

  // Festive firework / inflatable confetti bits
  const confettiColors = ["#ffd60a", "#00f5d4", "#ff0054", "#9ef01a"];
  confettiColors.forEach((col, i) => {
    paintTex(textures, `deb_confetti_${i}`, 12, 12, (ctx) => {
      const pen = new FxPen(ctx, 2);
      pen.rect(1, 2, 4, 3, INK);
      pen.rect(2, 2, 2, 2, col);
    });
  });

  // Directional high-speed spark streak (aligned along velocity angle)
  paintTex(textures, "spark_streak", 24, 8, (ctx) => {
    ctx.fillStyle = "rgba(255, 230, 109, 0.5)";
    ctx.fillRect(0, 2, 8, 4);
    ctx.fillStyle = "#ffe66d";
    ctx.fillRect(6, 2, 10, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(14, 2, 10, 4);
  });

  // Animated 3-frame thermobaric flame patches
  for (let f = 0; f < 3; f++) {
    paintTex(textures, `flame_${f}`, 48, 48, (ctx) => {
      const pen = new FxPen(ctx, 2);
      const sway = f === 0 ? 0 : f === 1 ? -1 : 1;
      const tall = f === 1 ? 2 : 0;
      pen.ellipse(12, 18, 8, 4, "rgba(214, 40, 40, 0.7)");
      pen.rect(6, 9 - tall, 12, 10 + tall, "#d9381e");
      pen.rect(9 + sway, 5 - tall, 6, 6, "#ff5400");
      pen.rect(8, 11 - Math.floor(tall / 2), 8, 8, "#ff9e00");
      pen.rect(10 + sway, 13, 4, 5, "#ffe66d");
      pen.px(11 + sway, 15, "#ffffff");
    });
  }
}

export function installExplosionTextures(textures: Phaser.Textures.TextureManager) {
  drawFireballFrames(textures, "fire_a", PAL_CLASSIC, "round");
  drawFireballFrames(textures, "fire_b", PAL_CLASSIC, "star");
  drawFireballFrames(textures, "fire_c", PAL_CLASSIC, "asymmetric");
  drawFireballFrames(textures, "flannel", PAL_FLANNEL, "flannel");
  drawFireballFrames(textures, "toxic", PAL_TOXIC, "asymmetric");
  drawFireballFrames(textures, "pop", PAL_POP, "pop");
  drawStarburstFrames(textures);
  drawGeyserFrames(textures);
  drawShockwaves(textures);
  drawCraters(textures);
  drawDebrisAndFlash(textures);
}
