import { sound } from '@pixi/sound';
import type { FancyButton } from '@pixi/ui';
import { EDUCATION_LETTERS } from '@utg/letters';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { HUD } from '../../ui/hud';
import { SoundButton } from '../../ui/sound-button';
import { HomeScreen } from '../home';
import {
  chevronIcon,
  createIconButton,
  playIcon,
  retryIcon,
  TILE_HEIGHT,
  TOOL_COLOR,
  TOOL_SHADOW_COLOR,
} from './controls';
import { OutlineDisplay } from './display';
import { FormBar } from './form-bar';
import { hasForm, type LETTER_FORMS } from './letter-data';
import { AlphabetSheet, CHIP_HEIGHT, CHIP_WIDTH, LetterChip } from './letter-picker';

export type { LETTER_FORMS } from './letter-data';

const BACKGROUND_COLOR = 0xf3e3c6;
/** Centre line of the top bar, level with the HUD's back button. */
const TOP_BAR_CENTER = 90;
/** The round buttons in the top bar: the letter steps and the tools. */
const BUTTON_SIZE = 72;
/** Between the chip's ends and the step buttons either side of it, and between the tools. */
const BUTTON_GAP = 24;
/** Wider, so the tools read as a group apart from the letter steps. */
const TOOLS_GAP = 56;
const SOUND_BUTTON_SIZE = 110;
const BODY_TOP = 180;
const EDGE_MARGIN = 36;
const COLUMN_GAP = 28;

// the bundled recording of the letter itself
function getLetterSoundAlias(letter: string) {
  return `education-levels/education-letters-audio/${letter}.m4a`;
}

export class LetterReferenceScreen extends Container {
  public readonly screenName = 'LetterReferenceScreen';
  public static assetBundles = ['letter-reference', 'ui', 'education-letters-audio'];
  private background = new Sprite({
    texture: Texture.WHITE,
    tint: BACKGROUND_COLOR,
    layout: { position: 'absolute', width: '100%', height: '100%' },
  });
  private HUD = new HUD({
    onBack: () => this.goHome(),
  });
  private soundButton = new SoundButton({
    onClick: () => this.playLetterSound(),
    size: SOUND_BUTTON_SIZE,
    variant: 'brown',
  });
  private chip: LetterChip;
  private sheet: AlphabetSheet;
  // reading right to left, the next letter is the one to the left
  private nextButton: FancyButton;
  private prevButton: FancyButton;
  private formBar: FormBar;
  private outlineDisplay: OutlineDisplay;
  private watchButton: FancyButton;
  private retryButton: FancyButton;
  private letterIndex = 0;
  private form: LETTER_FORMS = 'isolated';
  private soundTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    this.chip = new LetterChip(() => this.toggleSheet());
    this.sheet = new AlphabetSheet(EDUCATION_LETTERS, {
      onSelect: (index) => this.selectLetter(index),
      onClose: () => this.chip.setOpen(false),
    });
    this.nextButton = createIconButton({
      size: BUTTON_SIZE,
      icon: chevronIcon(true),
      onPress: () => this.stepLetter(1),
    });
    this.prevButton = createIconButton({
      size: BUTTON_SIZE,
      icon: chevronIcon(false),
      onPress: () => this.stepLetter(-1),
    });
    this.formBar = new FormBar((form) => this.setForm(form));
    this.outlineDisplay = new OutlineDisplay({
      onChange: () => this.refreshTools(),
      onScored: () => this.sheet.markPractised(this.letterIndex),
    });

    this.watchButton = createIconButton({
      size: BUTTON_SIZE,
      icon: playIcon,
      color: TOOL_COLOR,
      shadowColor: TOOL_SHADOW_COLOR,
      onPress: () => this.outlineDisplay.watch(),
    });
    // wipes the drawing to try again; only there once something's been drawn
    this.retryButton = createIconButton({
      size: BUTTON_SIZE,
      icon: retryIcon,
      color: TOOL_COLOR,
      shadowColor: TOOL_SHADOW_COLOR,
      onPress: () => this.outlineDisplay.clear(),
    });

    this.addChild(
      this.background,
      this.HUD,
      this.soundButton,
      this.nextButton,
      this.prevButton,
      this.watchButton,
      this.retryButton,
      this.outlineDisplay,
      this.formBar,
      // covers everything while it's open but the chip, which stays lit to close it again
      this.sheet,
      this.chip,
    );
    this.showLetter();
  }

  // stops the letter audio on the way out
  private goHome() {
    this.stopLetterSound();
    void engine().navigation.showScreen(HomeScreen);
  }

  async show() {
    this.playLetterSound();
  }

  private get letter() {
    return EDUCATION_LETTERS[this.letterIndex];
  }

  // wraps at both ends so the letters carousel
  private stepLetter(delta: number) {
    const count = EDUCATION_LETTERS.length;
    this.selectLetter((this.letterIndex + delta + count) % count);
  }

  private toggleSheet() {
    if (this.sheet.isOpen) {
      this.sheet.close();
    } else {
      this.chip.setOpen(true);
      this.sheet.open();
    }
  }

  private selectLetter(index: number) {
    if (index === this.letterIndex) return;
    // a new letter cuts off the previous one's audio; form changes never reach here
    this.stopLetterSound();
    this.letterIndex = index;
    // stay on the same form where the new letter has it, so forms can be compared across letters
    if (!hasForm(this.letter, this.form)) this.form = 'isolated';
    this.showLetter();
    this.playLetterSound();
  }

  private setForm(form: LETTER_FORMS) {
    if (form === this.form || !hasForm(this.letter, form)) return;
    this.form = form;
    this.showLetter();
  }

  private showLetter() {
    this.chip.setLetter(this.letter, this.letterIndex + 1, EDUCATION_LETTERS.length);
    this.sheet.setCurrent(this.letterIndex);
    this.formBar.update(this.letter, this.form);
    this.outlineDisplay.setLetter(this.letter, this.form);
  }

  private refreshTools() {
    this.watchButton.enabled = this.outlineDisplay.canWatch;
    this.retryButton.visible = this.outlineDisplay.canClear;
  }

  private get soundAlias() {
    return getLetterSoundAlias(this.letter);
  }

  // spam safe: ignored while the current letter's audio is still playing
  private playLetterSound() {
    const alias = this.soundAlias;
    if (this.soundTimeout !== undefined || !sound.exists(alias)) return;

    const duration = sound.find(alias)?.duration ?? 0;
    void engine().audio.sfx.play(alias);
    this.soundTimeout = setTimeout(() => {
      this.soundTimeout = undefined;
    }, duration * 1000);
  }

  private stopLetterSound() {
    engine().audio.sfx.stop(this.soundAlias);
    clearTimeout(this.soundTimeout);
    this.soundTimeout = undefined;
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    this.background.layout = { width, height };

    this.soundButton.position.set(width - TOP_BAR_CENTER, TOP_BAR_CENTER);

    // the forms along the bottom, and the canvas above them
    const centerX = width / 2;
    const formBarY = height - EDGE_MARGIN - TILE_HEIGHT;
    this.formBar.position.set(centerX, formBarY);
    this.outlineDisplay.position.set(EDGE_MARGIN, BODY_TOP);
    this.outlineDisplay.resize(width - 2 * EDGE_MARGIN, formBarY - COLUMN_GAP - BODY_TOP);

    // the letter picker sits over the middle of the canvas it drives, with the tools after it
    const stepOffset = CHIP_WIDTH / 2 + BUTTON_GAP + BUTTON_SIZE / 2;
    const watchX = centerX + stepOffset + BUTTON_SIZE + TOOLS_GAP;
    this.chip.position.set(centerX, TOP_BAR_CENTER);
    this.nextButton.position.set(centerX - stepOffset, TOP_BAR_CENTER);
    this.prevButton.position.set(centerX + stepOffset, TOP_BAR_CENTER);
    this.watchButton.position.set(watchX, TOP_BAR_CENTER);
    this.retryButton.position.set(watchX + BUTTON_SIZE + BUTTON_GAP, TOP_BAR_CENTER);
    this.sheet.resize(width, height, centerX, TOP_BAR_CENTER + CHIP_HEIGHT / 2);
  }
}
