import { sound } from '@pixi/sound';
import { Container, Graphics } from 'pixi.js';

import { EducationLevelScreen } from '.';
import { engine } from '../../../../engine/getEngine';
import { waitFor } from '../../../../engine/utils/waitFor';
import { pickRandomEducationLetters } from '../../../../utils/example-words';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { LetterChoice } from '../../../ui/letter-choice';
import { SoundButton } from '../../../ui/sound-button';
import type { TLevel } from '../../level-map/units';

// Gameplay
const NUM_CHOICES = 4;

// Scene Object
const CARD_SIZE = 150;
const HGAP = CARD_SIZE * 1.5;
const VGAP = CARD_SIZE / 4;
const HPADDING = HGAP / 2;
const VPADDING = VGAP / 2;
const BUTTON_DIM = 150;

export class LetterGrid extends Container {
  // Pixi Scene Objects
  private backgroundTint: Graphics;
  private soundButton: SoundButton;
  private panel: Container;
  private letterStrings: string[] = pickRandomEducationLetters(NUM_CHOICES);
  private topPanel: Container;
  private bottomPanel: Container;

  // Letter Attributes
  private letters: LetterChoice[];
  private letterMap: Map<string, LetterChoice>;
  private correctLetterString: string;
  private isResolving = false;

  // STATIC ROUND COUNTER, RESET ON FIN
  public static rounds = 0;
  public static readonly MAX_ROUNDS = 5;
  private level: TLevel;
  private isPlaying: boolean = false;

  constructor(level: TLevel) {
    super({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
      },
    });

    // init Scene Objects so linter is happy
    this.panel = new Container();
    this.backgroundTint = new Graphics();
    this.topPanel = new Container();
    this.bottomPanel = new Container();
    this.soundButton = new SoundButton({ onClick: this.soundButtonClick, size: BUTTON_DIM });

    // init Letter Attributes so linter is happy
    this.correctLetterString = '';
    this.letterMap = new Map();
    this.letters = [];

    this.level = level;
    // Constructor logic wrapped in helpers for better readability
    this.initLetterAttributes();
    this.initLayouts();
    this.populatePanel();
    this.addChild(this.panel);
  }

  // init letters, letterMap, correctLetterString
  // ACCESSSES letterStrings
  private initLetterAttributes() {
    this.correctLetterString = this.letterStrings[Math.floor(Math.random() * NUM_CHOICES)];
    this.letterStrings.forEach((letterString) => {
      this.letterMap.set(
        letterString,
        new LetterChoice({
          letter: letterString,
          onPress: (choice) => void this.handleChoice(choice),
          size: CARD_SIZE,
          cornerRadius: 18,
        }),
      );
    });
    this.letters = [...this.letterMap.values()];
  }

  private initLayouts() {
    this.panel.layout = {
      position: 'absolute',
      display: 'flex',
      flexDirection: 'column',
      width: CARD_SIZE * 2 + HGAP + HPADDING * 2,
      height: BUTTON_DIM + 2 * (CARD_SIZE + VPADDING + VGAP),
      gap: VGAP,
      paddingLeft: HPADDING,
      paddingRight: HPADDING,
      paddingTop: VPADDING * 2,
      paddingBottom: VPADDING / 2,
      justifyContent: 'center',
      alignItems: 'center',
    };
    this.backgroundTint.layout = { position: 'absolute', width: '100%', height: '100%' };
    this.topPanel.layout = { display: 'flex', gap: HGAP };
    this.bottomPanel.layout = { display: 'flex', gap: HGAP };
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = {
      width: BUTTON_DIM,
      height: BUTTON_DIM,
      position: 'absolute',
      left: '48%',
      top: '15%',
    };
  }

  private populatePanel() {
    // add letters equally to top/bottom panels
    for (let i = 0; i < NUM_CHOICES; i++) {
      const choiceSlot = this.createChoiceSlot(this.letters[i]);
      if (i < NUM_CHOICES / 2) this.topPanel.addChild(choiceSlot);
      else this.bottomPanel.addChild(choiceSlot);
    }

    this.panel.addChild(this.backgroundTint, this.soundButton, this.topPanel, this.bottomPanel);
    // backgroundTint dimensions are drawn in resize() once layout constants are available
  }

  resize(width: number, height: number) {
    const panelW = CARD_SIZE * 2 + HGAP + HPADDING * 2;
    const panelH = BUTTON_DIM + 2 * (CARD_SIZE + VPADDING + VGAP);
    this.panel.x = (width - panelW) / 2;
    this.panel.y = (height - panelH) / 2;
    this.backgroundTint
      .clear()
      .roundRect(0, 15, panelW, panelH, 60)
      .fill({ color: 0x1b427a, alpha: 0.7 })
      .roundRect(0, 0, panelW, panelH, 60)
      .fill(0xd1dcf0);
  }

  private readonly soundButtonClick = () => {
    if (this.isPlaying) return;
    this.isPlaying = true;
    const aliasString: string = `education-levels/education-letters-audio/${this.correctLetterString}.mp3`;
    const durationMs = (sound.find(aliasString)?.duration ?? 0) * 1000;
    void engine().audio.sfx.play(aliasString);
    setTimeout(() => {
      this.isPlaying = false;
    }, durationMs);
  };

  private createChoiceSlot(choice: LetterChoice) {
    const slot = new Container({
      layout: {
        width: CARD_SIZE,
        height: CARD_SIZE,
        flexShrink: 0,
      },
    });
    choice.position.set(CARD_SIZE / 2, CARD_SIZE / 2);
    slot.addChild(choice);
    return slot;
  }

  private async handleChoice(choice: LetterChoice) {
    if (this.isResolving) return;
    this.isResolving = true;

    if (choice.letter !== this.correctLetterString) {
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      useSessionStore.getState().recordMistake();
      await choice.showIncorrect();
      this.isResolving = false;
      return;
    }

    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();
    this.letters.forEach((letter) => letter.setInteractive(false));
    await Promise.all([choice.showCorrect(), waitFor(1)]);

    if (++LetterGrid.rounds < LetterGrid.MAX_ROUNDS) {
      void engine().navigation.showScreen(EducationLevelScreen, this.level);
    } else {
      LetterGrid.endGame(this.level);
    }
  }
  async show() {
    this.soundButtonClick();
  }
  override destroy(options?: Parameters<Container['destroy']>[0]) {
    super.destroy(options);
  }

  public static endGame(level: TLevel) {
    LetterGrid.rounds = 0;
    const { correct, mistakes } = useSessionStore.getState();

    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, { level });
  }
}
