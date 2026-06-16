import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { EDUCATION_LETTERS } from '../../../../utils/example-words';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import { LetterTile } from './letter-tile';

function getPositionOffsets() {
  const bottomCenter = {
    x: engine().navigation.width * 0.5,
    y: engine().navigation.height * 0.8,
  };
  const positionOffsets = [
    {
      x: engine().navigation.width * 0.25 - bottomCenter.x,
      y: engine().navigation.height * 0.3 - bottomCenter.y,
    },
    {
      x: engine().navigation.width * 0.5 - bottomCenter.x,
      y: engine().navigation.height * 0.25 - bottomCenter.y,
    },
    {
      x: engine().navigation.width * 0.75 - bottomCenter.x,
      y: engine().navigation.height * 0.3 - bottomCenter.y,
    },
  ];

  return { positionOffsets, bottomCenter };
}

function getGlobalOffset(
  step: number,
  map: { answer: number }[],
  positionOffsets: { x: number; y: number }[],
) {
  let globalOffset = { x: 0, y: 0 };
  for (let i = 0; i < step; i++) {
    globalOffset.x -= positionOffsets[map[i].answer].x;
    globalOffset.y -= positionOffsets[map[i].answer].y;
  }
  return globalOffset;
}

export class EducationSheepJumpScreen extends Container {
  public static assetBundles = ['education-level-6', 'ui', 'education-audio'];

  private readonly background: Sprite;
  private readonly hud: HUD;
  private readonly soundButton: SoundButton;
  private readonly initialTile: LetterTile;
  private tileRows: LetterTile[][] = [];
  private repositionAnimations: AnimationPlaybackControls[] = [];

  private map: {
    letters: string[];
    answer: number;
  }[];
  private step: number = 0;

  constructor() {
    super({
      layout: {
        position: 'relative',
        width: '100%',
        height: '100%',
      },
    });
    engine().audio.bgm.setVolume(0);

    this.map = Array.from({ length: 5 }).map(() => {
      const arr = [...EDUCATION_LETTERS].sort(() => Math.random() - 0.5).slice(0, 3);
      return {
        letters: arr,
        answer: Math.floor(Math.random() * arr.length),
      };
    });

    this.background = new Sprite({
      texture: Texture.from('education-level-6/background-grass.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });

    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: 'education',
          onQuit: () => {
            void import('../../level-map/units').then(({ mapUnitStore }) => {
              void engine().navigation.showScreen(LevelMapScreen, mapUnitStore['education-map-2']);
            });
          },
        }),
      toTutorial: false,
      backdropColor: 0x4a90e2,
    });

    this.soundButton = new SoundButton({
      onClick: () => {
        engine().audio.sfx.play(`education-audio/letters/${this.map[0].answer}.mp3`);
      },
      size: 200,
      variant: 'brown',
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', bottom: 200, right: 200 };

    const { bottomCenter, positionOffsets } = getPositionOffsets();

    this.initialTile = new LetterTile({});
    this.initialTile.eventMode = 'none';
    this.initialTile.position.set(bottomCenter.x, bottomCenter.y);

    for (let i = 0; i < this.map.length; i++) {
      const parentPosition =
        i === 0 ? bottomCenter : this.tileRows[i - 1][this.map[i - 1].answer].position;

      const tiles = this.map[i].letters.map((letter, j) => {
        const tile = new LetterTile({
          letter,
          onClick: () => this.handleTileClick(letter),
        });
        tile.position.set(
          parentPosition.x + positionOffsets[j].x,
          parentPosition.y + positionOffsets[j].y,
        );
        return tile;
      });
      this.tileRows.push(tiles);
    }

    this.addChild(
      this.background,
      this.hud,
      this.initialTile,
      ...this.tileRows.flat(),
      this.soundButton,
    );
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    void this.repositionTiles();
  }

  public handleTileClick(letter: string) {
    if (letter === this.map[this.step].letters[this.map[this.step].answer]) {
      this.step++;
      void this.repositionTiles(true);
    }
  }

  private async repositionTiles(animated = false) {
    this.stopRepositionAnimations();

    const { bottomCenter, positionOffsets } = getPositionOffsets();
    const globalOffset = getGlobalOffset(this.step, this.map, positionOffsets);

    let parentPosition = { ...bottomCenter };
    const targets: { tile: LetterTile; x: number; y: number }[] = [
      {
        tile: this.initialTile,
        x: bottomCenter.x + globalOffset.x,
        y: bottomCenter.y + globalOffset.y,
      },
    ];

    for (let i = 0; i < this.tileRows.length; i++) {
      const row = this.tileRows[i];

      for (let j = 0; j < row.length; j++) {
        targets.push({
          tile: row[j],
          x: parentPosition.x + positionOffsets[j].x + globalOffset.x,
          y: parentPosition.y + positionOffsets[j].y + globalOffset.y,
        });
      }

      parentPosition.x += positionOffsets[this.map[i].answer].x;
      parentPosition.y += positionOffsets[this.map[i].answer].y;
    }

    if (!animated) {
      for (const { tile, x, y } of targets) {
        tile.position.set(x, y);
      }
      return;
    }

    this.interactiveChildren = false;
    const animations = targets.map(({ tile, x, y }) =>
      animate(tile.position, { x, y }, { duration: 0.8, ease: 'easeOut' }),
    );
    this.repositionAnimations = animations;

    try {
      await Promise.all(animations.map((animation) => animation.finished));
    } finally {
      if (this.repositionAnimations === animations) {
        this.repositionAnimations = [];
        this.interactiveChildren = true;
      }
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.stopRepositionAnimations();
    super.destroy(options);
  }

  private stopRepositionAnimations() {
    if (this.repositionAnimations.length === 0) return;

    for (const animation of this.repositionAnimations) {
      animation.stop();
    }
    this.repositionAnimations = [];
    this.interactiveChildren = true;
  }
}
