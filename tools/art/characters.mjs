/**
 * Character illustrations (Lampião, Maria Bonita) – reusable groups drawn in a
 * 200×180 symbol cell coordinate space, centred at x=100.
 */
import { PAL, lin, rad, along, hexagram, starPts } from './lib.mjs';

const O = `stroke="${PAL.ink}" stroke-linejoin="round" stroke-linecap="round"`;

/** Cangaceiro half-moon leather hat seen from the front. */
export function hat(p, { cx = 100, top = 20, w = 132, h = 72, tint = 'brown', stars = true } = {}) {
  const l = cx - w / 2;
  const r = cx + w / 2;
  const by = top + h; // tips level
  const d = `M${l} ${by} C ${l - 2} ${top + h * 0.35}, ${cx - w * 0.3} ${top}, ${cx} ${top} C ${cx + w * 0.3} ${top}, ${r + 2} ${top + h * 0.35}, ${r} ${by}
             C ${r - 8} ${by - 6}, ${cx + w * 0.3} ${top + h * 0.62}, ${cx} ${top + h * 0.62} C ${cx - w * 0.3} ${top + h * 0.62}, ${l + 8} ${by - 6}, ${l} ${by} Z`;
  const inner = `M${l + 12} ${by - 6} C ${l + 10} ${top + h * 0.42}, ${cx - w * 0.26} ${top + 10}, ${cx} ${top + 10} C ${cx + w * 0.26} ${top + 10}, ${r - 10} ${top + h * 0.42}, ${r - 12} ${by - 6}`;
  const base = tint === 'dark' ? ['#9a5e2c', '#5e3416', '#2a1408'] : ['#c27f45', '#85481d', '#3d1d0a'];
  // medallions following the dome
  const meds = [];
  const mcy = top + h * 0.98, mrx = w * 0.4, mry = h * 0.8;
  for (const t of [-1.12, -0.8, -0.46, 0.46, 0.8, 1.12]) {
    const ax = cx + Math.sin(t) * mrx;
    const ay = mcy - Math.cos(t) * mry;
    meds.push(`<g transform="translate(${ax.toFixed(1)} ${ay.toFixed(1)})"><circle r="4.4" fill="url(#${p}silver)" ${O} stroke-width="0.9"/><polygon points="${starPts(0, 0, 5, 2.8, 1.2)}" fill="${PAL.steel3}" opacity=".6"/></g>`);
  }
  return {
    defs: `${lin(p + 'hat', [[0, base[0]], [0.55, base[1]], [1, base[2]]], 0.2, 0, 0.8, 1)}
      ${rad(p + 'silver', [[0, '#ffffff'], [0.45, PAL.steel1], [1, PAL.steel3]], 0.35, 0.35, 0.7)}
      ${lin(p + 'hatHi', [[0, '#ffffff', 0.35], [1, '#ffffff', 0]], 0, 0, 0, 1)}
      <filter id="${p}soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>`,
 body: `<g>
      <ellipse cx="${cx}" cy="${top + h * 0.7}" rx="${w * 0.3}" ry="${h * 0.16}" fill="${PAL.ink}" opacity=".35" filter="url(#${p}soft)"/>
      <path d="${d}" fill="url(#${p}hat)" ${O} stroke-width="2.2" filter="url(#${p}bevelSoft)"/>
      <path d="${inner}" fill="none" stroke="${PAL.leather0}" stroke-width="1.4" stroke-dasharray="3 2.4" opacity=".75"/>
      <path d="M${cx - w * 0.36} ${top + h * 0.3} C ${cx - w * 0.2} ${top + 4}, ${cx + w * 0.1} ${top + 2}, ${cx + w * 0.22} ${top + 8}" fill="none" stroke="url(#${p}hatHi)" stroke-width="5" opacity=".7"/>
      ${meds.join('')}
      ${stars ? `<g transform="translate(${cx} ${top + h * 0.36})">
 <circle r="11.5" fill="url(#${p}goldR)" ${O} stroke-width="1.4"/>
        <path d="${hexagram(0, 0, 8.5)}" fill="none" stroke="${PAL.gold4}" stroke-width="1.6"/>
        <circle r="3" fill="${PAL.red1}" stroke="${PAL.gold4}" stroke-width=".8"/></g>` : ''}
    </g>`,
  };
}

function bandolier(p, x1, y1, x2, y2, w = 15) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const nx = (-Math.sin(ang) * w) / 2;
  const ny = (Math.cos(ang) * w) / 2;
  const strap = `<path d="M${x1 + nx} ${y1 + ny} L${x2 + nx} ${y2 + ny} L${x2 - nx} ${y2 - ny} L${x1 - nx} ${y1 - ny} Z" fill="url(#${p}strap)" ${O} stroke-width="1.4"/>`;
  const bullets = along([[x1, y1], [x2, y2]], 7.4, (x, y, a) =>
    `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a + 90})"><rect x="-2.9" y="-9.5" width="5.8" height="13" rx="1.6" fill="url(#${p}brass)" stroke="${PAL.brass3}" stroke-width=".7"/><ellipse cx="0" cy="-9.2" rx="2.9" ry="1.3" fill="#fff4cf" opacity=".7"/></g>`,
  );
  return strap + bullets;
}

/** Shared bust: jacket, bandoliers, scarf, neck. */
function bust(p, { cx = 100, top = 128, female = false } = {}) {
  const jacket = female ? ['#6d4a2c', '#4a2f19', '#2b190c'] : ['#7a5a35', '#55391f', '#2e1c0d'];
  return {
    defs: `${lin(p + 'jacket', [[0, jacket[0]], [0.5, jacket[1]], [1, jacket[2]]], 0, 0, 1, 1)}
      ${lin(p + 'strap', [[0, PAL.leather0], [1, PAL.leather2]], 0, 0, 0, 1)}
      ${lin(p + 'brass', [[0, PAL.brass3], [0.3, PAL.brass1], [0.55, PAL.brass0], [1, PAL.brass2]], 0, 0, 1, 0)}
      ${lin(p + 'scarf', [[0, PAL.red0], [0.5, PAL.red1], [1, PAL.red3]], 0, 0, 0.6, 1)}`,
    body: `
      <path d="M${cx - 92} 190 C ${cx - 88} ${top + 26}, ${cx - 60} ${top + 6}, ${cx - 26} ${top} L ${cx + 26} ${top} C ${cx + 60} ${top + 6}, ${cx + 88} ${top + 26}, ${cx + 92} 190 Z" fill="url(#${p}jacket)" ${O} stroke-width="2"/>
      <path d="M${cx - 26} ${top} L ${cx - 10} 190 M${cx + 26} ${top} L ${cx + 10} 190" stroke="${PAL.ink}" stroke-width="1.2" opacity=".5"/>
      ${bandolier(p, cx - 62, top + 10, cx + 50, 196)}
      ${bandolier(p, cx + 62, top + 10, cx - 50, 196)}
      <path d="M${cx - 24} ${top - 4} C ${cx - 16} ${top + 14}, ${cx + 16} ${top + 14}, ${cx + 24} ${top - 4} L ${cx + 18} ${top + 6} C ${cx + 8} ${top + 26}, ${cx - 8} ${top + 26}, ${cx - 18} ${top + 6} Z" fill="url(#${p}scarf)" ${O} stroke-width="1.6"/>
      <path d="M${cx - 6} ${top + 14} C ${cx - 14} ${top + 30}, ${cx - 20} ${top + 42}, ${cx - 12} ${top + 52} L ${cx + 2} ${top + 46} C ${cx} ${top + 34}, ${cx + 4} ${top + 24}, ${cx + 6} ${top + 14} Z" fill="url(#${p}scarf)" ${O} stroke-width="1.5"/>
      <path d="M${cx + 4} ${top + 14} C ${cx + 14} ${top + 28}, ${cx + 20} ${top + 38}, ${cx + 16} ${top + 48} L ${cx + 4} ${top + 42} Z" fill="${PAL.red2}" ${O} stroke-width="1.4"/>
      <ellipse cx="${cx}" cy="${top + 14}" rx="7.5" ry="6" fill="${PAL.red1}" ${O} stroke-width="1.5"/>
      <path d="M${cx - 4} ${top + 11} q4 -3 8 0" stroke="${PAL.red0}" stroke-width="1.4" fill="none"/>`,
  };
}

/** Lampião bust (front, glasses). */
export function lampiao(p, { cx = 100, faceY = 94, scale = 1 } = {}) {
  // NOTE: body is drawn around cx so it can be shifted for alternative poses
  const fy = faceY;
  const h = hat(p, { cx, top: fy - 66, w: 122, h: 66 });
  const b = bust(p, { cx, top: fy + 36 });
  const face = `M${cx - 27} ${fy - 20} C ${cx - 30} ${fy - 2}, ${cx - 28} ${fy + 14}, ${cx - 20} ${fy + 26} C ${cx - 13} ${fy + 35}, ${cx - 6} ${fy + 38}, ${cx} ${fy + 38} C ${cx + 6} ${fy + 38}, ${cx + 13} ${fy + 35}, ${cx + 20} ${fy + 26} C ${cx + 28} ${fy + 14}, ${cx + 30} ${fy - 2}, ${cx + 27} ${fy - 20} Z`;
  return {
    defs: `${h.defs}${b.defs}
      ${lin(p + 'skin', [[0, PAL.skin0], [0.45, PAL.skin1], [1, PAL.skin2]], 0.1, 0, 0.9, 0.3)}
      ${lin(p + 'shadeR', [[0, PAL.skin3, 0], [1, PAL.skin3, 0.75]], 0, 0, 1, 0)}
      ${rad(p + 'lens', [[0, '#ffe7b0', 0.15], [0.7, '#8a4a1a', 0.55], [1, '#3a1a08', 0.85]], 0.4, 0.35, 0.7)}
      ${lin(p + 'hair', [[0, PAL.hair2], [1, PAL.hair]], 0, 0, 0, 1)}`,
    body: `<g transform="translate(${cx} ${fy}) scale(${scale}) translate(${-cx} ${-fy})">
      ${b.body}
      <!-- hair behind -->
      <path d="M${cx - 33} ${fy - 26} C ${cx - 40} ${fy - 4}, ${cx - 38} ${fy + 14}, ${cx - 32} ${fy + 26} C ${cx - 28} ${fy + 22}, ${cx - 26} ${fy + 18}, ${cx - 27} ${fy + 8} L ${cx - 24} ${fy - 22} Z" fill="url(#${p}hair)" ${O} stroke-width="1.5"/>
      <path d="M${cx + 33} ${fy - 26} C ${cx + 40} ${fy - 4}, ${cx + 38} ${fy + 14}, ${cx + 32} ${fy + 26} C ${cx + 28} ${fy + 22}, ${cx + 26} ${fy + 18}, ${cx + 27} ${fy + 8} L ${cx + 24} ${fy - 22} Z" fill="url(#${p}hair)" ${O} stroke-width="1.5"/>
      <!-- neck -->
      <path d="M${cx - 12} ${fy + 28} L ${cx - 13} ${fy + 44} L ${cx + 13} ${fy + 44} L ${cx + 12} ${fy + 28} Z" fill="${PAL.skin2}" ${O} stroke-width="1.5"/>
      <!-- ears -->
      <ellipse cx="${cx - 28}" cy="${fy + 2}" rx="5" ry="8.5" fill="${PAL.skin1}" ${O} stroke-width="1.4"/>
      <ellipse cx="${cx + 28}" cy="${fy + 2}" rx="5" ry="8.5" fill="${PAL.skin2}" ${O} stroke-width="1.4"/>
      <!-- face -->
      <path d="${face}" fill="url(#${p}skin)" ${O} stroke-width="1.8"/>
      <path d="M${cx + 8} ${fy - 20} C ${cx + 26} ${fy - 6}, ${cx + 26} ${fy + 20}, ${cx + 4} ${fy + 38} C ${cx + 14} ${fy + 36}, ${cx + 26} ${fy + 22}, ${cx + 27} ${fy - 20} Z" fill="url(#${p}shadeR)" opacity=".8"/>
      <!-- stubble / jaw shade -->
      <path d="M${cx - 20} ${fy + 22} C ${cx - 12} ${fy + 36}, ${cx + 12} ${fy + 36}, ${cx + 20} ${fy + 22} C ${cx + 12} ${fy + 30}, ${cx - 12} ${fy + 30}, ${cx - 20} ${fy + 22} Z" fill="${PAL.skin3}" opacity=".28"/>
      <!-- hair fringe under hat -->
      <path d="M${cx - 30} ${fy - 22} C ${cx - 18} ${fy - 14}, ${cx - 6} ${fy - 18}, ${cx + 2} ${fy - 13} C ${cx + 10} ${fy - 18}, ${cx + 22} ${fy - 14}, ${cx + 30} ${fy - 22} L ${cx + 28} ${fy - 30} L ${cx - 28} ${fy - 30} Z" fill="url(#${p}hair)"/>
      <!-- brows -->
      <path d="M${cx - 21} ${fy - 9} q8 -6 16 -1" stroke="${PAL.hair}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M${cx + 5} ${fy - 10} q8 -5 16 1" stroke="${PAL.hair}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <!-- eyes -->
      <ellipse cx="${cx - 12}" cy="${fy + 1}" rx="4" ry="2.6" fill="#fff6e8"/><circle cx="${cx - 11.5}" cy="${fy + 1}" r="2.1" fill="${PAL.hair}"/>
      <ellipse cx="${cx + 12}" cy="${fy + 1}" rx="4" ry="2.6" fill="#fff6e8"/><circle cx="${cx + 12.5}" cy="${fy + 1}" r="2.1" fill="${PAL.hair}"/>
      <!-- round glasses -->
      <circle cx="${cx - 12}" cy="${fy + 1}" r="10" fill="url(#${p}lens)" stroke="${PAL.gold3}" stroke-width="2.4"/>
      <circle cx="${cx + 12}" cy="${fy + 1}" r="10" fill="url(#${p}lens)" stroke="${PAL.gold3}" stroke-width="2.4"/>
      <circle cx="${cx - 12}" cy="${fy + 1}" r="11.3" fill="none" stroke="${PAL.ink}" stroke-width=".9"/>
      <circle cx="${cx + 12}" cy="${fy + 1}" r="11.3" fill="none" stroke="${PAL.ink}" stroke-width=".9"/>
      <path d="M${cx - 2} ${fy - 1} q2 -3 4 0" stroke="${PAL.gold3}" stroke-width="2" fill="none"/>
      <path d="M${cx - 22} ${fy} L ${cx - 28} ${fy - 2} M${cx + 22} ${fy} L ${cx + 28} ${fy - 2}" stroke="${PAL.gold3}" stroke-width="1.8"/>
      <path d="M${cx - 18} ${fy - 4} q4 -5 9 -4" stroke="#fff" stroke-width="1.6" fill="none" opacity=".85"/>
      <path d="M${cx + 6} ${fy - 4} q4 -5 9 -4" stroke="#fff" stroke-width="1.6" fill="none" opacity=".85"/>
      <!-- nose -->
      <path d="M${cx + 1} ${fy + 4} C ${cx + 3} ${fy + 11}, ${cx + 6} ${fy + 14}, ${cx + 3} ${fy + 17} C ${cx} ${fy + 18.5}, ${cx - 4} ${fy + 18}, ${cx - 5} ${fy + 16}" stroke="${PAL.skin3}" stroke-width="1.6" fill="none"/>
      <path d="M${cx - 3} ${fy + 6} L ${cx - 3} ${fy + 13}" stroke="#ffe2c2" stroke-width="1.6" opacity=".7"/>
      <!-- moustache + mouth -->
      <path d="M${cx - 11} ${fy + 23} C ${cx - 6} ${fy + 19}, ${cx - 2} ${fy + 20}, ${cx} ${fy + 21.5} C ${cx + 2} ${fy + 20}, ${cx + 6} ${fy + 19}, ${cx + 11} ${fy + 23} C ${cx + 6} ${fy + 23.5}, ${cx + 2} ${fy + 23}, ${cx} ${fy + 24} C ${cx - 2} ${fy + 23}, ${cx - 6} ${fy + 23.5}, ${cx - 11} ${fy + 23} Z" fill="${PAL.hair2}"/>
      <path d="M${cx - 7} ${fy + 27.5} q7 2.5 14 0" stroke="${PAL.skin3}" stroke-width="1.8" fill="none"/>
      <path d="M${cx - 4} ${fy + 30.5} q4 1.5 8 0" stroke="${PAL.skin2}" stroke-width="1.3" fill="none"/>
      <!-- cheek highlight -->
      <ellipse cx="${cx - 18}" cy="${fy + 13}" rx="5" ry="3" fill="#fff" opacity=".18"/>
      <!-- chin strap -->
      <path d="M${cx - 30} ${fy - 12} C ${cx - 32} ${fy + 20}, ${cx - 20} ${fy + 40}, ${cx} ${fy + 40} C ${cx + 20} ${fy + 40}, ${cx + 32} ${fy + 20}, ${cx + 30} ${fy - 12}" stroke="${PAL.leather3}" stroke-width="2.2" fill="none" opacity=".85"/>
      ${h.body}
    </g>`,
  };
}

/** Maria Bonita bust. */
export function maria(p, { cx = 100, faceY = 96, scale = 1 } = {}) {
  const fy = faceY;
  const h = hat(p, { cx, top: fy - 64, w: 112, h: 60, tint: 'dark' });
  const b = bust(p, { cx, top: fy + 36, female: true });
  const face = `M${cx - 24} ${fy - 20} C ${cx - 27} ${fy - 2}, ${cx - 25} ${fy + 14}, ${cx - 17} ${fy + 25} C ${cx - 11} ${fy + 33}, ${cx - 5} ${fy + 36}, ${cx} ${fy + 36} C ${cx + 5} ${fy + 36}, ${cx + 11} ${fy + 33}, ${cx + 17} ${fy + 25} C ${cx + 25} ${fy + 14}, ${cx + 27} ${fy - 2}, ${cx + 24} ${fy - 20} Z`;
  const eye = (x, flip) => `
      <path d="M${x - 6.5} ${fy + 1} C ${x - 3} ${fy - 4.5}, ${x + 3} ${fy - 4.5}, ${x + 6.5} ${fy + 0.5} C ${x + 3} ${fy + 3.5}, ${x - 3} ${fy + 3.5}, ${x - 6.5} ${fy + 1} Z" fill="#fff8ee" ${O} stroke-width="1.1"/>
      <circle cx="${x + (flip ? 0.6 : 0.6)}" cy="${fy}" r="3.1" fill="#4a2a14"/><circle cx="${x + 0.6}" cy="${fy}" r="1.6" fill="${PAL.hair}"/>
      <circle cx="${x - 0.6}" cy="${fy - 1.1}" r=".9" fill="#fff"/>
      <path d="M${x - 7.5} ${fy + 0.5} C ${x - 3} ${fy - 6}, ${x + 3} ${fy - 6}, ${x + 7.5} ${fy - 0.5}" stroke="${PAL.hair}" stroke-width="2.1" fill="none"/>
      <path d="M${x + 6} ${fy - 1.5} l2.6 -1.6" stroke="${PAL.hair}" stroke-width="1.4"/>`;
  return {
    defs: `${h.defs}${b.defs}
      ${lin(p + 'skin', [[0, '#f6cfa6'], [0.45, '#e2a777'], [1, '#b47448']], 0.1, 0, 0.9, 0.3)}
      ${lin(p + 'shadeR', [[0, PAL.skin3, 0], [1, PAL.skin3, 0.65]], 0, 0, 1, 0)}
      ${lin(p + 'hair', [[0, '#4a2a1a'], [0.5, PAL.hair2], [1, PAL.hair]], 0, 0, 0.3, 1)}
      ${lin(p + 'lip', [[0, '#d3443a'], [1, '#8f1f1a']], 0, 0, 0, 1)}`,
    body: `<g transform="translate(${cx} ${fy}) scale(${scale}) translate(${-cx} ${-fy})">
      <!-- long hair behind -->
      <path d="M${cx - 28} ${fy - 30} C ${cx - 50} ${fy - 8}, ${cx - 40} ${fy + 14}, ${cx - 50} ${fy + 34} C ${cx - 58} ${fy + 52}, ${cx - 46} ${fy + 62}, ${cx - 56} ${fy + 78} C ${cx - 36} ${fy + 80}, ${cx - 24} ${fy + 62}, ${cx - 20} ${fy + 40} Z" fill="url(#${p}hair)" ${O} stroke-width="1.6"/>
      <path d="M${cx + 28} ${fy - 30} C ${cx + 50} ${fy - 8}, ${cx + 40} ${fy + 14}, ${cx + 50} ${fy + 34} C ${cx + 58} ${fy + 52}, ${cx + 46} ${fy + 62}, ${cx + 56} ${fy + 78} C ${cx + 36} ${fy + 80}, ${cx + 24} ${fy + 62}, ${cx + 20} ${fy + 40} Z" fill="url(#${p}hair)" ${O} stroke-width="1.6"/>
      <path d="M${cx - 40} ${fy} C ${cx - 44} ${fy + 20}, ${cx - 40} ${fy + 40}, ${cx - 48} ${fy + 60} M${cx + 40} ${fy} C ${cx + 44} ${fy + 20}, ${cx + 40} ${fy + 40}, ${cx + 48} ${fy + 60}" stroke="#6a3c22" stroke-width="1.3" fill="none" opacity=".7"/>
      ${b.body}
      <!-- hair over shoulders -->
      <path d="M${cx - 27} ${fy - 6} C ${cx - 40} ${fy + 24}, ${cx - 34} ${fy + 52}, ${cx - 44} ${fy + 74} C ${cx - 30} ${fy + 72}, ${cx - 22} ${fy + 54}, ${cx - 20} ${fy + 30} Z" fill="url(#${p}hair)" ${O} stroke-width="1.4"/>
      <path d="M${cx + 27} ${fy - 6} C ${cx + 40} ${fy + 24}, ${cx + 34} ${fy + 52}, ${cx + 44} ${fy + 74} C ${cx + 30} ${fy + 72}, ${cx + 22} ${fy + 54}, ${cx + 20} ${fy + 30} Z" fill="url(#${p}hair)" ${O} stroke-width="1.4"/>
      <path d="M${cx - 12} ${fy + 26} L ${cx - 12} ${fy + 42} L ${cx + 12} ${fy + 42} L ${cx + 12} ${fy + 26} Z" fill="${PAL.skin1}" ${O} stroke-width="1.4"/>
      <path d="${face}" fill="url(#${p}skin)" ${O} stroke-width="1.7"/>
      <path d="M${cx + 8} ${fy - 20} C ${cx + 24} ${fy - 4}, ${cx + 22} ${fy + 22}, ${cx + 4} ${fy + 36} C ${cx + 14} ${fy + 34}, ${cx + 24} ${fy + 20}, ${cx + 24} ${fy - 20} Z" fill="url(#${p}shadeR)" opacity=".7"/>
      <!-- hair framing face (middle part) -->
      <path d="M${cx + 2} ${fy - 30} C ${cx - 16} ${fy - 30}, ${cx - 30} ${fy - 16}, ${cx - 27} ${fy + 12} C ${cx - 23} ${fy - 2}, ${cx - 16} ${fy - 13}, ${cx} ${fy - 16} Z" fill="url(#${p}hair)" ${O} stroke-width="1"/>
      <path d="M${cx - 2} ${fy - 30} C ${cx + 16} ${fy - 30}, ${cx + 30} ${fy - 16}, ${cx + 27} ${fy + 12} C ${cx + 23} ${fy - 2}, ${cx + 16} ${fy - 13}, ${cx} ${fy - 16} Z" fill="url(#${p}hair)" ${O} stroke-width="1"/>
      <path d="M${cx - 6} ${fy - 24} C ${cx - 14} ${fy - 20}, ${cx - 20} ${fy - 12}, ${cx - 22} ${fy - 2}" stroke="#7a4a2a" stroke-width="1.4" fill="none" opacity=".7"/>
      <!-- brows -->
      <path d="M${cx - 18} ${fy - 8} q6 -4 12 -1" stroke="${PAL.hair2}" stroke-width="2" fill="none"/>
      <path d="M${cx + 6} ${fy - 9} q6 -3 12 1" stroke="${PAL.hair2}" stroke-width="2" fill="none"/>
      ${eye(cx - 11, false)}${eye(cx + 11, true)}
      <!-- nose -->
      <path d="M${cx + 1} ${fy + 5} C ${cx + 3} ${fy + 11}, ${cx + 4} ${fy + 13}, ${cx + 2} ${fy + 15} C ${cx} ${fy + 16}, ${cx - 3} ${fy + 15.5}, ${cx - 4} ${fy + 14}" stroke="${PAL.skin2}" stroke-width="1.3" fill="none"/>
      <!-- lips -->
      <path d="M${cx - 8} ${fy + 22} C ${cx - 4} ${fy + 19.5}, ${cx - 1} ${fy + 20}, ${cx} ${fy + 21} C ${cx + 1} ${fy + 20}, ${cx + 4} ${fy + 19.5}, ${cx + 8} ${fy + 22} C ${cx + 4} ${fy + 27}, ${cx - 4} ${fy + 27}, ${cx - 8} ${fy + 22} Z" fill="url(#${p}lip)" ${O} stroke-width=".9"/>
      <path d="M${cx - 7} ${fy + 22} q7 1.4 14 0" stroke="${PAL.red3}" stroke-width="1" fill="none"/>
      <ellipse cx="${cx - 2}" cy="${fy + 24.4}" rx="2.6" ry=".9" fill="#fff" opacity=".45"/>
      <!-- blush -->
      <ellipse cx="${cx - 16}" cy="${fy + 12}" rx="5.5" ry="3.2" fill="#e8705a" opacity=".35"/>
      <ellipse cx="${cx + 16}" cy="${fy + 12}" rx="5.5" ry="3.2" fill="#c45a44" opacity=".3"/>
      <!-- earrings -->
      <circle cx="${cx - 25}" cy="${fy + 12}" r="3.2" fill="url(#${p}goldR)" ${O} stroke-width=".8"/>
      <circle cx="${cx + 25}" cy="${fy + 12}" r="3.2" fill="url(#${p}goldR)" ${O} stroke-width=".8"/>
      ${h.body}
    </g>`,
  };
}
