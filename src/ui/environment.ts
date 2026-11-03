/**
 * Environment – the client's painted sunset-village backdrop (bg_painted, 2000×667),
 * graded per game mode, with ambient life:
 *   base      → warm sunset · drifting dust motes, sun glow, flickering porch lanterns
 *   escape    → hotter, more saturated · painted riders gallop across the plain, streaming dust
 *   hideout   → dusk, cooled & darkened · strong lantern glow, floating motes
 *   laststand → blood-red night · rising embers, lightning flashes
 *
 * The picture is panoramic (3:1), so it is drawn twice: a blurred copy covers the
 * whole screen and the sharp copy sits at the bottom, covering as much as possible
 * while keeping the church (left) and the hut (right) in view on wide screens.
 */
import { AnimatedSprite, BlurFilter, ColorMatrixFilter, Container, Graphics, Sprite, Texture, Ticker } from 'pixi.js';
import gsap from 'gsap';
import { tex, seq } from './assets';
import { T } from './gfx';

export type Theme = 'base' | 'escape' | 'hideout' | 'laststand';

const BG_W = 2000;
const BG_H = 667;
const SUN = { x: 1000, y: 270 };
const LANTERNS = [
  { x: 497, y: 368 }, { x: 548, y: 368 }, { x: 617, y: 372 }, { x: 1708, y: 352 }, { x: 1938, y: 318 },
];

interface Mote { s: Sprite; vx: number; vy: number; ph: number }

let feather: Texture | null = null;
/** Vertical alpha ramp: transparent at the very top, opaque from 14% down. */
function featherTexture(): Texture {
  if (feather) return feather;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(0.14, 'rgba(255,255,255,1)');
  gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 256);
  feather = Texture.from(c);
  return feather;
}

function grade(theme: Theme): ColorMatrixFilter {
  const cm = new ColorMatrixFilter();
  switch (theme) {
    case 'base':
      cm.brightness(0.92, false);
      break;
    case 'escape':
      cm.saturate(0.3, false);
      cm.brightness(1.02, true);
      break;
    case 'hideout':
      cm.brightness(0.55, false);
      cm.saturate(-0.25, true);
      cm.hue(-14, true);
      break;
    case 'laststand':
      cm.brightness(0.5, false);
      cm.saturate(0.35, true);
      cm.hue(-10, true);
      break;
  }
  return cm;
}

class Scene extends Container {
  fill: Sprite;
  pic: Sprite;
  featherMask = new Sprite(featherTexture());
  sun: Sprite;
  lanterns: Sprite[] = [];
  motes: Mote[] = [];
  moteLayer = new Container();
  riderLayer = new Container();
  flash = new Graphics();
  w = 1920;
  h = 1080;
  k = 1;
  ox = 0;
  oy = 0;
  t = 0;
  px = 0;
  py = 0;
  private nextBolt = 5;
  private riderFrames: Texture[] = [];

  constructor(public theme: Theme) {
    super();
    const t = tex('bg_painted');
    this.fill = new Sprite(t);
    this.fill.anchor.set(0.5);
    this.fill.filters = [new BlurFilter({ strength: 18, quality: 3 }), grade(theme)];
    this.pic = new Sprite(t);
    this.pic.anchor.set(0.5, 1);
    this.pic.filters = [grade(theme)];
    this.sun = new Sprite(T.glow());
    this.sun.anchor.set(0.5);
    this.sun.blendMode = 'add';
    this.sun.tint = theme === 'laststand' ? 0xff3010 : theme === 'hideout' ? 0xff9a40 : 0xffc060;
    this.sun.alpha = theme === 'hideout' ? 0.15 : 0.45;
    this.pic.mask = this.featherMask;
    this.addChild(this.fill, this.featherMask, this.pic, this.sun);
    for (let i = 0; i < LANTERNS.length; i++) {
      const g = new Sprite(T.glow());
      g.anchor.set(0.5);
      g.blendMode = 'add';
      g.tint = 0xffa030;
      this.lanterns.push(g);
      this.addChild(g);
    }
    this.addChild(this.riderLayer, this.moteLayer, this.flash);
    this.flash.alpha = 0;
    const n = theme === 'escape' ? 40 : theme === 'hideout' ? 55 : theme === 'laststand' ? 70 : 45;
    for (let i = 0; i < n; i++) this.addMote(true);
    if (theme === 'escape' || theme === 'base') {
      this.riderFrames = seq('ride_', 24).slice(8);
      gsap.delayedCall(theme === 'escape' ? 0.4 : 6, () => this.rideBy());
    }
  }

  /** Painted posse galloping across the plain (client flipbook, gallop loop frames 8–23). */
  private rideBy() {
    if (this.destroyed) return;
    const r = new AnimatedSprite(this.riderFrames);
    r.anchor.set(0.5, 1);
    r.animationSpeed = 0.5;
    r.play();
    const depth = this.theme === 'escape' ? 0.55 + Math.random() * 0.5 : 0.35 + Math.random() * 0.2;
    r.scale.set(this.k * depth * 1.2);
    r.tint = this.theme === 'escape' ? 0xffffff : 0xd8b8a0;
    r.alpha = this.theme === 'escape' ? 0.95 : 0.75;
    const groundY = this.oy - this.k * BG_H * (0.25 - (depth - 0.35) * 0.18);
    r.position.set(-r.width, groundY);
    this.riderLayer.addChild(r);
    const dur = (this.theme === 'escape' ? 5 : 11) / depth;
    gsap.to(r, {
      x: this.w + r.width,
      duration: dur,
      ease: 'none',
      onComplete: () => {
        r.stop();
        r.destroy();
      },
    });
    const next = this.theme === 'escape' ? 1.6 + Math.random() * 2.2 : 14 + Math.random() * 14;
    gsap.delayedCall(next, () => this.rideBy());
  }

  private addMote(initial = false) {
    const th = this.theme;
    const s = new Sprite(th === 'escape' ? T.dust() : th === 'laststand' ? T.ember() : T.dot());
    s.anchor.set(0.5);
    const m: Mote = { s, vx: 0, vy: 0, ph: Math.random() * 10 };
    if (th === 'laststand') {
      s.tint = Math.random() < 0.5 ? 0xff6a1a : 0xffb040;
      s.blendMode = 'add';
      s.scale.set(0.25 + Math.random() * 0.45);
      m.vx = (Math.random() - 0.5) * 30;
      m.vy = -50 - Math.random() * 90;
      s.position.set(Math.random() * this.w, initial ? Math.random() * this.h : this.h + 30);
    } else if (th === 'escape') {
      s.tint = 0xe8b080;
      s.scale.set(0.5 + Math.random() * 0.9);
      s.alpha = 0.16 + Math.random() * 0.2;
      m.vx = -500 - Math.random() * 600;
      m.vy = (Math.random() - 0.5) * 20;
      s.position.set(initial ? Math.random() * this.w : this.w + 300, this.h * (0.6 + Math.random() * 0.4));
    } else {
      s.tint = th === 'hideout' ? 0xffd890 : 0xffe0b0;
      s.blendMode = 'add';
      s.scale.set(0.3 + Math.random() * 0.6);
      s.alpha = 0.5;
      m.vx = 6 + Math.random() * 16;
      m.vy = (Math.random() - 0.5) * 8;
      s.position.set(initial ? Math.random() * this.w : -20, Math.random() * this.h);
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
    // blurred fill covers everything
    this.fill.scale.set(Math.max(w / BG_W, h / BG_H) * 1.08);
    this.fill.position.set(w / 2, h / 2);
    // sharp picture: cover width, but never shorter than 78% of the screen
    this.k = Math.max(w / BG_W, (h * 0.78) / BG_H);
    this.pic.scale.set(this.k);
    this.ox = w / 2;
    this.oy = h + 4;
    // feather the top edge of the sharp picture into the blurred fill (alpha-gradient sprite mask)
    this.featherMask.width = BG_W * this.k * 1.2;
    this.featherMask.height = BG_H * this.k + 4;
    this.featherMask.anchor.set(0.5, 1);
    this.flash.clear().rect(0, 0, w, h).fill(0xfff0ff);
    this.place();
  }

  setPointer(nx: number, ny: number) {
    this.px = nx;
    this.py = ny;
  }

  private bgToScreen(x: number, y: number) {
    return { x: this.pic.x + (x - BG_W / 2) * this.k, y: this.pic.y + (y - BG_H) * this.k };
  }

  private place() {
    const pan = this.theme === 'escape' ? Math.sin(this.t * 0.35) * 10 : Math.sin(this.t * 0.08) * 6;
    this.pic.position.set(this.ox - this.px * 14 + pan, this.oy - this.py * 6);
    this.featherMask.position.set(this.ox, this.oy + 2);
    this.fill.position.set(this.w / 2 - this.px * 6, this.h / 2);
    const sp = this.bgToScreen(SUN.x, SUN.y);
    this.sun.position.set(sp.x, sp.y);
    this.sun.scale.set(this.k * 4.2);
    LANTERNS.forEach((l, i) => {
      const p = this.bgToScreen(l.x, l.y);
      this.lanterns[i].position.set(p.x, p.y);
    });
  }

  tick(dt: number) {
    this.t += dt;
    this.place();
    this.sun.alpha = (this.theme === 'hideout' ? 0.12 : this.theme === 'laststand' ? 0.3 : 0.42) + Math.sin(this.t * 0.6) * 0.05;
    const strong = this.theme === 'hideout' ? 2.4 : 1;
    this.lanterns.forEach((g, i) => {
      g.scale.set(this.k * 0.75 * strong * (1 + Math.sin(this.t * 11 + i * 2) * 0.05));
      g.alpha = (0.35 + Math.random() * 0.12) * (this.theme === 'hideout' ? 1.4 : 1);
    });
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
      else if (this.theme !== 'escape') m.s.alpha = 0.3 + Math.sin(m.ph * 1.7) * 0.25;
      if (m.s.x < -400 || m.s.x > this.w + 400 || m.s.y < -60 || m.s.y > this.h + 60) {
        m.s.destroy();
        this.motes.splice(i, 1);
        this.addMote();
      }
    }
  }

  lightning() {
    gsap.timeline().to(this.flash, { alpha: 0.3, duration: 0.05 }).to(this.flash, { alpha: 0, duration: 0.12 }).to(this.flash, { alpha: 0.2, duration: 0.04 }).to(this.flash, { alpha: 0, duration: 0.5 });
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
