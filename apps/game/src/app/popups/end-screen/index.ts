import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { BlurFilter, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { waitFor } from '../../../engine/utils/waitFor';
import { submitLevelResult, type LevelResultOutcome } from '../../../lib/levelResults';
import { useLevelProgress } from '../../../zustandStores/levelProgressStore';
import { REMOTE_REWARDS_BUNDLE, resolveRewardsByIds } from '../../../zustandStores/rewardStore';
import { getStarCount } from '../../../zustandStores/scoreManager';
import useSessionStore from '../../../zustandStores/sessionStore';
import { useUserRewardStore } from '../../../zustandStores/userRewardStore';
import { LevelMapScreen } from '../../screens/level-map';
import type { TLayer, TLevel } from '../../screens/level-map/units';
import {
  findMapUnitForLevel,
  getNextLevelAfter,
  REMOTE_MASCOTS_BUNDLE,
} from '../../screens/level-map/units';
import { LevelSplashScreen } from '../../screens/level-splash';
import { BackButton } from '../../ui/back-button';
import { NextButton } from '../../ui/next-button';
import { RetryButton } from '../../ui/retry-button';
import { PassportPopup } from '../passport';
import { hasPostcard, PostcardPopup, toPostcardSlug } from '../postcard';
import { RewardCelebration } from './reward-celebration';
import { Stars } from './stars';

const POPUP_WIDTH = 940;
const POPUP_HEIGHT = 600;
const POPUP_RADIUS = 32;

/** Hang guard on the level-result POST; under any normal network the result wins. */
const RESULT_TIMEOUT = 10;

const LAYER_BACKGROUND_COLORS: Record<TLayer, number> = {
  education: 0x5a8cd4,
  typing: 0x7e5433,
  game: 0x7e5433,
};

const LAYER_TEXT_COLORS: Record<TLayer, number> = {
  education: 0xfdf7e7,
  typing: 0xfad68a,
  game: 0xffe2bc,
};

function createPopupBackground(width: number, height: number, layer: TLayer) {
  return new Graphics()
    .roundRect(0, 0, width, height, POPUP_RADIUS)
    .fill(LAYER_BACKGROUND_COLORS[layer]);
}

function createScoreTitleStyle(layer: TLayer) {
  return new TextStyle({
    fontFamily: 'Concert One',
    fontSize: 48,
    fontWeight: '700',
    fill: LAYER_TEXT_COLORS[layer],
    letterSpacing: 4,
  });
}

function createStatStyle(layer: TLayer) {
  return new TextStyle({
    fontFamily: 'Concert One',
    fontSize: 32,
    fontWeight: '700',
    fill: LAYER_TEXT_COLORS[layer],
  });
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

function goToLevelMap(level: TLevel) {
  const mapUnit = findMapUnitForLevel(level);
  void engine()
    .navigation.hidePopup()
    .then(() => engine().navigation.showScreen(LevelMapScreen, mapUnit));
}

/** Replays the level just finished. The splash's START handler re-starts the session. */
function goToRetryLevel(level: TLevel) {
  const mapUnit = findMapUnitForLevel(level);
  void engine()
    .navigation.hidePopup()
    .then(() => engine().navigation.showScreen(LevelSplashScreen, { level, mapUnit }));
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
  // 'layer-select' is here for the passport button's texture
  public static assetBundles = [
    'end-screen',
    REMOTE_MASCOTS_BUNDLE,
    'ui',
    'layer-select',
    REMOTE_REWARDS_BUNDLE,
  ];

  private innerContainer: Container;
  private background: Graphics;
  private contentContainer: Container;
  private stars: Stars;
  private starCount: number;

  private postcardSlug?: string;
  private passportButton: FancyButton;

  private resultPromise: Promise<LevelResultOutcome>;
  private rewardCelebration?: RewardCelebration;

  constructor({ level }: EndScreenPopupProps) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });
    const { correct, mistakes, accuracy, starCount } = readSessionResults();
    this.starCount = starCount;
    // useLevelProgress.getState().markAttempted(getLevelType(level), level.id);

    // readSessionResults() already reset the session store, so these are the only
    // copies of the counts left. Unawaited, to overlap the show() animations.
    this.resultPromise = submitLevelResult({
      level: level.id,
      star: starCount,
      // No per-level score exists; the correct count stands in for one.
      score: correct,
      correct,
      mistake: mistakes,
    });

    const progress = useLevelProgress.getState();
    const mapUnit = findMapUnitForLevel(level);
    const layer = mapUnit.type;
    progress.markAttempted(layer, level.id);
    if (mapUnit?.type === 'education') {
      const unitComplete =
        mapUnit.levels.length > 0 &&
        mapUnit.levels.every((game) => progress.isAttempted(mapUnit.type, game.id));
      if (unitComplete) {
        progress.queueMapUnitAnimation(mapUnit.type, mapUnit.id);
      }
    }
    if (mapUnit?.type === 'typing') {
      const slug = toPostcardSlug(level.title);
      if (slug && hasPostcard(slug)) {
        this.postcardSlug = slug;
      }
    }
    this.background = createPopupBackground(POPUP_WIDTH, POPUP_HEIGHT, layer);
    this.background.layout = {
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT,
    };

    this.stars = new Stars(starCount, POPUP_WIDTH);
    const scoreTitle = new Text({
      text: 'SCORE',
      style: createScoreTitleStyle(layer),
      layout: true,
    });

    const statStyle = createStatStyle(layer);
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

    const mascotAlias = level.mascot?.starAliases[starCount];
    const mascot = mascotAlias
      ? new Sprite({
          texture: Texture.from(mascotAlias),
          layout: {
            position: 'absolute',
            right: 20,
            bottom: 20,
            width: 310,
            objectFit: 'contain',
          },
        })
      : null;

    const backButton = new BackButton(() => goToLevelMap(level));
    backButton.anchor.set(0, 1);
    backButton.layout = {
      position: 'absolute',
      left: 28,
      top: 28,
    };
    backButton.anchor.set(0, 0);
    backButton.scale.set(0.7);

    const retryButton = new RetryButton(() => goToRetryLevel(level));
    retryButton.scale.set(0.7);

    const nextLevel = getNextLevelAfter(level);
    const nextButton = new NextButton(() => {
      if (nextLevel) goToNextLevel(nextLevel);
    });
    nextButton.alpha = nextLevel ? 1 : 0.45;
    if (!nextLevel) nextButton.eventMode = 'none';
    nextButton.scale.set(0.7);
    this.passportButton = new FancyButton({
      defaultView: Texture.from('layer-select/passport.png'),
      animations: {
        hover: {
          props: {
            scale: { x: 1.1, y: 1.1 },
          },
          duration: 100,
        },
      },
      anchor: 0.5,
    });
    this.passportButton.layout = {
      position: 'absolute',
      top: 300,
      right: 120,
    };
    this.passportButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.showNestedPopup(PassportPopup);
    });

    this.innerContainer = new Container({ layout: true });
    this.innerContainer.addChild(
      this.background,
      this.contentContainer,
      ...(mascot ? [mascot] : []),
      backButton,
      retryButton,
      nextButton,
    );

    // Kept out of innerContainer so its absolute insets resolve against the full
    // screen rather than the 940x600 panel. show()/hide() animate it separately.
    this.addChild(this.innerContainer, this.passportButton);
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
    this.passportButton.alpha = 0;

    const duration = 0.4;
    await Promise.all([
      animate(this.innerContainer, { alpha: 1 }, { duration, ease: 'backOut' }),
      animate(this.innerContainer.scale, { x: 1, y: 1 }, { duration, ease: 'backOut' }),
      animate(this.passportButton, { alpha: 1 }, { duration, ease: 'backOut' }),
      animate(
        currentEngine.navigation.currentScreen.filters[0] as BlurFilter,
        { strength: 9 },
        { duration, ease: 'easeOut' },
      ),
      this.stars.playShowAnimation(),
    ]);

    await this.playRewardCelebration();

    if (this.postcardSlug) {
      await currentEngine.navigation.showNestedPopup(PostcardPopup, this.postcardSlug);
    }
  }

  /** Celebrates the whole queue, so anything an earlier end screen missed catches up here. */
  private async playRewardCelebration() {
    this.interactiveChildren = false;
    try {
      // The outcome is unused; this only lets the POST land before the queue is read.
      const outcome = await Promise.race([
        this.resultPromise,
        waitFor(RESULT_TIMEOUT).then((): LevelResultOutcome | null => null),
      ]);
      if (outcome === null) {
        console.warn('Level result timed out; skipping reward celebration');
      }

      const rewardIds = useUserRewardStore.getState().consumeAllCelebrations();
      const rewards = resolveRewardsByIds(rewardIds);
      if (rewards.length === 0) {
        if (rewardIds.length > 0) {
          console.warn(
            `Earned rewards ${rewardIds.join(', ')} are missing from the catalog; nothing to show`,
          );
        }
        return;
      }

      const celebration = new RewardCelebration(rewards);
      this.rewardCelebration = celebration;
      // Last, so badges draw above both the panel and the passport button.
      this.addChild(celebration);

      // Resolved into the celebration's own space, since that is where the badges
      // live. Bounds centre rather than getGlobalPosition: the button is anchored
      // 0.5 and positioned by @pixi/layout, so its origin is not its centre.
      const buttonBounds = this.passportButton.getBounds();
      const origin = celebration.toLocal(
        this.innerContainer.toGlobal({ x: POPUP_WIDTH / 2, y: POPUP_HEIGHT / 2 }),
      );
      const target = celebration.toLocal({
        x: buttonBounds.x + buttonBounds.width / 2,
        y: buttonBounds.y + buttonBounds.height / 2,
      });

      await celebration.play(origin, target, () => {
        animate(
          this.passportButton.scale,
          { x: [1, 1.18, 1], y: [1, 1.18, 1] },
          { duration: 0.25, ease: 'easeOut' },
        );
      });
    } finally {
      this.interactiveChildren = true;
    }
  }

  public async hide() {
    // Not destroy(): Navigation never destroys popups, so that override would not fire.
    this.rewardCelebration?.stop();

    const currentEngine = engine();
    if (!currentEngine.navigation.currentScreen) return;

    const duration = 0.2;
    await Promise.all([
      animate(this.innerContainer, { alpha: 0 }, { duration, ease: 'easeOut' }),
      animate(this.innerContainer.scale, { x: 0.94, y: 0.94 }, { duration, ease: 'easeOut' }),
      animate(this.passportButton, { alpha: 0 }, { duration, ease: 'easeOut' }),
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
