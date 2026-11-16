import type { Kind } from "../types";

export interface EnemyVisualSpec {
  kind: Kind;
  codeName: string;
  parodyTitle: string;
  uniformSummary: string;
  primaryColor: string;
  accentColor: string;
  insignia: string;
  animFps: number;
  shadowWidth: number;
  shadowHeight: number;
  showHealthBar: boolean;
  exhaustPuffs: boolean;
  hasDamageState: boolean;
}

export const ENEMY_VISUAL_SPECS: Record<Kind, EnemyVisualSpec> = {
  conscript: {
    kind: "conscript",
    codeName: "Mobik Conscript",
    parodyTitle: "Newly Mobilized 'Mobik' in Ratty EMR & Tracksuit",
    uniformSummary:
      "Crooked rusty SSh-68 steel pot helmet with head bandage, torn EMR Digital Flora jacket over blue-white striped Telnyashka, three-stripe navy tracksuit pants, St. George ribbon, white Z armband, Blue Isolenta-taped AK, and stolen toilet brush.",
    primaryColor: "#3d5234",
    accentColor: "#ff7700",
    insignia: "Z",
    animFps: 7,
    shadowWidth: 36,
    shadowHeight: 14,
    showHealthBar: false,
    exhaustPuffs: false,
    hasDamageState: false,
  },
  tiktok: {
    kind: "tiktok",
    codeName: "TikTok Battalion Influencer",
    parodyTitle: "Kadyrovite 'Akhmat' TikTok Streamer",
    uniformSummary:
      "Black tacticool vest over designer camo, red-bottom Prada combat boots, bushy chin beard, dark clout sunglasses, solid gold AK-74 fired blindly sideways while staring into a glowing LED ring-light selfie stick streaming LIVE.",
    primaryColor: "#1f2421",
    accentColor: "#ff0055",
    insignia: "LIVE",
    animFps: 8,
    shadowWidth: 38,
    shadowHeight: 14,
    showHealthBar: false,
    exhaustPuffs: false,
    hasDamageState: false,
  },
  scooter: {
    kind: "scooter",
    codeName: "Storm-Scooter Assault Rider",
    parodyTitle: "Mobik on Electric Xiaomi Kick-Scooter with Taped RPG-7",
    uniformSummary:
      "Tracksuit-clad Mobik in SSh-68 helmet balancing on a civilian electric kick-scooter with glowing neon-blue deck LEDs, stolen grocery basket on the stem, and a loaded RPG-7 warhead taped to the handlebars with Blue Isolenta.",
    primaryColor: "#2b384e",
    accentColor: "#00d4ff",
    insignia: "Z-SCOOT",
    animFps: 14,
    shadowWidth: 46,
    shadowHeight: 16,
    showHealthBar: false,
    exhaustPuffs: false,
    hasDamageState: false,
  },
  cart: {
    kind: "cart",
    codeName: "Desertcross Assault Golf Cart",
    parodyTitle: "Chinese Desertcross-1000-3 Buggy with Cope Cage & Stolen Toilet",
    uniformSummary:
      "Unarmored tan utility golf cart with welded rebar cope-cage roof, sloppy white Z on the hood, stolen porcelain toilet roped to the bed, driven by two panicked Mobiks. Below 50% HP, the cope cage buckles and the engine catches fire.",
    primaryColor: "#b59b63",
    accentColor: "#ffffff",
    insignia: "Z",
    animFps: 12,
    shadowWidth: 68,
    shadowHeight: 24,
    showHealthBar: true,
    exhaustPuffs: true,
    hasDamageState: true,
  },
  bukhanka: {
    kind: "bukhanka",
    codeName: "UAZ-452 'Tactical Loaf' Van",
    parodyTitle: "Birch-Log Armored Soviet Bukhanka Van with Roof Carpet & Cope Cage",
    uniformSummary:
      "1965 Soviet UAZ-452 loaf van clad in raw birch & pine tree trunks strapped to the bumper and doors, rebar cope cage, stolen grandma's Persian wall carpet rolled on the roof, and 'БУХАНКА Z' stencil. Spills panicked Mobiks when blown up!",
    primaryColor: "#4f6239",
    accentColor: "#d97706",
    insignia: "БУХАНКА Z",
    animFps: 10,
    shadowWidth: 78,
    shadowHeight: 28,
    showHealthBar: true,
    exhaustPuffs: true,
    hasDamageState: true,
  },
  mtlb: {
    kind: "mtlb",
    codeName: "MT-LB 2M-3 'Franken-Tank'",
    parodyTitle: "Tracked MT-LB Tractor with Welded 1950s Naval Ship Turret",
    uniformSummary:
      "Low-profile olive MT-LB artillery tractor topped with a towering, top-heavy grey 2M-3 twin-25mm naval ship anti-aircraft turret, rubber conveyor-belt skirts, and white Z + anchor stencil. Fires twin naval autocannon bursts!",
    primaryColor: "#4b5842",
    accentColor: "#94a3b8",
    insignia: "ВМФ Z",
    animFps: 10,
    shadowWidth: 84,
    shadowHeight: 30,
    showHealthBar: true,
    exhaustPuffs: true,
    hasDamageState: true,
  },
  turtle: {
    kind: "turtle",
    codeName: "Tsar-Mangal Barn Tank",
    parodyTitle: "Blyatmobile T-62 Entombed in Corrugated Rusty Barn Metal",
    uniformSummary:
      "T-62 chassis buried under corrugated galvanized barn sheets, chicken-wire anti-drone front grill, smoking brick stove chimney, tin-can EW antennas, and stolen blue outhouse door. Below 50% HP, shed plates tear open in flames.",
    primaryColor: "#6e553e",
    accentColor: "#d9534f",
    insignia: "Z",
    animFps: 10,
    shadowWidth: 86,
    shadowHeight: 30,
    showHealthBar: true,
    exhaustPuffs: true,
    hasDamageState: true,
  },
  riot: {
    kind: "riot",
    codeName: "Storm-Z OMON Shield Trooper",
    parodyTitle: "Rosgvardiya OMON in Altyn Helmet with Stolen Road-Sign Shield",
    uniformSummary:
      "Padded olive-gray Gorka suit, spherical Altyn titanium helmet with slit visor, and dented aluminum riot shield patched with a stolen yellow/red danger road sign and ОМОН Z stencil. Below 50% HP, the shield cracks and smokes.",
    primaryColor: "#465342",
    accentColor: "#ffd60a",
    insignia: "ОМОН Z",
    animFps: 6,
    shadowWidth: 42,
    shadowHeight: 16,
    showHealthBar: true,
    exhaustPuffs: false,
    hasDamageState: true,
  },
  kamikaze: {
    kind: "kamikaze",
    codeName: "Geran-2 Moped Drone",
    parodyTitle: "Flying Lawnmower Drone with Blue-Isolenta Taped RPG Warhead",
    uniformSummary:
      "Quad-rotor & delta hybrid drone with spinning rotor blur discs, white Z stencil, sputtering 2-stroke moped motor, and an explosive warhead strapped underneath with bright Blue Isolenta tape.",
    primaryColor: "#262a2e",
    accentColor: "#1e90ff",
    insignia: "ГЕРАНЬ-2",
    animFps: 18,
    shadowWidth: 34,
    shadowHeight: 12,
    showHealthBar: false,
    exhaustPuffs: false,
    hasDamageState: false,
  },
  dog: {
    kind: "dog",
    codeName: "Conscript K9 Recon Hound",
    parodyTitle: "Flak-Vested Shepherd in Tilted SSh-68 Pot Helmet & Tin Radar",
    uniformSummary:
      "Eastern European shepherd squeezed into an oversized olive Soviet flak vest with St. George ribbon and white Z patch, tilted steel pot helmet, and a spinning tin-can sniffer antenna on its back.",
    primaryColor: "#9c6b3b",
    accentColor: "#4a5d3a",
    insignia: "Z",
    animFps: 11,
    shadowWidth: 42,
    shadowHeight: 14,
    showHealthBar: false,
    exhaustPuffs: false,
    hasDamageState: false,
  },
  boss: {
    kind: "boss",
    codeName: "Inflatable S-400 Decoy",
    parodyTitle: "Glossy Rubber Balloon S-400 Triumph with Air Valve & AliExpress Tag",
    uniformSummary:
      "Saggy olive PVC inflatable missile truck with welded balloon seams, four droopy tubes, oversized yellow brass air nozzle, and flapping SALE! price tag. Below 50% HP, Blue Isolenta patches hiss air from punctured tubes.",
    primaryColor: "#429e38",
    accentColor: "#ff2a2a",
    insignia: "С-400 Z",
    animFps: 5,
    shadowWidth: 108,
    shadowHeight: 38,
    showHealthBar: true,
    exhaustPuffs: false,
    hasDamageState: true,
  },
  prigozhin: {
    kind: "prigozhin",
    codeName: "Big Zombie Prigožin Clone",
    parodyTitle: "Undead Wagner Warlord Demanding Ammunition with Giant Sledgehammer",
    uniformSummary:
      "Massive zombie warlord with scarred bald head, glowing red-green eyes, roaring mouth, Wagner plate carrier with crossed bullet belts and 'ГДЕ БК?!' stencil, wielding a bloodied sledgehammer and explosive ammo crate.",
    primaryColor: "#5a6e4c",
    accentColor: "#39ff14",
    insignia: "ГДЕ БК?!",
    animFps: 6,
    shadowWidth: 116,
    shadowHeight: 42,
    showHealthBar: true,
    exhaustPuffs: false,
    hasDamageState: true,
  },
};

export function getEnemyAnimFrame(kind: Kind, timeSurvived: number, entityId: number): 0 | 1 {
  const spec = ENEMY_VISUAL_SPECS[kind];
  const phase = Math.floor(timeSurvived * spec.animFps + entityId * 0.7);
  return (phase & 1) === 0 ? 0 : 1;
}

export function getEnemyTextureKey(
  baseTex: string,
  kind: Kind,
  hp: number,
  maxHp: number,
  timeSurvived: number,
  entityId: number,
): string {
  const spec = ENEMY_VISUAL_SPECS[kind];
  const frameIdx = getEnemyAnimFrame(kind, timeSurvived, entityId);
  const isDamaged = spec.hasDamageState && maxHp > 0 && hp / maxHp < 0.5;
  return isDamaged ? `${baseTex}_dmg_${frameIdx}` : `${baseTex}_${frameIdx}`;
}
