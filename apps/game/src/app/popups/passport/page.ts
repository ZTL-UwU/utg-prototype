import { animate, type AnimationPlaybackControls } from 'motion';
import { Assets, Container, Sprite, Text, Texture } from 'pixi.js';

export const PASSPORT_TEXT_COLOR = 0x373a82;

const EMPTY_ASSET = 'passport/empty-ring.png';

const SCALE = 1.5;
const SLOT_SIZE = 62 * SCALE;
export const PASSPORT_TROPHY_SLOT_SIZE = 110 * SCALE;
const SLOT_GAP = 10 * SCALE;
/** Label to the slots it owns. */
const LABEL_GAP = 2 * SCALE;
/** Between unit rows. Without this, space-evenly leaves a label touching the row above. */
const ROW_GAP = 16 * SCALE;
const TITLE_GAP = 14 * SCALE;

const SHAKE_STAGGER = 0.08;
const SHAKE_DURATION = 0.5;
const SHAKE_KEYFRAMES = [0, -0.12, 0.12, -0.08, 0.08, 0];

const TITLE_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 32 * SCALE,
  fontWeight: 'bold' as const,
  fill: PASSPORT_TEXT_COLOR,
} as const;

const LABEL_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 16 * SCALE,
  fill: PASSPORT_TEXT_COLOR,
} as const;

export interface SlotSpec {
  alias?: string;
  isNew: boolean;
}

export interface PassportRow {
  label: string;
  slots: SlotSpec[];
}

export interface PassportPageOptions {
  title: string;
  rows: PassportRow[];
  /** Larger slots for the trophies page, which holds one badge per layer. */
  slotSize?: number;
}

/** The sprite has no `layout` on purpose: that is what keeps the shake safe to animate. */
export class PassportSlot extends Container {
  private readonly marker: Sprite;
  private shake?: AnimationPlaybackControls;

  constructor(spec: SlotSpec, size: number) {
    super({
      layout: {
        width: size,
        height: size,
      },
    });

    const texture =
      spec.alias && Assets.resolver.hasKey(spec.alias)
        ? Texture.from(spec.alias)
        : Texture.from(EMPTY_ASSET);

    this.marker = new Sprite({
      texture,
      anchor: 0.5,
      position: { x: size / 2, y: size / 2 },
    });
    // Manual "contain", since the sprite is not layout-managed.
    this.marker.scale.set(size / Math.max(texture.width, texture.height));

    this.addChild(this.marker);
  }

  public playShake(index: number) {
    this.shake = animate(
      this.marker,
      { rotation: SHAKE_KEYFRAMES },
      { duration: SHAKE_DURATION, delay: index * SHAKE_STAGGER, ease: 'easeInOut' },
    );
  }

  public stopShake() {
    this.shake?.stop();
    this.shake = undefined;
  }
}

export class PassportPage extends Container {
  private readonly newSlots: PassportSlot[] = [];

  constructor({ title, rows, slotSize = SLOT_SIZE }: PassportPageOptions) {
    super({
      layout: {
        flexDirection: 'column',
        flex: 1,
        gap: TITLE_GAP,
      },
    });

    const rowContainers = rows.map((row) => {
      const slots = row.slots.map((spec) => {
        const slot = new PassportSlot(spec, slotSize);
        if (spec.isNew) this.newSlots.push(slot);
        return slot;
      });

      return new Container({
        layout: {
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          gap: LABEL_GAP,
        },
        children: [
          new Text({ text: row.label, style: LABEL_STYLE, layout: true }),
          new Container({
            layout: {
              flexDirection: 'row',
              justifyContent: 'center',
              gap: SLOT_GAP,
            },
            children: slots,
          }),
        ],
      });
    });

    // Fills the page
    const grid = new Container({
      layout: {
        flexDirection: 'column',
        width: '100%',
        flex: 1,
        justifyContent: 'space-evenly',
        gap: ROW_GAP,
      },
      children: rowContainers,
    });

    this.addChild(new Text({ text: title, style: TITLE_STYLE, layout: true }), grid);
  }

  public playNewRewardAnimations() {
    this.newSlots.forEach((slot, index) => slot.playShake(index));
  }

  public stopAnimations() {
    for (const slot of this.newSlots) {
      slot.stopShake();
    }
  }
}
