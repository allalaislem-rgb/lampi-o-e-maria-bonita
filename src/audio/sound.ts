/**
 * Sound Manager – procedurally synthesised SFX and music (Web Audio API).
 *
 * PLACEHOLDER AUDIO: everything is generated at runtime so the prototype ships
 * without audio files. The music loops are original sketches inspired by
 * forró / baião (zabumba, triangle, accordion-like lead). Final audio should be
 * produced by a sound designer and swapped in behind this same API.
 */
export type MusicTheme = 'base' | 'escape' | 'hideout' | 'laststand' | null;

type Sfx =
  | 'click' | 'spinStart' | 'reelStop' | 'scatter' | 'anticipation' | 'win' | 'bigWin' | 'coin' | 'countTick'
  | 'wild' | 'raid' | 'arrival' | 'chestOpen' | 'chestEmpty' | 'treasure' | 'lock' | 'respin' | 'multiplier'
  | 'transition' | 'retrigger' | 'fanfare' | 'error';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noise!: AudioBuffer;
  private musicTimer: number | null = null;
  private theme: MusicTheme = null;
  private nextBeat = 0;
  private step = 0;
  muted = false;
  musicOn = true;

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
    this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.32;
    this.musicBus.connect(this.master);
    const len = this.ctx.sampleRate * 1.5;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.theme) this.startLoop();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  // ------------------------------------------------------------ primitives
  private tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; slide?: number; attack?: number; bus?: GainNode; detune?: number; filter?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = (opts.at ?? ctx.currentTime) + 0.001;
    const o = ctx.createOscillator();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    const g = ctx.createGain();
    const vol = opts.vol ?? 0.3;
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = o;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(opts.bus ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseHit(dur: number, opts: { at?: number; vol?: number; type?: BiquadFilterType; freq?: number; q?: number; bus?: GainNode; sweep?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = (opts.at ?? ctx.currentTime) + 0.001;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq ?? 1000, t);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(opts.bus ?? this.sfxBus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  private kick(at: number, vol = 0.7, bus?: GainNode) {
    this.tone(120, 0.32, { at, vol, slide: 42, type: 'sine', bus });
    this.noiseHit(0.04, { at, vol: vol * 0.25, type: 'lowpass', freq: 900, bus });
  }

  // ------------------------------------------------------------ SFX
  play(name: Sfx, opt: { pitch?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const p = opt.pitch ?? 1;
    switch (name) {
      case 'click':
        this.tone(1400, 0.05, { type: 'triangle', vol: 0.12 });
        break;
      case 'spinStart':
        this.noiseHit(0.35, { type: 'bandpass', freq: 400, sweep: 2400, vol: 0.18, q: 0.7 });
        this.tone(220, 0.18, { type: 'triangle', vol: 0.12, slide: 440 });
        break;
      case 'reelStop':
        this.kick(t, 0.45);
        this.noiseHit(0.06, { freq: 2500, vol: 0.08 });
        break;
      case 'scatter':
        [0, 0.07, 0.14].forEach((d, i) => this.tone(880 * p * [1, 1.25, 1.5][i], 0.4, { at: t + d, type: 'triangle', vol: 0.18 }));
        this.noiseHit(0.5, { type: 'highpass', freq: 6000, vol: 0.07 });
        break;
      case 'anticipation':
        this.tone(110, 1.4, { type: 'sawtooth', vol: 0.06, slide: 220, filter: 900, attack: 0.3 });
        this.noiseHit(1.3, { type: 'bandpass', freq: 300, sweep: 3000, vol: 0.06 });
        break;
      case 'win':
        [523, 659, 784].forEach((f, i) => this.tone(f * p, 0.35, { at: t + i * 0.06, type: 'triangle', vol: 0.16 }));
        break;
      case 'bigWin':
        [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.6, { at: t + i * 0.09, type: 'square', vol: 0.08, filter: 3000 }));
        [0, 0.36].forEach((d) => this.kick(t + d, 0.8));
        this.noiseHit(1.2, { type: 'highpass', freq: 7000, vol: 0.1, at: t + 0.4 });
        break;
      case 'fanfare':
        [[392, 0], [523, 0.12], [659, 0.24], [784, 0.36], [659, 0.52], [784, 0.62], [1046, 0.75]].forEach(([f, d]) =>
          this.tone(f, 0.45, { at: t + d, type: 'sawtooth', vol: 0.07, filter: 2600 }),
        );
        [0, 0.36, 0.75].forEach((d) => this.kick(t + d, 0.7));
        break;
      case 'coin':
        this.tone(1900 * p, 0.12, { type: 'square', vol: 0.05, filter: 5000 });
        this.tone(2850 * p, 0.2, { at: t + 0.05, type: 'triangle', vol: 0.08 });
        break;
      case 'countTick':
        this.tone(2400 * p, 0.03, { type: 'triangle', vol: 0.04 });
        break;
      case 'wild':
        this.tone(160, 0.6, { type: 'sawtooth', vol: 0.12, slide: 640, filter: 1800 });
        this.noiseHit(0.7, { type: 'bandpass', freq: 600, sweep: 5000, vol: 0.14 });
        this.kick(t + 0.1, 0.8);
        break;
      case 'arrival':
        // gunshot + whistle
        this.noiseHit(0.35, { type: 'lowpass', freq: 3000, sweep: 300, vol: 0.6 });
        this.kick(t, 1);
        this.tone(1200, 0.5, { at: t + 0.3, type: 'sine', vol: 0.1, slide: 1800 });
        this.tone(1800, 0.6, { at: t + 0.8, type: 'sine', vol: 0.1, slide: 900 });
        break;
      case 'raid':
        for (let i = 0; i < 8; i++) this.noiseHit(0.08, { at: t + i * 0.11, type: 'lowpass', freq: 500, vol: 0.3 }); // hooves
        this.tone(330, 0.9, { at: t + 0.2, type: 'sawtooth', vol: 0.08, filter: 1500 });
        this.tone(440, 0.9, { at: t + 0.2, type: 'sawtooth', vol: 0.06, filter: 1500 });
        break;
      case 'chestOpen':
        this.noiseHit(0.35, { type: 'bandpass', freq: 180, sweep: 600, q: 6, vol: 0.35 }); // creak
        this.tone(1318, 0.6, { at: t + 0.25, type: 'triangle', vol: 0.12 });
        this.tone(1760, 0.7, { at: t + 0.32, type: 'triangle', vol: 0.1 });
        break;
      case 'chestEmpty':
        this.noiseHit(0.3, { type: 'bandpass', freq: 200, sweep: 120, q: 4, vol: 0.3 });
        this.tone(220, 0.4, { at: t + 0.2, type: 'triangle', vol: 0.1, slide: 150 });
        break;
      case 'treasure':
        [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.7, { at: t + i * 0.07, type: 'triangle', vol: 0.12 }));
        this.noiseHit(1.2, { type: 'highpass', freq: 8000, vol: 0.09 });
        break;
      case 'lock':
        this.tone(1600 * p, 0.25, { type: 'square', vol: 0.06, filter: 4000 });
        this.tone(2400 * p, 0.5, { type: 'sine', vol: 0.08, at: t + 0.01 });
        this.noiseHit(0.1, { type: 'highpass', freq: 3000, vol: 0.18 });
        this.kick(t, 0.6);
        break;
      case 'respin':
        this.noiseHit(0.4, { type: 'bandpass', freq: 800, sweep: 200, vol: 0.12 });
        this.tone(98, 0.3, { type: 'sine', vol: 0.4, slide: 60 });
        break;
      case 'multiplier':
        this.tone(440 * p, 0.25, { type: 'square', vol: 0.06, slide: 880 * p, filter: 3000 });
        this.tone(880 * p, 0.4, { at: t + 0.12, type: 'triangle', vol: 0.14 });
        break;
      case 'transition':
        this.noiseHit(1.1, { type: 'bandpass', freq: 200, sweep: 4000, vol: 0.2, q: 0.6 });
        this.kick(t + 0.9, 0.9);
        break;
      case 'retrigger':
        [659, 784, 988, 1318].forEach((f, i) => this.tone(f, 0.4, { at: t + i * 0.08, type: 'triangle', vol: 0.14 }));
        break;
      case 'error':
        this.tone(180, 0.18, { type: 'square', vol: 0.06, filter: 900 });
        break;
    }
  }

  // ------------------------------------------------------------ music
  setMusic(theme: MusicTheme) {
    if (theme === this.theme) return;
    this.theme = theme;
    this.stopLoop();
    if (theme && this.ctx) this.startLoop();
  }

  toggleMusic(on: boolean) {
    this.musicOn = on;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.1);
  }

  private stopLoop() {
    if (this.musicTimer !== null) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  private startLoop() {
    if (!this.ctx) return;
    this.nextBeat = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.schedule(), 50);
  }

  /** 16-step sequencer scheduled slightly ahead of time. */
  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.theme) return;
    const bpm = { base: 112, escape: 138, hideout: 78, laststand: 96 }[this.theme];
    const stepDur = 60 / bpm / 4;
    while (this.nextBeat < ctx.currentTime + 0.2) {
      this.musicStep(this.step, this.nextBeat, stepDur);
      this.nextBeat += stepDur;
      this.step = (this.step + 1) % 64;
    }
  }

  private musicStep(step: number, t: number, sd: number) {
    const bus = this.musicBus;
    const s16 = step % 16;
    const bar = Math.floor(step / 16);
    const theme = this.theme!;
    // chord roots (G mixolydian-ish progression for baião feel)
    const roots = theme === 'laststand' ? [110, 98, 87.3, 98] : theme === 'hideout' ? [110, 110, 98, 82.4] : [98, 98, 87.3, 98];
    const root = roots[bar];
    const scale = theme === 'laststand' || theme === 'hideout' ? [1, 1.122, 1.189, 1.335, 1.498, 1.587, 1.782, 2] : [1, 1.122, 1.26, 1.335, 1.498, 1.682, 1.782, 2];

    if (theme === 'hideout') {
      if (s16 === 0) this.tone(root, sd * 14, { at: t, type: 'sine', vol: 0.35, bus, attack: 0.2 });
      if (s16 === 0 || s16 === 8) this.tone(root * 2, sd * 7, { at: t, type: 'triangle', vol: 0.05, bus, attack: 0.3, filter: 900 });
      if (s16 % 4 === 2 && Math.random() < 0.55) {
        const n = scale[Math.floor(Math.random() * scale.length)];
        this.tone(root * 4 * n, sd * 5, { at: t, type: 'triangle', vol: 0.05, bus, attack: 0.02 });
      }
      if (s16 === 12) this.noiseHit(0.08, { at: t, type: 'highpass', freq: 7000, vol: 0.04, bus });
      return;
    }

    // zabumba: low on 1, the "and" of 2, and 4-ish pattern
    const zab = theme === 'laststand' ? [0, 6, 8, 10, 14] : [0, 6, 8, 12];
    if (zab.includes(s16)) this.kick(t, theme === 'laststand' ? 0.75 : 0.55, bus);
    if (theme !== 'laststand' && (s16 === 4 || s16 === 12)) this.noiseHit(0.09, { at: t, type: 'bandpass', freq: 1800, vol: 0.18, bus }); // bacalhau slap
    if (theme === 'laststand' && (s16 === 4 || s16 === 12)) {
      this.noiseHit(0.2, { at: t, type: 'bandpass', freq: 3200, q: 8, vol: 0.12, bus }); // metallic
      this.tone(root * 8, 0.3, { at: t, type: 'square', vol: 0.015, bus, filter: 4000 });
    }
    // triangle (instrument) on every 8th, open on offbeat
    if (s16 % 2 === 0) this.noiseHit(s16 % 4 === 2 ? 0.14 : 0.04, { at: t, type: 'highpass', freq: 7500, vol: s16 % 4 === 2 ? 0.09 : 0.05, bus });
    // bass
    if (s16 === 0 || s16 === 10) this.tone(root, sd * 5, { at: t, type: 'triangle', vol: 0.3, bus });
    if (s16 === 6) this.tone(root * 1.498, sd * 3, { at: t, type: 'triangle', vol: 0.22, bus });
    // accordion-like lead: two detuned saws through a lowpass
    const melodies: Record<string, number[]> = {
      base: [7, -1, 6, -1, 4, -1, 5, 4, 2, -1, 4, -1, 1, -1, 0, -1],
      escape: [4, 5, 7, 5, 4, 2, 4, -1, 7, 6, 4, 2, 1, 2, 0, -1],
      laststand: [0, -1, -1, 3, -1, -1, 4, -1, 3, -1, 2, -1, 0, -1, -1, -1],
    };
    const mel = melodies[theme];
    const deg = mel[(s16 + bar * 3) % 16];
    if (deg >= 0 && (bar % 2 === 0 || theme === 'escape')) {
      const f = root * 4 * scale[deg % 8];
      const vol = theme === 'laststand' ? 0.035 : 0.045;
      this.tone(f, sd * 1.8, { at: t, type: 'sawtooth', vol, bus, filter: 2200, attack: 0.02 });
      this.tone(f, sd * 1.8, { at: t, type: 'sawtooth', vol: vol * 0.8, bus, filter: 2200, detune: 9, attack: 0.02 });
    }
    // chord stabs on offbeats
    if (theme !== 'laststand' && (s16 === 2 || s16 === 10)) {
      [2, 2.52, 3].forEach((m) => this.tone(root * m, sd * 1.2, { at: t, type: 'square', vol: 0.012, bus, filter: 1600 }));
    }
  }
}

export const sound = new SoundManager();
