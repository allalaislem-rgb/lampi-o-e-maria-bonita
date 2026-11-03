/**
 * Shared texture accessors and text styles.
 */
import { FillGradient, Text, TextStyle, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { tex } from './assets';

export const T = {
  glow: (): Texture => tex('fx_glow'),
  dot: (): Texture => tex('fx_dot'),
  spark: (): Texture => tex('fx_spark'),
  ring: (): Texture => tex('fx_ring'),
  streak: (): Texture => tex('fx_streak'),
  rays: (): Texture => tex('fx_rays'),
  dust: (): Texture => tex(Math.random() < 0.5 ? 'fx_dust1' : 'fx_dust2'),
  smoke: (): Texture => tex('fx_smoke'),
  ember: (): Texture => tex('fx_ember'),
  flare: (): Texture => tex('fx_flare'),
  shine: (): Texture => tex('fx_shine'),
  coin: (): Texture => tex('coin'),
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

export function goldText(text: string, size: number, font = FONT_NUM, strokeW = Math.max(3, size / 8)): Text {
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
