import { describe, expect, it, beforeEach } from "vitest";
import { formatTime, loadSave, patchSettings, recordRun, writeSave } from "./save";
import type { RunResult, SaveData } from "./types";

describe("save system", () => {
  beforeEach(() => {
    if (typeof localStorage === "undefined") {
      let store: Record<string, string> = {};
      (globalThis as any).localStorage = {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = String(v);
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          store = {};
        },
      };
    } else {
      localStorage.clear();
    }
  });

  it("returns default save data when localStorage is empty", () => {
    const save = loadSave();
    expect(save.version).toBe(1);
    expect(save.bestTime).toBe(0);
    expect(save.totalKills).toBe(0);
    expect(save.bestLevel).toBe(0);
    expect(save.runs).toBe(0);
    expect(save.muted).toBe(false);
    expect(save.shake).toBe(true);
  });

  it("persists and reloads save data accurately", () => {
    const customSave: SaveData = {
      version: 1,
      bestTime: 245.5,
      totalKills: 890,
      bestLevel: 14,
      bestWave: 8,
      bestCombo: 45,
      runs: 5,
      muted: true,
      shake: false,
    };
    writeSave(customSave);

    const loaded = loadSave();
    expect(loaded.bestTime).toBe(245.5);
    expect(loaded.totalKills).toBe(890);
    expect(loaded.bestLevel).toBe(14);
    expect(loaded.bestWave).toBe(8);
    expect(loaded.bestCombo).toBe(45);
    expect(loaded.runs).toBe(5);
    expect(loaded.muted).toBe(true);
    expect(loaded.shake).toBe(false);
  });

  it("sanitizes corrupted or negative numbers in storage", () => {
    localStorage.setItem(
      "flannel-storm-v1",
      JSON.stringify({
        version: 1,
        bestTime: -50,
        totalKills: "NaN",
        bestLevel: Infinity,
        runs: 3,
        muted: "invalid",
        shake: null,
      }),
    );
    const loaded = loadSave();
    expect(loaded.bestTime).toBe(0);
    expect(loaded.totalKills).toBe(0);
    expect(loaded.bestLevel).toBe(0);
    expect(loaded.runs).toBe(3);
    expect(loaded.muted).toBe(false);
    expect(loaded.shake).toBe(true);
  });

  it("updates bests and aggregates kills on recordRun", () => {
    const run1: RunResult = {
      time: 120,
      kills: 50,
      level: 5,
      wave: 4,
      maxCombo: 12,
      rankTitle: "FRONT-LINE BADASS",
      victory: false,
    };
    const saved1 = recordRun(run1);
    expect(saved1.runs).toBe(1);
    expect(saved1.bestTime).toBe(120);
    expect(saved1.totalKills).toBe(50);
    expect(saved1.bestLevel).toBe(5);
    expect(saved1.bestWave).toBe(4);
    expect(saved1.bestCombo).toBe(12);

    const run2: RunResult = {
      time: 80,
      kills: 30,
      level: 3,
      wave: 3,
      maxCombo: 25,
      rankTitle: "WASHING MACHINE TACTICIAN",
      victory: false,
    };
    const saved2 = recordRun(run2);
    expect(saved2.runs).toBe(2);
    expect(saved2.bestTime).toBe(120); // Kept higher
    expect(saved2.totalKills).toBe(80); // 50 + 30
    expect(saved2.bestCombo).toBe(25); // 25 > 12
  });

  it("allows patching audio and screen shake settings independently", () => {
    const initial = loadSave();
    expect(initial.muted).toBe(false);

    const patchedMute = patchSettings({ muted: true });
    expect(patchedMute.muted).toBe(true);
    expect(patchedMute.shake).toBe(true);

    const patchedShake = patchSettings({ shake: false });
    expect(patchedShake.muted).toBe(true);
    expect(patchedShake.shake).toBe(false);
  });

  it("formats seconds to mm:ss properly", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(9)).toBe("00:09");
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(3599)).toBe("59:59");
    expect(formatTime(-10)).toBe("00:00");
  });
});
