/**
 * Environment – full-screen cinematic backdrop per game mode with ambient VFX.
 *   base      → sunset village (church, mandacaru, dusty road)
 *   escape    → racing sunset with riders, streaming dust
 *   hideout   → dark wooden hideout, flickering lanterns, floating motes
 *   laststand → dramatic canyon, darker grade, rising embers
 */
import { BlurFilter, ColorMatrixFilter, Container, Sprite, Ticker } from 'pixi.js';
import gsap from 'gsap';
import { tex } from './assets';
import { dustTex, glowTex, raysTex, softDot, vignetteTex } from './gfx';

export type Theme = 'base' | 'escape' | 'hideout' | 'laststand';

interface Mote {
  s: Sprite;
  vx: number;
  vy: number;
  ph: number;
}

class Scene extends Container {
  bg: Sprite;
  sun?: Sprite;
  rays?: Sprite;
  lights: Sprite[] = [];
  decor: { s: Sprite; ax: number; ay: number; h: number; side: number }[] = [];
  motes: Mote[] = [];
  motesLayer = new Container();
  vignette: Sprite;
  w = 1;
  h = 1;
  t = 0;

  constructor(public theme: Theme) {
    super();
    const key = { base: 'bg_village', escape: 'bg_escape', hideout: 'bg_hideout', laststand: 'bg_canyon' }[theme];
    this.bg = new Sprite(tex(key));
    this.bg.anchor.set(0.5);
    const blur = new BlurFilter({ strength: theme === 'escape' ? 3 : 2.2, quality: 3 });
    const cm = new ColorMatrixFilter();
    if (theme === 'base') {
      cm.saturate(0.15, false);
      cm.brightness(0.92, true);
    } else if (theme === 'escape') {
      cm.saturate(0.35, false);
      cm.brightness(1.0, true);
    } else if (theme === 'hideout') {
      cm.brightness(0.6, false);
      cm.saturate(0.1, true);
    } else {
      cm.brightness(0.55, false);
      cm.saturate(0.25, true);
      cm.hue(-8, true);
    }
    this.bg.filters = [blur, cm];
    this.addChild(this.bg);

    if (theme === 'base' || theme === 'escape') {
      this.rays = new Sprite(raysTex());
      this.rays.anchor.set(0.5);
      this.rays.blendMode = 'add';
      this.rays.alpha = theme === 'escape' ? 0.35 : 0.22;
      this.addChild(this.rays);
      this.sun = new Sprite(glowTex());
      this.sun.anchor.set(0.5);
      this.sun.blendMode = 'add';
      this.sun.alpha = 0.75;
      this.addChild(this.sun);
    }
    this.addChild(this.motesLayer);

    // foreground decor (sharp sprites give depth against the blurred plate)
    const addDecor = (name: string, ax: number, ay: number, h: number, side: number, flip = false) => {
      const s = new Sprite(tex(name));
      s.anchor.set(0.5, 1);
      if (flip) s.scale.x = -1;
      this.addChild(s);
      this.decor.push({ s, ax, ay, h, side });
      return s;
    };
    if (theme === 'base') {
      addDecor('sym_cactus', 0.035, 1.02, 0.42, -1);
      addDecor('sym_cactus', 0.975, 1.03, 0.34, 1, true);
      addDecor('wheel', 0.09, 1.0, 0.16, -1);
      addDecor('jug', 0.92, 0.99, 0.12, 1);
      addDecor('sunflower', 0.14, 1.03, 0.09, -1);
    } else if (theme === 'hideout') {
      const l1 = addDecor('lantern', 0.06, 0.62, 0.26, -1);
      const l2 = addDecor('lantern', 0.94, 0.62, 0.26, 1);
      addDecor('drum', 0.07, 1.02, 0.18, -1);
      addDecor('saddle', 0.92, 1.02, 0.18, 1);
      for (const l of [l1, l2]) {
        const g = new Sprite(glowTex());
        g.anchor.set(0.5);
        g.blendMode = 'add';
        g.alpha = 0.7;
        this.addChild(g);
        this.lights.push(g);
        (g as Sprite & { follow?: Sprite }).follow = l;
      }
    } else if (theme === 'laststand') {
      addDecor('sym_cactus', 0.04, 1.03, 0.36, -1);
      addDecor('sym_cactus', 0.965, 1.03, 0.3, 1, true);
    }

    this.vignette = new Sprite(vignetteTex(theme === 'hideout' || theme === 'laststand' ? 0.95 : 0.75));
    this.addChild(this.vignette);

    const n = theme === 'escape' ? 70 : theme === 'hideout' ? 50 : 40;
    for (let i = 0; i < n; i++) this.addMote(true);
  }

  private addMote(initial = false) {
    const th = this.theme;
    const s = new Sprite(th === 'escape' ? dustTex() : softDot());
    s.anchor.set(0.5);
    if (th === 'laststand') {
      s.tint = Math.random() < 0.5 ? 0xff7a20 : 0xffc040;
      s.blendMode = 'add';
      s.scale.set(0.08 + Math.random() * 0.12);
    } else if (th === 'hideout') {
      s.tint = 0xffd890;
      s.blendMode = 'add';
      s.scale.set(0.04 + Math.random() * 0.07);
      s.alpha = 0.6;
    } else if (th === 'escape') {
      s.scale.set(1 + Math.random() * 2.5);
      s.alpha = 0.25 + Math.random() * 0.25;
    } else {
      s.tint = 0xffe0b0;
      s.scale.set(0.05 + Math.random() * 0.1);
      s.alpha = 0.5;
      s.blendMode = 'add';
    }
    const m: Mote = { s, vx: 0, vy: 0, ph: Math.random() * 10 };
    const W = this.w;
    const H = this.h;
    if (th === 'laststand') {
      m.vx = (Math.random() - 0.5) * 30;
      m.vy = -40 - Math.random() * 80;
      s.position.set(Math.random() * W, initial ? Math.random() * H : H + 20);
    } else if (th === 'escape') {
      m.vx = -400 - Math.random() * 600;
      m.vy = (Math.random() - 0.5) * 20;
      s.position.set(initial ? Math.random() * W : W + 200, H * (0.55 + Math.random() * 0.5));
    } else {
      m.vx = 8 + Math.random() * 18;
      m.vy = (Math.random() - 0.5) * 10;
      s.position.set(initial ? Math.random() * W : -20, Math.random() * H);
    }
    this.motesLayer.addChild(s);
    this.motes.push(m);
  }

  layout(w: number, h: number) {
    const sx = w / this.w;
    const sy = h / this.h;
    for (const m of this.motes) m.s.position.set(m.s.x * sx, m.s.y * sy);
    this.w = w;
    this.h = h;
    const tx = this.bg.texture;
    const k = Math.max(w / tx.width, h / tx.height) * 1.06;
    this.bg.scale.set(k);
    this.bg.position.set(w / 2, h / 2);
    if (this.sun) {
      const sunPos = { base: [0.38, 0.42], escape: [0.42, 0.48] }[this.theme as 'base' | 'escape'];
      this.sun.position.set(w * sunPos[0], h * sunPos[1]);
      this.sun.scale.set(Math.max(w, h) / 256 * 0.55);
      this.rays!.position.copyFrom(this.sun.position);
      this.rays!.scale.set(Math.max(w, h) / 512 * 1.8);
    }
    const unit = Math.min(h, w * 0.9);
    for (const d of this.decor) {
      const k2 = (unit * d.h) / d.s.texture.height;
      d.s.scale.set(Math.sign(d.s.scale.x) * k2, k2);
      d.s.position.set(w * d.ax, h * d.ay);
      // on narrow (portrait) screens keep decor at the extreme edges
      if (w < h) d.s.x = d.side < 0 ? Math.min(d.s.x, w * 0.06) : Math.max(d.s.x, w * 0.94);
    }
    this.vignette.width = w;
    this.vignette.height = h;
  }

  tick(dt: number) {
    this.t += dt;
    if (this.rays) this.rays.rotation += dt * 0.03;
    if (this.sun) this.sun.alpha = 0.7 + Math.sin(this.t * 0.8) * 0.06;
    if (this.theme === 'escape') this.bg.x = this.w / 2 + Math.sin(this.t * 0.6) * 10;
    if (this.theme === 'base') this.bg.scale.set(this.bg.scale.x * (1 + Math.sin(this.t * 0.1) * 0.00003));
    for (const l of this.lights) {
      const f = (l as Sprite & { follow?: Sprite }).follow!;
      l.position.set(f.x, f.y - f.height * 0.42);
      l.scale.set((f.height / 256) * 2.2 * (1 + Math.sin(this.t * 13 + f.x) * 0.04 + Math.random() * 0.04));
      l.alpha = 0.55 + Math.random() * 0.12;
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.ph += dt;
      m.s.x += (m.vx + Math.sin(m.ph * 1.3) * 10) * dt;
      m.s.y += (m.vy + Math.cos(m.ph) * 6) * dt;
      if (this.theme === 'laststand') m.s.alpha = 0.5 + Math.sin(m.ph * 6) * 0.4;
      const out = m.s.x < -300 || m.s.x > this.w + 300 || m.s.y < -40 || m.s.y > this.h + 40;
      if (out) {
        m.s.destroy();
        this.motes.splice(i, 1);
        this.addMote();
      }
    }
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

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.current?.layout(w, h);
  }
}
