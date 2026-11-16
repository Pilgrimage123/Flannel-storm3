import { offerFor, PASSIVE_MAX_RANK, PASSIVES, WEAPON_MAX_RANK, WEAPONS } from "./catalog";
import type { PassiveId, UpgradeOffer, WeaponId } from "./types";

export function nextXpNeed(level: number): number {
  return Math.round(18 + Math.max(1, level) * 12);
}

export function computeWave(timeSurvived: number): number {
  return 1 + Math.floor(Math.max(0, timeSurvived) / 30);
}

export function computePressure(timeSurvived: number): number {
  return 1 + Math.max(0, timeSurvived) / 75;
}

export function computeDamageMultipliers(
  ambushActive: boolean,
  ambushStacks: number,
  combo: number,
  beerRage: number,
): { dmgMul: number; rateMul: number; areaMul: number } {
  const stacks = Math.max(0, ambushStacks);
  const safeCombo = Math.max(0, combo);
  const hasRage = beerRage > 0;

  const ambushDmg = ambushActive ? 1 + stacks * 0.35 : 1;
  const comboDmg = 1 + Math.min(1.5, safeCombo * 0.015);
  const rageDmg = hasRage ? 1.4 : 1;

  const ambushRate = ambushActive ? 1 + stacks * 0.25 : 1;
  const rageRate = hasRage ? 1.85 : 1;
  const comboRate = 1 + Math.min(0.6, safeCombo * 0.006);

  return {
    dmgMul: ambushDmg * comboDmg * rageDmg,
    rateMul: ambushRate * rageRate * comboRate,
    areaMul: ambushActive ? 1 + stacks * 0.25 : 1,
  };
}

export function computeRankTitle(kills: number, victory = false): string {
  if (victory) return "SUPREME ALLIED FIELD MARSHAL";
  if (kills >= 300) return "SUPREME FLANNEL WARLORD";
  if (kills >= 180) return "ARTICLE 5 COMMANDER";
  if (kills >= 90) return "FRONT-LINE BADASS";
  if (kills >= 35) return "WASHING MACHINE TACTICIAN";
  return "APPRENTICE GENERAL";
}

export function isRiotFrontBlock(bulletVx: number, bulletVy: number, riotAim: number): boolean {
  const dot = bulletVx * Math.cos(riotAim) + bulletVy * Math.sin(riotAim);
  return dot <= 0;
}

export function areAllUpgradesMaxed(
  weaponLevels: Partial<Record<WeaponId, number>>,
  passiveRanks: Record<PassiveId, number>,
): boolean {
  return (
    !WEAPONS.some((w) => (weaponLevels[w.id] ?? 0) < WEAPON_MAX_RANK) &&
    !PASSIVES.some((p) => (passiveRanks[p.id] ?? 0) < PASSIVE_MAX_RANK)
  );
}

export function rollUpgradeOffers(
  weaponLevels: Partial<Record<WeaponId, number>>,
  passiveRanks: Record<PassiveId, number>,
  rng: () => number = Math.random,
): UpgradeOffer[] {
  const pool: UpgradeOffer[] = [];
  for (const w of WEAPONS) {
    const owned = weaponLevels[w.id] ?? 0;
    if (owned < WEAPON_MAX_RANK) pool.push(offerFor(w.id, owned + 1));
  }
  for (const p of PASSIVES) {
    const owned = passiveRanks[p.id] ?? 0;
    if (owned < PASSIVE_MAX_RANK) pool.push(offerFor(p.id, owned + 1));
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  if (pool.length >= 3) return pool.slice(0, 3);
  if (pool.length > 0) return pool;
  return [
    {
      id: "bren",
      kind: "weapon",
      name: "Field Rations",
      blurb: "RESTOCK",
      detail: "All gear maxed! Emergency field rations restore 40 HP.",
      rank: 1,
      maxRank: 1,
      rarity: "tactical",
    },
  ];
}
