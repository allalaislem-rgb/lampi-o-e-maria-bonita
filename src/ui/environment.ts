/**
 * Environment – the client's painted backdrops, one per game mode:
 *   base      → sunset village (bgv_base, panoramic 3:1)
 *   escape    → sunset chase across the plain (bgv_escape)
 *   hideout   → lantern-lit cave hideout (bgv_hideout)
 *   laststand → bullet-scarred farmhouse at sunset (bgv_laststand)
 *
 * Performance: every background is pre-graded offline and has a pre-blurred low-res
 * "fill" texture (tools/art/cut_v7.py), so nothing here uses runtime filters. Ambient
 * life is light: a few motes, lantern flicker, and (Last Stand) occasional lightning.
 *
 * The galloping posse (client flipbook) only appears when a bonus is won: gallop()
 * is called by the bonus intro and by The Great Escape, and the riders live in this
 * layer, i.e. behind the reel frame.
 */
import { AnimatedSprite, Container, Graphics, Sprite, Ticker, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { tex, seq } from './assets';
import { T } from './gfx';

export type Theme = 'base' | 'escape' | 'hideout' | 'laststand';

/** Lantern glow positions in each picture's own pixel space. */
const LANTERNS: Record<Theme, { x: number; y: number; s?: number }[]> = {
  base: [{ x: 497, y: 368 }, { x: 548, y: 368 }, { x: 617, y: 372 }, { x: 1708, y: 352 }, { x: 1938, y: 318 }],
  escape: [],
  hideout: [{ x: 623, y: 211, s: 1.4 }, { x: 1500, y: 153, s: 1.6 }, { x: 867, y: 326 }, { x: 953, y: 575, s: 1.5 }],
  laststand: [{ x: 172, y: 216, s: 1.3 }],
};
/** How much of the screen height the sharp picture must cover (panoramas are anchored to the bottom). */
const COVER: Record<Theme, number> = { base: 0.78, escape: 1, hideout: 1, laststand: 0.8 };
const MOTES: Record<Theme, number> = { base: 22, escape: 18, hideout: 26, laststand: 34 };

interface Mote { s: Sprite; vx: number; vy: number; ph: number }

class Scene extends Container {
  fill: Sprite;
  pic: Sprite;
  lanterns: { g: Sprite; x: number; y: number; s: number }[] = [];
  motes: Mote[] = [];
  moteLayer = new Container();
  riderLayer = new Container();
  flash = new Graphics();
  w = 1920;
  h = 1080;
  k = 1;
  t = 0;
  px = 0;
  py = 0;
  private nextBolt = 6;
  private riding = false;

  constructor(public theme: Theme) {
    super();
    this.fill = new Sprite(tex(`bgv_${theme}_fill`));
    this.fill.anchor.set(0.5);
    this.pic = new Sprite(tex(`bgv_${theme}`));
    this.pic.anchor.set(0.5, 1);
    this.addChild(this.fill, this.pic, this.riderLayer);
    for (const l of LANTERNS[theme]) {
      const g = new Sprite(T.glow());
      g.anchor.set(0.5);
      g.blendMode = 'add';
      g.tint = 0xffa030;
      this.lanterns.push({ g, x: l.x, y: l.y, s: l.s ?? 1 });
      this.addChild(g);
    }
    this.addChild(this.moteLayer, this.flash);
    this.flash.alpha = 0;
    this.flash.visible = false;
    for (let i = 0; i < MOTES[theme]; i++) this.addMote(true);
  }

  /** The painted posse galloping across the plain, behind the reels. */
  gallop(count = 1, approach = true) {
    const frames = seq('ride_', 24);
    const loop = frames.slice(8);
    for (let i = 0; i < count; i++) {
      const r = new AnimatedSprite(approach && i === 0 ? frames : loop);
      r.anchor.set(0.5, 1);
      r.animationSpeed = 0.42;
      r.loop = !(approach && i === 0);
      r.onComplete = () => {
        r.textures = loop;
        r.loop = true;
        r.gotoAndPlay(0);
      };
      r.play();
      const depth = 0.75 + Math.random() * 0.45 - i * 0.12;
      r.scale.set((this.h * 0.32 * depth) / frames[0].height);
      r.alpha = 0.96;
      r.position.set(-r.width * (0.6 + i * 0.9), this.h * (0.88 + i * 0.03));
      this.riderLayer.addChild(r);
      gsap.to(r, {
        x: this.w + r.width,
        duration: 3.4 / depth + i * 0.4,
        delay: i * 0.25,
        ease: 'power1.in',
        onComplete: () => {
          r.stop();
          gsap.killTweensOf(r);
          r.destroy();
        },
      });
    }
  }

  /** Repeating posse passes while The Great Escape is running. */
  startRiding() {
    if (this.riding) return;
    this.riding = true;
    const go = () => {
      if (!this.riding || this.destroyed) return;
      this.gallop(1 + (Math.random() < 0.4 ? 1 : 0), false);
      gsap.delayedCall(5 + Math.random() * 5, go);
    };
    go();
  }
  stopRiding() {
    this.riding = false;
  }

  private addMote(initial = false) {
    const th = this.theme;
    const s = new Sprite(th === 'laststand' ? T.ember() : T.dot());
    s.anchor.set(0.5);
    s.blendMode = 'add';
    const m: Mote = { s, vx: 0, vy: 0, ph: Math.random() * 10 };
    if (th === 'laststand') {
      s.tint = Math.random() < 0.5 ? 0xff6a1a : 0xffb040;
      s.scale.set(0.25 + Math.random() * 0.4);
      m.vx = (Math.random() - 0.5) * 30;
      m.vy = -50 - Math.random() * 80;
      s.position.set(Math.random() * this.w, initial ? Math.random() * this.h : this.h + 30);
    } else {
      s.tint = th === 'hideout' ? 0xffd890 : 0xffe0b0;
      s.scale.set(0.3 + Math.random() * 0.6);
      s.alpha = 0.5;
      m.vx = (th === 'escape' ? -40 : 6) + Math.random() * 16;
      m.vy = (Math.random() - 0.5) * 8;
      s.position.set(initial ? Math.random() * this.w : th === 'escape' ? this.w + 20 : -20, Math.random() * this.h);
    }
    this.moteLayer.addChild(s);
    this.motes.push(m);
  }

  layout(w: number, h: number) {
    const sx = w / this.w;
    const sy = h / this.h;
    for (const m of this.motes) m.s.position.set(m.s.x * sx, m.s.y * sy);
    this.w = w;
    this.h = h;
    const ft = this.fill.texture;
    this.fill.scale.set(Math.max(w / ft.width, h / ft.height) * 1.06);
    const pt = this.pic.texture;
    this.k = Math.max(w / pt.width, (h * COVER[this.theme]) / pt.height) * 1.02;
    this.pic.scale.set(this.k);
    this.flash.clear().rect(0, 0, w, h).fill(0xfff0ff);
    this.place();
  }

  setPointer(nx: number, ny: number) {
    this.px = nx;
    this.py = ny;
  }

  private place() {
    const pan = Math.sin(this.t * (this.theme === 'escape' ? 0.3 : 0.08)) * (this.theme === 'escape' ? 10 : 5);
    this.pic.position.set(this.w / 2 - this.px * 12 + pan, this.h + 4 - this.py * 5);
    this.fill.position.set(this.w / 2 - this.px * 5, this.h / 2);
    const pt = this.pic.texture;
    for (const l of this.lanterns) {
      l.g.position.set(this.pic.x + (l.x - pt.width / 2) * this.k, this.pic.y + (l.y - pt.height) * this.k);
    }
  }

  tick(dt: number) {
    this.t += dt;
    this.place();
    this.lanterns.forEach((l, i) => {
      l.g.scale.set(this.k * 0.8 * l.s * (1 + Math.sin(this.t * 11 + i * 2) * 0.05));
      l.g.alpha = 0.38 + Math.sin(this.t * 17 + i * 5) * 0.06;
    });
    if (this.theme === 'laststand') {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.nextBolt = 6 + Math.random() * 8;
        this.lightning();
      }
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.ph += dt;
      m.s.x += (m.vx + Math.sin(m.ph * 1.3) * 10) * dt;
      m.s.y += (m.vy + Math.cos(m.ph) * 6) * dt;
      m.s.alpha = this.theme === 'laststand' ? 0.55 + Math.sin(m.ph * 6) * 0.4 : 0.3 + Math.sin(m.ph * 1.7) * 0.25;
      if (m.s.x < -60 || m.s.x > this.w + 60 || m.s.y < -60 || m.s.y > this.h + 60) {
        m.s.destroy();
        this.motes.splice(i, 1);
        this.addMote();
      }
    }
  }

  lightning() {
    this.flash.visible = true;
    gsap.timeline({ onComplete: () => void (this.flash.visible = false) })
      .to(this.flash, { alpha: 0.28, duration: 0.05 }).to(this.flash, { alpha: 0, duration: 0.12 })
      .to(this.flash, { alpha: 0.18, duration: 0.04 }).to(this.flash, { alpha: 0, duration: 0.5 });
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
    let last = 0;
    window.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - last < 30) return;
      last = now;
      this.current?.setPointer((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2);
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
    prev?.stopRiding();
    this.current = s;
    this.addChild(s);
    if (theme === 'escape') s.startRiding();
    if (instant || !prev) {
      s.alpha = 1;
      if (prev) this.removeChild(prev);
      return;
    }
    s.alpha = 0;
    gsap.to(s, { alpha: 1, duration: 0.9, ease: 'sine.inOut', onComplete: () => void this.removeChild(prev) });
  }

  /** Posse gallops across the current backdrop (behind the reels) – bonus wins only. */
  gallop(count = 2) {
    this.current?.gallop(count, true);
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

export type { Texture };
