import { animate } from 'motion';
import { Container, HTMLText, HTMLTextStyle, Sprite, Texture } from 'pixi.js';

import { createTypingWordStyle } from '../../../../utils/example-words';

const TROUT_ASSETS = [
  'game-levels/game-level-trout/trout-1.png',
  'game-levels/game-level-trout/trout-2.png',
  'game-levels/game-level-trout/trout-3.png',
  'game-levels/game-level-trout/trout-4.png',
  'game-levels/game-level-trout/trout-5.png',
] as const;

const BUBBLE_ASSET = 'game-levels/game-level-trout/bubble.png';
const BUBBLE_POP_ASSET = 'game-levels/game-level-trout/bubble-pop.png';

const WORD_COLOR = 0x1b427a;
const TROUT_SCALE = 1.6;
const BUBBLE_SCALE = 0.55;
const BUBBLE_Y_OFFSET = -90;

export type TroutProps = {
  wordId: number;
  word: string;
  fontSize: number;
  homeX: number;
  homeY: number;
  swimSpeed: number;
  phase?: number;
};

export class Trout extends Container {
  private readonly fish: Sprite;
  private readonly bubble: Sprite;
  private readonly popFx: Sprite;
  private readonly wordHTML: HTMLText;
  private readonly wordStyle: HTMLTextStyle;
  private readonly content = new Container();

  readonly wordId: number;
  private word: string;
  private activeLetterIdx = 0;
  private _active = false;
  private _playable = true;

  private homeX: number;
  private homeY: number;
  private readonly swimSpeed: number;
  private readonly phase: number;
  private swimElapsedMs = 0;

  constructor({ wordId, word, fontSize, homeX, homeY, swimSpeed, phase = 0 }: TroutProps) {
    super();
    this.wordId = wordId;
    this.word = word;
    this.homeX = homeX;
    this.homeY = homeY;
    this.swimSpeed = swimSpeed;
    this.phase = phase;
    this.wordStyle = createTypingWordStyle(fontSize, WORD_COLOR);

    this.fish = new Sprite(Texture.from(randomTroutAsset()));
    this.fish.anchor.set(0.5);
    this.fish.scale.set(TROUT_SCALE);

    this.bubble = new Sprite(Texture.from(BUBBLE_ASSET));
    this.bubble.anchor.set(0.5);
    this.bubble.scale.set(BUBBLE_SCALE);
    this.bubble.position.y = BUBBLE_Y_OFFSET;

    this.popFx = new Sprite(Texture.from(BUBBLE_POP_ASSET));
    this.popFx.anchor.set(0.5);
    this.popFx.position.y = BUBBLE_Y_OFFSET;
    this.popFx.visible = false;
    this.popFx.scale.set(0.7);

    this.wordHTML = new HTMLText({
      text: word,
      style: this.wordStyle,
    });
    this.wordHTML.anchor.set(0.5);
    this.wordHTML.position.y = BUBBLE_Y_OFFSET - 4;

    this.content.addChild(this.fish, this.bubble, this.wordHTML, this.popFx);
    this.addChild(this.content);
    this.position.set(homeX, homeY);
    this.renderWord();
  }

  get startingLetter(): string {
    return this.word[0] ?? '';
  }

  get currentLetter(): string | undefined {
    return this.word[this.activeLetterIdx];
  }

  get isComplete(): boolean {
    return this.activeLetterIdx >= this.word.length;
  }

  /** True after at least one correct letter has been typed. */
  get hasProgress(): boolean {
    return this.activeLetterIdx > 0;
  }

  get isActive(): boolean {
    return this._active;
  }

  get isPlayable(): boolean {
    return this._playable;
  }

  public setActive(active: boolean) {
    this._active = active;
  }

  /** Clears typed progress when the player switches to another trout. */
  public resetProgress() {
    this.activeLetterIdx = 0;
    this.renderWord();
  }

  /** Advances the cursor on a correct letter. Returns whether `typed` matched. */
  public typeLetter(typed: string): boolean {
    if (!this._playable || this.isComplete) return false;
    if (typed !== this.word[this.activeLetterIdx]) return false;
    this.activeLetterIdx++;
    this.renderWord();
    return true;
  }

  public setHome(x: number, y: number) {
    this.homeX = x;
    this.homeY = y;
    this.position.set(x, y);
  }

  public updateSwim(deltaMs: number) {
    if (!this._playable) return;
    this.swimElapsedMs += deltaMs;
    const t = this.swimElapsedMs / 1000;
    const ampX = 18 + this.swimSpeed * 0.15;
    const ampY = 8;
    this.position.x = this.homeX + Math.sin(t * (this.swimSpeed / 40) + this.phase) * ampX;
    this.position.y = this.homeY + Math.cos(t * (this.swimSpeed / 55) + this.phase * 1.3) * ampY;
    // face swim direction
    const dx = Math.cos(t * (this.swimSpeed / 40) + this.phase);
    this.fish.scale.x = Math.abs(this.fish.scale.x) * (dx >= 0 ? 1 : -1);
  }

  public async playPopAndHide(): Promise<void> {
    this._playable = false;
    this.setActive(false);
    this.bubble.visible = false;
    this.wordHTML.visible = false;
    this.popFx.visible = true;
    this.popFx.alpha = 1;
    this.popFx.scale.set(0.5);

    await Promise.all([
      animate(this.popFx, { alpha: 0 }, { duration: 0.35, ease: 'easeOut' }).finished,
      animate(this.popFx.scale, { x: 1.1, y: 1.1 }, { duration: 0.35, ease: 'easeOut' }).finished,
      animate(this.fish, { alpha: 0 }, { duration: 0.3, ease: 'easeIn' }).finished,
    ]);
    this.popFx.visible = false;
    this.visible = false;
  }

  public async playEscape(): Promise<void> {
    this._playable = false;
    this.setActive(false);
    await animate(this.content, { alpha: 0 }, { duration: 0.35, ease: 'easeIn' }).finished;
    this.visible = false;
  }

  private renderWord() {
    // Completed letters only — no yellow "current letter" highlight.
    const offset = this.activeLetterIdx;
    this.wordHTML.text =
      offset > 0
        ? `<completed>${this.word.slice(0, offset)}</completed>${this.word.slice(offset)}`
        : this.word;
  }
}

function randomTroutAsset(): string {
  return TROUT_ASSETS[Math.floor(Math.random() * TROUT_ASSETS.length)];
}
