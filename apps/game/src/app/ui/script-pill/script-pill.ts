import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Graphics, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { scriptState, type ORTHO_ENUM } from '../../../zustandStores/scriptState';
import { ScriptButton } from './script-button';

const PILL_FILL_COLOR = 0xd5925b;
const PADDING = 10;
const GAP = 10;
const ICON_SIZE = 70;
const DISABLED_ALPHA = 0.5;
const TOGGLE_DURATION = 0.3;

const SCRIPTS: ORTHO_ENUM[] = ['Arabic', 'Latin', 'Cyrillic'];
const DISABLED_SCRIPTS: ORTHO_ENUM[] = ['Cyrillic'];

/** Left edge of the option slot at `index` */
const slotX = (index: number) => PADDING + ICON_SIZE + GAP + index * (ScriptButton.BTN_WIDTH + GAP);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Pill-shaped script selector.
 *
 * Two values drive its look, both 0..1:
 * - `progress`: collapsed (icon only) → expanded (icon + every option)
 * - `dock`: free-standing pill → docked to the right screen edge (right curve pushed off-screen)
 */
export class ScriptPill extends Container {
  public static HEIGHT = PADDING * 2 + Math.max(ICON_SIZE, ScriptButton.BTN_HEIGHT);
  public static EXPANDED_WIDTH = slotX(SCRIPTS.length) - GAP + PADDING;
  public static COLLAPSED_WIDTH = PADDING + ICON_SIZE + PADDING; // icon only
  private static RADIUS = ScriptPill.HEIGHT / 2;

  /** Slot on the left of the pill holding the icon */
  public readonly iconSlot: Container;
  /** Fired whenever the pill's width or dock amount changes, so the owner can reposition it */
  public onLayoutChange?: () => void;

  private body: Graphics;
  private buttons: ScriptButton[];
  private toggleAnimation?: AnimationPlaybackControls;
  private unsubscribe: () => void;
  private readonly onSelect: (script: ORTHO_ENUM) => void;
  private _progress = 1;
  private _dock = 0;

  constructor(onSelect: (script: ORTHO_ENUM) => void) {
    super();
    this.onSelect = onSelect;

    this.body = new Graphics();
    this.body.eventMode = 'static';
    this.body.cursor = 'pointer';
    this.body.on('pointertap', () => {
      if (!this.isDocked) return;
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      if (this.isExpanded) this.collapse();
      else this.expand();
    });

    // The icon isn't interactive, so taps on it fall through to the body
    this.iconSlot = new Container();
    this.iconSlot.position.set(PADDING + ICON_SIZE / 2, ScriptPill.HEIGHT / 2);
    const icon = new Sprite({ texture: Texture.from('preload/language_icon.svg'), anchor: 0.5 });
    icon.scale.set(Math.min(ICON_SIZE / icon.texture.width, ICON_SIZE / icon.texture.height));
    this.iconSlot.addChild(icon);

    this.buttons = SCRIPTS.map(
      (s) =>
        new ScriptButton(s, (script) => this.onOptionPress(script), DISABLED_SCRIPTS.includes(s)),
    );

    this.addChild(this.body, this.iconSlot, ...this.buttons);

    this.unsubscribe = scriptState.subscribe(() => this.apply());
    this.apply();
  }

  public get progress() {
    return this._progress;
  }

  public get dock() {
    return this._dock;
  }

  public get isDocked() {
    return this._dock >= 1;
  }

  public get isExpanded() {
    return this._progress > 0;
  }

  /** Width of the visible part of the pill */
  public get visibleWidth() {
    return lerp(ScriptPill.COLLAPSED_WIDTH, ScriptPill.EXPANDED_WIDTH, this._progress);
  }

  /** Jump to a state (used directly by the owner while it animates transitions) */
  public setState(progress: number, dock: number) {
    this._progress = progress;
    this._dock = dock;
    this.apply();
  }

  /** Slide the options out from the right edge */
  public expand() {
    this.animateProgress(1);
  }

  /** Settle back to the icon */
  public collapse() {
    this.animateProgress(0);
  }

  public stopToggle() {
    this.toggleAnimation?.stop();
    this.toggleAnimation = undefined;
  }

  private animateProgress(to: number) {
    this.stopToggle();
    this.toggleAnimation = animate(this._progress, to, {
      duration: TOGGLE_DURATION,
      ease: 'easeOut',
      onUpdate: (progress) => this.setState(progress, this._dock),
    });
  }

  private onOptionPress(script: ORTHO_ENUM) {
    // Free-standing (home screen): always expanded, a press just selects
    if (!this.isDocked) {
      this.onSelect(script);
      return;
    }
    if (script !== scriptState.getState().currentScript) {
      this.onSelect(script);
    }
    this.collapse();
  }

  private apply() {
    const p = this._progress;
    const width = this.visibleWidth;
    // When docked, draw past the right edge so only the left curve is on screen
    const overhang = ScriptPill.RADIUS * this._dock;

    this.body
      .clear()
      .roundRect(0, 0, width + overhang, ScriptPill.HEIGHT, ScriptPill.RADIUS)
      .fill(PILL_FILL_COLOR);

    const current = scriptState.getState().currentScript;
    const y = ScriptPill.HEIGHT / 2;
    this.buttons.forEach((btn, i) => {
      // Options fan out from the first slot and fade in; collapsed shows only the icon
      const left = lerp(slotX(0), slotX(i), p);
      btn.position.set(left + ScriptButton.BTN_WIDTH / 2, y);
      const baseAlpha = btn.disabled ? DISABLED_ALPHA : 1;
      btn.alpha = baseAlpha * p;
      btn.eventMode = p > 0.5 ? 'static' : 'none';
    });
    const selectedButton = this.buttons.find((btn) => btn.script === current);
    if (selectedButton) this.setChildIndex(selectedButton, this.children.length - 1);

    this.onLayoutChange?.();
  }

  destroy(options?: Parameters<Container['destroy']>[0]) {
    this.stopToggle();
    this.unsubscribe();
    super.destroy(options);
  }
}
