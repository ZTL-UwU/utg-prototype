import { animate } from 'motion';
import { BlurFilter, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { useLevelProgress } from '../../../zustandStores/levelProgressStore';
import { getStarCount } from '../../../zustandStores/scoreManager';
import useSessionStore from '../../../zustandStores/sessionStore';
import { LevelMapScreen } from '../../screens/level-map';
import type { TLevel } from '../../screens/level-map/units';
import {
  findMapUnitForLevel,
  getLevelType,
  getNextLevelAfter,
} from '../../screens/level-map/units';
import { LevelSplashScreen } from '../../screens/level-splash';
import { BackButton } from '../../ui/back-button';
import { NextButton } from '../../ui/next-button';
import { Stars } from './stars';

const POPUP_WIDTH = 940;
const POPUP_HEIGHT = 600;
const POPUP_RADIUS = 32;

// New mascot driven color selections, replace old type driven selection
const MASCOT_BACKGROUND_COLORS = {
  camel: 0x7e5433,
  sheep: 0x5a8cd4,
  goat: 0x5a8cd4,
} as const;

const MASCOT_TEXT_COLORS = {
  camel: 0xfad68a,
  sheep: 0xfdf7e7,
  goat: 0xfdf7e7,
} as const;

function createPopupBackground(width: number, height: number, mascot: 'sheep' | 'goat' | 'camel') {
  return new Graphics()
    .roundRect(0, 0, width, height, POPUP_RADIUS)
    .fill(MASCOT_BACKGROUND_COLORS[mascot]);
}

function createScoreTitleStyle(mascot: 'sheep' | 'goat' | 'camel') {
  return new TextStyle({
    fontFamily: 'Concert One',
    fontSize: 48,
    fontWeight: '700',
    fill: MASCOT_TEXT_COLORS[mascot],
    letterSpacing: 4,
  });
}

function createStatStyle(mascot: 'sheep' | 'goat' | 'camel') {
  return new TextStyle({
    fontFamily: 'Concert One',
    fontSize: 32,
    fontWeight: '700',
    fill: MASCOT_TEXT_COLORS[mascot],
  });
}

type MascotVariant = 'excellent' | 'well-done' | 'good-try' | 'try-again';

function getMascotVariant(starCount: number): MascotVariant {
  if (starCount >= 3) return 'excellent';
  if (starCount >= 2) return 'well-done';
  if (starCount >= 1) return 'good-try';
  return 'try-again';
}

function getMascotTexture(mascot: 'sheep' | 'camel' | 'goat', variant: MascotVariant) {
  return `mascots/${mascot}/dialog/${variant}.png`;
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

type EndScreenPopupProps = {
  level: TLevel;
};

function getCurrentMascot(level: TLevel): 'sheep' | 'goat' | 'camel' {
  return level.mascot;
}

function goToLevelMap(level: TLevel) {
  const mapUnit = findMapUnitForLevel(level);
  void engine()
    .navigation.hidePopup()
    .then(() => engine().navigation.showScreen(LevelMapScreen, mapUnit));
}

function goToNextLevel(nextLevel: NonNullable<ReturnType<typeof getNextLevelAfter>>) {
  void engine()
    .navigation.hidePopup()
    .then(() =>
      engine().navigation.showScreen(LevelSplashScreen, {
        level: nextLevel.level,
        mapUnit: nextLevel.mapUnit,
      }),
    );
}

export class EndScreenPopup extends Container {
  public static assetBundles = ['end-screen', 'mascots', 'ui'];
  private currentMascot: 'sheep' | 'camel' | 'goat';

  private innerContainer: Container;
  private background: Graphics;
  private contentContainer: Container;
  private stars: Stars;
  private starCount: number;

  constructor({ level }: EndScreenPopupProps) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });
    this.currentMascot = getCurrentMascot(level);
    const { correct, mistakes, accuracy, starCount } = readSessionResults();
    this.starCount = starCount;
    useLevelProgress.getState().markAttempted(getLevelType(level), level.id);
    this.background = createPopupBackground(POPUP_WIDTH, POPUP_HEIGHT, this.currentMascot);
    this.background.layout = {
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT,
    };

    this.stars = new Stars(starCount, POPUP_WIDTH);
    const scoreTitle = new Text({
      text: 'SCORE',
      style: createScoreTitleStyle(this.currentMascot),
      layout: true,
    });

    const statStyle = createStatStyle(this.currentMascot);
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
      texture: Texture.from(getMascotTexture(this.currentMascot, getMascotVariant(starCount))),
      layout: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 310,
        objectFit: 'contain',
      },
    });

    const backButton = new BackButton(() => goToLevelMap(level));
    backButton.anchor.set(0, 1);
    backButton.layout = {
      position: 'absolute',
      left: 28,
      top: 28,
    };
    backButton.anchor.set(0, 0);
    backButton.scale.set(0.7);

    const nextLevel = getNextLevelAfter(level);
    const nextButton = new NextButton(() => {
      if (nextLevel) goToNextLevel(nextLevel);
    });
    nextButton.alpha = nextLevel ? 1 : 0.45;
    if (!nextLevel) nextButton.eventMode = 'none';
    nextButton.scale.set(0.7);

    this.innerContainer = new Container({ layout: true });
    this.innerContainer.addChild(
      this.background,
      this.contentContainer,
      mascot,
      backButton,
      nextButton,
    );

    this.addChild(this.innerContainer);
  }

  public async show() {
    const currentEngine = engine();
    if (!currentEngine.navigation.currentScreen) return;
    currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 0 })];
    if (this.starCount <= 1) {
      void engine().audio.sfx.play('end-screen/level-failed.mp3');
    } else {
      void engine().audio.sfx.play('end-screen/level-complete.mp3');
    }
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
