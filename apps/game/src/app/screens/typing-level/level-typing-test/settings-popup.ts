import { FancyButton } from '@pixi/ui';
import {
  TYPING_TEST_DURATIONS_SECONDS,
  TYPING_TEST_MODES,
  type TypingTestMode,
  type TypingTestProps,
} from '@utg/level-types';
import { animate } from 'motion';
import { BlurFilter, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { availableModes } from './test-content';

const PANEL_WIDTH = 900;
const PANEL_HEIGHT = 660;
const PANEL_RADIUS = 40;

const COLORS = {
  PANEL: 0xfdf3e0,
  TRACK: 0xf5e2c4,
  SELECTED: 0x8d6241,
  TEXT: 0x6b411e,
  SELECTED_TEXT: 0xfdf3e0,
  BUTTON: 0xc98144,
  BUTTON_SHADOW: 0xffe2bc,
  BUTTON_TEXT: 0xffe9cd,
};

const SEGMENT_HEIGHT = 76;
const SEGMENT_RADIUS = 30;
const SEGMENT_PADDING_X = 28;
const TOGGLE_WIDTH = 96;
const TOGGLE_HEIGHT = 48;

const MODE_LABELS: Record<TypingTestMode, string> = {
  letters: 'Letters',
  words: 'Words',
  sentences: 'Sentences',
};

export type TypingTestSettings = {
  mode: TypingTestMode;
  durationSeconds: number;
  showKeyboard: boolean;
};

export type TypingTestSettingsPopupProps = {
  levelProps: TypingTestProps;
  defaults: TypingTestSettings;
  onStart: (settings: TypingTestSettings) => void;
};

type SegmentOption<T> = { value: T; label: string };

function createLabel(text: string, fontSize: number, fill: number) {
  return new Text({
    text,
    resolution: 2,
    style: { fontFamily: 'Concert One', fontSize, fontWeight: '700', fill },
    anchor: 0.5,
  });
}

// Anchored text and @pixi/layout fight over the origin, so flow children stay unanchored.
function createFlowLabel(text: string, fontSize: number, fill: number) {
  return new Text({
    text,
    resolution: 2,
    style: { fontFamily: 'Concert One', fontSize, fontWeight: '700', fill },
    layout: true,
  });
}

/** Pill of mutually exclusive options; the selected one gets the dark fill. */
class SegmentedControl<T> extends Container {
  private readonly track = new Graphics();
  private readonly thumb = new Graphics();
  private readonly labels: Text[] = [];
  private readonly slots: { x: number; width: number }[] = [];
  private selectedIndex: number;

  constructor(options: SegmentOption<T>[], selected: T, onChange: (value: T) => void) {
    super();
    this.selectedIndex = Math.max(
      0,
      options.findIndex((option) => option.value === selected),
    );

    let x = 0;
    options.forEach((option, index) => {
      const label = createLabel(option.label, 34, COLORS.TEXT);
      const width = label.width + SEGMENT_PADDING_X * 2;
      label.position.set(x + width / 2, SEGMENT_HEIGHT / 2);
      // The whole segment is clickable, not just the glyphs of its label.
      label.hitArea = new Rectangle(-width / 2, -SEGMENT_HEIGHT / 2, width, SEGMENT_HEIGHT);
      label.eventMode = 'static';
      label.cursor = 'pointer';
      label.on('pointertap', () => {
        if (this.selectedIndex === index) return;
        void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
        this.selectedIndex = index;
        this.redraw();
        onChange(option.value);
      });

      this.labels.push(label);
      this.slots.push({ x, width });
      x += width;
    });

    this.addChild(this.track, this.thumb, ...this.labels);
    this.redraw();
    this.layout = { width: x, height: SEGMENT_HEIGHT, isLeaf: true };
  }

  private redraw() {
    const totalWidth = this.slots.reduce((sum, slot) => sum + slot.width, 0);
    this.track
      .clear()
      .roundRect(0, 0, totalWidth, SEGMENT_HEIGHT, SEGMENT_RADIUS)
      .fill(COLORS.TRACK);

    const active = this.slots[this.selectedIndex];
    this.thumb
      .clear()
      .roundRect(active.x, 0, active.width, SEGMENT_HEIGHT, SEGMENT_RADIUS)
      .fill(COLORS.SELECTED);

    this.labels.forEach((label, index) => {
      label.style.fill = index === this.selectedIndex ? COLORS.SELECTED_TEXT : COLORS.TEXT;
    });
  }
}

/** Two-state pill used for the "show keyboard" preference. */
class Toggle extends Container {
  private readonly graphics = new Graphics();
  private enabled: boolean;

  constructor(initial: boolean, onChange: (value: boolean) => void) {
    super();
    this.enabled = initial;
    this.addChild(this.graphics);
    this.redraw();

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointertap', () => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      this.enabled = !this.enabled;
      this.redraw();
      onChange(this.enabled);
    });

    this.layout = { width: TOGGLE_WIDTH, height: TOGGLE_HEIGHT, isLeaf: true };
  }

  private redraw() {
    const knobRadius = TOGGLE_HEIGHT / 2 - 6;
    const knobX = this.enabled ? TOGGLE_WIDTH - TOGGLE_HEIGHT / 2 : TOGGLE_HEIGHT / 2;

    this.graphics
      .clear()
      .roundRect(0, 0, TOGGLE_WIDTH, TOGGLE_HEIGHT, TOGGLE_HEIGHT / 2)
      .fill(this.enabled ? COLORS.SELECTED : COLORS.TRACK)
      .circle(knobX, TOGGLE_HEIGHT / 2, knobRadius)
      .fill(COLORS.PANEL);
  }
}

export class TypingTestSettingsPopup extends Container {
  private readonly popupMask: Sprite;
  private readonly panel: Container;
  private readonly settings: TypingTestSettings;

  constructor({ levelProps, defaults, onStart }: TypingTestSettingsPopupProps) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    // With no content configured at all every mode is offered, so the popup still renders.
    const configured = availableModes(levelProps);
    const modes = configured.length > 0 ? configured : [...TYPING_TEST_MODES];
    this.settings = {
      ...defaults,
      mode: modes.includes(defaults.mode) ? defaults.mode : (modes[0] ?? defaults.mode),
    };

    this.popupMask = new Sprite({
      texture: Texture.WHITE,
      layout: { width: '100%', height: '100%', position: 'absolute' },
      tint: 0x0,
      interactive: true,
    });

    const background = new Graphics()
      .roundRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS)
      .fill(COLORS.PANEL);
    background.layout = { width: PANEL_WIDTH, height: PANEL_HEIGHT };

    const title = createFlowLabel('TYPING TEST', 72, COLORS.BUTTON);
    const subtitle = createFlowLabel('Choose your preferences for this test', 32, COLORS.TEXT);

    const modeControl = new SegmentedControl(
      modes.map((mode) => ({ value: mode, label: MODE_LABELS[mode] })),
      this.settings.mode,
      (mode) => {
        this.settings.mode = mode;
      },
    );

    const durationControl = new SegmentedControl<number>(
      TYPING_TEST_DURATIONS_SECONDS.map((seconds) => ({
        value: seconds,
        label: seconds === 60 ? '1 min' : `${seconds}s`,
      })),
      this.settings.durationSeconds,
      (seconds) => {
        this.settings.durationSeconds = seconds;
      },
    );

    const keyboardLabel = createFlowLabel('Show keyboard', 32, COLORS.TEXT);

    const keyboardToggle = new Toggle(this.settings.showKeyboard, (showKeyboard) => {
      this.settings.showKeyboard = showKeyboard;
    });

    const optionsRow = new Container({
      layout: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 32,
      },
      children: [durationControl, keyboardLabel, keyboardToggle],
    });

    const startButton = new FancyButton({
      defaultView: new Graphics()
        .roundRect(0, 12, 300, 130, 40)
        .fill({ color: COLORS.BUTTON_SHADOW, alpha: 0.8 })
        .roundRect(0, 0, 300, 130, 40)
        .fill(COLORS.BUTTON),
      text: new Text({
        text: 'START',
        style: { fontFamily: 'Concert One', fontSize: 68, fill: COLORS.BUTTON_TEXT },
      }),
      animations: { hover: { props: { scale: { x: 1.1, y: 1.1 } }, duration: 100 } },
      anchor: 0.5,
    });
    startButton.layout = { width: 300, height: 142, isLeaf: true };
    startButton.onPress.connect(() => {
      void engine().audio.sfx.play('level-splash/game-start.mp3');
      void engine()
        .navigation.hidePopup()
        .then(() => onStart({ ...this.settings }));
    });

    const content = new Container({
      layout: {
        position: 'absolute',
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
      },
      children: [title, subtitle, modeControl, optionsRow, startButton],
    });

    this.panel = new Container({ layout: true });
    this.panel.addChild(background, content);

    this.addChild(this.popupMask, this.panel);
  }

  public async show() {
    const currentEngine = engine();
    void currentEngine.audio.sfx.play('preload-audio/sfx/popup.mp3');
    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 5 })];
    }

    this.popupMask.alpha = 0;
    this.panel.alpha = 0;
    this.panel.scale.set(0.7);

    await Promise.all([
      animate(this.popupMask, { alpha: 0.5 }, { duration: 0.2, ease: 'linear' }),
      animate(this.panel, { alpha: 1 }, { duration: 0.4, ease: 'backOut' }),
      animate(this.panel.scale, { x: 1, y: 1 }, { duration: 0.4, ease: 'backOut' }),
    ]);
  }

  public async hide() {
    const currentEngine = engine();
    await Promise.all([
      animate(this.popupMask, { alpha: 0 }, { duration: 0.2, ease: 'linear' }),
      animate(this.panel, { alpha: 0 }, { duration: 0.2, ease: 'easeOut' }),
      animate(this.panel.scale, { x: 0.94, y: 0.94 }, { duration: 0.2, ease: 'easeOut' }),
    ]);

    if (currentEngine.navigation.currentScreen) {
      currentEngine.navigation.currentScreen.filters = [];
    }
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
  }
}
