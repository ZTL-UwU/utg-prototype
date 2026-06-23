import { animate, type AnimationPlaybackControls } from 'motion';
import { Container, Sprite, Text, Texture } from 'pixi.js';

const LEAF_FONT_COLORS: Record<string, number> = {
  'typing-levels/typing-level-2/leaf-1.svg': 0x502d1a,
  'typing-levels/typing-level-2/leaf-2.svg': 0xfbf0de,
  'typing-levels/typing-level-2/leaf-3.svg': 0x502d1a,
};

type LeafLetterOptions = {
  letter: string;
  size: number;
  leafAsset: string;
};

export class LeafLetter extends Container {
  private readonly content: Container;
  private readonly leaf: Sprite;
  private readonly letterLabel: Text;
  private feedbackAnimation?: AnimationPlaybackControls;

  constructor({ letter, size, leafAsset }: LeafLetterOptions) {
    super({
      layout: {
        width: size,
        flexShrink: 0,
      },
    });

    this.leaf = new Sprite(Texture.from(leafAsset));
    this.leaf.width = size;
    this.leaf.height = (size / this.leaf.texture.width) * this.leaf.texture.height;

    this.letterLabel = new Text({
      text: letter,
      resolution: 2,
      style: {
        align: 'center',
        fill: LEAF_FONT_COLORS[leafAsset] ?? 0xfbf0de,
        fontFamily: 'Noto Naskh Arabic Bold',
        fontSize: size * 0.3,
        fontWeight: '700',
        padding: 30,
      },
    });

    this.letterLabel.anchor.set(0.5);
    this.letterLabel.position.set(this.leaf.width * 0.54, this.leaf.height * 0.5);

    this.content = new Container();
    this.content.pivot.set(this.leaf.width / 2, this.leaf.height / 2);
    this.content.position.set(this.leaf.width / 2, this.leaf.height / 2);
    this.content.addChild(this.leaf, this.letterLabel);
    this.addChild(this.content);
  }

  public async playAppear(delay: number) {
    const fade = { alpha: 0 };
    this.alpha = fade.alpha;
    this.content.scale.set(0.6);

    await Promise.all([
      animate(
        fade,
        { alpha: 1 },
        {
          duration: 0.4,
          ease: 'backOut',
          delay,
          onUpdate: () => {
            this.alpha = fade.alpha;
          },
        },
      ),
      animate(this.content.scale, { x: 1, y: 1 }, { duration: 0.4, ease: 'backOut', delay }),
    ]);
  }

  public setFeedback(feedback: 'success') {
    this.feedbackAnimation?.stop();
    this.leaf.tint = feedback === 'success' ? 0xc4e86b : 0xffffff;
    this.feedbackAnimation = animate([
      [this.content.scale, { x: 1.12, y: 1.12 }, { duration: 0.14, ease: 'backOut' }],
      [this.content.scale, { x: 1, y: 1 }, { type: 'spring', bounce: 0.35, duration: 0.48 }],
    ]);
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.feedbackAnimation?.stop();
    super.destroy(options);
  }
}
