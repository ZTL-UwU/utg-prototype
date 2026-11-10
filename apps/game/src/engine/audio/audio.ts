import type { PlayOptions } from '@pixi/sound';
import { type htmlaudio, sound, type webaudio } from '@pixi/sound';
import { Assets } from 'pixi.js';

/** Seconds to cross-fade from one music track to the next. */
const FADE_SECONDS = 1;

/** Options for `BGM.play`, a subset of `@pixi/sound`'s `PlayOptions`. */
export type MusicOptions = Pick<PlayOptions, 'volume' | 'start' | 'loop'>;

/** A track being streamed: its element and, with Web Audio, the gain node that sets its level. */
interface Track {
  alias: string;
  element: HTMLAudioElement;
  /** The `volume` it was played with, before the music volume and the master volume. */
  volume: number;
  source?: MediaElementAudioSourceNode;
  gain?: GainNode;
}

/** The shared Web Audio context of `@pixi/sound`, or nothing when it fell back to HTML audio. */
function webAudio(): webaudio.WebAudioContext | undefined {
  return sound.useLegacy ? undefined : (sound.context as webaudio.WebAudioContext);
}

/**
 * Handles music background, playing only one audio file in loop at time,
 * and fade/stop the music if a new one is requested. Also provide volume
 * control for music background only, leaving other sounds volumes unchanged.
 *
 * Music is streamed from an `<audio>` element rather than loaded as a sound. A sound is
 * decoded whole into memory, about 61 MiB for the 3-minute main theme, and kept for the
 * session; the element decodes only as it plays. Its output goes through a gain node into
 * the same Web Audio graph as every other sound: iOS ignores `HTMLMediaElement.volume`, so
 * that gain is the only volume control that works there. Music files must therefore sit
 * outside any `{m}` bundle, so nothing loads them as sounds.
 */
export class BGM {
  /** Alias of the current music being played */
  public currentAlias?: string;
  /** Current music being played */
  private current?: Track;
  /** Current volume set */
  private volume = 1;
  /** Whether the app is in the background, which pauses the music. */
  private hidden = false;
  /** Whether a retry of a play the browser blocked is waiting on the first tap or key. */
  private awaitingGesture = false;

  constructor() {
    // Master volume and mute reach `@pixi/sound`'s own sounds through this event. The HTML
    // audio context emits it itself; the Web Audio one through `events`.
    const events = sound.useLegacy
      ? (sound.context as htmlaudio.HTMLAudioContext)
      : (sound.context as webaudio.WebAudioContext).events;
    events.on('refresh', () => this.applyLevel());
    // Music played alongside Web Audio would otherwise switch iOS to the "playback" audio
    // session: ignoring the silent switch and stopping the player's own music, unlike the
    // Web Audio-only game before. Safari 16.4+; elsewhere a no-op.
    const audioSession = (navigator as { audioSession?: { type: string } }).audioSession;
    if (audioSession) audioSession.type = 'ambient';
  }

  /** Play a background music, fading out and stopping the previous, if there is one */
  public async play(alias: string, options?: MusicOptions) {
    // Do nothing if the requested music is already being played
    if (this.currentAlias === alias) return;

    // Fade out then stop current music
    const previous = this.current;
    if (previous) {
      this.rampLevel(previous, 0, FADE_SECONDS);
      setTimeout(() => this.dispose(previous), FADE_SECONDS * 1000);
    }

    const element = new Audio();
    element.preload = 'auto';
    element.loop = options?.loop ?? true;
    // Resolves to the format this browser plays best (ogg or mp3), under the asset base path.
    element.src = Assets.resolver.resolveUrl(alias) as string;
    const start = options?.start ?? 0;
    if (start > 0) {
      element.addEventListener('loadedmetadata', () => (element.currentTime = start), {
        once: true,
      });
    }

    const track: Track = { alias, element, volume: options?.volume ?? 1 };
    const context = webAudio();
    if (context) {
      track.source = context.audioContext.createMediaElementSource(element);
      track.gain = context.audioContext.createGain();
      track.gain.gain.value = 0;
      track.source.connect(track.gain).connect(context.destination);
    } else {
      element.volume = 0;
    }

    this.current = track;
    this.currentAlias = alias;
    this.syncPlayback();
    // Fade in the new music
    this.rampLevel(track, this.level(track), FADE_SECONDS);
  }

  /** Get background music volume */
  public getVolume() {
    return this.volume;
  }

  /**
   * Set background music volume. At 0 the music pauses instead of playing silently, so
   * screens that mute it for their own audio cost nothing, and it resumes where it left off.
   */
  public setVolume(v: number) {
    this.volume = v;
    this.applyLevel();
    this.syncPlayback();
  }

  /** Pause the music while the app is in the background, and resume it after. */
  public setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.syncPlayback();
  }

  /** The level a track plays at: its own volume, the music volume and the master volume. */
  private level(track: Track) {
    const master = sound.context.muted ? 0 : sound.volumeAll;
    return track.volume * this.volume * master;
  }

  /** Move the current track to its level at once, cancelling any fade still running. */
  private applyLevel() {
    if (this.current) this.rampLevel(this.current, this.level(this.current), 0);
  }

  private rampLevel(track: Track, target: number, seconds: number) {
    const context = webAudio();
    if (!track.gain || !context) {
      // HTML audio only: no fades, and it fails on iOS, which always has Web Audio anyway.
      track.element.volume = Math.min(1, target);
      return;
    }
    const level = track.gain.gain;
    const now = context.audioContext.currentTime;
    level.cancelScheduledValues(now);
    if (seconds > 0) {
      level.setValueAtTime(level.value, now);
      level.linearRampToValueAtTime(target, now + seconds);
    } else {
      level.setValueAtTime(target, now);
    }
  }

  /** Play or pause the current track to match the volume and whether the app is visible. */
  private syncPlayback() {
    const element = this.current?.element;
    if (!element) return;

    if (this.volume === 0 || this.hidden) {
      element.pause();
      return;
    }
    if (!element.paused) return;
    element.play().catch((error: unknown) => {
      // Autoplay policy: no audio until the player has interacted with the page. The Web
      // Audio context unlocks on the same first touch, so retry then.
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.retryOnFirstGesture();
      } else if (!(error instanceof DOMException && error.name === 'AbortError')) {
        // AbortError only means a pause interrupted the play, which is expected.
        console.warn('[audio] Music failed to play', error);
      }
    });
  }

  private retryOnFirstGesture() {
    if (this.awaitingGesture) return;
    this.awaitingGesture = true;
    const retry = () => {
      this.awaitingGesture = false;
      for (const type of ['pointerdown', 'keydown'] as const) {
        document.removeEventListener(type, retry, true);
      }
      this.syncPlayback();
    };
    for (const type of ['pointerdown', 'keydown'] as const) {
      document.addEventListener(type, retry, true);
    }
  }

  private dispose(track: Track) {
    track.element.pause();
    // Dropping the source stops the download and frees the decoder.
    track.element.removeAttribute('src');
    track.element.load();
    track.source?.disconnect();
    track.gain?.disconnect();
  }
}

/**
 * Handles short sound special effects, mainly for having its own volume settings.
 * The volume control is only a workaround to make it work only with this type of sound,
 * with a limitation of not controlling volume of currently playing instances - only the new ones will
 * have their volume changed. But because most of sound effects are short sounds, this is generally fine.
 */
export class SFX {
  /** Volume scale for new instances */
  private volume = 1;

  /** Play an one-shot sound effect */
  public play(alias: string, options?: PlayOptions) {
    const volume = this.volume * (options?.volume ?? 1);
    return sound.play(alias, { ...options, volume });
  }

  /** Stop playing an SFX */
  public stop(alias: string) {
    sound.stop(alias);
  }

  /** Set sound effects volume */
  public getVolume() {
    return this.volume;
  }

  /** Set sound effects volume. Does not affect instances that are currently playing */
  public setVolume(v: number) {
    this.volume = v;
  }
}
