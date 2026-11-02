import { FancyButton } from '@pixi/ui';
import { Graphics, HTMLText } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { getFontFamilyForScript } from '../../../utils/script';
import { scriptState, type ORTHO_ENUM } from '../../../zustandStores/scriptState';

const LABELS: Record<ORTHO_ENUM, string> = {
  Arabic: 'ئۇيغۇر',
  Cyrillic: 'КИР',
  Latin: 'LATIN',
};

const SELECTED_FILL_COLOR = 0xfdf7e7;

/** A single option segment inside the ScriptPill. The pill decides what a press does. */
export class ScriptButton extends FancyButton {
  private bg: Graphics;
  private unsubscribe: () => void;
  public readonly script: ORTHO_ENUM;
  public readonly disabled: boolean;
  public static BTN_WIDTH = 200;
  public static BTN_HEIGHT = 70;
  private static RADIUS = ScriptButton.BTN_HEIGHT / 2;

  constructor(script: ORTHO_ENUM, onSelect: (script: ORTHO_ENUM) => void, disabled = false) {
    const label = new HTMLText({
      text: LABELS[script],
      style: {
        fill: 0x000000,
        fontFamily: getFontFamilyForScript(script),
        fontSize: 34,
        fontWeight: 'bold',
        align: 'center',
        cssOverrides: [`direction: ${script === 'Arabic' ? 'rtl' : 'ltr'}`],
      },
    });

    // draw geometry early so FancyButton measures real bounds
    const bg = new Graphics()
      .roundRect(0, 0, ScriptButton.BTN_WIDTH, ScriptButton.BTN_HEIGHT, ScriptButton.RADIUS)
      .fill({ color: SELECTED_FILL_COLOR, alpha: 0 });

    super({
      defaultView: bg,
      text: label,
      textOffset: { x: 0, y: 6 }, // lazy center hack
      animations: disabled
        ? undefined
        : {
            hover: { props: { scale: { x: 1.05, y: 1.05 } }, duration: 100 },
            pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
          },
      anchor: 0.5,
    });

    this.script = script;
    this.bg = bg;
    this.disabled = disabled;
    this.enabled = !disabled;
    this.cursor = disabled ? 'default' : 'pointer';
    this.paint(scriptState.getState().currentScript);

    this.onPress.connect(() => {
      if (this.disabled) return;
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      onSelect(this.script);
    });

    this.unsubscribe = scriptState.subscribe((state) => this.paint(state.currentScript));
  }

  private paint(currentScript: ORTHO_ENUM) {
    const isActive = !this.disabled && currentScript === this.script;
    // keep an invisible fill when inactive so the hit area / bounds stay the same
    this.bg
      .clear()
      .roundRect(0, 0, ScriptButton.BTN_WIDTH, ScriptButton.BTN_HEIGHT, ScriptButton.RADIUS)
      .fill({ color: SELECTED_FILL_COLOR, alpha: isActive ? 1 : 0 });
  }

  destroy(options?: Parameters<FancyButton['destroy']>[0]) {
    this.unsubscribe();
    super.destroy(options);
  }
}
