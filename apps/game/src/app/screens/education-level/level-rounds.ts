import type { Container } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import type { AppScreenConstructor } from '../../../engine/navigation/navigation';
import useSessionStore from '../../../zustandStores/sessionStore';
import { finishLevel } from '../level-flow';
import type { TLevel } from '../level-map/units';

/**
 * Where a multi-round level is. Some education levels show each round as a fresh screen, so
 * the shuffled order and the round reached have to outlive the screen. They belong to one
 * level and one attempt at it: the loading screen starts a session for every attempt, so
 * quitting part way, retrying, or opening another level starts the rounds over.
 */
export class LevelRounds<T> {
  private index = 0;
  private readonly levelId: number;
  private readonly attempt: number;
  private readonly order: readonly T[];

  private constructor(levelId: number, attempt: number, order: readonly T[]) {
    this.levelId = levelId;
    this.attempt = attempt;
    this.order = order;
  }

  private static current?: LevelRounds<unknown>;

  /** This attempt's rounds of `level`, ordered by `createOrder` on its first round. */
  public static of<T>(level: TLevel, createOrder: () => T[]): LevelRounds<T> {
    const { attempt } = useSessionStore.getState();
    const current = LevelRounds.current;
    if (current?.levelId === level.id && current.attempt === attempt) {
      return current as LevelRounds<T>;
    }
    const rounds = new LevelRounds(level.id, attempt, createOrder());
    LevelRounds.current = rounds;
    return rounds;
  }

  /** This round's item; undefined when the level has nothing to play. */
  public get item(): T | undefined {
    return this.order[this.index];
  }

  public get count() {
    return this.order.length;
  }

  /** Move to the next round. False when that was the last one. */
  public advance(): boolean {
    this.index += 1;
    return this.index < this.order.length;
  }
}

/**
 * End a round of a level that shows each round as a fresh `screen`: open the next round, or
 * finish the level after the last one. Ignored once `screen` has left, so a round resolving
 * after the player quit changes nothing.
 */
export function finishRound(
  screen: Container,
  ctor: AppScreenConstructor<[TLevel]>,
  level: TLevel,
  rounds: LevelRounds<unknown>,
) {
  if (screen.destroyed || engine().navigation.currentScreen !== screen) return;
  if (rounds.advance()) void engine().navigation.showScreen(ctor, level);
  else finishLevel(screen, level);
}
