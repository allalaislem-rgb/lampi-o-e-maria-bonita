/**
 * Feature info bar (above the play area): counters, escape multiplier meter,
 * Couple's Fortune tracker – carved wood & gold plates.
 */
import { Container, Sprite, Graphics, Text, NineSliceSprite } from 'pixi.js';
import gsap from 'gsap';
import { goldText, plainText, T, destroyDeep, type GText } from './gfx';
import { tex } from './assets';

/** Painted wood & gold panel (from the art sheet), nine-sliced so corners stay crisp at any size. */
function plateSprite(_name: string, w: number, h: number) {
  const t = tex('panel_ribbon');
  const s = new NineSliceSprite({ texture: t, leftWidth: 70, rightWidth: 70, topHeight: 52, bottomHeight: 70, width: w * 1.04, height: h * 1.12 });
  s.pivot.set((w * 1.04) / 2, (h * 1.12) / 2 - 4);
  return s;
}

export class Plate extends Container {
  labelText: Text;
  value: GText;
  glow: Sprite;
  constructor(label: string, w: number, h = 104) {
    super();
    const bg = plateSprite(w > 260 ? 'plate_wide' : 'plate_mid', w, h);
    this.glow = new Sprite(T.glow());
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.alpha = 0;
    this.glow.scale.set(w / 70, h / 90);
    this.glow.tint = 0xffc040;
    this.labelText = plainText(label, 17, '#f7c84a');
    this.labelText.y = -h / 2 + 30;
    this.value = goldText('', 38);
    this.value.y = 10;
    this.addChild(this.glow, bg, this.labelText, this.value);
  }
  set(v: string, pop = false) {
    if (this.value.text === v) return;
    this.value.text = v;
    if (pop) {
      gsap.fromTo(this.value.scale, { x: 1.55, y: 1.55 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(3)' });
      gsap.fromTo(this.glow, { alpha: 0.8 }, { alpha: 0, duration: 0.8 });
    }
  }
}

/** Escape multiplier meter: ×N with 10 gold studs. */
export class MultiplierMeter extends Container {
  pips: Graphics[] = [];
  value: GText;
  glow: Sprite;
  constructor(private cap = 10) {
    super();
    const bg = plateSprite('plate_meter', 460, 120);
    this.glow = new Sprite(T.glow());
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.alpha = 0;
    this.glow.scale.set(6, 1.8);
    this.glow.tint = 0xffa030;
    const lbl = plainText('ESCAPE MULTIPLIER', 17, '#f7c84a');
    lbl.position.set(30, -30);
    this.value = goldText('×1', 52);
    this.value.position.set(-160, 4);
    this.addChild(this.glow, bg, lbl, this.value);
    for (let i = 0; i < cap; i++) {
      const p = new Graphics();
      p.position.set(-80 + i * 27, 16);
      this.pips.push(p);
      this.addChild(p);
    }
    this.set(1, false);
  }
  set(m: number, animate = true) {
    this.value.text = `×${m}`;
    this.pips.forEach((p, i) => {
      p.clear();
      const on = i < m;
      if (on) p.circle(0, 0, 11).fill({ color: 0xffa020, alpha: 0.35 });
      p.circle(0, 0, 8.5).fill({ color: on ? 0xffd04a : 0x241008 }).stroke({ width: 2, color: on ? 0xfff1b0 : 0x7a4a0c });
      if (on) p.circle(-2.5, -2.5, 2.5).fill({ color: 0xffffff, alpha: 0.8 });
    });
    if (animate) {
      gsap.fromTo(this.value.scale, { x: 1.9, y: 1.9 }, { x: 1, y: 1, duration: 0.55, ease: 'back.out(3)' });
      gsap.fromTo(this.glow, { alpha: 1 }, { alpha: 0, duration: 1 });
      const p = this.pips[Math.min(this.cap, m) - 1];
      if (p) gsap.fromTo(p.scale, { x: 2.4, y: 2.4 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(3)' });
    }
  }
}

/** Couple's Fortune tracker: treasure + heart + medallion light up when collected. */
export class CoupleTracker extends Container {
  lamp: Sprite;
  maria: Sprite;
  heart: Sprite;
  private lit = { t: false, m: false, h: false };
  constructor() {
    super();
    this.addChild(plateSprite('plate_wide', 300, 110));
    const lbl = plainText("COUPLE'S FORTUNE", 15, '#f7c84a');
    lbl.y = -32;
    this.addChild(lbl);
    const mk = (name: string, x: number, h: number) => {
      const s = new Sprite(tex(name));
      s.anchor.set(0.5);
      s.scale.set(h / s.texture.height);
      s.position.set(x, 12);
      s.tint = 0x3a3030;
      s.alpha = 0.8;
      this.addChild(s);
      return s;
    };
    this.lamp = mk('lamp_0', -84, 70);
    this.heart = mk('heart_gem', 0, 44);
    this.maria = mk('maria_0', 84, 70);
  }
  set(t: boolean, m: boolean, both: boolean) {
    const light = (s: Sprite, on: boolean, key: 't' | 'm' | 'h') => {
      if (on && !this.lit[key]) {
        this.lit[key] = true;
        s.tint = 0xffffff;
        s.alpha = 1;
        const k = s.scale.x;
        gsap.fromTo(s.scale, { x: k * 1.8, y: k * 1.8 }, { x: k, y: k, duration: 0.55, ease: 'back.out(3)' });
      } else if (!on) {
        this.lit[key] = false;
        s.tint = 0x3a3030;
        s.alpha = 0.8;
      }
    };
    light(this.lamp, t, 't');
    light(this.maria, m, 'm');
    light(this.heart, both, 'h');
  }
}

export class InfoBar extends Container {
  clearAll() {
    this.removeChildren().forEach((c) => destroyDeep(c));
  }
}
