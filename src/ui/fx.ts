/**
 * Pooled particle / VFX system. Sprites are recycled (no per-frame allocation),
 * so long celebrations stay at 60 FPS and don't leak memory.
 */
import { Container, Sprite, Ticker, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { T } from './gfx';

interface P {
  s: Sprite;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  vr: number;
  grow: number;
  drag: number;
  a0: number;
  fadeIn: number;
  flip: number; // coin flip speed (scale.x oscillation)
  sx: number;
  sy: number;
}

export interface SpawnOpts {
  vx: number; vy: number; g: number; life: number; scale: number; tint: number; add: boolean;
  vr: number; rot: number; alpha: number; grow: number; drag: number; fadeIn: number; flip: number; sy: number;
}

export class FX extends Container {
  private ps: P[] = [];
  private pool: Sprite[] = [];
  maxParticles = 900;

  constructor() {
    super();
    Ticker.shared.add(this.update, this);
  }

  spawn(t: Texture, x: number, y: number, o: Partial<SpawnOpts> = {}) {
    if (this.ps.length >= this.maxParticles) return null;
    const s = this.pool.pop() ?? new Sprite();
    s.texture = t;
    s.anchor.set(0.5);
    s.position.set(x, y);
    const sc = o.scale ?? 1;
    s.scale.set(sc, sc * (o.sy ?? 1));
    s.rotation = o.rot ?? 0;
    s.tint = o.tint ?? 0xffffff;
    s.alpha = o.alpha ?? 1;
    s.blendMode = o.add ? 'add' : 'normal';
    s.visible = true;
    this.addChild(s);
    this.ps.push({ s, vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0, life: 0, max: o.life ?? 1, vr: o.vr ?? 0, grow: o.grow ?? 0, drag: o.drag ?? 0, a0: s.alpha, fadeIn: o.fadeIn ?? 0, flip: o.flip ?? 0, sx: sc, sy: sc * (o.sy ?? 1) });
    return s;
  }

  private update(t: Ticker) {
    const dt = Math.min(0.05, t.deltaMS / 1000);
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.life += dt;
      p.vy += p.g * dt;
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.rotation += p.vr * dt;
      if (p.grow) {
        p.sx += p.grow * dt;
        p.sy += p.grow * dt;
      }
      p.s.scale.set(p.flip ? p.sx * Math.cos(p.life * p.flip) : p.sx, p.sy);
      const k = p.life / p.max;
      const fin = p.fadeIn ? Math.min(1, p.life / p.fadeIn) : 1;
      p.s.alpha = p.a0 * fin * (k < 0.65 ? 1 : Math.max(0, 1 - (k - 0.65) / 0.35));
      if (p.life >= p.max) {
        this.removeChild(p.s);
        this.pool.push(p.s);
        this.ps.splice(i, 1);
      }
    }
  }

  get count() {
    return this.ps.length;
  }

  // ----------------------------------------------------------- emitters
  sparkBurst(x: number, y: number, n = 24, power = 420, tint = 0xffd060) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = power * (0.3 + Math.random() * 0.7);
      const spark = Math.random() < 0.45;
      this.spawn(spark ? T.spark() : T.dot(), x, y, {
        vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 520, life: 0.5 + Math.random() * 0.7,
        scale: spark ? 0.12 + Math.random() * 0.22 : 0.4 + Math.random() * 0.6, tint, add: true, vr: (Math.random() - 0.5) * 8, drag: 2.2,
      });
    }
  }

  flash(x: number, y: number, scale = 3, tint = 0xffe6a0, life = 0.45) {
    return this.spawn(T.glow(), x, y, { life, scale: scale * 0.6, add: true, tint, grow: scale * 4 });
  }

  ring(x: number, y: number, scale = 1.5, tint = 0xffe0a0, life = 0.55) {
    return this.spawn(T.ring(), x, y, { life, scale: scale * 0.2, add: true, tint, grow: scale * 3.2, alpha: 0.9 });
  }

  dustBurst(x: number, y: number, n = 10, spread = 160, tint = 0xd8b088) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(T.dust(), x + Math.cos(a) * 20, y + Math.sin(a) * 10, {
        vx: Math.cos(a) * spread, vy: Math.sin(a) * spread * 0.35 - 20, life: 1.1 + Math.random() * 0.8,
        scale: 0.5 + Math.random() * 0.5, alpha: 0.75, grow: 0.5, drag: 1.6, rot: Math.random() * 6, vr: Math.random() - 0.5, tint,
      });
    }
  }

  coinShower(w: number, h: number, n = 60, dur = 2.5) {
    let spawned = 0;
    const tick = () => {
      for (let k = 0; k < 3 && spawned < n; k++, spawned++) {
        this.spawn(T.coin(), Math.random() * w, -60, {
          vx: (Math.random() - 0.5) * 220, vy: 120 + Math.random() * 320, g: 900, life: (h + 120) / 700 + 0.6,
          scale: 0.18 + Math.random() * 0.16, vr: (Math.random() - 0.5) * 4, flip: 6 + Math.random() * 8,
        });
      }
      if (spawned < n) gsap.delayedCall(dur / (n / 3), tick);
    };
    tick();
  }

  coinFountain(x: number, y: number, n = 20, power = 1) {
    for (let i = 0; i < n; i++) {
      this.spawn(T.coin(), x, y, {
        vx: (Math.random() - 0.5) * 700 * power, vy: (-520 - Math.random() * 620) * power, g: 1500, life: 1.5,
        scale: 0.12 + Math.random() * 0.1, vr: (Math.random() - 0.5) * 8, flip: 8 + Math.random() * 8,
      });
    }
  }

  embers(x: number, y: number, w: number, n = 20, tint = 0xff7a20) {
    for (let i = 0; i < n; i++) {
      this.spawn(T.ember(), x + Math.random() * w, y, {
        vx: (Math.random() - 0.5) * 60, vy: -120 - Math.random() * 220, life: 1.2 + Math.random(), scale: 0.4 + Math.random() * 0.6,
        add: true, tint, drag: 0.4, fadeIn: 0.15,
      });
    }
  }

  /** A travelling glowing orb from a → b with a sparkle trail. */
  beam(ax: number, ay: number, bx: number, by: number, tint = 0xffd060, dur = 0.45) {
    return new Promise<void>((res) => {
      const head = this.spawn(T.glow(), ax, ay, { life: dur + 0.25, scale: 0.55, add: true, tint });
      const proxy = { x: ax, y: ay };
      gsap.to(proxy, {
        x: bx,
        y: by,
        duration: dur,
        ease: 'power2.in',
        onUpdate: () => {
          if (head) head.position.set(proxy.x, proxy.y);
          this.spawn(T.dot(), proxy.x, proxy.y, { life: 0.35, scale: 1.4, add: true, tint, alpha: 0.8 });
        },
        onComplete: () => {
          this.sparkBurst(bx, by, 14, 280, tint);
          this.ring(bx, by, 1, tint);
          res();
        },
      });
    });
  }

  clear() {
    for (const p of this.ps) {
      this.removeChild(p.s);
      this.pool.push(p.s);
    }
    this.ps = [];
  }
}
