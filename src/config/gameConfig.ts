/**
 * ============================================================================
 *  LAMPIÃO & MARIA BONITA – THE LEGEND OF THE SERTÃO
 *  Centralised game configuration.
 * ============================================================================
 *
 *  !!! DEVELOPMENT DEFAULTS – NOT A CERTIFIED MATHEMATICAL MODEL !!!
 *
 *  Every number in this file marked `DEV DEFAULT` was chosen by the development
 *  team so the prototype is playable and *roughly* in the GDD's target area.
 *  They MUST be replaced by values produced and validated by the game
 *  mathematician (see docs/MATH_ASSUMPTIONS.md and `npm run sim`).
 *
 *  GDD targets (unvalidated): RTP 96.20 %, max win 10 000× total bet,
 *  high volatility overall.
 *
 *  All money is handled in integer minor units (cents) throughout the engine.
 * ============================================================================
 */

export type SymbolId =
  | 'LAMP' | 'MARIA' | 'HAT' | 'CART' | 'REV' | 'SANF'
  | 'RIFL' | 'FACA' | 'CACT' | 'CANT'
  | 'WILD' | 'WANT' | 'MAP' | 'EMBL';

export type FeatureId = 'greatEscape' | 'hideout' | 'lastStand';

export interface SymbolDef {
  id: SymbolId;
  name: string;
  kind: 'premium' | 'low' | 'wild' | 'scatter';
  /** Line pays, multiples of the LINE bet, indexed by match count (3, 4, 5). */
  pays?: { 3: number; 4: number; 5: number };
  /** Texture key (see public/assets). */
  texture: string;
  /** For scatters: which feature they trigger. */
  triggers?: FeatureId;
}

export const SYMBOLS: Record<SymbolId, SymbolDef> = {
  // ---------------- premium ----------------                       DEV DEFAULT pays
  LAMP: { id: 'LAMP', name: 'Lampião', kind: 'premium', texture: 'sym_lampiao', pays: { 3: 60, 4: 250, 5: 1250 } },
  MARIA: { id: 'MARIA', name: 'Maria Bonita', kind: 'premium', texture: 'sym_maria', pays: { 3: 50, 4: 200, 5: 900 } },
  HAT: { id: 'HAT', name: 'Chapéu de Couro', kind: 'premium', texture: 'sym_hat', pays: { 3: 40, 4: 150, 5: 600 } },
  CART: { id: 'CART', name: 'Cartucheira', kind: 'premium', texture: 'sym_cartucheira', pays: { 3: 30, 4: 120, 5: 450 } },
  REV: { id: 'REV', name: 'Revólver', kind: 'premium', texture: 'sym_revolver', pays: { 3: 25, 4: 90, 5: 350 } },
  SANF: { id: 'SANF', name: 'Sanfona', kind: 'premium', texture: 'sym_sanfona', pays: { 3: 20, 4: 75, 5: 300 } },
  // ---------------- low ----------------
  RIFL: { id: 'RIFL', name: 'Rifles Cruzados', kind: 'low', texture: 'sym_rifles', pays: { 3: 15, 4: 45, 5: 150 } },
  FACA: { id: 'FACA', name: 'Facão', kind: 'low', texture: 'sym_facao', pays: { 3: 12, 4: 40, 5: 120 } },
  CACT: { id: 'CACT', name: 'Mandacaru', kind: 'low', texture: 'sym_cactus', pays: { 3: 10, 4: 30, 5: 90 } },
  CANT: { id: 'CANT', name: 'Cantil', kind: 'low', texture: 'sym_cantil', pays: { 3: 10, 4: 30, 5: 90 } },
  // ---------------- special ----------------
  WILD: { id: 'WILD', name: 'Wild Lampião', kind: 'wild', texture: 'sym_wild', pays: { 3: 60, 4: 250, 5: 1250 } },
  WANT: { id: 'WANT', name: 'Cartaz de Procurados', kind: 'scatter', texture: 'sym_wanted', triggers: 'greatEscape' },
  MAP: { id: 'MAP', name: 'Mapa do Esconderijo', kind: 'scatter', texture: 'sym_map', triggers: 'hideout' },
  EMBL: { id: 'EMBL', name: 'Emblema do Cangaço', kind: 'scatter', texture: 'sym_emblem', triggers: 'lastStand' },
};

export const PREMIUM: SymbolId[] = ['LAMP', 'MARIA', 'HAT', 'CART', 'REV', 'SANF'];
export const LOW: SymbolId[] = ['RIFL', 'FACA', 'CACT', 'CANT'];
export const REGULAR: SymbolId[] = [...PREMIUM, ...LOW];
export const SCATTERS: SymbolId[] = ['WANT', 'MAP', 'EMBL'];

export const REELS = 5;
export const ROWS = 3;

/** 25 fixed paylines. Each entry is the row index (0 = top) for reels 1..5. */
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1], [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1], [1, 1, 2, 1, 1], [0, 0, 2, 0, 0], [2, 2, 0, 2, 2], [0, 2, 2, 2, 0],
  [2, 0, 0, 0, 2], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [1, 0, 2, 0, 1], [1, 2, 0, 2, 1],
];

/**
 * Per-reel symbol weights (independent weighted stops).            DEV DEFAULT
 * A real build would use certified reel strips; weights keep the prototype
 * tunable. Scatters are limited to one per reel by the generator.
 */
export type ReelWeights = Partial<Record<SymbolId, number>>[];

const baseReel = (wild: number, want: number, map: number, embl: number): Partial<Record<SymbolId, number>> => ({
  LAMP: 22, MARIA: 25, HAT: 30, CART: 33, REV: 36, SANF: 40,
  RIFL: 56, FACA: 58, CACT: 60, CANT: 62,
  WILD: wild, WANT: want, MAP: map, EMBL: embl,
});

export const BASE_REEL_WEIGHTS: ReelWeights = [
  baseReel(0, 8, 9, 7),
  baseReel(20, 8, 9, 7),
  baseReel(20, 8, 9, 7),
  baseReel(20, 8, 9, 7),
  baseReel(20, 8, 9, 7),
];

/** Great Escape reels: richer symbols, wilds expand. Other scatters removed. DEV DEFAULT */
const fsReel = (wild: number): Partial<Record<SymbolId, number>> => ({
  LAMP: 22, MARIA: 25, HAT: 30, CART: 33, REV: 36, SANF: 40,
  RIFL: 52, FACA: 54, CACT: 56, CANT: 58,
  WILD: wild, WANT: 7,
});
export const FREE_SPIN_REEL_WEIGHTS: ReelWeights = [fsReel(0), fsReel(28), fsReel(26), fsReel(24), fsReel(22)];

/** Bet ladder in cents (total bet). All values divisible by 25 so line bet is an integer. */
export const BET_LEVELS = [25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000];
export const DEFAULT_BET_INDEX = 2;

export const GAME_CONFIG = {
  id: 'lampiao-maria-bonita',
  version: '0.1.0-dev',
  certified: false,
  currency: 'FUN', // simulated play-money
  startingBalance: 100_000, // 1 000.00 FUN (cents)
  rtpTarget: 0.962, // GDD target, unvalidated
  /** Max win as a multiple of total bet, applied per round on every entry route. */
  maxWinMultiplier: 10_000, // GDD target, unvalidated
  betLevels: BET_LEVELS,
  defaultBetIndex: DEFAULT_BET_INDEX,
  autoplay: {
    enabled: true, // jurisdiction switch
    options: [10, 25, 50, 100],
    stopOnFeature: true,
  },
  /** Policy when more than one bonus triggers on the same spin (GDD §7). */
  simultaneousTriggerPolicy: 'playerChoice' as 'playerChoice',
  dev: {
    /** Shows the DEV panel to force outcomes for QA. Must be false in production. */
    allowForcedOutcomes: true,
  },

  // ------------------------------------------------------------------ bonuses
  greatEscape: {
    /** Wanted Posters landed → free spins */
    spinsAwarded: { 3: 10, 4: 12, 5: 15 } as Record<number, number>,
    retriggerSpins: 5, // 3+ posters during the feature
    retriggerMinScatters: 3,
    maxTotalSpins: 50, // DEV DEFAULT safety cap
    multiplierStart: 1,
    multiplierStep: 1,
    multiplierCap: 10,
    /**
     * 'wildWins': escape multiplier applies to line wins that include an expanding wild
     * (GDD: "An expanding Wild that contributes to a win activates the Escape Multiplier").
     */
    multiplierAppliesTo: 'wildWins' as 'wildWins' | 'allWins',
    /** Cangaceiro Raid – chance per free spin that extra reels become Wild. DEV DEFAULT */
    raidChance: 0.07,
    raidReelCountWeights: { 1: 80, 2: 20 } as Record<number, number>,
  },

  hideout: {
    chests: 12,
    initialPicks: 3,
    maxPicks: 8, // DEV DEFAULT cap on total picks (including extras)
    /** Prize table. Values are multiples of TOTAL bet. DEV DEFAULT */
    prizes: [
      { type: 'coins', weight: 46, values: [{ v: 6, w: 30 }, { v: 10, w: 28 }, { v: 15, w: 20 }, { v: 25, w: 13 }, { v: 40, w: 6 }, { v: 75, w: 3 }] },
      { type: 'multiplier', weight: 17, values: [{ v: 1, w: 75 }, { v: 2, w: 25 }] }, // adds +v to the bonus multiplier
      { type: 'extraPick', weight: 10, max: 2 },
      { type: 'treasure', weight: 5, max: 1, value: 60 }, // Lampião's treasure: fixed 60× bet
      { type: 'medallion', weight: 5, max: 1 }, // Maria's medallion: doubles the bonus multiplier
      { type: 'empty', weight: 13 },
    ],
    /** Couple's Fortune: extra reward when treasure + medallion are both collected (× bet). */
    couplesFortune: 100,
    multiplierStart: 1,
  },

  lastStand: {
    initialRespins: 3,
    /** Initial gold symbols when the feature is bought (natural trigger uses landed emblems). */
    boughtInitialCount: { 3: 70, 4: 22, 5: 8 } as Record<number, number>,
    /** Probability that an empty position lands a symbol on each respin. DEV DEFAULT */
    landChance: 0.098,
    /** What lands (weights). */
    symbolWeights: { coin: 86, mult: 9, emblem: 5 },
    /** Gold coin values, multiples of TOTAL bet. DEV DEFAULT */
    coinValues: [{ v: 1, w: 30 }, { v: 2, w: 26 }, { v: 3, w: 18 }, { v: 5, w: 12 }, { v: 10, w: 8 }, { v: 25, w: 4 }, { v: 50, w: 2 }],
    multiplierValues: [{ v: 2, w: 55 }, { v: 3, w: 25 }, { v: 5, w: 14 }, { v: 10, w: 6 }],
    /** Lampião's Emblem effects. */
    emblemEffects: { upgrade: 50, positions: 50 } as Record<'upgrade' | 'positions', number>,
    emblemPositions: { 1: 50, 2: 35, 3: 15 } as Record<number, number>,
    multiplierTiers: [2, 3, 5, 10],
    /** Filling all 15 positions awards the Grand Treasure (× bet, added after multipliers). */
    grandTreasure: 1000,
  },

  // ----------------------------------------------------------- random events
  randomEvents: {
    /** Lampião's Arrival – per base spin probability. DEV DEFAULT */
    arrivalChance: 0.012,
    arrivalReelCountWeights: { 1: 85, 2: 15 } as Record<number, number>,
    /** Reels eligible to turn Wild (0-based). */
    arrivalReels: [1, 2, 3, 4],
    /** The Cangaceiros' Raid – per base spin probability. DEV DEFAULT */
    raidChance: 0.02,
    raidModeWeights: { cluster: 55, reel: 35, multi: 10 } as Record<'cluster' | 'reel' | 'multi', number>,
    raidTargetWeights: { LAMP: 6, MARIA: 8, HAT: 20, CART: 22, REV: 22, SANF: 22 } as Partial<Record<SymbolId, number>>,
  },

  // --------------------------------------------------------------- bonus buy
  bonusBuy: {
    enabled: true, // market switch
    /** Illustrative prices – multiples of current total bet (GDD §4). */
    prices: { greatEscape: 100, hideout: 60, lastStand: 200 } as Record<FeatureId, number>,
    /** Maximum total bet allowed when buying (cents). */
    maxBetForBuy: 2000,
    /** Wanted Posters awarded when Great Escape is bought (weights). */
    greatEscapeScatters: { 3: 80, 4: 15, 5: 5 } as Record<number, number>,
  },
};

export type GameConfig = typeof GAME_CONFIG;

export const FEATURE_NAMES: Record<FeatureId, string> = {
  greatEscape: 'A Grande Fuga',
  hideout: 'O Esconderijo',
  lastStand: 'O Último Combate',
};
