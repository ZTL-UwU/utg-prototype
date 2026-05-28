import { animate } from 'motion';
import { BlurFilter, Container, Graphics, Text, TextStyle } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import useSessionStore from '../../../zustandStores/sessionStore';
import { LevelMapScreen } from '../../screens/level-map';
import { BackButton } from '../../ui/back-button';
import { Stars } from './stars';

const POPUP_WIDTH = 857;
const POPUP_HEIGHT = 547;
const POPUP_RADIUS = 28;

const POPUP_BACKGROUND_COLORS = {
  typing: 0x7e5433,
  education: 0x5a8cd4,
} as const;

function createPopupBackground(width: number, height: number, type: 'education' | 'typing') {
  return new Graphics()
    .roundRect(0, 0, width, height, POPUP_RADIUS)
    .fill(POPUP_BACKGROUND_COLORS[type]);
}

const POPUP_TEXT_COLORS = {
  typing: 0xfad68a,
  education: 0xfdf7e7,
} as const;

function createStatStyle(type: 'education' | 'typing') {
  return new TextStyle({
    fontFamily: 'Concert One',
    fontSize: 32,
    fontWeight: '700',
    fill: POPUP_TEXT_COLORS[type],
  });
}

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
  private background: Graphics;
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

    this.background = createPopupBackground(POPUP_WIDTH, POPUP_HEIGHT, type);
    this.background.layout = {
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT,
    };

    this.stars = new Stars(starCount, POPUP_WIDTH);
    const statStyle = createStatStyle(type);
    const correctText = new Text({ text: `Correct   ${correct}`, style: statStyle, layout: true });
    const mistakesText = new Text({
      text: `Mistakes  ${mistakes}`,
      style: statStyle,
      layout: true,
    });
    const accuracyText = new Text({
      text: `Accuracy  ${accuracy}%`,
      style: statStyle,
      layout: true,
    });

    this.contentContainer = new Container({
      layout: {
        position: 'absolute',
        width: POPUP_WIDTH,
        height: POPUP_HEIGHT,
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
