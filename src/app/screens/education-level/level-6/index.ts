import { animate, type AnimationPlaybackControls, type AnimationSequence } from 'motion';
import { Container, Sprite, Texture, TilingSprite } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { EDUCATION_LETTERS } from '../../../../utils/example-words';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import type { TMapUnit } from '../../level-map/units';
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

const TILE_FADE_DURATION = 0.8;
const TILE_MOVE_DURATION = 1.5;
const SHEEP_MAX_WIDTH_RATIO = 0.28;
const SHEEP_MAX_HEIGHT_RATIO = 0.45;
const SHEEP_TURN_DURATION = 0.22;
const SHEEP_ANTICIPATION_DURATION = 0.12;
const SHEEP_LAUNCH_STRETCH_DURATION = 0.07;
const SHEEP_JUMP_DURATION = 0.85;
const SHEEP_LAND_SQUASH_DURATION = 0.08;
const SHEEP_LAND_RECOVER_DURATION = 0.14;
const SHEEP_JUMP_HEIGHT_RATIO = 0.2;
const SHEEP_MIN_JUMP_HEIGHT_RATIO = 0.25;
const SHEEP_FRONT_ROTATION = 0;
const SHEEP_GROUND_TEXTURE = 'education-level-6/sheep-top-down.png';
const SHEEP_AERIAL_TEXTURE = 'education-level-6/sheep-top-down-aerial.png';
const STONE_PATH_TEXTURE = 'education-level-6/stone-path.png';
const STONE_PATH_MAX_WIDTH_RATIO = 0.24;
const STONE_PATH_MAX_HEIGHT_RATIO = 0.76;
const STONE_PATH_TILE_OVERLAP = 8;
const STONE_PATH_FADE_DURATION = 0.25;
const SHEEP_WALKAWAY_DURATION = 1.7;
const SHEEP_WALK_SOUND = 'education-level-6/sheep.mp3';

type TileTarget = {
  tile: LetterTile;
  x: number;
  y: number;
  alpha: number;
  interactive: boolean;
};

type SheepLocation =
  | {
      type: 'origin';
    }
  | {
      type: 'tile';
      rowIndex: number;
      tileIndex: number;
    };

type SheepTarget = {
  x: number;
  y: number;
};

function getClosestRotation(currentRotation: number, targetRotation: number) {
  const delta = Math.atan2(
    Math.sin(targetRotation - currentRotation),
    Math.cos(targetRotation - currentRotation),
  );
  return currentRotation + delta;
}

export class EducationSheepJumpScreen extends Container {
  public static assetBundles = ['education-level-6', 'ui', 'education-audio'];

  private readonly background: TilingSprite;
  private readonly stonePath: Sprite;
  private readonly hud: HUD;
  private readonly soundButton: SoundButton;
  private readonly initialTile: LetterTile;
  private readonly sheepGroundTexture: Texture;
  private readonly sheepAerialTexture: Texture;
  private readonly sheep: Sprite;
  private tileRows: LetterTile[][] = [];
  private repositionAnimation?: AnimationPlaybackControls;
  private sheepAnimation?: AnimationPlaybackControls;
  private sheepLocation: SheepLocation = { type: 'origin' };
  private readonly mapUnit: TMapUnit;

  private map: {
    letters: string[];
    answer: number;
  }[];
  private step: number = 0;

  constructor(mapUnit: TMapUnit) {
    super({
      layout: {
        position: 'relative',
        width: '100%',
        height: '100%',
      },
    });
    engine().audio.bgm.setVolume(0);
    this.mapUnit = mapUnit;

    this.map = Array.from({ length: 5 }).map(() => {
      const arr = [...EDUCATION_LETTERS].sort(() => Math.random() - 0.5).slice(0, 3);
      return {
        letters: arr,
        answer: Math.floor(Math.random() * arr.length),
      };
    });

    this.background = new TilingSprite({
      texture: Texture.from('education-level-6/background-grass.png'),
      width: engine().navigation.width,
      height: engine().navigation.height,
      layout: { position: 'absolute', width: '100%', height: '100%' },
    });

    this.stonePath = new Sprite(Texture.from(STONE_PATH_TEXTURE));
    this.stonePath.anchor.set(0.5, 1);
    this.stonePath.visible = false;
    this.stonePath.alpha = 0;

    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: 'education',
          onQuit: () => {
            void engine().navigation.showScreen(LevelMapScreen, this.mapUnit);
          },
        }),
      helpAsset: 'tutorial-popups/education-level-6.png',
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

    this.sheepGroundTexture = Texture.from(SHEEP_GROUND_TEXTURE);
    this.sheepAerialTexture = Texture.from(SHEEP_AERIAL_TEXTURE);
    this.sheep = new Sprite(this.sheepGroundTexture);
    this.sheep.anchor.set(0.5);
    this.resizeSheep();
    this.sheep.position.set(bottomCenter.x, bottomCenter.y);

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
      this.stonePath,
      this.hud,
      this.initialTile,
      ...this.tileRows.flat(),
      this.sheep,
      this.soundButton,
    );
    this.playCurrentAnswerAudio();
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };

    this.background.width = width;
    this.background.height = height;
    const coverScale = Math.max(
      width / this.background.texture.width,
      height / this.background.texture.height,
    );
    this.background.tileScale.set(coverScale);

    this.resizeSheep();
    void this.repositionTiles();
    this.positionStonePath();
  }

  public async handleTileClick(rowIndex: number, tileIndex: number) {
    const currentRound = this.map[this.step];
    const tile = this.tileRows[rowIndex]?.[tileIndex];
    if (rowIndex !== this.step || !currentRound || !tile || tile.isWrong) return;

    if (tileIndex !== currentRound.answer) {
      engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      useSessionStore.getState().recordMistake();
      tile.markWrong();
      await this.moveSheepToTile(rowIndex, tileIndex, tile);
      return;
    }

    engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();
    await this.moveSheepToTile(rowIndex, tileIndex, tile);
    this.step++;
    await this.repositionTiles(true);

    if (this.step >= this.map.length) {
      await this.playFinalWalkAnimation();
      const { correct, mistakes } = useSessionStore.getState();
      useScoreManager.getState().addSession(correct, mistakes);
      void engine().navigation.showPopup(EndScreenPopup, 'education');
      return;
    }

    this.playCurrentAnswerAudio();
  }

  private async repositionTiles(animated = false) {
    this.stopRepositionAnimations();

    const { bottomCenter, positionOffsets } = getPositionOffsets();

    let globalOffset = { x: 0, y: 0 };
    for (let i = 0; i < this.step; i++) {
      globalOffset.x -= positionOffsets[this.map[i].answer].x;
      globalOffset.y -= positionOffsets[this.map[i].answer].y;
    }

    const backgroundTarget = { x: globalOffset.x, y: globalOffset.y };

    let parentPosition = { ...bottomCenter };
    let sheepTarget: SheepTarget | undefined;
    const initialTileTarget = {
      tile: this.initialTile,
      x: bottomCenter.x + globalOffset.x,
      y: bottomCenter.y + globalOffset.y,
      alpha: 1,
      interactive: false,
    };
    const targets: TileTarget[] = [initialTileTarget];

    if (this.sheepLocation.type === 'origin') {
      sheepTarget = initialTileTarget;
    }

    for (let i = 0; i < this.tileRows.length; i++) {
      const row = this.tileRows[i];

      for (let j = 0; j < row.length; j++) {
        const answerIndex = this.map[i].answer;
        const tileTarget = {
          tile: row[j],
          x: parentPosition.x + positionOffsets[j].x + globalOffset.x,
          y: parentPosition.y + positionOffsets[j].y + globalOffset.y,
          alpha: i < this.step && j !== answerIndex ? 0 : 1,
          interactive: i === this.step && !row[j].isWrong,
        };
        targets.push(tileTarget);

        if (
          this.sheepLocation.type === 'tile' &&
          this.sheepLocation.rowIndex === i &&
          this.sheepLocation.tileIndex === j
        ) {
          sheepTarget = tileTarget;
        }
      }

      parentPosition.x += positionOffsets[this.map[i].answer].x;
      parentPosition.y += positionOffsets[this.map[i].answer].y;
    }

    sheepTarget ??= { x: this.sheep.x, y: this.sheep.y };

    if (!animated) {
      for (const { tile, x, y, alpha, interactive } of targets) {
        tile.position.set(x, y);
        tile.alpha = alpha;
        tile.enabled = interactive;
      }
      this.sheep.position.set(sheepTarget.x, sheepTarget.y);
      this.background.tilePosition.set(backgroundTarget.x, backgroundTarget.y);
      return;
    }

    this.interactiveChildren = false;
    for (const { tile, interactive } of targets) {
      tile.enabled = interactive;
    }

    const sequence: AnimationSequence = targets.flatMap(({ tile, x, y, alpha }) => [
      [tile, { alpha }, { duration: TILE_FADE_DURATION, ease: 'easeIn', at: 0 }],
      [
        tile.position,
        { x, y },
        { duration: TILE_MOVE_DURATION, ease: 'easeInOut', at: TILE_FADE_DURATION },
      ],
    ]);
    sequence.push([
      this.sheep.position,
      { x: sheepTarget.x, y: sheepTarget.y },
      { duration: TILE_MOVE_DURATION, ease: 'easeInOut', at: TILE_FADE_DURATION },
    ]);
    sequence.push([
      this.background.tilePosition,
      { x: backgroundTarget.x, y: backgroundTarget.y },
      { duration: TILE_MOVE_DURATION, ease: 'easeInOut', at: TILE_FADE_DURATION },
    ]);
    sequence.push([
      this.sheep,
      { rotation: getClosestRotation(this.sheep.rotation, SHEEP_FRONT_ROTATION) },
      { duration: SHEEP_TURN_DURATION, ease: 'easeOut', at: TILE_FADE_DURATION },
    ]);

    const animation = animate(sequence);
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
    this.stopSheepAnimation();
    super.destroy(options);
  }

  private stopRepositionAnimations() {
    if (!this.repositionAnimation) return;

    this.repositionAnimation.stop();
    this.repositionAnimation = undefined;
    this.interactiveChildren = true;
  }

  private stopSheepAnimation() {
    if (!this.sheepAnimation) return;

    this.sheepAnimation.stop();
    this.sheepAnimation = undefined;
    this.setSheepAirborne(false);
    this.resizeSheep();
  }

  private async playFinalWalkAnimation() {
    this.stopSheepAnimation();
    this.interactiveChildren = false;
    this.setSheepAirborne(false);
    this.positionStonePath();
    this.stonePath.visible = true;
    this.stonePath.alpha = 0;

    const startY = this.sheep.y;
    const walkTarget = {
      x: this.stonePath.x,
      y: -this.sheep.height * 0.65,
    };
    const walkStepCount = Math.max(4, Math.round(SHEEP_WALKAWAY_DURATION / 0.32));
    const walkBobAmplitude = this.sheep.height * 0.035;
    const walkYKeyframes = [startY];
    for (let step = 1; step < walkStepCount; step++) {
      const progress = step / walkStepCount;
      const baseY = startY + (walkTarget.y - startY) * progress;
      const bob =
        Math.sin(progress * Math.PI * (walkStepCount - 1)) *
        walkBobAmplitude *
        (1 - progress * 0.35);
      walkYKeyframes.push(baseY - bob);
    }
    walkYKeyframes.push(walkTarget.y);

    engine().audio.sfx.play(SHEEP_WALK_SOUND);

    const walkAnimation = animate([
      [
        this.stonePath,
        { alpha: 1 },
        { duration: STONE_PATH_FADE_DURATION, ease: 'easeOut', at: 0 },
      ],
      [
        this.sheep,
        { rotation: getClosestRotation(this.sheep.rotation, SHEEP_FRONT_ROTATION) },
        { duration: SHEEP_TURN_DURATION, ease: 'easeOut', at: 0 },
      ],
      [
        this.sheep.position,
        { x: walkTarget.x, y: walkYKeyframes },
        {
          duration: SHEEP_WALKAWAY_DURATION,
          ease: [0.35, 0, 0.2, 1],
          at: STONE_PATH_FADE_DURATION,
        },
      ],
    ]);
    this.sheepAnimation = walkAnimation;

    try {
      await walkAnimation.finished;
    } finally {
      if (this.sheepAnimation === walkAnimation) {
        this.sheepAnimation = undefined;
      }
    }
  }

  private playCurrentAnswerAudio() {
    const round = this.map[this.step];
    if (!round) return;

    engine().audio.sfx.play(`education-audio/letters/${round.letters[round.answer]}.mp3`);
  }

  private async moveSheepToTile(rowIndex: number, tileIndex: number, tile: LetterTile) {
    this.stopSheepAnimation();
    this.sheepLocation = { type: 'tile', rowIndex, tileIndex };
    this.interactiveChildren = false;

    const baseScale = this.getSheepBaseScale();
    const startX = this.sheep.x;
    const startY = this.sheep.y;
    const jumpDistance = Math.hypot(tile.x - startX, tile.y - startY);
    const jumpHeight = Math.max(
      jumpDistance * SHEEP_JUMP_HEIGHT_RATIO,
      this.sheep.height * SHEEP_MIN_JUMP_HEIGHT_RATIO,
    );
    const apexY = Math.min(startY, tile.y) - jumpHeight;

    const deltaX = tile.x - this.sheep.x;
    const deltaY = tile.y - this.sheep.y;
    const facingRotation =
      deltaX === 0 && deltaY === 0
        ? this.sheep.rotation
        : getClosestRotation(this.sheep.rotation, Math.atan2(deltaY, deltaX) + Math.PI / 2);

    let prepAnimation: AnimationPlaybackControls | undefined;
    let jumpAnimation: AnimationPlaybackControls | undefined;
    let landAnimation: AnimationPlaybackControls | undefined;

    try {
      prepAnimation = animate([
        [
          this.sheep,
          { rotation: facingRotation },
          { duration: SHEEP_TURN_DURATION, ease: 'easeOut', at: 0 },
        ],
        [
          this.sheep.scale,
          { x: baseScale, y: baseScale * 0.86 },
          {
            duration: SHEEP_ANTICIPATION_DURATION,
            ease: 'easeIn',
            at: SHEEP_TURN_DURATION * 0.55,
          },
        ],
      ]);
      this.sheepAnimation = prepAnimation;
      await prepAnimation.finished;
      if (this.sheepAnimation !== prepAnimation) return;

      this.setSheepAirborne(true);

      jumpAnimation = animate([
        [
          this.sheep.scale,
          { x: baseScale * 1.04, y: baseScale * 1.08 },
          { duration: SHEEP_LAUNCH_STRETCH_DURATION, ease: 'easeOut', at: 0 },
        ],
        [
          this.sheep.position,
          { x: tile.x, y: [startY, apexY, tile.y] },
          {
            duration: SHEEP_JUMP_DURATION,
            ease: ['easeOut', 'easeIn'],
            at: 0,
          },
        ],
        [
          this.sheep.scale,
          { x: baseScale, y: baseScale },
          {
            duration: SHEEP_JUMP_DURATION * 0.45,
            ease: 'easeOut',
            at: SHEEP_LAUNCH_STRETCH_DURATION,
          },
        ],
      ]);
      this.sheepAnimation = jumpAnimation;
      await jumpAnimation.finished;
      if (this.sheepAnimation !== jumpAnimation) return;

      this.setSheepAirborne(false);

      landAnimation = animate([
        [
          this.sheep.scale,
          { x: baseScale * 1.1, y: baseScale * 0.88 },
          { duration: SHEEP_LAND_SQUASH_DURATION, ease: 'easeIn' },
        ],
        [
          this.sheep.scale,
          { x: baseScale, y: baseScale },
          { duration: SHEEP_LAND_RECOVER_DURATION, ease: 'easeOut' },
        ],
      ]);
      this.sheepAnimation = landAnimation;
      await landAnimation.finished;
    } finally {
      if (
        this.sheepAnimation === prepAnimation ||
        this.sheepAnimation === jumpAnimation ||
        this.sheepAnimation === landAnimation
      ) {
        this.sheepAnimation = undefined;
        this.interactiveChildren = true;
        this.setSheepAirborne(false);
        this.resizeSheep();
      }
    }
  }

  private setSheepAirborne(isAirborne: boolean) {
    const texture = isAirborne ? this.sheepAerialTexture : this.sheepGroundTexture;
    if (this.sheep.texture === texture) return;

    this.sheep.texture = texture;
    this.resizeSheep();
  }

  private getSheepBaseScale() {
    const { width, height } = engine().navigation;
    return Math.min(
      1,
      (width * SHEEP_MAX_WIDTH_RATIO) / this.sheep.texture.width,
      (height * SHEEP_MAX_HEIGHT_RATIO) / this.sheep.texture.height,
    );
  }

  private resizeSheep() {
    const sheepScale = this.getSheepBaseScale();
    this.sheep.scale.set(sheepScale);
  }

  private positionStonePath() {
    const { width, height } = engine().navigation;
    const pathScale = Math.min(
      1,
      (width * STONE_PATH_MAX_WIDTH_RATIO) / this.stonePath.texture.width,
      (height * STONE_PATH_MAX_HEIGHT_RATIO) / this.stonePath.texture.height,
    );
    this.stonePath.scale.set(pathScale);

    const finalRowIndex = this.map.length - 1;
    const finalAnswerIndex = this.map[finalRowIndex]?.answer;
    const finalTile =
      finalAnswerIndex === undefined
        ? this.initialTile
        : this.tileRows[finalRowIndex][finalAnswerIndex];
    this.stonePath.position.set(
      finalTile.x,
      finalTile.y - finalTile.height / 2 + STONE_PATH_TILE_OVERLAP,
    );
  }
}
