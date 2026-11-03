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

const TITLE_IMG: Record<FeatureId, string> = { greatEscape: 'title_escape', hideout: 'title_hideout', lastStand: 'title_last' };

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
const ENGINE_MSG: Record<string, string> = {
  'Insufficient balance': 'Saldo insuficiente',
  'Insufficient balance for this purchase': 'Saldo insuficiente para esta compra',
  'Bet too high for Bonus Buy': 'Aposta alta demais para a compra de bônus',
  'Bonus Buy is not available': 'Compra de bônus indisponível',
  'Request already in flight': 'Aguarde…',
  'Forced outcomes are disabled': 'Resultados forçados desativados',
};
export function toast(msg: string, ms = 2200) {
  msg = ENGINE_MSG[msg] ?? (msg.startsWith('Action ') ? 'Ação indisponível agora' : msg);
  const t = document.getElementById('toast')!;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), ms);
}

const INTRO_TEXT: Record<FeatureId, (n?: number) => string> = {
  greatEscape: (n) =>
    `<div class="big-num">${n} GIROS GRÁTIS</div>
     <p>Os Wilds de Lampião <b>se expandem</b> e cobrem o rolo inteiro. Cada giro vencedor com um Wild expandido aumenta o <b>Multiplicador de Fuga</b> em +1× (máx. ${GAME_CONFIG.greatEscape.multiplierCap}×) – ele nunca é zerado.</p>
     <p>O <b>Ataque dos Cangaceiros</b> pode transformar rolos inteiros em Wild. 3+ Cartazes de Procurados concedem <b>+${GAME_CONFIG.greatEscape.retriggerSpins} giros</b>.</p>`,
  hideout: () =>
    `<div class="big-num">${GAME_CONFIG.hideout.initialPicks} ESCOLHAS</div>
     <p>Escolha baús no esconderijo secreto dos cangaceiros. Encontre ouro, multiplicadores e escolhas extras.</p>
     <p>Reúna o <b>Tesouro de Lampião</b> e o <b>Medalhão de Maria</b> para desbloquear a <b>Fortuna do Casal</b>. Prêmios já ganhos nunca são perdidos.</p>`,
  lastStand: () =>
    `<div class="big-num">${GAME_CONFIG.lastStand.initialRespins} REGIROS</div>
     <p>Os símbolos de ouro ficam presos. Cada novo símbolo de ouro reinicia os regiros para ${GAME_CONFIG.lastStand.initialRespins}.</p>
     <p>Multiplicadores <b>2× 3× 5× 10×</b> se somam e multiplicam seu ouro. O <b>Emblema de Lampião</b> melhora multiplicadores ou adiciona ouro. Preencha as 15 posições para o <b>GRANDE TESOURO</b>.</p>`,
};

export function showIntro(f: FeatureId, n?: number, resumed = false): Promise<void> {
  return new Promise((res) => {
    const el = open(`
      <img class="title-img" src="${G(TITLE_IMG[f])}" alt="${FEATURE_NAMES[f]}" />
      ${resumed ? '<p class="sub">RETOMANDO SEU BÔNUS</p>' : ''}
      ${INTRO_TEXT[f](n)}
      <div class="btn-row"><button class="gold-btn" data-go>${resumed ? 'CONTINUAR' : 'COMEÇAR'}</button></div>`);
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
      <p class="sub">BÔNUS CONCLUÍDO</p>
      <div class="big-num" id="outro-num">0.00</div>
      ${extra}
      <div class="btn-row"><button class="gold-btn" data-go>COLETAR</button></div>`);
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
      <h2>ESCOLHA SUA LENDA</h2>
      <p>${resumed ? 'Retomando: ' : ''}Mais de um bônus foi ativado. Escolha um – os outros não são acumulados.</p>
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
      <img class="title-img" src="${G(TITLE_IMG[f])}" alt="" style="width:min(300px,60vw)" />
      <h2>COMPRAR ${FEATURE_NAMES[f].toUpperCase()}?</h2>
      <div class="big-num">${money(price)}</div>
      <p class="sub">${multiple}× A APOSTA ATUAL</p>
      <p class="note">Saldo: ${money(balance)} · O preço é debitado imediatamente. A compra de bônus não garante ganho. Os preços são valores ilustrativos de desenvolvimento.</p>
      ${ok ? '' : '<p style="color:#ff8a7a"><b>Saldo insuficiente para esta compra.</b></p>'}
      <div class="btn-row">
        <button class="gold-btn secondary" data-no>CANCELAR</button>
        ${ok ? '<button class="gold-btn" data-yes>CONFIRMAR</button>' : ''}
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
      <h2>JOGO AUTOMÁTICO</h2>
      <p>Número de giros. O jogo automático para quando um bônus é ativado, com saldo insuficiente ou ao tocar em Girar.</p>
      <div class="auto-grid">${options.map((n) => `<button class="gold-btn" data-n="${n}">${n}</button>`).join('')}</div>
      <div class="btn-row"><button class="gold-btn secondary" data-no>CANCELAR</button></div>`);
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
    <h2>TABELA DE PAGAMENTOS &amp; REGRAS</h2>
    <div class="tabs">${[['pt-sym', 'Símbolos'], ['pt-esc', 'Grande Fuga'], ['pt-hid', 'Esconderijo'], ['pt-last', 'Último Combate'], ['pt-ev', 'Eventos'], ['pt-buy', 'Compra de Bônus'], ['pt-lines', 'Linhas']].map(([id, l]) => `<button class="tab" data-jump="${id}">${l}</button>`).join('')}</div>
    <p style="text-align:center">Valores para a aposta atual de <b>${money(bet)}</b> (${PAYLINES.length} linhas fixas, aposta por linha ${money(lineBet)}).</p>
    <h3 id="pt-sym">Símbolos premium</h3><div class="pay-grid">${(['LAMP', 'MARIA', 'HAT', 'CART', 'REV', 'SANF'] as SymbolId[]).map(sym).join('')}</div>
    <h3>Símbolos de pagamento baixo</h3><div class="pay-grid">${(['RIFL', 'FACA', 'CACT', 'CANT'] as SymbolId[]).map(sym).join('')}</div>
    <h3>Símbolos especiais</h3>
    <div class="special-row"><span class="sym">${SYM('sym_wild', 104, 94)}</span><div><b>WILD LAMPIÃO</b> – aparece nos rolos 2–5 e substitui todos os símbolos pagantes comuns (não substitui scatters). 5 Wilds pagam ${money(SYMBOLS.WILD.pays![5] * lineBet)}.</div></div>
    <div class="special-row"><span class="sym">${SYM('sym_wanted', 104, 94)}</span><div><b>CARTAZ DE PROCURADOS</b> – 3 / 4 / 5 em qualquer posição ativam <b>A GRANDE FUGA</b> com ${c.greatEscape.spinsAwarded[3]} / ${c.greatEscape.spinsAwarded[4]} / ${c.greatEscape.spinsAwarded[5]} giros grátis.</div></div>
    <div class="special-row"><span class="sym">${SYM('sym_map', 104, 94)}</span><div><b>MAPA DO ESCONDERIJO</b> – 3 ou mais em qualquer posição ativam o bônus de escolha <b>O ESCONDERIJO</b>.</div></div>
    <div class="special-row"><span class="sym">${SYM('sym_emblem', 104, 94)}</span><div><b>EMBLEMA DO CANGAÇO</b> – 3 ou mais em qualquer posição ativam o Hold &amp; Respin <b>O ÚLTIMO COMBATE</b>. Os emblemas sorteados viram os primeiros símbolos de ouro presos.</div></div>
    <h3 id="pt-esc">A Grande Fuga – Giros Grátis</h3>
    <p>Os Wilds de Lampião se expandem e cobrem o rolo. Cada giro em que um Wild expandido participa de um ganho aumenta o Multiplicador de Fuga em +${c.greatEscape.multiplierStep}× (início ${c.greatEscape.multiplierStart}×, máx. ${c.greatEscape.multiplierCap}×); ele vale para ganhos com Wild expandido e permanece durante todo o bônus. O Ataque dos Cangaceiros pode transformar 1–2 rolos em Wild sem gastar giro. 3+ Cartazes concedem +${c.greatEscape.retriggerSpins} giros (máx. ${c.greatEscape.maxTotalSpins} giros no total).</p>
    <h3 id="pt-hid">O Esconderijo – Bônus de Escolha</h3>
    <p>12 baús, ${c.hideout.initialPicks} escolhas. Os baús podem esconder moedas de ouro, multiplicadores (+1× / +2×), escolhas extras, o Tesouro de Lampião (${c.hideout.prizes.find((p) => p.type === 'treasure')?.value}× a aposta), o Medalhão de Maria (dobra o multiplicador) ou nada. Reunir o Tesouro e o Medalhão desbloqueia a Fortuna do Casal (+${c.hideout.couplesFortune}× a aposta). Prêmio do bônus = ouro coletado × multiplicador. Prêmios coletados nunca são perdidos.</p>
    <h3 id="pt-last">O Último Combate – Hold &amp; Respin</h3>
    <p>Começa com ${c.lastStand.initialRespins} regiros numa grade 5×3 própria. Os símbolos de ouro ficam presos; cada novo símbolo reinicia os regiros para ${c.lastStand.initialRespins}; um regiro sem símbolo novo consome um regiro. Os multiplicadores (2×, 3×, 5×, 10×) se somam e multiplicam o ouro total. O Emblema de Lampião sobe cada multiplicador preso um nível ou adiciona posições de ouro. Preencher as 15 posições concede o Grande Tesouro (${c.lastStand.grandTreasure}× a aposta). Termina quando os regiros acabam, a grade fica cheia ou o ganho máximo é atingido.</p>
    <h3 id="pt-ev">Eventos aleatórios</h3>
    <p><b>A Chegada de Lampião</b> – um rolo (raramente dois) vira Wild por inteiro antes da avaliação dos ganhos. <b>O Ataque dos Cangaceiros</b> – símbolos de pagamento baixo se transformam no mesmo símbolo premium: um grupo igual, um rolo inteiro ou, raramente, vários rolos.</p>
    <h3 id="pt-buy">Compra de Bônus</h3>
    <p>A Grande Fuga ${c.bonusBuy.prices.greatEscape}× a aposta · O Esconderijo ${c.bonusBuy.prices.hideout}× a aposta · O Último Combate ${c.bonusBuy.prices.lastStand}× a aposta. Disponível até uma aposta total de ${money(c.bonusBuy.maxBetForBuy)}. O preço é debitado na confirmação e o bônus começa imediatamente.</p>
    <h3>Ativações simultâneas</h3><p>Se mais de um bônus for ativado no mesmo giro, você escolhe um; os outros não são acumulados.</p>
    <h3 id="pt-lines">Linhas de pagamento</h3><div class="lines-grid">${lines}</div>
    <h3>Geral</h3>
    <p>Os ganhos pagam da esquerda para a direita em rolos adjacentes a partir do rolo 1. Apenas o maior ganho por linha é pago. Os ganhos de linha são multiplicados pela aposta por linha. Ganho máximo de ${c.maxWinMultiplier.toLocaleString('pt-BR')}× a aposta total por rodada (todas as formas de entrada); ao atingi-lo, a rodada termina. Mau funcionamento anula todos os pagamentos e jogadas.</p>
    <div class="disclaimer"><b>PROTÓTIPO DE DESENVOLVIMENTO.</b> Apenas créditos simulados, RNG de desenvolvimento, não certificado. RTP alvo de ${(c.rtpTarget * 100).toFixed(2).replace('.', ',')}% e todos os valores desta tabela são <b>padrões de desenvolvimento não validados</b>, pendentes do modelo matemático certificado.</div>
    <div class="btn-row"><button class="gold-btn" data-x>FECHAR</button></div>`,
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
        `<tr><td>${r.roundId.slice(-8)}</td><td>${r.type === 'buy' ? 'COMPRA ' : ''}${r.feature ? FEATURE_NAMES[r.feature] : 'Base'}</td><td>${money(r.bet)}</td><td>${money(r.cost)}</td><td>${money(r.totalWin)}</td><td>${r.balanceAfter !== null ? money(r.balanceAfter) : '–'}</td><td>${r.status === 'completed' ? 'concluída' : 'pendente'}</td></tr>`,
    )
    .join('');
  const el = open(
    `${CLOSE}<h2>HISTÓRICO DE RODADAS</h2>
     <table class="ledger"><tr><th>Rodada</th><th>Tipo</th><th>Aposta</th><th>Custo</th><th>Ganho</th><th>Saldo</th><th>Estado</th></tr>${rows || '<tr><td colspan="7">Nenhuma rodada ainda</td></tr>'}</table>
     <p class="note">Registro da carteira simulada (desenvolvimento). Cada rodada registra aposta/compra, resultado, pagamento e saldo.</p>
     <div class="btn-row"><button class="gold-btn" data-x>FECHAR</button></div>`,
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
    ['greatEscape', 'Próximo giro: 3 Cartazes'],
    ['greatEscape5', 'Próximo giro: 5 Cartazes'],
    ['hideout', 'Próximo giro: 3 Mapas'],
    ['lastStand', 'Próximo giro: 3 Emblemas'],
    ['multi', 'Próximo giro: Mapas + Emblemas (escolha)'],
    ['arrival', 'Próximo giro: Chegada de Lampião'],
    ['raid', 'Próximo giro: Ataque dos Cangaceiros'],
    ['fsRaid', 'Próximo giro grátis: Ataque'],
  ];
  const el = open(
    `${CLOSE}<h2>PAINEL DE QA / DESENVOLVIMENTO</h2>
     <p class="note">Resultados forçados são uma ferramenta apenas de desenvolvimento (GAME_CONFIG.dev.allowForcedOutcomes). Eles são pedidos ao motor – o motor ainda gera e liquida a rodada.</p>
     <div class="dev-grid">${opts.map(([k, l]) => `<button class="gold-btn" data-k="${k}">${l}</button>`).join('')}
       <button class="gold-btn secondary" data-reset>Reiniciar carteira simulada</button></div>
     <p class="note">RNG: ${a.rngLabel}</p>
     <div class="btn-row"><button class="gold-btn" data-x>FECHAR</button></div>`,
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
  const el = open(`${CLOSE}<h2>SOM</h2>
    <div class="setting"><img src="./ui/btn_music.svg" alt=""/><div><label for="vol-music">MÚSICA</label><input id="vol-music" type="range" min="0" max="100" value="${pct(sound.musicVolume)}"/></div><output id="o-music">${pct(sound.musicVolume)}%</output></div>
    <div class="setting"><img src="./ui/btn_sound.webp" alt=""/><div><label for="vol-sfx">EFEITOS SONOROS</label><input id="vol-sfx" type="range" min="0" max="100" value="${pct(sound.sfxVolume)}"/></div><output id="o-sfx">${pct(sound.sfxVolume)}%</output></div>
    <label class="switch"><input id="mute" type="checkbox" ${sound.muted ? 'checked' : ''}/><i></i>SILENCIAR TUDO</label>
    <div class="btn-row"><button class="gold-btn" data-x>PRONTO</button></div>`);
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
