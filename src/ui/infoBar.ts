/**
 * Feature info bar shown above the play area during bonuses
 * (free-spin counter, escape multiplier meter, picks, respins, totals).
 */
import { Container, Sprite, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { goldText, plainText, plateTex, glowTex } from './gfx';
import { tex } from './assets';

export class Plate extends Container {
  labelText: Text;
  value: Text;
  constructor(label: string, w: number, h = 96) {
    super();
    const bg = new Sprite(plateTex(w, h));
    bg.anchor.set(0.5);
    this.labelText = plainText(label, 18, '#f7c84a');
    this.labelText.y = -h / 2 + 26;
    this.value = goldText('', 36);
    this.value.y = 10;
    this.addChild(bg, this.labelText, this.value);
  }
  set(v: string, pop = false) {
    if (this.value.text === v) return;
    this.value.text = v;
    if (pop) gsap.fromTo(this.value.scale, { x: 1.5, y: 1.5 }, { x: 1, y: 1, duration: 0.45, ease: 'back.out(3)' });
  }
}

/** Escape multiplier meter: ×N with 10 pips. */
export class MultiplierMeter extends Container {
  pips: Graphics[] = [];
  value: Text;
  glow: Sprite;
  constructor(private cap = 10) {
    super();
    const bg = new Sprite(plateTex(440, 110));
    bg.anchor.set(0.5);
    this.glow = new Sprite(glowTex());
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.glow.alpha = 0;
    this.glow.scale.set(1.6, 0.8);
    const lbl = plainText('ESCAPE MULTIPLIER', 17, '#f7c84a');
    lbl.position.set(0, -32);
    this.value = goldText('×1', 44);
    this.value.position.set(-150, 12);
    this.addChild(this.glow, bg, lbl, this.value);
    for (let i = 0; i < cap; i++) {
      const p = new Graphics();
      p.position.set(-80 + i * 27, 14);
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
      p.circle(0, 0, 10).fill({ color: on ? 0xffc83a : 0x2a1408 }).stroke({ width: 2, color: on ? 0xfff1b0 : 0x7a4a0c });
    });
    if (animate) {
      gsap.fromTo(this.value.scale, { x: 1.8, y: 1.8 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(3)' });
      gsap.fromTo(this.glow, { alpha: 0.9 }, { alpha: 0, duration: 0.9 });
      const p = this.pips[Math.min(this.cap, m) - 1];
      if (p) gsap.fromTo(p.scale, { x: 2, y: 2 }, { x: 1, y: 1, duration: 0.4, ease: 'back.out(3)' });
    }
  }
}

/** Couple's Fortune tracker: two portraits that light up when collected. */
export class CoupleTracker extends Container {
  lamp: Sprite;
  maria: Sprite;
  heart: Sprite;
  constructor() {
    super();
    const bg = new Sprite(plateTex(300, 110));
    bg.anchor.set(0.5);
    this.addChild(bg);
    const lbl = plainText("COUPLE'S FORTUNE", 15, '#f7c84a');
    lbl.y = -36;
    this.addChild(lbl);
    const mk = (name: string, x: number) => {
      const s = new Sprite(tex(name));
      s.anchor.set(0.5);
      s.scale.set(62 / s.texture.height);
      s.position.set(x, 12);
      s.tint = 0x3a3030;
      this.addChild(s);
      return s;
    };
    this.lamp = mk('chest_gems', -80);
    this.maria = mk('medallion', 80);
    this.heart = mk('gem_heart', 0);
    this.heart.scale.set(44 / this.heart.texture.height);
  }
  set(t: boolean, m: boolean, both: boolean) {
    const light = (s: Sprite, on: boolean) => {
      if (on && s.tint !== 0xffffff) {
        s.tint = 0xffffff;
        gsap.fromTo(s.scale, { x: s.scale.x * 1.6, y: s.scale.y * 1.6 }, { x: s.scale.x, y: s.scale.y, duration: 0.5, ease: 'back.out(3)' });
      } else if (!on) s.tint = 0x3a3030;
    };
    light(this.lamp, t);
    light(this.maria, m);
    light(this.heart, both);
  }
}

export class InfoBar extends Container {
  clearAll() {
    this.removeChildren().forEach((c) => c.destroy({ children: true }));
  }
}
