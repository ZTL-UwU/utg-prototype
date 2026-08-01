import { FancyButton } from '@pixi/ui';
import { Graphics, HTMLText } from 'pixi.js';

import { scriptState, type ORTHO_ENUM } from '../../../zustandStores/scriptState';

const LABELS: Record<ORTHO_ENUM, string> = {
  Arabic: 'ئۇيغۇر',
  Cyrillic: 'КИР',
  Latin: 'LATIN',
};

const RADIUS = 18;
const FILL_COLOR = 0xff914d;
const ACTIVE_FILL_COLOR = 0xffde59;

export class ScriptButton extends FancyButton {
  private bg: Graphics;
  private script: ORTHO_ENUM;
  private unsubscribe: () => void;
  public static BTN_WIDTH = 240; // larger
  public static BTN_HEIGHT = 90; // larger

  constructor(script: ORTHO_ENUM) {
    const label = new HTMLText({
      text: LABELS[script],
      style: {
        fill: 0xffffff,
        fontFamily: 'Concert One',
        fontSize: 40,
        fontWeight: 'bold',
        align: 'center',
      },
    });

    // draw geometry early so FancyButton measures real bounds
    const bg = new Graphics()
      .roundRect(0, 0, ScriptButton.BTN_WIDTH, ScriptButton.BTN_HEIGHT, RADIUS)
      .fill(FILL_COLOR);

    super({
      defaultView: bg,
      text: label,
      textOffset: { x: 0, y: 8 }, // lazy center hack
      animations: {
        hover: { props: { scale: { x: 1.05, y: 1.05 } }, duration: 100 },
        pressed: { props: { scale: { x: 0.97, y: 0.97 } }, duration: 100 },
      },
      anchor: 0.5,
    });

    this.script = script;
    this.bg = bg;

    this.paint(scriptState.getState().currentScript);

    this.onPress.connect(() => {
      const { currentScript, setCurrentScript } = scriptState.getState();
      if (currentScript === this.script) return; // noop
      setCurrentScript(this.script);
    });

    this.unsubscribe = scriptState.subscribe((state) => this.paint(state.currentScript));
  }

  private paint(currentScript: ORTHO_ENUM) {
    const isActive = currentScript === this.script;
    this.bg
      .clear()
      .roundRect(0, 0, ScriptButton.BTN_WIDTH, ScriptButton.BTN_HEIGHT, RADIUS)
      .fill(isActive ? ACTIVE_FILL_COLOR : FILL_COLOR);
  }

  destroy(options?: Parameters<FancyButton['destroy']>[0]) {
    this.unsubscribe();
    super.destroy(options);
  }
}
