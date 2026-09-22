import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { convertToCurrentScript } from '../../../../utils/script';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import {
  getWordStandardAudioAlias,
  playWordAudio,
  REMOTE_WORDS_BUNDLE,
  resolveWordsByIds,
} from '../../../../zustandStores/wordStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { LevelMapScreen } from '../../level-map';
import { findMapUnitForLevel, getTypedLevel, type TLevel } from '../../level-map/units';
import { TypingWordCard } from './word-card';

const FEEDBACK_DURATION_MS = 350;

export type Round = {
  wordId: number;
  word: string;
  activeLetterIdx: number;
  hasImage: boolean;
  hasStandardAudio: boolean;
};

/**
 * Plays the word-only recording as a round starts, so the player hears the word then types
 * it. Fire-and-forget: playback must never gate input, and words without a standard
 * recording are simply silent.
 */
export function playRoundAudio(round: Round): void {
  if (!round.hasStandardAudio) return;
  void playWordAudio(getWordStandardAudioAlias(round.wordId));
}

/**
 *
 * Round[] to test particular edge cases in dev - uncomment and register in ctor when testing
 *
 */
// const DEV_TEST_ROUNDS: Round[] = [
//   { wordId: 1, word: 'ئايروپىلان', activeLetterIdx: 0 },
//   { wordId: 2, word: 'تاۋۇز', activeLetterIdx: 0 },
// ];
export function generateRoundsDictionary(wordIds: number[] = [], roundCount = 5): Round[] {
  const pool = resolveWordsByIds(wordIds)
    // .filter((word) => word.image_url)
    .map((word) => ({
      wordId: word.id,
      word: convertToCurrentScript(word.word.trim(), { autoCapitalize: false }),
      activeLetterIdx: 0,
      hasImage: !!word.image_url,
      hasStandardAudio: !!word.standard_audio_url,
    }));

  return [...pool].sort(() => Math.random() - 0.5).slice(0, roundCount);
}

export class TypingWordScreen extends Container {
  public readonly screenName = 'TypingWordScreen';
  public static assetBundles = ['typing-level-word', REMOTE_WORDS_BUNDLE];
  public static splashBackgroundAsset = 'typing-levels/typing-level-word/background.png';
  public static helpAssets = ['tutorial-popups/typing-tutorial.png'];
  private background: Sprite;
  private hud: HUD;
  private wordCard: TypingWordCard;
  private keyboard: KeyboardLayout;
  private rounds: Round[];
  private currentRound?: Round;
  private paused: boolean;
  private level: TLevel;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'typing-word');
    const mapUnit = findMapUnitForLevel(typedLevel);
    super();
    this.level = typedLevel;
    this.background = new Sprite({
      texture: Texture.from('typing-levels/typing-level-word/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          mascot: typedLevel.mascot,
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
        }),
      help: { kind: 'tutorial', mapUnit, presentation: 'popup' },
    });
    this.keyboard = new KeyboardLayout();
    this.rounds = generateRoundsDictionary(typedLevel.props.wordIds, typedLevel.props.roundCount);
    // this.rounds = DEV_TEST_ROUNDS; // uncomment to assign rounds to selected test set
    this.wordCard = new TypingWordCard();
    this.wordCard.layout = { position: 'absolute', left: 0, width: '100%' };
    this.addChild(this.background, this.hud, this.keyboard, this.wordCard);
    this.popAndStartRound();
    this.paused = false;
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    this.background.layout = { width, height };
    this.keyboard.resize(width, height);
    this.wordCard.layout = { top: height * 0.15 };
  }

  async show() {
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.playEnterAnimation();
  }

  async hide() {
    await this.pause();
    await this.keyboard.playExitAnimation();
  }
  async pause() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    await this.keyboard.pause();
  }

  async resume() {
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
    this.keyboard.setHintedLetter(this.currentTargetLetter);
  }

  private get currentTargetLetter(): string | undefined {
    if (!this.currentRound) return undefined;
    return this.currentRound.word[this.currentRound.activeLetterIdx];
  }

  // pops the next round from this.rounds and assigns it to currentRound, calls endRound if rounds is empty
  private popAndStartRound() {
    if (this.rounds.length === 0) this.endGame();
    this.currentRound = this.rounds.pop() ?? undefined;
    if (!this.currentRound) return;
    this.wordCard.setRound(this.currentRound); // always highlights first letter, letterIdx for new round always at 0
    this.keyboard.setHintedLetter(this.currentTargetLetter);
    playRoundAudio(this.currentRound);
  }
  /**
   * ======= GAME LOGIC HELPERS =======
   */

  private readonly handleKeyDown = async (event: KeyboardEvent) => {
    if (
      this.paused ||
      event.repeat ||
      event.key == 'Shift' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !this.currentRound
    )
      return;

    const typedLetter = getMappedFromKeyboardEvent(event);
    if (!typedLetter) return;

    const { word, activeLetterIdx } = this.currentRound!;
    console.log(event.key);
    if (typedLetter === word[activeLetterIdx]) {
      this.keyboard.setKeyFeedback(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      setTimeout(() => this.keyboard.clearKeyFeedback(event.code), FEEDBACK_DURATION_MS);
      useSessionStore.getState().recordCorrect();
      await this.advanceHighlightedLetter();
    } else {
      this.keyboard.setKeyFeedback(event.code, 'error');
      this.wordCard.setFeedback('error');
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');

      setTimeout(() => {
        this.keyboard.clearKeyFeedback(event.code);
        this.wordCard.setFeedback('default');
        this.keyboard.setHintedLetter(this.currentTargetLetter);
      }, FEEDBACK_DURATION_MS);
      useSessionStore.getState().recordMistake();
    }
  };

  private advanceHighlightedLetter = async () => {
    const r = this.currentRound!;
    r.activeLetterIdx += r.word[r.activeLetterIdx].length;

    if (r.activeLetterIdx >= r.word.length) {
      await this.wordCard.playSuccessFlash(); // wait for it to finish
      this.popAndStartRound(); // drawCard resets tint to default here
    } else {
      this.wordCard.setProgress(r.activeLetterIdx);
      this.keyboard.setHintedLetter(this.currentTargetLetter);
    }
  };

  private endGame() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    const { correct, mistakes } = useSessionStore.getState();
    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level: this.level });
  }
}
