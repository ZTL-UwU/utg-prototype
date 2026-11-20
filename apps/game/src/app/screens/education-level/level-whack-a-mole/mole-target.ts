import { animate, type AnimationPlaybackControls } from 'motion';
import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture,
  type DestroyOptions,
} from 'pixi.js';

import { lerp } from '../../../../engine/utils/maths';
import { waitFor } from '../../../../engine/utils/waitFor';
import { convertToCurrentScript, getScriptFontFamily } from '../../../../utils/script';

const MOLE_UP_Y = 60;
/** The mole's y once fully down its hole, out of sight behind the rim. */
const MOLE_DOWN_Y = 220;
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
  private hitAnimation?: AnimationPlaybackControls;

  constructor(onPress: () => void) {
    super();

    const moleContent = new Container();
    this.mole = new Sprite({
      texture: Texture.from(`education-levels/education-level-whack-a-mole/mole.png`),
      anchor: { x: 0.5, y: 1 },
    });
    this.mole.y = MOLE_UP_Y;

    this.letter = new Text({
      text: '',
      style: {
        fontFamily: getScriptFontFamily(),
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
      texture: Texture.from(`education-levels/education-level-whack-a-mole/hole.png`),
      anchor: 0.5,
    });

    this.hit = new Sprite({
      texture: Texture.from(`education-levels/education-level-whack-a-mole/hit.png`),
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
    this.letter.text = convertToCurrentScript(letter);
  }

  public setEnabled(enabled: boolean) {
    this.eventMode = enabled ? 'static' : 'none';
    this.cursor = enabled ? 'pointer' : 'default';
  }

  public reset() {
    this.mole.texture = Texture.from(`education-levels/education-level-whack-a-mole/mole.png`);
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

  /** Place the mole between up (0) and fully down its hole (1). */
  public setMoleDepth(depth: number) {
    this.mole.y = lerp(MOLE_UP_Y, MOLE_DOWN_Y, depth);
  }

  public beginLowering() {
    this.isUp = false;
    this.setEnabled(false);
  }

  public finishRaising(enabled: boolean) {
    this.isUp = true;
    this.setEnabled(enabled);
  }

  /** The mole is hit from `direction` (1: from the left): it winces and a splash pops out. */
  public async playImpact(direction: number) {
    this.mole.tint = 0xffffff;
    this.mole.texture = Texture.from(`education-levels/education-level-whack-a-mole/mole-hit.png`);
    this.hit.position.x = -direction * HIT_SPLASH_OFFSET_X;
    this.hit.visible = true;
    this.hit.alpha = 0;
    this.hit.scale.set(direction * 0.35, 0.35);
    this.hitAnimation = animate(this.hit, { alpha: 1 }, { duration: 0.14, ease: 'easeOut' });
    await Promise.all([
      this.hitAnimation.finished,
      animate(this.hit.scale, { x: direction, y: 1 }, { duration: 0.22, ease: 'backOut' }).finished,
    ]);
  }

  public hideMole() {
    this.mole.visible = false;
  }

  override destroy(options?: DestroyOptions) {
    this.hitAnimation?.stop();
    super.destroy(options);
  }
}
