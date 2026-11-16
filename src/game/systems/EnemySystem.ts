import * as Phaser from "phaser";
import { synth } from "../audio";
import { ENEMY_VISUAL_SPECS, getEnemyTextureKey } from "../graphics/parodyPalettes";
import { computePressure, isRiotFrontBlock } from "../rules";
import { SpatialGrid } from "../spatial/SpatialGrid";
import type { BData, BossInfo, EData, Kind } from "../types";

export interface EnemyContext {
  player: Phaser.Physics.Arcade.Sprite;
  decoy: Phaser.Physics.Arcade.Sprite;
  isStealth(): boolean;
  getDashT(): number;
  isAlive(): boolean;
  getTimeSurvived(): number;
  cam: Phaser.Cameras.Scene2D.Camera;
  shakeCam(duration: number, intensity: number): void;
  hurtPlayer(amount: number, throughStealth?: boolean, honorIFrame?: boolean): void;
  aoe(x: number, y: number, radius: number, damage: number, knock: number): void;
  shoot(
    x: number,
    y: number,
    ang: number,
    speed: number,
    dmg: number,
    pierce: number,
    homing: boolean,
    key: string,
    life: number,
    aoe: number,
    friendly?: boolean,
  ): Phaser.Physics.Arcade.Sprite | null;
  dress(sprite: Phaser.Physics.Arcade.Sprite, key: string, height: number, hit: number): void;
  floater(x: number, y: number, text: string, color: string): void;
  critFloater?(x: number, y: number, damage: number): void;
  comic?(x: number, y: number, text: string, color: string): void;
  banner?(text: string, color: string): void;
  shockwave?(x: number, y: number, scale: number): void;
  puff?(x: number, y: number, key: string, life: number, depth: number): void;
  explode(x: number, y: number, scale: number): void;
  recycle(sprite: Phaser.Physics.Arcade.Sprite): void;
  spawnGem(x: number, y: number, value: number, keg?: boolean): void;
  onKilled(): void;
  onFinaleVictory?(): void;
  delayedCall(delay: number, callback: () => void): void;
}

const KIND_TEX: Record<Kind, string> = {
  conscript: "conscript",
  tiktok: "tiktok",
  scooter: "scooter",
  cart: "cart",
  bukhanka: "bukhanka",
  mtlb: "mtlb",
  turtle: "turtle",
  boss: "boss",
  riot: "riot",
  kamikaze: "kamikaze",
  dog: "k9",
  prigozhin: "prigozhin",
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export class EnemySystem {
  private ctx: EnemyContext;
  enemies: Phaser.Physics.Arcade.Group;
  private shields: Phaser.GameObjects.Group;
  private loots: Phaser.GameObjects.Group;
  spatialGrid: SpatialGrid;

  // Active enemies cache for O(1) length and allocation-free queries
  private activeEnemies: Phaser.Physics.Arcade.Sprite[] = [];
  private _activeCount = 0;

  private spawnAcc = 0;
  private swarmAcc = 5;
  private squadAcc = 10;
  nextBoss = 60; // First boss (S-400) at 60s!
  bossCount = 0;
  private eid = 1;
  private initialSpawned = false;

  prigozhinSpawned = false;
  private prigozhinSprite: Phaser.Physics.Arcade.Sprite | null = null;
  private currentBossSprite: Phaser.Physics.Arcade.Sprite | null = null;
  private finaleVictoryTriggered = false;
  private endlessMode = false;
  private gridDirty = false;

  constructor(
    ctx: EnemyContext,
    enemies: Phaser.Physics.Arcade.Group,
    shields: Phaser.GameObjects.Group,
    loots: Phaser.GameObjects.Group,
  ) {
    this.ctx = ctx;
    this.enemies = enemies;
    this.shields = shields;
    this.loots = loots;
    // Spatial grid with 64px cell size and up to 1024 capacity
    this.spatialGrid = new SpatialGrid(3600, 64, 1024);
  }

  reset() {
    this.spawnAcc = 0;
    this.swarmAcc = 5;
    this.squadAcc = 10;
    this.nextBoss = 60;
    this.bossCount = 0;
    this.eid = 1;
    this.initialSpawned = false;
    this.prigozhinSpawned = false;
    this.prigozhinSprite = null;
    this.currentBossSprite = null;
    this.finaleVictoryTriggered = false;
    this.endlessMode = false;
    this.gridDirty = false;
    this.activeEnemies = [];
    this._activeCount = 0;
    this.spatialGrid.clear();
  }

  queryRadius(x: number, y: number, radius: number): Phaser.Physics.Arcade.Sprite[] {
    if (this.gridDirty) {
      this.spatialGrid.rebuild(this.activeEnemies);
      this.gridDirty = false;
    }
    return this.spatialGrid.queryRadius(x, y, radius, this.activeEnemies);
  }

  startEndlessMode() {
    this.endlessMode = true;
    this.nextBoss = this.ctx.getTimeSurvived() + 45;
  }

  getNextBossTime(): number {
    if (this.endlessMode) {
      return this.nextBoss;
    }
    if (!this.prigozhinSpawned) {
      if (this.ctx.getTimeSurvived() < this.nextBoss && this.nextBoss <= 300) {
        return this.nextBoss;
      }
      return 300;
    }
    return this.nextBoss;
  }

  getNextBossCountdown(timeSurvived: number): number {
    const target = this.getNextBossTime();
    return Math.max(0, target - timeSurvived);
  }

  getActiveBoss(): BossInfo | null {
    if (this.prigozhinSprite?.active) {
      const e = this.ed(this.prigozhinSprite);
      return {
        name: e.enraged ? "🔥 BIG ZOMBIE PRIGOŽIN CLONE (ENRAGED) 🔥" : "💀 BIG ZOMBIE PRIGOŽIN CLONE (WARLORD)",
        kind: "prigozhin",
        hp: Math.max(0, Math.round(e.hp)),
        maxHp: Math.round(e.max),
        isFinale: true,
      };
    }
    if (this.currentBossSprite?.active) {
      const e = this.ed(this.currentBossSprite);
      return {
        name: "INFLATABLE S-400 DECOY BATTERY",
        kind: "boss",
        hp: Math.max(0, Math.round(e.hp)),
        maxHp: Math.round(e.max),
        isFinale: false,
      };
    }
    for (const s of this.activeEnemies) {
      if (s.active) {
        const e = this.ed(s);
        if (e.kind === "boss") {
          this.currentBossSprite = s;
          return {
            name: "INFLATABLE S-400 DECOY BATTERY",
            kind: "boss",
            hp: Math.max(0, Math.round(e.hp)),
            maxHp: Math.round(e.max),
            isFinale: false,
          };
        }
      }
    }
    return null;
  }

  ed(s: Phaser.Physics.Arcade.Sprite): EData {
    let d = s.getData("ed") as EData | undefined;
    if (!d) {
      d = {
        kind: "conscript",
        hp: 1,
        max: 1,
        speed: 40,
        touch: 6,
        id: 0,
        axis: "h",
        face: 1,
        shoot: 1,
        vx: 1,
        vy: 0,
        aim: 0,
        hitCd: 0,
      };
      s.setData("ed", d);
    }
    return d;
  }

  activeCount(): number {
    return this._activeCount;
  }

  living(): Phaser.Physics.Arcade.Sprite[] {
    return this.activeEnemies;
  }

  nearest(x: number, y: number, bossOk: boolean) {
    let best: Phaser.Physics.Arcade.Sprite | null = null;
    let bestD = Infinity;
    const living = this.activeEnemies;
    const len = living.length;
    if (len === 0) return null;

    for (let i = 0; i < len; i++) {
      const s = living[i]!;
      const ek = this.ed(s).kind;
      if (!bossOk && (ek === "boss" || ek === "prigozhin") && len > 1) {
        continue;
      }
      const dx = s.x - x;
      const dy = s.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = s;
        if (bestD < 900) return best;
      }
    }
    return best;
  }

  toughest() {
    let best: Phaser.Physics.Arcade.Sprite | null = null;
    let hp = -1;
    const living = this.activeEnemies;
    for (let i = 0; i < living.length; i++) {
      const s = living[i]!;
      const e = this.ed(s);
      if (e.hp > hp) {
        hp = e.hp;
        best = s;
      }
    }
    return best;
  }

  pressure() {
    return computePressure(this.ctx.getTimeSurvived());
  }

  rollKind(): Kind {
    const t = this.ctx.getTimeSurvived();
    if (t < 25) {
      // Wave 1 (0-25s): Mobiks, TikTokers, Storm-Scooters, Desertcross Golf Carts, Bukhanka vans, MT-LB Franken-tanks, Turtle Tanks, and OMON Shields
      const r = Math.random();
      if (r < 0.26) return "conscript";
      if (r < 0.42) return "tiktok";
      if (r < 0.54) return "scooter";
      if (r < 0.66) return "cart";
      if (r < 0.78) return "bukhanka";
      if (r < 0.87) return "mtlb";
      if (r < 0.94) return "turtle";
      return "riot";
    }
    if (t < 60) {
      // Wave 2 (25-60s): Combined arms with Scooter squads, Bukhanka vans, Golf Carts, K9s, Kamikaze drones
      const r = Math.random();
      if (r < 0.18) return "scooter";
      if (r < 0.34) return "bukhanka";
      if (r < 0.48) return "cart";
      if (r < 0.64) return "dog";
      if (r < 0.78) return "kamikaze";
      if (r < 0.90) return "mtlb";
      return "tiktok";
    }
    if (t < 120) {
      // Wave 3 (60-120s): Heavy mechanized push - MT-LB Franken-tanks, Bukhankas, Riot Shields, Kamikaze drones, Turtle Tanks
      const r = Math.random();
      if (r < 0.20) return "mtlb";
      if (r < 0.38) return "bukhanka";
      if (r < 0.54) return "riot";
      if (r < 0.70) return "kamikaze";
      if (r < 0.84) return "turtle";
      return "scooter";
    }
    if (t < 180) {
      // Wave 4 (120-180s): Heavy Armor & Scooter swarm
      const r = Math.random();
      if (r < 0.22) return "turtle";
      if (r < 0.42) return "mtlb";
      if (r < 0.58) return "bukhanka";
      if (r < 0.74) return "riot";
      if (r < 0.88) return "kamikaze";
      return "scooter";
    }
    // Wave 5+ (180s - 300s+): Full contemporary parody combined-arms frenzy
    const r = Math.random();
    if (r < 0.20) return "turtle";
    if (r < 0.38) return "mtlb";
    if (r < 0.52) return "bukhanka";
    if (r < 0.66) return "kamikaze";
    if (r < 0.78) return "riot";
    if (r < 0.90) return "scooter";
    return "cart";
  }

  // Ensure free pool slots for vital spawns (like bosses) by recycling distant grunts
  private ensureFreeSlots(needed: number) {
    const px = this.ctx.player.x;
    const py = this.ctx.player.y;
    while (
      (this._activeCount + needed >= 650 || this.enemies.countActive(true) + needed >= 685) &&
      this._activeCount > 0 &&
      needed > 0
    ) {
      // Find furthest basic conscript or tiktok
      let furthest: Phaser.Physics.Arcade.Sprite | null = null;
      let maxD = 0;
      for (const s of this.activeEnemies) {
        if (!s.active) continue;
        const k = this.ed(s).kind;
        if (k === "boss" || k === "prigozhin") continue;
        const d = (s.x - px) * (s.x - px) + (s.y - py) * (s.y - py);
        if (d > maxD) {
          maxD = d;
          furthest = s;
        }
      }
      if (furthest) {
        this.killEnemy(furthest, false);
        needed--;
      } else {
        break;
      }
    }
  }

  spawnEnemy(kind: Kind) {
    const cam = this.ctx.cam;
    const dist = (Math.max(cam.width, cam.height) * 0.62) / cam.zoom;
    const ang = Math.random() * Math.PI * 2;
    let x = this.ctx.player.x + Math.cos(ang) * dist;
    let y = this.ctx.player.y + Math.sin(ang) * dist;
    x = clamp(x, 120, 3600 - 120);
    y = clamp(y, 120, 3600 - 120);
    if (Math.hypot(x - this.ctx.player.x, y - this.ctx.player.y) < 140) {
      x = clamp(this.ctx.player.x + (Math.random() < 0.5 ? -1 : 1) * 260, 120, 3600 - 120);
      y = clamp(this.ctx.player.y + (Math.random() < 0.5 ? -1 : 1) * 260, 120, 3600 - 120);
    }
    this.birth(kind, x, y);
  }

  spawnBatch(kind: Kind, count: number, cap: number) {
    const cam = this.ctx.cam;
    const baseDist = (Math.max(cam.width, cam.height) * 0.6) / cam.zoom;
    const baseAng = Math.random() * Math.PI * 2;

    for (let i = 0; i < count && this._activeCount < cap; i++) {
      const spreadAng = baseAng + (i - (count - 1) / 2) * 0.16 + (Math.random() - 0.5) * 0.08;
      const dist = baseDist + (Math.random() - 0.5) * 60;
      let x = this.ctx.player.x + Math.cos(spreadAng) * dist;
      let y = this.ctx.player.y + Math.sin(spreadAng) * dist;
      x = clamp(x, 120, 3600 - 120);
      y = clamp(y, 120, 3600 - 120);
      this.birth(kind, x, y);
    }
  }

  spawnBoss() {
    this.ensureFreeSlots(18);
    const cam = this.ctx.cam;
    const dist = (Math.max(cam.width, cam.height) * 0.58) / cam.zoom;
    const ang = Math.random() * Math.PI * 2;
    const x = clamp(this.ctx.player.x + Math.cos(ang) * dist, 160, 3600 - 160);
    const y = clamp(this.ctx.player.y + Math.sin(ang) * dist, 160, 3600 - 160);

    const s = this.birth("boss", x, y);
    if (s) this.currentBossSprite = s;

    // Escort convoy: spawn riot shields and carts guarding the boss
    for (let i = 0; i < 5; i++) {
      const escortAng = (i / 5) * Math.PI * 2;
      this.birth("riot", clamp(x + Math.cos(escortAng) * 90, 120, 3600 - 120), clamp(y + Math.sin(escortAng) * 90, 120, 3600 - 120));
      this.birth("cart", clamp(x + Math.cos(escortAng) * 135, 120, 3600 - 120), clamp(y + Math.sin(escortAng) * 135, 120, 3600 - 120));
    }

    synth.siren();
    this.ctx.shakeCam(320, 0.015);
    this.ctx.floater(this.ctx.player.x, this.ctx.player.y - 70, "⚠️ WARNING: INFLATABLE S-400 DEPLOYED! ⚠️", "#ff3333");
    if (this.ctx.banner) this.ctx.banner("INFLATABLE S-400 DETECTED — FLANNEL AMBUSH POPS IT!", "#ff3333");
  }

  spawnPrigozhin() {
    this.ensureFreeSlots(25);
    const cam = this.ctx.cam;
    const dist = (Math.max(cam.width, cam.height) * 0.52) / cam.zoom;
    const ang = Math.random() * Math.PI * 2;
    const x = clamp(this.ctx.player.x + Math.cos(ang) * dist, 200, 3600 - 200);
    const y = clamp(this.ctx.player.y + Math.sin(ang) * dist, 200, 3600 - 200);

    const s = this.birth("prigozhin", x, y);
    if (s) {
      this.prigozhinSprite = s;
      const e = this.ed(s);
      e.slamCd = 3.2;
      e.shoot = 2.4;
      e.summonCd = 8.5;
      e.phraseCd = 3.0;
      e.enraged = false;
    }

    // Heavy Wagner Shockguard Honor Convoy
    for (let i = 0; i < 6; i++) {
      const escortAng = (i / 6) * Math.PI * 2;
      this.birth("riot", clamp(x + Math.cos(escortAng) * 110, 140, 3460), clamp(y + Math.sin(escortAng) * 110, 140, 3460));
      this.birth("kamikaze", clamp(x + Math.cos(escortAng) * 150, 140, 3460), clamp(y + Math.sin(escortAng) * 150, 140, 3460));
    }

    synth.siren();
    synth.prigozhinRoar();
    this.ctx.shakeCam(450, 0.025);
    this.ctx.floater(this.ctx.player.x, this.ctx.player.y - 85, "🚨 FINALE: BIG ZOMBIE PRIGOŽIN CLONE! 🚨", "#ff0054");
    if (this.ctx.comic) this.ctx.comic(this.ctx.player.x, this.ctx.player.y - 120, "SHOIGU! GERASIMOV! WHERE IS THE AMMUNITION?!", "#ff3333");
    if (this.ctx.banner) this.ctx.banner("⚠️ GRAND FINALE: BIG ZOMBIE PRIGOŽIN CLONE HAS ARRIVED! ⚠️", "#ff0054");
  }

  birth(kind: Kind, x: number, y: number): Phaser.Physics.Arcade.Sprite | null {
    let s = this.enemies.get(x, y, KIND_TEX[kind]) as Phaser.Physics.Arcade.Sprite | null;
    if (!s) {
      this.ensureFreeSlots(6);
      s = this.enemies.get(x, y, KIND_TEX[kind]) as Phaser.Physics.Arcade.Sprite | null;
      if (!s) return null;
    }
    s.enableBody(true, x, y, true, true);
    s.clearTint();
    const pressure = this.pressure();
    const hp =
      kind === "prigozhin"
        ? Math.round(2200 * pressure)
        : kind === "boss"
          ? Math.round((350 + this.bossCount * 260) * (1 + this.ctx.getTimeSurvived() * 0.005))
          : kind === "turtle"
            ? 48 * pressure
            : kind === "mtlb"
              ? 42 * pressure
              : kind === "riot"
                ? 34 * pressure
                : kind === "bukhanka"
                  ? 32 * pressure
                  : kind === "cart"
                    ? 18 * pressure
                    : kind === "scooter"
                      ? 15 * pressure
                      : kind === "kamikaze"
                        ? 12 * pressure
                        : kind === "dog"
                          ? 16 * pressure
                          : kind === "tiktok"
                            ? 18 * pressure
                            : 14 * pressure;
    const height =
      kind === "prigozhin"
        ? 165
        : kind === "boss"
          ? 134
          : kind === "mtlb"
            ? 92
            : kind === "turtle"
              ? 88
              : kind === "bukhanka"
                ? 82
                : kind === "cart"
                  ? 78
                  : kind === "riot"
                    ? 74
                    : kind === "scooter"
                      ? 72
                      : kind === "kamikaze"
                        ? 58
                        : kind === "dog"
                          ? 62
                          : kind === "tiktok"
                            ? 70
                            : 68;
    const baseTex = KIND_TEX[kind];
    const initTex = s.scene.textures.exists(`${baseTex}_0`) ? `${baseTex}_0` : baseTex;
    this.ctx.dress(
      s,
      initTex,
      height,
      kind === "prigozhin" ? 0.46 : kind === "boss" ? 0.42 : kind === "kamikaze" ? 0.5 : 0.36,
    );
    const e = this.ed(s);
    e.kind = kind;
    e.hp = hp;
    e.max = hp;
    e.speed =
      kind === "prigozhin"
        ? 52
        : kind === "boss"
          ? 36
          : kind === "turtle"
            ? 44
            : kind === "mtlb"
              ? 48
              : kind === "riot"
                ? 34
                : kind === "bukhanka"
                  ? 86
                  : kind === "cart"
                    ? 145
                    : kind === "scooter"
                      ? 162
                      : kind === "kamikaze"
                        ? 188
                        : kind === "dog"
                          ? 118
                          : kind === "tiktok"
                            ? 64
                            : 78;
    const touchBase =
      kind === "prigozhin"
        ? 44
        : kind === "boss"
          ? 30
          : kind === "turtle" || kind === "mtlb"
            ? 22
            : kind === "bukhanka" || kind === "riot" || kind === "cart"
              ? 20
              : kind === "scooter"
                ? 18
                : kind === "kamikaze"
                  ? 36
                  : kind === "dog"
                    ? 22
                    : kind === "tiktok"
                      ? 14
                      : 16;
    e.touch = touchBase * pressure;
    e.id = this.eid++;
    e.axis = Math.random() < 0.5 ? "h" : "v";
    e.face = Math.random() < 0.5 ? -1 : 1;
    e.shoot = 0.45 + Math.random() * 0.6;
    e.hitCd = 0;
    delete e.slamCd;
    delete e.summonCd;
    delete e.phraseCd;
    delete e.enraged;
    const dir = Math.atan2(this.ctx.player.y - y, this.ctx.player.x - x);
    e.aim = dir;
    e.vx = Math.cos(dir) * e.speed;
    e.vy = Math.sin(dir) * e.speed;
    s.setData("loot", null);
    s.setData("lastDepth", y);

    // Track in contiguous active array with O(1) swap-and-pop index
    s.setData("activeIdx", this.activeEnemies.length);
    this.activeEnemies.push(s);
    this._activeCount++;
    this.gridDirty = true;

    if (kind === "riot") this.attachShield(s);
    else this.dropShield(s);
    s.setDepth(y);
    s.setFlipX(false);
    s.setRotation(0);
    return s;
  }

  private turnToward(current: number, desired: number, maxStep: number) {
    let diff = desired - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return current + clamp(diff, -maxStep, maxStep);
  }

  private attachShield(enemy: Phaser.Physics.Arcade.Sprite) {
    let shield = enemy.getData("shield") as Phaser.GameObjects.Sprite | null;
    if (shield?.active) return;
    shield = this.shields.get(enemy.x, enemy.y, "shield") as Phaser.GameObjects.Sprite | null;
    if (!shield) return;
    shield.setTexture("shield");
    shield.setActive(true).setVisible(true);
    shield.setScale(36 / Math.max(1, shield.height));
    enemy.setData("shield", shield);
  }

  private dropShield(enemy: Phaser.Physics.Arcade.Sprite) {
    const shield = enemy.getData("shield") as Phaser.GameObjects.Sprite | null;
    if (!shield) return;
    shield.setActive(false).setVisible(false);
    enemy.setData("shield", null);
  }

  private placeShield(enemy: Phaser.Physics.Arcade.Sprite, data: EData) {
    if (data.kind !== "riot") return;
    let shield = enemy.getData("shield") as Phaser.GameObjects.Sprite | null;
    if (!shield?.active) {
      this.attachShield(enemy);
      shield = enemy.getData("shield") as Phaser.GameObjects.Sprite | null;
    }
    if (!shield?.active) return;
    shield.setPosition(enemy.x + Math.cos(data.aim) * 26, enemy.y + Math.sin(data.aim) * 26);
    shield.setRotation(data.aim);
    shield.setDepth(enemy.depth + 2);
  }

  tickSpawns(dt: number) {
    if (!this.initialSpawned) {
      this.initialSpawned = true;
      // Start with engaging variety including the new Bukhanka van, MT-LB 2M-3 Franken-tank, and Storm-Scooter!
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const dist = 265 + (i % 2) * 35;
        const x = clamp(this.ctx.player.x + Math.cos(ang) * dist, 140, 3600 - 140);
        const y = clamp(this.ctx.player.y + Math.sin(ang) * dist, 140, 3600 - 140);
        this.birth("conscript", x, y);
      }
      for (let i = 0; i < 3; i++) {
        const ang = (i / 3) * Math.PI * 2 + 0.35;
        const dist = 335;
        const x = clamp(this.ctx.player.x + Math.cos(ang) * dist, 140, 3600 - 140);
        const y = clamp(this.ctx.player.y + Math.sin(ang) * dist, 140, 3600 - 140);
        this.birth("tiktok", x, y);
      }
      this.birth("scooter", clamp(this.ctx.player.x - 240, 140, 3460), clamp(this.ctx.player.y + 135, 140, 3460));
      this.birth("scooter", clamp(this.ctx.player.x + 225, 140, 3460), clamp(this.ctx.player.y + 165, 140, 3460));
      this.birth("bukhanka", clamp(this.ctx.player.x - 295, 140, 3460), clamp(this.ctx.player.y + 25, 140, 3460));
      this.birth("mtlb", clamp(this.ctx.player.x + 290, 140, 3460), clamp(this.ctx.player.y - 45, 140, 3460));
      this.birth("turtle", clamp(this.ctx.player.x - 310, 140, 3460), clamp(this.ctx.player.y - 120, 140, 3460));
      this.birth("cart", clamp(this.ctx.player.x + 305, 140, 3460), clamp(this.ctx.player.y + 115, 140, 3460));
      this.birth("riot", clamp(this.ctx.player.x + 245, 140, 3460), clamp(this.ctx.player.y - 155, 140, 3460));
    }

    const timeSurvived = this.ctx.getTimeSurvived();

    // Boss scheduling:
    // Wave 3 (60s): Inflatable S-400 Boss 1
    // Wave 5 (135s): Inflatable S-400 Boss 2
    // Wave 7 (210s): Inflatable S-400 Boss 3
    // 5 Minutes (300s): GRAND FINALE: BIG ZOMBIE PRIGOŽIN CLONE!
    if (!this.prigozhinSpawned && timeSurvived >= 300) {
      this.prigozhinSpawned = true;
      this.nextBoss = this.endlessMode ? timeSurvived + 60 : 300;
      this.spawnPrigozhin();
    } else if (!this.prigozhinSpawned && timeSurvived >= this.nextBoss && timeSurvived < 290) {
      this.bossCount += 1;
      if (this.bossCount === 1) {
        this.nextBoss = 135;
      } else if (this.bossCount === 2) {
        this.nextBoss = 210;
      } else {
        this.nextBoss = 300;
      }
      this.spawnBoss();
    } else if (this.endlessMode && timeSurvived >= this.nextBoss) {
      this.nextBoss = timeSurvived + 60;
      if (Math.random() < 0.5) this.spawnPrigozhin();
      else this.spawnBoss();
    }

    this.spawnAcc += dt;
    const interval = clamp(0.5 - timeSurvived * 0.002, 0.12, 0.5);
    const cap = Math.min(600, Math.round((25 + Math.floor(timeSurvived / 2.2)) * 3.2));

    if (this.spawnAcc >= interval && this._activeCount < cap) {
      this.spawnAcc = 0;
      // Spawn batches from rollKind() which has high variety for all enemy types!
      const batchSize = Math.random() < 0.5 ? 3 : 4;
      this.spawnBatch(this.rollKind(), batchSize, cap);

      if (timeSurvived > 30 && Math.random() < 0.5 && this._activeCount < cap) {
        this.spawnBatch(this.rollKind(), 3, cap);
      }
    }

    // Specialized Squad Rushes (cycles dynamically every 8-12 seconds)
    this.swarmAcc -= dt;
    if (this.swarmAcc <= 0) {
      this.swarmAcc = clamp(10.0 - timeSurvived * 0.015, 5.0, 10.0);
      const t = timeSurvived;
      const rushPhase = Math.floor(t / 25) % 5;
      if (rushPhase === 0 && t >= 12) {
        // K9 Attack Dog Pack!
        this.spawnBatch("dog", 5, cap);
        this.ctx.floater(this.ctx.player.x, this.ctx.player.y - 45, "🐕 K9 RECON PACK INBOUND!", "#ffd6a0");
      } else if (rushPhase === 1) {
        // Suicide Drone Kamikaze Swarm!
        this.spawnBatch("kamikaze", 8, cap);
        this.ctx.floater(this.ctx.player.x, this.ctx.player.y - 45, "⚡ KAMIKAZE SWARM DIVE!", "#ff4d4d");
      } else if (rushPhase === 2) {
        // Golf Cart Motorcade!
        this.spawnBatch("cart", 6, cap);
        this.ctx.floater(this.ctx.player.x, this.ctx.player.y - 45, "🏎️ GOLF CART MOTORCADE!", "#ffd60a");
      } else if (rushPhase === 3) {
        // Shield Wall Phalanx!
        this.spawnBatch("riot", 6, cap);
        this.ctx.floater(this.ctx.player.x, this.ctx.player.y - 45, "🛡️ RIOT SHIELD PHALANX!", "#64dfdf");
      } else if (rushPhase === 4) {
        // Turtle Tank Squadron!
        this.spawnBatch("turtle", 4, cap);
        this.spawnBatch("kamikaze", 5, cap);
        this.ctx.floater(this.ctx.player.x, this.ctx.player.y - 45, "🐢 TURTLE TANK SQUADRON!", "#72efdd");
      }
    }

    // Heavy Shield Wall / Armor columns
    this.squadAcc -= dt;
    if (this.squadAcc <= 0) {
      this.squadAcc = clamp(14 - timeSurvived * 0.02, 6.0, 14);
      if (timeSurvived > 25) {
        const squadKind: Kind = timeSurvived > 90 && Math.random() < 0.5 ? "turtle" : "riot";
        this.spawnBatch(squadKind, 5, cap);
      }
    }
  }

  tickEnemies(dt: number) {
    const lure = this.ctx.decoy.active;
    const isStealth = this.ctx.isStealth();
    const timeSurvived = this.ctx.getTimeSurvived();
    const active = this.activeEnemies;
    const count = active.length;
    if (count === 0) return;

    const px = this.ctx.player.x;
    const py = this.ctx.player.y;
    const tx = lure ? this.ctx.decoy.x : px;
    const ty = lure ? this.ctx.decoy.y : py;

    for (let i = 0; i < count; i++) {
      const s = active[i]!;
      if (!s.active) continue;

      const e = this.ed(s);

      // Distance to target
      const dx = tx - s.x;
      const dy = ty - s.y;
      const distSq = dx * dx + dy * dy;

      // Off-screen repositioning & wrapping:
      // If a regular enemy wandered more than 1150px away from the player,
      // teleport it to the perimeter of the screen so it rejoins the battle!
      const pDistSq = (s.x - px) * (s.x - px) + (s.y - py) * (s.y - py);
      if (pDistSq > 1150 * 1150 && e.kind !== "boss" && e.kind !== "prigozhin") {
        const reAng = Math.random() * Math.PI * 2;
        const reDist = 560 + Math.random() * 120;
        const newX = clamp(px + Math.cos(reAng) * reDist, 140, 3600 - 140);
        const newY = clamp(py + Math.sin(reAng) * reDist, 140, 3600 - 140);
        s.setPosition(newX, newY);
        const b = s.body as Phaser.Physics.Arcade.Body | null;
        b?.reset(newX, newY);
        continue;
      }

      let vx = 0;
      let vy = 0;
      const bonus = lure ? (e.kind === "conscript" ? 1.5 : 1.35) : 1;

      if (e.kind === "prigozhin") {
        // BIG ZOMBIE PRIGOŽIN CLONE AI & ATTACKS
        const desired = Math.atan2(dy, dx);
        e.aim = this.turnToward(e.aim, desired, 1.8 * dt);
        const currentSpeed = (e.enraged ? e.speed * 1.35 : e.speed) * (lure ? 1.25 : 1.0);
        vx = Math.cos(e.aim) * currentSpeed;
        vy = Math.sin(e.aim) * currentSpeed;
        e.face = vx < 0 ? -1 : 1;

        // Check for Enrage Phase (< 50% HP)
        if (!e.enraged && e.hp <= e.max * 0.5) {
          e.enraged = true;
          synth.prigozhinRoar();
          this.ctx.shakeCam(320, 0.02);
          this.ctx.floater(s.x, s.y - 80, "🔥 ZOMBIE PRIGOŽIN ENRAGED! 🔥", "#ff0054");
          if (this.ctx.comic) {
            this.ctx.comic(s.x, s.y - 110, "SHOIGU! GERASIMOV! WHERE IS THE AMMUNITION?!", "#ff3333");
          }
        }

        // Shouting Iconic Floaters
        if (e.phraseCd !== undefined) {
          e.phraseCd -= dt;
          if (e.phraseCd <= 0) {
            e.phraseCd = 4.5 + Math.random() * 3.0;
            const quotes = [
              "WHERE IS THE AMMUNITION?!",
              "SHOIGU! GERASIMOV!",
              "I NEED SHELLS, NOT FLANNEL!",
              "WAGNER ZOMBIE MARCH!",
              "MY SLEDGEHAMMER CRAVES STEEL!",
              "THE WASHING MACHINE IS MINE!",
            ];
            const q = quotes[Math.floor(Math.random() * quotes.length)]!;
            this.ctx.floater(s.x, s.y - 80, `💀 "${q}"`, e.enraged ? "#ff1a1a" : "#39ff14");
          }
        }

        // Attack 1: Sledgehammer Ground Slam (Shockwaves + AoE)
        if (e.slamCd !== undefined) {
          e.slamCd -= dt;
          if (e.slamCd <= 0) {
            e.slamCd = e.enraged ? 2.2 : 3.4;
            synth.boom(true);
            this.ctx.shakeCam(260, 0.016);
            this.ctx.floater(s.x, s.y - 65, "⚡ SLEDGEHAMMER SLAM! ⚡", "#ffcc00");
            this.ctx.aoe(s.x, s.y, 160, 32 * this.pressure(), 250);
            if (this.ctx.shockwave) this.ctx.shockwave(s.x, s.y, 2.8);
            this.ctx.explode(s.x, s.y, 1.8);
          }
        }

        // Attack 2: Ammo Crate Throw ("WHERE IS THE AMMUNITION?!")
        e.shoot -= dt;
        if (e.shoot <= 0) {
          e.shoot = e.enraged ? 1.6 : 2.5;
          const ang = Math.atan2(ty - s.y, tx - s.x);
          // Throw 2 explosive ammo crates
          for (let c = -1; c <= 1; c += 2) {
            const spread = ang + c * 0.16;
            const crate = this.ctx.shoot(s.x, s.y, spread, 180, 24 * this.pressure(), 1, false, "ammocrate", 2.2, 70, false);
            crate?.setTint(e.enraged ? 0xff4422 : 0x88ff66);
          }
        }

        // Attack 3: Wagner Squad Summons
        if (e.summonCd !== undefined) {
          e.summonCd -= dt;
          if (e.summonCd <= 0) {
            e.summonCd = 9.5;
            this.ctx.floater(s.x, s.y - 60, "☠️ WAGNER CHARGE! ☠️", "#00f5d4");
            for (let k = 0; k < 3; k++) {
              const sang = Math.random() * Math.PI * 2;
              this.birth("kamikaze", clamp(s.x + Math.cos(sang) * 80, 140, 3460), clamp(s.y + Math.sin(sang) * 80, 140, 3460));
            }
            this.birth("riot", clamp(s.x + 60, 140, 3460), clamp(s.y, 140, 3460));
            this.birth("riot", clamp(s.x - 60, 140, 3460), clamp(s.y, 140, 3460));
          }
        }
      } else if (e.kind === "cart" && !lure) {
        vx = e.vx;
        vy = e.vy;
      } else if (e.kind === "scooter") {
        const weave = Math.sin(timeSurvived * 7.5 + e.id) * 0.32;
        const ang = Math.atan2(dy, dx) + weave;
        const pace = lure ? 1.35 : 1;
        vx = Math.cos(ang) * e.speed * pace;
        vy = Math.sin(ang) * e.speed * pace;
        e.aim = ang;
        e.face = vx < 0 ? -1 : 1;
      } else if (e.kind === "bukhanka") {
        const desired = Math.atan2(dy, dx);
        e.aim = this.turnToward(e.aim, desired, 1.45 * dt);
        const pace = lure ? 1.25 : 1;
        vx = Math.cos(e.aim) * e.speed * pace;
        vy = Math.sin(e.aim) * e.speed * pace;
        e.face = vx < 0 ? -1 : 1;
      } else if (e.kind === "mtlb") {
        const desired = Math.atan2(dy, dx);
        e.aim = this.turnToward(e.aim, desired, 0.95 * dt);
        vx = Math.cos(e.aim) * e.speed * bonus;
        vy = Math.sin(e.aim) * e.speed * bonus;
        e.face = vx < 0 ? -1 : 1;
        e.shoot -= dt;
        if (e.shoot <= 0) {
          e.shoot = 2.15 + Math.random() * 0.6;
          const fireAng = Math.atan2(ty - s.y, tx - s.x);
          for (const offset of [-0.07, 0.07]) {
            const shot = this.ctx.shoot(
              s.x + e.face * 18,
              s.y - 18,
              fireAng + offset,
              205,
              15 * this.pressure(),
              1,
              false,
              "bullet",
              1.6,
              0,
              false,
            );
            shot?.setTint(0xffaa00);
          }
        }
      } else if (e.kind === "turtle") {
        if (Math.abs(dx) > Math.abs(dy)) {
          e.axis = "h";
          e.face = dx < 0 ? -1 : 1;
          vx = e.face * e.speed * bonus;
          vy = 0;
        } else {
          e.axis = "v";
          e.face = dy === 0 ? e.face : 1;
          vx = 0;
          vy = Math.sign(dy || 1) * e.speed * bonus;
        }
      } else if (e.kind === "tiktok" && !lure) {
        e.shoot -= dt;
        if (e.shoot > 0.45) {
          const len = Math.sqrt(distSq) || 1;
          vx = (dx / len) * e.speed;
          vy = (dy / len) * e.speed;
          e.face = vx < 0 ? -1 : 1;
        } else if (e.shoot <= 0) {
          const ang = Math.random() * Math.PI * 2;
          const shot = this.ctx.shoot(s.x, s.y, ang, 190, 13 * this.pressure(), 1, false, "bullet", 1.4, 0, false);
          shot?.setTint(0xff5a36);
          e.shoot = 0.85 + Math.random() * 0.9;
        }
      } else if (e.kind === "riot") {
        const desired = Math.atan2(dy, dx);
        e.aim = this.turnToward(e.aim, desired, 0.72 * dt);
        const pace = lure ? 1.12 : 1;
        vx = Math.cos(e.aim) * e.speed * pace;
        vy = Math.sin(e.aim) * e.speed * pace;
        e.face = vx < 0 ? -1 : 1;
      } else if (e.kind === "dog") {
        const pDx = px - s.x;
        const pDy = py - s.y;
        const desired = Math.atan2(pDy, pDx);
        const turn = isStealth ? 0.65 : 2.6;
        e.aim = this.turnToward(e.aim, desired, turn * dt);
        const spd = e.speed * (isStealth ? 0.5 : 1);
        vx = Math.cos(e.aim) * spd;
        vy = Math.sin(e.aim) * spd;
        e.face = vx < 0 ? -1 : 1;
      } else if (e.kind === "kamikaze") {
        const wob = Math.sin(timeSurvived * 10 + e.id) * 0.22;
        const ang = Math.atan2(dy, dx) + wob;
        const pace = lure ? 1.3 : 1;
        vx = Math.cos(ang) * e.speed * pace;
        vy = Math.sin(ang) * e.speed * pace;
        e.aim = ang;
        e.face = vx < 0 ? -1 : 1;
      } else {
        // Conscript & general horde
        const len = Math.sqrt(distSq) || 1;
        vx = (dx / len) * e.speed * bonus;
        vy = (dy / len) * e.speed * bonus;
        e.face = vx < 0 ? -1 : 1;
        e.aim = Math.atan2(vy, vx);
      }

      if (e.kind === "boss") {
        e.shoot -= dt;
        if (e.shoot <= 0) {
          e.shoot = 1.55;
          const ang = Math.atan2(py - s.y, px - s.x);
          const shot = this.ctx.shoot(s.x, s.y, ang, 150, 22 * this.pressure(), 1, true, "rocket", 5, 0, false);
          shot?.setTint(0xff5533);
        }
      }

      if (e.hitCd > 0) e.hitCd -= dt;
      const body = s.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(vx, vy);

      // 2-Frame procedural walk / tread / rotor animation + <50% HP battle-damage state switching
      const baseTex = KIND_TEX[e.kind];
      const frameTex = getEnemyTextureKey(baseTex, e.kind, e.hp, e.max, timeSurvived, e.id);
      if (s.texture.key !== frameTex && s.scene.textures.exists(frameTex)) {
        s.setTexture(frameTex);
      }

      if (e.kind === "kamikaze") {
        s.setFlipX(false);
        s.setRotation(e.aim);
      } else {
        s.setFlipX(e.face < 0 && e.kind !== "boss");
        const isVeh = e.kind === "turtle" || e.kind === "cart" || e.kind === "bukhanka" || e.kind === "mtlb";
        const gaitAmp = isVeh ? 0.025 : 0.045;
        s.setRotation(Math.sin(timeSurvived * 12 + e.id) * gaitAmp);
      }

      // Vehicle diesel exhaust / burning smoke puffs (2.5x denser when damaged below 50% HP)
      const isDamaged = e.max > 0 && e.hp / e.max < 0.5;
      const baseSmokeProb = e.kind === "turtle" || e.kind === "mtlb" ? 0.14 : 0.09;
      if (ENEMY_VISUAL_SPECS[e.kind].exhaustPuffs && Math.random() < baseSmokeProb * (isDamaged ? 2.5 : 1)) {
        const exhaustX = s.x - e.face * (e.kind === "turtle" ? 24 : 26);
        const exhaustY = e.kind === "turtle" || e.kind === "mtlb" ? s.y - 28 : s.y + 8;
        this.ctx.puff?.(exhaustX, exhaustY, "smoke", isDamaged ? 0.62 : 0.45, s.y - 1);
      }

      // Re-depth check
      const lastDepth = (s.getData("lastDepth") as number) || 0;
      if (Math.abs(s.y - lastDepth) > 14) {
        s.setDepth(s.y);
        s.setData("lastDepth", s.y);
      }

      if (e.kind === "riot") {
        this.placeShield(s, e);
      }

      // Loot / Sniff overhead icon lifecycle (must always clean up when stealth/lure ends)
      const loot = s.getData("loot") as Phaser.GameObjects.Sprite | undefined;
      const showLoot = lure && e.kind !== "dog";
      const showSniff = e.kind === "dog" && isStealth;
      if (showLoot || showSniff) {
        const key = showSniff ? "sniff" : "loot";
        let icon = loot;
        if (!icon || !icon.active || icon.texture.key !== key) {
          if (icon?.active) icon.setActive(false).setVisible(false);
          icon = (this.loots.get(s.x, s.y - 36, key) as Phaser.GameObjects.Sprite | null) ?? undefined;
          if (icon) {
            icon.setTexture(key);
            icon.setActive(true).setVisible(true).setDepth(3600);
            s.setData("loot", icon);
          }
        }
        icon?.setPosition(s.x, s.y - s.displayHeight * 0.55);
      } else if (loot) {
        if (loot.active) loot.setActive(false).setVisible(false);
        s.setData("loot", null);
      }
    }

    // High performance Spatial Hash Grid separation
    const limit = lure ? 10 : 12;
    this.spatialGrid.resolveSeparation(active, limit, 14, px, py);
    this.gridDirty = false;
  }

  renderOverlays(shadowGfx: Phaser.GameObjects.Graphics, hudGfx: Phaser.GameObjects.Graphics) {
    const active = this.activeEnemies;
    const cam = this.ctx.cam;
    const minX = cam.scrollX - 120;
    const maxX = cam.scrollX + cam.width / cam.zoom + 120;
    const minY = cam.scrollY - 120;
    const maxY = cam.scrollY + cam.height / cam.zoom + 120;

    shadowGfx.fillStyle(0x090c07, 0.38);

    for (let i = 0; i < active.length; i++) {
      const s = active[i]!;
      if (!s.active) continue;
      if (s.x < minX || s.x > maxX || s.y < minY || s.y > maxY) continue;

      const e = this.ed(s);
      const spec = ENEMY_VISUAL_SPECS[e.kind];
      const footY = s.y + s.displayHeight * (e.kind === "kamikaze" ? 0.52 : 0.38);
      shadowGfx.fillEllipse(s.x, footY, spec.shadowWidth, spec.shadowHeight);

      // Crisp world-space health bar for damaged armored/vehicle units (Turtle Tank, Golf Cart, Riot Shield)
      if (spec.showHealthBar && e.kind !== "boss" && e.kind !== "prigozhin" && e.hp < e.max && e.hp > 0) {
        const bw = e.kind === "turtle" ? 48 : 38;
        const bh = 5;
        const bx = s.x - bw / 2;
        const by = s.y - s.displayHeight * 0.56;
        const ratio = Math.max(0, Math.min(1, e.hp / e.max));
        hudGfx.fillStyle(0x0b0f0a, 0.88);
        hudGfx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        hudGfx.fillStyle(ratio > 0.45 ? 0xffb703 : 0xe63946, 1);
        hudGfx.fillRect(bx, by, bw * ratio, bh);
      }
    }
  }

  touchEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    if (!enemy.active || !this.ctx.isAlive()) return;
    const e = this.ed(enemy);
    const isStealth = this.ctx.isStealth();
    const dashT = this.ctx.getDashT();

    if (e.kind === "prigozhin" && isStealth) {
      if (e.hitCd <= 0) {
        e.hitCd = 0.8;
        this.ctx.floater(enemy.x, enemy.y - 45, "💥 ARTICLE 5 AMBUSH STRIKE! 💥", "#ffd60a");
        this.damageEnemy(enemy, 280 * this.pressure());
        if (this.ctx.shockwave) this.ctx.shockwave(enemy.x, enemy.y, 2.5);
        this.ctx.shakeCam(220, 0.016);
      }
      return;
    }

    if (e.kind === "boss" && isStealth) {
      this.popBoss(enemy);
      return;
    }

    if (e.kind === "kamikaze") {
      const dmg = e.touch;
      const x = enemy.x;
      const y = enemy.y;
      this.killEnemy(enemy, false);
      const pdx = this.ctx.player.x - x;
      const pdy = this.ctx.player.y - y;
      if (pdx * pdx + pdy * pdy < 46 * 46) {
        this.ctx.hurtPlayer(dmg, false, false);
      }
      return;
    }

    if (e.hitCd > 0) return;

    if (e.kind === "dog") {
      if (dashT > 0) return;
      e.hitCd = 0.55;
      this.ctx.hurtPlayer(e.touch, true, true);
      this.ctx.floater(this.ctx.player.x, this.ctx.player.y - 30, "CHOMP", "#ffd6a0");
      return;
    }

    if (isStealth || dashT > 0) return;
    e.hitCd = 0.45;
    this.ctx.hurtPlayer(e.touch);
  }

  touchDecoy(enemy: Phaser.Physics.Arcade.Sprite) {
    if (!this.ctx.decoy.active || !enemy.active) return;
    const e = this.ed(enemy);
    if (e.kind !== "cart" && e.kind !== "kamikaze") return;
    this.killEnemy(enemy, false);
  }

  damageEnemy(enemy: Phaser.Physics.Arcade.Sprite, amount: number, kx = 0, ky = 0) {
    if (!enemy.active) return;
    const e = this.ed(enemy);

    // Roll for Critical Hit (18% base, 55% during ambush/stealth)
    const isAmbush = this.ctx.isStealth() || this.ctx.getDashT() > 0;
    const critChance = isAmbush ? 0.55 : 0.18;
    const isCrit = Math.random() < critChance;
    const finalDmg = isCrit ? amount * 2.4 : amount;

    const prevHp = e.hp;
    e.hp -= finalDmg;
    const isVeh = e.kind === "turtle" || e.kind === "mtlb" || e.kind === "bukhanka" || e.kind === "cart";
    if (isVeh && prevHp >= e.max * 0.5 && e.hp > 0 && e.hp < e.max * 0.5) {
      this.ctx.floater(enemy.x, enemy.y - 34, "🔥 COPE CAGE BREACHED!", "#ff5400");
      this.ctx.puff?.(enemy.x, enemy.y - 12, "smoke", 0.55, enemy.y + 2);
    }
    const body = enemy.body as Phaser.Physics.Arcade.Body | null;
    const len = Math.hypot(kx, ky);
    if (len > 0.01 && e.kind !== "boss" && e.kind !== "prigozhin" && body) {
      const push = (e.kind === "turtle" || e.kind === "mtlb" ? 35 : 75) * (isCrit ? 1.4 : 1);
      body.setVelocity(body.velocity.x + (kx / len) * push, body.velocity.y + (ky / len) * push);
    }

    enemy.setTint(isCrit ? 0xffcc00 : 0xffffff);
    this.ctx.delayedCall(80, () => {
      if (enemy.active) {
        if (e.kind === "prigozhin" && e.enraged) {
          enemy.setTint(0xff5533);
        } else {
          enemy.clearTint();
        }
      }
    });

    if (isCrit) {
      synth.crit();
      if (this.ctx.critFloater) {
        this.ctx.critFloater(enemy.x, enemy.y, finalDmg);
      } else {
        this.ctx.floater(enemy.x, enemy.y - 24, `⚡ CRIT ${Math.round(finalDmg)}!`, "#ff9e00");
      }
    } else if (finalDmg >= 16) {
      this.ctx.floater(enemy.x, enemy.y - 20, `${Math.round(finalDmg)}`, "#ffe66d");
    }

    if (e.hp <= 0) this.killEnemy(enemy, false);
  }

  killEnemy(enemy: Phaser.Physics.Arcade.Sprite, popped: boolean) {
    if (!enemy.active) return;
    const e = this.ed(enemy);
    const x = enemy.x;
    const y = enemy.y;
    const kind = e.kind;
    const loot = enemy.getData("loot") as Phaser.GameObjects.Sprite | null;
    if (loot?.active) loot.setActive(false).setVisible(false);
    enemy.setData("loot", null);
    this.dropShield(enemy);

    // O(1) swap-and-pop removal from activeEnemies
    const idx = enemy.getData("activeIdx") as number | undefined;
    if (idx !== undefined && idx >= 0 && idx < this.activeEnemies.length) {
      const last = this.activeEnemies.pop()!;
      if (idx < this.activeEnemies.length) {
        this.activeEnemies[idx] = last;
        last.setData("activeIdx", idx);
      }
      this._activeCount = Math.max(0, this._activeCount - 1);
      this.gridDirty = true;
    }

    if (kind === "prigozhin") {
      this.prigozhinSprite = null;
    } else if (kind === "boss") {
      this.currentBossSprite = null;
    }

    this.ctx.recycle(enemy);

    const isPrigozhin = kind === "prigozhin";
    const isBoss = kind === "boss" || isPrigozhin;
    this.ctx.explode(x, y, isPrigozhin ? 4.5 : isBoss ? 2.8 : 1.1);
    synth.boom(isBoss);
    this.ctx.onKilled();

    if (isPrigozhin) {
      this.ctx.shakeCam(500, 0.035);
      synth.prigozhinRoar();
      if (this.ctx.shockwave) this.ctx.shockwave(x, y, 4.5);
      this.ctx.floater(x, y - 70, "🏆 BIG ZOMBIE PRIGOŽIN DEFEATED! 🏆", "#ffd60a");

      // Grand loot shower!
      for (let i = 0; i < 28; i++) {
        this.ctx.spawnGem(x + (Math.random() - 0.5) * 120, y + (Math.random() - 0.5) * 120, 15);
      }
      for (let i = 0; i < 4; i++) {
        this.ctx.spawnGem(x + (Math.random() - 0.5) * 80, y + (Math.random() - 0.5) * 80, 0, true);
      }

      // Wipe out all remaining regular enemy invaders on screen
      const living = [...this.activeEnemies];
      for (const inv of living) {
        if (!inv.active) continue;
        const ik = this.ed(inv).kind;
        if (ik !== "boss" && ik !== "prigozhin") {
          this.ctx.floater(inv.x, inv.y - 20, "RETREAT!", "#ffffff");
          this.killEnemy(inv, false);
        }
      }

      // Trigger the Grand Finale Victory!
      if (!this.finaleVictoryTriggered) {
        this.finaleVictoryTriggered = true;
        this.ctx.onFinaleVictory?.();
      }
    } else if (isBoss) {
      this.ctx.shakeCam(320, 0.018);
      this.ctx.floater(x, y - 55, "💥 S-400 OBLITERATED! 💥", "#ffd60a");
      for (let i = 0; i < 14; i++) {
        this.ctx.spawnGem(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60, 10);
      }
      this.ctx.spawnGem(x - 25, y, 0, true);
      this.ctx.spawnGem(x + 25, y, 0, true);
      if (popped) synth.pop();
    } else if (kind === "cart") {
      this.ctx.aoe(x, y, 85, 30, 110);
      this.ctx.shakeCam(100, 0.007);
    } else if (kind === "bukhanka") {
      // Destroyed Bukhanka loaf van spills 2 panicked Mobiks from its rear doors!
      this.ctx.aoe(x, y, 80, 26, 100);
      this.ctx.shakeCam(110, 0.008);
      this.ctx.floater(x, y - 34, "🥖 BUKHANKA UNLOADED!", "#fbbf24");
      for (let m = -1; m <= 1; m += 2) {
        this.birth("conscript", clamp(x + m * 24, 140, 3460), clamp(y + 12, 140, 3460));
      }
    } else if (kind === "kamikaze") {
      this.ctx.aoe(x, y, 95, 26, 130);
      this.ctx.shakeCam(100, 0.008);
    }

    if (!isBoss) {
      const highValue = kind === "turtle" || kind === "mtlb" || kind === "bukhanka" || kind === "riot";
      this.ctx.spawnGem(x, y, highValue ? 6 : 4);
      // Chance for a refreshing Pilsner keg drop
      if (Math.random() < (highValue ? 0.22 : 0.08)) {
        this.ctx.spawnGem(x, y, 0, true);
      }
    }
  }

  popBoss(enemy: Phaser.Physics.Arcade.Sprite) {
    const x = enemy.x;
    const y = enemy.y;
    this.ctx.floater(x, y - 40, "POP! ARTICLE 5 COMBO!", "#7af0ff");
    this.killEnemy(enemy, true);
    this.ctx.aoe(x, y, 160, 45, 220);
    this.ctx.shakeCam(260, 0.015);
  }

  onFriendlyHit(bullet: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
    if (!bullet.active || !enemy.active) return;
    const b = bullet.getData("bd") as BData;
    const e = this.ed(enemy);
    if (b.hit.includes(e.id)) return;
    b.hit.push(e.id);
    let dmg = b.dmg;
    if (e.kind === "turtle") {
      const fromBehind = (bullet.x - enemy.x) * e.face < 0;
      if (fromBehind) dmg *= 2.2;
      else dmg *= 0.45;
    }
    if (e.kind === "riot") {
      if (isRiotFrontBlock(b.vx, b.vy, e.aim)) {
        this.ctx.floater(enemy.x + Math.cos(e.aim) * 18, enemy.y + Math.sin(e.aim) * 18, "BLOCK", "#9ad7ff");
        if (b.pierce < 10) {
          this.ctx.recycle(bullet);
        }
        return;
      }
      dmg *= 2.15;
    }
    this.damageEnemy(enemy, dmg, b.vx, b.vy);
    if (b.aoe > 0) this.ctx.aoe(enemy.x, enemy.y, b.aoe, b.dmg * 0.45, 30);
    if (b.hit.length >= b.pierce) this.ctx.recycle(bullet);
  }
}
