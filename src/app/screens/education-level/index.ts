import { Container, Sprite, Texture } from 'pixi.js';

import { LetterGrid } from './letter-grid';

export class EducationLevelScreen extends Container {
  public static assetBundles = ['education-level', 'ui'];
  private background: Sprite;

  private letterGrid: LetterGrid;
  constructor() {
    super({
      layout: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      },
    });
    this.background = new Sprite({
      texture: Texture.from('education-level/background.svg'),
      layout: { position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' },
    });
    this.letterGrid = new LetterGrid();
    this.addChild(this.background, this.letterGrid);
  }
  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.letterGrid.resize(width, height);
  }
}
