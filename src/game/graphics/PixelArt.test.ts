import { describe, expect, it } from "vitest";
import { PixelCanvas } from "./PixelArt";

describe("PixelCanvas", () => {
  it("initializes grid with correct dimensions and scale", () => {
    const pc = new PixelCanvas(16, 20, 2);
    expect(pc.width).toBe(16);
    expect(pc.height).toBe(20);
    expect(pc.scale).toBe(2);
    expect(pc.get(0, 0)).toBe("");
  });

  it("sets and gets colors within bounds", () => {
    const pc = new PixelCanvas(10, 10, 2);
    pc.set(5, 5, "#ff0000");
    expect(pc.get(5, 5)).toBe("#ff0000");

    // Out of bounds should be safe and return empty
    pc.set(-1, 5, "#ff0000");
    pc.set(10, 5, "#ff0000");
    expect(pc.get(-1, 5)).toBe("");
    expect(pc.get(10, 5)).toBe("");
  });

  it("draws filled rectangles correctly", () => {
    const pc = new PixelCanvas(10, 10, 2);
    pc.rect(2, 3, 4, 2, "#00ff00");
    expect(pc.get(2, 3)).toBe("#00ff00");
    expect(pc.get(5, 4)).toBe("#00ff00");
    expect(pc.get(1, 3)).toBe("");
    expect(pc.get(6, 3)).toBe("");
  });

  it("creates dither patterns accurately", () => {
    const pc = new PixelCanvas(4, 4, 1);
    pc.dither(0, 0, 2, 2, "#111111", "#222222");
    expect(pc.get(0, 0)).toBe("#111111");
    expect(pc.get(1, 0)).toBe("#222222");
    expect(pc.get(0, 1)).toBe("#222222");
    expect(pc.get(1, 1)).toBe("#111111");
  });

  it("adds outlines around colored regions", () => {
    const pc = new PixelCanvas(6, 6, 1);
    pc.set(2, 2, "#ffffff");
    pc.addOutline("#000000");

    // 4-way neighbors should be outlined
    expect(pc.get(2, 1)).toBe("#000000");
    expect(pc.get(2, 3)).toBe("#000000");
    expect(pc.get(1, 2)).toBe("#000000");
    expect(pc.get(3, 2)).toBe("#000000");
    // Center pixel should remain #ffffff
    expect(pc.get(2, 2)).toBe("#ffffff");
  });

  it("clones grid accurately with deep copy", () => {
    const pc = new PixelCanvas(4, 4, 2);
    pc.set(1, 1, "#abcabc");
    const clone = pc.clone();
    expect(clone.width).toBe(pc.width);
    expect(clone.height).toBe(pc.height);
    expect(clone.scale).toBe(pc.scale);
    expect(clone.get(1, 1)).toBe("#abcabc");

    // Mutating clone should not mutate original
    clone.set(1, 1, "#123123");
    expect(pc.get(1, 1)).toBe("#abcabc");
    expect(clone.get(1, 1)).toBe("#123123");
  });
});
