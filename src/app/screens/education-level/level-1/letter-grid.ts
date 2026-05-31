import { Container, Graphics } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getAlphabet, getKeyFromChar } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { SoundButton } from '../../../ui/sound-button';
import { Letter } from './letter';

// Gameplay
const NUM_CHOICES = 4;

// Scene Object
const CARD_SIZE = 150;
const HGAP = CARD_SIZE * 1.5;
const VGAP = CARD_SIZE / 4;
const HPADDING = HGAP;
const VPADDING = VGAP * 2;
const BUTTON_DIM = 180;

function getLetterStrings() {
  const entries = [...getAlphabet()];
  const result: string[] = [];
  while (result.length < NUM_CHOICES) {
    const i = Math.floor(Math.random() * entries.length);
    const pick = entries.splice(i, 1)[0]; // remove so it can't be picked again
    if (pick) result.push(pick.text);
  }
  return result;
}

export class LetterGrid extends Container {
  // Pixi Scene Objects
  private backgroundTint: Graphics;
  private soundButton: SoundButton;
  private panel: Container;
  private letterStrings: string[] = getLetterStrings();
  private topPanel: Container;
  private bottomPanel: Container;

  // Letter Attributes
  private letters: Letter[];
  private letterMap: Map<string, Letter>;
  private correctLetterString: string;

  // FOR TESTING IN DEV ONLY
  private readableCorrectLetterString: string;

  // STATIC ROUND COUNTER, RESET ON FIN
  public static rounds = 0;
  public static readonly MAX_ROUNDS = 5;
  constructor() {
    super({
      layout: {
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
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
    this.readableCorrectLetterString = '';
    this.letterMap = new Map();
    this.letters = [];

    // Constructor logic wrapped in helpers for better readability
    this.initLetterAttributes();
    this.initLayouts();
    this.populatePanel();
    this.addChild(this.panel);
    console.log(`correct letter : ${this.correctLetterString}`);
  }

  // init letters, letterMap, correctLetterString
  // ACCESSSES letterStrings
  private initLetterAttributes() {
    this.correctLetterString = this.letterStrings[Math.floor(Math.random() * NUM_CHOICES)];
    this.letterStrings.forEach((letterString, _i) => {
      this.letterMap.set(
        letterString,
        new Letter({
          letter: letterString,
          correctLetter: this.correctLetterString,
          cardSize: CARD_SIZE,
        }),
      );
    });
    this.letters = [...this.letterMap.values()];
    this.readableCorrectLetterString = getKeyFromChar(this.correctLetterString);
  }

  private initLayouts() {
    this.panel.layout = {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: VGAP,
      paddingLeft: HPADDING,
      paddingRight: HPADDING,
      paddingTop: VPADDING,
      paddingBottom: VPADDING,
      justifyContent: 'center',
      alignItems: 'center',
    };
    this.backgroundTint.layout = { position: 'absolute', width: '100%', height: '100%' };
    this.topPanel.layout = { display: 'flex', gap: HGAP };
    this.bottomPanel.layout = { display: 'flex', gap: HGAP };
    this.soundButton.layout = {
      width: BUTTON_DIM,
      height: BUTTON_DIM,
    };
  }

  private populatePanel() {
    // add letters equally to top/bottom panels
    for (let i = 0; i < NUM_CHOICES; i++) {
      if (i < NUM_CHOICES / 2) this.topPanel.addChild(this.letters[i]);
      else this.bottomPanel.addChild(this.letters[i]);
    }

    this.panel.addChild(this.backgroundTint, this.soundButton, this.topPanel, this.bottomPanel);
    this.backgroundTint
      .clear()
      .roundRect(0, 0, this.panel.width, this.panel.height, 12)
      .fill(0xd1dcf0); // background tint only works dynamically with panel height, width if panel already has children, otherwise both dims=0
  }

  resize(width: number, height: number) {
    console.log('called');
    const panelW = CARD_SIZE * 2 + HGAP + HPADDING * 2;
    const panelH = BUTTON_DIM + 2 * (CARD_SIZE + VPADDING + VGAP);
    this.panel.x = (width - panelW) / 2;
    this.panel.y = (height - panelH) / 2;
  }

  private readonly soundButtonClick = () => {
    console.log(`correct letter is ${this.readableCorrectLetterString}`);
  };

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    super.destroy(options);
  }

  public static endGame() {
    LetterGrid.rounds = 0;
    const { correct, mistakes } = useSessionStore.getState();

    useScoreManager.getState().addSession(correct, mistakes);
    void engine().navigation.showPopup(EndScreenPopup, 'education');
  }
}
