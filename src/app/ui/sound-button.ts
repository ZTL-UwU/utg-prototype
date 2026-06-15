import { FancyButton } from '@pixi/ui';
type SoundButtonProps = {
  onClick: () => void;
  size?: number;
  isLarge?: boolean;
};
export class SoundButton extends FancyButton {
  constructor({ onClick, size = 80, isLarge = false }: SoundButtonProps) {
    const asset = isLarge ? 'ui/sound-button-large.png' : 'ui/sound-button.svg';
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
