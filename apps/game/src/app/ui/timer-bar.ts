import { RoundedProgressBar } from './rounded-progress-bar';

/** Green while over two thirds of the time is left, then orange, then red for the last third. */
export const TIMER_COLORS = { green: 0x7ed957, orange: 0xf5a623, red: 0xef5a42 } as const;

export type TimerBand = keyof typeof TIMER_COLORS;

/** Which third of its time a countdown is in, from the share of time left. */
export function timerBand(remaining: number): TimerBand {
  if (remaining > 2 / 3) return 'green';
  if (remaining > 1 / 3) return 'orange';
  return 'red';
}

type TimerBarOptions = Omit<
  NonNullable<ConstructorParameters<typeof RoundedProgressBar>[0]>,
  'trackColor' | 'fillColor'
>;

/** A countdown bar that empties and turns from green to orange to red as time runs out. */
export class TimerBar extends RoundedProgressBar {
  constructor(options: TimerBarOptions = {}) {
    super({ ...options, trackColor: TIMER_COLORS.green, fillColor: TIMER_COLORS.green });
    this.progress = 1;
  }

  /** Show the fraction of time left, from 1 (full) to 0. */
  public setRemaining(remaining: number) {
    this.setColors(TIMER_COLORS[timerBand(remaining)]);
    this.progress = remaining;
  }
}
