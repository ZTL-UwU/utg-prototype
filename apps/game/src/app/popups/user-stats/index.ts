import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { BlurFilter, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { getAvatarPath } from '../../../utils/avatars';
import { formatMonthTitle } from '../../../utils/date';
import { useAuthStore } from '../../../zustandStores/auth';
import { useLevelProgress } from '../../../zustandStores/levelProgressStore';
import useResultStore, {
  selectResultTotals,
  selectStreakDays,
} from '../../../zustandStores/resultStore';
import { useUserRewardStore } from '../../../zustandStores/userRewardStore';
import { AvatarSelectScreen } from '../../screens/avatar-select';
import { AuthScreen } from '../../screens/home/auth';
import { BackButton } from '../../ui/back-button';
import { StreakCalendar } from './streak-calendar';

const POPUP_WIDTH = 1481;
const POPUP_HEIGHT = 833;
const LABEL_COLOR = 0x808080;
const VALUE_COLOR = 0x000000;

const LABEL_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 28,
  fill: LABEL_COLOR,
} as const;

const VALUE_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 55,
  fontWeight: 'bold' as const,
  fill: VALUE_COLOR,
} as const;

const HEADER_NAME_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 45,
  fontWeight: 'bold' as const,
  fill: VALUE_COLOR,
} as const;

const SECTION_TITLE_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 45,
  fontWeight: 'bold' as const,
  fill: VALUE_COLOR,
} as const;

const MONTH_LABEL_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 30,
  fill: LABEL_COLOR,
} as const;

const LOGOUT_BUTTON_WIDTH = 190;
const LOGOUT_BUTTON_HEIGHT = 62;

const LOGOUT_LABEL_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 30,
  fontWeight: 'bold' as const,
  fill: 0xfdf7e7,
} as const;

function createStatRow(label: string, valueText: Text) {
  return new Container({
    layout: {
      flexDirection: 'column',
      gap: 5,
    },
    children: [new Text({ text: label, style: LABEL_STYLE, layout: true }), valueText],
  });
}

export class UserStatsPopup extends Container {
  public static assetBundles = ['stats-popup', 'layer-select', 'avatar-select', 'ui'];

  private panel: Container;
  private backButton: BackButton;
  private totalStarsValue: Text;
  private averageAccuracyValue: Text;
  private correctAttemptsValue: Text;
  private incorrectAttemptsValue: Text;
  private profileIcon: Sprite;
  private streakCalendar: StreakCalendar;
  private unsubscribeScore: () => void;

  constructor() {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.backButton = new BackButton(() => {
      void engine().navigation.hidePopup();
    });

    const user = useAuthStore.getState().user;
    this.profileIcon = new Sprite({
      texture: Texture.from(getAvatarPath(user?.avatar)),
      layout: { width: 100, height: 100, objectFit: 'contain' },
    });

    this.profileIcon.eventMode = 'static';
    this.profileIcon.cursor = 'pointer';
    this.profileIcon.on('pointertap', () => {
      void engine().navigation.showNestedPopup(AvatarSelectScreen, { mode: 'profile' });
    });

    const userName = new Text({
      text: user?.name ?? 'Player',
      style: HEADER_NAME_STYLE,
      layout: true,
    });

    const logoutButton = new FancyButton({
      defaultView: new Graphics()
        .roundRect(0, 0, LOGOUT_BUTTON_WIDTH, LOGOUT_BUTTON_HEIGHT, 20)
        .fill(0xd89456),
      text: new Text({ text: 'Logout', style: LOGOUT_LABEL_STYLE }),
      animations: {
        hover: {
          props: { scale: { x: 1.1, y: 1.1 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.97, y: 0.97 } },
          duration: 100,
        },
      },
      anchor: 0.5,
    });
    logoutButton.layout = {
      width: LOGOUT_BUTTON_WIDTH,
      height: LOGOUT_BUTTON_HEIGHT,
      marginLeft: 20,
      isLeaf: true,
    };
    logoutButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void this.logout();
    });

    const header = new Container({
      layout: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
      },
      children: [this.profileIcon, userName, logoutButton],
    });

    this.totalStarsValue = new Text({ text: '0', style: VALUE_STYLE, layout: true });
    this.averageAccuracyValue = new Text({ text: '0%', style: VALUE_STYLE, layout: true });
    this.correctAttemptsValue = new Text({ text: '0', style: VALUE_STYLE, layout: true });
    this.incorrectAttemptsValue = new Text({ text: '0', style: VALUE_STYLE, layout: true });

    const statsColumn = new Container({
      layout: {
        flexDirection: 'column',
        gap: 35,
        flex: 1,
        justifyContent: 'center',
        paddingLeft: 60,
      },
      children: [
        createStatRow('Total Stars', this.totalStarsValue),
        createStatRow('Average Accuracy', this.averageAccuracyValue),
        createStatRow('Correct Attempts', this.correctAttemptsValue),
        createStatRow('Incorrect Attempts', this.incorrectAttemptsValue),
      ],
    });

    const streakMonth = new Date();

    // One heading row instead of two: a separate month title inside the calendar would cost
    // another ~55px of the fixed slot, which the day cells need more.
    const streaksTitle = new Container({
      layout: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        width: '100%',
      },
      children: [
        new Text({ text: 'Streaks', style: SECTION_TITLE_STYLE, layout: true }),
        new Text({ text: formatMonthTitle(streakMonth), style: MONTH_LABEL_STYLE, layout: true }),
      ],
    });

    this.streakCalendar = new StreakCalendar(streakMonth);

    const streaksSection = new Container({
      layout: {
        flexDirection: 'column',
        gap: 20,
        flex: 2,
        paddingRight: 60,
      },
      children: [streaksTitle, this.streakCalendar],
    });

    const body = new Container({
      layout: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        flex: 1,
        alignItems: 'center',
        paddingTop: 30,
        paddingBottom: 60,
      },
      children: [statsColumn, streaksSection],
    });

    const content = new Container({
      layout: {
        position: 'absolute',
        width: POPUP_WIDTH,
        height: POPUP_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        padding: 60,
        gap: 30,
      },
      children: [header, body],
    });

    const background = new Sprite({
      texture: Texture.from('stats-popup/background.svg'),
      layout: {
        width: POPUP_WIDTH,
        height: POPUP_HEIGHT,
      },
    });

    this.panel = new Container({ layout: true });
    this.panel.addChild(background, content);

    // No-op when already loading or ready; retries when the bootstrap fetch errored.
    void useResultStore.getState().fetchResults();
    this.unsubscribeScore = useResultStore.subscribe(() => {
      this.updateStats();
    });
    this.updateStats();

    this.addChild(this.panel, this.backButton);
  }

  private updateStats() {
    const { results } = useResultStore.getState();
    const { totalStars, correct, mistake, accuracy } = selectResultTotals(results);

    this.totalStarsValue.text = String(totalStars);
    this.averageAccuracyValue.text = `${accuracy}%`;
    this.correctAttemptsValue.text = String(correct);
    this.incorrectAttemptsValue.text = String(mistake);

    this.streakCalendar.setActiveDays(selectStreakDays(results));
  }

  private async logout() {
    // Dismiss first: hide() unwinds the blur on `navigation.currentScreen`, which is the
    // wrong screen once showScreen has swapped it.
    await engine().navigation.hidePopup();

    useAuthStore.getState().clearTokens();
    useUserRewardStore.getState().clearRewards();
    useLevelProgress.getState().resetAllAttempts();

    await engine().navigation.showScreen(AuthScreen);
  }

  private refreshAvatar() {
    const user = useAuthStore.getState().user;
    this.profileIcon.texture = Texture.from(getAvatarPath(user?.avatar));
  }

  public async show() {
    this.refreshAvatar();

    const currentEngine = engine();
    if (!currentEngine.navigation.currentScreen) return;
    void currentEngine.audio.sfx.play('preload-audio/sfx/popup.mp3');
    currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 0 })];
    currentEngine.navigation.currentScreen.tint = 0x666666;

    this.panel.alpha = 0;
    this.panel.scale.set(1);
    this.panel.y = 1000;
    this.backButton.alpha = 0;

    const duration = 0.4;
    await Promise.all([
      animate(this.panel, { alpha: 1, y: 0 }, { duration, ease: 'backOut' }),
      animate(this.backButton, { alpha: 1 }, { duration, ease: 'backOut' }),
      animate(
        currentEngine.navigation.currentScreen.filters[0] as BlurFilter,
        { strength: 9 },
        { duration, ease: 'easeOut' },
      ),
    ]);
  }

  public async resume() {
    this.refreshAvatar();
  }

  public async hide() {
    this.unsubscribeScore();

    const currentEngine = engine();
    if (!currentEngine.navigation.currentScreen) return;

    currentEngine.navigation.currentScreen.tint = 0xffffff;

    const duration = 0.2;
    const exitOffset = 300;
    await Promise.all([
      animate(this.panel, { alpha: 0, y: exitOffset }, { duration, ease: 'easeOut' }),
      animate(this.backButton, { alpha: 0 }, { duration, ease: 'easeOut' }),
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
