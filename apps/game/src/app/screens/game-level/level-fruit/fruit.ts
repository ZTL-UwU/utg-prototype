import { Container, Sprite, Text, Texture } from 'pixi.js';

export type FruitProps = {
  letter: string;
};
export class Fruit extends Container {
  public static assetBundles = ['game-level-fruit'];

  private fruitAsset: Sprite;
  public letter: string;
  public isPlayable = true;
  private text: Text;
  constructor({ letter }: FruitProps) {
    super();
    this.letter = letter;
    //random asset
    this.fruitAsset = new Sprite(
      Texture.from(`game-levels/game-level-fruit/fruits/${Math.floor(12 * Math.random())}.png`),
    );
    this.text = new Text({
      text: letter,
      style: {
        fontFamily: 'Concert One',
        fontSize: 80,
        fontWeight: 'bold',
        fill: 0xffffff,
      },
    });
    this.fruitAsset.anchor.set(0.5);
    this.text.anchor.set(0.5);
    this.addChild(this.fruitAsset, this.text);
  }

  public markCorrect() {
    this.fruitAsset.tint = 0x8ec24d; // standard success green used across the game
  }
}
