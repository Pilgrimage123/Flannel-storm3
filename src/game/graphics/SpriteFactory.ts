import type * as Phaser from "phaser";

const INK = "#10140d";

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  return [c, ctx];
}

function getSourceImage(
  textures: Phaser.Textures.TextureManager,
  key: string,
): HTMLImageElement | HTMLCanvasElement | null {
  if (!textures.exists(key)) return null;
  const src = textures.get(key).getSourceImage() as
    HTMLImageElement | HTMLCanvasElement | undefined;
  if (!src || !("width" in src) || src.width === 0) return null;
  return src;
}

function registerCanvas(
  textures: Phaser.Textures.TextureManager,
  key: string,
  canvas: HTMLCanvasElement,
) {
  if (textures.exists(key)) {
    textures.remove(key);
  }
  textures.addCanvas(key, canvas);
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function fillStrokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
  stroke = INK,
  lineWidth = 2.8,
) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function fillStrokeEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string | CanvasGradient,
  stroke = INK,
  lineWidth = 2.8,
  rot = 0,
) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawStGeorgeRibbon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  ctx.fillStyle = "#ff7300";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#141414";
  const sh = h / 5;
  ctx.fillRect(x, y + sh * 0.6, w, sh);
  ctx.fillRect(x, y + sh * 2.1, w, sh);
  ctx.fillRect(x, y + sh * 3.6, w, sh);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawSloppyZ(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color = "#ffffff",
  lw = 3,
) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw + 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.45, cy - size * 0.45);
  ctx.lineTo(cx + size * 0.45, cy - size * 0.42);
  ctx.lineTo(cx - size * 0.42, cy + size * 0.45);
  ctx.lineTo(cx + size * 0.48, cy + size * 0.42);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.restore();
}

function drawTelnyashkaPatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 3);
  ctx.clip();
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#1d4ed8";
  for (let sy = y + 1.5; sy < y + h; sy += 4.2) {
    ctx.fillRect(x, sy, w, 2.2);
  }
  ctx.restore();
  roundRectPath(ctx, x, y, w, h, 3);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

/**
 * 1. Enhanced Organic Steppe Battlefield Terrain (`ground`)
 */
function buildGroundTexture(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
): HTMLCanvasElement {
  const S = 512;
  const [c, ctx] = makeCanvas(S, S);

  if (baseImg) {
    ctx.drawImage(baseImg, 0, 0, S, S);
    ctx.fillStyle = "rgba(38, 48, 26, 0.16)";
    ctx.fillRect(0, 0, S, S);
  } else {
    ctx.fillStyle = "#5c683c";
    ctx.fillRect(0, 0, S, S);
  }

  let seed = 4242;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 240; i++) {
    const px = Math.floor(rnd() * S);
    const py = Math.floor(rnd() * S);
    const dark = rnd() < 0.5;
    ctx.fillStyle = dark ? "rgba(42, 48, 26, 0.22)" : "rgba(118, 128, 72, 0.18)";
    for (let j = 0; j < 7; j++) {
      const ox = Math.floor((rnd() - 0.5) * 18);
      const oy = Math.floor((rnd() - 0.5) * 12);
      ctx.fillRect((px + ox + S) % S, (py + oy + S) % S, 4, 3);
    }
  }

  ctx.fillStyle = "rgba(46, 38, 26, 0.22)";
  for (let step = 0; step < S; step += 12) {
    const x1 = step;
    const y1 = (step + 110) % S;
    ctx.fillRect(x1, y1, 8, 3);
    ctx.fillRect((x1 + 18) % S, (y1 - 12 + S) % S, 8, 3);
  }

  for (let i = 0; i < 320; i++) {
    const gx = Math.floor(rnd() * S);
    const gy = Math.floor(rnd() * S);
    ctx.strokeStyle = rnd() < 0.45 ? "rgba(128, 145, 78, 0.55)" : "rgba(48, 58, 30, 0.5)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx - 2, gy - 5);
    ctx.moveTo(gx + 2, gy);
    ctx.lineTo(gx + 4, gy - 4);
    ctx.stroke();

    if (rnd() < 0.09) {
      ctx.fillStyle = rnd() < 0.65 ? "rgba(255, 214, 10, 0.75)" : "rgba(76, 201, 240, 0.7)";
      ctx.fillRect(gx, gy - 4, 2.5, 2.5);
    }
  }

  return c;
}

/**
 * 2. Mobik Conscript (`conscript`, `conscript_0`, `conscript_1`)
 */
function buildConscriptFrame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): HTMLCanvasElement {
  const W = 112;
  const H = 136;
  const [c, ctx] = makeCanvas(W, H);
  const bob = frame === 0 ? 0 : -2.5;
  const tilt = frame === 0 ? -0.025 : 0.025;

  ctx.save();
  ctx.translate(W / 2, H / 2 + bob);
  ctx.rotate(tilt);
  ctx.translate(-W / 2, -H / 2);

  // Stolen white porcelain toilet brush sticking out of his rucksack behind shoulder
  ctx.save();
  ctx.translate(25, 44);
  ctx.rotate(-0.48);
  fillStrokeRoundRect(ctx, -3, -28, 5, 28, 2, "#e2e8f0", INK, 2.2);
  fillStrokeEllipse(ctx, -0.5, -31, 8, 6.5, "#ffffff", INK, 2.2);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-5, -31);
  ctx.lineTo(4, -31);
  ctx.stroke();
  ctx.restore();

  if (baseImg) {
    ctx.drawImage(baseImg, 9, 8, 94, 122);
  }

  fillStrokeRoundRect(ctx, 41, 29, 34, 5.5, 2, "#f8fafc", INK, 1.6);
  drawSloppyZ(ctx, 56, 19, 10, "#ffffff", 2.6);
  drawTelnyashkaPatch(ctx, 48, 53, 13, 11);
  drawStGeorgeRibbon(ctx, 35, 55, 11, 6.5);

  fillStrokeRoundRect(ctx, 18, 56, 14, 10, 2, "#f8fafc", INK, 1.8);
  drawSloppyZ(ctx, 25, 61, 6, "#111111", 1.8);

  // Three White Tracksuit Stripes ("Три полоски") down both pant legs
  ctx.save();
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 1.6;
  for (let s = -2; s <= 2; s += 2) {
    ctx.beginPath();
    ctx.moveTo(28 + s * 1.1, 88);
    ctx.lineTo(23 + s * 1.1, 108);
    ctx.moveTo(64 + s * 1.1, 86);
    ctx.lineTo(66 + s * 1.1, 106);
    ctx.stroke();
  }
  ctx.restore();

  // Blue Isolenta ("Синяя изолента") holding rifle & mag together
  ctx.save();
  ctx.translate(64, 65);
  ctx.rotate(-0.38);
  fillStrokeRoundRect(ctx, -28, -4, 7, 11, 1.5, "#0077ff", INK, 1.6);
  fillStrokeRoundRect(ctx, 11, -5, 7, 10, 1.5, "#0077ff", INK, 1.6);
  ctx.restore();
  fillStrokeRoundRect(ctx, 52, 74, 10, 5, 1, "#0077ff", INK, 1.5);

  ctx.restore();
  return c;
}

/**
 * 3. Kadyrovite "Akhmat" TikTok Battalion Streamer (`tiktok`, `tiktok_0`, `tiktok_1`)
 */
function buildTikTokFrame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): HTMLCanvasElement {
  const W = 116;
  const H = 140;
  const [c, ctx] = makeCanvas(W, H);
  const bob = frame === 0 ? 0 : -2.5;
  const tilt = frame === 0 ? 0.025 : -0.025;

  ctx.save();
  ctx.translate(W / 2, H / 2 + bob);
  ctx.rotate(tilt);
  ctx.translate(-W / 2, -H / 2);

  // Solid Gold-Plated AK-74 slung on right side firing blindly
  ctx.save();
  ctx.translate(88, 66);
  ctx.rotate(0.28);
  const goldGrad = ctx.createLinearGradient(-10, -6, 26, 6);
  goldGrad.addColorStop(0, "#fef08a");
  goldGrad.addColorStop(0.5, "#ffd60a");
  goldGrad.addColorStop(1, "#ca8a04");
  fillStrokeRoundRect(ctx, -12, -4, 34, 8, 2, goldGrad, INK, 2.2);
  fillStrokeRoundRect(ctx, 2, 3, 7, 12, 1.5, "#ffd60a", INK, 2);
  if (frame === 1) {
    fillStrokeEllipse(ctx, 25, 0, 5.5, 4, "#fffbeb", "#ff5400", 1.8);
  }
  ctx.restore();

  if (baseImg) {
    ctx.drawImage(baseImg, 11, 6, 94, 132);
  }

  // Bushy Kadyrovite Chin Beard
  ctx.beginPath();
  ctx.moveTo(41, 41);
  ctx.quadraticCurveTo(40, 58, 53, 59);
  ctx.quadraticCurveTo(66, 58, 66, 41);
  ctx.quadraticCurveTo(60, 49, 53, 49);
  ctx.quadraticCurveTo(46, 49, 41, 41);
  ctx.closePath();
  ctx.fillStyle = "#26160c";
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Dark Clout Sunglasses
  fillStrokeRoundRect(ctx, 41, 31, 11, 7, 2, "#090d16", "#ffd60a", 1.6);
  fillStrokeRoundRect(ctx, 54, 31, 11, 7, 2, "#090d16", "#ffd60a", 1.6);

  drawStGeorgeRibbon(ctx, 41, 19, 30, 5);
  fillStrokeRoundRect(ctx, 45, 62, 24, 9, 2, "#111", "#ffd60a", 1.5);
  ctx.fillStyle = "#ff0055";
  ctx.font = "bold 6px monospace";
  ctx.fillText("TIKTOK", 47, 69);

  // Glowing Neon LED Ring-Light around Smartphone
  const ringCol = frame === 0 ? "#ff0055" : "#00f5d4";
  ctx.save();
  ctx.strokeStyle = ringCol;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(23, 47, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(23, 47, 16, 0, Math.PI * 2);
  ctx.stroke();

  fillStrokeRoundRect(ctx, 11, 24, 25, 10, 3, "#ff0033", INK, 1.8);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 6px monospace";
  ctx.fillText("LIVE", 14, 31);
  ctx.restore();

  // Red-bottom "Prada" combat boots
  ctx.fillStyle = "#ff0a36";
  ctx.fillRect(29, 129, 22, 4);
  ctx.fillRect(79, 131, 20, 4);

  ctx.restore();
  return c;
}

/**
 * 3B. NEW: Storm-Z Electric Assault Scooter (`scooter`, `scooter_0`, `scooter_1`)
 * Mobik in SSh-68 helmet, Telnyashka, and 3-stripe Adidas tracksuit riding a
 * Xiaomi/Ninebot-style electric kick-scooter with glowing neon-blue battery LEDs,
 * a front shopping basket with stolen loot, and an RPG-7 strapped to the stem with Blue Isolenta!
 */
function buildScooterFrame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): HTMLCanvasElement {
  const W = 124;
  const H = 148;
  const [c, ctx] = makeCanvas(W, H);
  const bounce = frame === 0 ? 0 : -2.5;

  ctx.save();
  ctx.translate(0, bounce);

  // Electric Scooter Rear & Front Wheels (3/4 isometric perspective)
  fillStrokeEllipse(ctx, 28, 128, 13, 10, "#1e293b", INK, 3);
  fillStrokeEllipse(ctx, 28, 128, 6, 4.5, "#94a3b8", INK, 1.6);
  fillStrokeEllipse(ctx, 94, 128, 13, 10, "#1e293b", INK, 3);
  fillStrokeEllipse(ctx, 94, 128, 6, 4.5, "#94a3b8", INK, 1.6);

  // Scooter Deck / Battery Footboard with Neon Cyan Underglow LED strip
  fillStrokeRoundRect(ctx, 26, 118, 70, 11, 4, "#334155", INK, 2.8);
  ctx.strokeStyle = frame === 0 ? "#00f5d4" : "#38bdf8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 127);
  ctx.lineTo(92, 127);
  ctx.stroke();

  // Draw the Mobik Rider on the Scooter Deck
  if (baseImg) {
    ctx.drawImage(baseImg, 14, 6, 84, 114);
  }

  // Helmet "Z", Telnyashka, and 3-stripe tracksuit on the Scooter Mobik
  drawSloppyZ(ctx, 56, 17, 9, "#ffffff", 2.4);
  drawTelnyashkaPatch(ctx, 48, 48, 12, 10);
  drawStGeorgeRibbon(ctx, 36, 50, 10, 6);
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 1.6;
  for (let s = -1; s <= 1; s++) {
    ctx.beginPath();
    ctx.moveTo(33 + s * 2, 82);
    ctx.lineTo(30 + s * 2, 104);
    ctx.stroke();
  }

  // Vertical Steering Stem & Handlebars at front (right side x=88..96)
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(92, 122);
  ctx.lineTo(82, 54);
  ctx.stroke();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(92, 122);
  ctx.lineTo(82, 54);
  ctx.stroke();

  // Handlebar grips & glowing red digital speedometer
  fillStrokeRoundRect(ctx, 72, 49, 20, 7, 3, "#0f172a", INK, 2.2);
  fillStrokeRoundRect(ctx, 79, 47, 7, 5, 1.5, "#ff0055", INK, 1.4);

  // Stolen Pink Supermarket Wire Basket on front of stem with stolen Kettle!
  fillStrokeRoundRect(ctx, 86, 68, 22, 18, 3, "#ec4899", INK, 2.2);
  fillStrokeEllipse(ctx, 97, 66, 7, 6, "#f8fafc", INK, 1.8);
  drawSloppyZ(ctx, 97, 77, 8, "#ffffff", 2);

  // Loaded RPG-7 Launcher Taped to Handlebars with Bright Blue Isolenta!
  ctx.save();
  ctx.translate(82, 60);
  ctx.rotate(-0.12);
  fillStrokeRoundRect(ctx, -18, -4, 34, 7, 2, "#5c4033", INK, 2.2);
  // Conical green RPG-7 warhead sticking out the front
  ctx.beginPath();
  ctx.moveTo(16, -4);
  ctx.lineTo(30, -9);
  ctx.lineTo(38, 0);
  ctx.lineTo(30, 8);
  ctx.lineTo(16, 3);
  ctx.closePath();
  ctx.fillStyle = "#4d6b3c";
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // Blue Isolenta straps holding RPG to scooter stem
  fillStrokeRoundRect(ctx, -4, -6, 6, 12, 1.5, "#0077ff", INK, 1.6);
  fillStrokeRoundRect(ctx, 8, -6, 6, 12, 1.5, "#0077ff", INK, 1.6);
  ctx.restore();

  ctx.restore();
  return c;
}

/**
 * 4. Chinese Desertcross-1000-3 Assault Golf Cart (`cart`, `cart_0`, `cart_1`)
 */
function buildGolfCartFrame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): HTMLCanvasElement {
  const W = 156;
  const H = 144;
  const [c, ctx] = makeCanvas(W, H);
  const bounce = frame === 0 ? 0 : -2.5;

  ctx.save();
  ctx.translate(0, bounce);

  // Stolen White Porcelain Toilet Bowl strapped to rear cargo rack
  ctx.save();
  ctx.translate(124, 46);
  fillStrokeRoundRect(ctx, -6, -16, 14, 18, 3, "#f8fafc", INK, 2.4);
  fillStrokeEllipse(ctx, 6, -2, 11, 8, "#ffffff", INK, 2.4);
  fillStrokeEllipse(ctx, 6, -3, 7, 4.5, "#38bdf8", INK, 1.5);
  ctx.strokeStyle = "#e63946";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(14, 4);
  ctx.stroke();
  ctx.restore();

  if (baseImg) {
    ctx.drawImage(baseImg, 8, 14, 138, 126);
  }

  // Welded Rebar "Cope Cage" ("Мангал") anti-drone mesh mounted above the golf cart roof
  ctx.save();
  ctx.strokeStyle = "#33393f";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(40, 29);
  ctx.lineTo(40, 14);
  ctx.moveTo(86, 17);
  ctx.lineTo(86, 4);
  ctx.moveTo(126, 26);
  ctx.lineTo(126, 12);
  ctx.moveTo(80, 42);
  ctx.lineTo(80, 26);
  ctx.moveTo(40, 14);
  ctx.lineTo(86, 4);
  ctx.lineTo(126, 12);
  ctx.lineTo(80, 26);
  ctx.closePath();
  ctx.stroke();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = "#64748b";
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.moveTo(40 + t * 46, 14 - t * 10);
    ctx.lineTo(80 + t * 46, 26 - t * 14);
    ctx.stroke();
  }
  fillStrokeEllipse(ctx, 84, 15, 18, 5, "#4a5d32", INK, 1.8, -0.15);
  ctx.restore();

  drawSloppyZ(ctx, 36, 86, 16, "#ffffff", 3.4);
  drawStGeorgeRibbon(ctx, 84, 96, 28, 6);
  drawSloppyZ(ctx, 61, 44, 6, "#ffffff", 1.8);
  drawSloppyZ(ctx, 97, 46, 6, "#ffffff", 1.8);

  if (frame === 1) {
    ctx.fillStyle = "#5c4732";
    ctx.beginPath();
    ctx.arc(32, 124, 3.5, 0, Math.PI * 2);
    ctx.arc(76, 134, 4, 0, Math.PI * 2);
    ctx.arc(132, 114, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return c;
}

/**
 * 4B. NEW: UAZ-452 "Bukhanka" ("Tactical Loaf") Van (`bukhanka`, `bukhanka_0`, `bukhanka_1`)
 * Iconic 1965 Soviet loaf van in 3/4 isometric perspective with:
 * - Raw birch & pine logs strapped to the front bumper and side panels as improvised armor,
 * - Welded roof Cope Cage ("Мангал") topped with a stolen rolled-up Persian wall carpet ("Бабушкин ковёр"),
 * - Taped round Soviet headlights, rusty seams, St. George ribbon, and bold "БУХАНКА Z" stencil!
 */
function buildBukhankaFrame(frame: 0 | 1): HTMLCanvasElement {
  const W = 164;
  const H = 148;
  const [c, ctx] = makeCanvas(W, H);
  const bounce = frame === 0 ? 0 : -2.5;

  ctx.save();
  ctx.translate(0, bounce);

  // Off-road knobby mud tires with suspension bounce
  const wheelY = frame === 0 ? 116 : 118;
  fillStrokeEllipse(ctx, 44, wheelY, 18, 15, "#1c1f24", INK, 3.5);
  fillStrokeEllipse(ctx, 44, wheelY, 8, 7, "#6b7280", INK, 2);
  fillStrokeEllipse(ctx, 118, wheelY, 18, 15, "#1c1f24", INK, 3.5);
  fillStrokeEllipse(ctx, 118, wheelY, 8, 7, "#6b7280", INK, 2);

  // Rounded Loaf Van Body (3/4 perspective facing right/front-right)
  const hullGrad = ctx.createLinearGradient(18, 34, 144, 114);
  hullGrad.addColorStop(0, "#607346");
  hullGrad.addColorStop(0.55, "#4b5b36");
  hullGrad.addColorStop(1, "#354225");
  fillStrokeRoundRect(ctx, 18, 36, 126, 76, 18, hullGrad, INK, 3.5);

  // Lighter Olive Roof Cap with panel ribs
  fillStrokeRoundRect(ctx, 22, 32, 116, 20, 10, "#748858", INK, 2.8);
  // Rusty body seam & wheel arches
  ctx.strokeStyle = "#7c2d12";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(20, 82);
  ctx.lineTo(142, 82);
  ctx.stroke();

  // Split Front Windshield & Side Windows with chicken-wire mesh
  fillStrokeRoundRect(ctx, 108, 46, 30, 24, 5, "#334155", INK, 2.6);
  fillStrokeRoundRect(ctx, 74, 48, 26, 20, 4, "#1e293b", INK, 2.4);
  // Mobik driver helmet peeking in cab window
  fillStrokeEllipse(ctx, 88, 58, 8, 6, "#4a5d32", INK, 1.8);
  drawSloppyZ(ctx, 88, 57, 5, "#ffffff", 1.5);

  // Iconic Round UAZ-452 Headlights on front nose with black tape X
  fillStrokeEllipse(ctx, 140, 84, 6.5, 7.5, "#fef08a", INK, 2.4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(136, 80);
  ctx.lineTo(144, 88);
  ctx.moveTo(144, 80);
  ctx.lineTo(136, 88);
  ctx.stroke();

  // IMPROVISED BIRCH & PINE LOG ARMOR strapped across the side doors & front bumper!
  for (let ly = 72; ly <= 96; ly += 8) {
    // White birch bark log with black knots
    fillStrokeRoundRect(ctx, 26, ly, 72, 7.5, 3, "#e2e8f0", INK, 2);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(38, ly + 2, 5, 2.5);
    ctx.fillRect(62, ly + 3, 6, 2.5);
    ctx.fillRect(82, ly + 1.5, 4, 2.5);
    // Cut wood grain end-cap
    fillStrokeEllipse(ctx, 98, ly + 3.7, 3, 3.7, "#d97706", INK, 1.6);
  }
  // Blue Isolenta straps holding the birch logs onto the van doors
  fillStrokeRoundRect(ctx, 40, 70, 7, 29, 1.5, "#0077ff", INK, 1.6);
  fillStrokeRoundRect(ctx, 78, 70, 7, 29, 1.5, "#0077ff", INK, 1.6);

  // Front vertical pine log bumper armor
  for (let lx = 128; lx <= 142; lx += 7) {
    fillStrokeRoundRect(ctx, lx, 88, 6.5, 22, 2, "#92400e", INK, 1.8);
  }

  // Welded Rebar Roof Cope Cage ("Мангал") + Stolen Rolled-up Grandma's Persian Carpet!
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(28, 34);
  ctx.lineTo(28, 16);
  ctx.lineTo(126, 16);
  ctx.lineTo(126, 34);
  ctx.stroke();
  // Rolled-up crimson & gold ornamental Persian carpet tied to cope cage
  fillStrokeRoundRect(ctx, 36, 18, 76, 12, 5, "#991b1b", INK, 2.4);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 21, 60, 6);
  fillStrokeEllipse(ctx, 112, 24, 4, 6, "#fef08a", INK, 2);

  // Bold White "Z" & "БУХАНКА" Stencil + St. George Ribbon
  drawStGeorgeRibbon(ctx, 26, 52, 42, 6);
  drawSloppyZ(ctx, 118, 86, 14, "#ffffff", 3.2);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 9px monospace";
  ctx.fillText("БУХАНКА", 26, 67);

  ctx.restore();
  return c;
}

/**
 * 4C. NEW: MT-LB 2M-3 "Franken-Tank" (`mtlb`, `mtlb_0`, `mtlb_1`)
 * Low-slung tracked Soviet MT-LB artillery tractor welded with a towering,
 * top-heavy 1950s battleship-grey 2M-3 twin-25mm Naval Ship Turret!
 */
function buildMtlbFrame(frame: 0 | 1): HTMLCanvasElement {
  const W = 168;
  const H = 160;
  const [c, ctx] = makeCanvas(W, H);
  const rumble = frame === 0 ? 0 : -2;

  ctx.save();
  ctx.translate(0, rumble);

  // Continuous Tracked Running Gear with road wheels
  fillStrokeRoundRect(ctx, 16, 116, 132, 28, 12, "#1e2229", INK, 3.5);
  for (let wx = 32; wx <= 132; wx += 20) {
    fillStrokeEllipse(ctx, wx + (frame === 1 ? 1.5 : 0), 130, 8.5, 8.5, "#4b5563", INK, 2.2);
    fillStrokeEllipse(ctx, wx, 130, 3, 3, "#9ca3af", INK, 1.4);
  }

  // Low-Slung Sloped Olive MT-LB Armored Hull
  ctx.beginPath();
  ctx.moveTo(14, 118);
  ctx.lineTo(22, 86);
  ctx.lineTo(124, 84);
  ctx.lineTo(154, 102);
  ctx.lineTo(148, 120);
  ctx.closePath();
  const hullGrad = ctx.createLinearGradient(14, 84, 154, 120);
  hullGrad.addColorStop(0, "#5c6e46");
  hullGrad.addColorStop(1, "#3b472c");
  ctx.fillStyle = hullGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.stroke();

  // Improvised Black Rubber Conveyor-Belt Flaps hanging over tracks
  for (let fx = 22; fx <= 126; fx += 18) {
    fillStrokeRoundRect(ctx, fx, 112, 15, 9, 1.5, "#27272a", INK, 1.8);
  }

  // St. George Ribbon & Sloppy White "Z" on MT-LB hull side
  drawStGeorgeRibbon(ctx, 74, 96, 48, 6.5);
  drawSloppyZ(ctx, 52, 102, 15, "#ffffff", 3.2);

  // Rusty Welded Cylindrical Adapter Collar on rear deck
  fillStrokeRoundRect(ctx, 38, 64, 44, 24, 4, "#7c2d12", INK, 2.8);
  // Sloppy weld bead rivets
  ctx.fillStyle = "#facc15";
  for (let rx = 44; rx <= 76; rx += 8) {
    ctx.fillRect(rx, 83, 3, 3);
  }

  // TOWERING 1950s SOVIET NAVAL 2M-3 TWIN-25MM SHIP TURRET (Mismatched Battleship Grey!)
  // Twin long 25mm autocannon barrels pointing forward-right
  ctx.save();
  ctx.translate(78, 42);
  ctx.rotate(frame === 0 ? -0.04 : -0.08);
  fillStrokeRoundRect(ctx, 6, -9, 58, 5.5, 2, "#334155", INK, 2.2);
  fillStrokeRoundRect(ctx, 6, 1, 58, 5.5, 2, "#1e293b", INK, 2.2);
  // Twin Muzzle Flash on Frame 1
  if (frame === 1) {
    fillStrokeEllipse(ctx, 69, -6, 8, 4.5, "#ffd60a", "#ff5400", 2);
    fillStrokeEllipse(ctx, 69, 4, 8, 4.5, "#ffd60a", "#ff5400", 2);
  }
  ctx.restore();

  // Bulbous Beehive Naval Turret Cupola in Battleship Blue-Grey
  ctx.beginPath();
  ctx.moveTo(32, 66);
  ctx.quadraticCurveTo(30, 18, 60, 16);
  ctx.quadraticCurveTo(90, 18, 88, 66);
  ctx.closePath();
  const navGrad = ctx.createLinearGradient(32, 16, 88, 66);
  navGrad.addColorStop(0, "#94a3b8");
  navGrad.addColorStop(0.6, "#64748b");
  navGrad.addColorStop(1, "#475569");
  ctx.fillStyle = navGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.stroke();

  // Naval Anchor & "ВМФ Z" Stencil on the Ship Turret
  drawSloppyZ(ctx, 58, 44, 13, "#ffffff", 2.8);
  ctx.fillStyle = "#fef08a";
  ctx.font = "bold 8px monospace";
  ctx.fillText("ВМФ", 49, 29);

  ctx.restore();
  return c;
}

/**
 * 5. Tsar-Mangal / Blyatmobile Barn-Armored Turtle Tank (`turtle`, `turtle_0`, `turtle_1`)
 */
function buildTurtleTankFrame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): HTMLCanvasElement {
  const W = 156;
  const H = 154;
  const [c, ctx] = makeCanvas(W, H);
  const rumble = frame === 0 ? 0 : -2;

  ctx.save();
  ctx.translate(0, rumble);

  fillStrokeRoundRect(ctx, 102, 10, 12, 22, 2, "#9a3412", INK, 2.5);
  fillStrokeEllipse(
    ctx,
    112 + frame * 4,
    6 - frame * 2,
    frame === 0 ? 7 : 10,
    frame === 0 ? 5 : 8,
    "rgba(40, 44, 48, 0.8)",
    INK,
    1.8,
  );
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(74, 20);
  ctx.lineTo(68, 4);
  ctx.moveTo(80, 18);
  ctx.lineTo(86, 3);
  ctx.stroke();
  fillStrokeEllipse(ctx, 68, 4, 4, 3, "#facc15", INK, 1.5);
  fillStrokeEllipse(ctx, 86, 3, 4, 3, "#facc15", INK, 1.5);

  if (baseImg) {
    ctx.drawImage(baseImg, 10, 14, 136, 136);
  }

  ctx.save();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(12, 62, 34, 28);
  for (let gx = 16; gx < 44; gx += 7) {
    ctx.beginPath();
    ctx.moveTo(gx, 62);
    ctx.lineTo(gx + 4, 90);
    ctx.stroke();
  }
  ctx.restore();

  drawStGeorgeRibbon(ctx, 74, 98, 42, 7);

  fillStrokeRoundRect(ctx, 98, 56, 18, 28, 2, "#2563eb", INK, 2);
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(107, 65, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  return c;
}

/**
 * 6. Storm-Z / OMON Riot Shield Trooper (`riot`, `riot_0`, `riot_1`)
 */
function buildRiotTrooperFrame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): HTMLCanvasElement {
  const W = 96;
  const H = 168;
  const [c, ctx] = makeCanvas(W, H);
  const bob = frame === 0 ? 0 : -2.5;

  ctx.save();
  ctx.translate(0, bob);

  if (baseImg) {
    ctx.drawImage(baseImg, 10, 4, 76, 160);
  }

  drawSloppyZ(ctx, 47, 16, 8, "#ffffff", 2.2);
  drawStGeorgeRibbon(ctx, 64, 38, 14, 6);

  ctx.save();
  ctx.translate(42, 82);
  ctx.rotate(0.08);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 9px monospace";
  ctx.fillText("ОМОН", -14, -22);

  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(16, 14);
  ctx.lineTo(-16, 14);
  ctx.closePath();
  ctx.fillStyle = "#ffd60a";
  ctx.fill();
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 3;
  ctx.stroke();

  drawSloppyZ(ctx, 0, 4, 11, "#111111", 2.6);
  ctx.restore();

  ctx.restore();
  return c;
}

function buildDirectionalShieldArcTexture(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(48, 36);
  ctx.strokeStyle = "rgba(255, 214, 10, 0.75)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(18, 18, 15, -Math.PI * 0.42, Math.PI * 0.42);
  ctx.stroke();
  return c;
}

/**
 * 7. Geran-2 / Lancet Kamikaze Drone (`kamikaze`, `kamikaze_0`, `kamikaze_1`)
 */
function buildKamikazeDroneFrame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): HTMLCanvasElement {
  const W = 136;
  const H = 108;
  const [c, ctx] = makeCanvas(W, H);

  if (baseImg) {
    ctx.drawImage(baseImg, 4, 5, 128, 98);
  }

  const rotors = [
    [29, 17],
    [108, 20],
    [21, 72],
    [108, 74],
  ];
  for (const [rx, ry] of rotors) {
    ctx.save();
    ctx.translate(rx!, ry!);
    ctx.strokeStyle = frame === 0 ? "rgba(226, 232, 240, 0.55)" : "rgba(56, 189, 248, 0.55)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, frame === 0 ? 18 : 14, frame === 0 ? 8 : 6, -0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawSloppyZ(ctx, 68, 40, 12, "#ffffff", 2.8);

  ctx.save();
  ctx.translate(58, 78);
  ctx.rotate(0.18);
  fillStrokeRoundRect(ctx, -16, -12, 7, 24, 1.5, "#0077ff", INK, 1.6);
  fillStrokeRoundRect(ctx, 4, -12, 7, 24, 1.5, "#0077ff", INK, 1.6);
  ctx.restore();

  if (frame === 1) {
    fillStrokeEllipse(ctx, 61, 59, 5.5, 5.5, "#ffea00", "#ff0000", 2);
  }

  return c;
}

/**
 * 8. Conscript K9 Recon Hound (`k9`, `k9_0`, `k9_1`)
 */
function buildK9Frame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): HTMLCanvasElement {
  const W = 112;
  const H = 138;
  const [c, ctx] = makeCanvas(W, H);
  const bob = frame === 0 ? 0 : -3;

  ctx.save();
  ctx.translate(0, bob);

  ctx.save();
  ctx.translate(62, 18);
  fillStrokeRoundRect(ctx, -4, 0, 8, 10, 2, "#94a3b8", INK, 2);
  ctx.strokeStyle = frame === 0 ? "#38bdf8" : "#ffd60a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -3, frame === 0 ? 6 : 10, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();

  if (baseImg) {
    ctx.drawImage(baseImg, 7, 6, 98, 128);
  }

  drawStGeorgeRibbon(ctx, 46, 28, 24, 5.5);
  drawSloppyZ(ctx, 56, 42, 11, "#ffffff", 2.6);

  ctx.save();
  ctx.translate(38, 72);
  ctx.rotate(-0.12);
  fillStrokeEllipse(ctx, 0, 0, 14, 8, "#4a5d32", INK, 2.5);
  drawSloppyZ(ctx, 0, -1, 6, "#ffffff", 1.8);
  ctx.restore();

  ctx.restore();
  return c;
}

/**
 * 9. Inflatable S-400 Triumph Decoy Boss (`boss`, `boss_0`, `boss_1`)
 */
function buildInflatableBossFrame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): HTMLCanvasElement {
  const W = 188;
  const H = 196;
  const [c, ctx] = makeCanvas(W, H);
  const sx = frame === 0 ? 1 : 1.035;
  const sy = frame === 0 ? 1 : 0.965;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(sx, sy);
  ctx.translate(-W / 2, -H / 2);

  ctx.save();
  ctx.translate(164, 122);
  fillStrokeRoundRect(ctx, -6, -7, 18, 14, 3, "#facc15", INK, 2.8);
  fillStrokeEllipse(ctx, 12, 0, 4.5, 9, "#eab308", INK, 2.5);
  ctx.rotate(frame === 0 ? 0.18 : -0.14);
  fillStrokeRoundRect(ctx, -4, 9, 26, 12, 2, "#ffffff", INK, 2);
  ctx.fillStyle = "#dc2626";
  ctx.font = "bold 6px monospace";
  ctx.fillText("SALE!", -1, 17);
  ctx.restore();

  if (baseImg) {
    ctx.drawImage(baseImg, 10, 8, 162, 180);
  }

  ctx.save();
  ctx.translate(118, 114);
  ctx.rotate(-0.12);
  ctx.fillStyle = "#fef08a";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.font = "bold 15px monospace";
  ctx.strokeText("С-400 Z", -28, 0);
  ctx.fillText("С-400 Z", -28, 0);
  ctx.restore();

  ctx.restore();
  return c;
}

/**
 * 10. Big Zombie Prigožin Clone (`prigozhin`, `prigozhin_0`, `prigozhin_1`)
 */
function buildPrigozhinFrame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
): HTMLCanvasElement {
  const W = 188;
  const H = 216;
  const [c, ctx] = makeCanvas(W, H);
  const bob = frame === 0 ? 0 : -4;
  const tilt = frame === 0 ? -0.025 : 0.025;

  ctx.save();
  ctx.translate(W / 2, H / 2 + bob);
  ctx.rotate(tilt);
  ctx.translate(-W / 2, -H / 2);

  if (baseImg) {
    ctx.drawImage(baseImg, 4, 3, 180, 210);
  }

  if (frame === 1) {
    fillStrokeEllipse(ctx, 82, 44, 4, 4, "#39ff14", "#ff0033", 1.5);
    fillStrokeEllipse(ctx, 106, 44, 4, 4, "#39ff14", "#ff0033", 1.5);
  }

  ctx.restore();
  return c;
}

/**
 * 11. NEW: Dynamic Battle-Damaged State Compositor (< 50% HP -> `<key>_dmg_0` & `<key>_dmg_1`)
 * Composites torn/collapsed anti-drone Cope Cages, blackened shell craters,
 * splintered armor, hissing Blue Isolenta patches, and 2-frame flickering open flames!
 */
function buildDamagedVariant(
  healthyCanvas: HTMLCanvasElement,
  baseKey: string,
  frame: 0 | 1,
): HTMLCanvasElement {
  const W = healthyCanvas.width;
  const H = healthyCanvas.height;
  const [c, ctx] = makeCanvas(W, H);

  ctx.drawImage(healthyCanvas, 0, 0);

  const cx = W * 0.52;
  const cy = H * 0.54;

  // 1. Scorched soot & jagged shrapnel craters on hull/shield
  ctx.save();
  fillStrokeEllipse(ctx, cx - 14, cy + 6, 16, 11, "rgba(15, 18, 22, 0.72)", "#27272a", 2, -0.2);
  fillStrokeEllipse(ctx, cx + 16, cy - 8, 13, 9, "rgba(15, 18, 22, 0.68)", "#27272a", 1.8, 0.25);

  // Glowing hot orange/red shrapnel cracks inside impact craters
  ctx.strokeStyle = frame === 0 ? "#ff5400" : "#ffd60a";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy + 4);
  ctx.lineTo(cx - 8, cy + 9);
  ctx.lineTo(cx - 14, cy + 14);
  ctx.moveTo(cx + 10, cy - 11);
  ctx.lineTo(cx + 22, cy - 5);
  ctx.stroke();

  // 2. Bent, half-torn-off Rebar Cope Cage ("Мангал") struts hanging askew on vehicles
  if (baseKey === "cart" || baseKey === "turtle" || baseKey === "bukhanka" || baseKey === "mtlb") {
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(W * 0.28, H * 0.22);
    ctx.lineTo(W * 0.48, H * 0.08 + (frame === 1 ? 3 : 0));
    ctx.lineTo(W * 0.76, H * 0.28);
    ctx.stroke();

    // Flickering 2-Frame Open Engine/Roof Flame Tongue!
    const fx = W * 0.46;
    const fy = H * 0.36;
    const flameH = frame === 0 ? 24 : 31;
    // Outer orange-red flame
    ctx.beginPath();
    ctx.moveTo(fx - 13, fy);
    ctx.quadraticCurveTo(fx - 16, fy - flameH * 0.6, fx + (frame === 0 ? -3 : 4), fy - flameH);
    ctx.quadraticCurveTo(fx + 16, fy - flameH * 0.5, fx + 13, fy);
    ctx.closePath();
    ctx.fillStyle = "#ff4500";
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner bright yellow flame core
    ctx.beginPath();
    ctx.moveTo(fx - 6, fy - 2);
    ctx.quadraticCurveTo(fx, fy - flameH * 0.72, fx + 6, fy - 2);
    ctx.closePath();
    ctx.fillStyle = "#ffd60a";
    ctx.fill();
  } else if (baseKey === "boss") {
    // Inflatable S-400 (<50% HP): Desperate Blue Isolenta X-patches over hissing air punctures!
    fillStrokeRoundRect(ctx, cx - 22, cy - 16, 18, 6, 1.5, "#0077ff", INK, 1.6);
    fillStrokeRoundRect(ctx, cx - 16, cy - 22, 6, 18, 1.5, "#0077ff", INK, 1.6);
    // Hissing white air jet lines
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - 13, cy - 13);
    ctx.lineTo(cx - 28 - frame * 6, cy - 28 - frame * 4);
    ctx.moveTo(cx - 10, cy - 15);
    ctx.lineTo(cx - 18 - frame * 4, cy - 32 - frame * 5);
    ctx.stroke();
  } else {
    // Riot / Prigozhin damaged sparks & fire
    fillStrokeEllipse(
      ctx,
      cx,
      cy - 12,
      frame === 0 ? 8 : 11,
      frame === 0 ? 12 : 16,
      "#ff5400",
      INK,
      1.8,
    );
    fillStrokeEllipse(ctx, cx, cy - 10, 4, 7, "#ffd60a", INK, 1.2);
  }

  ctx.restore();
  return c;
}

/**
 * 12. General Petr Pavel (`pavel-loud` & `pavel-stealth`)
 */
function buildHeroFrame(
  baseImg: HTMLImageElement | HTMLCanvasElement | null,
  frame: 0 | 1,
  isLoud: boolean,
): HTMLCanvasElement {
  const w = baseImg ? baseImg.width : 90;
  const h = baseImg ? baseImg.height : 138;
  const [c, ctx] = makeCanvas(w + 12, h + 8);
  const bob = frame === 0 ? 0 : -2;

  ctx.save();
  ctx.translate(6, 4 + bob);
  if (baseImg) {
    ctx.drawImage(baseImg, 0, 0);
  }
  if (isLoud && frame === 1) {
    fillStrokeEllipse(ctx, w - 4, h * 0.56, 5, 3.5, "#ffd60a", "#ff7b00", 1.5);
  }
  ctx.restore();
  return c;
}

function buildDragonTeethProp(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(112, 92);
  const drawPyramid = (px: number, py: number, s: number) => {
    ctx.beginPath();
    ctx.moveTo(px, py - s);
    ctx.lineTo(px + s * 0.95, py + s * 0.55);
    ctx.lineTo(px - s * 0.15, py + s * 0.85);
    ctx.lineTo(px - s * 0.95, py + s * 0.45);
    ctx.closePath();
    ctx.fillStyle = "#94a3b8";
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(px, py - s);
    ctx.lineTo(px + s * 0.95, py + s * 0.55);
    ctx.lineTo(px - s * 0.15, py + s * 0.85);
    ctx.closePath();
    ctx.fillStyle = "rgba(30, 41, 59, 0.35)";
    ctx.fill();

    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(px, py - s - 2, 4, Math.PI, 0);
    ctx.stroke();
  };

  drawPyramid(34, 48, 22);
  drawPyramid(76, 54, 24);
  return c;
}

export function installUpgradedGraphics(scene: Phaser.Scene) {
  const tex = scene.textures;

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

  const registerPair = (
    baseKey: string,
    f0: HTMLCanvasElement,
    f1: HTMLCanvasElement,
    withDamage = false,
  ) => {
    registerCanvas(tex, baseKey, f0);
    registerCanvas(tex, `${baseKey}_0`, f0);
    registerCanvas(tex, `${baseKey}_1`, f1);
    if (withDamage) {
      registerCanvas(tex, `${baseKey}_dmg_0`, buildDamagedVariant(f0, baseKey, 0));
      registerCanvas(tex, `${baseKey}_dmg_1`, buildDamagedVariant(f1, baseKey, 1));
    }
  };

  registerPair(
    "conscript",
    buildConscriptFrame(srcConscript, 0),
    buildConscriptFrame(srcConscript, 1),
    false,
  );
  registerPair("tiktok", buildTikTokFrame(srcTikTok, 0), buildTikTokFrame(srcTikTok, 1), false);
  registerPair(
    "scooter",
    buildScooterFrame(srcConscript, 0),
    buildScooterFrame(srcConscript, 1),
    false,
  );
  registerPair("cart", buildGolfCartFrame(srcCart, 0), buildGolfCartFrame(srcCart, 1), true);
  registerPair("bukhanka", buildBukhankaFrame(0), buildBukhankaFrame(1), true);
  registerPair("mtlb", buildMtlbFrame(0), buildMtlbFrame(1), true);
  registerPair(
    "turtle",
    buildTurtleTankFrame(srcTurtle, 0),
    buildTurtleTankFrame(srcTurtle, 1),
    true,
  );
  registerPair("riot", buildRiotTrooperFrame(srcRiot, 0), buildRiotTrooperFrame(srcRiot, 1), true);
  registerPair(
    "kamikaze",
    buildKamikazeDroneFrame(srcKamikaze, 0),
    buildKamikazeDroneFrame(srcKamikaze, 1),
    false,
  );
  registerPair("k9", buildK9Frame(srcK9, 0), buildK9Frame(srcK9, 1), false);
  registerPair(
    "boss",
    buildInflatableBossFrame(srcBoss, 0),
    buildInflatableBossFrame(srcBoss, 1),
    true,
  );
  registerPair(
    "prigozhin",
    buildPrigozhinFrame(srcPrigozhin, 0),
    buildPrigozhinFrame(srcPrigozhin, 1),
    true,
  );

  registerPair(
    "pavel-loud",
    buildHeroFrame(srcPavelLoud, 0, true),
    buildHeroFrame(srcPavelLoud, 1, true),
    false,
  );
  registerPair(
    "pavel-stealth",
    buildHeroFrame(srcPavelStealth, 0, false),
    buildHeroFrame(srcPavelStealth, 1, false),
    false,
  );

  registerCanvas(tex, "shield", buildDirectionalShieldArcTexture());
  registerCanvas(tex, "dragon_teeth", buildDragonTeethProp());
}
