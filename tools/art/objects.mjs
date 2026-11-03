/**
 * Feature objects: chests, coins, multipliers, medallions, emblems, props.
 */
import { PAL, lin, rad, fBevel, fGrain, fShadow, fGlow, svg, starPts, hexagram, GOLD_STOPS, STEEL_STOPS, BRASS_STOPS } from './lib.mjs';

const O = `stroke="${PAL.ink}" stroke-linejoin="round" stroke-linecap="round"`;
function common(p) {
  return `${rad(p + 'goldR', [[0, '#fffbe6'], [0.35, PAL.gold1], [0.7, PAL.gold2], [1, PAL.gold3]], 0.35, 0.3, 0.75)}
    ${lin(p + 'gold', GOLD_STOPS, 0, 0, 0.3, 1)}
    ${lin(p + 'steel', STEEL_STOPS, 0, 0, 0, 1)}
    ${lin(p + 'brassL', BRASS_STOPS, 0, 0, 0, 1)}
    ${fBevel(p + 'bevel', { blur: 1.8, surface: 2.6 })}
    ${fShadow(p + 'shadow', { dy: 5, blur: 4.5, op: 0.6 })}
    ${fGlow(p + 'glow', { blur: 8, color: '#ffd36b', op: 0.8 })}`;
}

// ------------------------------------------------------------------ chests
function chest(kind) {
  const p = 'X' + kind[0];
  const open = kind !== 'closed';
  const body = `
    <path d="M30 96 L170 96 L166 166 L34 166 Z" fill="url(#${p}wood)" ${O} stroke-width="2.4" filter="url(#${p}grain)"/>
    ${[52, 100, 148].map((x) => `<rect x="${x - 7}" y="96" width="14" height="70" fill="url(#${p}iron)" ${O} stroke-width="1.6"/>`).join('')}
    <rect x="30" y="96" width="140" height="10" fill="url(#${p}iron)" ${O} stroke-width="1.6"/>
    <rect x="34" y="156" width="132" height="10" fill="url(#${p}iron)" ${O} stroke-width="1.6"/>
    ${[52, 100, 148].flatMap((x) => [106, 150].map((y) => `<circle cx="${x}" cy="${y}" r="2.4" fill="url(#${p}goldR)"/>`)).join('')}`;
  const lockPlate = `<g transform="translate(100 ${open ? 112 : 104})"><path d="M-15 -14 h30 v20 q0 12 -15 16 q-15 -4 -15 -16 z" fill="url(#${p}gold)" ${O} stroke-width="1.8" filter="url(#${p}bevel)"/><circle cy="-2" r="4" fill="${PAL.ink}"/><path d="M-1.6 0 h3.2 l1 8 h-5.2 z" fill="${PAL.ink}"/></g>`;
  const lidClosed = `
    <path d="M30 98 L30 70 C 30 30, 170 30, 170 70 L170 98 Z" fill="url(#${p}wood)" ${O} stroke-width="2.4" filter="url(#${p}grain)"/>
    <path d="M36 66 C 40 40, 160 40, 164 66" stroke="#fff" stroke-width="4" opacity=".14" fill="none"/>
    ${[52, 100, 148].map((x) => `<path d="M${x - 7} 98 L${x - 7} ${x === 100 ? 41 : 49} Q ${x} ${x === 100 ? 38 : 45} ${x + 7} ${x === 100 ? 41 : 49} L${x + 7} 98 Z" fill="url(#${p}iron)" ${O} stroke-width="1.6"/>`).join('')}`;
  const lidOpen = `
    <path d="M30 96 L36 44 C 40 18, 160 18, 164 44 L170 96 L156 92 L150 50 C 146 32, 54 32, 50 50 L44 92 Z" fill="url(#${p}woodIn)" ${O} stroke-width="2.2"/>
    <path d="M36 44 C 40 18, 160 18, 164 44 L 156 30 C 150 4, 50 4, 44 30 Z" fill="url(#${p}wood)" ${O} stroke-width="2.2" filter="url(#${p}grain)"/>
    ${[52, 100, 148].map((x) => `<path d="M${x - 7} ${x === 100 ? 8 : 14} L${x + 7} ${x === 100 ? 8 : 14} L${x + 7} 36 L${x - 7} 36 Z" fill="url(#${p}iron)" ${O} stroke-width="1.4"/>`).join('')}`;
  let inside = '';
  if (kind === 'open' || kind === 'treasure') {
    const coins = Array.from({ length: kind === 'treasure' ? 26 : 16 }, (_, i) => {
      const x = 40 + ((i * 37) % 120);
      const y = 92 - ((i * 13) % 22) - (i % 3) * 3;
      return `<ellipse cx="${x}" cy="${y}" rx="9" ry="5" fill="url(#${p}goldR)" ${O} stroke-width=".8"/>`;
    }).join('');
    const gems = kind === 'treasure' ? `
      <polygon points="${starPts(70, 74, 4, 11, 5, 0)}" fill="#3ad1ff" ${O} stroke-width="1"/><polygon points="66,74 70,64 74,74 70,80" fill="#bff3ff" opacity=".7"/>
      <path d="M118 80 l8 -12 l8 12 l-8 6 z" fill="#ff3a5a" ${O} stroke-width="1"/>
      <path d="M92 70 l6 -9 l6 9 l-6 5 z" fill="#4ae08a" ${O} stroke-width="1"/>
      <circle cx="140" cy="72" r="7" fill="url(#${p}goldR)" ${O} stroke-width="1"/><path d="${hexagram(140, 72, 5)}" fill="none" stroke="${PAL.gold4}" stroke-width="1"/>
      <path d="M48 84 C 60 56, 84 52, 96 60" stroke="url(#${p}pearl)" stroke-width="5" fill="none" stroke-dasharray="1 5.5" stroke-linecap="round"/>` : '';
    inside = `<ellipse cx="100" cy="86" rx="66" ry="22" fill="url(#${p}inGlow)"/>${coins}${gems}`;
  } else if (kind === 'empty') {
    inside = `<ellipse cx="100" cy="92" rx="64" ry="14" fill="#140804"/><path d="M50 84 Q 70 92 90 84 M60 80 l10 14 M120 86 Q 136 78 150 88" stroke="#bdb2a0" stroke-width=".8" fill="none" opacity=".6"/>`;
  }
  const glow = open && kind !== 'empty' ? `<ellipse cx="100" cy="70" rx="80" ry="50" fill="url(#${p}beam)"/>` : '';
  return svg(200, 180, common(p) + `
    ${lin(p + 'wood', [[0, '#a8693a'], [0.5, '#6e3c1a'], [1, '#3a1d0a']], 0, 0, 0, 1)}
    ${lin(p + 'woodIn', [[0, '#3a1d0a'], [1, '#1a0b04']], 0, 0, 0, 1)}
    ${lin(p + 'iron', [[0, '#8a8a86'], [0.5, '#4a4844'], [1, '#2a2826']], 0, 0, 1, 0)}
    ${rad(p + 'inGlow', [[0, '#fff3b0'], [0.5, '#ffb43a', 0.9], [1, '#a85a10', 0]], 0.5, 0.5, 0.6)}
    ${rad(p + 'beam', [[0, '#fff3b0', 0.65], [1, '#ffb43a', 0]], 0.5, 0.6, 0.55)}
    ${lin(p + 'pearl', [[0, '#ffffff'], [1, '#e8dcc8']], 0, 0, 1, 0)}
    ${fGrain(p + 'grain', { freq: '0.02 0.6', oct: 3, amt: 0.35, seed: 31 })}`,
    `<g filter="url(#${p}shadow)">${open ? lidOpen + glow + inside : ''}${body}${open ? '' : lidClosed}${lockPlate}</g>`);
}

// ------------------------------------------------------------------ coins
function coin(name, { label = '', tone = 'gold', star = true, size = 160 } = {}) {
  const p = 'Y' + name.replace(/\W/g, '');
  const c = size / 2;
  const R = c - 8;
  const t = tone === 'red'
    ? [[0, '#ff8a6a'], [0.4, '#d12a18'], [1, '#5a0805']]
    : tone === 'dark'
      ? [[0, '#6b4a30'], [0.5, '#3a2214'], [1, '#160a04']]
      : [[0, '#fffbe6'], [0.3, PAL.gold1], [0.65, PAL.gold2], [1, PAL.gold3]];
  const rim = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    return `<circle cx="${c + Math.cos(a) * (R - 5)}" cy="${c + Math.sin(a) * (R - 5)}" r="1.6" fill="${tone === 'gold' ? PAL.gold4 : PAL.gold1}" opacity=".6"/>`;
  }).join('');
  const txt = label
    ? `<text x="${c}" y="${c + R * 0.34}" text-anchor="middle" font-family="Alfa Slab One" font-size="${R * (label.length > 2 ? 0.78 : 0.95)}" fill="url(#${p}txtR)" stroke="#fff4c8" stroke-width="${R * 0.09}" paint-order="stroke">${label}</text><text x="${c}" y="${c + R * 0.34}" text-anchor="middle" font-family="Alfa Slab One" font-size="${R * (label.length > 2 ? 0.78 : 0.95)}" fill="none" stroke="${PAL.ink}" stroke-width="${R * 0.025}">${label}</text>`
    : '';
  return svg(size, size, common(p) + `
    ${rad(p + 'face', t, 0.38, 0.32, 0.75)}
    ${lin(p + 'txtR', [[0, '#e8402a'], [0.55, '#9a120a'], [1, '#4a0604']], 0, 0, 0, 1)}
    ${lin(p + 'txt', [[0, '#fffbe6'], [0.45, PAL.gold1], [0.75, PAL.gold2], [1, '#fff0b0']], 0, 0, 0, 1)}`,
    `<g filter="url(#${p}shadow)">
      <circle cx="${c}" cy="${c}" r="${R}" fill="url(#${p}gold)" ${O} stroke-width="2.4" filter="url(#${p}bevel)"/>
      <circle cx="${c}" cy="${c}" r="${R - 9}" fill="url(#${p}face)" ${O} stroke-width="1.6"/>
      ${rim}
      ${star ? `<polygon points="${starPts(c, c, 5, R * 0.56, R * 0.24)}" fill="url(#${p}goldR)" ${O} stroke-width="1.6" filter="url(#${p}bevel)" opacity="${label ? 0.28 : 1}"/>` : ''}
      ${txt}
      <path d="M${c - R * 0.62} ${c - R * 0.42} A ${R * 0.78} ${R * 0.78} 0 0 1 ${c + R * 0.2} ${c - R * 0.76}" stroke="#fff" stroke-width="${R * 0.07}" fill="none" opacity=".5" stroke-linecap="round"/>
    </g>`);
}

function coinPile() {
  const p = 'Z';
  const coins = [];
  const rows = [[6, 140], [5, 124], [4, 108], [3, 92], [2, 76]];
  rows.forEach(([n, y], ri) => {
    for (let i = 0; i < n; i++) {
      const x = 100 + (i - (n - 1) / 2) * 26;
      coins.push(`<g><ellipse cx="${x}" cy="${y + 6}" rx="16" ry="7" fill="${PAL.gold4}" ${O} stroke-width="1.2"/><ellipse cx="${x}" cy="${y}" rx="16" ry="7" fill="url(#${p}goldR)" ${O} stroke-width="1.2"/><polygon points="${starPts(x, y, 5, 5, 2)}" fill="${PAL.gold3}" opacity=".6"/></g>`);
    }
  });
  return svg(200, 180, common(p), `<g filter="url(#${p}shadow)">${coins.join('')}
    <g transform="translate(150 60) rotate(20)"><ellipse rx="18" ry="18" fill="url(#${p}goldR)" ${O} stroke-width="1.4"/><polygon points="${starPts(0, 0, 5, 9, 4)}" fill="${PAL.gold3}"/></g></g>`);
}

/** Lampião's Emblem – golden sun medallion with hat silhouette (Last Stand special). */
function emblemSun() {
  const p = 'U';
  const rays = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r1 = 56, r2 = i % 2 ? 76 : 86;
    return `<polygon points="${100 + Math.cos(a - 0.1) * r1},${100 + Math.sin(a - 0.1) * r1} ${100 + Math.cos(a) * r2},${100 + Math.sin(a) * r2} ${100 + Math.cos(a + 0.1) * r1},${100 + Math.sin(a + 0.1) * r1}" fill="url(#${p}goldR)" ${O} stroke-width="1.2"/>`;
  }).join('');
  return svg(200, 200, common(p) + `${rad(p + 'core', [[0, '#7a2a10'], [1, '#2a0a04']], 0.5, 0.4, 0.6)}`,
    `<g filter="url(#${p}shadow)">${rays}
      <circle cx="100" cy="100" r="58" fill="url(#${p}gold)" ${O} stroke-width="2.4" filter="url(#${p}bevel)"/>
      <circle cx="100" cy="100" r="46" fill="url(#${p}core)" ${O} stroke-width="1.8"/>
      <!-- hat + glasses silhouette -->
      <path d="M62 110 C 62 82, 80 66, 100 66 C 120 66, 138 82, 138 110 C 128 102, 116 96, 100 96 C 84 96, 72 102, 62 110 Z" fill="url(#${p}goldR)" ${O} stroke-width="1.4"/>
      <path d="${hexagram(100, 82, 7)}" fill="none" stroke="${PAL.gold4}" stroke-width="1.6"/>
      <circle cx="90" cy="118" r="7" fill="none" stroke="url(#${p}goldR)" stroke-width="3"/><circle cx="110" cy="118" r="7" fill="none" stroke="url(#${p}goldR)" stroke-width="3"/>
      <path d="M97 117 q3 -3 6 0" stroke="url(#${p}goldR)" stroke-width="2.4" fill="none"/>
      <path d="M70 70 A 44 44 0 0 1 118 58" stroke="#fff" stroke-width="3" opacity=".45" fill="none"/>
    </g>`);
}

/** Maria's medallion – gold pendant with ruby heart. */
function medallion() {
  const p = 'V';
  return svg(160, 200, common(p) + `${rad(p + 'ruby', [[0, '#ffb0b8'], [0.35, '#e8203a'], [1, '#5a0010']], 0.4, 0.35, 0.7)}`,
    `<g filter="url(#${p}shadow)">
      <path d="M40 4 C 50 30, 70 40, 80 44 C 90 40, 110 30, 120 4" fill="none" stroke="url(#${p}gold)" stroke-width="4" stroke-dasharray="1 6" stroke-linecap="round"/>
      <circle cx="80" cy="50" r="10" fill="none" stroke="url(#${p}gold)" stroke-width="5"/>
      <path d="M80 60 C 116 60, 140 90, 132 122 C 124 156, 96 176, 80 194 C 64 176, 36 156, 28 122 C 20 90, 44 60, 80 60 Z" fill="url(#${p}gold)" ${O} stroke-width="2.4" filter="url(#${p}bevel)"/>
      <path d="M80 78 C 106 78, 120 98, 114 122 C 108 146, 92 160, 80 172 C 68 160, 52 146, 46 122 C 40 98, 54 78, 80 78 Z" fill="none" stroke="${PAL.gold4}" stroke-width="1.6"/>
      <path d="M80 152 C 60 136, 50 122, 54 110 C 58 96, 74 96, 80 108 C 86 96, 102 96, 106 110 C 110 122, 100 136, 80 152 Z" fill="url(#${p}ruby)" ${O} stroke-width="1.8"/>
      <path d="M62 106 C 66 100, 72 100, 74 104" stroke="#fff" stroke-width="2.6" fill="none" opacity=".8" stroke-linecap="round"/>
      ${[[52, 92], [108, 92], [80, 168], [40, 128], [120, 128]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#fff8ec" ${O} stroke-width=".8"/>`).join('')}
    </g>`);
}

function goldStar() {
  const p = 'S';
  return svg(160, 160, common(p), `<g filter="url(#${p}shadow)"><polygon points="${starPts(80, 82, 5, 70, 30)}" fill="url(#${p}goldR)" ${O} stroke-width="2.4" filter="url(#${p}bevel)"/>
    <polygon points="${starPts(80, 82, 5, 50, 22)}" fill="none" stroke="${PAL.gold4}" stroke-width="1.4" opacity=".6"/></g>`);
}

function heartGem() {
  const p = 'H';
  return svg(160, 150, common(p) + `${rad(p + 'ruby', [[0, '#ffc0c8'], [0.3, '#ff3a52'], [0.75, '#a80a20'], [1, '#4a0008']], 0.38, 0.3, 0.75)}`,
    `<g filter="url(#${p}shadow)"><path d="M80 140 C 40 110, 8 82, 12 50 C 16 18, 56 10, 80 38 C 104 10, 144 18, 148 50 C 152 82, 120 110, 80 140 Z" fill="url(#${p}ruby)" ${O} stroke-width="2.4"/>
      <path d="M80 140 L 80 38 M12 50 L 80 76 L 148 50 M30 92 L80 76 L130 92" stroke="#fff" stroke-width="1" opacity=".25" fill="none"/>
      <path d="M80 140 C 40 110, 8 82, 12 50 C 16 18, 56 10, 80 38 C 104 10, 144 18, 148 50 C 152 82, 120 110, 80 140 Z" fill="none" stroke="url(#${p}gold)" stroke-width="5"/>
      <ellipse cx="44" cy="40" rx="14" ry="7" transform="rotate(-30 44 40)" fill="#fff" opacity=".6"/></g>`);
}

function lantern() {
  const p = 'J';
  return svg(120, 200, common(p) + `
    ${rad(p + 'flame', [[0, '#ffffff'], [0.3, '#fff0a0'], [0.7, '#ffae2a', 0.9], [1, '#ff6a00', 0]], 0.5, 0.6, 0.5)}
    ${lin(p + 'glass', [[0, '#fff3c0', 0.75], [1, '#ffb040', 0.55]], 0, 0, 1, 1)}
    ${lin(p + 'cu', [[0, '#e8a868'], [0.5, '#a05a24'], [1, '#4a2208']], 0, 0, 1, 0)}`,
    `<g filter="url(#${p}shadow)">
      <path d="M60 4 C 40 4, 40 26, 60 26 C 80 26, 80 4, 60 4" fill="none" stroke="url(#${p}cu)" stroke-width="5"/>
      <path d="M34 36 L 86 36 L 80 26 L 40 26 Z" fill="url(#${p}cu)" ${O} stroke-width="1.8"/>
      <rect x="32" y="36" width="56" height="10" rx="3" fill="url(#${p}cu)" ${O} stroke-width="1.8"/>
      <path d="M36 46 C 22 80, 22 120, 36 150 L 84 150 C 98 120, 98 80, 84 46 Z" fill="url(#${p}glass)" ${O} stroke-width="2"/>
      <ellipse cx="60" cy="106" rx="20" ry="32" fill="url(#${p}flame)"/>
      <path d="M60 86 C 52 100, 54 116, 60 122 C 66 116, 68 100, 60 86 Z" fill="#fff8d0"/>
      <path d="M36 46 C 22 80, 22 120, 36 150 M84 46 C 98 80, 98 120, 84 150 M60 46 L 60 150" stroke="url(#${p}cu)" stroke-width="3.5" fill="none"/>
      <rect x="28" y="150" width="64" height="14" rx="4" fill="url(#${p}cu)" ${O} stroke-width="1.8"/>
      <rect x="22" y="164" width="76" height="22" rx="6" fill="url(#${p}cu)" ${O} stroke-width="2"/>
      <path d="M40 54 C 32 80, 32 110, 38 136" stroke="#fff" stroke-width="3" opacity=".45" fill="none"/>
    </g>`);
}

function scarf() {
  const p = 'B';
  return svg(220, 120, common(p) + lin(p + 'cloth', [[0, '#ff6a52'], [0.5, '#d1261a'], [1, '#6a0806']], 0, 0, 1, 1),
    `<g filter="url(#${p}shadow)"><path d="M10 60 C 40 30, 80 70, 120 40 C 150 18, 180 30, 210 14 C 200 40, 186 56, 206 80 C 176 76, 150 92, 120 84 C 84 74, 50 104, 10 60 Z" fill="url(#${p}cloth)" ${O} stroke-width="2"/>
      <path d="M40 60 C 70 50, 100 70, 140 56 M60 74 C 90 66, 130 80, 170 64" stroke="#ff9a80" stroke-width="2" fill="none" opacity=".6"/></g>`);
}

/** Silhouette rider on horseback (used for parallax in The Great Escape). */
function rider() {
  const p = 'D';
  return svg(260, 200, '',
    `<g fill="#1a0806">
      <path d="M30 120 C 40 96, 80 92, 110 96 C 140 98, 168 94, 190 80 L 206 62 C 214 56, 224 58, 226 66 L 236 82 C 238 90, 230 92, 224 88 L 214 84 C 206 100, 200 118, 192 126 L 204 160 L 214 186 L 204 190 L 190 160 L 180 134 C 160 140, 130 140, 110 136 L 96 160 L 84 190 L 74 186 L 82 158 L 80 136 C 66 134, 54 130, 46 124 L 22 150 L 14 146 L 30 120 Z"/>
      <path d="M30 120 C 20 116, 8 122, 2 132 C 12 128, 22 126, 30 124 Z"/>
      <path d="M124 96 L 118 60 C 116 50, 126 44, 134 46 L 146 50 C 152 52, 152 60, 146 62 L 140 64 L 144 96 Z"/>
      <path d="M112 50 C 112 30, 160 30, 160 50 C 150 44, 122 44, 112 50 Z"/>
      <circle cx="136" cy="40" r="10"/>
      <path d="M150 58 L 196 30 L 198 34 L 154 64 Z"/>
    </g>`);
}

export default function () {
  const list = [
    ['chest_closed', 200, 180, chest('closed')], ['chest_open', 200, 180, chest('open')], ['chest_treasure', 200, 180, chest('treasure')], ['chest_empty', 200, 180, chest('empty')],
    ['coin', 160, 160, coin('coin')], ['coin_blank', 160, 160, coin('blank', { star: false })],
    ['mult_2', 160, 160, coin('m2', { label: '2×' })], ['mult_3', 160, 160, coin('m3', { label: '3×' })], ['mult_5', 160, 160, coin('m5', { label: '5×' })], ['mult_10', 160, 160, coin('m10', { label: '10×' })],
    ['token_mult', 160, 160, coin('tm', { tone: 'red', star: false })],
    ['coins_pile', 200, 180, coinPile()], ['emblem_sun', 200, 200, emblemSun()], ['medallion', 160, 200, medallion()],
    ['gold_star', 160, 160, goldStar()], ['heart_gem', 160, 150, heartGem()], ['lantern', 120, 200, lantern()], ['scarf', 220, 120, scarf()],
    ['rider', 260, 200, rider()],
  ];
  return list.map(([name, w, h, s]) => ({ name, w, h, scale: 2, svg: s, group: 'objects' }));
}
