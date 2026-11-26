import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  areAllUpgradesMaxed,
  computeDamageMultipliers,
  computePressure,
  computeRankTitle,
  computeWave,
  isRiotFrontBlock,
  nextXpNeed,
  resolveOverlapPartner,
  rollUpgradeOffers,
} from "./rules";
import { PASSIVE_MAX_RANK, PASSIVES, WEAPON_MAX_RANK, WEAPONS } from "./catalog";
import {
  ENEMY_VISUAL_SPECS,
  getEnemyAnimFrame,
  getEnemyTextureKey,
} from "./graphics/parodyPalettes";

describe("game rules", () => {
  it("computes consistent XP curve, wave, and pressure", () => {
    assert.equal(nextXpNeed(1), 30);
    assert.equal(nextXpNeed(2), 42);
    assert.equal(nextXpNeed(5), 78);

    assert.equal(computeWave(0), 1);
    assert.equal(computeWave(29.9), 1);
    assert.equal(computeWave(30), 2);
    assert.equal(computeWave(300), 11);

    assert.equal(computePressure(0), 1);
    assert.equal(computePressure(75), 2);
  });

  it("computes ambush, combo, and beer rage multipliers independently", () => {
    const idle = computeDamageMultipliers(false, 4, 0, 0);
    assert.equal(idle.dmgMul, 1);
    assert.equal(idle.rateMul, 1);
    assert.equal(idle.areaMul, 1);

    const comboOnly = computeDamageMultipliers(false, 4, 20, 0);
    assert.ok(comboOnly.dmgMul > 1);
    assert.equal(comboOnly.areaMul, 1);

    const ambush = computeDamageMultipliers(true, 4, 0, 5);
    assert.ok(Math.abs(ambush.dmgMul - 2.4 * 1.4) < 1e-6);
    assert.ok(Math.abs(ambush.rateMul - 2.0 * 1.85) < 1e-6);
    assert.equal(ambush.areaMul, 2);
  });

  it("assigns rank titles by kills and victory flag", () => {
    assert.equal(computeRankTitle(0, false), "APPRENTICE GENERAL");
    assert.equal(computeRankTitle(35, false), "WASHING MACHINE TACTICIAN");
    assert.equal(computeRankTitle(90, false), "FRONT-LINE BADASS");
    assert.equal(computeRankTitle(180, false), "ARTICLE 5 COMMANDER");
    assert.equal(computeRankTitle(300, false), "SUPREME FLANNEL WARLORD");
    assert.equal(computeRankTitle(5, true), "SUPREME ALLIED FIELD MARSHAL");
  });

  it("detects riot shield frontal blocks vs backstabs", () => {
    // Riot facing right (aim = 0), bullet traveling left (vx = -100, vy = 0) hits front -> blocked
    assert.equal(isRiotFrontBlock(-100, 0, 0), true);
    // Bullet traveling right (vx = 100, vy = 0) hits from behind -> not blocked
    assert.equal(isRiotFrontBlock(100, 0, 0), false);
    // Grazing perpendicular bullet (dot === 0) -> blocked
    assert.equal(isRiotFrontBlock(0, 100, 0), true);
  });

  it("rolls up to 3 unmaxed upgrade offers and falls back to Field Rations when maxed", () => {
    const offers = rollUpgradeOffers(
      { bren: 1 },
      { lumberjack: 0, pilsner: 0, nafo: 0 },
      () => 0.5,
    );
    assert.equal(offers.length, 3);
    assert.equal(areAllUpgradesMaxed({ bren: 1 }, { lumberjack: 0, pilsner: 0, nafo: 0 }), false);

    const maxWeapons = Object.fromEntries(WEAPONS.map((w) => [w.id, WEAPON_MAX_RANK]));
    const maxPassives = Object.fromEntries(PASSIVES.map((p) => [p.id, PASSIVE_MAX_RANK])) as {
      lumberjack: number;
      pilsner: number;
      nafo: number;
    };
    assert.equal(areAllUpgradesMaxed(maxWeapons, maxPassives), true);
    const maxedOffers = rollUpgradeOffers(maxWeapons, maxPassives);
    assert.equal(maxedOffers.length, 1);
    assert.equal(maxedOffers[0]?.name, "Field Rations");
  });

  it("defines complete Russian army parody uniform and vehicle specs and alternates animation and <50% HP damage frames", () => {
    const kinds = Object.keys(ENEMY_VISUAL_SPECS) as Array<keyof typeof ENEMY_VISUAL_SPECS>;
    assert.equal(kinds.length, 12);
    for (const k of kinds) {
      const spec = ENEMY_VISUAL_SPECS[k];
      assert.ok(spec.uniformSummary.length > 20);
      assert.ok(spec.shadowWidth > 0 && spec.shadowHeight > 0);
      assert.ok(spec.animFps >= 5);
    }
    assert.equal(ENEMY_VISUAL_SPECS.cart.exhaustPuffs, true);
    assert.equal(ENEMY_VISUAL_SPECS.turtle.exhaustPuffs, true);
    assert.equal(ENEMY_VISUAL_SPECS.bukhanka.exhaustPuffs, true);
    assert.equal(ENEMY_VISUAL_SPECS.mtlb.exhaustPuffs, true);
    assert.equal(getEnemyAnimFrame("turtle", 0, 0), 0);
    assert.equal(getEnemyAnimFrame("turtle", 0.1, 0), 1);

    // Healthy vs <50% HP Battle-Damaged directional texture key switching
    assert.equal(getEnemyTextureKey("bukhanka", "bukhanka", 80, 100, 0, 0, 1), "bukhanka_r_0");
    assert.equal(getEnemyTextureKey("bukhanka", "bukhanka", 80, 100, 0, 0, -1), "bukhanka_l_0");
    assert.equal(getEnemyTextureKey("bukhanka", "bukhanka", 49, 100, 0, 0, 1), "bukhanka_dmg_r_0");
    assert.equal(getEnemyTextureKey("bukhanka", "bukhanka", 49, 100, 0.1, 0, -1), "bukhanka_dmg_l_1");
    assert.equal(getEnemyTextureKey("scooter", "scooter", 20, 100, 0, 0, -1), "scooter_l_0");
    assert.equal(getEnemyTextureKey("boss", "boss", 40, 100, 0, 0, 1), "boss_dmg_l_0");
  });

  it("resolves the non-self partner from physics overlap callbacks regardless of argument order", () => {
    const player = { id: "player" };
    const shot = { id: "shot" };
    const other = { id: "other" };

    assert.equal(resolveOverlapPartner(player, player, shot), shot);
    assert.equal(resolveOverlapPartner(player, shot, player), shot);
    assert.equal(resolveOverlapPartner(player, player, player), null);
    assert.equal(resolveOverlapPartner(player, shot, other), null);
  });
});
