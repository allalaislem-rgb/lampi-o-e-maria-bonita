/**
 * Dynamic audio engine (Web Audio).
 *
 * - Original score rendered offline (tools/audio/compose.py) as synchronised stems:
 *   each game mode has a main stem plus an intensity layer that is crossfaded in
 *   sample-accurate sync (tension before a bonus, hype in Free Spins, etc.).
 * - Seamless loops via loopStart/loopEnd from public/audio/manifest.json.
 * - Separate Music / SFX volume channels + master mute, persisted per viewer.
 * - Music ducks under big celebrations and returns smoothly afterwards.
 */
export type MusicMode = 'base' | 'escape' | 'hideout' | 'laststand';

export type Sfx =
  | 'click' | 'spin' | 'reelstop' | 'reelstop_quick' | 'scatter1' | 'scatter2' | 'scatter3' | 'anticipation'
  | 'win_small' | 'win_medium' | 'coin' | 'tick' | 'wild' | 'wild_expand' | 'gunshot' | 'arrival' | 'raid' | 'transform'
  | 'trigger' | 'transition' | 'intro_escape' | 'intro_hideout' | 'intro_last' | 'multiplier' | 'retrigger'
  | 'chest_hover' | 'chest_open' | 'chest_empty' | 'treasure' | 'couple' | 'lock' | 'respin' | 'respin_reset'
  | 'emblem' | 'grand' | 'bigwin_hit' | 'bigwin_end' | 'tier_up' | 'feature_end' | 'error';

/** [main, intensity layer 1, optional intensity layer 2] – all stems of a mode share length & tempo. */
const STEMS: Record<MusicMode, string[]> = {
  base: ['music_base', 'music_base_tension', 'music_base_drive'],
  escape: ['music_escape', 'music_escape_hype'],
  hideout: ['music_hideout', 'music_hideout_tension'],
  laststand: ['music_laststand', 'music_laststand_intense'],
};

interface Manifest {
  [name: string]: { loop: boolean; loopStart?: number; loopEnd?: number; duration?: number };
}

interface Playing {
  mode: MusicMode | 'bigwin';
  srcs: AudioBufferSourceNode[];
  main: GainNode;
  layer: GainNode | null;
  layer2: GainNode | null;
  bus: GainNode;
}

const PREFS_KEY = 'lmb.audio.v2';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private duckGain!: GainNode;
  private manifest: Manifest = {};
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private ext = 'ogg';
  private current: Playing | null = null;
  private wantedMode: MusicMode | null = null;
  private layerLevel = 0;
  private lastPlay = new Map<string, number>();
  musicVolume = 0.7;
  sfxVolume = 0.85;
  muted = false;

  constructor() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (typeof p.music === 'number') this.musicVolume = p.music;
      if (typeof p.sfx === 'number') this.sfxVolume = p.sfx;
      if (typeof p.muted === 'boolean') this.muted = p.muted;
    } catch {
      /* storage unavailable */
    }
  }

  private savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ music: this.musicVolume, sfx: this.sfxVolume, muted: this.muted }));
    } catch {
      /* ignore */
    }
  }

  /** Load manifest + all SFX (small). Music stems load lazily per mode. */
  async preload(onProgress?: (p: number) => void) {
    const a = document.createElement('audio');
    this.ext = a.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';
    try {
      this.manifest = await (await fetch('./audio/manifest.json')).json();
    } catch {
      this.manifest = {};
    }
    // raw downloads now (cheap), decoding happens after unlock
    const names = Object.keys(this.manifest).filter((n) => n.startsWith('sfx_') || n === 'music_base' || n === 'music_base_tension');
    let done = 0;
    await Promise.all(
      names.map(async (n) => {
        await this.fetchRaw(n);
        onProgress?.(++done / names.length);
      }),
    );
  }

  private raw = new Map<string, Promise<ArrayBuffer | null>>();
  private fetchRaw(name: string) {
    if (!this.raw.has(name))
      this.raw.set(
        name,
        fetch(`./audio/${name}.${this.ext}`)
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .catch(() => null),
      );
    return this.raw.get(name)!;
  }

  private buffer(name: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return Promise.resolve(null);
    if (!this.buffers.has(name)) {
      const ctx = this.ctx;
      this.buffers.set(
        name,
        this.fetchRaw(name).then(async (ab) => {
          if (!ab) return null;
          try {
            return await ctx.decodeAudioData(ab.slice(0));
          } catch {
            return null;
          }
        }),
      );
    }
    return this.buffers.get(name)!;
  }

  /** Must be called from a user gesture. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 3;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    this.master.connect(comp).connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.duckGain = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.duckGain).connect(this.master);
    this.sfxBus.connect(this.master);
    this.applyVolumes(0);
    // decode SFX in background
    Object.keys(this.manifest)
      .filter((n) => n.startsWith('sfx_'))
      .forEach((n) => void this.buffer(n));
    if (this.wantedMode) void this.setMode(this.wantedMode, true);
  }

  private applyVolumes(time = 0.08) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, now, time || 0.001);
    this.musicBus.gain.setTargetAtTime(this.musicVolume * 0.8, now, time || 0.001);
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume, now, time || 0.001);
  }

  setMusicVolume(v: number) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
    this.savePrefs();
  }
  setSfxVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
    this.savePrefs();
  }
  setMuted(m: boolean) {
    this.muted = m;
    this.applyVolumes();
    this.savePrefs();
  }

  // ------------------------------------------------------------------ SFX
  play(name: Sfx, opt: { rate?: number; gain?: number; delay?: number; pan?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const key = `sfx_${name}`;
    const now = performance.now();
    if (now - (this.lastPlay.get(key + (opt.rate ?? '')) ?? 0) < 30) return; // de-duplicate bursts
    this.lastPlay.set(key + (opt.rate ?? ''), now);
    void this.buffer(key).then((b) => {
      if (!b || !this.ctx) return;
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.playbackRate.value = opt.rate ?? 1;
      const g = this.ctx.createGain();
      g.gain.value = opt.gain ?? 1;
      let node: AudioNode = src.connect(g);
      if (opt.pan && this.ctx.createStereoPanner) {
        const p = this.ctx.createStereoPanner();
        p.pan.value = opt.pan;
        node = node.connect(p);
      }
      node.connect(this.sfxBus);
      src.start(this.ctx.currentTime + (opt.delay ?? 0));
    });
  }

  // ------------------------------------------------------------------ music
  private startLoop(name: string, gain: GainNode, when: number): Promise<AudioBufferSourceNode | null> {
    return this.buffer(name).then((b) => {
      if (!b || !this.ctx) return null;
      const m = this.manifest[name];
      const src = this.ctx.createBufferSource();
      src.buffer = b;
      src.loop = true;
      src.loopStart = m?.loopStart ?? 0;
      src.loopEnd = m?.loopEnd ?? b.duration;
      src.connect(gain);
      src.start(when, src.loopStart);
      return src;
    });
  }

  /** Crossfade to a mode's music (main stem + silent intensity layer, in sync). */
  async setMode(mode: MusicMode, force = false) {
    this.wantedMode = mode;
    const ctx = this.ctx;
    if (!ctx) return;
    if (!force && this.current?.mode === mode) return;
    const names = STEMS[mode];
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(this.musicBus);
    const gains = names.map((_, i) => {
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 1 : 0;
      g.connect(bus);
      return g;
    });
    this.layerLevel = 0;
    await Promise.all(names.map((n) => this.buffer(n)));
    if (this.wantedMode !== mode) return;
    const when = ctx.currentTime + 0.05;
    const srcs = (await Promise.all(names.map((n, i) => this.startLoop(n, gains[i], when)))).filter(Boolean) as AudioBufferSourceNode[];
    this.fadeOut(this.current, 1.2);
    this.current = { mode, srcs, main: gains[0], layer: gains[1] ?? null, layer2: gains[2] ?? null, bus };
    bus.gain.setValueAtTime(0, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
  }

  private fadeOut(p: Playing | null, secs: number) {
    if (!p || !this.ctx) return;
    const now = this.ctx.currentTime;
    p.bus.gain.cancelScheduledValues(now);
    p.bus.gain.setValueAtTime(p.bus.gain.value, now);
    p.bus.gain.linearRampToValueAtTime(0, now + secs);
    p.srcs.forEach((s) => {
      try {
        s.stop(now + secs + 0.05);
      } catch {
        /* already stopped */
      }
    });
  }

  /**
   * Music intensity, crossfaded in sync:
   *   0   calm  · 1   tension (near miss / scatter anticipation) · 2   drive (bonus hit)
   * Fractions blend. Modes with a single intensity layer clamp at 1.
   */
  setIntensity(level: number, secs = 0.8) {
    this.layerLevel = level;
    if (!this.ctx || !this.current) return;
    const now = this.ctx.currentTime;
    const ramp = (g: GainNode | null, v: number) => {
      if (!g) return;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(v, now + secs);
    };
    ramp(this.current.layer, Math.min(1, Math.max(0, level)));
    ramp(this.current.layer2, Math.min(1, Math.max(0, level - 1)));
    // the drive layer carries the groove – lift the main bed slightly less when it is in
    ramp(this.current.main, level > 1 ? 0.85 : 1);
  }

  get intensity() {
    return this.layerLevel;
  }

  /** Big-win celebration music over the ducked mode music. */
  private bigwin: Playing | null = null;
  async startBigWin() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.duck(0.15, 0.4);
    const bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(this.master);
    const g = ctx.createGain();
    g.gain.value = this.musicVolume;
    g.connect(bus);
    const src = await this.startLoop('music_bigwin', g, ctx.currentTime + 0.02);
    bus.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.3);
    this.bigwin = { mode: 'bigwin', srcs: src ? [src] : [], main: g, layer: null, layer2: null, bus };
  }
  stopBigWin() {
    this.fadeOut(this.bigwin, 0.6);
    this.bigwin = null;
    this.duck(1, 1.5);
  }

  duck(level: number, secs = 0.4) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.duckGain.gain.cancelScheduledValues(now);
    this.duckGain.gain.setValueAtTime(this.duckGain.gain.value, now);
    this.duckGain.gain.linearRampToValueAtTime(level, now + secs);
  }

  /** Prefetch a mode's stems (e.g. while a bonus intro is showing). */
  prefetch(mode: MusicMode) {
    STEMS[mode].forEach((n) => void (this.ctx ? this.buffer(n) : this.fetchRaw(n)));
  }
}

export const sound = new SoundManager();
