import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { getAlphabet, getMappedFromKeyboardEvent } from '../../../../utils/keymap';
import { useScoreManager } from '../../../../zustandStores/scoreManager';
import useSessionStore from '../../../../zustandStores/sessionStore';
import { EndScreenPopup } from '../../../popups/end-screen';
import { QuitPopup } from '../../../popups/quit';
import { HUD } from '../../../ui/hud';
import { LevelMapScreen } from '../../level-map';
import { LetterFlower } from './letter-flower';

const FLOWER_SIZE = 100;
const X_SLOTS = [0.2, 0.5, 0.8];

function getThreeUniqueLetters(): [string, string, string] {
  const entries = [...getAlphabet()].sort(() => Math.random() - 0.5);
  return [entries[0].text, entries[1].text, entries[2].text];
}

export class EducationSheepScreen extends Container {
  public static assetBundles = ['education-level-3', 'ui', 'mascots'];

  private background: Sprite;
  private hud: HUD;
  private flowers: LetterFlower[];
  private flowerContainer = new Container();
  private sheep: Sprite;
  private flashSadAnimation?: AnimationPlaybackControls;

  private currentFlowerIndex = 0;
  private isAnimating = false;

  constructor() {
    super({ layout: { position: 'relative', width: '100%', height: '100%' } });

    this.background = new Sprite({
      texture: Texture.from('education-level-3/background.svg'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.hud = new HUD({
      onBack: () =>
        void engine().navigation.showPopup(QuitPopup, {
          type: 'education',
          onQuit: () => void engine().navigation.showScreen(LevelMapScreen, 'education'),
        }),
    });

    const letters = getThreeUniqueLetters();
    this.flowers = letters.map((letter) => new LetterFlower(letter, FLOWER_SIZE));
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

    this.addChild(this.background, this.flowerContainer, this.sheep, this.hud);
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
    window.addEventListener('keydown', this.handleKeyDown);
  }

  reset() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    window.removeEventListener('keydown', this.handleKeyDown);
    super.destroy(options);
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.repeat || this.isAnimating || event.key == 'Shift') return;
    const typed = getMappedFromKeyboardEvent(event);
    if (typed === this.flowers[this.currentFlowerIndex].letter) {
      void this.handleCorrectLetter();
    } else if (typed) {
      void this.sheepFlashSad();
      useSessionStore.getState().recordMistake();
    }
  };

  private async handleCorrectLetter() {
    this.isAnimating = true;
    useSessionStore.getState().recordCorrect();

    // wilt current flower and play graze animation simultaneously
    this.flowers[this.currentFlowerIndex].wilt();
    await this.sheepFlashGraze();

    this.currentFlowerIndex++;

    if (this.currentFlowerIndex < this.flowers.length) {
      await animate(
        this.sheep,
        {
          x:
            this.flowers[this.currentFlowerIndex].x -
            2 * this.flowers[this.currentFlowerIndex].width,
        },
        { duration: 0.4, ease: 'backOut' },
      ).finished;
    } else {
      const { correct, mistakes } = useSessionStore.getState();
      useScoreManager.getState().addSession(correct, mistakes);
      void engine().navigation.showPopup(EndScreenPopup, 'education');
    }

    this.isAnimating = false;
  }

  async sheepFlashSad() {
    const defaultTex = this.sheep.texture;
    this.sheep.texture = Texture.from('mascots/sheep/sheep-crying.svg');
    this.flashSadAnimation = animate(
      [
        [this.sheep.scale, { x: 1.1, y: 0.9 }, { duration: 0.12 }],
        [this.sheep.scale, { x: 1, y: 1 }, { duration: 0.18 }],
      ],
      { defaultTransition: { ease: 'easeInOut' } },
    );
    void this.flashSadAnimation.finished.then(() =>
      setTimeout(() => {
        this.sheep.texture = defaultTex;
      }, 400),
    );
  }

  private async sheepFlashGraze() {
    const defaultTex = this.sheep.texture;
    this.sheep.texture = Texture.from('mascots/sheep/sheep-grazing.svg');
    await animate(
      [
        [this.sheep.scale, { x: 0.9, y: 0.9 }, { duration: 0.12 }],
        [this.sheep.scale, { x: 1, y: 1 }, { duration: 0.18 }],
      ],
      { defaultTransition: { ease: 'easeInOut' } },
    ).finished;
    this.sheep.texture = defaultTex;
  }
}
