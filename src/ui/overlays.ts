/**
 * DOM overlays: bonus intro/outro, bonus choice, purchase confirmation,
 * paytable & rules, round history, autoplay, developer QA panel, toasts.
 */
import { FEATURE_NAMES, GAME_CONFIG, PAYLINES, SYMBOLS, type FeatureId, type SymbolId } from '../config/gameConfig';
import type { RoundRecord } from '../engine/wallet';
import { money } from './format';
import { sound } from '../audio/sound';
import { atlasCss } from './assets';

const root = () => document.getElementById('overlay')!;
const G = (n: string) => `./gfx/${n}.webp`;
const SYM = (n: string, w: number, h: number) => `<i style="${atlasCss(n, w, h)}"></i>`;
const CLOSE = `<button class="close-x" data-x aria-label="Close"><img src="./ui/btn_close.svg" alt=""/></button>`;

const TITLE_IMG: Record<FeatureId, string> = { greatEscape: 'card_escape', hideout: 'card_hideout2', lastStand: 'card_last2' };

let openCount = 0;
export const isOverlayOpen = () => openCount > 0;

function open(html: string, cls = ''): HTMLElement {
  const r = root();
  r.innerHTML = `<div class="modal ${cls}">${html}</div>`;
  r.classList.add('open');
  openCount = 1;
  return r.firstElementChild as HTMLElement;
}
export function closeOverlay() {
  const r = root();
  r.classList.remove('open');
  r.innerHTML = '';
  openCount = 0;
}

function onClick(el: HTMLElement, sel: string, fn: () => void) {
  el.querySelectorAll<HTMLElement>(sel).forEach((b) =>
    b.addEventListener('click', () => {
      sound.play('click');
      fn();
    }),
  );
}

let toastTimer: number | undefined;
export function toast(msg: string, ms = 2200) {
  const t = document.getElementById('toast')!;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), ms);
}

const INTRO_TEXT: Record<FeatureId, (n?: number) => string> = {
  greatEscape: (n) =>
    `<div class="big-num">${n} FREE SPINS</div>
     <p>Lampião Wilds <b>expand</b> to cover the whole reel. Every winning spin with an expanding Wild raises the <b>Escape Multiplier</b> by +1× (max ${GAME_CONFIG.greatEscape.multiplierCap}×) – it never resets.</p>
     <p>The <b>Cangaceiro Raid</b> can turn whole reels Wild. 3+ Wanted Posters award <b>+${GAME_CONFIG.greatEscape.retriggerSpins} spins</b>.</p>`,
  hideout: () =>
    `<div class="big-num">${GAME_CONFIG.hideout.initialPicks} PICKS</div>
     <p>Choose chests in the cangaceiros' secret hideout. Find gold, multipliers and extra picks.</p>
     <p>Collect <b>Lampião's Treasure</b> and <b>Maria's Medallion</b> to unlock the <b>Couple's Fortune</b>. Prizes already won can never be lost.</p>`,
  lastStand: () =>
    `<div class="big-num">${GAME_CONFIG.lastStand.initialRespins} RESPINS</div>
     <p>Gold symbols lock in place. Every new gold symbol resets the respins to ${GAME_CONFIG.lastStand.initialRespins}.</p>
     <p>Multipliers <b>2× 3× 5× 10×</b> add up and multiply your gold. <b>Lampião's Emblem</b> upgrades multipliers or adds gold. Fill all 15 positions for the <b>GRAND TREASURE</b>.</p>`,
};

export function showIntro(f: FeatureId, n?: number, resumed = false): Promise<void> {
  return new Promise((res) => {
    const el = open(`
      <img class="title-img" src="${G(TITLE_IMG[f])}" alt="${FEATURE_NAMES[f]}" />
      ${resumed ? '<p class="sub">RESUMING YOUR FEATURE</p>' : ''}
      ${INTRO_TEXT[f](n)}
      <div class="btn-row"><button class="gold-btn" data-go>${resumed ? 'CONTINUE' : 'START'}</button></div>`);
    onClick(el, '[data-go]', () => {
      closeOverlay();
      res();
    });
  });
}

export function showOutro(f: FeatureId, win: number, extra = ''): Promise<void> {
  return new Promise((res) => {
    const el = open(`
      <img class="title-img" src="${G(TITLE_IMG[f])}" alt="" />
      <p class="sub">FEATURE COMPLETE</p>
      <div class="big-num" id="outro-num">0.00</div>
      ${extra}
      <div class="btn-row"><button class="gold-btn" data-go>COLLECT</button></div>`);
    const num = el.querySelector('#outro-num')!;
    const t0 = performance.now();
    const dur = win > 0 ? 1600 : 1;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      num.textContent = money(Math.round(win * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    step();
    sound.play('feature_end');
    onClick(el, '[data-go]', () => {
      closeOverlay();
      res();
    });
  });
}

export function showChoice(options: FeatureId[], resumed = false): Promise<FeatureId> {
  return new Promise((res) => {
    const el = open(`
      <h2>CHOOSE YOUR LEGEND</h2>
      <p>${resumed ? 'Resuming: ' : ''}More than one bonus was triggered. Choose one feature – the others are not carried over.</p>
      <div class="choice-grid">${options
        .map((f) => `<button class="choice-card" data-f="${f}"><img src="${G(TITLE_IMG[f])}" alt="" /><span>${FEATURE_NAMES[f]}</span></button>`)
        .join('')}</div>`);
    sound.play('trigger');
    el.querySelectorAll<HTMLElement>('[data-f]').forEach((b) =>
      b.addEventListener('click', () => {
        sound.play('click');
        closeOverlay();
        res(b.dataset.f as FeatureId);
      }),
    );
  });
}

export function confirmBuy(f: FeatureId, price: number, balance: number, multiple: number): Promise<boolean> {
  return new Promise((res) => {
    const ok = price <= balance;
    const el = open(`
      <img class="title-img" src="${G(TITLE_IMG[f])}" alt="" style="height:min(260px,34vh)" />
      <h2>BUY ${FEATURE_NAMES[f].toUpperCase()}?</h2>
      <div class="big-num">${money(price)}</div>
      <p class="sub">${multiple}× CURRENT BET</p>
      <p class="note">Balance: ${money(balance)} · The price is deducted immediately. Bonus Buy does not guarantee a win. Prices are illustrative development values.</p>
      ${ok ? '' : '<p style="color:#ff8a7a"><b>Insufficient balance for this purchase.</b></p>'}
      <div class="btn-row">
        <button class="gold-btn secondary" data-no>CANCEL</button>
        ${ok ? '<button class="gold-btn" data-yes>CONFIRM</button>' : ''}
      </div>`);
    onClick(el, '[data-no]', () => {
      closeOverlay();
      res(false);
    });
    onClick(el, '[data-yes]', () => {
      closeOverlay();
      res(true);
    });
  });
}

export function showAutoplay(options: number[]): Promise<number | null> {
  return new Promise((res) => {
    const el = open(`
      <h2>AUTOPLAY</h2>
      <p>Number of spins. Autoplay stops when a feature triggers, on insufficient balance, or when you press Spin.</p>
      <div class="auto-grid">${options.map((n) => `<button class="gold-btn" data-n="${n}">${n}</button>`).join('')}</div>
      <div class="btn-row"><button class="gold-btn secondary" data-no>CANCEL</button></div>`);
    el.querySelectorAll<HTMLElement>('[data-n]').forEach((b) =>
      b.addEventListener('click', () => {
        sound.play('click');
        closeOverlay();
        res(Number(b.dataset.n));
      }),
    );
    onClick(el, '[data-no]', () => {
      closeOverlay();
      res(null);
    });
  });
}

export function showPaytable(bet: number) {
  const lineBet = bet / PAYLINES.length;
  const sym = (id: SymbolId) => {
    const s = SYMBOLS[id];
    const p = s.pays!;
    return `<div class="pay-item"><span class="sym">${SYM(s.texture, 84, 76)}</span><div class="txt"><div class="nm">${s.name}</div>
      5× <b>${money(p[5] * lineBet)}</b><br/>4× <b>${money(p[4] * lineBet)}</b><br/>3× <b>${money(p[3] * lineBet)}</b></div></div>`;
  };
  const lines = PAYLINES.map(
    (l, i) => `<div class="line-cell"><div class="mini">${[0, 1, 2].map((row) => [0, 1, 2, 3, 4].map((r) => `<i class="${l[r] === row ? 'on' : ''}"></i>`).join('')).join('')}</div>${i + 1}</div>`,
  ).join('');
  const c = GAME_CONFIG;
  const el = open(
    `${CLOSE}
    <h2>PAYTABLE &amp; RULES</h2>
    <div class="tabs">${[['pt-sym', 'Symbols'], ['pt-esc', 'Great Escape'], ['pt-hid', 'Hideout'], ['pt-last', 'Last Stand'], ['pt-ev', 'Events'], ['pt-buy', 'Bonus Buy'], ['pt-lines', 'Paylines']].map(([id, l]) => `<button class="tab" data-jump="${id}">${l}</button>`).join('')}</div>
    <p style="text-align:center">Values shown for the current bet of <b>${money(bet)}</b> (${PAYLINES.length} fixed lines, line bet ${money(lineBet)}).</p>
    <h3 id="pt-sym">Premium symbols</h3><div class="pay-grid">${(['LAMP', 'MARIA', 'HAT', 'CART', 'REV', 'SANF'] as SymbolId[]).map(sym).join('')}</div>
    <h3>Low-paying symbols</h3><div class="pay-grid">${(['RIFL', 'FACA', 'CACT', 'CANT'] as SymbolId[]).map(sym).join('')}</div>
    <h3>Special symbols</h3>
    <div class="special-row"><span class="sym">${SYM('sym_wild', 104, 94)}</span><div><b>LAMPIÃO WILD</b> – appears on reels 2–5 and substitutes for all regular paying symbols (not for scatters). 5 Wilds pay ${money(SYMBOLS.WILD.pays![5] * lineBet)}.</div></div>
    <div class="special-row"><span class="sym">${SYM('sym_wanted', 104, 94)}</span><div><b>WANTED POSTER</b> – 3 / 4 / 5 anywhere trigger <b>THE GREAT ESCAPE</b> with ${c.greatEscape.spinsAwarded[3]} / ${c.greatEscape.spinsAwarded[4]} / ${c.greatEscape.spinsAwarded[5]} free spins.</div></div>
    <div class="special-row"><span class="sym">${SYM('sym_map', 104, 94)}</span><div><b>HIDEOUT MAP</b> – 3 or more anywhere trigger <b>THE HIDEOUT</b> pick bonus.</div></div>
    <div class="special-row"><span class="sym">${SYM('sym_emblem', 104, 94)}</span><div><b>CANGACEIRO EMBLEM</b> – 3 or more anywhere trigger <b>THE LAST STAND</b> Hold &amp; Respin. Landed emblems become the first locked gold symbols.</div></div>
    <h3 id="pt-esc">The Great Escape – Free Spins</h3>
    <p>Lampião Wilds expand to cover their reel. Every spin where an expanding Wild contributes to a win increases the Escape Multiplier by +${c.greatEscape.multiplierStep}× (start ${c.greatEscape.multiplierStart}×, max ${c.greatEscape.multiplierCap}×); it applies to wins that include an expanding Wild and persists for the whole feature. The Cangaceiro Raid can randomly turn 1–2 reels Wild without using a spin. 3+ Wanted Posters award +${c.greatEscape.retriggerSpins} spins (max ${c.greatEscape.maxTotalSpins} spins total).</p>
    <h3 id="pt-hid">The Hideout – Pick Bonus</h3>
    <p>12 chests, ${c.hideout.initialPicks} picks. Chests may hide gold coins, multipliers (+1× / +2×), extra picks, Lampião's Treasure (${c.hideout.prizes.find((p) => p.type === 'treasure')?.value}× bet), Maria's Medallion (doubles the multiplier) or nothing. Collecting both the Treasure and the Medallion unlocks the Couple's Fortune (+${c.hideout.couplesFortune}× bet). Feature award = collected gold × multiplier. Collected prizes are never lost.</p>
    <h3 id="pt-last">The Last Stand – Hold &amp; Respin</h3>
    <p>Starts with ${c.lastStand.initialRespins} respins on a dedicated 5×3 grid. Gold symbols lock; each new symbol resets the respins to ${c.lastStand.initialRespins}; a respin with no new symbol uses one respin. Multiplier symbols (2×, 3×, 5×, 10×) add together and multiply the total gold. Lampião's Emblem upgrades every locked multiplier one tier or awards extra gold positions. Filling all 15 positions awards the Grand Treasure (${c.lastStand.grandTreasure}× bet). Ends when respins run out, the grid is full, or the maximum win is reached.</p>
    <h3 id="pt-ev">Random events</h3>
    <p><b>Lampião's Arrival</b> – one reel (rarely two) turns completely Wild before wins are evaluated. <b>The Cangaceiros' Raid</b> – low-paying symbols transform into the same premium symbol: a matching group, a whole reel, or rarely several reels.</p>
    <h3 id="pt-buy">Bonus Buy</h3>
    <p>The Great Escape ${c.bonusBuy.prices.greatEscape}× bet · The Hideout ${c.bonusBuy.prices.hideout}× bet · The Last Stand ${c.bonusBuy.prices.lastStand}× bet. Available up to a total bet of ${money(c.bonusBuy.maxBetForBuy)}. The price is deducted on confirmation and the feature starts immediately.</p>
    <h3>Simultaneous triggers</h3><p>If more than one bonus triggers on the same spin, you choose one; the others are not carried over.</p>
    <h3 id="pt-lines">Paylines</h3><div class="lines-grid">${lines}</div>
    <h3>General</h3>
    <p>Wins pay left to right on adjacent reels starting from reel 1. Only the highest win per line is paid. Line wins are multiplied by the line bet. Maximum win ${c.maxWinMultiplier.toLocaleString()}× total bet per round (all entry routes); reaching it ends the round. Malfunction voids all pays and plays.</p>
    <div class="disclaimer"><b>DEVELOPMENT PROTOTYPE.</b> Simulated credits only, development RNG, not certified. RTP target ${(c.rtpTarget * 100).toFixed(2)}% and all values in this paytable are <b>unvalidated development defaults</b> pending the certified mathematical model.</div>
    <div class="btn-row"><button class="gold-btn" data-x>CLOSE</button></div>`,
    'wide',
  );
  onClick(el, '[data-x]', closeOverlay);
  el.querySelectorAll<HTMLElement>('[data-jump]').forEach((b) =>
    b.addEventListener('click', () => {
      sound.play('click');
      el.querySelector('#' + b.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }),
  );
}

export function showHistory(rounds: RoundRecord[]) {
  const rows = rounds
    .slice(-25)
    .reverse()
    .map(
      (r) =>
        `<tr><td>${r.roundId.slice(-8)}</td><td>${r.type === 'buy' ? 'BUY ' : ''}${r.feature ? FEATURE_NAMES[r.feature] : 'Base'}</td><td>${money(r.bet)}</td><td>${money(r.cost)}</td><td>${money(r.totalWin)}</td><td>${r.balanceAfter !== null ? money(r.balanceAfter) : '–'}</td><td>${r.status}</td></tr>`,
    )
    .join('');
  const el = open(
    `${CLOSE}<h2>ROUND HISTORY</h2>
     <table class="ledger"><tr><th>Round</th><th>Type</th><th>Bet</th><th>Cost</th><th>Win</th><th>Balance</th><th>Status</th></tr>${rows || '<tr><td colspan="7">No rounds yet</td></tr>'}</table>
     <p class="note">Simulated wallet ledger (development). Every round records stake/purchase, outcome, payout and balance.</p>
     <div class="btn-row"><button class="gold-btn" data-x>CLOSE</button></div>`,
    'wide',
  );
  onClick(el, '[data-x]', closeOverlay);
}

export interface DevActions {
  force: (what: string) => void;
  reset: () => void;
  rngLabel: string;
}
export function showDev(a: DevActions) {
  const opts: [string, string][] = [
    ['greatEscape', 'Next spin: 3 Wanted Posters'],
    ['greatEscape5', 'Next spin: 5 Wanted Posters'],
    ['hideout', 'Next spin: 3 Hideout Maps'],
    ['lastStand', 'Next spin: 3 Emblems'],
    ['multi', 'Next spin: Maps + Emblems (choice)'],
    ['arrival', "Next spin: Lampião's Arrival"],
    ['raid', "Next spin: Cangaceiros' Raid"],
    ['fsRaid', 'Next free spin: Cangaceiro Raid'],
  ];
  const el = open(
    `${CLOSE}<h2>QA / DEVELOPER PANEL</h2>
     <p class="note">Forced outcomes are a development-only tool (GAME_CONFIG.dev.allowForcedOutcomes). They are requested from the engine – the engine still generates and settles the round.</p>
     <div class="dev-grid">${opts.map(([k, l]) => `<button class="gold-btn" data-k="${k}">${l}</button>`).join('')}
       <button class="gold-btn secondary" data-reset>Reset simulated wallet</button></div>
     <p class="note">RNG: ${a.rngLabel}</p>
     <div class="btn-row"><button class="gold-btn" data-x>CLOSE</button></div>`,
  );
  el.querySelectorAll<HTMLElement>('[data-k]').forEach((b) =>
    b.addEventListener('click', () => {
      sound.play('click');
      closeOverlay();
      a.force(b.dataset.k!);
    }),
  );
  onClick(el, '[data-reset]', () => {
    closeOverlay();
    a.reset();
  });
  onClick(el, '[data-x]', closeOverlay);
}

export function showMessage(title: string, html: string, btn = 'OK'): Promise<void> {
  return new Promise((res) => {
    const el = open(`<h2>${title}</h2>${html}<div class="btn-row"><button class="gold-btn" data-go>${btn}</button></div>`);
    onClick(el, '[data-go]', () => {
      closeOverlay();
      res();
    });
  });
}

/** Sound settings: separate Music / SFX volume + mute. */
export function showSoundSettings(onChange: () => void) {
  const pct = (v: number) => Math.round(v * 100);
  const el = open(`${CLOSE}<h2>SOUND</h2>
    <div class="setting"><img src="./ui/ic_music.webp" alt=""/><div><label for="vol-music">MUSIC</label><input id="vol-music" type="range" min="0" max="100" value="${pct(sound.musicVolume)}"/></div><output id="o-music">${pct(sound.musicVolume)}%</output></div>
    <div class="setting"><img src="./ui/ic_sound.webp" alt=""/><div><label for="vol-sfx">SOUND EFFECTS</label><input id="vol-sfx" type="range" min="0" max="100" value="${pct(sound.sfxVolume)}"/></div><output id="o-sfx">${pct(sound.sfxVolume)}%</output></div>
    <label class="switch"><input id="mute" type="checkbox" ${sound.muted ? 'checked' : ''}/><i></i>MUTE ALL</label>
    <div class="btn-row"><button class="gold-btn" data-x>DONE</button></div>`);
  const bind = (id: string, out: string, fn: (v: number) => void) => {
    const inp = el.querySelector<HTMLInputElement>('#' + id)!;
    const o = el.querySelector('#' + out)!;
    const upd = () => {
      inp.style.setProperty('--v', inp.value + '%');
      o.textContent = inp.value + '%';
    };
    upd();
    inp.addEventListener('input', () => {
      fn(Number(inp.value) / 100);
      upd();
      onChange();
    });
    inp.addEventListener('change', () => sound.play('coin'));
  };
  bind('vol-music', 'o-music', (v) => sound.setMusicVolume(v));
  bind('vol-sfx', 'o-sfx', (v) => sound.setSfxVolume(v));
  el.querySelector<HTMLInputElement>('#mute')!.addEventListener('change', (e) => {
    sound.setMuted((e.target as HTMLInputElement).checked);
    onChange();
  });
  onClick(el, '[data-x]', closeOverlay);
}
