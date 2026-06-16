import { animate, type AnimationPlaybackControls, type AnimationSequence } from 'motion';
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

function getTileAlpha(step: number, rowIndex: number, tileIndex: number, answerIndex: number) {
  return rowIndex < step && tileIndex !== answerIndex ? 0 : 1;
}

const TILE_FADE_DURATION = 0.8;
const TILE_MOVE_DURATION = 1.5;

type TileTarget = {
  tile: LetterTile;
  x: number;
  y: number;
  alpha: number;
  interactive: boolean;
};

function createRepositionSequence(targets: TileTarget[]): AnimationSequence {
  return targets.flatMap(({ tile, x, y, alpha }) => [
    [tile, { alpha }, { duration: TILE_FADE_DURATION, ease: 'easeIn', at: 0 }],
    [
      tile.position,
      { x, y },
      { duration: TILE_MOVE_DURATION, ease: 'easeInOut', at: TILE_FADE_DURATION },
    ],
  ]);
}

export class EducationSheepJumpScreen extends Container {
  public static assetBundles = ['education-level-6', 'ui', 'education-audio'];

  private readonly background: Sprite;
  private readonly hud: HUD;
  private readonly soundButton: SoundButton;
  private readonly initialTile: LetterTile;
  private tileRows: LetterTile[][] = [];
  private repositionAnimation?: AnimationPlaybackControls;

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
      onClick: () => this.playCurrentAnswerAudio(),
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
          onClick: () => this.handleTileClick(i, j),
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
    this.playCurrentAnswerAudio();
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    void this.repositionTiles();
  }

  public async handleTileClick(rowIndex: number, tileIndex: number) {
    const currentRound = this.map[this.step];
    const tile = this.tileRows[rowIndex]?.[tileIndex];
    if (rowIndex !== this.step || !currentRound || !tile || tile.isWrong) return;

    if (tileIndex !== currentRound.answer) {
      engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      tile.markWrong();
      return;
    }

    engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    this.step++;
    await this.repositionTiles(true);
    this.playCurrentAnswerAudio();
  }

  private async repositionTiles(animated = false) {
    this.stopRepositionAnimations();

    const { bottomCenter, positionOffsets } = getPositionOffsets();
    const globalOffset = getGlobalOffset(this.step, this.map, positionOffsets);

    let parentPosition = { ...bottomCenter };
    const targets: TileTarget[] = [
      {
        tile: this.initialTile,
        x: bottomCenter.x + globalOffset.x,
        y: bottomCenter.y + globalOffset.y,
        alpha: 1,
        interactive: false,
      },
    ];

    for (let i = 0; i < this.tileRows.length; i++) {
      const row = this.tileRows[i];

      for (let j = 0; j < row.length; j++) {
        const answerIndex = this.map[i].answer;
        targets.push({
          tile: row[j],
          x: parentPosition.x + positionOffsets[j].x + globalOffset.x,
          y: parentPosition.y + positionOffsets[j].y + globalOffset.y,
          alpha: getTileAlpha(this.step, i, j, answerIndex),
          interactive: i === this.step && !row[j].isWrong,
        });
      }

      parentPosition.x += positionOffsets[this.map[i].answer].x;
      parentPosition.y += positionOffsets[this.map[i].answer].y;
    }

    if (!animated) {
      for (const { tile, x, y, alpha, interactive } of targets) {
        tile.position.set(x, y);
        tile.alpha = alpha;
        tile.enabled = interactive;
      }
      return;
    }

    this.interactiveChildren = false;
    for (const { tile, interactive } of targets) {
      tile.enabled = interactive;
    }

    const animation = animate(createRepositionSequence(targets));
    this.repositionAnimation = animation;

    try {
      await animation.finished;
    } finally {
      if (this.repositionAnimation === animation) {
        this.repositionAnimation = undefined;
        this.interactiveChildren = true;
      }
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.stopRepositionAnimations();
    super.destroy(options);
  }

  private stopRepositionAnimations() {
    if (!this.repositionAnimation) return;

    this.repositionAnimation.stop();
    this.repositionAnimation = undefined;
    this.interactiveChildren = true;
  }

  private getCurrentAnswerLetter() {
    const round = this.map[this.step];
    if (!round) return undefined;
    return round.letters[round.answer];
  }

  private playCurrentAnswerAudio() {
    const letter = this.getCurrentAnswerLetter();
    if (!letter) return;

    engine().audio.sfx.play(`education-audio/letters/${letter}.mp3`);
  }
}
