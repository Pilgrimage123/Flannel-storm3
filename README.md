# Operation: Flannel Storm 🌲🪓

> **General Pavel's one-button flannel ambush. A 16-bit bullet heaven.**

_Operation: Flannel Storm_ is a retro 16-bit parody bullet heaven action game built with **React 19**, **Phaser 3**, **TypeScript**, **Tailwind CSS v4**, and the **Web Audio API**.

---

## 🎮 Features & Gameplay

- **One-Button Ambush Mechanics**: Dodge, stealth recharge, tactical dash, and unleash devastating ambushes with high damage multipliers.
- **Dynamic Wave Progression & Bosses**: Escalating Russian parody enemies (conscripts, TikTok brigades, golf cart motorcades, turtle tanks, riot shield phalanxes) and boss encounters culminating in a 5-minute Grand Finale against the Warlord clone.
- **Arsenal & Upgrades**: Bren guns, drone strikes, motorcycle charges, artillery barrages, MLRS rockets, and passive buffs (Lumberjack Flannel, Pilsner Urquell Rage, NAFO Shiba companion).
- **Procedural Pixel Art & FX**: Custom canvas-rendered 16-bit sprites, animated exhausts, floating combat text, and screen shake.
- **Retro Chiptune Audio**: Pure Web Audio API synthesized sound effects and 8-bit soundtrack without external audio asset bloat.

---

## 🛠️ Architecture Overview

The codebase is organized into a clean decoupled modular architecture:

```
src/
├── components/flannel/
│   └── GameApp.tsx             # React HUD overlay, upgrade dialogs, menu, settings
├── game/
│   ├── GameScene.ts            # Lean Phaser scene orchestrator (input, cameras, physics)
│   ├── audio.ts                # Web Audio API procedural sound synthesizer (Synth)
│   ├── catalog.ts              # Definitions for weapons, passives, and upgrade stats
│   ├── createGame.ts           # Phaser game instance lifecycle bootstrapper
│   ├── eventBus.ts             # Strongly typed event bus connecting Phaser to React UI
│   ├── rules.ts                # Pure game logic: XP curves, wave scaling, damage calculations
│   ├── save.ts                 # LocalStorage persistence with defensive sanitization
│   ├── types.ts                # Shared TypeScript type definitions
│   ├── graphics/
│   │   ├── SpriteFactory.ts    # Procedural canvas sprite & animation generation
│   │   └── parodyPalettes.ts   # Uniform specs, color palettes, and animation frames
│   ├── spatial/
│   │   └── SpatialGrid.ts      # O(N) 2D spatial hash grid for zero-allocation separation
│   └── systems/
│       ├── EnemySystem.ts      # Enemy AI archetypes, wave progression, and boss encounters
│       ├── WeaponSystem.ts     # Projectiles, weapon cooldowns, and area-of-effect volleys
│       ├── LootSystem.ts       # Pickups (dog tags, beer kegs), XP magnet, and Shiba AI
│       └── FxSystem.ts         # Visual explosions, floating damage text, particle effects
└── styles.css                  # Tailwind CSS v4 styling & retro arcade layout rules
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ (recommended 22+)
- **npm** 10+

### Installation

```bash
npm install
```

### Development

Start the local development server at `http://localhost:3000`:

```bash
npm run dev
```

### Testing

Run unit tests via **Vitest**:

```bash
npm test          # Single run
npm run test:watch # Watch mode
```

### Type Checking & Linting

```bash
npm run typecheck # TypeScript compiler verification
npm run lint      # ESLint check
npm run format    # Prettier code formatting
```

### Production Build

Compile TypeScript and bundle optimized assets into `dist/`:

```bash
npm run build
npm run preview   # Preview production build locally
```

---

## 📜 License

MIT License.
