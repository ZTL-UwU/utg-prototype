import { animate } from 'motion';
import { BlurFilter, Container, Sprite, Text, TextStyle, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import useSessionStore from '../../../zustandStores/sessionStore';
import { LevelMapScreen } from '../../screens/level-map';
import { BackButton } from '../../ui/back-button';
import { Stars } from './stars';

const STAT_STYLE = new TextStyle({
  fontFamily: 'Concert One',
  fontSize: 32,
  fontWeight: '700',
  fill: 0xfad68a,
});

function getStarCount(accuracy: number) {
  if (accuracy > 90) return 3;
  if (accuracy > 70) return 2;
  if (accuracy > 50) return 1;
  return 0;
}

function readSessionResults() {
  const { correct, mistakes } = useSessionStore.getState();
  const total = correct + mistakes;
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

  useSessionStore.getState().reset();

  return {
    correct,
    mistakes,
    accuracy,
    starCount: getStarCount(accuracy),
  };
}

export class EndScreenPopup extends Container {
  public static assetBundles = ['end-screen'];

  private innerContainer: Container;
  private background: Sprite;
  private contentContainer: Container;
  private backButton: BackButton;
  private stars: Stars;

  constructor(type: 'education' | 'typing') {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    const { correct, mistakes, accuracy, starCount } = readSessionResults();
    const backgroundTexture = Texture.from('end-screen/end-popup-background.svg');
    const popupWidth = backgroundTexture.width;
    const popupHeight = backgroundTexture.height;

    this.background = new Sprite({
      texture: backgroundTexture,
      layout: {
        width: popupWidth,
        height: popupHeight,
        objectFit: 'cover',
      },
    });

    this.stars = new Stars(starCount, popupWidth);
    const correctText = new Text({ text: `Correct   ${correct}`, style: STAT_STYLE, layout: true });
    const mistakesText = new Text({
      text: `Mistakes  ${mistakes}`,
      style: STAT_STYLE,
      layout: true,
    });
    const accuracyText = new Text({
      text: `Accuracy  ${accuracy}%`,
      style: STAT_STYLE,
      layout: true,
    });

    this.contentContainer = new Container({
      layout: {
        position: 'absolute',
        width: popupWidth,
        height: popupHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingTop: 24,
      },
    });
    this.contentContainer.addChild(this.stars, correctText, mistakesText, accuracyText);

    this.backButton = new BackButton(() => {
      void engine().navigation.hidePopup();
      void engine().navigation.showScreen(LevelMapScreen, type);
    });
    this.backButton.scale = 0.7;

    this.innerContainer = new Container({ layout: true });
    this.innerContainer.addChild(this.background, this.contentContainer, this.backButton);
    this.addChild(this.innerContainer);
  }

  public async show() {
    const currentEngine = engine();
    if (!currentEngine.navigation.currentScreen) return;

    currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 0 })];

    this.innerContainer.alpha = 0;
    this.innerContainer.scale.set(0.7);

    const duration = 0.4;
    await Promise.all([
      animate(this.innerContainer, { alpha: 1 }, { duration, ease: 'backOut' }),
      animate(this.innerContainer.scale, { x: 1, y: 1 }, { duration, ease: 'backOut' }),
      animate(
        currentEngine.navigation.currentScreen.filters[0] as BlurFilter,
        { strength: 9 },
        { duration, ease: 'easeOut' },
      ),
    ]);
  }

  public async hide() {
    const currentEngine = engine();
    if (!currentEngine.navigation.currentScreen) return;

    const duration = 0.2;
    await Promise.all([
      animate(this.innerContainer, { alpha: 0 }, { duration, ease: 'easeOut' }),
      animate(this.innerContainer.scale, { x: 0.94, y: 0.94 }, { duration, ease: 'easeOut' }),
      animate(
        currentEngine.navigation.currentScreen.filters[0] as BlurFilter,
        { strength: 0 },
        { duration, ease: 'easeOut' },
      ),
    ]);
  }

  public resize(width: number, height: number) {
    this.layout = {
      width,
      height,
    };
  }
}
