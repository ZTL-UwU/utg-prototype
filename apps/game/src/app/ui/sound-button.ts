import { FancyButton } from '@pixi/ui';

type SoundButtonVariant = 'default' | 'large' | 'brown';

const VARIANT_ASSETS: Record<SoundButtonVariant, string> = {
  default: 'ui/sound-button.svg',
  large: 'ui/sound-button-large.png',
  brown: 'ui/sound-button-brown.png',
};

type SoundButtonProps = {
  onClick: () => void;
  size?: number;
  variant?: SoundButtonVariant;
};

export class SoundButton extends FancyButton {
  constructor({ onClick, size = 80, variant = 'default' }: SoundButtonProps) {
    const asset = VARIANT_ASSETS[variant];
    super({
      defaultView: asset,
      animations: {
        hover: {
          props: { scale: { x: 1.03, y: 1.03 } },
          duration: 100,
        },
        pressed: {
          props: {
            scale: { x: 0.97, y: 0.97 },
          },
          duration: 100,
        },
      },
    });

    this.anchor.set(0.5);
    this.onPress.connect(onClick);
    this.once('added', () => {
      this.scale.set(size / this.width);
    });
  }
}
