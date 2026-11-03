/**
 * Lightweight particle / VFX system (no external dependency).
 */
import { Container, Sprite, Ticker, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { dustTex, glowTex, softDot, sparkTex } from './gfx';
import { tex } from './assets';

interface P {
  s: Sprite;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  vr: number;
  fade: number;
  grow: number;
  drag: number;
  a0: number;
}

export class FX extends Container {
  private ps: P[] = [];
  constructor() {
    super();
    Ticker.shared.add(this.update, this);
  }

  spawn(t: Texture, x: number, y: number, o: Partial<{ vx: number; vy: number; g: number; life: number; scale: number; tint: number; add: boolean; vr: number; rot: number; alpha: number; grow: number; drag: number }>) {
    const s = new Sprite(t);
    s.anchor.set(0.5);
    s.position.set(x, y);
    s.scale.set(o.scale ?? 1);
    s.rotation = o.rot ?? 0;
    s.tint = o.tint ?? 0xffffff;
    s.alpha = o.alpha ?? 1;
    if (o.add) s.blendMode = 'add';
    this.addChild(s);
    this.ps.push({ s, vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0, life: 0, max: o.life ?? 1, vr: o.vr ?? 0, fade: 1, grow: o.grow ?? 0, drag: o.drag ?? 0, a0: s.alpha });
    return s;
  }

  private update(t: Ticker) {
    const dt = Math.min(0.05, t.deltaMS / 1000);
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.life += dt;
      p.vy += p.g * dt;
      p.vx *= 1 - p.drag * dt;
      p.vy *= 1 - p.drag * dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.rotation += p.vr * dt;
      if (p.grow) p.s.scale.set(p.s.scale.x + p.grow * dt);
      const k = p.life / p.max;
      p.s.alpha = p.a0 * (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
      if (p.life >= p.max) {
        gsap.killTweensOf(p.s);
        gsap.killTweensOf(p.s.scale);
        p.s.destroy();
        this.ps.splice(i, 1);
      }
    }
  }

  sparkBurst(x: number, y: number, n = 24, power = 420, tint = 0xffd060) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = power * (0.3 + Math.random() * 0.7);
      this.spawn(Math.random() < 0.5 ? sparkTex() : softDot(), x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 400, life: 0.6 + Math.random() * 0.6, scale: 0.15 + Math.random() * 0.35, tint, add: true, vr: (Math.random() - 0.5) * 10, drag: 2 });
    }
  }

  flash(x: number, y: number, scale = 3, tint = 0xffe6a0) {
    const s = this.spawn(glowTex(), x, y, { life: 0.5, scale: scale * 0.3, add: true, tint, grow: scale * 3 });
    return s;
  }

  dustBurst(x: number, y: number, n = 10, spread = 160) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn(dustTex(), x + Math.cos(a) * 20, y + Math.sin(a) * 10, { vx: Math.cos(a) * spread, vy: Math.sin(a) * spread * 0.4 - 20, life: 1.2 + Math.random(), scale: 0.8 + Math.random(), alpha: 0.8, grow: 0.8, drag: 1.5, rot: Math.random() * 6 });
    }
  }

  coinShower(w: number, _h: number, n = 60, dur = 2.5) {
    const coin = tex('coin_gold');
    let spawned = 0;
    const iv = setInterval(() => {
      for (let k = 0; k < 3 && spawned < n; k++, spawned++) {
        const s = this.spawn(coin, Math.random() * w, -60, { vx: (Math.random() - 0.5) * 200, vy: 200 + Math.random() * 300, g: 900, life: 2.2, scale: 0.22 + Math.random() * 0.18, vr: (Math.random() - 0.5) * 8 });
        gsap.to(s.scale, { x: -s.scale.x, duration: 0.25 + Math.random() * 0.2, repeat: 8, yoyo: true, ease: 'sine.inOut' });
      }
      if (spawned >= n) clearInterval(iv);
    }, (dur * 1000) / (n / 3));
  }

  /** Coins fountain from a point. */
  coinFountain(x: number, y: number, n = 20) {
    const coin = tex('coin_gold');
    for (let i = 0; i < n; i++) {
      const s = this.spawn(coin, x, y, { vx: (Math.random() - 0.5) * 700, vy: -500 - Math.random() * 600, g: 1500, life: 1.4, scale: 0.15 + Math.random() * 0.12, vr: (Math.random() - 0.5) * 10 });
      gsap.to(s.scale, { x: -s.scale.x, duration: 0.2, repeat: 6, yoyo: true });
    }
  }

  /** A travelling glowing orb from a → b. */
  beam(ax: number, ay: number, bx: number, by: number, tint = 0xffd060, dur = 0.5) {
    return new Promise<void>((res) => {
      const s = this.spawn(glowTex(), ax, ay, { life: dur + 0.2, scale: 0.35, add: true, tint });
      const trail = setInterval(() => this.spawn(softDot(), s.x, s.y, { life: 0.35, scale: 0.5, add: true, tint, alpha: 0.7 }), 16);
      gsap.to(s, {
        x: bx,
        y: by,
        duration: dur,
        ease: 'power2.in',
        onComplete: () => {
          clearInterval(trail);
          this.sparkBurst(bx, by, 14, 280, tint);
          res();
        },
      });
    });
  }

  clear() {
    for (const p of this.ps) {
      gsap.killTweensOf(p.s);
      gsap.killTweensOf(p.s.scale);
      p.s.destroy();
    }
    this.ps = [];
  }
}
