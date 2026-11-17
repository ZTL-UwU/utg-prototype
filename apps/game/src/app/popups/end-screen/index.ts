import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive } from '../../../engine/utils/viewport';
import { waitFor } from '../../../engine/utils/waitFor';
import type { LevelResultOutcome } from '../../../lib/levelResults';
import { getNextLevelAfter } from '../../../lib/progression';
import { m } from '../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { REMOTE_REWARDS_BUNDLE, resolveRewardsByIds } from '../../../zustandStores/rewardStore';
import { useUserRewardStore } from '../../../zustandStores/userRewardStore';
import type { LevelRun } from '../../screens/level-flow';
import { LevelLoadingScreen } from '../../screens/level-loading';
import { LevelMapScreen } from '../../screens/level-map';
import { findMapUnitForLevel, REMOTE_MASCOTS_BUNDLE } from '../../screens/level-map/units';
import type { TLayer, TLevel, TMapUnit } from '../../screens/level-map/units';
import { BackButton } from '../../ui/back-button';
import { layoutPopup } from '../../ui/layout-popup';
import { NextButton } from '../../ui/next-button';
import { RetryButton } from '../../ui/retry-button';
import { ScreenBlur } from '../../ui/screen-blur';
import { PassportPopup } from '../passport';
import { hasPostcard, PostcardPopup, toPostcardSlug } from '../postcard';
import { RewardCelebration } from './reward-celebration';
import { Stars } from './stars';

const POPUP_WIDTH = 940;
const POPUP_HEIGHT = 600;
const POPUP_RADIUS = 32;
/** Where the passport button sits, from the screen's top right, beside the panel. */
const PASSPORT_BUTTON = { top: 300, right: 120 };

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
    fontFamily: DISPLAY_FONT_FAMILY,
    fontSize: 48,
    fontWeight: '700',
    fill: LAYER_TEXT_COLORS[layer],
    letterSpacing: 4,
  });
}

function createStatStyle(layer: TLayer) {
  return new TextStyle({
    fontFamily: DISPLAY_FONT_FAMILY,
    fontSize: 32,
    fontWeight: '700',
    fill: LAYER_TEXT_COLORS[layer],
  });
}

type EndScreenPopupProps = {
  level: TLevel;
  /** The run just recorded (see `finishLevel`). */
  run: LevelRun;
};

/** Close the popup, then open the level's map. */
function goToLevelMap(level: TLevel) {
  const mapUnit = findMapUnitForLevel(level);
  void engine()
    .navigation.hidePopup()
    .then(() => engine().navigation.showScreen(LevelMapScreen, mapUnit));
}

/** Close the popup, then load `level`: the one just played, or the next. */
function goToLevel(level: TLevel, mapUnit: TMapUnit) {
  void engine()
    .navigation.hidePopup()
    .then(() => engine().navigation.showScreen(LevelLoadingScreen, { level, mapUnit }));
}

export class EndScreenPopup extends Container {
  public readonly screenName = 'EndScreenPopup';
  // 'layer-select' is here for the passport button's texture
  public static assetBundles = [
    'end-screen',
    REMOTE_MASCOTS_BUNDLE,
    'ui',
    'layer-select',
    REMOTE_REWARDS_BUNDLE,
  ];

  private innerContainer: Container;
  /** Blur this popup put on the screen beneath it, removed again in hide(). */
  private screenBlur?: ScreenBlur;
  private background: Graphics;
  private contentContainer: Container;
  private stars: Stars;
  private starCount: number;

  private postcardSlug?: string;
  private passportButton: FancyButton;

  private resultPromise: Promise<LevelResultOutcome>;
  private rewardCelebration?: RewardCelebration;

  constructor({ level, run }: EndScreenPopupProps) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });
    const { correct, mistakes, accuracy, starCount } = run;
    this.starCount = starCount;
    this.resultPromise = run.submitted;

    const mapUnit = findMapUnitForLevel(level);
    const layer = mapUnit.type;
    if (layer === 'typing') {
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
      text: m.end_popup_score(),
      style: createScoreTitleStyle(layer),
      layout: true,
    });

    const statStyle = createStatStyle(layer);
    const correctText = new Text({
      text: m.end_popup_correct({ correct }),
      style: statStyle,
      layout: true,
    });
    const mistakesText = new Text({
      text: m.end_popup_mistakes({ mistakes }),
      style: statStyle,
      layout: true,
    });
    const accuracyText = new Text({
      text: m.end_popup_accuracy({ accuracy }),
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
    backButton.layout = {
      position: 'absolute',
      left: 28,
      top: 28,
    };
    backButton.anchor.set(0, 0);
    backButton.scale.set(0.7);

    // Retrying goes through the loading screen, which starts a fresh session.
    const retryButton = new RetryButton(() => goToLevel(level, mapUnit));
    retryButton.scale.set(0.7);

    const nextLevel = getNextLevelAfter(level);
    const nextButton = new NextButton(() => {
      if (nextLevel) goToLevel(nextLevel.level, nextLevel.mapUnit);
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
      top: PASSPORT_BUTTON.top,
      right: PASSPORT_BUTTON.right,
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
    const blur = new ScreenBlur(0);
    this.screenBlur = blur;
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
      animate(blur.filter, { strength: 9 }, { duration, ease: 'easeOut' }),
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
      // The outcome is unused; this only lets the grant (a signed-in POST, or a guest's
      // local award) land before the queue is read.
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
    this.rewardCelebration?.stop();

    const screenBlur = this.screenBlur;
    this.screenBlur = undefined;
    if (!screenBlur) return;

    const duration = 0.2;
    await Promise.all([
      animate(this.innerContainer, { alpha: 0 }, { duration, ease: 'easeOut' }),
      animate(this.innerContainer.scale, { x: 0.94, y: 0.94 }, { duration, ease: 'easeOut' }),
      animate(this.passportButton, { alpha: 0 }, { duration, ease: 'easeOut' }),
      animate(screenBlur.filter, { strength: 0 }, { duration, ease: 'easeOut' }),
    ]);

    screenBlur.remove();
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.rewardCelebration?.stop();
    this.screenBlur?.remove();
    super.destroy(options);
  }

  public resize(width: number, height: number) {
    layoutPopup(this, width, height, responsive({ sm: 0.78, lg: 1 }));
  }
}
