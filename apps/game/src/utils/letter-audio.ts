import { sound } from '@pixi/sound';

import { engine } from '../engine/getEngine';

/** Shortest time a recording blocks the next one, for clips whose duration is not known yet. */
const MIN_PLAY_MS = 250;

/** The bundled recording of a letter, in the `education-letters-audio` bundle. */
export function getLetterAudioAlias(letter: string) {
  return `education-levels/education-letters-audio/${letter}.m4a`;
}

/**
 * Plays letter recordings one at a time: a play while one is going is ignored, so tapping the
 * sound button again does not stack copies. `stop` cuts the recording off, for a leaving screen.
 */
export class LetterAudioPlayer {
  private alias?: string;
  private timer?: ReturnType<typeof setTimeout>;

  public get isPlaying() {
    return this.alias !== undefined;
  }

  public play(letter: string) {
    const alias = getLetterAudioAlias(letter);
    if (this.alias || !sound.exists(alias)) return;
    this.alias = alias;
    const durationMs = Math.max(MIN_PLAY_MS, (sound.find(alias)?.duration ?? 0) * 1000);
    void engine().audio.sfx.play(alias);
    this.timer = setTimeout(() => {
      this.alias = undefined;
      this.timer = undefined;
    }, durationMs);
  }

  public stop() {
    if (this.alias && sound.exists(this.alias)) engine().audio.sfx.stop(this.alias);
    clearTimeout(this.timer);
    this.alias = undefined;
    this.timer = undefined;
  }
}
