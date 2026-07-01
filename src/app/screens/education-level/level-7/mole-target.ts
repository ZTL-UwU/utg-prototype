import { Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';

import { waitFor } from '../../../../engine/utils/waitFor';

export const MOLE_UP_Y = 60;
const MOLE_HEIGHT = 276;
const MOLE_WIDTH = 152;
const HOLE_WIDTH = 324;
// Front rim of the hole in the target's local space: deepest at the centre,
// rising towards the sides. The mole disappears behind this curve.
const HOLE_LIP_CENTER_Y = 57;
const HOLE_LIP_EDGE_Y = 46;
const HIT_SPLASH_OFFSET_X = 58;
const HIT_SPLASH_OFFSET_Y = -190;
const CORRECT_TINT = 0x8ec24d;
const WRONG_TINT = 0xef5a42;

export class MoleTarget extends Container {
  public isUp = true;

  private readonly mole: Sprite;
  private readonly letter: Text;
  private readonly hit: Sprite;

  constructor(onPress: () => void) {
    super();

    const moleContent = new Container();
    this.mole = new Sprite({
      texture: Texture.from(`education-levels/education-level-7/mole.png`),
      anchor: { x: 0.5, y: 1 },
    });
    this.mole.y = MOLE_UP_Y;

    this.letter = new Text({
      text: '',
      style: {
        fontFamily: 'Noto Naskh Arabic Bold',
        fontSize: 90,
        fill: 0x56331f,
        align: 'center',
        padding: 30,
      },
      anchor: 0.5,
    });

    this.letter.position.set(0, -70);
    this.mole.addChild(this.letter);
    moleContent.addChild(this.mole);

    const maskHalfWidth = MOLE_WIDTH / 2 + 12;
    const maskTop = MOLE_UP_Y - MOLE_HEIGHT - 12;
    const moleMask = new Graphics()
      .moveTo(-maskHalfWidth, maskTop)
      .lineTo(maskHalfWidth, maskTop)
      .lineTo(maskHalfWidth, HOLE_LIP_EDGE_Y)
      // Quadratic apex lands on HOLE_LIP_CENTER_Y, tracing the hole's front rim.
      .quadraticCurveTo(0, 2 * HOLE_LIP_CENTER_Y - HOLE_LIP_EDGE_Y, -maskHalfWidth, HOLE_LIP_EDGE_Y)
      .closePath()
      .fill(0xffffff);
    moleContent.mask = moleMask;

    const hole = new Sprite({
      texture: Texture.from(`education-levels/education-level-7/hole.png`),
      anchor: 0.5,
    });

    this.hit = new Sprite({
      texture: Texture.from(`education-levels/education-level-7/hit.png`),
      anchor: 0.5,
    });
    this.hit.position.set(-HIT_SPLASH_OFFSET_X, HIT_SPLASH_OFFSET_Y);
    this.hit.visible = false;

    this.addChild(hole, moleContent, moleMask, this.hit);
    const hitTop = MOLE_UP_Y - MOLE_HEIGHT;
    this.hitArea = new Rectangle(-HOLE_WIDTH / 2, hitTop, HOLE_WIDTH, HOLE_LIP_CENTER_Y - hitTop);
    this.on('pointertap', onPress);
    this.setEnabled(true);
  }

  public setLetter(letter: string) {
    this.letter.text = letter;
  }

  public setEnabled(enabled: boolean) {
    this.eventMode = enabled ? 'static' : 'none';
    this.cursor = enabled ? 'pointer' : 'default';
  }

  public reset() {
    this.mole.texture = Texture.from(`education-levels/education-level-7/mole.png`);
    this.mole.y = MOLE_UP_Y;
    this.mole.tint = 0xffffff;
    this.mole.visible = true;
    this.hit.visible = false;
    this.hit.alpha = 1;
    this.hit.scale.set(1);
    this.isUp = true;
    this.setEnabled(true);
  }

  public showCorrectFeedback() {
    this.mole.tint = CORRECT_TINT;
  }

  public async showWrongFeedback() {
    this.mole.tint = WRONG_TINT;
    await waitFor(0.4);
    this.mole.tint = 0xffffff;
  }

  public get molePosition() {
    return this.mole.position;
  }

  public beginLowering() {
    this.isUp = false;
    this.setEnabled(false);
  }

  public finishRaising(enabled: boolean) {
    this.isUp = true;
    this.setEnabled(enabled);
  }

  public showImpact(direction: number) {
    this.mole.tint = 0xffffff;
    this.mole.texture = Texture.from(`education-levels/education-level-7/mole-hit.png`);
    this.hit.position.x = -direction * HIT_SPLASH_OFFSET_X;
    this.hit.scale.x = direction;
    this.hit.visible = true;
    this.hit.alpha = 0;
    this.hit.scale.set(direction * 0.35, 0.35);
  }

  public hideMole() {
    this.mole.visible = false;
  }

  public get hitSprite() {
    return this.hit;
  }
}
