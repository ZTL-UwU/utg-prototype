import { BlurFilter, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import useSessionStore from '../../../zustandStores/sessionStore';
import { BackButton } from '../../ui/back-button';
import { HomeScreen } from '../home';

const PANEL_WIDTH = 600;
const PANEL_PADDING_X = 64;
const PANEL_PADDING_Y = 48;
const PANEL_GAP = 28;

export class EndScreen extends Container {
  public static assetBundles = ['end-screen', 'ui'];

  private background: Sprite;
  private panel: Container;
  private panelBg: Graphics;
  private title: Text;
  private correctText: Text;
  private missesText: Text;
  private accuracyText: Text;
  private typeText: Text | null = null;
  private backButton: BackButton;

  constructor(props: Record<string, unknown>) {
    super();

    const correct = (props?.correct as number) ?? 0;
    const mistakes = (props?.mistakes as number) ?? 0;
    const type = props?.type as string | undefined;
    const total = correct + mistakes;
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
    useSessionStore.getState().reset();

    this.background = new Sprite({
      texture: Texture.from('end-screen/end-screen-bg.jpg'),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });
    this.background.filters = [new BlurFilter({ strength: 8 })];

    this.backButton = new BackButton(() => {
      void engine().navigation.showScreen(HomeScreen);
    });

    const titleStyle = new TextStyle({
      fontFamily: 'Fredoka One',
      fontSize: 90,
      fontWeight: '400',
      fill: 0x4a2810,
      letterSpacing: 6,
    });

    const statStyle = new TextStyle({
      fontFamily: 'Fredoka One',
      fontSize: 48,
      fontWeight: '400',
      fill: 0x4a2810,
      letterSpacing: 2,
    });

    const labelStyle = new TextStyle({
      fontFamily: 'Fredoka One',
      fontSize: 34,
      fontWeight: '400',
      fill: 0xffffff,
      letterSpacing: 1,
    });

    this.title = new Text({ text: 'RESULTS', style: titleStyle });
    this.correctText = new Text({ text: `Correct      ${correct}`, style: statStyle });
    this.missesText = new Text({ text: `Misses       ${mistakes}`, style: statStyle });
    this.accuracyText = new Text({ text: `Accuracy     ${accuracy}%`, style: statStyle });

    if (type) {
      this.typeText = new Text({ text: type.toUpperCase(), style: labelStyle });
    }

    // manually stack text vertically inside panel
    const texts = [
      this.title,
      ...(this.typeText ? [this.typeText] : []),
      this.correctText,
      this.missesText,
      this.accuracyText,
    ];

    let currentY = PANEL_PADDING_Y;
    for (const t of texts) {
      t.x = PANEL_PADDING_X;
      t.y = currentY;
      currentY += t.height + PANEL_GAP;
    }

    const panelHeight = currentY + PANEL_PADDING_Y - PANEL_GAP;

    // draw frosted glass bg at known size
    this.panelBg = new Graphics()
      .roundRect(0, 0, PANEL_WIDTH, panelHeight, 24)
      .fill({ color: 0xfff8f0, alpha: 0.35 })
      .roundRect(0, 0, PANEL_WIDTH, panelHeight, 24)
      .stroke({ color: 0xffffff, alpha: 0.55, width: 1.5 });

    this.panel = new Container();
    this.panel.addChild(this.panelBg, ...texts);

    this.addChild(this.background, this.panel, this.backButton);
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
    // manually center the panel
    this.panel.x = (width - PANEL_WIDTH) / 2;
    this.panel.y = (height - this.panel.height) / 2;
  }
}
