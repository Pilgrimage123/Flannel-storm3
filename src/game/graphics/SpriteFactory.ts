import type * as Phaser from "phaser";
import {
  buildPixelBossFrame,
  buildPixelBukhankaFrame,
  buildPixelCartFrame,
  buildPixelConscriptFrame,
  buildPixelDamagedVariant,
  buildPixelDragonTeethProp,
  buildPixelExplosionFrame,
  buildPixelFlamePuff,
  buildPixelGroundTexture,
  buildPixelHeroFrame,
  buildPixelK9Frame,
  buildPixelKamikazeFrame,
  buildPixelMtlbFrame,
  buildPixelPrigozhinFrame,
  buildPixelRiotFrame,
  buildPixelScooterFrame,
  buildPixelShieldArc,
  buildPixelSmokePuff,
  buildPixelTikTokFrame,
  buildPixelTurtleFrame,
} from "./PixelArt";

function registerCanvas(
  textures: Phaser.Textures.TextureManager,
  key: string,
  canvas: HTMLCanvasElement,
) {
  if (textures.exists(key)) {
    textures.remove(key);
  }
  textures.addCanvas(key, canvas);
}

export function installUpgradedGraphics(scene: Phaser.Scene) {
  const tex = scene.textures;

  registerCanvas(tex, "ground", buildPixelGroundTexture());

  const registerPair = (
    baseKey: string,
    f0: HTMLCanvasElement,
    f1: HTMLCanvasElement,
    withDamage = false,
  ) => {
    registerCanvas(tex, baseKey, f0);
    registerCanvas(tex, `${baseKey}_0`, f0);
    registerCanvas(tex, `${baseKey}_1`, f1);
    if (withDamage) {
      registerCanvas(tex, `${baseKey}_dmg_0`, buildPixelDamagedVariant(baseKey, 0));
      registerCanvas(tex, `${baseKey}_dmg_1`, buildPixelDamagedVariant(baseKey, 1));
    }
  };

  registerPair(
    "conscript",
    buildPixelConscriptFrame(0),
    buildPixelConscriptFrame(1),
    false,
  );
  registerPair(
    "tiktok",
    buildPixelTikTokFrame(0),
    buildPixelTikTokFrame(1),
    false,
  );
  registerPair(
    "scooter",
    buildPixelScooterFrame(0),
    buildPixelScooterFrame(1),
    false,
  );
  registerPair("cart", buildPixelCartFrame(0), buildPixelCartFrame(1), true);
  registerPair("bukhanka", buildPixelBukhankaFrame(0), buildPixelBukhankaFrame(1), true);
  registerPair("mtlb", buildPixelMtlbFrame(0), buildPixelMtlbFrame(1), true);
  registerPair(
    "turtle",
    buildPixelTurtleFrame(0),
    buildPixelTurtleFrame(1),
    true,
  );
  registerPair("riot", buildPixelRiotFrame(0), buildPixelRiotFrame(1), true);
  registerPair(
    "kamikaze",
    buildPixelKamikazeFrame(0),
    buildPixelKamikazeFrame(1),
    false,
  );
  registerPair("k9", buildPixelK9Frame(0), buildPixelK9Frame(1), false);
  registerPair(
    "boss",
    buildPixelBossFrame(0),
    buildPixelBossFrame(1),
    true,
  );
  registerPair(
    "prigozhin",
    buildPixelPrigozhinFrame(0),
    buildPixelPrigozhinFrame(1),
    true,
  );

  registerPair(
    "pavel-loud",
    buildPixelHeroFrame(0, true),
    buildPixelHeroFrame(1, true),
    false,
  );
  registerPair(
    "pavel-stealth",
    buildPixelHeroFrame(0, false),
    buildPixelHeroFrame(1, false),
    false,
  );

  registerCanvas(tex, "shield", buildPixelShieldArc());
  registerCanvas(tex, "dragon_teeth", buildPixelDragonTeethProp());

  // 16-bit Pixel Explosions & Particle Effects
  registerCanvas(tex, "boom0", buildPixelExplosionFrame(0));
  registerCanvas(tex, "boom1", buildPixelExplosionFrame(1));
  registerCanvas(tex, "boom2", buildPixelExplosionFrame(2));
  registerCanvas(tex, "boom3", buildPixelExplosionFrame(3));
  registerCanvas(tex, "smoke", buildPixelSmokePuff());
  registerCanvas(tex, "flame", buildPixelFlamePuff());
}
