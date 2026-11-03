/**
 * Logo, feature title signs, Bonus Buy card art, win banners (raster),
 * and vector HUD buttons/icons (written as .svg files to public/ui/).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAL, lin, rad, fBevel, fGrain, fShadow, fGlow, svg, starPts, hexagram, GOLD_STOPS } from './lib.mjs';
import { hat } from './characters.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const O = (w = 2) => `stroke="${PAL.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

const goldTextDefs = (p) => `${lin(p + 'tg', [[0, '#fffbe6'], [0.3, '#ffe07a'], [0.55, '#f5a524'], [0.75, '#c4700e'], [1, '#ffe48a']], 0, 0, 0, 1)}
  ${fBevel(p + 'tb', { blur: 1.4, surface: 2.2, spec: 1.1, exp: 22 })}
  ${fShadow(p + 'ts', { dy: 6, blur: 5, op: 0.75 })}`;

/** Layered gold title text: thick dark outline + gold bevel fill. */
function goldText(p, x, y, size, txt, { font = 'Rye', ls = 2, sw = null } = {}) {
  const s = sw ?? size * 0.12;
  return `<g filter="url(#${p}ts)">
    <text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-size="${size}" letter-spacing="${ls}" fill="${PAL.ink}" stroke="${PAL.ink}" stroke-width="${s * 2}" stroke-linejoin="round">${txt}</text>
    <text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-size="${size}" letter-spacing="${ls}" fill="#7a3a08" stroke="#7a3a08" stroke-width="${s}" stroke-linejoin="round" transform="translate(0 ${size * 0.04})">${txt}</text>
    <text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-size="${size}" letter-spacing="${ls}" fill="url(#${p}tg)" filter="url(#${p}tb)">${txt}</text>
  </g>`;
}

function logo() {
  const p = 'LG';
  const h = hat(p, { cx: 500, top: 40, w: 236, h: 92 });
  const rifle = (flip) => `<g transform="${flip ? 'translate(1000 0) scale(-1 1)' : ''} rotate(-16 500 210)">
     <rect x="140" y="200" width="420" height="12" rx="4" fill="url(#${p}metal)" ${O(2.5)}/>
     <path d="M520 196 h90 c40 0 70 14 86 40 l-12 26 c-30 -20 -70 -28 -164 -30 z" fill="url(#${p}stock)" ${O(2.5)}/></g>`;
  return svg(1000, 440, `${goldTextDefs(p)}${h.defs}
    ${rad(p + 'goldR', [[0, '#fffbe6'], [0.35, PAL.gold1], [0.7, PAL.gold2], [1, PAL.gold3]], 0.35, 0.3, 0.75)}
    ${fBevel(p + 'bevelSoft', { blur: 2.6, surface: 2, spec: 0.55, exp: 14, amount: 0.7 })}
    ${lin(p + 'metal', [[0, '#e6e8ea'], [0.5, '#6d7276'], [1, '#2e3134']], 0, 0, 0, 1)}
    ${lin(p + 'stock', [[0, '#c27a3c'], [1, '#4a2108']], 0, 0, 0, 1)}
    ${lin(p + 'rib', [[0, '#e8402a'], [0.5, '#a3160c'], [1, '#5a0805']], 0, 0, 0, 1)}
    ${lin(p + 'ribT', [[0, '#fff3c8'], [1, '#f2c45a']], 0, 0, 0, 1)}
    ${rad(p + 'halo', [[0, '#ffd27a', 0.5], [0.55, '#ff8a3a', 0.16], [1, '#ff8a3a', 0]], 0.5, 0.5, 0.5)}
    ${fShadow(p + 'sh', { dy: 6, blur: 6, op: 0.6 })}`,
    `<ellipse cx="500" cy="230" rx="500" ry="210" fill="url(#${p}halo)"/>
     <g filter="url(#${p}sh)">${rifle(false)}${rifle(true)}</g>
     <g transform="translate(0 -2)">${h.body}</g>
     ${goldText(p, 500, 222, 112, 'LAMPIÃO')}
     ${goldText(p, 500, 270, 44, '&amp;', { font: 'Alfa Slab One' })}
     ${goldText(p, 500, 344, 86, 'MARIA BONITA')}
     <g filter="url(#${p}sh)" transform="translate(0 6)">
       <path d="M150 372 L 210 360 L 200 392 L 210 424 L 150 410 L 166 392 Z" fill="#5a0805" ${O(2)}/>
       <path d="M850 372 L 790 360 L 800 392 L 790 424 L 850 410 L 834 392 Z" fill="#5a0805" ${O(2)}/>
       <path d="M200 362 C 400 346, 600 346, 800 362 L 800 418 C 600 402, 400 402, 200 418 Z" fill="url(#${p}rib)" ${O(2.5)}/>
       <path d="M206 368 C 400 352, 600 352, 794 368" stroke="#ff9a7a" stroke-width="2" fill="none" opacity=".6"/>
       <text x="500" y="400" text-anchor="middle" font-family="Rye" font-size="28" letter-spacing="3" fill="url(#${p}ribT)" stroke="#3a0402" stroke-width="3" paint-order="stroke">THE LEGEND OF THE SERTÃO</text>
     </g>`);
}

/** Feature title sign. kind: escape | hideout | last */
function title(kind) {
  const p = 'TT' + kind;
  const cfg = {
    escape: { lines: ['THE GREAT', 'ESCAPE'], bg: [[0, '#ffd27a'], [0.35, '#f0702a'], [0.75, '#a8201a'], [1, '#3a0a10']], wood: ['#8a5228', '#4a2410'] },
    hideout: { lines: ['THE', 'HIDEOUT'], bg: [[0, '#ffcf6a'], [0.3, '#a8601e'], [0.7, '#3a1a08'], [1, '#140802']], wood: ['#5a3418', '#24100a'] },
    last: { lines: ['THE LAST', 'STAND'], bg: [[0, '#ff9a5a'], [0.3, '#c0301a'], [0.7, '#4a0a14'], [1, '#12040a']], wood: ['#4a4644', '#1a1816'] },
  }[kind];
  let art = '';
  if (kind === 'escape') {
    art = `<circle cx="350" cy="220" r="70" fill="#fff0b8" opacity=".9"/>
      <path d="M40 230 L 660 230 L 660 300 L 40 300 Z" fill="#3a0a06"/>
      ${[120, 230, 470, 580].map((x, i) => `<g transform="translate(${x} ${200 + (i % 2) * 6}) scale(${0.32 + (i % 2) * 0.05})" fill="#1a0604"><path d="M30 120 C 40 96, 80 92, 110 96 C 140 98, 168 94, 190 80 L 206 62 C 214 56, 224 58, 226 66 L 236 82 C 238 90, 230 92, 224 88 L 214 84 C 206 100, 200 118, 192 126 L 204 160 L 214 186 L 204 190 L 190 160 L 180 134 C 160 140, 130 140, 110 136 L 96 160 L 84 190 L 74 186 L 82 158 L 80 136 C 66 134, 54 130, 46 124 L 22 150 L 14 146 Z"/><path d="M124 96 L 118 60 C 116 50, 126 44, 134 46 L 146 50 L 144 96 Z"/><path d="M112 50 C 112 30, 160 30, 160 50 Z"/><circle cx="136" cy="40" r="10"/></g>`).join('')}`;
  } else if (kind === 'hideout') {
    art = `<ellipse cx="350" cy="230" rx="200" ry="70" fill="#ffcf6a" opacity=".35"/>
      <g transform="translate(290 168) scale(.6)"><path d="M30 96 L170 96 L166 166 L34 166 Z" fill="#6e3c1a" ${O(3)}/><path d="M30 96 L36 44 C 40 18, 160 18, 164 44 L170 96 Z" fill="#3a1d0a" ${O(3)}/><ellipse cx="100" cy="90" rx="66" ry="20" fill="#ffd36b"/><rect x="88" y="104" width="24" height="26" rx="4" fill="url(#${p}tg)" ${O(2)}/></g>`;
  } else {
    art = `<path d="M40 300 L 40 120 C 120 140, 160 200, 200 300 Z M660 300 L 660 110 C 580 130, 540 200, 500 300 Z" fill="#1a0406"/>
      <g transform="translate(350 220)"><circle r="56" fill="url(#${p}tg)" ${O(3)}/><path d="${hexagram(0, 0, 40)}" fill="#5a0805" ${O(2)}/><circle r="10" fill="#ff3a1a"/></g>`;
  }
  return svg(700, 330, `${goldTextDefs(p)}
    ${lin(p + 'wood', [[0, cfg.wood[0]], [1, cfg.wood[1]]], 0, 0, 0, 1)}
    ${rad(p + 'sky', cfg.bg, 0.5, 0.75, 0.75)}
    ${lin(p + 'trim', GOLD_STOPS, 0, 0, 0.15, 1)}
    ${fBevel(p + 'bev', { blur: 2.2, surface: 3 })}
    ${fGrain(p + 'g', { freq: '0.005 0.12', oct: 3, amt: 0.35, seed: 81 })}
    ${fShadow(p + 'sh', { dy: 10, blur: 10, op: 0.7 })}
    <clipPath id="${p}c"><path d="M40 40 L 660 40 L 660 300 L 40 300 Z"/></clipPath>`,
    `<g filter="url(#${p}sh)"><path d="M20 30 C 20 14, 34 8, 50 8 L 650 8 C 666 8, 680 14, 680 30 L 680 300 C 680 316, 666 322, 650 322 L 50 322 C 34 322, 20 316, 20 300 Z" fill="url(#${p}wood)" ${O(3)}/></g>
     <path d="M20 30 C 20 14, 34 8, 50 8 L 650 8 C 666 8, 680 14, 680 30 L 680 300 C 680 316, 666 322, 650 322 L 50 322 C 34 322, 20 316, 20 300 Z" fill="url(#${p}wood)" filter="url(#${p}g)"/>
     <g clip-path="url(#${p}c)"><rect x="40" y="40" width="620" height="260" fill="url(#${p}sky)"/>${art}<rect x="40" y="40" width="620" height="260" fill="url(#${p}sky)" opacity=".0"/></g>
     <rect x="40" y="40" width="620" height="260" fill="none" stroke="url(#${p}trim)" stroke-width="8" filter="url(#${p}bev)"/>
     ${[[34, 24], [666, 24], [34, 306], [666, 306]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="url(#${p}trim)" ${O(1.5)}/>`).join('')}
     ${cfg.lines.length === 2 && cfg.lines[0].length <= 3
       ? goldText(p, 350, 108, 52, cfg.lines[0]) + goldText(p, 350, 196, 104, cfg.lines[1])
       : goldText(p, 350, 120, 78, cfg.lines[0]) + goldText(p, 350, 210, 96, cfg.lines[1])}`);
}

function winBanner(kind) {
  const p = 'WB' + kind;
  const c = { big: ['#ffd36b', '#c4700e', 'BIG WIN'], mega: ['#ff7a4a', '#a3160c', 'MEGA WIN'], epic: ['#ff5ac8', '#5a1a9a', 'EPIC WIN'] }[kind];
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI - Math.PI;
    return `<path d="M450 200 L ${450 + Math.cos(a - 0.08) * 460} ${200 + Math.sin(a - 0.08) * 300} L ${450 + Math.cos(a + 0.08) * 460} ${200 + Math.sin(a + 0.08) * 300} Z" fill="${c[0]}" opacity=".35"/>`;
  }).join('');
  return svg(900, 320, `${goldTextDefs(p)}${lin(p + 'r', [[0, c[0]], [1, c[1]]], 0, 0, 0, 1)}${lin(p + 'tr', GOLD_STOPS, 0, 0, 0, 1)}${fShadow(p + 'sh', { dy: 8, blur: 8, op: 0.7 })}${fBevel(p + 'bev', { blur: 2, surface: 3 })}`,
    `${rays}
     <g filter="url(#${p}sh)"><path d="M60 140 L 840 140 L 880 210 L 840 280 L 60 280 L 20 210 Z" fill="url(#${p}r)" ${O(3)}/></g>
     <path d="M60 140 L 840 140 L 880 210 L 840 280 L 60 280 L 20 210 Z" fill="none" stroke="url(#${p}tr)" stroke-width="8" filter="url(#${p}bev)"/>
     ${[-1, 1].map((s) => `<polygon points="${starPts(450 + s * 330, 90, 5, 34, 14)}" fill="url(#${p}tr)" ${O(2)}/>`).join('')}
     ${goldText(p, 450, 252, 120, c[2])}`);
}

function buyCard(kind) {
  const p = 'BC' + kind;
  const t = title(kind);
  return t.replace('width="700" height="330"', 'width="700" height="330"');
}

// ------------------------------------------------------------------ DOM vector UI (written to public/ui)
function writeUiSvgs() {
  const dir = path.join(ROOT, 'public/ui');
  fs.mkdirSync(dir, { recursive: true });
  const ring = (id) => `${lin(id + 'g', [[0, '#fff3c0'], [0.25, '#ffd36b'], [0.55, '#b0640e'], [0.8, '#f2b84a'], [1, '#6a3a06']], 0, 0, 0.2, 1)}
    ${rad(id + 'l', [[0, '#7a4524'], [0.7, '#3a1a08'], [1, '#1a0a02']], 0.4, 0.3, 0.75)}`;
  const base = (inner, size = 100) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><defs>${ring('r')}
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".6"/></filter></defs>
    <g filter="url(#s)"><circle cx="50" cy="50" r="45" fill="url(#rg)" stroke="#2a1206" stroke-width="2"/></g>
    <circle cx="50" cy="50" r="36" fill="url(#rl)" stroke="#2a1206" stroke-width="1.5"/>
    <path d="M22 38 A 30 30 0 0 1 60 18" stroke="#fff" stroke-width="3" opacity=".35" fill="none" stroke-linecap="round"/>
    <g fill="#ffd97a" stroke="#ffd97a" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
  const icons = {
    info: `<circle cx="50" cy="32" r="5" stroke="none"/><rect x="45" y="42" width="10" height="28" rx="3" stroke="none"/>`,
    sound: `<path d="M30 42 h10 l14 -12 v40 l-14 -12 h-10 z" stroke="none"/><path d="M62 38 q8 12 0 24 M68 32 q14 18 0 36" fill="none" stroke-width="4"/>`,
    mute: `<path d="M30 42 h10 l14 -12 v40 l-14 -12 h-10 z" stroke="none"/><path d="M62 40 l14 20 M76 40 l-14 20" fill="none" stroke-width="4.5"/>`,
    history: `<circle cx="50" cy="50" r="20" fill="none" stroke-width="4.5"/><path d="M50 38 v13 l9 6" fill="none" stroke-width="4.5"/>`,
    settings: `<path d="M50 28 l5 6 l8 -2 l1 8 l7 4 l-4 7 l4 7 l-7 4 l-1 8 l-8 -2 l-5 6 l-5 -6 l-8 2 l-1 -8 l-7 -4 l4 -7 l-4 -7 l7 -4 l1 -8 l8 2 z" stroke="none"/><circle cx="50" cy="50" r="7" fill="#3a1a08" stroke="none"/>`,
    turbo: `<path d="M30 32 l18 18 l-18 18 z M52 32 l18 18 l-18 18 z" stroke="none"/>`,
    auto: `<path d="M38 30 l30 20 l-30 20 z" stroke="none"/>`,
    stop: `<rect x="34" y="34" width="32" height="32" rx="4" stroke="none"/>`,
    plus: `<rect x="44" y="28" width="12" height="44" rx="3" stroke="none"/><rect x="28" y="44" width="44" height="12" rx="3" stroke="none"/>`,
    minus: `<rect x="28" y="44" width="44" height="12" rx="3" stroke="none"/>`,
    close: `<path d="M34 34 l32 32 M66 34 l-32 32" fill="none" stroke-width="7"/>`,
    music: `<path d="M42 64 v-30 l24 -6 v30" fill="none" stroke-width="4.5"/><circle cx="38" cy="65" r="6" stroke="none"/><circle cx="62" cy="59" r="6" stroke="none"/>`,
  };
  for (const [n, inner] of Object.entries(icons)) fs.writeFileSync(path.join(dir, `btn_${n}.svg`), base(inner));
  // Spin button
  fs.writeFileSync(path.join(dir, 'btn_spin.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs>${ring('r')}
    ${rad('c', [[0, '#ffe08a'], [0.45, '#e08a1a'], [1, '#7a3006']], 0.4, 0.3, 0.75)}
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".65"/></filter></defs>
    <g filter="url(#s)"><circle cx="100" cy="100" r="94" fill="url(#rg)" stroke="#2a1206" stroke-width="3"/></g>
    ${Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return `<circle cx="${100 + Math.cos(a) * 86}" cy="${100 + Math.sin(a) * 86}" r="2.6" fill="#7a4a0a"/>`; }).join('')}
    <circle cx="100" cy="100" r="76" fill="url(#rl)" stroke="#2a1206" stroke-width="2"/>
    <circle cx="100" cy="100" r="66" fill="url(#c)" stroke="#5a2a06" stroke-width="2"/>
    <g fill="none" stroke="#3a1206" stroke-width="13" stroke-linecap="round"><path d="M62 92 A 40 40 0 0 1 134 76"/><path d="M138 108 A 40 40 0 0 1 66 124"/></g>
    <g fill="#3a1206"><path d="M124 56 L 150 80 L 118 90 Z"/><path d="M76 144 L 50 120 L 82 110 Z"/></g>
    <g fill="none" stroke="#fff6d8" stroke-width="6" stroke-linecap="round"><path d="M62 92 A 40 40 0 0 1 134 76"/><path d="M138 108 A 40 40 0 0 1 66 124"/></g>
    <g fill="#fff6d8"><path d="M126 62 L 144 80 L 122 86 Z"/><path d="M74 138 L 56 120 L 78 114 Z"/></g>
    <path d="M44 74 A 62 62 0 0 1 112 38" stroke="#fff" stroke-width="5" opacity=".4" fill="none" stroke-linecap="round"/></svg>`);
  // Favicon
  fs.writeFileSync(path.join(dir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#c4700e"/><path d="${hexagram(32, 32, 20)}" fill="#fff3c0" stroke="#3a1206" stroke-width="2"/></svg>`);
}

export default function () {
  writeUiSvgs();
  return [
    { name: 'logo', w: 1000, h: 440, scale: 1.4, svg: logo(), group: 'ui' },
    { name: 'title_escape', w: 700, h: 330, scale: 1.2, svg: title('escape'), group: 'ui' },
    { name: 'title_hideout', w: 700, h: 330, scale: 1.2, svg: title('hideout'), group: 'ui' },
    { name: 'title_last', w: 700, h: 330, scale: 1.2, svg: title('last'), group: 'ui' },
    { name: 'win_big', w: 900, h: 320, scale: 1.2, svg: winBanner('big'), group: 'ui' },
    { name: 'win_mega', w: 900, h: 320, scale: 1.2, svg: winBanner('mega'), group: 'ui' },
    { name: 'win_epic', w: 900, h: 320, scale: 1.2, svg: winBanner('epic'), group: 'ui' },
  ];
}
export { buyCard };
