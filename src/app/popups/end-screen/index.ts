import { BlurFilter, Container, Sprite, Text, TextStyle, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import useSessionStore from '../../../zustandStores/sessionStore';
import { HomeScreen } from '../../screens/home';
import { BackButton } from '../../ui/back-button';
import { Stars } from './stars';

// interface EndScreenPopupProps {
//   starNum: number;
// }

export class EndScreenPopup extends Container {
  private background: Sprite;
  private contentContainer: Container;
  private backButton: BackButton;
  private stars: Stars;
  private correctText: Text;
  private mistakesText: Text;
  private accuracyText: Text;
  public static assetBundles = ['end-screen'];

  constructor() {
    super({
      layout: {
        position: 'absolute',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        top: '25%',
        left: '25%',
      },
    });

    this.background = new Sprite({
      texture: Texture.from('end-screen/end-popup-background.svg'),
      layout: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    });

    const { correct, mistakes } = useSessionStore.getState();
    const total = correct + mistakes;
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

    useSessionStore.getState().reset();
    const statStyle = new TextStyle({
      fontFamily: 'Fredoka One',
      fontSize: 32,
      fontWeight: '400',
      fill: 0xfad68a,
      letterSpacing: 1,
    });

    this.correctText = new Text({ text: `Correct   ${correct}`, style: statStyle, layout: true });
    this.mistakesText = new Text({ text: `Mistakes  ${mistakes}`, style: statStyle, layout: true });
    this.accuracyText = new Text({
      text: `Accuracy  ${accuracy}%`,
      style: statStyle,
      layout: true,
    });
    const starNum = accuracy > 90 ? 3 : accuracy > 70 ? 2 : accuracy > 50 ? 1 : 0;
    this.stars = new Stars(starNum);
    this.contentContainer = new Container({
      layout: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
      },
    });
    this.contentContainer.addChild(
      this.stars,
      this.correctText,
      this.mistakesText,
      this.accuracyText,
    );
    this.background.addChild(this.contentContainer);

    this.backButton = new BackButton(() => {
      void engine().navigation.hidePopup();
      void engine().navigation.showScreen(HomeScreen);
    });
    this.backButton.scale.set(0.5);
    this.background.addChild(this.backButton);
    this.addChild(this.background);
  }

  resize(width: number, height: number) {
    const popupW = width * 0.5;
    const popupH = height * 0.5;
    this.layout = {
      position: 'absolute',
      top: height * 0.25,
      left: width * 0.25,
      width: popupW,
      height: popupH,
    };
    this.background.width = popupW;
    this.background.height = popupH;

    this.contentContainer.layout = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      width: popupW,
      height: popupH,
    };

    const starRowH = popupH * 0.2;
    this.stars.resize(popupW, starRowH);
  }

  async show() {
    if (engine().navigation.currentScreen != undefined) {
      engine().navigation.currentScreen!.filters = [new BlurFilter({ strength: 9 })];
    }
  }
}
