import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getTypedText } from '../../../../utils/keymap';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { levelWordAssets } from '../../../../zustandStores/wordStore';
import { hudButtonTop } from '../../../ui/hud';
import type { HUD } from '../../../ui/hud';
import { KeyboardLayout } from '../../../ui/keyboard-layout';
import { createLevelHud, finishLevel } from '../../level-flow';
import { getTypedLevel, type TLevel } from '../../level-map/units';
import { generateWordRounds, playRoundAudio, type WordRound } from '../word-rounds';
import { TypingWordCard } from './word-card';

/** The word card starts this far below the HUD's buttons. */
const CARD_BELOW_HUD = 60;

export class TypingWordScreen extends Container {
  public readonly screenName = 'TypingWordScreen';
  public static assetBundles = ['typing-level-word', 'ui'];
  public static assets = levelWordAssets('image', 'standardAudio');
  public static loadingBackgroundAsset = 'typing-levels/typing-level-word/background.png';
  public static helpAssets = ['tutorial-popups/typing-tutorial.png'];
  private background: Sprite;
  private hud: HUD;
  private wordCard: TypingWordCard;
  private keyboard: KeyboardLayout;
  private readonly rounds: WordRound[];
  private currentRound?: WordRound;
  private paused = false;
  private readonly level: TLevel;

  constructor(level: TLevel) {
    const typedLevel = getTypedLevel(level, 'typing-word');
    super();
    this.level = typedLevel;
    this.background = new Sprite({
      texture: Texture.from('typing-levels/typing-level-word/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = createLevelHud(typedLevel);
    this.keyboard = new KeyboardLayout({ text: 'words' });
    this.rounds = generateWordRounds(typedLevel.props.wordIds, typedLevel.props.roundCount);
    this.wordCard = new TypingWordCard();
    this.wordCard.layout = { position: 'absolute', left: 0, width: '100%' };
    this.addChild(this.background, this.hud, this.keyboard, this.wordCard);
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    this.background.layout = { width, height };
    this.keyboard.resize(width, height);
    // At least as low as before, and always below the HUD's buttons and the notch.
    this.wordCard.layout = { top: Math.max(height * 0.15, hudButtonTop(height) + CARD_BELOW_HUD) };
  }

  async show() {
    // The first round starts here, so an empty word list ends the level once it is up.
    this.popAndStartRound();
    if (!this.currentRound) return;
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
    if (!this.currentRound) return;
    this.paused = false;
    window.addEventListener('keydown', this.handleKeyDown);
    await this.keyboard.resume();
    this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
  }

  private get currentTargetLetter(): string | undefined {
    if (!this.currentRound) return undefined;
    return this.currentRound.word[this.currentRound.activeLetterIdx];
  }

  /** The letter after the target, which tells a phone a word-initial ئ comes from a vowel key. */
  private get nextTargetLetter(): string | undefined {
    if (!this.currentRound) return undefined;
    return this.currentRound.word[this.currentRound.activeLetterIdx + 1];
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    super.destroy(options);
  }

  /** Bring up the next word, or end the level after the last. */
  private popAndStartRound() {
    this.currentRound = this.rounds.pop();
    if (!this.currentRound) {
      this.endGame();
      return;
    }
    this.wordCard.setRound(this.currentRound); // always highlights first letter, letterIdx for new round always at 0
    this.keyboard.setWordStart(true);
    this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
    playRoundAudio(this.currentRound);
  }
  private readonly handleKeyDown = (event: KeyboardEvent) => {
    const round = this.currentRound;
    if (this.paused || !round) return;
    const typedLetter = getTypedText(event);
    if (!typedLetter) return;

    if (typedLetter === round.word[round.activeLetterIdx]) {
      this.keyboard.flashKeyFeedback(event.code, 'success');
      void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      useSessionStore.getState().recordCorrect();
      void this.advanceHighlightedLetter(round);
    } else {
      this.wordCard.setFeedback('error');
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      this.keyboard.flashKeyFeedback(event.code, 'error', {
        onCleared: () => {
          this.wordCard.setFeedback('default');
          this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
        },
      });
      useSessionStore.getState().recordMistake();
    }
  };

  private async advanceHighlightedLetter(round: WordRound) {
    round.activeLetterIdx += 1;

    if (round.activeLetterIdx >= round.word.length) {
      await this.wordCard.playSuccessFlash();
      if (this.destroyed) return;
      this.popAndStartRound(); // drawCard resets tint to default here
    } else {
      this.wordCard.setProgress(round.activeLetterIdx);
      this.keyboard.setHintedLetter(this.currentTargetLetter, this.nextTargetLetter);
    }
  }

  private endGame() {
    this.paused = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    finishLevel(this, this.level);
  }
}
