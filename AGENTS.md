# Agent Guidelines: Operation: Flannel Storm

Welcome to **Operation: Flannel Storm**, a 16-bit retro parody bullet heaven game featuring General Pavel's one-button flannel ambush.

---

## 1. Project Technology Stack

- **Framework**: React 19 (HUD, menus, overlays, dialogs)
- **Game Engine**: Phaser 3.88+ (Canvas / WebGL rendering, arcade physics, camera tracking)
- **Bundler & Tooling**: Vite 8, TypeScript 5.7+, Tailwind CSS v4
- **Testing**: Vitest 3+ for unit testing
- **Audio**: Web Audio API with procedural synthesis (`src/game/audio.ts`)
- **Persistence**: Client-side `localStorage` with defensive number sanitization (`src/game/save.ts`)

---

## 2. Core Architecture & Subsystems

The codebase follows a modular, decoupled architecture:

1. **Phaser & React Decoupling (`src/game/eventBus.ts`)**:
   - Communication between the Phaser game loop and the React HUD/UI is strictly conducted through `bus` (`src/game/eventBus.ts`).
   - Phaser emits events such as `stats-update`, `trigger-level-up`, `game-over`, and listens to `deploy`, `select-upgrade`, `pause-game`, `resume-game`.
   - Never directly mutate React state from Phaser scenes or vice versa.

2. **Game Systems (`src/game/systems/`)**:
   - `EnemySystem.ts`: Handles enemy AI archetypes, wave progression, dynamic squad rushes, riot shield mechanics, and boss battles (including the 5-minute Grand Finale).
   - `WeaponSystem.ts`: Manages weapon cooldowns, volleys (Bren gun, artillery barrage, drone swarms, motorcycle charges, MLRS rockets), and ambush damage multipliers.
   - `LootSystem.ts`: Controls pickup spawning (dog tags, pilsner kegs), magnetic pull curves, XP distribution, and the NAFO Shiba companion AI.
   - `FxSystem.ts`: Orchestrates particle effects, visual explosions, and a pre-allocated pool of 40 floating combat damage numbers.

3. **Pure Logic & Unit Tests (`src/game/rules.ts` & `src/game/rules.test.ts`)**:
   - Keep game calculation formulas (XP curves, pressure, wave milestones, damage multipliers, rank titles) pure and decoupled from Phaser / DOM.
   - Every modification to game progression formulas must be validated with tests.

4. **Spatial Partitioning (`src/game/spatial/SpatialGrid.ts`)**:
   - Pairwise enemy separation and proximity queries must use the 2D Spatial Hash Grid ($O(N)$) to avoid $O(N^2)$ performance degradation.
   - Zero per-frame heap allocations: uses pre-allocated `Int32Array` linked lists.

5. **Audio System (`src/game/audio.ts`)**:
   - Uses procedural Web Audio oscillator synthesis (no external audio assets).
   - Manages audio timeouts with explicit lifecycle tracking (`timers: number[]`) to prevent dangling audio leaks when muted or destroyed.

---

## 3. Development & Verification Workflow

Always verify your changes before finishing tasks:

```bash
# Run test suite
npm test

# Verify TypeScript types
npm run typecheck

# Check code formatting & linting
npm run lint

# Verify production build
npm run build
```

---

## 4. Coding Standards & Best Practices

- **Zero-Allocation Gameplay Loops**: Avoid creating temporary objects, arrays, or closures inside high-frequency `update()` cycles to prevent garbage collection frame drops.
- **Defensive Type Safety**: Strict TypeScript typings for all events on `bus` and game states.
- **Pure CSS / Tailwind for UI**: Keep retro arcade aesthetic consistent with Tailwind v4 classes and `src/styles.css`.
