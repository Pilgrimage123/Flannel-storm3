import type { Kind } from "../types";

export type ExplosionStyle =
  | "infantry"
  | "vehicle"
  | "armor"
  | "artillery"
  | "shrapnel"
  | "inflatable"
  | "ambush"
  | "finale"
  | "firework";

export type FireballVariant = "fire_a" | "fire_b" | "fire_c" | "geyser" | "flannel" | "toxic" | "pop" | "starburst";

export type ShockwaveVariant = "ring_fire" | "ring_dust" | "ring_emp" | "ring_flannel" | "ring_toxic" | "ring_air";

export type DebrisKey =
  | "deb_turret"
  | "deb_scrap"
  | "deb_wheel"
  | "deb_log"
  | "deb_porcelain"
  | "deb_rubber"
  | "deb_tag"
  | "deb_rotor"
  | "deb_sod"
  | "deb_helmet"
  | "deb_ember"
  | "deb_confetti_0"
  | "deb_confetti_1"
  | "deb_confetti_2"
  | "deb_confetti_3";

export type CraterSize = "none" | "sm" | "md" | "lg";

export interface ExplosionRecipe {
  style: ExplosionStyle;
  fireball: FireballVariant;
  fireballTint: number | null;
  fireballDuration: number;
  fireballScale: number;
  flashColor: number;
  flashScale: number;
  shockwave: ShockwaveVariant;
  shockwaveScale: number;
  secondaryShockwave: ShockwaveVariant | null;
  secondaryShockwaveScale: number;
  sparkCount: number;
  sparkColors: readonly number[];
  sparkSpeedMin: number;
  sparkSpeedMax: number;
  smokeCount: number;
  smokeTint: number;
  debrisCount: number;
  debrisPool: readonly DebrisKey[];
  heroDebris: DebrisKey | null;
  crater: CraterSize;
  secondaryBursts: number;
  secondaryDelayStep: number;
  secondarySpread: number;
  hitstopSec: number;
  screenFlashAlpha: number;
  screenFlashColor: number;
  comicChance: number;
  comicPool: readonly string[];
  comicColor: string;
}

const FIRE_VARIANTS: readonly FireballVariant[] = ["fire_a", "fire_b", "fire_c"];

const INFANTRY_TINTS: readonly (number | null)[] = [null, 0xffe4a0, 0xffb366];
const FIREWORK_TINTS: readonly number[] = [0xffd60a, 0x00f5d4, 0xff2a6d, 0x72efdd, 0xb8ff3b];

export function selectExplosionStyleForEnemy(kind: Kind, popped = false): ExplosionStyle {
  if (kind === "prigozhin") return "finale";
  if (kind === "boss") return popped ? "inflatable" : "inflatable";
  if (kind === "turtle" || kind === "mtlb") return "armor";
  if (kind === "bukhanka" || kind === "cart" || kind === "scooter") return "vehicle";
  if (kind === "kamikaze") return "shrapnel";
  return "infantry";
}

export function selectExplosionStyleForProjectile(key: string): ExplosionStyle {
  if (key === "shell") return "artillery";
  if (key === "rocket" || key === "drone" || key === "ammocrate") return "shrapnel";
  if (key === "moto") return "vehicle";
  return "infantry";
}

export function computeExplosionFrame(progress: number, frameCount: number): number {
  if (frameCount <= 1) return 0;
  const clamped = Math.max(0, Math.min(0.9999, progress));
  return Math.floor(clamped * frameCount);
}

export function computeBallisticStep(
  z: number,
  vz: number,
  gravity: number,
  bounce: number,
  dt: number,
): { z: number; vz: number; bounced: boolean } {
  const nextVz = vz - gravity * dt;
  let nextZ = z + nextVz * dt;
  if (nextZ <= 0) {
    nextZ = 0;
    const rebound = Math.abs(nextVz) * bounce;
    if (rebound > 32) {
      return { z: 0, vz: rebound, bounced: true };
    }
    return { z: 0, vz: 0, bounced: false };
  }
  return { z: nextZ, vz: nextVz, bounced: false };
}

export function computeExplosionRecipe(style: ExplosionStyle, rawScale: number, seed: number): ExplosionRecipe {
  const scale = Math.max(0.55, Math.min(4.8, rawScale));
  const unit = Math.abs(Math.sin(seed * 12.9898 + 78.233)) % 1;
  const pickIdx = (len: number) => Math.floor(unit * len) % len;
  const fireVar = FIRE_VARIANTS[pickIdx(FIRE_VARIANTS.length)]!;

  switch (style) {
    case "armor":
      return {
        style,
        fireball: fireVar,
        fireballTint: null,
        fireballDuration: 0.46,
        fireballScale: scale * 1.25,
        flashColor: 0xfff5cc,
        flashScale: scale * 1.45,
        shockwave: "ring_fire",
        shockwaveScale: scale * 2.15,
        secondaryShockwave: "ring_dust",
        secondaryShockwaveScale: scale * 1.55,
        sparkCount: Math.min(20, Math.round(11 * scale)),
        sparkColors: [0xffd60a, 0xff6b00, 0xffffff, 0xff3b1f],
        sparkSpeedMin: 95,
        sparkSpeedMax: 250,
        smokeCount: 6,
        smokeTint: 0x26292e,
        debrisCount: 6,
        debrisPool: ["deb_scrap", "deb_wheel", "deb_ember", "deb_porcelain"],
        heroDebris: "deb_turret",
        crater: "lg",
        secondaryBursts: 3,
        secondaryDelayStep: 0.095,
        secondarySpread: 34 * Math.min(1.6, scale),
        hitstopSec: 0.032,
        screenFlashAlpha: 0.14,
        screenFlashColor: 0xffb703,
        comicChance: 0.72,
        comicPool: ["TURRET TOSS!", "COOK-OFF!", "AMMO RACK!"],
        comicColor: "#ff9e00",
      };

    case "vehicle":
      return {
        style,
        fireball: fireVar,
        fireballTint: null,
        fireballDuration: 0.42,
        fireballScale: scale * 1.15,
        flashColor: 0xffe8a3,
        flashScale: scale * 1.25,
        shockwave: "ring_fire",
        shockwaveScale: scale * 1.85,
        secondaryShockwave: null,
        secondaryShockwaveScale: 0,
        sparkCount: Math.min(16, Math.round(9 * scale)),
        sparkColors: [0xffd60a, 0xff8c00, 0xfff3b0],
        sparkSpeedMin: 80,
        sparkSpeedMax: 210,
        smokeCount: 5,
        smokeTint: 0x35393e,
        debrisCount: 5,
        debrisPool: ["deb_wheel", "deb_log", "deb_scrap", "deb_porcelain"],
        heroDebris: null,
        crater: "md",
        secondaryBursts: 1,
        secondaryDelayStep: 0.09,
        secondarySpread: 22 * Math.min(1.5, scale),
        hitstopSec: 0.018,
        screenFlashAlpha: 0.08,
        screenFlashColor: 0xff8c00,
        comicChance: 0.25,
        comicPool: ["SCRAPPED!", "KAPUT!", "KABOOM!"],
        comicColor: "#ffd60a",
      };

    case "artillery":
      return {
        style,
        fireball: "geyser",
        fireballTint: null,
        fireballDuration: 0.5,
        fireballScale: scale * 1.28,
        flashColor: 0xfff8d6,
        flashScale: scale * 1.5,
        shockwave: "ring_dust",
        shockwaveScale: scale * 2.25,
        secondaryShockwave: "ring_fire",
        secondaryShockwaveScale: scale * 1.55,
        sparkCount: Math.min(18, Math.round(10 * scale)),
        sparkColors: [0xffe66d, 0xff7b00, 0xffffff],
        sparkSpeedMin: 110,
        sparkSpeedMax: 260,
        smokeCount: 6,
        smokeTint: 0x4b4236,
        debrisCount: 7,
        debrisPool: ["deb_sod", "deb_scrap", "deb_ember"],
        heroDebris: null,
        crater: "lg",
        secondaryBursts: 1,
        secondaryDelayStep: 0.08,
        secondarySpread: 24 * Math.min(1.5, scale),
        hitstopSec: 0.022,
        screenFlashAlpha: 0.11,
        screenFlashColor: 0xffe66d,
        comicChance: 0.18,
        comicPool: ["155MM!", "ON TARGET!", "EARTHSHAKER!"],
        comicColor: "#ffe66d",
      };

    case "shrapnel":
      return {
        style,
        fireball: "fire_b",
        fireballTint: 0xffd180,
        fireballDuration: 0.34,
        fireballScale: scale * 1.05,
        flashColor: 0xb8f8ff,
        flashScale: scale * 1.2,
        shockwave: "ring_emp",
        shockwaveScale: scale * 1.75,
        secondaryShockwave: null,
        secondaryShockwaveScale: 0,
        sparkCount: Math.min(16, Math.round(10 * scale)),
        sparkColors: [0x00f5d4, 0xffffff, 0xffd60a, 0xff4d6d],
        sparkSpeedMin: 110,
        sparkSpeedMax: 250,
        smokeCount: 3,
        smokeTint: 0x3b424c,
        debrisCount: 4,
        debrisPool: ["deb_rotor", "deb_scrap", "deb_ember"],
        heroDebris: null,
        crater: "sm",
        secondaryBursts: 0,
        secondaryDelayStep: 0,
        secondarySpread: 0,
        hitstopSec: 0,
        screenFlashAlpha: 0.06,
        screenFlashColor: 0x00f5d4,
        comicChance: 0.14,
        comicPool: ["ZAP!", "SHRED!", "BZZT!"],
        comicColor: "#00f5d4",
      };

    case "inflatable":
      return {
        style,
        fireball: "pop",
        fireballTint: null,
        fireballDuration: 0.44,
        fireballScale: scale * 1.12,
        flashColor: 0xd8fff9,
        flashScale: scale * 1.35,
        shockwave: "ring_air",
        shockwaveScale: scale * 2.1,
        secondaryShockwave: "ring_fire",
        secondaryShockwaveScale: scale * 1.4,
        sparkCount: Math.min(24, Math.round(10 * scale)),
        sparkColors: [0x00f5d4, 0xffd60a, 0xffffff, 0x80ffdb],
        sparkSpeedMin: 120,
        sparkSpeedMax: 290,
        smokeCount: 4,
        smokeTint: 0xcbd5e1,
        debrisCount: 10,
        debrisPool: ["deb_rubber", "deb_tag", "deb_confetti_0", "deb_confetti_1"],
        heroDebris: "deb_tag",
        crater: "md",
        secondaryBursts: 4,
        secondaryDelayStep: 0.08,
        secondarySpread: 44 * Math.min(1.5, scale * 0.55),
        hitstopSec: 0.042,
        screenFlashAlpha: 0.2,
        screenFlashColor: 0x72efdd,
        comicChance: 0.9,
        comicPool: ["DEFLATED!", "RUBBER POP!", "FAKE S-400!"],
        comicColor: "#72efdd",
      };

    case "ambush":
      return {
        style,
        fireball: "flannel",
        fireballTint: null,
        fireballDuration: 0.5,
        fireballScale: scale * 1.35,
        flashColor: 0xfff3b0,
        flashScale: scale * 1.75,
        shockwave: "ring_flannel",
        shockwaveScale: scale * 2.45,
        secondaryShockwave: "ring_emp",
        secondaryShockwaveScale: scale * 1.8,
        sparkCount: Math.min(28, Math.round(14 * scale)),
        sparkColors: [0xffd60a, 0xe63946, 0x00f5d4, 0xffffff],
        sparkSpeedMin: 130,
        sparkSpeedMax: 320,
        smokeCount: 6,
        smokeTint: 0x3b2c2a,
        debrisCount: 7,
        debrisPool: ["deb_porcelain", "deb_scrap", "deb_ember"],
        heroDebris: null,
        crater: "lg",
        secondaryBursts: 4,
        secondaryDelayStep: 0.065,
        secondarySpread: 58,
        hitstopSec: 0.042,
        screenFlashAlpha: 0.22,
        screenFlashColor: 0xffd60a,
        comicChance: 0,
        comicPool: [],
        comicColor: "#ffd60a",
      };

    case "finale":
      return {
        style,
        fireball: "toxic",
        fireballTint: null,
        fireballDuration: 0.58,
        fireballScale: scale * 1.05,
        flashColor: 0xd9ff70,
        flashScale: scale * 1.4,
        shockwave: "ring_toxic",
        shockwaveScale: scale * 1.85,
        secondaryShockwave: "ring_fire",
        secondaryShockwaveScale: scale * 1.35,
        sparkCount: Math.min(34, Math.round(10 * scale)),
        sparkColors: [0x39ff14, 0xff0054, 0xffd60a, 0xffffff],
        sparkSpeedMin: 130,
        sparkSpeedMax: 340,
        smokeCount: 8,
        smokeTint: 0x243326,
        debrisCount: 11,
        debrisPool: ["deb_scrap", "deb_ember", "deb_log", "deb_porcelain"],
        heroDebris: "deb_turret",
        crater: "lg",
        secondaryBursts: 6,
        secondaryDelayStep: 0.095,
        secondarySpread: 78,
        hitstopSec: 0.055,
        screenFlashAlpha: 0.28,
        screenFlashColor: 0x39ff14,
        comicChance: 0,
        comicPool: [],
        comicColor: "#39ff14",
      };

    case "firework": {
      const tint = FIREWORK_TINTS[pickIdx(FIREWORK_TINTS.length)]!;
      return {
        style,
        fireball: "starburst",
        fireballTint: tint,
        fireballDuration: 0.48,
        fireballScale: scale * 1.05,
        flashColor: tint,
        flashScale: scale * 1.15,
        shockwave: "ring_air",
        shockwaveScale: Math.min(2.1, scale * 1.15),
        secondaryShockwave: null,
        secondaryShockwaveScale: 0,
        sparkCount: 26,
        sparkColors: [tint, 0xffffff, 0xffd60a, 0x00f5d4],
        sparkSpeedMin: 120,
        sparkSpeedMax: 310,
        smokeCount: 0,
        smokeTint: 0x94a3b8,
        debrisCount: 10,
        debrisPool: ["deb_confetti_0", "deb_confetti_1", "deb_confetti_2", "deb_confetti_3"],
        heroDebris: null,
        crater: "none",
        secondaryBursts: 1,
        secondaryDelayStep: 0.12,
        secondarySpread: 42,
        hitstopSec: 0,
        screenFlashAlpha: 0.08,
        screenFlashColor: tint,
        comicChance: 0,
        comicPool: [],
        comicColor: "#00f5d4",
      };
    }

    case "infantry":
    default:
      return {
        style: "infantry",
        fireball: fireVar,
        fireballTint: INFANTRY_TINTS[pickIdx(INFANTRY_TINTS.length)] ?? null,
        fireballDuration: 0.34,
        fireballScale: scale * 1.0,
        flashColor: 0xfff0b3,
        flashScale: scale * 1.05,
        shockwave: "ring_fire",
        shockwaveScale: scale * 1.4,
        secondaryShockwave: null,
        secondaryShockwaveScale: 0,
        sparkCount: Math.min(11, Math.max(5, Math.round(6 * scale))),
        sparkColors: [0xffe66d, 0xff8c00, 0xffffff],
        sparkSpeedMin: 70,
        sparkSpeedMax: 175,
        smokeCount: 2,
        smokeTint: 0x474d54,
        debrisCount: 2,
        debrisPool: ["deb_helmet", "deb_scrap", "deb_ember"],
        heroDebris: null,
        crater: scale >= 1.25 ? "sm" : "none",
        secondaryBursts: 0,
        secondaryDelayStep: 0,
        secondarySpread: 0,
        hitstopSec: 0,
        screenFlashAlpha: 0,
        screenFlashColor: 0xffe66d,
        comicChance: 0.08,
        comicPool: ["BOOM!", "POP!", "BLYAT!"],
        comicColor: "#ffe66d",
      };
  }
}
