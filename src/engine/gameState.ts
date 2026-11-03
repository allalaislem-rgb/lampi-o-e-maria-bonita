/**
 * Game State Manager – the authoritative phase machine.
 *
 *   IDLE ──spin──▶ IDLE (no trigger, round settled)
 *        ──spin──▶ GREAT_ESCAPE | HIDEOUT | LAST_STAND (single trigger)
 *        ──spin──▶ BONUS_CHOICE ──choose──▶ feature  (simultaneous triggers)
 *        ──buy───▶ feature
 *   feature ──(feature ends)──▶ IDLE (round settled, payout credited once)
 */
import type { FeatureId } from '../config/gameConfig';

export type Phase = 'IDLE' | 'BONUS_CHOICE' | 'GREAT_ESCAPE' | 'HIDEOUT' | 'LAST_STAND';

export const FEATURE_PHASE: Record<FeatureId, Phase> = {
  greatEscape: 'GREAT_ESCAPE',
  hideout: 'HIDEOUT',
  lastStand: 'LAST_STAND',
};

export type Action = 'spin' | 'buy' | 'setBet' | 'choose' | 'freeSpin' | 'pick' | 'respin';

const ALLOWED: Record<Phase, Action[]> = {
  IDLE: ['spin', 'buy', 'setBet'],
  BONUS_CHOICE: ['choose'],
  GREAT_ESCAPE: ['freeSpin'],
  HIDEOUT: ['pick'],
  LAST_STAND: ['respin'],
};

const TRANSITIONS: Record<Phase, Phase[]> = {
  IDLE: ['IDLE', 'BONUS_CHOICE', 'GREAT_ESCAPE', 'HIDEOUT', 'LAST_STAND'],
  BONUS_CHOICE: ['GREAT_ESCAPE', 'HIDEOUT', 'LAST_STAND'],
  GREAT_ESCAPE: ['GREAT_ESCAPE', 'IDLE'],
  HIDEOUT: ['HIDEOUT', 'IDLE'],
  LAST_STAND: ['LAST_STAND', 'IDLE'],
};

export class InvalidStateError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'InvalidStateError';
  }
}

export class GameStateMachine {
  constructor(public phase: Phase = 'IDLE') {}
  assertCan(action: Action) {
    if (!ALLOWED[this.phase].includes(action)) throw new InvalidStateError(`Action "${action}" not allowed in phase ${this.phase}`);
  }
  can(action: Action) {
    return ALLOWED[this.phase].includes(action);
  }
  go(next: Phase) {
    if (!TRANSITIONS[this.phase].includes(next)) throw new InvalidStateError(`Illegal transition ${this.phase} → ${next}`);
    this.phase = next;
  }
}
