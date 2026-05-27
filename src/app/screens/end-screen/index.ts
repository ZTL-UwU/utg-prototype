import { Container, Sprite, Text, TextStyle, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import useSessionStore from '../../../zustandStores/sessionStore';
import { BackButton } from '../../ui/back-button';
import { HomeScreen } from '../home';

export class EndScreen extends Container {
  public static assetBundles = ['end-screen', 'ui'];

  private background: Sprite;
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

    this.backButton = new BackButton(() => {
      void engine().navigation.showScreen(HomeScreen);
    });

    this.title = new Text({
      text: 'RESULTS',
      style: new TextStyle({
        fontFamily: 'Poppins',
        fontSize: 150,
        fontWeight: '800',
        fill: 0xffffff,
      }),
    });
    this.title.layout = { width: '100%', alignSelf: 'center' };
    const statStyle = new TextStyle({
      fontFamily: 'Concert One',
      fontSize: 80,
      fontWeight: '800',
      fill: 0xffffff,
    });

    if (type) {
      this.typeText = new Text({ text: type.toUpperCase(), style: statStyle });
      this.typeText.layout = { width: '100%', alignSelf: 'center' };
    }

    this.correctText = new Text({ text: `+ Correct:   ${correct}`, style: statStyle });
    this.correctText.layout = { width: '100%', alignSelf: 'center' };

    this.missesText = new Text({ text: `- Misses:    ${mistakes}`, style: statStyle });
    this.missesText.layout = { width: '100%', alignSelf: 'center' };

    this.accuracyText = new Text({ text: `% Accuracy:  ${accuracy}%`, style: statStyle });
    this.accuracyText.layout = { width: '100%', alignSelf: 'center' };

    this.addChild(
      this.background,
      this.title,
      ...(this.typeText ? [this.typeText] : []),
      this.correctText,
      this.missesText,
      this.accuracyText,
      this.backButton,
    );
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 40,
    };
  }
}
