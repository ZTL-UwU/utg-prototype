import { Container, Graphics } from 'pixi.js';

import { getAlphabet } from '../../../utils/keymap';
import { SoundButton } from '../../ui/sound-button';
import { Letter } from './letter';

const NUM_CHOICES = 4;
const CARD_SIZE = 150;
const HGAP = CARD_SIZE * 1.5;
const VGAP = CARD_SIZE / 4;
const HPADDING = HGAP;
const VPADDING = VGAP * 2;
const BUTTON_DIM = 180;

function getLetterStrings() {
  const entries = getAlphabet();
  return Array.from({ length: NUM_CHOICES }, () => {
    const pick = entries[Math.floor(Math.random() * entries.length)];
    return pick?.text ?? '';
  });
}

export class LetterGrid extends Container {
  private backgroundTint: Graphics;
  private soundButton: SoundButton;
  private panel: Container;
  private letterStrings: string[] = getLetterStrings();
  private letters: Letter[] = this.letterStrings.map((letterString, _i) => {
    return new Letter({ letter: letterString, cardSize: CARD_SIZE });
  });
  private topPanel: Container;
  private bottomPanel: Container;

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
    this.panel = new Container();
    this.backgroundTint = new Graphics();
    this.topPanel = new Container();
    this.bottomPanel = new Container();
    this.soundButton = new SoundButton({ onClick: this.soundButtonClick, size: BUTTON_DIM });

    this.initLayouts();
    this.populatePanel();
    window.addEventListener('keydown', this.handleKeyDown);
    this.addChild(this.panel);
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
      .fill(0xd1dcf0);
  }
  resize(width: number, height: number) {
    console.log('called');
    const panelW = CARD_SIZE * 2 + HGAP + HPADDING * 2;
    const panelH = BUTTON_DIM + 2 * (CARD_SIZE + VPADDING + VGAP);
    this.panel.x = (width - panelW) / 2;
    this.panel.y = (height - panelH) / 2;
  }
  private soundButtonClick() {}
  private handleKeyDown() {}
  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    super.destroy(options);
  }
}
