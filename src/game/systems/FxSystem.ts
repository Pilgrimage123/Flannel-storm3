import * as Phaser from "phaser";
import { bus } from "../eventBus";

export class FxSystem {
  private scene: Phaser.Scene;
  private fxGroup: Phaser.GameObjects.Group;
  private floaters: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, fxGroup: Phaser.GameObjects.Group) {
    this.scene = scene;
    this.fxGroup = fxGroup;
  }

  init() {
    this.paintFx();
    this.floaters = [];
    for (let i = 0; i < 60; i++) {
      const t = this.scene.add
        .text(0, 0, "", {
          fontFamily: '"Press Start 2P", "Courier New", monospace',
          fontSize: "13px",
          fontStyle: "bold",
          color: "#ffe66d",
          stroke: "#10140d",
          strokeThickness: 4,
        })
        .setActive(false)
        .setVisible(false)
        .setDepth(4000)
        .setOrigin(0.5, 1);
      this.floaters.push(t);
    }
  }

  onResize() {
    // Tactical banners now live in the responsive DOM HUD lane; no canvas repositioning required.
  }

  private paintFx() {
    const textures = this.scene.textures;
    const paint = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      if (textures.exists(key)) return;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      draw(ctx);
      textures.addCanvas(key, c);
    };

    paint("loot", 56, 18, (ctx) => {
      ctx.fillStyle = "#10160e";
      ctx.fillRect(2, 2, 52, 14);
      ctx.fillStyle = "#ffd60a";
      ctx.fillRect(0, 2, 2, 14);
      ctx.fillRect(54, 2, 2, 14);
      ctx.fillRect(2, 0, 52, 2);
      ctx.fillRect(2, 16, 52, 2);
      ctx.fillStyle = "#fff6d8";
      ctx.font = "bold 11px Courier New";
      ctx.fillText("LOOT!", 8, 13);
    });

    paint("ring", 96, 96, (ctx) => {
      // Pixelated stepped beacon ring
      ctx.fillStyle = "#7ad0ff";
      for (let a = 0; a < 48; a++) {
        const ang = (a / 48) * Math.PI * 2;
        const px = Math.round((48 + Math.cos(ang) * 36) / 2) * 2;
        const py = Math.round((48 + Math.sin(ang) * 36) / 2) * 2;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    });

    paint("brick", 18, 12, (ctx) => {
      ctx.fillStyle = "#1a0d0a";
      ctx.fillRect(0, 0, 18, 12);
      ctx.fillStyle = "#c44536";
      ctx.fillRect(2, 2, 14, 8);
      ctx.fillStyle = "#e06a56";
      ctx.fillRect(2, 2, 14, 2);
    });

    paint("flame", 48, 48, (ctx) => {
      ctx.fillStyle = "#d9381e";
      ctx.fillRect(14, 16, 20, 22);
      ctx.fillRect(18, 10, 12, 8);
      ctx.fillStyle = "#ff8c00";
      ctx.fillRect(16, 18, 16, 16);
      ctx.fillStyle = "#ffd60a";
      ctx.fillRect(20, 22, 8, 10);
    });

    paint("tire", 18, 8, (ctx) => {
      ctx.fillStyle = "rgba(38, 30, 18, 0.85)";
      ctx.fillRect(0, 2, 6, 4);
      ctx.fillRect(8, 2, 10, 4);
    });

    paint("smoke", 28, 28, (ctx) => {
      // Stepped pixel-art diesel smoke cloud
      ctx.fillStyle = "rgba(34, 38, 42, 0.65)";
      ctx.fillRect(6, 4, 16, 20);
      ctx.fillRect(4, 8, 20, 12);
      ctx.fillStyle = "rgba(74, 80, 86, 0.78)";
      ctx.fillRect(8, 6, 12, 14);
      ctx.fillRect(6, 10, 16, 8);
      ctx.fillStyle = "rgba(116, 124, 130, 0.75)";
      ctx.fillRect(10, 8, 8, 6);
    });

    paint("sniff", 62, 18, (ctx) => {
      ctx.fillStyle = "#1a1208";
      ctx.fillRect(2, 2, 58, 14);
      ctx.fillStyle = "#ff9e00";
      ctx.fillRect(2, 0, 58, 2);
      ctx.fillRect(2, 16, 58, 2);
      ctx.fillStyle = "#ffd6a0";
      ctx.font = "bold 11px Courier New";
      ctx.fillText("SNIFF", 10, 13);
    });

    paint("shield", 64, 64, (ctx) => {
      // Fallback pixel-art directional guard arc if SpriteFactory hasn't built it
      ctx.fillStyle = "#0a1622";
      for (let i = -8; i <= 8; i++) {
        const ang = i * 0.1;
        const px = Math.round((32 + Math.cos(ang) * 24) / 2) * 2;
        const py = Math.round((32 + Math.sin(ang) * 24) / 2) * 2;
        ctx.fillRect(px - 4, py - 4, 8, 8);
      }
      ctx.fillStyle = "#ffd60a";
      for (let i = -7; i <= 7; i++) {
        const ang = i * 0.1;
        const px = Math.round((32 + Math.cos(ang) * 24) / 2) * 2;
        const py = Math.round((32 + Math.sin(ang) * 24) / 2) * 2;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    });

    paint("shockwave", 128, 128, (ctx) => {
      ctx.fillStyle = "#00f5d4";
      for (let a = 0; a < 64; a++) {
        const ang = (a / 64) * Math.PI * 2;
        const px = Math.round((64 + Math.cos(ang) * 56) / 2) * 2;
        const py = Math.round((64 + Math.sin(ang) * 56) / 2) * 2;
        ctx.fillRect(px - 3, py - 3, 6, 6);
      }
      ctx.fillStyle = "#ffd60a";
      for (let a = 0; a < 48; a++) {
        const ang = (a / 48) * Math.PI * 2;
        const px = Math.round((64 + Math.cos(ang) * 50) / 2) * 2;
        const py = Math.round((64 + Math.sin(ang) * 50) / 2) * 2;
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
    });

    paint("spark", 12, 12, (ctx) => {
      ctx.fillStyle = "#ffe66d";
      ctx.fillRect(2, 4, 8, 4);
      ctx.fillRect(4, 2, 4, 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(4, 4, 4, 4);
    });

    paint("star", 16, 16, (ctx) => {
      ctx.fillStyle = "#ffd60a";
      ctx.fillRect(6, 0, 4, 16);
      ctx.fillRect(0, 6, 16, 4);
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(6, 6, 4, 4);
    });
  }

  explode(x: number, y: number, scale: number) {
    const s = this.fxGroup.get(x, y, "boom0") as Phaser.GameObjects.Sprite | null;
    if (!s) return;
    s.setTexture("boom0");
    s.clearTint();
    s.setRotation(0);
    s.setActive(true).setVisible(true).setPosition(x, y).setDepth(3800);
    s.setScale(scale);
    s.setAlpha(1);
    s.setData("life", 0.36);
    this.shockwave(x, y, scale * 1.6);
    this.sparks(x, y, Math.min(8, Math.round(scale * 5)));
  }

  shockwave(x: number, y: number, maxScale = 1.8) {
    const s = this.fxGroup.get(x, y, "shockwave") as Phaser.GameObjects.Sprite | null;
    if (!s) return;
    s.setTexture("shockwave");
    s.clearTint();
    s.setRotation(0);
    s.setActive(true).setVisible(true).setPosition(x, y).setDepth(3700);
    s.setScale(0.2);
    s.setAlpha(0.9);
    s.setData("life", 0.32);
    s.setData("maxScale", maxScale);
  }

  sparks(x: number, y: number, count = 5) {
    for (let i = 0; i < count; i++) {
      const key = Math.random() < 0.4 ? "star" : "spark";
      const s = this.fxGroup.get(x, y, key) as Phaser.GameObjects.Sprite | null;
      if (!s) continue;
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 120;
      s.setTexture(key);
      s.clearTint();
      s.setRotation(0);
      s.setActive(true).setVisible(true).setPosition(x, y).setDepth(3750);
      s.setScale(0.8 + Math.random() * 0.4);
      s.setAlpha(1);
      s.setData("life", 0.28 + Math.random() * 0.15);
      s.setData("vx", Math.cos(ang) * spd);
      s.setData("vy", Math.sin(ang) * spd);
    }
  }

  puff(x: number, y: number, key: string, life: number, depth: number) {
    const s = this.fxGroup.get(x, y, key) as Phaser.GameObjects.Sprite | null;
    if (!s) return;
    s.setTexture(key);
    s.clearTint();
    s.setRotation(0);
    s.setScale(1);
    s.setActive(true).setVisible(true).setPosition(x, y).setDepth(depth);
    s.setAlpha(1);
    s.setData("life", life);
  }

  floater(x: number, y: number, text: string, color: string, scale = 1, isCrit = false) {
    const t = this.floaters.find((f) => !f.visible);
    if (!t) return;

    // Spatial neighbor de-overlapping: nudge new floaters upward so simultaneous
    // damage numbers, crits, and callouts stack cleanly instead of smearing together
    let spawnY = y;
    for (let pass = 0; pass < 5; pass++) {
      let crowded = false;
      for (const other of this.floaters) {
        if (!other.visible || other === t) continue;
        if (Math.abs(other.x - x) < 72 && Math.abs(other.y - spawnY) < 22) {
          crowded = true;
          break;
        }
      }
      if (!crowded) break;
      spawnY -= 22;
    }

    t.setText(text)
      .setColor(color)
      .setPosition(Math.round(x), Math.round(spawnY))
      .setVisible(true)
      .setActive(true)
      .setAlpha(1)
      .setScale(scale);

    if (isCrit) {
      t.setFontSize("15px");
      t.setStroke("#5a0000", 5);
      t.setData("life", 0.72);
      t.setData("vy", -48);
    } else {
      t.setFontSize("12px");
      t.setStroke("#10140d", 4);
      t.setData("life", 0.56);
      t.setData("vy", -34);
    }
  }

  critFloater(x: number, y: number, damage: number) {
    this.floater(x, y - 24, `CRIT ${Math.round(damage)}!`, "#ff9e00", 1.08, true);
    this.sparks(x, y - 10, 4);
  }

  comic(x: number, y: number, text: string, color = "#ffb703") {
    this.floater(x, y - 34, text, color, 1.05, true);
  }

  /**
   * Displays high-priority tactical callouts in the dedicated responsive DOM lane
   * cleanly below the top HUD bar, preventing overlap with HUD or world combat floaters.
   */
  banner(_playerX: number, _playerY: number, text: string, color: string) {
    bus.emit("tactical-banner", { text, color });
  }

  tickFx(dt: number) {
    const kids = this.fxGroup.getChildren() as Phaser.GameObjects.Sprite[];
    for (const s of kids) {
      if (!s.active) continue;
      const key = s.texture.key;
      if (
        !key.startsWith("boom") &&
        key !== "tire" &&
        key !== "smoke" &&
        key !== "shockwave" &&
        key !== "spark" &&
        key !== "star"
      ) {
        continue;
      }
      const life = ((s.getData("life") as number) ?? 0) - dt;
      s.setData("life", life);

      if (key.startsWith("boom")) {
        const frame = Math.max(0, Math.min(3, Math.floor((1 - life / 0.36) * 4)));
        const boomKey = `boom${frame}`;
        if (s.texture.key !== boomKey && this.scene.textures.exists(boomKey)) s.setTexture(boomKey);
        s.setAlpha(Math.max(0, Math.min(1, life / 0.2)));
      } else if (key === "shockwave") {
        const maxScale = (s.getData("maxScale") as number) || 1.8;
        const progress = 1 - Math.max(0, life / 0.32);
        s.setScale(0.2 + progress * (maxScale - 0.2));
        s.setAlpha((1 - progress) * 0.9);
      } else if (key === "smoke") {
        s.y -= 22 * dt;
        s.setScale(s.scaleX + 0.9 * dt);
        s.setAlpha(Math.max(0, Math.min(0.75, life / 0.45)));
      } else if (key === "spark" || key === "star") {
        const vx = (s.getData("vx") as number) || 0;
        const vy = (s.getData("vy") as number) || 0;
        s.x += vx * dt;
        s.y += vy * dt;
        s.setAlpha(Math.max(0, life / 0.3));
        s.rotation += 8 * dt;
      } else {
        s.setAlpha(Math.max(0, Math.min(1, life / 0.2)));
      }

      if (life <= 0) s.setActive(false).setVisible(false);
    }
  }

  tickFloaters(dt: number) {
    for (const t of this.floaters) {
      if (!t.visible) continue;
      const life = ((t.getData("life") as number) ?? 0) - dt;
      t.setData("life", life);
      t.y += ((t.getData("vy") as number) ?? -30) * dt;
      t.setAlpha(Math.max(0, Math.min(1, life / 0.3)));
      if (life <= 0) t.setVisible(false).setActive(false);
    }
  }
}
