import { sound } from '@pixi/sound';
import type { FancyButton } from '@pixi/ui';
import { EDUCATION_LETTERS } from '@utg/letters';
import { animate } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive, safeAreaInsets } from '../../../engine/utils/viewport';
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
import { FORM_BAR_WIDTH, FormBar } from './form-bar';
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
const SOUND_BUTTON_SIZE = 96;
const BODY_TOP = 180;
const EDGE_MARGIN = 36;
const COLUMN_GAP = 28;
/** Phones: the letter picker's row, under the back button and the script pill. */
const PHONE_NAV_CENTER = 240;
const PHONE_EDGE_MARGIN = 20;
/** Phones: the controls grow by this, so the round buttons are a comfortable tap (about 46px). */
const PHONE_CONTROL_SCALE = 1.25;
/** Phones: the forms grow to fill the width, up to this. */
const PHONE_FORM_SCALE_MAX = 1.15;
/** Seconds each part of the screen takes to come in. */
const APPEAR_DURATION = 0.4;
/** Seconds between each ring of the top bar popping in, from the chip outward. */
const APPEAR_STAGGER = 0.06;
/** How far below its place the body starts as it rises in. */
const APPEAR_RISE = 60;

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
  /** Scales the chip, which keeps its own scale for its hover. */
  private chipSlot = new Container();
  /** The scale the sound button gives itself to be `SOUND_BUTTON_SIZE` across. */
  private soundButtonScale: number;
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
      this.chipSlot,
    );
    this.chipSlot.addChild(this.chip);
    this.soundButtonScale = this.soundButton.scale.x;
    this.showLetter();
  }

  // stops the letter audio on the way out
  private goHome() {
    this.stopLetterSound();
    void engine().navigation.showScreen(HomeScreen);
  }

  async show() {
    this.playLetterSound();
    await this.playAppearAnimation();
  }

  // the top bar pops in from the chip outward, and the canvas and forms rise in under it
  private async playAppearAnimation() {
    const rings = [
      [this.chip],
      [this.nextButton, this.prevButton],
      [this.watchButton, this.retryButton, this.soundButton],
    ];
    // the body is offset by its pivot, so a resize mid-animation still lands it in place
    const body = [this.outlineDisplay, this.formBar];

    // back to the scale each had: the sound button is sized by its own
    const scales = new Map(rings.flat().map((target) => [target, target.scale.x]));

    this.HUD.alpha = 0;
    for (const target of rings.flat()) target.scale.set(0);
    for (const target of body) {
      target.alpha = 0;
      target.pivot.y = -APPEAR_RISE;
    }

    const duration = APPEAR_DURATION;
    await Promise.all([
      animate(this.HUD, { alpha: 1 }, { duration, ease: 'easeOut' }),
      ...rings.flatMap((ring, i) =>
        ring.map((target) => {
          const scale = scales.get(target) ?? 1;
          return animate(
            target.scale,
            { x: scale, y: scale },
            { duration, delay: i * APPEAR_STAGGER, ease: 'backOut' },
          );
        }),
      ),
      ...body.flatMap((target, i) => {
        const delay = (i + 1) * APPEAR_STAGGER;
        return [
          animate(target, { alpha: 1 }, { duration, delay, ease: 'easeOut' }),
          animate(target.pivot, { y: 0 }, { duration, delay, ease: 'backOut' }),
        ];
      }),
    ]);
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

    const centerX = width / 2;
    const edge = responsive({ sm: PHONE_EDGE_MARGIN, lg: EDGE_MARGIN });
    // insets are CSS pixels, the view isn't
    const safeBottom = (safeAreaInsets().bottom / window.innerHeight) * height;

    const controlScale = responsive({ sm: PHONE_CONTROL_SCALE, lg: 1 });
    const buttonSize = BUTTON_SIZE * controlScale;
    const buttonGap = BUTTON_GAP * controlScale;
    const soundSize = SOUND_BUTTON_SIZE * controlScale;
    const chipHeight = CHIP_HEIGHT * controlScale;
    for (const button of [this.nextButton, this.prevButton, this.watchButton, this.retryButton]) {
      button.scale.set(controlScale);
    }
    this.chipSlot.scale.set(controlScale);
    this.soundButton.scale.set(this.soundButtonScale * controlScale);

    // the forms along the bottom, grown on phones to fill the width
    const formScale = responsive({
      sm: Math.min(PHONE_FORM_SCALE_MAX, (width - 2 * edge) / FORM_BAR_WIDTH),
      lg: 1,
    });
    const formBarY = height - Math.max(edge, safeBottom) - TILE_HEIGHT * formScale;
    this.formBar.scale.set(formScale);
    this.formBar.position.set(centerX, formBarY);

    // The letter picker sits over the middle of the canvas it drives, with its steps either side.
    // The top bar's corners hold the back button and the script pill, so on phones there's no
    // room left beside them and it takes the row below.
    const navY = responsive({ sm: PHONE_NAV_CENTER, lg: TOP_BAR_CENTER });
    const stepOffset = (CHIP_WIDTH * controlScale) / 2 + buttonGap + buttonSize / 2;
    this.chipSlot.position.set(centerX, navY);
    this.nextButton.position.set(centerX - stepOffset, navY);
    this.prevButton.position.set(centerX + stepOffset, navY);
    this.sheet.resize(width, height, centerX, navY + chipHeight / 2);

    // On wide screens the sound button and the tools flank the letter steps. Phones are too
    // narrow for that, so they take the row above the forms, out at its ends: the sound button on
    // the left, watch on the right, and retry turning up beside watch without moving it.
    const toolsY = responsive({ sm: formBarY - COLUMN_GAP - soundSize / 2, lg: TOP_BAR_CENTER });
    const formBarHalf = (FORM_BAR_WIDTH * formScale) / 2;
    const flankOffset = stepOffset + buttonSize / 2 + TOOLS_GAP / 2;
    const soundX = responsive({
      sm: centerX - formBarHalf + soundSize / 2,
      lg: centerX - flankOffset - soundSize / 2,
    });
    const watchX = responsive({
      sm: centerX + formBarHalf - buttonSize / 2,
      lg: centerX + flankOffset + buttonSize / 2,
    });
    const retryX = watchX + responsive({ sm: -1, lg: 1 }) * (buttonSize + buttonGap);
    this.soundButton.position.set(soundX, toolsY);
    this.watchButton.position.set(watchX, toolsY);
    this.retryButton.position.set(retryX, toolsY);

    // The canvas fills what's left between the bars. On phones the letter is held by the width,
    // so the canvas takes all of it: the margin would only shrink the letter.
    const bodyTop = responsive({ sm: navY + chipHeight / 2 + COLUMN_GAP, lg: BODY_TOP });
    const bodyBottom = responsive({
      sm: toolsY - soundSize / 2 - COLUMN_GAP,
      lg: formBarY - COLUMN_GAP,
    });
    const bodyInset = responsive({ sm: 0, lg: edge });
    this.outlineDisplay.position.set(bodyInset, bodyTop);
    this.outlineDisplay.resize(width - 2 * bodyInset, bodyBottom - bodyTop);
  }
}
