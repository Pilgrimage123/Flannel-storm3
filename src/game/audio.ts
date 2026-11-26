export class Synth {
  muted = false;
  private ctx: AudioContext | null = null;
  private gemPitchIdx = 0;
  private lastGemTime = 0;
  private timers: number[] = [];
  private pulseTimer: number | null = null;

  // C major / pentatonic ascending frequencies for dopamine pickups
  private readonly gemScale = [
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.0, // A5
    1046.5, // C6
    1174.66, // D6
    1318.51, // E6
    1567.98, // G6
    1760.0, // A6
    2093.0, // C7
  ];

  ensure() {
    if (typeof window === "undefined") return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx || this.ctx.state === "closed") {
      try {
        this.ctx = new AC();
        this.ctx.onstatechange = () => {
          if (this.ctx?.state === "closed") {
            this.ctx = null;
          }
        };
      } catch {
        this.ctx = null;
        return;
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number) {
    if (this.muted || !this.ctx || this.ctx.state === "closed") return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      amp.gain.setValueAtTime(gain, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(amp);
      amp.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      // Ignore audio node creation errors if context state changed
    }
  }

  private noise(dur: number, gain: number, cutoff: number, slideCutoff = 140) {
    if (this.muted || !this.ctx || this.ctx.state === "closed") return;
    try {
      const t = this.ctx.currentTime;
      const length = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(cutoff, t);
      filter.frequency.exponentialRampToValueAtTime(slideCutoff, t + dur);
      const amp = this.ctx.createGain();
      amp.gain.setValueAtTime(gain, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(amp);
      amp.connect(this.ctx.destination);
      src.start(t);
    } catch {
      // Ignore audio node creation errors if context state changed
    }
  }

  private lastBoomTime = 0;
  private lastCritTime = 0;
  private lastShootTime = 0;
  private lastStyleBoomTime = 0;

  shoot() {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastShootTime < 28) return;
    this.lastShootTime = now;
    this.tone(260, 0.06, "square", 0.05, 90);
    this.noise(0.05, 0.06, 2200);
  }

  tracer() {
    this.tone(480, 0.04, "sawtooth", 0.04, 180);
    this.noise(0.03, 0.04, 2800);
  }

  boom(heavy = false) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!heavy && now - this.lastBoomTime < 40) return;
    this.lastBoomTime = now;
    const jitter = 0.88 + Math.random() * 0.24;
    if (heavy) {
      this.noise(0.55, 0.28, 900 * jitter, 60);
      this.tone(140 * jitter, 0.45, "sawtooth", 0.16, 32);
      this.tone(70 * jitter, 0.5, "sine", 0.22, 28);
    } else {
      this.noise(0.32, 0.17, 620 * jitter, 120);
      this.tone(92 * jitter, 0.28, "sawtooth", 0.065, 38);
    }
  }

  explodeSound(style: string, scale = 1) {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const isMajor =
      style === "armor" ||
      style === "artillery" ||
      style === "inflatable" ||
      style === "ambush" ||
      style === "finale" ||
      style === "firework";
    if (!isMajor && now - this.lastStyleBoomTime < 38) return;
    this.lastStyleBoomTime = now;

    const j = 0.86 + Math.random() * 0.28;
    const vol = Math.min(1.25, 0.82 + scale * 0.15);

    if (style === "armor") {
      // Heavy tank cook-off: deep hull rupture + metallic turret clang + ammo crackles
      this.noise(0.62, 0.28 * vol, 1100 * j, 55);
      this.tone(135 * j, 0.48, "sawtooth", 0.17 * vol, 26);
      this.tone(68 * j, 0.56, "sine", 0.24 * vol, 24);
      this.tone(620 * j, 0.18, "triangle", 0.11, 210);
      if (typeof window !== "undefined") {
        for (let i = 1; i <= 2; i++) {
          const id = window.setTimeout(() => {
            const cj = 0.85 + Math.random() * 0.35;
            this.noise(0.18, 0.14, 1500 * cj, 180);
            this.tone(160 * cj, 0.14, "square", 0.07, 45);
            this.timers = this.timers.filter((t) => t !== id);
          }, i * 95);
          this.timers.push(id);
        }
      }
      return;
    }

    if (style === "vehicle") {
      // Fuel tank ignition whoosh + gritty punch
      this.noise(0.45, 0.23 * vol, 950 * j, 90);
      this.tone(115 * j, 0.36, "sawtooth", 0.12 * vol, 34);
      this.tone(320 * j, 0.14, "square", 0.06, 95);
      return;
    }

    if (style === "artillery") {
      // Earth-shaking 155mm crack + deep sub-bass rumble
      this.noise(0.6, 0.27 * vol, 1450 * j, 50);
      this.tone(155 * j, 0.42, "triangle", 0.19 * vol, 28);
      this.tone(62 * j, 0.58, "sine", 0.25 * vol, 22);
      return;
    }

    if (style === "shrapnel") {
      // Snappy FPV / rocket crack + electric buzz
      this.noise(0.24, 0.18 * vol, 2100 * j, 240);
      this.tone(420 * j, 0.12, "sawtooth", 0.08 * vol, 85);
      this.tone(980 * j, 0.07, "square", 0.05, 320);
      return;
    }

    if (style === "inflatable") {
      // Comical giant rubber balloon POP + deflating squeal + snaps
      this.tone(860 * j, 0.26, "sine", 0.16, 95);
      this.noise(0.28, 0.24, 1800 * j, 220);
      this.tone(1320 * j, 0.18, "triangle", 0.09, 280);
      if (typeof window !== "undefined") {
        const id = window.setTimeout(() => {
          this.tone(680, 0.22, "sawtooth", 0.08, 160);
          this.noise(0.18, 0.15, 1400, 300);
          this.timers = this.timers.filter((t) => t !== id);
        }, 110);
        this.timers.push(id);
      }
      return;
    }

    if (style === "ambush") {
      this.ambush();
      return;
    }

    if (style === "finale") {
      this.noise(0.75, 0.3, 1200 * j, 45);
      this.tone(110 * j, 0.65, "sawtooth", 0.22, 24);
      this.tone(55 * j, 0.72, "sine", 0.26, 20);
      return;
    }

    if (style === "firework") {
      this.noise(0.32, 0.18, 2400 * j, 360);
      this.tone(1100 * j, 0.14, "sine", 0.08, 420);
      this.tone(1680 * j, 0.11, "triangle", 0.06, 760);
      return;
    }

    // Standard infantry pop with randomized pitch so consecutive kills sound crisp & varied
    this.noise(0.28, 0.16 * vol, 720 * j, 130);
    this.tone(105 * j, 0.22, "sawtooth", 0.07 * vol, 36);
  }

  stealth() {
    this.tone(520, 0.14, "sine", 0.07, 180);
    this.tone(260, 0.2, "triangle", 0.05, 120);
  }

  ambush() {
    // Nuclear Article 5 bass drop & explosive blast
    this.boom(true);
    // Sub-bass sweep
    this.tone(180, 0.55, "sine", 0.28, 30);
    // Siren riser chord
    this.tone(330, 0.2, "sawtooth", 0.08, 660);
    this.tone(440, 0.22, "square", 0.08, 880);
    this.tone(554, 0.25, "square", 0.07, 1108);
  }

  crit() {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastCritTime < 45) return;
    this.lastCritTime = now;
    // Satisfying high-tier metallic ping
    this.tone(1480, 0.08, "triangle", 0.09, 1200);
    this.tone(2960, 0.05, "sine", 0.07);
  }

  pickup() {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastGemTime > 800) {
      this.gemPitchIdx = 0;
    } else {
      this.gemPitchIdx = (this.gemPitchIdx + 1) % this.gemScale.length;
    }
    this.lastGemTime = now;

    const freq = this.gemScale[this.gemPitchIdx] ?? 880;
    this.tone(freq, 0.08, "sine", 0.07);
    this.tone(freq * 1.5, 0.04, "triangle", 0.03);
  }

  beerRage() {
    // Triumphant heavy guitar-like power riff
    const chords = [
      [220, 330, 440],
      [293, 440, 587],
      [370, 554, 740],
      [440, 659, 880],
    ];
    chords.forEach((chord, i) => {
      const id = window.setTimeout(() => {
        chord.forEach((f) => this.tone(f, 0.18, "sawtooth", 0.06));
        this.noise(0.12, 0.08, 800);
        this.timers = this.timers.filter((t) => t !== id);
      }, i * 90);
      this.timers.push(id);
    });
  }

  combo(tier: number) {
    if (this.muted || typeof window === "undefined") return;
    const baseFreq = 440 + Math.min(tier, 5) * 110;
    [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2].forEach((f, i) => {
      const id = window.setTimeout(() => {
        this.tone(f, 0.12, "square", 0.06);
        this.timers = this.timers.filter((t) => t !== id);
      }, i * 60);
      this.timers.push(id);
    });
  }

  reroll() {
    this.noise(0.15, 0.07, 1400);
    this.tone(360, 0.1, "sine", 0.05, 540);
  }

  level() {
    if (this.muted || typeof window === "undefined") return;
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      const id = window.setTimeout(() => {
        this.tone(f, 0.14, "square", 0.06);
        this.timers = this.timers.filter((t) => t !== id);
      }, i * 65);
      this.timers.push(id);
    });
  }

  hurt() {
    this.tone(150, 0.12, "square", 0.08, 60);
    this.noise(0.1, 0.08, 400);
  }

  pop() {
    this.tone(900, 0.22, "sine", 0.09, 110);
    this.noise(0.2, 0.08, 1200);
  }

  fanfare() {
    if (this.muted || typeof window === "undefined") return;
    [392, 523, 659, 784, 1046].forEach((f, i) => {
      const id = window.setTimeout(() => {
        this.tone(f, 0.16, "triangle", 0.07);
        this.timers = this.timers.filter((t) => t !== id);
      }, i * 85);
      this.timers.push(id);
    });
  }

  moto() {
    this.noise(0.3, 0.08, 500);
    this.tone(85, 0.3, "sawtooth", 0.07, 50);
  }

  siren() {
    if (this.muted || typeof window === "undefined") return;
    // Ominous air raid / boss siren
    this.tone(300, 0.4, "sawtooth", 0.12, 600);
    const id = window.setTimeout(() => {
      this.tone(600, 0.45, "sawtooth", 0.12, 280);
      this.timers = this.timers.filter((t) => t !== id);
    }, 400);
    this.timers.push(id);
  }

  prigozhinRoar() {
    if (this.muted || typeof window === "undefined") return;
    this.noise(0.65, 0.28, 450, 80);
    this.tone(85, 0.7, "sawtooth", 0.24, 40);
    this.tone(55, 0.8, "square", 0.2, 30);
  }

  victory() {
    if (this.muted || typeof window === "undefined") return;
    // Triumphant glorious fanfare (C - E - G - C - G - C)
    const melody = [
      { f: 523, d: 0.18, pause: 0 },
      { f: 659, d: 0.18, pause: 140 },
      { f: 784, d: 0.24, pause: 280 },
      { f: 1046, d: 0.45, pause: 450 },
      { f: 784, d: 0.2, pause: 820 },
      { f: 1046, d: 0.7, pause: 980 },
    ];
    melody.forEach((note) => {
      const id = window.setTimeout(() => {
        this.tone(note.f, note.d, "square", 0.14);
        this.tone(note.f * 0.5, note.d, "triangle", 0.1);
        this.timers = this.timers.filter((t) => t !== id);
      }, note.pause);
      this.timers.push(id);
    });
  }

  stop() {
    if (typeof window !== "undefined") {
      for (const t of this.timers) window.clearTimeout(t);
      if (this.pulseTimer !== null) {
        window.clearInterval(this.pulseTimer);
        this.pulseTimer = null;
      }
    }
    this.timers = [];
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.stop();
  }
}

export const synth = new Synth();
