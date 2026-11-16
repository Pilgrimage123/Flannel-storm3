import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Crosshair, Maximize, Pause, Play, Settings, Volume2, VolumeX } from "lucide-react";
import { PASSIVES, WEAPONS } from "@/game/catalog";
import { bus } from "@/game/eventBus";
import { ENEMY_VISUAL_SPECS } from "@/game/graphics/parodyPalettes";
import { formatTime, loadSave, patchSettings, recordRun } from "@/game/save";
import { synth } from "@/game/audio";
import type { RunResult, SaveData, Stats, UpgradeId, UpgradeOffer } from "@/game/types";

const blankSave = (): SaveData => ({
  version: 1,
  bestTime: 0,
  totalKills: 0,
  bestLevel: 0,
  bestWave: 0,
  bestCombo: 0,
  runs: 0,
  muted: false,
  shake: true,
});

type Panel = "none" | "arsenal" | "manual" | "settings";

export function GameApp() {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"menu" | "play">("menu");
  const [panel, setPanel] = useState<Panel>("none");
  const [save, setSave] = useState<SaveData>(blankSave);
  const [stats, setStats] = useState<Stats | null>(null);
  const [offers, setOffers] = useState<UpgradeOffer[] | null>(null);
  const [over, setOver] = useState<RunResult | null>(null);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [portrait, setPortrait] = useState(false);
  const [portraitDismissed, setPortraitDismissed] = useState(false);
  const [quitJoke, setQuitJoke] = useState(false);

  const toastTimerRef = useRef<number | null>(null);
  const autoStartedRef = useRef(false);

  const showToast = useCallback((message: string, duration = 2200) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, duration);
  }, []);

  const deploy = useCallback(() => {
    synth.ensure();
    setOver(null);
    setOffers(null);
    setPaused(false);
    setPanel("none");
    setQuitJoke(false);
    setMode("play");
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    bus.emit("deploy", null);
  }, []);

  useEffect(() => {
    const stored = loadSave();
    setSave(stored);
    synth.muted = stored.muted;
    const offReady = bus.on("engine-ready", () => setReady(true));
    const offStats = bus.on("stats-update", (next) => setStats(next));
    const offLevel = bus.on("trigger-level-up", (next) => setOffers(next));
    const offClear = bus.on("level-clear", () => setOffers(null));
    const offOver = bus.on("game-over", (result) => {
      setOver(result);
      setOffers(null);
      setPaused(false);
      setSave(recordRun(result));
    });
    let dead = false;
    let game: { destroy: (removeCanvas: boolean) => void } | null = null;
    void import("@/game/createGame").then(({ createGame }) => {
      if (dead) return;
      game = createGame("phaser-host");
    });
    const unlock = () => synth.ensure();
    window.addEventListener("pointerdown", unlock);
    const check = () => setPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => {
      dead = true;
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      offReady();
      offStats();
      offLevel();
      offClear();
      offOver();
      game?.destroy(true);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("resize", check);
    };
  }, []);

  useEffect(() => {
    if (!ready || autoStartedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("autostart") === "1") {
      autoStartedRef.current = true;
      deploy();
    }
  }, [ready, deploy]);

  useEffect(() => {
    if (mode === "menu") {
      document.body.dataset.state = "title";
    } else if (over) {
      document.body.dataset.state = "gameover";
    } else if (paused) {
      document.body.dataset.state = "paused";
    } else {
      document.body.dataset.state = "playing";
    }
  }, [mode, over, paused]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (mode === "menu") {
        if (event.code === "Escape") {
          if (quitJoke) setQuitJoke(false);
          else if (panel !== "none") setPanel("none");
          return;
        }
        if (
          (event.code === "Enter" || event.code === "Space") &&
          ready &&
          panel === "none" &&
          !quitJoke &&
          document.activeElement === document.body
        ) {
          event.preventDefault();
          deploy();
        }
        return;
      }

      if (offers) {
        const index =
          event.code === "Digit1" || event.code === "Numpad1"
            ? 0
            : event.code === "Digit2" || event.code === "Numpad2"
              ? 1
              : event.code === "Digit3" || event.code === "Numpad3"
                ? 2
                : -1;
        if (index >= 0 && offers[index]) {
          event.preventDefault();
          bus.emit("select-upgrade", offers[index]!.id);
          return;
        }
        if (event.code === "KeyR" && (stats?.rerolls ?? 0) > 0) {
          event.preventDefault();
          bus.emit("reroll-upgrade", null);
        }
        return;
      }

      if (!over && (event.code === "Escape" || event.code === "KeyP")) {
        event.preventDefault();
        if (paused) {
          setPaused(false);
          bus.emit("resume-game", null);
        } else {
          setPaused(true);
          bus.emit("pause-game", null);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, panel, quitJoke, ready, offers, over, paused, stats?.rerolls, deploy]);

  function toggleMute() {
    const muted = !save.muted;
    synth.muted = muted;
    const next = patchSettings({ muted });
    setSave(next);
    bus.emit("set-muted", muted);
  }

  function toggleShake() {
    const next = patchSettings({ shake: !save.shake });
    setSave(next);
    bus.emit("set-shake", next.shake);
  }

  function slava() {
    synth.ensure();
    synth.fanfare();
    showToast("Слава Україні! Героям слава.", 2200);
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      showToast("Fullscreen is blocked in this view.", 1600);
    }
  }

  function handleEndless() {
    setOver(null);
    setPaused(false);
    bus.emit("continue-endless", null);
  }

  function returnToMenu() {
    setMode("menu");
    setOver(null);
    setOffers(null);
    setPaused(false);
    bus.emit("quit", null);
  }

  return (
    <div className="stage">
      <div id="phaser-host" className="phaser-host" />
      {mode === "menu" ? (
        <Menu
          save={save}
          ready={ready}
          panel={panel}
          quitJoke={quitJoke}
          onDeploy={deploy}
          onPanel={setPanel}
          onQuitJoke={setQuitJoke}
          onMute={toggleMute}
          onSlava={slava}
          onFull={fullscreen}
          onShake={toggleShake}
        />
      ) : (
        <PlayChrome
          stats={stats}
          save={save}
          offers={offers}
          over={over}
          paused={paused}
          onMute={toggleMute}
          onPause={() => {
            setPaused(true);
            bus.emit("pause-game", null);
          }}
          onResume={() => {
            setPaused(false);
            bus.emit("resume-game", null);
          }}
          onChoose={(id) => bus.emit("select-upgrade", id)}
          onAgain={deploy}
          onEndless={handleEndless}
          onMenu={returnToMenu}
        />
      )}
      {toast ? <div className="toast">{toast}</div> : null}
      {mode === "play" && portrait && !portraitDismissed ? (
        <div className="rotate-gate">
          <div className="phone" />
          <p>ROTATE PHONE TO HORIZONTAL MODE TO DEPLOY GENERAL PAVEL</p>
          <div className="row-actions">
            <button type="button" onClick={() => setPortraitDismissed(true)}>
              PLAY ANYWAY
            </button>
            <button type="button" className="ghost" onClick={returnToMenu}>
              BRIEFING
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Menu({
  save,
  ready,
  panel,
  quitJoke,
  onDeploy,
  onPanel,
  onQuitJoke,
  onMute,
  onSlava,
  onFull,
  onShake,
}: {
  save: SaveData;
  ready: boolean;
  panel: Panel;
  quitJoke: boolean;
  onDeploy: () => void;
  onPanel: (panel: Panel) => void;
  onQuitJoke: (open: boolean) => void;
  onMute: () => void;
  onSlava: () => void;
  onFull: () => void;
  onShake: () => void;
}) {
  return (
    <div className="menu">
      <div className="hero">
        <img src="/menu-hero.jpg" alt="General Pavel beside a washing machine on the front" />
        <div className="hero-copy">
          <div className="kicker">
            <span className="compass" />
            <span>OPERATION:</span>
          </div>
          <h1>
            <span>FLANNEL</span> STORM
          </h1>
          <div className="ribbon">GENERAL PAVEL VS. THE INVADERS</div>
        </div>
      </div>
      <div className="menu-side">
        <button className="deploy" data-start="true" disabled={!ready} onClick={onDeploy}>
          <Play />
          DEPLOY TO FRONT
        </button>
        <button className="menu-btn" onClick={() => onPanel("arsenal")}>
          <Crosshair />
          <span>
            ARSENAL
            <small>WEAPONS AND PASSIVES</small>
          </span>
        </button>
        <button className="menu-btn" onClick={() => onPanel("manual")}>
          <BookOpen />
          <span>
            FIELD MANUAL
            <small>HOW TO PLAY</small>
          </span>
        </button>
        <button className="menu-btn" onClick={() => onPanel("settings")}>
          <Settings />
          <span>
            SETTINGS
            <small>AUDIO AND FEEL</small>
          </span>
        </button>
        <button className="menu-btn" onClick={() => onQuitJoke(true)}>
          <span>
            QUIT GAME
            <small>THE FRONT DISAGREES</small>
          </span>
        </button>
      </div>
      <div className="stat-row">
        <div className="stat">
          <span>BEST RUN</span>
          <b>{formatTime(save.bestTime)}</b>
        </div>
        <div className="stat">
          <span>TOTAL KILLS</span>
          <b>{save.totalKills.toLocaleString()}</b>
        </div>
        <div className="stat">
          <span>HIGHEST LEVEL</span>
          <b>LV. {save.bestLevel}</b>
        </div>
        <div className="stat">
          <span>LONGEST WAVE</span>
          <b>WAVE {save.bestWave}</b>
        </div>
        <div className="stat">
          <span>BEST COMBO</span>
          <b>{save.bestCombo ?? 0} STREAK</b>
        </div>
        <div className="icon-row">
          <button className="icon-btn" onClick={onMute}>
            {save.muted ? <VolumeX /> : <Volume2 />}
            {save.muted ? "AUDIO OFF" : "AUDIO ON"}
          </button>
          <button className="icon-btn" onClick={onSlava}>
            <span className="flag" />
            SLAVA UKRAINI
          </button>
          <button className="icon-btn" onClick={onFull}>
            <Maximize />
            FULLSCREEN
          </button>
        </div>
      </div>
      {panel === "arsenal" ? <Arsenal onClose={() => onPanel("none")} /> : null}
      {panel === "manual" ? <Manual onClose={() => onPanel("none")} /> : null}
      {panel === "settings" ? (
        <SettingsSheet save={save} onMute={onMute} onShake={onShake} onClose={() => onPanel("none")} />
      ) : null}
      {quitJoke ? (
        <div className="sheet">
          <div className="sheet-card">
            <h2>RETIREMENT DENIED</h2>
            <p className="note">The washing machine is already spinning. Generals do not quit. They go flannel.</p>
            <button className="back" onClick={() => onQuitJoke(false)}>
              BACK TO BRIEFING
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Arsenal({ onClose }: { onClose: () => void }) {
  const invaderSpecs = Object.values(ENEMY_VISUAL_SPECS);
  return (
    <div className="sheet">
      <div className="sheet-card">
        <h2>ARSENAL &amp; INVADER INTEL</h2>
        <div className="codex">
          {WEAPONS.map((weapon) => (
            <article key={weapon.id}>
              <h3>{weapon.name}</h3>
              <p>
                Loud: {weapon.loud} Ambush: {weapon.ambush}
              </p>
            </article>
          ))}
          {PASSIVES.map((passive) => (
            <article key={passive.id}>
              <h3>{passive.name}</h3>
              <p>{passive.detail}</p>
            </article>
          ))}
        </div>
        <h2 style={{ marginTop: "14px" }}>HOSTILE PARODY ROSTER</h2>
        <div className="codex">
          {invaderSpecs.map((spec) => (
            <article key={spec.kind}>
              <h3>
                {spec.codeName} [{spec.insignia}]
              </h3>
              <p>{spec.uniformSummary}</p>
            </article>
          ))}
        </div>
        <button className="back" onClick={onClose}>
          CLOSE ARSENAL
        </button>
      </div>
    </div>
  );
}

function Manual({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet">
      <div className="sheet-card">
        <h2>FIELD MANUAL</h2>
        <div className="codex">
          <div className="manual-step">
            <strong>1. MOVE</strong>
            <p>WASD or arrows on a keyboard. On a phone, drag the left stick. Weapons fire on their own.</p>
          </div>
          <div className="manual-step">
            <strong>2. GOING FLANNEL</strong>
            <p>Space, or the red button. Pavel drops a stolen Indesit washing machine, sprints, and takes no contact damage.</p>
          </div>
          <div className="manual-step">
            <strong>3. THEY WANT THE LOOT</strong>
            <p>Every invader sprints to the machine. Hold stealth to stack Article 5 overcharge. Battery is the limit.</p>
          </div>
          <div className="manual-step">
            <strong>4. THE AMBUSH</strong>
            <p>Press again. The machine explodes and every weapon dumps its bonus attack. Longer stealth, bigger boom.</p>
          </div>
          <div className="manual-step">
            <strong>5. DOG TAGS &amp; PILSNER</strong>
            <p>Walk over blue-yellow tags to level up. Pilsner kegs heal, refill the battery, and trigger 2x fire rage.</p>
          </div>
          <div className="manual-step">
            <strong>6. THE INFLATABLE S-400</strong>
            <p>Every minute a glossy rubber balloon S-400 rolls in with an AliExpress tag. In flannel, walk into it to pop it!</p>
          </div>
          <div className="manual-step">
            <strong>7. CONTEMPORARY INVADER PARODY &amp; COPE-CAGE DAMAGE</strong>
            <p>
              Mobiks in three-stripe tracksuits &amp; Telnyashkas, Storm-Scooters with taped RPGs, UAZ-452 Bukhanka vans
              armored with birch logs &amp; stolen carpets, MT-LB Franken-tanks with 1950s 2M-3 naval ship turrets,
              Desertcross golf carts, and Tsar-Mangal barn tanks. Below 50% HP, vehicle cope cages buckle and burst into flames!
            </p>
          </div>
        </div>
        <button className="back" onClick={onClose}>
          CLOSE MANUAL
        </button>
      </div>
    </div>
  );
}

function SettingsSheet({
  save,
  onMute,
  onShake,
  onClose,
}: {
  save: SaveData;
  onMute: () => void;
  onShake: () => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet">
      <div className="sheet-card">
        <h2>SETTINGS</h2>
        <div className="row-actions">
          <button onClick={onMute}>{save.muted ? "UNMUTE" : "MUTE"}</button>
          <button className="ghost" onClick={onShake}>
            {save.shake ? "SHAKE ON" : "SHAKE OFF"}
          </button>
        </div>
        <p className="note settings-note">
          Desktop: WASD to move, Space to go flannel. The A key moves left and D moves right. Phone: landscape only, left stick plus the flannel button.
        </p>
        <button className="back" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  );
}

function PlayChrome({
  stats,
  save,
  offers,
  over,
  paused,
  onMute,
  onPause,
  onResume,
  onChoose,
  onAgain,
  onEndless,
  onMenu,
}: {
  stats: Stats | null;
  save: SaveData;
  offers: UpgradeOffer[] | null;
  over: RunResult | null;
  paused: boolean;
  onMute: () => void;
  onPause: () => void;
  onResume: () => void;
  onChoose: (id: UpgradeId) => void;
  onAgain: () => void;
  onEndless?: () => void;
  onMenu: () => void;
}) {
  const hpPct = stats ? Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100)) : 100;
  const xpPct = stats ? Math.max(0, Math.min(100, (stats.xp / stats.xpNeed) * 100)) : 0;
  const batPct = stats ? Math.max(0, Math.min(100, (stats.battery / stats.maxBattery) * 100)) : 100;
  const maxStacks = stats ? Math.max(1, Math.floor(stats.maxBattery / 0.5)) : 10;
  const overPct = stats ? Math.max(0, Math.min(100, (stats.overcharge / maxStacks) * 100)) : 0;
  const charge = `${batPct}%`;
  const portrait = stats?.stealth ? "/sprites/portrait-stealth.png" : "/sprites/portrait-loud.png";
  const lowHp = stats ? stats.hp / stats.maxHp <= 0.35 : false;

  return (
    <>
      {lowHp ? <div className="vignette-danger" /> : null}
      {stats?.stealth ? <div className="vignette-stealth" /> : null}
      {stats && stats.beerRage > 0 ? <div className="vignette-rage" /> : null}

      <div className="hud-stack">
        <header className="hud">
          <div className="hud-card who">
          <img src={portrait} alt="" />
          <div>
            <strong>FLANNEL STORM</strong>
            <em>{stats?.stealth ? "FLANNEL MODE" : "GENERAL PAVEL"}</em>
          </div>
        </div>
        <div className="hud-card bars">
          <div className="bar-line">
            <span>HP</span>
            <div className="track">
              <i className="fill-hp" style={{ width: `${hpPct}%` }} />
            </div>
            <b>
              {stats?.hp ?? 110}/{stats?.maxHp ?? 110}
            </b>
          </div>
          <div className="bar-line">
            <span>XP</span>
            <div className="track">
              <i className="fill-xp" style={{ width: `${xpPct}%` }} />
            </div>
            <b>LV {stats?.level ?? 1}</b>
          </div>
        </div>

        {stats && stats.combo >= 3 ? (
          <div className={`hud-card combo-badge ${stats.combo >= 25 ? "high" : ""}`}>
            <span className="combo-fire">🔥</span>
            <div>
              <span className="combo-tag">
                {stats.combo >= 100
                  ? "NUCLEAR"
                  : stats.combo >= 50
                    ? "HOLY FLANNEL"
                    : stats.combo >= 25
                      ? "UNSTOPPABLE"
                      : stats.combo >= 10
                        ? "RAMPAGE"
                        : "STREAK"}
              </span>
              <b>{stats.combo} KILLS</b>
            </div>
          </div>
        ) : null}

        {stats && stats.beerRage > 0 ? (
          <div className="hud-card meter rage-card">
            <span>🍺 PILSNER RAGE</span>
            <div className="track">
              <i className="fill-rage" style={{ width: `${Math.min(100, (stats.beerRage / 5) * 100)}%` }} />
            </div>
            <b>{stats.beerRage.toFixed(1)}s (2x FIRE)</b>
          </div>
        ) : null}

        <div className="hud-card meter">
          <span>WAVE {stats?.wave ?? 1}</span>
          <b>{formatTime(stats?.time ?? 0)}</b>
          <span>
            {stats?.activeBoss
              ? "⚠️ BOSS FIGHT!"
              : (stats?.time ?? 0) >= 210 && (stats?.time ?? 0) < 300
                ? `FINALE ${formatTime(stats?.nextBoss ?? 0)}`
                : `BOSS ${formatTime(stats?.nextBoss ?? 0)}`}
          </span>
        </div>
        <div className="hud-card meter">
          <span>KILLS</span>
          <b>{stats?.kills ?? 0}</b>
        </div>
        <div className="hud-card meter">
          <span>STEALTH BATTERY</span>
          <div className="track">
            <i className="fill-bat" style={{ width: `${batPct}%` }} />
          </div>
          <b>
            {(stats?.battery ?? 5).toFixed(1)} / {(stats?.maxBattery ?? 5).toFixed(1)}s
          </b>
        </div>
        <div className={`hud-card meter ${stats?.overcharge && stats.overcharge > 0 ? "article5-active" : ""}`}>
          <span>ARTICLE 5</span>
          <div className="track">
            <i className="fill-ov" style={{ width: `${overPct}%` }} />
          </div>
          <b>x{(stats?.multiplier ?? 1).toFixed(2)}</b>
        </div>
        <div className="hud-actions">
          <button
            className="tiny"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onMute();
            }}
            aria-label={save.muted ? "Unmute" : "Mute"}
          >
            {save.muted ? <VolumeX /> : <Volume2 />}
          </button>
          <button
            className="tiny"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              if (paused) onResume();
              else onPause();
            }}
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? <Play /> : <Pause />}
          </button>
        </div>
        </header>

        {stats?.activeBoss ? (
          <div className={`boss-health-bar ${stats.activeBoss.isFinale ? "finale-boss" : ""}`}>
            <div className="boss-title">
              <span>{stats.activeBoss.name}</span>
              <b>
                {stats.activeBoss.hp.toLocaleString()} / {stats.activeBoss.maxHp.toLocaleString()} HP
              </b>
            </div>
            <div className="boss-track">
              <div
                className="boss-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, (stats.activeBoss.hp / Math.max(1, stats.activeBoss.maxHp)) * 100))}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
      <Stick />
      <button
        type="button"
        tabIndex={-1}
        className={stats?.stealth ? "flannel on" : batPct >= 95 ? "flannel ready" : "flannel"}
        style={{ ["--charge" as string]: charge }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.blur();
          synth.ensure();
          bus.emit("toggle-stealth", null);
        }}
      >
        <img src={stats?.stealth ? "/sprites/portrait-stealth.png" : "/sprites/pavel-loud.png"} alt="" />
        {stats?.stealth ? "ARTICLE 5 AMBUSH!" : "GOING FLANNEL"}
      </button>

      {offers ? (
        <div className="modal">
          <h2>⭐ LEVEL UP — SELECT TACTICAL ARSENAL ⭐</h2>
          <div className="choices">
            {offers.map((offer, index) => {
              const rarityClass =
                offer.rarity === "legendary"
                  ? "rarity-legendary"
                  : offer.rarity === "elite"
                    ? "rarity-elite"
                    : "rarity-tactical";

              return (
                <button
                  key={`${offer.id}-${offer.rank}-${index}`}
                  className={`choice ${rarityClass}`}
                  onClick={() => onChoose(offer.id)}
                >
                  <div className="choice-header">
                    <span className="choice-rarity">
                      {offer.rarity === "legendary"
                        ? "⚡ OVERCLOCKED"
                        : offer.rarity === "elite"
                          ? "★ ELITE"
                          : "◆ TACTICAL"}
                    </span>
                    <b>
                      {index + 1}. {offer.name}
                    </b>
                  </div>
                  <p>
                    {offer.blurb} — {offer.detail}
                  </p>
                  <span className="pips">
                    {Array.from({ length: offer.maxRank }, (_, pip) => (
                      <i key={pip} className={pip < offer.rank ? "pip on" : "pip"} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="reroll-btn"
              disabled={(stats?.rerolls ?? 0) <= 0}
              onClick={() => bus.emit("reroll-upgrade", null)}
            >
              🎲 TACTICAL REROLL ({(stats?.rerolls ?? 0)} REMAINING)
            </button>
          </div>
        </div>
      ) : null}

      {paused && !over && !offers ? (
        <div className="overlay-center">
          <div className="over-card">
            <h2>HOLDING FIRE</h2>
            <p className="note">The front waits. WASD moves. Space is flannel ambush.</p>
            <div className="row-actions">
              <button onClick={onResume}>RESUME</button>
              <button className="ghost" onClick={onMenu}>
                ABORT TO BRIEFING
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {over ? (
        <div className="overlay-center">
          <div className="over-card">
            <div className="rank-badge">🎖️ {over.rankTitle || (over.victory ? "HERO OF UKRAINE" : "FRONT-LINE WARRIOR")}</div>
            <h2>{over.victory ? "VICTORY IN UKRAINE!" : "PAVEL IS DOWN"}</h2>
            <p className="note">
              {over.victory
                ? "The invaders have been routed! General Pavel stands victorious."
                : "The washing machine outlasted the general. Barely."}
            </p>
            <div className="over-grid">
              <div className="stat">
                <span>TIME</span>
                <b>{formatTime(over.time)}</b>
              </div>
              <div className="stat">
                <span>KILLS</span>
                <b>{over.kills}</b>
              </div>
              <div className="stat">
                <span>MAX COMBO</span>
                <b>{over.maxCombo || 0} STREAK</b>
              </div>
              <div className="stat">
                <span>LEVEL</span>
                <b>LV. {over.level}</b>
              </div>
              <div className="stat">
                <span>WAVE</span>
                <b>WAVE {over.wave}</b>
              </div>
            </div>
            <div className="row-actions">
              {over.victory && onEndless ? (
                <button className="btn-endless" onClick={onEndless}>
                  CONTINUE PATROL (ENDLESS)
                </button>
              ) : null}
              <button data-start="true" onClick={onAgain}>
                DEPLOY AGAIN
              </button>
              <button className="ghost" onClick={onMenu}>
                BRIEFING
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Stick() {
  const root = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);

  const resetStick = useCallback(() => {
    drag.current = null;
    if (knob.current) knob.current.style.transform = "translate(0px, 0px)";
    bus.emit("joystick-move", { x: 0, y: 0 });
  }, []);

  useEffect(() => {
    window.addEventListener("blur", resetStick);
    return () => {
      window.removeEventListener("blur", resetStick);
      resetStick();
    };
  }, [resetStick]);

  function place(clientX: number, clientY: number) {
    const el = root.current;
    const cap = knob.current;
    if (!el || !cap) return;
    const box = el.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const max = 40;
    const clamped = Math.min(max, len);
    dx = (dx / len) * clamped;
    dy = (dy / len) * clamped;
    cap.style.transform = `translate(${dx}px, ${dy}px)`;
    const mag = Math.min(1, len / max);
    bus.emit("joystick-move", { x: (dx / clamped || 0) * mag, y: (dy / clamped || 0) * mag });
  }

  return (
    <div
      className="stick-zone"
      onPointerDown={(event) => {
        const zone = event.currentTarget.getBoundingClientRect();
        const localX = event.clientX - zone.left;
        const localY = event.clientY - zone.top;
        if (root.current) {
          root.current.style.left = `${Math.max(8, localX - 64)}px`;
          root.current.style.top = `${Math.max(8, localY - 64)}px`;
          root.current.style.bottom = "auto";
        }
        drag.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        place(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (drag.current !== event.pointerId) return;
        place(event.clientX, event.clientY);
      }}
      onPointerUp={resetStick}
      onPointerCancel={resetStick}
    >
      <div className="stick" ref={root}>
        <div className="knob" ref={knob} />
      </div>
    </div>
  );
}
