/**
 * Bonus Manager – routes feature entry and exposes client-safe feature views.
 * Each feature is an independent module (features/*.ts) so it can be reused
 * by future Orbit Games titles.
 */
import type { FeatureId, GameConfig } from '../config/gameConfig';
import { startGreatEscape, type GreatEscapeState } from './features/greatEscape';
import { publicHideout, startHideout, type HideoutState } from './features/hideout';
import { startLastStand, totals, type LastStandState } from './features/lastStand';
import type { Rng } from './rng';

export type FeatureSession =
  | { feature: 'greatEscape'; state: GreatEscapeState; scatters: number }
  | { feature: 'hideout'; state: HideoutState }
  | { feature: 'lastStand'; state: LastStandState };

export interface FeatureEntry {
  /** Wanted Posters (Great Escape) */
  scatters?: number;
  /** Grid indices (reel*3+row) of landed emblems (Last Stand) */
  positions?: number[];
}

export function startFeature(rng: Rng, cfg: GameConfig, feature: FeatureId, entry: FeatureEntry): FeatureSession {
  switch (feature) {
    case 'greatEscape': {
      const n = entry.scatters ?? 3;
      return { feature, state: startGreatEscape(cfg.greatEscape, n), scatters: n };
    }
    case 'hideout':
      return { feature, state: startHideout(rng, cfg.hideout) };
    case 'lastStand':
      return { feature, state: startLastStand(rng, cfg.lastStand, entry.positions) };
  }
}

export type PublicFeature =
  | { feature: 'greatEscape'; spinsLeft: number; spinsTotal: number; spinsPlayed: number; multiplier: number; totalWin: number; scatters: number; lastGrid: string[][] | null }
  | ({ feature: 'hideout' } & ReturnType<typeof publicHideout>)
  | { feature: 'lastStand'; cells: LastStandState['cells']; respinsLeft: number; respinsPlayed: number; coinSum: number; multSum: number; ended: boolean };

export function publicFeature(s: FeatureSession | null): PublicFeature | null {
  if (!s) return null;
  switch (s.feature) {
    case 'greatEscape':
      return { feature: 'greatEscape', spinsLeft: s.state.spinsLeft, spinsTotal: s.state.spinsTotal, spinsPlayed: s.state.spinsPlayed, multiplier: s.state.multiplier, totalWin: s.state.totalWin, scatters: s.scatters, lastGrid: s.state.lastGrid };
    case 'hideout':
      return { feature: 'hideout', ...publicHideout(s.state) };
    case 'lastStand':
      return { feature: 'lastStand', cells: s.state.cells, respinsLeft: s.state.respinsLeft, respinsPlayed: s.state.respinsPlayed, ...totals(s.state.cells), ended: s.state.ended };
  }
}
