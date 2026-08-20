import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { engine } from '../../../engine/getEngine';
import { AVATARS, type AvatarDef } from '../../../utils/avatars';
import { useAuthStore } from '../../../zustandStores/auth';

const CELL_SIZE = 200;
const GRID_GAP = 48;
const COLUMNS = 3;

type AvatarSelectMode = {
  mode?: 'onboarding' | 'profile';
};

export class AvatarSelectScreen extends Container {
  public static assetBundles = ['avatar-select', 'home'];

  private background: Sprite;
  private card: Container;
  private title: Text;
  private mode: 'onboarding' | 'profile';

  constructor({ mode = 'onboarding' }: AvatarSelectMode = {}) {
    super({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    this.mode = mode;

    this.background = new Sprite({
      texture: Texture.from('home/background.png'),
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'cover',
      },
    });

    const parchmentTexture = Texture.from('avatar-select/parchment.png');
    this.card = new Container({
      layout: {
        width: parchmentTexture.width,
        height: parchmentTexture.height,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 56,
        paddingTop: 80,
        paddingBottom: 80,
      },
    });

    const parchment = new Sprite({
      texture: parchmentTexture,
      layout: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        objectFit: 'fill',
      },
    });

    this.title = new Text({
      text: 'PICK YOUR AVATAR:',
      style: {
        fill: 0x284937,
        fontFamily: 'Concert One',
        fontSize: 72,
        fontWeight: '700',
      },
      layout: true,
    });

    const grid = this.buildGrid();

    this.card.addChild(parchment, this.title, grid);
    this.addChild(this.background, this.card);
  }

  private buildGrid(): Container {
    const grid = new Container({
      layout: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: GRID_GAP,
      },
    });

    const unlocked = AVATARS.filter((avatar) => !avatar.locked);
    const locked = AVATARS.filter((avatar) => avatar.locked);

    for (const group of [unlocked, locked]) {
      for (let i = 0; i < group.length; i += COLUMNS) {
        grid.addChild(this.buildRow(group.slice(i, i + COLUMNS)));
      }
    }

    return grid;
  }

  private buildRow(avatars: AvatarDef[]): Container {
    const row = new Container({
      layout: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: GRID_GAP,
      },
    });

    for (const avatar of avatars) {
      row.addChild(avatar.locked ? this.buildLockedCell(avatar) : this.buildAvatarButton(avatar));
    }

    return row;
  }

  private buildAvatarButton(avatar: AvatarDef): FancyButton {
    const button = new FancyButton({
      defaultView: Texture.from(avatar.path),
      anchor: 0.5,
      animations: {
        hover: {
          props: { scale: { x: 1.1, y: 1.1 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.95, y: 0.95 } },
          duration: 100,
        },
      },
    });

    button.layout = {
      width: CELL_SIZE,
      height: CELL_SIZE,
      isLeaf: true, // Keeps the anchored FancyButton positioned correctly inside the layout.
    };

    button.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      this.selectAvatar(avatar.id);
    });

    return button;
  }

  private buildLockedCell(avatar: AvatarDef): Sprite {
    return new Sprite({
      texture: Texture.from(avatar.path),
      layout: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        objectFit: 'contain',
      },
    });
  }

  /** Persist the chosen avatar id on the user, then continue or close the selector based on mode. */
  private selectAvatar(id: number) {
    const { user, setUser } = useAuthStore.getState();

    if (user) setUser({ ...user, avatar: id });

    if (this.mode === 'profile') {
      void engine().navigation.hidePopup();
      return;
    }

    void import('../layer-select').then(({ LayerSelectScreen }) =>
      engine().navigation.showScreen(LayerSelectScreen),
    );
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
  }

  public async show(): Promise<void> {
    void engine().audio.sfx.play('preload-audio/sfx/popup.mp3');

    this.card.alpha = 0;
    this.card.scale.set(0.85);

    const duration = 0.4;
    await Promise.all([
      animate(this.card, { alpha: 1 }, { duration, ease: 'backOut' }),
      animate(this.card.scale, { x: 1, y: 1 }, { duration, ease: 'backOut' }),
    ]);
  }

  public async hide(): Promise<void> {
    const duration = 0.2;
    await Promise.all([
      animate(this.card, { alpha: 0 }, { duration, ease: 'easeOut' }),
      animate(this.card.scale, { x: 0.92, y: 0.92 }, { duration, ease: 'easeOut' }),
    ]);
  }
}
