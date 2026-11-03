/**
 * Renders text with the client's painted western bitmap font (public/fonts/western.*)
 * into DOM elements (HUD balance / bet / win, buy prices, autoplay counter).
 * Each element gets a <canvas> sized to the element's CSS font-size.
 */
interface Glyph { x: number; y: number; w: number; h: number; xo: number; yo: number; adv: number }

let img: HTMLImageElement | null = null;
const glyphs = new Map<string, Glyph>();
let capH = 107;
let lineH = 140;

export async function loadWesternDom() {
  const fnt = await (await fetch('./fonts/western.fnt')).text();
  const re = /char id=(\d+) x=(\d+) y=(\d+) width=(\d+) height=(\d+) xoffset=(-?\d+) yoffset=(-?\d+) xadvance=(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fnt))) {
    glyphs.set(String.fromCodePoint(+m[1]), { x: +m[2], y: +m[3], w: +m[4], h: +m[5], xo: +m[6], yo: +m[7], adv: +m[8] });
  }
  const s = /info face="Western" size=(\d+)/.exec(fnt);
  if (s) capH = +s[1];
  const l = /lineHeight=(\d+)/.exec(fnt);
  if (l) lineH = +l[1];
  img = new Image();
  img.src = './fonts/western.png';
  await img.decode();
}

/** Draw `text` (upper-cased) into `el`, replacing its contents. Height follows the element's font-size. */
export function western(el: HTMLElement, text: string) {
  text = text.toUpperCase();
  if (!img || [...text].some((c) => !glyphs.has(c))) {
    el.textContent = text;
    return;
  }
  if (el.dataset.w === text && el.firstElementChild) return;
  el.dataset.w = text;
  let cv = el.querySelector('canvas');
  if (!cv) {
    el.textContent = '';
    cv = document.createElement('canvas');
    cv.style.display = 'block';
    cv.style.margin = '0 auto';
    el.appendChild(cv);
  }
  const cssH = parseFloat(getComputedStyle(el).fontSize) || 24;
  const k = cssH / capH;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 0;
  for (const c of text) w += glyphs.get(c)!.adv;
  const pad = 10;
  const top = Math.round(lineH * 0.18);
  const H = lineH;
  cv.width = Math.ceil((w + pad * 2) * k * dpr);
  cv.height = Math.ceil(H * k * dpr);
  cv.style.width = `${(w + pad * 2) * k}px`;
  cv.style.height = `${H * k}px`;
  const g = cv.getContext('2d')!;
  g.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  let x = pad;
  for (const c of text) {
    const gl = glyphs.get(c)!;
    if (gl.w) g.drawImage(img, gl.x, gl.y, gl.w, gl.h, x + gl.xo, top + gl.yo, gl.w, gl.h);
    x += gl.adv;
  }
}
