/**
 * Shared texture accessors and text styles.
 */
import { BitmapText, Container, FillGradient, Sprite, Text, TextStyle, Ticker, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { tex, seq } from './assets';

export const T = {
  glow: (): Texture => tex('fx_glow'),
  dot: (): Texture => tex('fx_dot'),
  spark: (): Texture => tex('fx_spark'),
  ring: (): Texture => tex('fx_ring'),
  streak: (): Texture => tex('fx_streak'),
  rays: (): Texture => tex('fx_rays'),
  dust: (): Texture => tex(`smoke_${Math.floor(Math.random() * 4)}`),
  flare: (): Texture => tex(`flare_${Math.floor(Math.random() * 5)}`),
  coinSpin: (): Texture[] => seq('coinb_', 15),
  sparkB: (): Texture => tex(`sparkb_${Math.floor(Math.random() * 8)}`),
  flower: (): Texture => tex(`flower_${Math.floor(Math.random() * 3)}`),
  smoke: (): Texture => tex('fx_smoke'),
  ember: (): Texture => tex('fx_ember'),
  lensFlare: (): Texture => tex('fx_flare'),
  shine: (): Texture => tex('fx_shine'),
  coin: (): Texture => tex('coinb_14'),
};

export const FONT_TITLE = 'Rye, Georgia, serif';
export const FONT_NUM = '"Alfa Slab One", Georgia, serif';
export const FONT_UI = '"Roboto Condensed", Arial, sans-serif';

function goldFill() {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: '#fffbe6' },
      { offset: 0.32, color: '#ffe07a' },
      { offset: 0.58, color: '#f5a524' },
      { offset: 0.8, color: '#c4700e' },
      { offset: 1, color: '#ffe48a' },
    ],
    textureSpace: 'local',
  });
}

/** Characters available in the client's western bitmap font (public/fonts/western.fnt). */
const WESTERN = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$,.+%-!?×ÃÕÁÉÍÓÚÂÊÔÀÇ '.split(''));
export const WESTERN_FONT = 'Western';
const fits = (t: string) => [...t.toUpperCase()].every((c) => WESTERN.has(c));

/** Bitmap text in the client's painted western font that upper-cases whatever it is given. */
export class WesternText extends BitmapText {
  constructor(text: string, size: number) {
    super({ text: text.toUpperCase(), style: { fontFamily: WESTERN_FONT, fontSize: size }, anchor: 0.5 });
  }
  override set text(v: string) {
    super.text = String(v).toUpperCase();
  }
  override get text(): string {
    return super.text;
  }
}

export type GText = Text | BitmapText;

/**
 * Big numbers / titles. Uses the client's painted western bitmap font whenever every
 * character exists in it; falls back to a gold gradient Rye/Alfa text otherwise
 * (e.g. apostrophes, lowercase).
 */
export function goldText(text: string, size: number, font = FONT_NUM, strokeW = Math.max(3, size / 8)): GText {
  if (fits(text)) return new WesternText(text, size * 1.05);
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: font,
      fontSize: size,
      fill: goldFill(),
      stroke: { color: '#2a1206', width: strokeW, join: 'round' },
      dropShadow: { color: '#000000', alpha: 0.7, blur: Math.max(3, size / 12), distance: Math.max(2, size / 14), angle: Math.PI / 2 },
      align: 'center',
      letterSpacing: 1,
      padding: 8,
    }),
    anchor: 0.5,
    resolution: 2,
  });
}

export function plainText(text: string, size: number, color = '#fbe9c6', font = FONT_TITLE): Text {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: font,
      fontSize: size,
      fill: color,
      stroke: { color: '#1a0a02', width: Math.max(2, size / 7), join: 'round' },
      dropShadow: { color: '#000000', alpha: 0.6, blur: 3, distance: 2, angle: Math.PI / 2 },
      align: 'center',
      letterSpacing: 1.5,
      padding: 6,
    }),
    anchor: 0.5,
    resolution: 2,
  });
}

/** Destroy a display tree after killing every GSAP tween that targets it (prevents writes to destroyed objects). */
export function destroyDeep(c: import('pixi.js').Container) {
  const walk = (o: import('pixi.js').Container) => {
    gsap.killTweensOf(o);
    gsap.killTweensOf(o.scale);
    gsap.killTweensOf(o.position);
    for (const ch of o.children) walk(ch as import('pixi.js').Container);
  };
  walk(c);
  c.destroy({ children: true });
}

/**
 * Smooth flipbook: cross-fades between neighbouring frames every display frame, so a 24-frame
 * painted sequence plays without visible pose jumps at 60 FPS. `fps` is source frames per second.
 */
export class FrameBlend extends Container {
  a: Sprite;
  b: Sprite;
  pos = 0;
  playing = false;
  onFrame: (f: number) => void = () => {};
  onDone: () => void = () => {};
  private lastFrame = -1;
  constructor(public frames: Texture[], public fps = 16, anchorX = 0.5, anchorY = 0.5) {
    super();
    this.a = new Sprite(frames[0]);
    this.b = new Sprite(frames[Math.min(1, frames.length - 1)]);
    this.a.anchor.set(anchorX, anchorY);
    this.b.anchor.set(anchorX, anchorY);
    this.b.alpha = 0;
    this.addChild(this.a, this.b);
    Ticker.shared.add(this.tick, this);
  }
  get frameHeight() {
    return this.frames[0].height;
  }
  play() {
    this.playing = true;
  }
  private tick(t: Ticker) {
    if (!this.playing) return;
    const last = this.frames.length - 1;
    this.pos = Math.min(last, this.pos + (t.deltaMS / 1000) * this.fps);
    const i = Math.floor(this.pos);
    const f = this.pos - i;
    this.a.texture = this.frames[i];
    this.b.texture = this.frames[Math.min(last, i + 1)];
    // ease the blend so each pose holds a moment before dissolving into the next
    this.b.alpha = f * f * (3 - 2 * f);
    if (i !== this.lastFrame) {
      this.lastFrame = i;
      this.onFrame(i);
    }
    if (this.pos >= last) {
      this.playing = false;
      this.onDone();
    }
  }
  override destroy(opts?: Parameters<Container['destroy']>[0]) {
    Ticker.shared.remove(this.tick, this);
    super.destroy(opts);
  }
}
