import { describe, it } from "vitest";
import assert from "node:assert";
import { SpatialGrid } from "./SpatialGrid";

describe("SpatialGrid performance and separation", () => {
  it("initializes without errors and clears correctly", () => {
    const grid = new SpatialGrid(3600, 64, 1024);
    assert.strictEqual(typeof grid.clear, "function");
    grid.clear();
  });

  it("handles separation on synthetic sprite entities without allocation crash", () => {
    const grid = new SpatialGrid(3600, 64, 1024);
    const mockEntities: any[] = [];

    // Create 100 mock entities clustered near (500, 500)
    for (let i = 0; i < 100; i++) {
      mockEntities.push({
        x: 500 + (Math.random() - 0.5) * 40,
        y: 500 + (Math.random() - 0.5) * 40,
        active: true,
        body: {
          velocity: { x: 0, y: 0 },
          setVelocity(vx: number, vy: number) {
            this.velocity.x = vx;
            this.velocity.y = vy;
          },
        },
      });
    }

    grid.resolveSeparation(mockEntities, 12, 14, 500, 500);

    // Verify separation applied repulsive velocities
    const moved = mockEntities.some(
      (e) => Math.abs(e.body.velocity.x) > 0 || Math.abs(e.body.velocity.y) > 0,
    );
    assert.strictEqual(moved, true, "Separation forces should push clustered entities apart");
  });

  it("performs fast radius queries", () => {
    const grid = new SpatialGrid(3600, 64, 1024);
    const mockEntities: any[] = [
      { x: 100, y: 100, active: true },
      { x: 110, y: 110, active: true },
      { x: 900, y: 900, active: true }, // Far away
    ];

    for (let i = 0; i < mockEntities.length; i++) {
      grid.insert(mockEntities[i], i);
    }

    const inside = grid.queryRadius(100, 100, 50, mockEntities);
    assert.strictEqual(inside.length, 2, "Radius query should find only nearby entities");
    assert.strictEqual(
      inside.includes(mockEntities[2]),
      false,
      "Distant entity should be excluded",
    );
  });

  it("indexes a single entity during resolveSeparation and handles rebuild after swap-and-pop", () => {
    const grid = new SpatialGrid(3600, 64, 1024);
    const single: any[] = [{ x: 250, y: 250, active: true }];
    grid.resolveSeparation(single, 12, 14, 250, 250);
    const found = grid.queryRadius(250, 250, 40, single);
    assert.strictEqual(found.length, 1, "Single active entity must still be queryable");

    // Simulate swap-and-pop: remove index 0, move last into index 0
    const a: any = { x: 100, y: 100, active: true };
    const b: any = { x: 800, y: 800, active: true };
    const list = [a, b];
    grid.rebuild(list);
    list[0] = list.pop()!; // b moved to index 0
    grid.rebuild(list);

    assert.deepStrictEqual(grid.queryRadius(800, 800, 30, list), [b]);
    assert.deepStrictEqual(grid.queryRadius(100, 100, 30, list), []);
  });
});
