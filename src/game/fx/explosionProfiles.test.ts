import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  computeBallisticStep,
  computeExplosionFrame,
  computeExplosionRecipe,
  selectExplosionStyleForEnemy,
  selectExplosionStyleForProjectile,
  type ExplosionStyle,
} from "./explosionProfiles";

describe("explosionProfiles", () => {
  it("maps every enemy archetype to a distinct, thematic explosion style", () => {
    assert.equal(selectExplosionStyleForEnemy("turtle"), "armor");
    assert.equal(selectExplosionStyleForEnemy("mtlb"), "armor");
    assert.equal(selectExplosionStyleForEnemy("bukhanka"), "vehicle");
    assert.equal(selectExplosionStyleForEnemy("cart"), "vehicle");
    assert.equal(selectExplosionStyleForEnemy("scooter"), "vehicle");
    assert.equal(selectExplosionStyleForEnemy("kamikaze"), "shrapnel");
    assert.equal(selectExplosionStyleForEnemy("boss", true), "inflatable");
    assert.equal(selectExplosionStyleForEnemy("prigozhin"), "finale");
    assert.equal(selectExplosionStyleForEnemy("conscript"), "infantry");
    assert.equal(selectExplosionStyleForEnemy("tiktok"), "infantry");
    assert.equal(selectExplosionStyleForEnemy("riot"), "infantry");
    assert.equal(selectExplosionStyleForEnemy("dog"), "infantry");
  });

  it("maps projectile keys to appropriate explosion styles", () => {
    assert.equal(selectExplosionStyleForProjectile("shell"), "artillery");
    assert.equal(selectExplosionStyleForProjectile("rocket"), "shrapnel");
    assert.equal(selectExplosionStyleForProjectile("drone"), "shrapnel");
    assert.equal(selectExplosionStyleForProjectile("moto"), "vehicle");
    assert.equal(selectExplosionStyleForProjectile("bullet"), "infantry");
  });

  it("produces varied, bounded recipes across all 9 explosion styles", () => {
    const styles: ExplosionStyle[] = [
      "infantry",
      "vehicle",
      "armor",
      "artillery",
      "shrapnel",
      "inflatable",
      "ambush",
      "finale",
      "firework",
    ];
    const shockwaves = new Set<string>();
    const fireballs = new Set<string>();

    for (const style of styles) {
      const r = computeExplosionRecipe(style, 1.4, 7);
      assert.equal(r.style, style);
      assert.ok(r.fireballDuration >= 0.3 && r.fireballDuration <= 0.65);
      assert.ok(r.sparkCount >= 5 && r.sparkCount <= 34);
      assert.ok(r.sparkColors.length >= 3);
      assert.ok(r.debrisPool.length >= 2);
      shockwaves.add(r.shockwave);
      fireballs.add(r.fireball);
    }

    assert.ok(shockwaves.size >= 5, "Expected at least 5 distinct shockwave textures across styles");
    assert.ok(fireballs.size >= 5, "Expected at least 5 distinct fireball variants across styles");

    // Armor kills always launch the iconic spinning tank turret + secondary cook-offs
    const armor = computeExplosionRecipe("armor", 1.2, 3);
    assert.equal(armor.heroDebris, "deb_turret");
    assert.ok(armor.secondaryBursts >= 2);
    assert.equal(armor.crater, "lg");

    // Inflatable boss pops into fluttering SALE tags & rubber scraps with compressed-air shockwave
    const boss = computeExplosionRecipe("inflatable", 2.8, 11);
    assert.equal(boss.heroDebris, "deb_tag");
    assert.equal(boss.shockwave, "ring_air");
    assert.ok(boss.secondaryBursts >= 3);

    // Article 5 Ambush uses signature flannel blast & shockwave
    const ambush = computeExplosionRecipe("ambush", 2.0, 5);
    assert.equal(ambush.fireball, "flannel");
    assert.equal(ambush.shockwave, "ring_flannel");
    assert.ok(ambush.hitstopSec > 0.02);
  });

  it("varies fireball shapes across seeds for infantry kills", () => {
    const seen = new Set<string>();
    for (let s = 1; s <= 25; s++) {
      seen.add(computeExplosionRecipe("infantry", 1.0, s).fireball);
    }
    assert.equal(seen.size, 3, "Infantry explosions should cycle through all 3 fireball shapes");
  });

  it("computes clamped animation frames and ballistic bounce arcs accurately", () => {
    assert.equal(computeExplosionFrame(-0.2, 6), 0);
    assert.equal(computeExplosionFrame(0.0, 6), 0);
    assert.equal(computeExplosionFrame(0.5, 6), 3);
    assert.equal(computeExplosionFrame(1.2, 6), 5);

    // Rising debris slows down under gravity
    const rising = computeBallisticStep(10, 200, 600, 0.45, 0.1);
    assert.equal(rising.bounced, false);
    assert.ok(rising.z > 10);
    assert.equal(rising.vz, 140);

    // Falling debris hits ground and bounces with damped velocity
    const hit = computeBallisticStep(4, -180, 600, 0.45, 0.1);
    assert.equal(hit.z, 0);
    assert.equal(hit.bounced, true);
    assert.ok(hit.vz > 80 && hit.vz < 120);

    // Low-speed impact settles cleanly to rest
    const settle = computeBallisticStep(1, -20, 400, 0.4, 0.05);
    assert.equal(settle.z, 0);
    assert.equal(settle.vz, 0);
    assert.equal(settle.bounced, false);
  });
});
