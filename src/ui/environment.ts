/**
 * Environment – cinematic 3-layer parallax backdrop per game mode with ambient life.
 *   base      → sunset village (church, casario, mandacaru) · drifting dust motes, sun glow
 *   escape    → racing sunset · galloping riders, streaming dust, panning horizon
 *   hideout   → wooden hideout interior · swaying lanterns, light flicker, floating motes
 *   laststand → night canyon · rising embers, lightning flashes, drifting clouds
 */
import { Container, Sprite, Ticker, Graphics } from 'pixi.js';
import gsap from 'gsap';
import { tex } from './assets';
import { T } from './gfx';

export type Theme = 'base' | 'escape' | 'hideout' | 'laststand';

interface Mote {
  s: Sprite;
  vx: number;
  vy: number;
  ph: number;
  base: number;
}

class Scene extends Container {
  back: Sprite;
  mid: Sprite;
  front: Sprite;
  glow: Sprite | null = null;
  motes: Mote[] = [];
  moteLayer = new Container();
  riderLayer = new Container();
  lanterns: { s: Sprite; g: Sprite; ph: number; ax: number }[] = [];
  flashG = new Graphics();
  w = 1920;
  h = 1080;
  k = 1;
  t = 0;
  px = 0;
  py = 0;
  private nextBolt = 4;

  constructor(public theme: Theme) {
    super();
    const mk = (n: string) => {
      const s = new Sprite(tex(`bg_${theme}_${n}`));
      s.anchor.set(0.5);
      return s;
    };
    this.back = mk('back');
    this.mid = mk('mid');
    this.front = mk('front');
    // push the code-drawn backdrop back so the painted symbols & UI read first
    this.back.tint = 0xc8b4a4;
    this.mid.tint = 0xb8a090;
    this.front.tint = 0x9a8070;
    this.addChild(this.back);
    if (theme === 'base' || theme === 'escape') {
      this.glow = new Sprite(T.glow());
      this.glow.anchor.set(0.5);
      this.glow.blendMode = 'add';
      this.glow.tint = theme === 'base' ? 0xffc870 : 0xffb050;
      this.addChild(this.glow);
    }
    this.addChild(this.mid, this.riderLayer, this.moteLayer, this.front);
    if (theme === 'hideout') {
      for (const ax of [0.1, 0.9]) {
        const s = new Sprite(tex('lantern'));
        s.anchor.set(0.5, 0);
        const g = new Sprite(T.glow());
        g.anchor.set(0.5);
        g.blendMode = 'add';
        g.tint = 0xffb050;
        this.addChild(g, s);
        this.lanterns.push({ s, g, ph: Math.random() * 6, ax });
      }
    }
    this.flashG.alpha = 0;
    this.addChild(this.flashG);
    const n = theme === 'escape' ? 46 : theme === 'hideout' ? 60 : theme === 'laststand' ? 70 : 50;
    for (let i = 0; i < n; i++) this.addMote(true);
    if (theme === 'escape') this.spawnRiders();
  }

  private addMote(initial = false) {
    const th = this.theme;
    const s = new Sprite(th === 'escape' ? T.dust() : th === 'laststand' ? T.ember() : T.dot());
    s.anchor.set(0.5);
    const m: Mote = { s, vx: 0, vy: 0, ph: Math.random() * 10, base: 1 };
    const W = this.w;
    const H = this.h;
    if (th === 'laststand') {
      s.tint = Math.random() < 0.5 ? 0xff6a1a : 0xffb040;
      s.blendMode = 'add';
      m.base = 0.25 + Math.random() * 0.45;
      s.scale.set(m.base);
      m.vx = (Math.random() - 0.5) * 30;
      m.vy = -50 - Math.random() * 90;
      s.position.set(Math.random() * W, initial ? Math.random() * H : H + 30);
    } else if (th === 'escape') {
      s.tint = 0xe8b080;
      m.base = 0.8 + Math.random() * 1.6;
      s.scale.set(m.base);
      s.alpha = 0.18 + Math.random() * 0.22;
      m.vx = -500 - Math.random() * 700;
      m.vy = (Math.random() - 0.5) * 20;
      s.position.set(initial ? Math.random() * W : W + 300, H * (0.55 + Math.random() * 0.5));
    } else {
      s.tint = th === 'hideout' ? 0xffd890 : 0xffe0b0;
      s.blendMode = 'add';
      m.base = 0.3 + Math.random() * 0.7;
      s.scale.set(m.base);
      s.alpha = 0.55;
      m.vx = 6 + Math.random() * 16;
      m.vy = (Math.random() - 0.5) * 8;
      s.position.set(initial ? Math.random() * W : -20, Math.random() * H);
    }
    this.moteLayer.addChild(s);
    this.motes.push(m);
  }

  private spawnRiders() {
    const make = () => {
      const r = new Sprite(tex('rider'));
      r.anchor.set(0.5, 1);
      const depth = 0.35 + Math.random() * 0.4;
      r.scale.set(depth * 0.6);
      r.tint = 0x2a0c06;
      r.alpha = 0.85;
      r.x = -300;
      r.y = this.h * (0.78 + (depth - 0.35) * 0.12);
      this.riderLayer.addChild(r);
      const dur = 7 / depth;
      gsap.to(r, { x: this.w + 300, duration: dur, ease: 'none', onComplete: () => { gsap.killTweensOf(r); r.destroy(); } });
      gsap.to(r, { y: r.y - 10 * depth, duration: 0.18, yoyo: true, repeat: Math.ceil(dur / 0.18), ease: 'sine.inOut' });
      gsap.delayedCall(1.2 + Math.random() * 2.2, () => {
        if (!this.destroyed) make();
      });
    };
    for (let i = 0; i < 3; i++) gsap.delayedCall(i * 1.1, make);
  }

  layout(w: number, h: number) {
    const sx = w / this.w;
    const sy = h / this.h;
    for (const m of this.motes) m.s.position.set(m.s.x * sx, m.s.y * sy);
    this.riderLayer.children.forEach((r) => (r.y *= sy));
    this.w = w;
    this.h = h;
    this.k = Math.max(w / 1920, h / 1080) * 1.05;
    for (const l of [this.back, this.mid, this.front]) l.scale.set(this.k);
    if (this.glow) this.glow.scale.set(this.k * (this.theme === 'base' ? 7 : 9));
    for (const l of this.lanterns) {
      l.s.scale.set(this.k * 0.55);
      l.g.scale.set(this.k * 3.4);
    }
    this.flashG.clear().rect(0, 0, w, h).fill(0xfff0ff);
    this.place();
  }

  setPointer(nx: number, ny: number) {
    this.px = nx;
    this.py = ny;
  }

  private place() {
    const cx = this.w / 2;
    const cy = this.h / 2;
    const sway = Math.sin(this.t * 0.12) * 6;
    const pan = this.theme === 'escape' ? Math.sin(this.t * 0.35) * 14 : 0;
    this.back.position.set(cx - this.px * 6 + sway * 0.3 + pan * 0.4, cy - this.py * 4);
    this.mid.position.set(cx - this.px * 14 + sway * 0.7 + pan, cy - this.py * 8);
    this.front.position.set(cx - this.px * 26 + sway + pan * 1.6, cy - this.py * 14 + 6);
    if (this.glow) {
      const sp = this.theme === 'base' ? [820, 640] : [960, 760];
      this.glow.position.set(cx + (sp[0] - 960) * this.k - this.px * 6, cy + (sp[1] - 540) * this.k - this.py * 4);
    }
    for (const l of this.lanterns) {
      const x = this.w * l.ax - this.px * 20;
      l.s.position.set(x, -8);
      l.s.rotation = Math.sin(this.t * 1.1 + l.ph) * 0.05;
      l.g.position.set(x + Math.sin(l.s.rotation) * -60 * this.k, 60 * this.k + 110 * this.k);
    }
  }

  tick(dt: number) {
    this.t += dt;
    this.place();
    if (this.glow) this.glow.alpha = 0.32 + Math.sin(this.t * 0.7) * 0.05;
    for (const l of this.lanterns) l.g.alpha = 0.5 + Math.sin(this.t * 9 + l.ph) * 0.05 + Math.random() * 0.08;
    if (this.theme === 'laststand') {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.nextBolt = 5 + Math.random() * 7;
        this.lightning();
      }
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.ph += dt;
      m.s.x += (m.vx + Math.sin(m.ph * 1.3) * 10) * dt;
      m.s.y += (m.vy + Math.cos(m.ph) * 6) * dt;
      if (this.theme === 'laststand') m.s.alpha = 0.55 + Math.sin(m.ph * 6) * 0.4;
      if (this.theme === 'hideout' || this.theme === 'base') m.s.alpha = 0.3 + Math.sin(m.ph * 1.7) * 0.25;
      if (m.s.x < -400 || m.s.x > this.w + 400 || m.s.y < -60 || m.s.y > this.h + 60) {
        m.s.destroy();
        this.motes.splice(i, 1);
        this.addMote();
      }
    }
  }

  lightning() {
    const tl = gsap.timeline();
    tl.to(this.flashG, { alpha: 0.35, duration: 0.05 }).to(this.flashG, { alpha: 0, duration: 0.12 }).to(this.flashG, { alpha: 0.22, duration: 0.04 }).to(this.flashG, { alpha: 0, duration: 0.5 });
  }
}

export class Environment extends Container {
  private scenes = new Map<Theme, Scene>();
  current: Scene | null = null;
  private w = 1;
  private h = 1;

  constructor() {
    super();
    Ticker.shared.add((t) => this.current?.tick(Math.min(0.05, t.deltaMS / 1000)));
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      this.current?.setPointer(nx, ny);
    });
  }

  set(theme: Theme, instant = false) {
    if (this.current?.theme === theme) return;
    let s = this.scenes.get(theme);
    if (!s) {
      s = new Scene(theme);
      this.scenes.set(theme, s);
    }
    s.layout(this.w, this.h);
    const prev = this.current;
    this.current = s;
    this.addChild(s);
    if (instant || !prev) {
      s.alpha = 1;
      if (prev) this.removeChild(prev);
      return;
    }
    s.alpha = 0;
    gsap.to(s, { alpha: 1, duration: 0.9, ease: 'sine.inOut', onComplete: () => void this.removeChild(prev) });
  }

  lightning() {
    this.current?.lightning();
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.current?.layout(w, h);
  }
}
