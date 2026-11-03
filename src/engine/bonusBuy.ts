/**
 * Bonus Buy Manager – price calculation and purchase validation.
 * Prices come exclusively from config (GAME_CONFIG.bonusBuy.prices).
 */
import type { FeatureId, GameConfig } from '../config/gameConfig';
import { pickWeighted, type Rng } from './rng';

export class BonusBuyError extends Error {
  constructor(msg: string, public code: 'disabled' | 'betTooHigh' | 'insufficientFunds' | 'unknownFeature') {
    super(msg);
    this.name = 'BonusBuyError';
  }
}

export function buyPrice(cfg: GameConfig, feature: FeatureId, totalBet: number): number {
  const mult = cfg.bonusBuy.prices[feature];
  if (mult === undefined) throw new BonusBuyError('Unknown feature', 'unknownFeature');
  return mult * totalBet;
}

export function validateBuy(cfg: GameConfig, feature: FeatureId, totalBet: number, balance: number): number {
  if (!cfg.bonusBuy.enabled) throw new BonusBuyError('Bonus Buy is not available', 'disabled');
  if (totalBet > cfg.bonusBuy.maxBetForBuy) throw new BonusBuyError('Bet too high for Bonus Buy', 'betTooHigh');
  const price = buyPrice(cfg, feature, totalBet);
  if (price > balance) throw new BonusBuyError('Insufficient balance for this purchase', 'insufficientFunds');
  return price;
}

/** Number of Wanted Posters a bought Great Escape starts with. */
export function boughtEscapeScatters(rng: Rng, cfg: GameConfig): number {
  return pickWeighted<number>(rng, cfg.bonusBuy.greatEscapeScatters);
}
