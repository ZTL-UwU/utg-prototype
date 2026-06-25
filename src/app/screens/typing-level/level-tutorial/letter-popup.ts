import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { EDUCATION_LETTERS, TYPING_SEQUENCE } from '../../../../utils/example-words';
import { getKeyFromChar } from '../../../../utils/keymap';
import { KeyboardLayout } from '../../../ui/keyboard-layout';

const COLORS = {
  background: 0x8d6241,
  key: 0xdd9853,
  keyShadow: 0xf3ca8a,
  keyText: 0xfff1de,
  shiftText: 0xffde59,
  badge: 0xfff1de,
} as const;

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const GUIDE_KEY_WIDTH = 130;
const GUIDE_KEY_HEIGHT = 136;
const GUIDE_GAP = 64;
const GUIDE_KEY_RADIUS = 28;
const SHIFT_WIDTH = 130;
const SHIFT_HEIGHT = 70;
const SHIFT_RADIUS = 35;
const FEEDBACK_DURATION_MS = 350;

type TutorialStep = {
  code: string;
  label: string;
  isShift: boolean;
};

type GuideItem = {
  container: Container;
  width: number;
  y: number;
  stepIndex?: number;
};

function createGuideKey(label: string) {
  const key = new Container();
  const background = new Graphics()
    .roundRect(0, 5, GUIDE_KEY_WIDTH, GUIDE_KEY_HEIGHT, GUIDE_KEY_RADIUS)
    .fill({ color: COLORS.keyShadow })
    .roundRect(0, 0, GUIDE_KEY_WIDTH, GUIDE_KEY_HEIGHT, GUIDE_KEY_RADIUS)
    .fill({ color: COLORS.key });
  const text = new Text({
    text: label,
    anchor: 0.5,
    resolution: 2,
    style: {
      fill: COLORS.keyText,
      fontFamily: 'Noto Naskh Arabic Bold',
      fontSize: 60,
      fontWeight: '700',
      padding: 20,
    },
  });
  text.position.set(GUIDE_KEY_WIDTH / 2, GUIDE_KEY_HEIGHT / 2);
  key.addChild(background, text);
  return key;
}

function createShiftGuideKey() {
  const key = new Container();
  const background = new Graphics()
    .roundRect(0, 5, SHIFT_WIDTH, SHIFT_HEIGHT, SHIFT_RADIUS)
    .fill({ color: COLORS.keyShadow })
    .roundRect(0, 0, SHIFT_WIDTH, SHIFT_HEIGHT, SHIFT_RADIUS)
    .fill({ color: COLORS.key });
  const label = new Text({
    text: 'SHIFT',
    anchor: 0.5,
    resolution: 2,
    style: {
      fill: COLORS.shiftText,
      fontFamily: 'Concert One',
      fontSize: 25,
      fontWeight: '700',
      padding: 10,
    },
  });
  label.position.set(SHIFT_WIDTH / 2, SHIFT_HEIGHT / 2);
  const hold = new Text({
    text: 'HOLD',
    anchor: 0.5,
    resolution: 2,
    style: {
      fill: COLORS.shiftText,
      fontFamily: 'Concert One',
      fontSize: 25,
      fontWeight: '700',
      padding: 10,
    },
  });
  hold.position.set(SHIFT_WIDTH / 2, SHIFT_HEIGHT + 37);
  key.addChild(background, label, hold);
  return key;
}

function createPlus() {
  return new Sprite({ texture: Texture.from('typing-levels/typing-tutorial/plus.svg') });
}

function createArrow() {
  return new Sprite({ texture: Texture.from('typing-levels/typing-tutorial/arrow.svg') });
}

export class LetterPopup extends Container {
  public static assetBundles = ['typing-tutorial', 'end-screen'];

  private readonly letter: string;
  private readonly keyboard: KeyboardLayout;
  private readonly background: Graphics;
  private readonly closeButton: FancyButton;
  private readonly guide = new Container();
  private readonly stars = new Sprite({
    texture: Texture.from('typing-levels/typing-tutorial/stars.svg'),
  });
  private readonly steps: TutorialStep[];
  private readonly badges: Container[] = [];

  private nextStepIndex = 0;
  private completed = false;
  private viewHeight = 0;

  constructor(letter: string) {
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });
    this.letter = letter;
    this.steps = this.createSteps(letter);

    this.background = new Graphics();
    this.background.layout = { position: 'absolute', width: '100%', height: '100%' };

    this.closeButton = this.createCloseButton();
    this.keyboard = new KeyboardLayout();
    this.stars.visible = false;
    this.buildGuide();

    this.addChild(this.background, this.closeButton, this.guide, this.keyboard);
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    this.viewHeight = height;
    this.background.clear().rect(0, 0, width, height).fill(COLORS.background);
    this.keyboard.resize(width, height);
    this.layoutGuide(width, height);
  }

  async show() {
    this.resetLesson();
    this.y = this.viewHeight + 10;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    await Promise.all([
      animate(this.position, { y: 0 }, { duration: 0.6, ease: 'easeOut' }),
      this.keyboard.playEnterAnimation(),
    ]);
  }

  async hide() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    await Promise.all([
      animate(this.position, { y: this.viewHeight + 10 }, { duration: 0.4, ease: 'easeOut' }),
      this.keyboard.playExitAnimation(),
    ]);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    super.destroy(options);
  }

  private createSteps(letter: string): TutorialStep[] {
    const sequence: readonly string[] = TYPING_SEQUENCE.get(
      letter as (typeof EDUCATION_LETTERS)[number],
    ) ?? [letter];

    return sequence.flatMap<TutorialStep>((part) => {
      if (part === 'shift') {
        return [{ code: 'ShiftLeft', label: 'SHIFT', isShift: true }];
      }

      const code = getKeyFromChar(part);
      return code ? [{ code, label: part, isShift: false }] : [];
    });
  }

  private buildGuide() {
    const items: GuideItem[] = [
      { container: createGuideKey(this.letter), width: GUIDE_KEY_WIDTH, y: 0 },
      { container: createArrow(), width: 120, y: 34 },
    ];

    const sourceSteps = [...this.steps].reverse();
    sourceSteps.forEach((step, sourceIndex) => {
      const stepIndex = this.steps.indexOf(step);
      items.push({
        container: step.isShift ? createShiftGuideKey() : createGuideKey(step.label),
        width: step.isShift ? SHIFT_WIDTH : GUIDE_KEY_WIDTH,
        y: step.isShift ? 34 : 0,
        stepIndex,
      });

      if (sourceIndex < sourceSteps.length - 1) {
        items.push({ container: createPlus(), width: 67, y: 34 });
      }
    });

    const totalWidth = items.reduce(
      (width, item, index) => width + item.width + (index < items.length - 1 ? GUIDE_GAP : 0),
      0,
    );
    let x = -totalWidth / 2;

    for (const item of items) {
      item.container.position.set(x, item.y);
      this.guide.addChild(item.container);

      if (item.stepIndex !== undefined) {
        const badge = this.createStepBadge(item.stepIndex + 1);
        const isShiftStep = this.steps[item.stepIndex]?.isShift;
        badge.position.set(x + item.width / 2, isShiftStep ? -54 : -64);
        this.badges[item.stepIndex] = badge;
        this.guide.addChild(badge);
      }

      x += item.width + GUIDE_GAP;
    }

    const target = items[0]!;
    this.stars.position.set(target.container.x + GUIDE_KEY_WIDTH * 0.65, -82);
    this.guide.addChild(this.stars);
  }

  private layoutGuide(width: number, height: number) {
    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT, 1);
    this.guide.scale.set(scale);
    this.guide.position.set(width / 2, Math.max(150 * scale, height * 0.19));
  }

  private createStepBadge(step: number) {
    const badge = new Container();
    const circle = new Graphics().circle(0, 0, 43).fill({ color: COLORS.badge });
    const number = new Text({
      text: String(step),
      anchor: 0.5,
      resolution: 2,
      style: {
        fill: 0x000000,
        fontFamily: 'Concert One',
        fontSize: 58,
        fontWeight: '700',
        padding: 8,
      },
    });
    number.position.set(0, 1);
    badge.addChild(circle, number);
    return badge;
  }

  private resetLesson() {
    this.nextStepIndex = 0;
    this.completed = false;
    this.stars.visible = false;
    this.stars.alpha = 0;
    this.stars.scale.set(0.7);
    this.refreshGuideState();
  }

  private refreshGuideState() {
    this.keyboard.clearAllKeyFeedback();
    for (const step of this.steps) {
      this.keyboard.clearKeyFeedback(step.code);
    }

    if (this.completed) {
      for (const step of this.steps) {
        this.keyboard.setKeyFeedback(step.code, 'success');
      }
    } else {
      for (let index = 0; index <= this.nextStepIndex; index += 1) {
        const step = this.steps[index];
        if (step) this.keyboard.setKeyFeedback(step.code, 'hint');
      }
    }

    this.badges.forEach((badge, index) => {
      badge.visible = this.completed || index <= this.nextStepIndex;
    });
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (this.completed || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;

    const expectedStep = this.steps[this.nextStepIndex];
    if (!expectedStep) return;

    const isExpectedShift =
      expectedStep.isShift && (event.code === 'ShiftLeft' || event.code === 'ShiftRight');
    const isExpectedKey = !expectedStep.isShift && event.code === expectedStep.code;
    const shiftIsRequired = this.steps.slice(0, this.nextStepIndex).some((step) => step.isShift);

    if (!isExpectedShift && (!isExpectedKey || (shiftIsRequired && !event.shiftKey))) {
      this.keyboard.setKeyFeedback(event.code, 'error');
      void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      window.setTimeout(() => this.refreshGuideState(), FEEDBACK_DURATION_MS);
      return;
    }

    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    this.nextStepIndex += 1;
    if (this.nextStepIndex >= this.steps.length) {
      this.completeLesson();
      return;
    }

    this.refreshGuideState();
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    const isShift = event.code === 'ShiftLeft' || event.code === 'ShiftRight';
    const shiftWasRequired = this.steps.slice(0, this.nextStepIndex).some((step) => step.isShift);

    if (!this.completed && isShift && shiftWasRequired) {
      this.nextStepIndex -= 1;
      this.refreshGuideState();
    }
  };

  private completeLesson() {
    this.completed = true;
    this.nextStepIndex = this.steps.length;
    this.refreshGuideState();
    this.stars.visible = true;
    setTimeout(() => {
      void engine().audio.sfx.play('end-screen/level-complete.mp3');
    }, 200);
    void Promise.all([
      animate(this.stars, { alpha: 1 }, { duration: 0.2, ease: 'easeOut' }),
      animate(this.stars.scale, { x: 1, y: 1 }, { duration: 0.35, ease: 'backOut' }),
    ]);
  }

  private createCloseButton(): FancyButton {
    const button = new FancyButton({
      defaultView: 'typing-levels/typing-tutorial/x.svg',
      animations: {
        hover: { props: { scale: { x: 1.03, y: 1.03 } }, duration: 100 },
        pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
      },
    });
    button.anchor.set(0.5);
    button.layout = { position: 'absolute', top: '10%', left: '5%' };
    button.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.hidePopup();
    });
    return button;
  }
}
