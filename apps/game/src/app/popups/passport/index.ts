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

/** One type per page. Typing has no completion page — postcards serve that role. */
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

/** Owned per-level rewards, keyed for slot lookup. */
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

/** One row per unit, one slot per level in that unit. */
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

/** The trophy has no level, so it gets one labelled row per layer. */
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

export class PassportPopup extends Container {
  public static assetBundles = ['passport', REMOTE_REWARDS_BUNDLE];
  private dismissOverlay: Sprite;
  private passportContainer: Container;
  private spread: Container;
  private nextButton: FancyButton;
  private titleText: Text;
  private spreadIndex = 0;
  private pages: PassportPage[] = [];
  /** Resting y of the book, set by resize(). The slide animates to and from it. */
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
    this.nextButton = new FancyButton({
      defaultView: Texture.from('passport/next-arrow.png'),
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
    this.nextButton.layout = {
      position: 'absolute',
      bottom: '10%',
      right: '5%',
    };
    this.nextButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      this.spreadIndex = (this.spreadIndex + 1) % SPREADS.length;
      this.buildSpread();
      this.playNewRewardAnimations();
    });
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
      this.nextButton,
    );

    this.addChild(this.dismissOverlay, this.passportContainer);
  }

  /** Rebuild both pages of the current spread from the store. */
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

    this.restingY = height * 0.1;
    this.passportContainer.layout = { width: width * 0.6, height: height * 0.8 };
    this.passportContainer.position.set(width * 0.2, this.restingY);
  }
}
