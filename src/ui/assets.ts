/**
 * Asset loading – all artwork is original, code-authored (tools/art) and packed
 * into texture atlases (public/gfx/*.json + .webp) plus a few large standalone
 * images (backgrounds, frames, logo, titles, win banners).
 */
import { Assets, Texture, type Spritesheet } from 'pixi.js';

const ATLASES = ['symbols', 'objects', 'chars', 'anim'];
export const STANDALONE = [
  'logo', 'card_escape', 'card_hideout2', 'card_last2', 'win_big', 'win_mega', 'win_epic', 'frame_painted',
  ...['base', 'escape', 'hideout', 'laststand'].flatMap((t) => [`bgv_${t}`, `bgv_${t}_fill`]),
];

const frames: Record<string, { x: number; y: number; w: number; h: number; sheet: string; sw: number; sh: number }> = {};

export async function loadAssets(onProgress: (p: number) => void) {
  const list = [
    ...ATLASES.map((n) => ({ alias: `atlas_${n}`, src: `./gfx/${n}.json` })),
    ...STANDALONE.map((n) => ({ alias: n, src: `./gfx/${n}.webp` })),
    { alias: 'font_western', src: './fonts/western.fnt' },
  ];
  Assets.addBundle('game', list);
  const loaded = await Assets.loadBundle('game', onProgress);
  for (const n of ATLASES) {
    const sheet = loaded[`atlas_${n}`] as Spritesheet;
    const meta = sheet.data.meta.size!;
    for (const [k, f] of Object.entries(sheet.data.frames)) {
      const fr = f.frame;
      frames[k] = { x: fr.x, y: fr.y, w: fr.w, h: fr.h, sheet: `./gfx/${n}.webp`, sw: meta.w, sh: meta.h };
    }
  }
}

export function tex(name: string): Texture {
  const t = Assets.cache.has(name) ? (Assets.get<Texture>(name) as Texture) : null;
  if (!t) {
    console.warn('missing texture', name);
    return Texture.WHITE;
  }
  return t;
}

/** CSS for showing an atlas frame in the DOM (paytable, buy cards) at a given box size. */
export function atlasCss(name: string, boxW: number, boxH: number): string {
  const f = frames[name];
  if (!f) return '';
  const k = Math.min(boxW / f.w, boxH / f.h);
  const w = f.w * k;
  const h = f.h * k;
  return `display:inline-block;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;background:url(${f.sheet}) no-repeat;background-size:${(f.sw * k).toFixed(1)}px ${(f.sh * k).toFixed(1)}px;background-position:${(-f.x * k).toFixed(1)}px ${(-f.y * k).toFixed(1)}px`;
}

/** Numbered frame sequence, e.g. seq('lamp_', 8) → [lamp_0 … lamp_7]. */
export function seq(prefix: string, n: number): Texture[] {
  return Array.from({ length: n }, (_, i) => tex(`${prefix}${i}`));
}
