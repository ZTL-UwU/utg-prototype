import { animate, type AnimationPlaybackControls } from 'motion';
import { Assets, Container, ObservablePoint, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getAlphabet } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { SoundButton } from '../../../ui/sound-button';
import { LevelMapScreen } from '../../level-map';
import { LetterFlower } from './letter-flower';

const FLOWER_SIZE = 100;
const X_SLOTS = [0.2, 0.5, 0.8];

function getThreeUniqueLetters(): [string, string, string] {
  const entries = [...getAlphabet()].sort(() => Math.random() - 0.5);
  return [entries[0].text, entries[1].text, entries[2].text];
}

export class EducationSheepScreen extends Container {
  public static assetBundles = ['education-level-3', 'ui', 'mascots', 'education-audio'];
  public static rounds = 0;
  public static readonly MAX_ROUNDS = 5;

  private background: Sprite;
  private hud: HUD;
  private flowers: LetterFlower[];
  private flowerContainer = new Container();
  private sheep: Sprite;
  private flashSadAnimation?: AnimationPlaybackControls;
  private soundButton: SoundButton;

  private correctLetter: string;
  private isAnimating = false;

  constructor() {
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });
    engine().audio.bgm.setVolume(0);

    this.background = new Sprite({
      texture: Texture.from('education-level-3/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: 'education',
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, 'education'),
        }),
      type: 'education',
    });

    let letters: string[] = [];
    let correctLetter: string = '';

    while (true) {
      letters = getThreeUniqueLetters();
      correctLetter = letters[Math.floor(Math.random() * letters.length)];

      if (Assets.resolver.hasKey(`${correctLetter}.mp3`)) {
        break;
      }
      console.log(`Audio for "${correctLetter}.mp3" is missing. Re-rolling letters...`);
    }

    letters.sort(() => Math.random() - 0.5);

    this.correctLetter = correctLetter;
    this.soundButton = new SoundButton({
      onClick: () => {
        this.soundButtonClick();
      },
      size: 200,
    });
    this.soundButton.anchor.set(0.5);
    this.soundButton.layout = { position: 'absolute', left: '50%', top: '20%' };

    this.flowers = letters.map(
      (letter, i) =>
        new LetterFlower(
          letter,
          () => {
            this.handleFlowerClick(i);
          },
          FLOWER_SIZE,
        ),
    );
    for (const flower of this.flowers) this.flowerContainer.addChild(flower);
    this.flowerContainer.layout = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    };

    this.sheep = new Sprite(Texture.from('mascots/sheep/default.svg'));
    this.sheep.anchor.set(0.5);

    this.addChild(this.background, this.flowerContainer, this.sheep, this.hud, this.soundButton);
    this.soundButtonClick();
  }

  resize(width: number, height: number) {
    this.layout = { width, height };
    for (let i = 0; i < this.flowers.length; i++) {
      this.flowers[i].anchor.set(0.5);
      this.flowers[i].x = width * X_SLOTS[i];
      this.flowers[i].y = height * 0.75;
    }
  }

  async show() {
    // resize() runs before show() in the navigation lifecycle, so flowers[0].x is already set
    this.sheep.position.set(this.flowers[0].x - 2 * this.flowers[0].width, 0.6 * this.height);
  }
  private soundButtonClick() {
    engine().audio.sfx.play(`education-audio/letters/${this.correctLetter}.mp3`);
  }

  /**
   * ==================EVENT HANDLERS=======================
   *
   */
  private readonly handleFlowerClick = (clickedFlowerIdx: number) => {
    if (this.isAnimating) return;

    this.isAnimating = true;
    const clickedFlower = this.flowers[clickedFlowerIdx];
    clickedFlower.eventMode = 'none';
    if (clickedFlower.letter === this.correctLetter) void this.handleCorrectLetter(clickedFlower);
    else void this.handleIncorrectLetter(clickedFlower);
  };

  private async handleCorrectLetter(flower: LetterFlower) {
    useSessionStore.getState().recordCorrect();
    await this.moveSheepToFlower(flower)
      .then(async () => {
        await Promise.all([this.sheepBounceHappy(this.sheep.scale), flower.correctAnimation()]);
        engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
      })
      .then(() => this.endGame());
  }
  private async handleIncorrectLetter(flower: LetterFlower) {
    useSessionStore.getState().recordMistake();
    await this.moveSheepToFlower(flower)
      .then(async () => {
        await Promise.all([
          this.sheepFlashGraze(this.sheep.scale), // CURRENT SCALE PASSED TO PRESERVE DIMENSION
          flower.incorrectAnimation(),
        ]);
        flower.wilt();
        engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
      })
      .then(() => this.sheepFlashSad(this.sheep.scale))
      .then(() => {
        this.isAnimating = false;
      });
  }

  /**
   * ==================SHEEP ANIMATIONS=======================
   *
   */

  async sheepFlashSad(signedScale: ObservablePoint) {
    const defaultTex = this.sheep.texture;
    this.sheep.texture = Texture.from('mascots/sheep/sheep-crying.svg');
    this.flashSadAnimation = animate(
      [
        [this.sheep.scale, { x: 1.1 * signedScale.x, y: 0.9 * signedScale.y }, { duration: 0.12 }],
        [this.sheep.scale, { x: 1 * signedScale.x, y: 1 * signedScale.y }, { duration: 0.18 }],
      ],
      { defaultTransition: { ease: 'easeInOut' } },
    );
    void this.flashSadAnimation.finished.then(() =>
      setTimeout(() => {
        this.sheep.texture = defaultTex;
      }, 400),
    );
  }

  private async sheepFlashGraze(signedScale: ObservablePoint) {
    const defaultTex = this.sheep.texture;
    this.sheep.texture = Texture.from('mascots/sheep/sheep-grazing.svg');
    await animate(
      [
        [this.sheep.scale, { x: 0.9 * signedScale.x, y: 0.9 * signedScale.y }, { duration: 0.12 }],
        [this.sheep.scale, { x: 1 * signedScale.x, y: 1 * signedScale.y }, { duration: 0.18 }],
      ],
      { defaultTransition: { ease: 'easeInOut' } },
    ).finished;
    this.sheep.texture = defaultTex;
  }

  private async sheepBounceHappy(signedScale: ObservablePoint) {
    const defaultTex = this.sheep.texture;
    this.sheep.texture = Texture.from('mascots/sheep/sheep-happy.svg');
    const baseY = this.sheep.y;
    await Promise.all([
      animate(
        this.sheep,
        { y: [baseY, baseY * 1.5, baseY] },
        { duration: 0.8, type: 'spring', bounce: 0.3 },
      ),
      animate([
        [
          this.sheep.scale,
          { x: 1.5 * signedScale.x, y: 1.5 * signedScale.y },
          { duration: 0.2, ease: 'linear' },
        ],
        [
          this.sheep.scale,
          { x: signedScale.x, y: signedScale.y },
          { duration: 0.2, ease: 'linear' },
        ],
      ]),
    ]).then(() => (this.sheep.texture = defaultTex));
  }
  private async moveSheepToFlower(flower: LetterFlower) {
    engine().audio.sfx.play('education-level-3/sheep.mp3');
    if (this.sheep.x > flower.x) {
      await Promise.all([
        animate(this.sheep.scale, { x: -1 }, { duration: 0.2, ease: 'linear' }), //mirror to face the flower
        animate(this.sheep, { x: flower.x + 2 * flower.width }, { duration: 0.4, ease: 'easeOut' }), // send to flowers right
      ]);
    } else {
      await Promise.all([
        animate(this.sheep.scale, { x: 1 }, { duration: 0.2, ease: 'linear' }),
        animate(this.sheep, { x: flower.x - 2 * flower.width }, { duration: 0.4, ease: 'easeOut' }),
      ]);
    }
  }

  /**
   *
   * =====END GAME LOGIC========
   */
  private endGame() {
    this.isAnimating = false;
    if (++EducationSheepScreen.rounds < EducationSheepScreen.MAX_ROUNDS) {
      void engine().navigation.showScreen(EducationSheepScreen);
    } else {
      EducationSheepScreen.rounds = 0;
      const { correct, mistakes } = useSessionStore.getState();
      useScoreManager.getState().addSession(correct, mistakes);
      void engine().navigation.showPopup(EndScreenPopup, 'education');
    }
  }
}
