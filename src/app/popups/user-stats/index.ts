import { animate } from 'motion';
import { BlurFilter, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { getAccuracyPercent, useScoreManager } from '../../../zustandStores/scoreManager';
import { BackButton } from '../../ui/back-button';

export type UserStatsPopupProps = {
  onBack?: () => void;
};

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
  public static assetBundles = ['stats-popup', 'layer-select', 'ui'];

  private panel: Container;
  private backButton: BackButton;
  private totalStarsValue: Text;
  private averageAccuracyValue: Text;
  private correctAttemptsValue: Text;
  private incorrectAttemptsValue: Text;
  private unsubscribeScore: () => void;

  constructor({ onBack }: UserStatsPopupProps = {}) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.backButton = new BackButton(() => {
      void engine()
        .navigation.hidePopup()
        .then(() => onBack?.());
    });

    const profileIcon = new Sprite({
      texture: Texture.from('layer-select/user-icon.svg'),
      layout: { width: 100, height: 100 },
    });

    const userName = new Text({
      text: 'User Name',
      style: HEADER_NAME_STYLE,
      layout: true,
    });

    const header = new Container({
      layout: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
      },
      children: [profileIcon, userName],
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

    const streaksTitle = new Text({
      text: 'Streaks',
      style: SECTION_TITLE_STYLE,
      layout: true,
    });

    const streaksPlaceholder = new Graphics()
      .roundRect(0, 0, 650, 525, 15)
      .fill({ color: 0xffffff, alpha: 0.35 })
      .stroke({ color: 0xcccccc, width: 2 });
    streaksPlaceholder.layout = {
      width: '100%',
      height: '100%',
    };

    const streaksSection = new Container({
      layout: {
        flexDirection: 'column',
        gap: 20,
        flex: 2,
        paddingRight: 60,
      },
      children: [streaksTitle, streaksPlaceholder],
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

    this.unsubscribeScore = useScoreManager.subscribe(() => {
      this.updateStats();
    });
    this.updateStats();

    this.addChild(this.panel, this.backButton);
  }

  private updateStats() {
    const { correctCount, mistakeCount, totalStars } = useScoreManager.getState();
    const averageAccuracy = getAccuracyPercent(correctCount, mistakeCount);

    this.totalStarsValue.text = String(totalStars);
    this.averageAccuracyValue.text = `${averageAccuracy}%`;
    this.correctAttemptsValue.text = String(correctCount);
    this.incorrectAttemptsValue.text = String(mistakeCount);
  }

  public async show() {
    const currentEngine = engine();
    if (!currentEngine.navigation.currentScreen) return;
    currentEngine.audio.sfx.play('preload-audio/sfx/popup.mp3', { volume: 1 });
    currentEngine.navigation.currentScreen.filters = [new BlurFilter({ strength: 0 })];
    currentEngine.navigation.currentScreen.tint = 0x666666;

    this.panel.alpha = 0;
    this.panel.scale.set(1);
    this.panel.y = 300;
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
