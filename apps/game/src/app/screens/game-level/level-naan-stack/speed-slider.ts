import { Container, FillGradient, type FederatedPointerEvent, Graphics, Rectangle } from 'pixi.js';

const SLOW_COLOR = 0xffd23f;
const MID_COLOR = 0xff8c1a;
const FAST_COLOR = 0xe53935;
const TRACK_STROKE_COLOR = 0xfbf0de;
const THUMB_COLOR = 0xffffff;
const THUMB_STROKE_COLOR = 0x703e1b;

type SpeedSliderOptions = {
  width?: number;
  height?: number;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
};

export class SpeedSlider extends Container {
  private readonly track: Graphics;
  private readonly thumb: Graphics;
  private readonly trackWidth: number;
  private readonly min: number;
  private readonly max: number;
  private readonly onChange: (value: number) => void;
  private dragging = false;
  private _value: number;

  constructor({ width = 480, height = 44, min, max, value, onChange }: SpeedSliderOptions) {
    super();
    this.trackWidth = width;
    this.min = min;
    this.max = max;
    this.onChange = onChange;
    this._value = value;

    const gradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      colorStops: [
        { offset: 0, color: SLOW_COLOR },
        { offset: 0.5, color: MID_COLOR },
        { offset: 1, color: FAST_COLOR },
      ],
    });

    this.track = new Graphics()
      .roundRect(0, 0, width, height, height / 2)
      .fill(gradient)
      .stroke({ width: 4, color: TRACK_STROKE_COLOR, alignment: 0.5 });

    const thumbRadius = height * 0.75;
    this.thumb = new Graphics()
      .circle(0, 0, thumbRadius)
      .fill(THUMB_COLOR)
      .stroke({ width: 6, color: THUMB_STROKE_COLOR });
    this.thumb.y = height / 2;

    this.addChild(this.track, this.thumb);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(
      -thumbRadius,
      height / 2 - thumbRadius,
      width + thumbRadius * 2,
      thumbRadius * 2,
    );
    this.on('pointerdown', this.handlePointerDown);
    this.on('globalpointermove', this.handlePointerMove);
    this.on('pointerup', this.handlePointerUp);
    this.on('pointerupoutside', this.handlePointerUp);

    this.positionThumb();
  }

  public get value(): number {
    return this._value;
  }

  private readonly handlePointerDown = (event: FederatedPointerEvent) => {
    this.dragging = true;
    this.updateFromPointer(event);
  };

  private readonly handlePointerMove = (event: FederatedPointerEvent) => {
    if (!this.dragging) return;
    this.updateFromPointer(event);
  };

  private readonly handlePointerUp = () => {
    this.dragging = false;
  };

  private updateFromPointer(event: FederatedPointerEvent) {
    const localX = this.toLocal(event.global).x;
    const ratio = Math.max(0, Math.min(1, localX / this.trackWidth));
    this._value = this.min + ratio * (this.max - this.min);
    this.positionThumb();
    this.onChange(this._value);
  }

  private positionThumb() {
    const ratio = (this._value - this.min) / (this.max - this.min);
    this.thumb.x = Math.max(0, Math.min(1, ratio)) * this.trackWidth;
  }
}
