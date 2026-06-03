import { animate } from 'motion';
import { BlurFilter, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { getStarCount } from '../../../zustandStores/scoreManager';
import useSessionStore from '../../../zustandStores/sessionStore';
import { LevelMapScreen } from '../../screens/level-map';
import { ContinueButton } from '../../ui/continue-button';
import { Stars } from './stars';

const POPUP_WIDTH = 940;
const POPUP_HEIGHT = 600;
const POPUP_RADIUS = 32;

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

function createScoreTitleStyle(type: 'education' | 'typing') {
  return new TextStyle({
    fontFamily: 'Concert One',
    fontSize: 48,
    fontWeight: '700',
    fill: POPUP_TEXT_COLORS[type],
    letterSpacing: 4,
  });
}

function createStatStyle(type: 'education' | 'typing') {
  return new TextStyle({
    fontFamily: 'Concert One',
    fontSize: 32,
    fontWeight: '700',
    fill: POPUP_TEXT_COLORS[type],
  });
}

type MascotVariant = 'default' | 'welldone' | 'excellent';

function getMascotVariant(starCount: number): MascotVariant {
  if (starCount >= 3) return 'excellent';
  if (starCount >= 2) return 'welldone';
  return 'default';
}

function getMascotTexture(type: 'education' | 'typing', variant: MascotVariant) {
  const animal = type === 'typing' ? 'camel' : 'sheep';
  if (variant === 'excellent') return `mascots/${animal}/dialog/excellent.png`;
  if (variant === 'welldone') return `mascots/${animal}/dialog/well-done.png`;
  return type === 'typing' ? 'mascots/camel/default.png' : 'mascots/sheep/default.svg';
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

function goToLevelMap(type: 'education' | 'typing') {
  void engine().navigation.hidePopup();
  void engine().navigation.showScreen(LevelMapScreen, type);
}

export class EndScreenPopup extends Container {
  public static assetBundles = ['end-screen', 'mascots', 'ui'];

  private innerContainer: Container;
  private background: Graphics;
  private contentContainer: Container;
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
    const scoreTitle = new Text({
      text: 'SCORE',
      style: createScoreTitleStyle(type),
      layout: true,
    });

    const statStyle = createStatStyle(type);
    const correctText = new Text({
      text: `Correct : ${correct}`,
      style: statStyle,
      layout: true,
    });
    const mistakesText = new Text({
      text: `Mistakes : ${mistakes}`,
      style: statStyle,
      layout: true,
    });
    const accuracyText = new Text({
      text: `Accuracy : ${accuracy}%`,
      style: statStyle,
      layout: true,
    });

    const headerSection = new Container({
      layout: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        gap: 8,
        paddingTop: 48,
      },
    });
    headerSection.addChild(this.stars, scoreTitle);

    const statsSection = new Container({
      layout: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 18,
        flex: 1,
        paddingLeft: 88,
        paddingTop: 16,
        justifyContent: 'center',
      },
    });
    statsSection.addChild(correctText, mistakesText, accuracyText);

    const bodySection = new Container({
      layout: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        flex: 1,
        alignItems: 'center',
      },
    });
    bodySection.addChild(statsSection);

    this.contentContainer = new Container({
      layout: {
        position: 'absolute',
        width: POPUP_WIDTH,
        height: POPUP_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
      },
    });
    this.contentContainer.addChild(headerSection, bodySection);

    const mascot = new Sprite({
      texture: Texture.from(getMascotTexture(type, getMascotVariant(starCount))),
      layout: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 310,
        objectFit: 'contain',
      },
    });

    const continueButton = new ContinueButton(() => goToLevelMap(type));
    continueButton.scale.set(0.7);

    this.innerContainer = new Container({ layout: true });
    this.innerContainer.addChild(this.background, this.contentContainer, mascot, continueButton);

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
      this.stars.playShowAnimation(),
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
