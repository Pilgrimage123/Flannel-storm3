import * as Phaser from "phaser";
import { bus } from "../eventBus";
import {
  computeBallisticStep,
  computeExplosionFrame,
  computeExplosionRecipe,
  type CraterSize,
  type ExplosionStyle,
  type FireballVariant,
  type ShockwaveVariant,
} from "../fx/explosionProfiles";
import { installExplosionTextures } from "../fx/ExplosionTextures";

type ParticleKind = "blast" | "flash" | "ring" | "smoke" | "debris" | "spark";

interface ParticleSlot {
  active: boolean;
  kind: ParticleKind;
  sprite: Phaser.GameObjects.Sprite;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  drag: number;
  rotSpeed: number;
  startScale: number;
  endScale: number;
  startAlpha: number;
  variant: FireballVariant;
  frameCount: number;
  lastFrame: number;
  // Ballistic debris pseudo-3D height state
  groundY: number;
  z: number;
  vz: number;
  gravity: number;
  bounce: number;
  smokeTrail: boolean;
  trailAcc: number;
}

interface CraterSlot {
  active: boolean;
  sprite: Phaser.GameObjects.Sprite;
  life: number;
  maxLife: number;
}

interface PendingBurst {
  active: boolean;
  delay: number;
  x: number;
  y: number;
  scale: number;
  variant: FireballVariant;
  tint: number | null;
  ring: ShockwaveVariant | null;
}

const PARTICLE_POOL_SIZE = 280;
const CRATER_POOL_SIZE = 38;
const PENDING_BURST_POOL_SIZE = 36;

export class FxSystem {
  private scene: Phaser.Scene;
  private fxGroup: Phaser.GameObjects.Group;
  private floaters: Phaser.GameObjects.Text[] = [];
  private particles: ParticleSlot[] = [];
  private particleCursor = 0;
  private craters: CraterSlot[] = [];
  private craterCursor = 0;
  private pendingBursts: PendingBurst[] = [];
  private flashOverlay: Phaser.GameObjects.Rectangle | null = null;
  private flashLife = 0;
  private flashMaxLife = 0.14;
  private flashStartAlpha = 0;
  private explosionSeq = 1;
  private onImpact?: (hitstopSec: number) => void;
  private lastHeavyCueAt = 0;

  constructor(
    scene: Phaser.Scene,
    fxGroup: Phaser.GameObjects.Group,
    onImpact?: (hitstopSec: number) => void,
  ) {
    this.scene = scene;
    this.fxGroup = fxGroup;
    this.onImpact = onImpact;
  }

  init() {
    this.paintFx();
    installExplosionTextures(this.scene.textures);

    this.floaters = [];
    for (let i = 0; i < 60; i++) {
      const t = this.scene.add
        .text(0, 0, "", {
          fontFamily: '"Press Start 2P", "Courier New", monospace',
          fontSize: "13px",
          fontStyle: "bold",
          color: "#ffe66d",
          stroke: "#10140d",
          strokeThickness: 4,
        })
        .setActive(false)
        .setVisible(false)
        .setDepth(4000)
        .setOrigin(0.5, 1);
      this.floaters.push(t);
    }

    // Pre-allocated zero-GC particle pool
    this.particles = [];
    this.particleCursor = 0;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const sprite = this.scene.add
        .sprite(-1000, -1000, "spark")
        .setActive(false)
        .setVisible(false)
        .setDepth(3750);
      this.particles.push({
        active: false,
        kind: "spark",
        sprite,
        life: 0,
        maxLife: 0.3,
        vx: 0,
        vy: 0,
        drag: 1,
        rotSpeed: 0,
        startScale: 1,
        endScale: 1,
        startAlpha: 1,
        variant: "fire_a",
        frameCount: 6,
        lastFrame: -1,
        groundY: 0,
        z: 0,
        vz: 0,
        gravity: 560,
        bounce: 0.42,
        smokeTrail: false,
        trailAcc: 0,
      });
    }

    // Pre-allocated ground scorch crater ring buffer (sits cleanly below shadows & units)
    this.craters = [];
    this.craterCursor = 0;
    for (let i = 0; i < CRATER_POOL_SIZE; i++) {
      const sprite = this.scene.add
        .sprite(-1000, -1000, "crater_md")
        .setActive(false)
        .setVisible(false)
        .setDepth(3);
      this.craters.push({
        active: false,
        sprite,
        life: 0,
        maxLife: 16,
      });
    }

    // Pre-allocated secondary cascade queue
    this.pendingBursts = [];
    for (let i = 0; i < PENDING_BURST_POOL_SIZE; i++) {
      this.pendingBursts.push({
        active: false,
        delay: 0,
        x: 0,
        y: 0,
        scale: 1,
        variant: "fire_a",
        tint: null,
        ring: null,
      });
    }

    // Subtle full-viewport impact flash overlay (non-blocking, fades in ~120ms)
    this.flashOverlay = this.scene.add
      .rectangle(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2,
        this.scene.scale.width + 64,
        this.scene.scale.height + 64,
        0xffe66d,
        0,
      )
      .setScrollFactor(0)
      .setDepth(4200)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
  }

  onResize() {
    if (this.flashOverlay) {
      this.flashOverlay.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
      this.flashOverlay.setSize(this.scene.scale.width + 64, this.scene.scale.height + 64);
    }
  }

  private paintFx() {
    const textures = this.scene.textures;
    const paint = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      if (textures.exists(key)) return;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      draw(ctx);
      textures.addCanvas(key, c);
    };

    paint("loot", 56, 18, (ctx) => {
      ctx.fillStyle = "#10160e";
      ctx.fillRect(2, 2, 52, 14);
      ctx.fillStyle = "#ffd60a";
      ctx.fillRect(0, 2, 2, 14);
      ctx.fillRect(54, 2, 2, 14);
      ctx.fillRect(2, 0, 52, 2);
      ctx.fillRect(2, 16, 52, 2);
      ctx.fillStyle = "#fff6d8";
      ctx.font = "bold 11px Courier New";
      ctx.fillText("LOOT!", 8, 13);
    });

    paint("ring", 96, 96, (ctx) => {
      ctx.fillStyle = "#7ad0ff";
      for (let a = 0; a < 48; a++) {
        const ang = (a / 48) * Math.PI * 2;
        const px = Math.round((48 + Math.cos(ang) * 36) / 2) * 2;
        const py = Math.round((48 + Math.sin(ang) * 36) / 2) * 2;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    });

    paint("brick", 18, 12, (ctx) => {
      ctx.fillStyle = "#1a0d0a";
      ctx.fillRect(0, 0, 18, 12);
      ctx.fillStyle = "#c44536";
      ctx.fillRect(2, 2, 14, 8);
      ctx.fillStyle = "#e06a56";
      ctx.fillRect(2, 2, 14, 2);
    });

    paint("flame", 48, 48, (ctx) => {
      ctx.fillStyle = "#d9381e";
      ctx.fillRect(14, 16, 20, 22);
      ctx.fillRect(18, 10, 12, 8);
      ctx.fillStyle = "#ff8c00";
      ctx.fillRect(16, 18, 16, 16);
      ctx.fillStyle = "#ffd60a";
      ctx.fillRect(20, 22, 8, 10);
    });

    paint("tire", 18, 8, (ctx) => {
      ctx.fillStyle = "rgba(38, 30, 18, 0.85)";
      ctx.fillRect(0, 2, 6, 4);
      ctx.fillRect(8, 2, 10, 4);
    });

    paint("smoke", 28, 28, (ctx) => {
      ctx.fillStyle = "rgba(34, 38, 42, 0.65)";
      ctx.fillRect(6, 4, 16, 20);
      ctx.fillRect(4, 8, 20, 12);
      ctx.fillStyle = "rgba(74, 80, 86, 0.78)";
      ctx.fillRect(8, 6, 12, 14);
      ctx.fillRect(6, 10, 16, 8);
      ctx.fillStyle = "rgba(116, 124, 130, 0.75)";
      ctx.fillRect(10, 8, 8, 6);
    });

    paint("sniff", 62, 18, (ctx) => {
      ctx.fillStyle = "#1a1208";
      ctx.fillRect(2, 2, 58, 14);
      ctx.fillStyle = "#ff9e00";
      ctx.fillRect(2, 0, 58, 2);
      ctx.fillRect(2, 16, 58, 2);
      ctx.fillStyle = "#ffd6a0";
      ctx.font = "bold 11px Courier New";
      ctx.fillText("SNIFF", 10, 13);
    });

    paint("shield", 64, 64, (ctx) => {
      ctx.fillStyle = "#0a1622";
      for (let i = -8; i <= 8; i++) {
        const ang = i * 0.1;
        const px = Math.round((32 + Math.cos(ang) * 24) / 2) * 2;
        const py = Math.round((32 + Math.sin(ang) * 24) / 2) * 2;
        ctx.fillRect(px - 4, py - 4, 8, 8);
      }
      ctx.fillStyle = "#ffd60a";
      for (let i = -7; i <= 7; i++) {
        const ang = i * 0.1;
        const px = Math.round((32 + Math.cos(ang) * 24) / 2) * 2;
        const py = Math.round((32 + Math.sin(ang) * 24) / 2) * 2;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    });

    paint("shockwave", 128, 128, (ctx) => {
      ctx.fillStyle = "#00f5d4";
      for (let a = 0; a < 64; a++) {
        const ang = (a / 64) * Math.PI * 2;
        const px = Math.round((64 + Math.cos(ang) * 56) / 2) * 2;
        const py = Math.round((64 + Math.sin(ang) * 56) / 2) * 2;
        ctx.fillRect(px - 3, py - 3, 6, 6);
      }
      ctx.fillStyle = "#ffd60a";
      for (let a = 0; a < 48; a++) {
        const ang = (a / 48) * Math.PI * 2;
        const px = Math.round((64 + Math.cos(ang) * 50) / 2) * 2;
        const py = Math.round((64 + Math.sin(ang) * 50) / 2) * 2;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    });

    paint("spark", 12, 12, (ctx) => {
      ctx.fillStyle = "#ffe66d";
      ctx.fillRect(2, 4, 8, 4);
      ctx.fillRect(4, 2, 4, 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(4, 4, 4, 4);
    });

    paint("star", 16, 16, (ctx) => {
      ctx.fillStyle = "#ffd60a";
      ctx.fillRect(6, 0, 4, 16);
      ctx.fillRect(0, 6, 16, 4);
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(6, 6, 4, 4);
    });
  }

  private allocParticle(): ParticleSlot {
    const n = this.particles.length;
    for (let i = 0; i < n; i++) {
      const idx = (this.particleCursor + i) % n;
      const slot = this.particles[idx]!;
      if (!slot.active) {
        this.particleCursor = (idx + 1) % n;
        return slot;
      }
    }
    // Ring-buffer eviction: overwrite oldest slot smoothly if saturated
    const slot = this.particles[this.particleCursor]!;
    this.particleCursor = (this.particleCursor + 1) % n;
    return slot;
  }

  private spawnFireball(
    x: number,
    y: number,
    variant: FireballVariant,
    scale: number,
    duration: number,
    tint: number | null,
    depth = 3820,
  ) {
    const slot = this.allocParticle();
    const s = slot.sprite;
    const texKey = `exp_${variant}_0`;
    s.setTexture(this.scene.textures.exists(texKey) ? texKey : "boom0");
    if (tint !== null) s.setTint(tint);
    else s.clearTint();
    s.setBlendMode(Phaser.BlendModes.NORMAL);
    s.setOrigin(0.5, variant === "geyser" ? 0.78 : 0.5);
    s.setPosition(x, y);
    s.setDepth(depth);
    s.setRotation(variant === "geyser" ? 0 : (Math.random() - 0.5) * 0.45);
    s.setFlipX(Math.random() < 0.5);
    s.setScale(scale * 0.84);
    s.setAlpha(1);
    s.setActive(true).setVisible(true);

    slot.active = true;
    slot.kind = "blast";
    slot.life = duration;
    slot.maxLife = duration;
    slot.vx = 0;
    slot.vy = variant === "geyser" ? -10 : -6;
    slot.drag = 0.94;
    slot.rotSpeed = 0;
    slot.startScale = scale * 0.84;
    slot.endScale = scale * 1.18;
    slot.startAlpha = 1;
    slot.variant = variant;
    slot.frameCount = 6;
    slot.lastFrame = 0;
    slot.smokeTrail = false;
  }

  private spawnFlash(x: number, y: number, scale: number, color: number) {
    const slot = this.allocParticle();
    const s = slot.sprite;
    s.setTexture("exp_flash");
    s.setTint(color);
    s.setBlendMode(Phaser.BlendModes.ADD);
    s.setOrigin(0.5, 0.5);
    s.setPosition(x, y);
    s.setDepth(3860);
    s.setRotation(0);
    s.setFlipX(false);
    s.setScale(scale * 0.55);
    s.setAlpha(0.95);
    s.setActive(true).setVisible(true);

    slot.active = true;
    slot.kind = "flash";
    slot.life = 0.13;
    slot.maxLife = 0.13;
    slot.vx = 0;
    slot.vy = 0;
    slot.drag = 1;
    slot.rotSpeed = 0;
    slot.startScale = scale * 0.55;
    slot.endScale = scale * 1.55;
    slot.startAlpha = 0.95;
    slot.smokeTrail = false;
  }

  private spawnSmokePlume(x: number, y: number, count: number, tint: number, spread: number) {
    for (let i = 0; i < count; i++) {
      const slot = this.allocParticle();
      const s = slot.sprite;
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;
      const life = 0.5 + Math.random() * 0.45;
      const startSc = 0.75 + Math.random() * 0.65;

      s.setTexture("smoke");
      s.setTint(tint);
      s.setBlendMode(Phaser.BlendModes.NORMAL);
      s.setOrigin(0.5, 0.5);
      s.setPosition(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist * 0.65);
      s.setDepth(3710);
      s.setRotation(Math.random() * Math.PI * 2);
      s.setFlipX(Math.random() < 0.5);
      s.setScale(startSc);
      s.setAlpha(0.72);
      s.setActive(true).setVisible(true);

      slot.active = true;
      slot.kind = "smoke";
      slot.life = life;
      slot.maxLife = life;
      slot.vx = Math.cos(ang) * (18 + Math.random() * 34);
      slot.vy = -26 - Math.random() * 34;
      slot.drag = 0.94;
      slot.rotSpeed = (Math.random() - 0.5) * 1.8;
      slot.startScale = startSc;
      slot.endScale = startSc + 1.15;
      slot.startAlpha = 0.72;
      slot.smokeTrail = false;
    }
  }

  private spawnDebris(
    x: number,
    y: number,
    key: string,
    scale: number,
    speedMin: number,
    speedMax: number,
    launchVz: number,
    smokeTrail = false,
  ) {
    const slot = this.allocParticle();
    const s = slot.sprite;
    const ang = Math.random() * Math.PI * 2;
    const spd = speedMin + Math.random() * (speedMax - speedMin);
    const life = smokeTrail ? 1.45 : 0.78 + Math.random() * 0.48;

    s.setTexture(this.scene.textures.exists(key) ? key : "deb_scrap");
    s.clearTint();
    s.setBlendMode(Phaser.BlendModes.NORMAL);
    s.setOrigin(0.5, 0.5);
    s.setPosition(x, y - 6);
    s.setDepth(smokeTrail ? 3880 : 3740);
    s.setRotation(Math.random() * Math.PI * 2);
    s.setFlipX(Math.random() < 0.5);
    s.setScale(scale);
    s.setAlpha(1);
    s.setActive(true).setVisible(true);

    slot.active = true;
    slot.kind = "debris";
    slot.life = life;
    slot.maxLife = life;
    slot.vx = Math.cos(ang) * spd;
    slot.vy = Math.sin(ang) * spd * 0.72;
    slot.drag = 0.985;
    slot.rotSpeed = (Math.random() < 0.5 ? -1 : 1) * (smokeTrail ? 9.5 : 5 + Math.random() * 9);
    slot.startScale = scale;
    slot.endScale = scale;
    slot.startAlpha = 1;
    slot.groundY = y;
    slot.z = 8;
    slot.vz = launchVz;
    slot.gravity = smokeTrail ? 490 : 620;
    slot.bounce = key === "deb_wheel" ? 0.62 : key === "deb_tag" || key === "deb_rubber" ? 0.28 : 0.42;
    slot.smokeTrail = smokeTrail;
    slot.trailAcc = 0;
  }

  private stampCrater(x: number, y: number, size: CraterSize, scale = 1) {
    if (size === "none") return;
    const slot = this.craters[this.craterCursor]!;
    this.craterCursor = (this.craterCursor + 1) % this.craters.length;

    const key = size === "lg" ? "crater_lg" : size === "md" ? "crater_md" : "crater_sm";
    const s = slot.sprite;
    s.setTexture(key);
    s.setPosition(x, y + 6);
    s.setRotation((Math.random() - 0.5) * 0.35);
    s.setFlipX(Math.random() < 0.5);
    s.setScale(Math.max(0.75, Math.min(1.65, scale * (0.9 + Math.random() * 0.25))));
    s.setAlpha(0.86);
    s.setDepth(3);
    s.setActive(true).setVisible(true);

    slot.active = true;
    slot.maxLife = size === "lg" ? 20 : size === "md" ? 15 : 11;
    slot.life = slot.maxLife;
  }

  private queueSecondaryBurst(
    delay: number,
    x: number,
    y: number,
    scale: number,
    variant: FireballVariant,
    tint: number | null,
    ring: ShockwaveVariant | null,
  ) {
    for (let i = 0; i < this.pendingBursts.length; i++) {
      const b = this.pendingBursts[i]!;
      if (!b.active) {
        b.active = true;
        b.delay = delay;
        b.x = x;
        b.y = y;
        b.scale = scale;
        b.variant = variant;
        b.tint = tint;
        b.ring = ring;
        return;
      }
    }
  }

  private triggerScreenFlash(color: number, alpha: number) {
    if (!this.flashOverlay || alpha <= 0) return;
    if (alpha < this.flashStartAlpha * (this.flashLife / Math.max(0.01, this.flashMaxLife))) return;
    this.flashOverlay.setFillStyle(color, alpha);
    this.flashOverlay.setVisible(true);
    this.flashStartAlpha = alpha;
    this.flashMaxLife = 0.14;
    this.flashLife = 0.14;
  }

  explode(x: number, y: number, scale: number, style: ExplosionStyle = "infantry") {
    const seed = this.explosionSeq++;
    const recipe = computeExplosionRecipe(style, scale, seed);

    // 1. Ground scorch crater decal
    if (recipe.crater !== "none") {
      this.stampCrater(x, y, recipe.crater, Math.min(1.5, scale * 0.78));
    }

    // 2. Blinding additive flash core
    this.spawnFlash(x, y, recipe.flashScale, recipe.flashColor);

    // 3. Primary multi-frame pixel fireball / dirt geyser / flannel nova
    this.spawnFireball(x, y, recipe.fireball, recipe.fireballScale, recipe.fireballDuration, recipe.fireballTint, 3820);

    // 4. Primary & optional secondary styled shockwave rings
    this.shockwave(x, y, recipe.shockwaveScale, recipe.shockwave);
    if (recipe.secondaryShockwave) {
      this.shockwave(x, y, recipe.secondaryShockwaveScale, recipe.secondaryShockwave);
    }

    // 5. High-velocity colored sparks & star burst
    this.sparks(x, y, recipe.sparkCount, recipe.sparkColors, recipe.sparkSpeedMin, recipe.sparkSpeedMax);

    // 6. Rising billowing smoke puffs
    this.spawnSmokePlume(x, y, recipe.smokeCount, recipe.smokeTint, 16 * Math.min(2.2, scale));

    // 7. Hero ballistic debris (e.g. spinning tank turret toss or fluttering SALE tag!)
    if (recipe.heroDebris) {
      const isTurret = recipe.heroDebris === "deb_turret";
      this.spawnDebris(
        x,
        y,
        recipe.heroDebris,
        isTurret ? 1.35 : 1.15,
        isTurret ? 35 : 65,
        isTurret ? 95 : 135,
        isTurret ? 340 + Math.random() * 80 : 210 + Math.random() * 60,
        isTurret,
      );
    }

    // 8. Scattered physical debris (tires, birch logs, toilets, sod clods, helmets, confetti)
    for (let i = 0; i < recipe.debrisCount; i++) {
      const key = recipe.debrisPool[Math.floor(Math.random() * recipe.debrisPool.length)]!;
      const debScale = 0.85 + Math.random() * 0.45;
      this.spawnDebris(x, y, key, debScale, 55, 195, 165 + Math.random() * 145, false);
    }

    // 9. Staggered secondary cook-off / chain detonations
    for (let i = 0; i < recipe.secondaryBursts; i++) {
      const ang = (i / Math.max(1, recipe.secondaryBursts)) * Math.PI * 2 + Math.random() * 0.8;
      const dist = recipe.secondarySpread * (0.45 + Math.random() * 0.65);
      const subVariant: FireballVariant =
        style === "firework"
          ? "starburst"
          : style === "inflatable"
            ? "pop"
            : style === "finale"
              ? i % 2 === 0
                ? "toxic"
                : "fire_b"
              : style === "ambush"
                ? i % 2 === 0
                  ? "flannel"
                  : "fire_a"
                : i % 2 === 0
                  ? "fire_b"
                  : "fire_c";
      const subRing: ShockwaveVariant | null = i === recipe.secondaryBursts - 1 ? recipe.shockwave : null;
      this.queueSecondaryBurst(
        recipe.secondaryDelayStep * (i + 1),
        x + Math.cos(ang) * dist,
        y + Math.sin(ang) * dist * 0.8,
        Math.max(0.65, recipe.fireballScale * (0.58 + Math.random() * 0.25)),
        subVariant,
        recipe.fireballTint,
        subRing,
      );
    }

    // 10. Optional comic callout (rate-limited for punchy readability)
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (recipe.comicPool.length > 0 && Math.random() < recipe.comicChance && now - this.lastHeavyCueAt > 420) {
      this.lastHeavyCueAt = now;
      const phrase = recipe.comicPool[Math.floor(Math.random() * recipe.comicPool.length)]!;
      this.comic(x, y - 16, phrase, recipe.comicColor);
    }

    // 11. Subtle screen flash + micro-hitstop on heavy detonations
    if (recipe.screenFlashAlpha > 0) {
      this.triggerScreenFlash(recipe.screenFlashColor, recipe.screenFlashAlpha);
    }
    if (recipe.hitstopSec > 0 && this.onImpact) {
      this.onImpact(recipe.hitstopSec);
    }
  }

  shockwave(x: number, y: number, maxScale = 1.8, variant: ShockwaveVariant = "ring_emp") {
    const slot = this.allocParticle();
    const s = slot.sprite;
    const isHiRes = this.scene.textures.exists(variant);
    const texKey = isHiRes ? variant : "shockwave";
    // 256x256 ring textures need 0.5x scale multiplier to match world radius while staying razor-sharp
    const normalizedMax = isHiRes ? Math.min(2.1, maxScale * 0.48) : maxScale;
    s.setTexture(texKey);
    s.clearTint();
    s.setBlendMode(Phaser.BlendModes.ADD);
    s.setOrigin(0.5, 0.5);
    s.setPosition(x, y);
    s.setDepth(3700);
    s.setRotation(Math.random() * Math.PI * 2);
    s.setFlipX(false);
    s.setScale(0.12);
    s.setAlpha(0.88);
    s.setActive(true).setVisible(true);

    slot.active = true;
    slot.kind = "ring";
    slot.life = 0.34;
    slot.maxLife = 0.34;
    slot.vx = 0;
    slot.vy = 0;
    slot.drag = 1;
    slot.rotSpeed = variant === "ring_flannel" || variant === "ring_toxic" ? 2.1 : 0.7;
    slot.startScale = 0.12;
    slot.endScale = Math.max(0.32, normalizedMax);
    slot.startAlpha = 0.88;
    slot.smokeTrail = false;
  }

  sparks(
    x: number,
    y: number,
    count = 5,
    colors: readonly number[] = [0xffe66d, 0xff9e00, 0xffffff],
    speedMin = 65,
    speedMax = 185,
  ) {
    for (let i = 0; i < count; i++) {
      const slot = this.allocParticle();
      const s = slot.sprite;
      const roll = Math.random();
      const isStreak = roll < 0.48 && this.scene.textures.exists("spark_streak");
      const key = isStreak ? "spark_streak" : roll < 0.76 ? "star" : "spark";
      const ang = Math.random() * Math.PI * 2;
      const spd = speedMin + Math.random() * (speedMax - speedMin);
      const life = 0.24 + Math.random() * 0.24;
      const tint = colors[i % colors.length] ?? 0xffe66d;
      const sc = isStreak ? 0.7 + Math.random() * 0.55 : 0.75 + Math.random() * 0.5;

      s.setTexture(key);
      s.setTint(tint);
      s.setBlendMode(Phaser.BlendModes.ADD);
      s.setOrigin(0.5, 0.5);
      s.setPosition(x, y);
      s.setDepth(3780);
      s.setRotation(ang);
      s.setFlipX(false);
      s.setScale(sc);
      s.setAlpha(1);
      s.setActive(true).setVisible(true);

      slot.active = true;
      slot.kind = "spark";
      slot.life = life;
      slot.maxLife = life;
      slot.vx = Math.cos(ang) * spd;
      slot.vy = Math.sin(ang) * spd;
      slot.drag = 0.92;
      slot.rotSpeed = isStreak ? 0 : 10;
      slot.startScale = sc;
      slot.endScale = isStreak ? sc * 0.35 : 0.2;
      slot.startAlpha = 1;
      slot.smokeTrail = false;
    }
  }

  puff(x: number, y: number, key: string, life: number, depth: number) {
    const s = this.fxGroup.get(x, y, key) as Phaser.GameObjects.Sprite | null;
    if (!s) return;
    s.setTexture(key);
    s.clearTint();
    s.setRotation(0);
    s.setScale(1);
    s.setActive(true).setVisible(true).setPosition(x, y).setDepth(depth);
    s.setAlpha(1);
    s.setData("life", life);
  }

  floater(x: number, y: number, text: string, color: string, scale = 1, isCrit = false) {
    const t = this.floaters.find((f) => !f.visible);
    if (!t) return;

    let spawnY = y;
    for (let pass = 0; pass < 5; pass++) {
      let crowded = false;
      for (const other of this.floaters) {
        if (!other.visible || other === t) continue;
        if (Math.abs(other.x - x) < 72 && Math.abs(other.y - spawnY) < 22) {
          crowded = true;
          break;
        }
      }
      if (!crowded) break;
      spawnY -= 22;
    }

    t.setText(text)
      .setColor(color)
      .setPosition(Math.round(x), Math.round(spawnY))
      .setVisible(true)
      .setActive(true)
      .setAlpha(1)
      .setScale(scale);

    if (isCrit) {
      t.setFontSize("15px");
      t.setStroke("#5a0000", 5);
      t.setData("life", 0.72);
      t.setData("vy", -48);
    } else {
      t.setFontSize("12px");
      t.setStroke("#10140d", 4);
      t.setData("life", 0.56);
      t.setData("vy", -34);
    }
  }

  critFloater(x: number, y: number, damage: number) {
    this.floater(x, y - 24, `CRIT ${Math.round(damage)}!`, "#ff9e00", 1.08, true);
    this.sparks(x, y - 10, 4);
  }

  comic(x: number, y: number, text: string, color = "#ffb703") {
    this.floater(x, y - 34, text, color, 1.05, true);
  }

  banner(_playerX: number, _playerY: number, text: string, color: string) {
    bus.emit("tactical-banner", { text, color });
  }

  tickFx(dt: number) {
    // 1. Tick full-screen detonation flash fade
    if (this.flashLife > 0 && this.flashOverlay) {
      this.flashLife -= dt;
      if (this.flashLife <= 0) {
        this.flashLife = 0;
        this.flashOverlay.setVisible(false);
      } else {
        const p = this.flashLife / this.flashMaxLife;
        this.flashOverlay.setAlpha(this.flashStartAlpha * p * p);
      }
    }

    // 2. Tick cascading secondary detonation queue
    for (let i = 0; i < this.pendingBursts.length; i++) {
      const b = this.pendingBursts[i]!;
      if (!b.active) continue;
      b.delay -= dt;
      if (b.delay <= 0) {
        b.active = false;
        this.spawnFlash(b.x, b.y, b.scale * 1.15, 0xfff3b0);
        this.spawnFireball(b.x, b.y, b.variant, b.scale, 0.36, b.tint, 3830);
        if (b.ring) this.shockwave(b.x, b.y, b.scale * 1.65, b.ring);
        this.sparks(b.x, b.y, 7, [0xffd60a, 0xff6b00, 0xffffff], 80, 210);
        this.spawnSmokePlume(b.x, b.y, 2, 0x2c3036, 10);
      }
    }

    // 3. Tick zero-GC pooled particles
    const dragPow = dt * 60;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]!;
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.sprite.setActive(false).setVisible(false);
        continue;
      }
      const s = p.sprite;
      const progress = 1 - p.life / p.maxLife;

      if (p.kind === "blast") {
        const frame = computeExplosionFrame(progress, p.frameCount);
        if (frame !== p.lastFrame) {
          p.lastFrame = frame;
          const key = `exp_${p.variant}_${frame}`;
          if (this.scene.textures.exists(key)) s.setTexture(key);
        }
        s.y += p.vy * dt;
        const ease = 1 - (1 - progress) * (1 - progress);
        s.setScale(p.startScale + (p.endScale - p.startScale) * ease);
        s.setAlpha(progress > 0.72 ? Math.max(0, (1 - progress) / 0.28) : 1);
      } else if (p.kind === "flash") {
        const ease = 1 - (1 - progress) * (1 - progress);
        s.setScale(p.startScale + (p.endScale - p.startScale) * ease);
        s.setAlpha(p.startAlpha * (1 - progress));
      } else if (p.kind === "ring") {
        const ease = 1 - Math.pow(1 - progress, 3);
        s.setScale(p.startScale + (p.endScale - p.startScale) * ease);
        s.setAlpha(p.startAlpha * (1 - progress));
        s.rotation += p.rotSpeed * dt;
      } else if (p.kind === "smoke") {
        const d = Math.pow(p.drag, dragPow);
        p.vx *= d;
        p.vy *= d;
        s.x += p.vx * dt;
        s.y += p.vy * dt;
        s.rotation += p.rotSpeed * dt;
        s.setScale(p.startScale + (p.endScale - p.startScale) * progress);
        s.setAlpha(p.startAlpha * (1 - progress));
      } else if (p.kind === "debris") {
        const d = Math.pow(p.drag, dragPow);
        p.vx *= d;
        p.vy *= d;
        s.x += p.vx * dt;
        p.groundY += p.vy * dt;

        const step = computeBallisticStep(p.z, p.vz, p.gravity, p.bounce, dt);
        p.z = step.z;
        p.vz = step.vz;
        if (step.bounced) {
          p.vx *= 0.68;
          p.vy *= 0.68;
          p.rotSpeed *= 0.6;
        }
        if (p.z <= 0 && p.vz === 0) {
          p.vx *= 0.85;
          p.vy *= 0.85;
          p.rotSpeed *= 0.75;
        }

        s.y = p.groundY - p.z;
        s.rotation += p.rotSpeed * dt;
        // Subtle scale swell at apex of ballistic arc (makes the Turret Toss pop!)
        const apexBoost = 1 + Math.min(0.45, p.z * 0.0032);
        s.setScale(p.startScale * apexBoost);
        s.setAlpha(progress > 0.72 ? Math.max(0, (1 - progress) / 0.28) : 1);

        if (p.smokeTrail && p.z > 8) {
          p.trailAcc += dt;
          if (p.trailAcc >= 0.055) {
            p.trailAcc = 0;
            this.puff(s.x, s.y, "smoke", 0.36, 3760);
          }
        }
      } else if (p.kind === "spark") {
        const d = Math.pow(p.drag, dragPow);
        p.vx *= d;
        p.vy *= d;
        s.x += p.vx * dt;
        s.y += p.vy * dt;
        s.rotation += p.rotSpeed * dt;
        s.setScale(p.startScale + (p.endScale - p.startScale) * progress);
        s.setAlpha(Math.max(0, 1 - progress));
      }
    }

    // 4. Tick ground craters (hold steady then softly fade out)
    for (let i = 0; i < this.craters.length; i++) {
      const c = this.craters[i]!;
      if (!c.active) continue;
      c.life -= dt;
      if (c.life <= 0) {
        c.active = false;
        c.sprite.setActive(false).setVisible(false);
      } else if (c.life < 3.0) {
        c.sprite.setAlpha((c.life / 3.0) * 0.86);
      }
    }

    // 5. Tick legacy fxGroup items (vehicle exhaust smoke, dash tire marks)
    const kids = this.fxGroup.getChildren() as Phaser.GameObjects.Sprite[];
    for (const s of kids) {
      if (!s.active) continue;
      const key = s.texture.key;
      if (key !== "tire" && key !== "smoke") continue;
      const life = ((s.getData("life") as number) ?? 0) - dt;
      s.setData("life", life);
      if (key === "smoke") {
        s.y -= 22 * dt;
        s.setScale(s.scaleX + 0.9 * dt);
        s.setAlpha(Math.max(0, Math.min(0.75, life / 0.45)));
      } else {
        s.setAlpha(Math.max(0, Math.min(1, life / 0.2)));
      }
      if (life <= 0) s.setActive(false).setVisible(false);
    }
  }

  tickFloaters(dt: number) {
    for (const t of this.floaters) {
      if (!t.visible) continue;
      const life = ((t.getData("life") as number) ?? 0) - dt;
      t.setData("life", life);
      t.y += ((t.getData("vy") as number) ?? -30) * dt;
      t.setAlpha(Math.max(0, Math.min(1, life / 0.3)));
      if (life <= 0) t.setVisible(false).setActive(false);
    }
  }
}
