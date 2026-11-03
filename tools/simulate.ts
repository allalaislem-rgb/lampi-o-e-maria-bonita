/**
 * Monte-Carlo simulator for the DEV DEFAULT math. NOT a certification tool.
 * Usage: npm run sim -- [baseSpins=2000000] [featureRuns=200000]
 */
import { GAME_CONFIG, type FeatureId } from '../src/config/gameConfig';
import { playBaseSpin } from '../src/engine/baseGame';
import { startFeature } from '../src/engine/bonusManager';
import { playFreeSpin } from '../src/engine/features/greatEscape';
import { pickChest } from '../src/engine/features/hideout';
import { lastStandAward, playRespin } from '../src/engine/features/lastStand';
import { lineBetFor } from '../src/engine/math';
import { DevRng, randInt } from '../src/engine/rng';

const cfg = GAME_CONFIG;
const BET = 2500; // 25.00, line bet 1.00
const MAXWIN = cfg.maxWinMultiplier * BET;
const rng = new DevRng(12345);

function runFeature(f: FeatureId, scatters: number, positions?: number[]): number {
  const s = startFeature(rng, cfg, f, { scatters, positions });
  if (s.feature === 'greatEscape') {
    let st = s.state;
    while (st.spinsLeft > 0) st = playFreeSpin(rng, st, cfg.greatEscape, lineBetFor(BET), MAXWIN - st.totalWin).state;
    return st.totalWin;
  }
  if (s.feature === 'hideout') {
    let st = s.state;
    while (!st.ended) {
      const closed = st.opened.map((o, i) => (o === null ? i : -1)).filter((i) => i >= 0);
      st = pickChest(st, closed[randInt(rng, closed.length)], cfg.hideout, BET, MAXWIN).state;
    }
    return Math.min(MAXWIN, st.coinTotal * st.multiplier * BET);
  }
  let st = s.state;
  while (!st.ended) st = playRespin(rng, st, cfg.lastStand, BET, MAXWIN).state;
  return lastStandAward(st.cells, cfg.lastStand, BET, MAXWIN).award;
}

const N = Number(process.argv[2] || 1_000_000);
const F = Number(process.argv[3] || 50_000);
let base = 0, events = 0, arrivals = 0, raids = 0, hits = 0;
const trig: Record<FeatureId, number> = { greatEscape: 0, hideout: 0, lastStand: 0 };
const featWin: Record<FeatureId, number> = { greatEscape: 0, hideout: 0, lastStand: 0 };
let multi = 0;
for (let i = 0; i < N; i++) {
  const o = playBaseSpin(rng, cfg, BET);
  base += o.win;
  if (o.win > 0) hits++;
  if (o.event) { events++; if (o.event.type === 'arrival') arrivals++; else raids++; }
  if (o.triggers.length > 1) multi++;
  if (o.triggers.length) {
    // simulation policy for simultaneous triggers: first triggered
    const f = o.triggers[0];
    trig[f]++;
    featWin[f] += runFeature(f, o.scatters.WANT.length, o.scatters.EMBL.map(([r, row]) => r * 3 + row));
  }
}
const pct = (x: number) => (100 * x).toFixed(2) + '%';
console.log(`\n=== DEV MATH SIMULATION (NOT CERTIFIED) – ${N.toLocaleString()} base spins ===`);
console.log(`Base-game line RTP (incl. random events): ${pct(base / (N * BET))}   hit rate ${pct(hits / N)}`);
console.log(`Random events: arrival 1/${(N / arrivals).toFixed(0)}  raid 1/${(N / raids).toFixed(0)}`);
let totalFeat = 0;
for (const f of Object.keys(trig) as FeatureId[]) {
  totalFeat += featWin[f];
  console.log(`${f.padEnd(12)} trigger 1/${(N / Math.max(1, trig[f])).toFixed(0).padStart(6)}  avg ${(featWin[f] / Math.max(1, trig[f]) / BET).toFixed(1).padStart(7)}×  RTP ${pct(featWin[f] / (N * BET))}`);
}
console.log(`Simultaneous triggers: ${multi}`);
console.log(`TOTAL RTP ≈ ${pct((base + totalFeat) / (N * BET))}   (GDD target 96.20%, unvalidated)`);

console.log(`\n=== BONUS BUY (each ${F.toLocaleString()} runs) ===`);
for (const f of ['greatEscape', 'hideout', 'lastStand'] as FeatureId[]) {
  let w = 0, max = 0;
  for (let i = 0; i < F; i++) {
    const sc = f === 'greatEscape' ? Number(Object.keys(cfg.bonusBuy.greatEscapeScatters)[0]) : 3;
    const x = runFeature(f, sc);
    w += x; if (x > max) max = x;
  }
  const price = cfg.bonusBuy.prices[f];
  console.log(`${f.padEnd(12)} price ${price}×  avg ${(w / F / BET).toFixed(1)}×  RTP ${pct(w / F / BET / price)}  max seen ${(max / BET).toFixed(0)}×`);
}
