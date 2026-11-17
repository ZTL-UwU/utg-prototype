import { Container, Graphics } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { waitFor } from '../../../../engine/utils/waitFor';
import { LetterAudioPlayer } from '../../../../utils/letter-audio';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { LetterChoice } from '../../../ui/letter-choice';
import { SoundButton } from '../../../ui/sound-button';

const CARD_SIZE = 150;
const CARD_RADIUS = 18;
const HGAP = CARD_SIZE * 1.5;
const VGAP = CARD_SIZE / 4;
const HPADDING = HGAP / 2;
const VPADDING = VGAP / 2;
const BUTTON_DIM = 150;
const PANEL_WIDTH = CARD_SIZE * 2 + HGAP + HPADDING * 2;
const PANEL_HEIGHT = BUTTON_DIM + 2 * (CARD_SIZE + VPADDING + VGAP);
const PANEL_RADIUS = 60;
const PANEL_SHADOW = 15;
const PANEL_COLOR = 0xd1dcf0;
const PANEL_SHADOW_COLOR = 0x1b427a;
/** Seconds the correct card stays lit before the round ends. */
const CORRECT_HOLD = 1;

type LetterGridOptions = {
  correctLetter: string;
  /** Shown two over two, in this order. */
  letters: string[];
  onCorrect: () => void;
};

/** A panel with the sound button over a two-by-two grid of letter cards. */
export class LetterGrid extends Container {
  private readonly backgroundTint = new Graphics();
  private readonly soundButton: SoundButton;
  private readonly panel = new Container();
  private readonly choices: LetterChoice[];
  private readonly correctLetter: string;
  private readonly onCorrect: () => void;
  private readonly letterAudio = new LetterAudioPlayer();
  private isResolving = false;

  constructor({ correctLetter, letters, onCorrect }: LetterGridOptions) {
    super({ layout: { position: 'absolute', width: '100%', height: '100%' } });
    this.correctLetter = correctLetter;
    this.onCorrect = onCorrect;

    this.soundButton = new SoundButton({ onClick: () => this.playLetter(), size: BUTTON_DIM });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = {
      width: BUTTON_DIM,
      height: BUTTON_DIM,
      position: 'absolute',
      left: '48%',
      top: '15%',
    };
    this.choices = letters.map(
      (letter) =>
        new LetterChoice({
          letter,
          onPress: (choice) => void this.handleChoice(choice),
          size: CARD_SIZE,
          cornerRadius: CARD_RADIUS,
        }),
    );

    this.panel.layout = {
      position: 'absolute',
      display: 'flex',
      flexDirection: 'column',
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      gap: VGAP,
      paddingLeft: HPADDING,
      paddingRight: HPADDING,
      paddingTop: VPADDING * 2,
      paddingBottom: VPADDING / 2,
      justifyContent: 'center',
      alignItems: 'center',
    };
    this.backgroundTint.layout = { position: 'absolute', width: '100%', height: '100%' };
    const half = Math.ceil(this.choices.length / 2);
    const rows = [this.choices.slice(0, half), this.choices.slice(half)].map((row) => {
      const panel = new Container({ layout: { display: 'flex', gap: HGAP } });
      panel.addChild(...row.map((choice) => this.createChoiceSlot(choice)));
      return panel;
    });
    this.panel.addChild(this.backgroundTint, this.soundButton, ...rows);
    this.addChild(this.panel);
  }

  resize(width: number, height: number) {
    this.panel.position.set((width - PANEL_WIDTH) / 2, (height - PANEL_HEIGHT) / 2);
    this.backgroundTint
      .clear()
      .roundRect(0, PANEL_SHADOW, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS)
      .fill({ color: PANEL_SHADOW_COLOR, alpha: 0.7 })
      .roundRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS)
      .fill(PANEL_COLOR);
  }

  public playLetter() {
    this.letterAudio.play(this.correctLetter);
  }

  private createChoiceSlot(choice: LetterChoice) {
    const slot = new Container({
      layout: { width: CARD_SIZE, height: CARD_SIZE, flexShrink: 0 },
    });
    choice.position.set(CARD_SIZE / 2, CARD_SIZE / 2);
    slot.addChild(choice);
    return slot;
  }

  private async handleChoice(choice: LetterChoice) {
    if (this.isResolving) return;
    this.isResolving = true;

    if (choice.letter !== this.correctLetter) {
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      useSessionStore.getState().recordMistake();
      await choice.showIncorrect();
      this.isResolving = false;
      return;
    }

    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();
    this.choices.forEach((letter) => letter.setInteractive(false));
    await Promise.all([choice.showCorrect(), waitFor(CORRECT_HOLD)]);
    this.onCorrect();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.letterAudio.stop();
    super.destroy(options);
  }
}
