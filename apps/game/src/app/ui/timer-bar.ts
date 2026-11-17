import { RoundedProgressBar } from './rounded-progress-bar';

/** Green while over two thirds of the time is left, then orange, then red for the last third. */
export const TIMER_COLORS = { green: 0x7ed957, orange: 0xf5a623, red: 0xef5a42 } as const;

function timerColor(remaining: number) {
  if (remaining > 2 / 3) return TIMER_COLORS.green;
  if (remaining > 1 / 3) return TIMER_COLORS.orange;
  return TIMER_COLORS.red;
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
    this.setColors(timerColor(remaining));
    this.progress = remaining;
  }
}
