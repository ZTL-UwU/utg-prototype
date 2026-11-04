import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, NineSliceSprite, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { responsive, safeAreaInsets } from '../../../engine/utils/viewport';
import { isLayerUnlocked } from '../../../lib/progression';
import { getAvatarPath } from '../../../utils/avatars';
import { useAuthStore } from '../../../zustandStores/auth';
import { ensureCourseReady } from '../../../zustandStores/courseStore';
import { ensureResultsReady } from '../../../zustandStores/resultStore';
import { PassportPopup } from '../../popups/passport';
import { UserStatsPopup } from '../../popups/user-stats';
import { drawDottedPath } from '../../ui/dotted-path';
import { HomeScreen } from '../home';
import { LetterReferenceScreen } from '../letter-reference';
import { LevelMapScreen } from '../level-map';
import { getLayerMaps, type TLayer } from '../level-map/units';
import { EducationLevelSelect } from '../level-select/education-level-select';

// Matches the X button
const INK_COLOR = 0x964b00;
const BAR_INK = 0xdd9e68; // name bar outline and label
const BAR_FILL = 0xfdf3dc;

const CIRCLE_RADIUS = 90;
const BAR_HEIGHT = 110;
const BAR_GAP = 24;

// Torn border and shading depth of the parchment, kept unstretched by the 9-slice
const PAPER_SLICE = 150;

type Row = { layer: TLayer; label: string; x: number; y: number };

// Paper units
type PaperLayout = {
  width: number;
  height: number;
  rows: Row[]; // zig-zag left, right, left
  barInset: number; // bar distance from the paper's side edges
};

function rowsAt(left: number, right: number, ys: [number, number, number]): Row[] {
  return [
    { layer: 'education', label: 'Education', x: left, y: ys[0] },
    { layer: 'typing', label: 'Typing', x: right, y: ys[1] },
    { layer: 'game', label: 'Games', x: left, y: ys[2] },
  ];
}

// Wide screens use the parchment's own width; phones a narrower sheet
function paperLayout(phone: boolean): PaperLayout {
  if (phone) {
    const width = 704;
    return { width, height: 1120, rows: rowsAt(150, width - 150, [280, 600, 920]), barInset: 60 };
  }
  const width = 1287;
  return { width, height: 1100, rows: rowsAt(260, width - 260, [250, 570, 890]), barInset: 175 };
}

const LAYER_ICONS: Record<TLayer, string> = {
  education: 'layer-select/education-icon.png',
  typing: 'layer-select/typing-icon.png',
  game: 'layer-select/game-icon.png',
};

const SIDE_COLUMN_RESERVE = 220; // right-hand button column, kept clear on both sides
const SCREEN_MARGIN = 40;

// Phones: script pill above the paper, passport | avatar | notebook below it
const PHONE_TOP_RESERVE = 150;
const PHONE_SIDE_MARGIN = 32;
const PHONE_BOTTOM_ROW_HEIGHT = 220; // the avatar, the tallest
const PHONE_BOTTOM_ROW_SPACING = 230;
const PHONE_BOTTOM_MARGIN = 130;
const PHONE_BOTTOM_RESERVE = PHONE_BOTTOM_MARGIN + PHONE_BOTTOM_ROW_HEIGHT + SCREEN_MARGIN;

const AVATAR_SIZE = 149;
const PHONE_AVATAR_SIZE = 220; // larger than its neighbours

// Shared by each layer's circle and name bar
function openLayer(layer: TLayer) {
  void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
  void (async () => {
    if (!(await ensureCourseReady())) return;
    await ensureResultsReady();
    if (layer === 'education') {
      await engine().navigation.showScreen(EducationLevelSelect);
      return;
    }
    const firstMap = getLayerMaps(layer)[0];
    if (!firstMap) return;
    await engine().navigation.showScreen(LevelMapScreen, firstMap);
  })();
}

function createNameBar(row: Row, paper: PaperLayout) {
  const onLeft = row.x < paper.width / 2;
  const left = onLeft ? row.x + CIRCLE_RADIUS + BAR_GAP : paper.barInset;
  const right = onLeft ? paper.width - paper.barInset : row.x - CIRCLE_RADIUS - BAR_GAP;
  const width = right - left;

  const bar = new Container({
    layout: {
      position: 'absolute',
      left,
      top: row.y - BAR_HEIGHT / 2,
      width,
      height: BAR_HEIGHT,
    },
  });
  const surface = new Graphics()
    .roundRect(0, 0, width, BAR_HEIGHT, BAR_HEIGHT / 2)
    .fill(BAR_FILL)
    .stroke({ color: BAR_INK, width: 6 });
  const label = new Text({
    text: row.label,
    anchor: 0.5,
    position: { x: width / 2, y: BAR_HEIGHT / 2 },
    style: {
      fill: BAR_INK,
      fontFamily: 'Concert One',
      fontSize: 60,
      fontWeight: '700',
    },
  });
  bar.addChild(surface, label);

  bar.eventMode = 'static';
  bar.cursor = 'pointer';
  bar.on('pointertap', () => openLayer(row.layer));
  return bar;
}

// Elbow paths from each circle's bottom to the next circle's top
function drawPaths(graphics: Graphics, rows: Row[]) {
  graphics.clear();
  for (let i = 1; i < rows.length; i++) {
    const from = rows[i - 1];
    const to = rows[i];
    const startY = from.y + CIRCLE_RADIUS + 14;
    const endY = to.y - CIRCLE_RADIUS - 14;
    const bendY = (startY + endY) / 2;
    drawDottedPath(
      graphics,
      [
        { x: from.x, y: startY },
        { x: from.x, y: bendY },
        { x: to.x, y: bendY },
        { x: to.x, y: endY },
      ],
      { color: INK_COLOR, dotRadius: 6, spacing: 24, cornerRadius: 14, arrowSize: 14 },
    );
  }
}

export class LayerSelectScreen extends Container {
  public readonly screenName = 'LayerSelectScreen';
  public static assetBundles = ['layer-select', 'home', 'avatar-select'];

  private innerContainer: Container;
  private mapBackground: NineSliceSprite; // 9-slice so it can reshape per layout
  private paths: Graphics;
  private barLayer: Container;
  private background: Sprite;
  private layerButtons: { button: FancyButton; layer: TLayer; unlockedIcon: Texture }[];
  private closeButton: FancyButton;
  private notebookButton: FancyButton;
  private userStatsButton: FancyButton;
  private passportButton: FancyButton;
  private skipShowAnimation: boolean;
  private mapScale = 1;
  private phoneLayout?: boolean; // layout last built; unset until the first resize

  // Buttons on the screen rather than the paper; they slide in from its edge
  private get edgeButtons() {
    return this.phoneLayout
      ? [this.passportButton, this.userStatsButton, this.notebookButton]
      : [this.userStatsButton, this.passportButton, this.notebookButton];
  }

  private get slideAxis(): 'x' | 'y' {
    return this.phoneLayout ? 'y' : 'x'; // up on phones, in from the right elsewhere
  }

  constructor({ skipShowAnimation = false }: { skipShowAnimation?: boolean } = {}) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.background = new Sprite({
      texture: Texture.from('home/background.png'),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    this.skipShowAnimation = skipShowAnimation;

    this.mapBackground = new NineSliceSprite({
      texture: Texture.from('avatar-select/parchment.png'),
      leftWidth: PAPER_SLICE,
      rightWidth: PAPER_SLICE,
      topHeight: PAPER_SLICE,
      bottomHeight: PAPER_SLICE,
    });
    this.paths = new Graphics();
    this.barLayer = new Container({
      layout: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
    });

    this.closeButton = new FancyButton({
      defaultView: Texture.from('layer-select/close-button.png'),
      scale: 1.5,
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
    this.closeButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.showScreen(HomeScreen);
    });

    this.layerButtons = (['education', 'typing', 'game'] as const).map((layer) => {
      const icon = Texture.from(LAYER_ICONS[layer]);
      const button = new FancyButton({
        defaultView: icon,
        anchor: 0.5,
        animations: {
          hover: {
            props: {
              scale: { x: 1.05, y: 1.05 },
            },
            duration: 100,
          },
        },
      });
      button.onPress.connect(() => openLayer(layer));
      return { button, layer, unlockedIcon: icon };
    });

    const avatarId = useAuthStore.getState().user?.avatar;
    this.userStatsButton = new FancyButton({
      defaultView: Texture.from(getAvatarPath(avatarId)),
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

    this.userStatsButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.showPopup(UserStatsPopup);
    });
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
    this.passportButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.showPopup(PassportPopup);
    });
    this.notebookButton = new FancyButton({
      defaultView: Texture.from('layer-select/notebook.svg'),
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
    this.notebookButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.showScreen(LetterReferenceScreen);
    });

    // Paper and paths are sized by hand, outside the layout
    this.innerContainer = new Container({ layout: true });
    this.innerContainer.addChild(
      this.mapBackground,
      this.paths,
      this.barLayer,
      this.closeButton,
      ...this.layerButtons.map(({ button }) => button),
    );

    this.addChild(
      this.background,
      this.innerContainer,
      this.userStatsButton,
      this.passportButton,
      this.notebookButton,
    );
    this.refreshLayerLocks();
  }

  private refreshUserStatsAvatar() {
    const avatarId = useAuthStore.getState().user?.avatar;
    this.userStatsButton.defaultView = Texture.from(getAvatarPath(avatarId));
  }

  private refreshLayerLocks() {
    const lockedIcon = Texture.from('layer-select/locked-icon.png');
    for (const { button, layer, unlockedIcon } of this.layerButtons) {
      button.defaultView = isLayerUnlocked(layer) ? unlockedIcon : lockedIcon;
    }
  }

  // Rebuilds the paper and its contents for the current breakpoint
  private applyPaperLayout(phone: boolean) {
    this.phoneLayout = phone;
    const paper = paperLayout(phone);

    this.mapBackground.width = paper.width;
    this.mapBackground.height = paper.height;
    drawPaths(this.paths, paper.rows);
    for (const bar of this.barLayer.removeChildren()) bar.destroy({ children: true });
    this.barLayer.addChild(...paper.rows.map((row) => createNameBar(row, paper)));

    for (const { button, layer } of this.layerButtons) {
      const row = paper.rows.find((r) => r.layer === layer);
      if (row) button.layout = { position: 'absolute', left: row.x, top: row.y };
    }
    this.closeButton.layout = { position: 'absolute', top: 100, left: 100 };

    // Phones: bottom row, placed in `resize`. Wider screens: right-hand column.
    // Sizing the outer container keeps the hover scale (on the inner view) intact
    const avatarSize = phone ? PHONE_AVATAR_SIZE : AVATAR_SIZE;
    this.userStatsButton.width = avatarSize;
    this.userStatsButton.height = avatarSize;

    if (!phone) {
      this.userStatsButton.layout = {
        position: 'absolute',
        top: 190, // clears the docked script pill
        right: 120,
        left: undefined,
      };
      this.passportButton.layout = { position: 'absolute', top: 390, right: 120, left: undefined };
      this.notebookButton.layout = { position: 'absolute', top: 600, right: 120, left: undefined };
    }
    for (const button of [this.userStatsButton, this.passportButton, this.notebookButton]) {
      button.position.set(0, 0);
    }
    // Undo the phone bottom row's scaling
    this.passportButton.scale.set(1);
    this.notebookButton.scale.set(1);
  }

  // Phone bottom row: passport | avatar | notebook
  private placeBottomRow(width: number, height: number, bottomInset: number, scale: number) {
    this.userStatsButton.width = PHONE_AVATAR_SIZE * scale;
    this.userStatsButton.height = PHONE_AVATAR_SIZE * scale;
    this.passportButton.scale.set(scale);
    this.notebookButton.scale.set(scale);

    const top = height - bottomInset - (PHONE_BOTTOM_MARGIN + PHONE_BOTTOM_ROW_HEIGHT / 2) * scale;
    this.edgeButtons.forEach((button, i) => {
      button.layout = {
        position: 'absolute',
        top,
        left: width / 2 + (i - 1) * PHONE_BOTTOM_ROW_SPACING * scale,
        right: undefined,
      };
    });
  }

  public resize(width: number, height: number) {
    const phone = responsive({ sm: true, lg: false });
    if (phone !== this.phoneLayout) this.applyPaperLayout(phone);
    const paper = paperLayout(phone);
    const insets = safeAreaInsets();

    if (phone) {
      // Paper and bottom row scale down together on short screens (foldables, split screen)
      const topReserve = PHONE_TOP_RESERVE + insets.top;
      const availableWidth = width - insets.left - insets.right - PHONE_SIDE_MARGIN * 2;
      const availableHeight = height - topReserve - insets.bottom;
      this.mapScale = Math.min(
        availableWidth / paper.width,
        availableHeight / (paper.height + PHONE_BOTTOM_RESERVE),
        1,
      );
      const bottomReserve = PHONE_BOTTOM_RESERVE * this.mapScale + insets.bottom;
      this.layout = { width, height };
      // Placed by hand: flex would shrink the oversized box away from the hand-sized paper
      const centerY = (topReserve + height - bottomReserve) / 2;
      this.innerContainer.layout = {
        position: 'absolute',
        width: paper.width,
        height: paper.height,
        flexShrink: 0,
        left: width / 2 - paper.width / 2,
        top: centerY - paper.height / 2,
      };
      this.placeBottomRow(width, height, insets.bottom, this.mapScale);
    } else {
      // Reserve the button column on both sides so the centred paper stays clear of it
      const availableWidth =
        width - insets.left - insets.right - SCREEN_MARGIN * 2 - SIDE_COLUMN_RESERVE * 2;
      const availableHeight = height - insets.top - insets.bottom - SCREEN_MARGIN * 2;
      this.mapScale = Math.min(availableWidth / paper.width, availableHeight / paper.height, 1);
      this.layout = { width, height };
      this.innerContainer.layout = {
        position: 'relative',
        width: paper.width,
        height: paper.height,
        flexShrink: 0,
        left: undefined,
        top: undefined,
      };
    }
    this.innerContainer.scale.set(this.mapScale);
  }

  public async show() {
    this.refreshUserStatsAvatar();
    if (!(await ensureCourseReady())) return;
    await ensureResultsReady();
    this.refreshLayerLocks();
    if (this.skipShowAnimation) return;

    const currentEngine = engine();
    void currentEngine.audio.sfx.play('preload-audio/sfx/popup.mp3');

    this.innerContainer.alpha = 0;
    this.innerContainer.scale.set(0.7 * this.mapScale);
    const axis = this.slideAxis;
    for (const button of this.edgeButtons) {
      button.alpha = 0;
      button.position[axis] = 200;
    }

    const duration = 0.4;
    await Promise.all([
      animate(this.innerContainer, { alpha: 1 }, { duration, ease: 'backOut' }),
      animate(
        this.innerContainer.scale,
        { x: this.mapScale, y: this.mapScale },
        { duration, ease: 'backOut' },
      ),
      ...this.edgeButtons.flatMap((button) => [
        animate(button, { alpha: 1 }, { duration, ease: 'backOut' }),
        animate(button.position, { [axis]: 0 }, { duration, ease: 'backOut' }),
      ]),
      animate(this.background, { alpha: 0.5 }, { duration, ease: 'backOut' }),
    ]);
  }

  public async hide() {
    const duration = 0.2;
    await Promise.all([
      animate(this.innerContainer, { alpha: 0 }, { duration, ease: 'easeOut' }),
      animate(
        this.innerContainer.scale,
        { x: 0.94 * this.mapScale, y: 0.94 * this.mapScale },
        { duration, ease: 'easeOut' },
      ),
      ...this.edgeButtons.flatMap((button) => [
        animate(button, { alpha: 0 }, { duration, ease: 'easeOut' }),
        animate(button.position, { [this.slideAxis]: 200 }, { duration, ease: 'easeOut' }),
      ]),
      animate(this.background, { alpha: 1 }, { duration, ease: 'easeOut' }),
    ]);
  }

  public async resume() {
    this.refreshUserStatsAvatar();
    this.refreshLayerLocks();
  }
}
