import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

import { m } from '../../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../../utils/fonts';
import { NaanPiece } from './naan-piece';

const STACK_OFFSET_Y = 22;

type PlateStackOptions = {
  texture: string;
  capacity: number;
  width?: number;
};

export class PlateStack extends Container {
  public readonly capacity: number;
  private readonly plate: Sprite;
  private readonly stackLayer = new Container();
  private readonly plateFullLabel: Text;
  private readonly stacked: NaanPiece[] = [];
  /** Slots claimed by naan still flying here, so two in flight never aim at the same one. */
  private reserved = 0;
  private plateFullAnimation?: AnimationPlaybackControls;

  constructor({ texture, capacity, width = 320 }: PlateStackOptions) {
    super();
    this.capacity = capacity;

    this.plate = new Sprite({
      texture: Texture.from(texture),
      anchor: 0.5,
    });
    this.plate.width = width;
    this.plate.height = (width / this.plate.texture.width) * this.plate.texture.height;

    this.plateFullLabel = new Text({
      text: m.naan_plate_full(),
      resolution: 2,
      anchor: 0.5,
      style: {
        fill: 0x6b411e,
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize: 52,
        fontWeight: '700',
        letterSpacing: 2,
      },
    });
    this.plateFullLabel.visible = false;
    this.plateFullLabel.y = -this.plate.height * 0.55 - capacity * STACK_OFFSET_Y - 40;

    this.addChild(this.plate, this.stackLayer, this.plateFullLabel);
  }

  public get count(): number {
    return this.stacked.length;
  }

  /** Every slot is stacked or claimed by a naan on its way. */
  public get isFull(): boolean {
    return this.stacked.length + this.reserved >= this.capacity;
  }

  /** Local Y of the centre of the naan in slot `index`, counted from the plate up. */
  private slotLocalY(index: number): number {
    return -this.plate.height * 0.18 - index * STACK_OFFSET_Y;
  }

  /** Claim the next free slot for a naan about to fly here. Returns where it lands, locally. */
  public reserveSlot(): number {
    const y = this.slotLocalY(this.stacked.length + this.reserved);
    this.reserved += 1;
    return y;
  }

  /** Stack a naan that flew to the slot `reserveSlot` gave it. */
  public async acceptNaan(naan: NaanPiece) {
    this.reserved = Math.max(0, this.reserved - 1);
    const targetY = this.slotLocalY(this.stacked.length);
    naan.clearLetter();
    naan.clearFeedback();
    naan.rotation = 0;
    this.stackLayer.addChild(naan);
    this.stacked.push(naan);
    naan.position.set(0, targetY);
    naan.scale.set(0.92);

    await animate(naan.scale, { x: 1, y: 1 }, { duration: 0.22, ease: 'backOut' }).finished;

    if (this.stacked.length >= this.capacity) {
      this.showPlateFull();
    }
  }

  public clearStack() {
    for (const naan of this.stacked) {
      naan.parent?.removeChild(naan);
      naan.destroy({ children: true });
    }
    this.stacked.length = 0;
  }

  public destroyEffects() {
    this.plateFullAnimation?.stop();
  }

  private showPlateFull() {
    this.plateFullAnimation?.stop();

    this.plateFullLabel.visible = true;
    this.plateFullLabel.alpha = 0;
    this.plateFullLabel.scale.set(0.7);

    this.plateFullAnimation = animate([
      [this.plateFullLabel, { alpha: 1 }, { duration: 0.2, ease: 'easeOut' }],
      [this.plateFullLabel.scale, { x: 1, y: 1 }, { duration: 0.28, ease: 'backOut', at: 0 }],
    ]);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.destroyEffects();
    super.destroy(options);
  }
}
