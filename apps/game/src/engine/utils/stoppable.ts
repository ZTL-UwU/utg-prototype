import type { AnimationPlaybackControls } from 'motion';

/**
 * A motion animation that can be awaited and stopped. Its own `finished` never settles once it
 * is stopped, so a caller still awaiting it would hang for good; `done` settles either way.
 */
export class StoppableAnimation {
  public readonly done: Promise<void>;
  private readonly controls: AnimationPlaybackControls;
  private resolveStopped!: () => void;
  private stoppedFlag = false;

  constructor(controls: AnimationPlaybackControls) {
    this.controls = controls;
    const stopped = new Promise<void>((resolve) => (this.resolveStopped = resolve));
    this.done = Promise.race([controls.finished.then(() => undefined), stopped]);
  }

  /** True once `stop` cut it short, rather than it finishing. */
  public get stopped() {
    return this.stoppedFlag;
  }

  public stop() {
    this.stoppedFlag = true;
    this.controls.stop();
    this.resolveStopped();
  }
}
