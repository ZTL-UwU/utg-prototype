import { Container, Sprite, Text, Texture } from 'pixi.js';

import { getScriptFontFamily } from '../../../../utils/script';

export type FruitProps = {
  letter: string;
};

const FRUIT_NAMES = [
  'almond',
  'grape',
  'pomegranate',
  'walnut',
  'apple',
  'fig',
  'mulberry',
  'pear',
  'date',
] as const;

// folder + filename define the assetpack alias; keep in sync with assets/.../fruits/{fresh,rotten}/
const fruitTexturePath = (fruit: string, state: 'fresh' | 'rotten') =>
  `game-levels/game-level-fruit-fall/${state}/${fruit}.png`;

export class Fruit extends Container {
  public static assetBundles = ['game-level-fruit-fall'];

  private fruitAsset: Sprite;
  private readonly fruitName: string;
  public letter: string;
  private _isPlayable = true;
  private text: Text;
  constructor({ letter }: FruitProps) {
    super();
    this.letter = letter;
    // random fruit, spawned fresh
    this.fruitName = FRUIT_NAMES[Math.floor(FRUIT_NAMES.length * Math.random())];
    this.fruitAsset = new Sprite(Texture.from(fruitTexturePath(this.fruitName, 'fresh')));
    this.text = new Text({
      text: letter,
      style: {
        fontFamily: getScriptFontFamily(),
        fontSize: 80,
        fontWeight: '700',
        fill: 0xffffff,
        padding: 30,
      },
    });
    this.fruitAsset.anchor.set(0.5);
    this.text.anchor.set(0.5);
    this.addChild(this.fruitAsset, this.text);
  }

  get isPlayable() {
    return this._isPlayable;
  }
  set isPlayable(value: boolean) {
    if (this._isPlayable === value) return;
    this._isPlayable = value;
    if (!value) {
      // fell past the basket — show the rotten variant
      this.fruitAsset.texture = Texture.from(fruitTexturePath(this.fruitName, 'rotten'));
    }
  }

  public markCorrect() {
    this.fruitAsset.tint = 0x8ec24d;
  }
}
