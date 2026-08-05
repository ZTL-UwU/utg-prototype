import { Container, Sprite, Texture } from 'pixi.js';

export class GameLevelKite extends Container {
  public static assetBundles = ['game-level', 'game-level-kite'];
  private background: Sprite;
  private screenWidth: number = 0; // reset on first resize call
  private screenHeight: number = 0;
  constructor() {
    super();

    this.background = new Sprite({
      texture: Texture.from('game-levels/game-level-kite/background.png'),
      layout: { position: 'absolute', width: '100%', height: '100%' },
    });
    this.addChild(this.background);
  }
  resize(width: number, height: number) {
    this.layout = { width, height };
    this.screenHeight = height;
    this.screenWidth = width;
    console.log(this.screenHeight, this.screenWidth, 'happy linter');
  }
}
