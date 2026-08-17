import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import useCourseStore from '../../../zustandStores/courseStore';
import {
  getRewardImageAlias,
  LAYER_REWARD_TYPE,
  REMOTE_REWARDS_BUNDLE,
  type RewardType,
} from '../../../zustandStores/rewardStore';
import {
  ensureUserRewardsReady,
  useUserRewardStore,
  type UserReward,
} from '../../../zustandStores/userRewardStore';
import type { TLayer } from '../../screens/level-map/units';
import {
  PASSPORT_TEXT_COLOR,
  PASSPORT_TROPHY_SLOT_SIZE,
  PassportPage,
  type PassportRow,
} from './page';

const ENTER_OFFSET = 1000;
const EXIT_OFFSET = 300;

// Book interior the page contents are tuned for; below this they scale down.
const DESIGN_WIDTH = 1150;
const DESIGN_HEIGHT = 830;

const LAYER_TITLES: Record<TLayer, string> = {
  education: 'EDUCATIONAL',
  typing: 'TYPING',
  game: 'GAME',
};

const TROPHY_LAYERS: TLayer[] = ['education', 'typing', 'game'];

type PageSpec =
  | { kind: 'levels'; title: string; layer: TLayer; type: RewardType }
  | { kind: 'trophies'; title: string };

interface SpreadSpec {
  title: string;
  pages: [PageSpec, PageSpec];
}

// One type per page. Typing has no completion page — postcards serve that role.
const SPREADS: SpreadSpec[] = [
  {
    title: LAYER_TITLES.education,
    pages: [
      {
        kind: 'levels',
        title: 'COMPLETION',
        layer: 'education',
        type: 'level_completion_badge',
      },
      { kind: 'levels', title: '3 STAR', layer: 'education', type: 'level_three_stars_badge' },
    ],
  },
  {
    title: LAYER_TITLES.typing,
    pages: [
      { kind: 'levels', title: '3 STAR', layer: 'typing', type: 'level_three_stars_badge' },
      { kind: 'levels', title: 'PERFECT', layer: 'typing', type: 'level_perfect_badge' },
    ],
  },
  {
    title: LAYER_TITLES.game,
    pages: [
      { kind: 'levels', title: 'COMPLETION', layer: 'game', type: 'level_completion_badge' },
      { kind: 'levels', title: '3 STAR', layer: 'game', type: 'level_three_stars_badge' },
    ],
  },
  {
    title: LAYER_TITLES.game,
    pages: [
      { kind: 'levels', title: 'PERFECT', layer: 'game', type: 'level_perfect_badge' },
      { kind: 'trophies', title: 'TROPHIES' },
    ],
  },
];

// Owned per-level rewards, keyed for slot lookup.
function indexLevelRewards(rewards: UserReward[]): Map<string, UserReward> {
  const byKey = new Map<string, UserReward>();
  for (const reward of rewards) {
    if (reward.level != null) byKey.set(`${reward.type}:${reward.level}`, reward);
  }
  return byKey;
}

function toSlot(reward: UserReward | undefined) {
  return {
    alias: reward ? getRewardImageAlias(reward.image_url) : undefined,
    // Consumed on build, so a reward on a spread never paged to stays new.
    isNew: reward ? useUserRewardStore.getState().consumeUnseen(reward.id) : false,
  };
}

// One row per unit, one slot per level in that unit.
function buildLevelRows(
  layer: TLayer,
  type: RewardType,
  byKey: Map<string, UserReward>,
): PassportRow[] {
  const units = useCourseStore.getState().unitsByLayer[layer];

  // Slots come from the course structure, so a failed /units/list empties the page.
  if (units.length === 0) {
    console.warn(`Passport: no units for layer '${layer}'; course structure failed to load`);
  }

  return units.map((unit) => ({
    label: unit.title.text,
    slots: unit.levels.map((level) => toSlot(byKey.get(`${type}:${level.id}`))),
  }));
}

// The trophy has no level, so it gets one labelled row per layer.
function buildTrophyRows(rewards: UserReward[]): PassportRow[] {
  return TROPHY_LAYERS.map((layer) => ({
    label: LAYER_TITLES[layer],
    slots: [
      toSlot(
        rewards.find(
          (reward) =>
            reward.type === LAYER_REWARD_TYPE && reward.level === null && reward.layer === layer,
        ),
      ),
    ],
  }));
}

function buildPage(spec: PageSpec, rewards: UserReward[], byKey: Map<string, UserReward>) {
  if (spec.kind === 'trophies') {
    return new PassportPage({
      title: spec.title,
      rows: buildTrophyRows(rewards),
      slotSize: PASSPORT_TROPHY_SLOT_SIZE,
    });
  }

  return new PassportPage({
    title: spec.title,
    rows: buildLevelRows(spec.layer, spec.type, byKey),
  });
}

// Flipping inside a wrapper keeps FancyButton's hit area valid.
function createArrowView(flip: boolean) {
  const texture = Texture.from('passport/next-arrow.png');
  const arrow = new Sprite({
    texture,
    anchor: 0.5,
    position: { x: texture.width / 2, y: texture.height / 2 },
  });
  arrow.scale.x = flip ? -1 : 1;

  return new Container({ children: [arrow] });
}

function createArrowButton(flip: boolean) {
  return new FancyButton({
    defaultView: createArrowView(flip),
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
}

export class PassportPopup extends Container {
  public static assetBundles = ['passport', REMOTE_REWARDS_BUNDLE];
  private dismissOverlay: Sprite;
  private passportContainer: Container;
  private spread: Container;
  private prevButton: FancyButton;
  private nextButton: FancyButton;
  private titleText: Text;
  private spreadIndex = 0;
  private pages: PassportPage[] = [];
  // Resting y of the book, set by resize(). The slide animates to and from it.
  private restingY = 0;

  constructor() {
    super();

    // Invisible full-screen catcher behind the book: a tap here means "outside the book".
    // Sized in resize(). Alpha does not affect hit testing, so it stays fully transparent.
    this.dismissOverlay = new Sprite({ texture: Texture.WHITE, alpha: 0 });
    this.dismissOverlay.eventMode = 'static';
    this.dismissOverlay.on('pointertap', () => {
      void engine().navigation.hidePopup();
    });

    this.passportContainer = new Container();
    const passportBackground: Sprite = new Sprite({
      texture: Texture.from('passport/book.png'),
      layout: {
        height: '100%',
        width: '100%',
      },
    });
    // Absorbs taps on the book so they never reach the overlay behind it.
    passportBackground.eventMode = 'static';
    this.prevButton = createArrowButton(true);
    this.prevButton.layout = {
      position: 'absolute',
      bottom: '10%',
      left: '5%',
    };
    this.prevButton.onPress.connect(() => this.goToSpread(-1));

    this.nextButton = createArrowButton(false);
    this.nextButton.layout = {
      position: 'absolute',
      bottom: '10%',
      right: '5%',
    };
    this.nextButton.onPress.connect(() => this.goToSpread(1));
    this.titleText = new Text({
      text: SPREADS[0].title,
      style: {
        fill: PASSPORT_TEXT_COLOR,
        fontFamily: 'Concert One',
        fontSize: 60,
        fontWeight: '700',
      },
      layout: {
        position: 'absolute',
        top: '0%',
        left: '2.5%',
      },
    });

    this.spread = new Container({
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        paddingTop: 90,
        paddingBottom: 40,
        paddingLeft: 40,
        paddingRight: 40,
        gap: 40,
      },
    });

    this.passportContainer.addChild(
      passportBackground,
      this.spread,
      this.titleText,
      this.prevButton,
      this.nextButton,
    );

    this.addChild(this.dismissOverlay, this.passportContainer);
  }

  // Pages by `delta`, wrapping in both directions.
  private goToSpread(delta: number) {
    void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
    this.spreadIndex = (this.spreadIndex + delta + SPREADS.length) % SPREADS.length;
    this.buildSpread();
    this.playNewRewardAnimations();
  }

  // Rebuild both pages of the current spread from the store.
  private buildSpread() {
    for (const page of this.pages) {
      page.stopAnimations();
    }
    for (const child of this.spread.removeChildren()) {
      child.destroy({ children: true });
    }

    const spec = SPREADS[this.spreadIndex];
    const { rewards } = useUserRewardStore.getState();
    const byKey = indexLevelRewards(rewards);

    this.pages = spec.pages.map((page) => buildPage(page, rewards, byKey));
    this.spread.addChild(...this.pages);
    this.titleText.text = spec.title;
  }

  private playNewRewardAnimations() {
    for (const page of this.pages) {
      page.playNewRewardAnimations();
    }
  }

  public async show() {
    void engine().audio.sfx.play('preload-audio/sfx/popup.mp3');

    // Before any await, or a slow fetch leaves the book on screen with no pages.
    this.passportContainer.alpha = 0;
    this.passportContainer.y = this.restingY + ENTER_OFFSET;

    // False when logged out or the fetch failed; the spread is built empty either way.
    await ensureUserRewardsReady();
    this.buildSpread();

    const duration = 0.4;
    await animate(
      this.passportContainer,
      { alpha: 1, y: this.restingY },
      { duration, ease: 'backOut' },
    );

    this.playNewRewardAnimations();
  }

  public async hide() {
    for (const page of this.pages) {
      page.stopAnimations();
    }

    const duration = 0.2;
    await animate(
      this.passportContainer,
      { alpha: 0, y: this.restingY + EXIT_OFFSET },
      { duration, ease: 'easeOut' },
    );
  }

  resize(width: number, height: number) {
    this.dismissOverlay.width = width;
    this.dismissOverlay.height = height;

    const bookWidth = width * 0.6;
    const bookHeight = height * 0.8;
    // Page contents are fixed-pixel, so shrink the book interior instead of overflowing it.
    const uiScale = Math.min(bookWidth / DESIGN_WIDTH, bookHeight / DESIGN_HEIGHT, 1);

    this.restingY = height * 0.1;
    // Layout runs in unscaled units; origin 0 scales from the top-left so the book stays centred.
    this.passportContainer.scale.set(uiScale);
    this.passportContainer.layout = {
      width: bookWidth / uiScale,
      height: bookHeight / uiScale,
      transformOrigin: 0,
    };
    this.passportContainer.position.set(width * 0.2, this.restingY);
  }
}
