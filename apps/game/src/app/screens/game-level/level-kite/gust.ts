import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, HTMLText, HTMLTextStyle, Sprite, Texture } from 'pixi.js';

import { createTypingWordStyle, getHighlightedWordMarkup } from '../../../../utils/example-words';

export type GustProps = {
  word: string;
};

export type GustState = 'happy' | 'default' | 'grey';

const FONT_SIZE = 90;
const FONT_COLOR = 0x000000;
const ENTRY_DURATION_S = 1.5;

export class Gust extends Container {
  public static assetBundles = ['game-level-kite'];

  private sprite: Sprite;
  private wordHTML: HTMLText;
  private wordStyle: HTMLTextStyle = createTypingWordStyle(FONT_SIZE, FONT_COLOR);
  private readonly word: string;
  private activeLetterIdx: number = 0;

  // layout
  private screenWidth: number = 0;
  private screenHeight: number = 0;

  private idleAnim?: AnimationPlaybackControls;

  constructor({ word }: GustProps) {
    super();
    this.word = word;

    this.sprite = new Sprite();
    this.setState('happy');
    this.sprite.anchor.set(0.5);

    this.wordHTML = new HTMLText({
      text: this.word,
      style: this.wordStyle,
    });
    this.wordHTML.anchor.set(0.5);
    this.renderWord();

    this.addChild(this.sprite, this.wordHTML);
  }

  get currentLetter(): string | undefined {
    return this.word[this.activeLetterIdx];
  }

  get isComplete(): boolean {
    return this.activeLetterIdx >= this.word.length;
  }

  public setState(state: GustState) {
    this.sprite.texture = Texture.from(`game-levels/game-level-kite/gusts/${state}.png`);
  }

  /** Advances the cursor on a correct letter. Returns whether `typed` matched. */
  public typeLetter(typed: string): boolean {
    if (this.isComplete) return false;
    if (typed !== this.word[this.activeLetterIdx]) return false;
    this.activeLetterIdx++;
    if (!this.isComplete) this.renderWord();
    return true;
  }

  public resize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.position.y = this.screenHeight / 4;
  }

  public async playEntryAnimation() {
    this.position.x = 0;
    await animate(
      this.position,
      { x: this.screenWidth / 3 },
      { duration: ENTRY_DURATION_S, ease: 'easeInOut' },
    );
    if (this.destroyed) return; // the gust may be torn down mid-flight
    this.startIdleAnimation();
  }
  public async playExitAnimation() {
    await animate(
      this.position,
      { x: this.screenWidth + this.width },
      { duration: ENTRY_DURATION_S * 2, ease: 'easeInOut' },
    );
  }
  public pause() {
    this.idleAnim?.pause();
  }

  public resume() {
    this.idleAnim?.play();
  }

  public stopAnimations() {
    this.idleAnim?.stop();
    this.idleAnim = undefined;
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.stopAnimations();
    super.destroy(options);
  }

  private renderWord() {
    this.wordHTML.text = getHighlightedWordMarkup(this.word, this.activeLetterIdx, 1);
  }

  private startIdleAnimation() {
    const centerX = this.position.x;
    const centerY = this.position.y;
    const radiusX = 3;
    const radiusY = 20;
    const phase = { t: 0 };

    this.idleAnim = animate(
      phase,
      { t: Math.PI * 2 },
      {
        duration: 5,
        ease: 'linear',
        repeat: Infinity,
        onUpdate: () => {
          this.position.x = centerX + Math.cos(phase.t) * radiusX;
          this.position.y = centerY + Math.sin(phase.t) * radiusY;
        },
      },
    );
  }
}
