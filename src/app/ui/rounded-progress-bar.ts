import { Container, Graphics } from 'pixi.js';

type RoundedProgressBarOptions = {
  width?: number;
  height?: number;
  trackColor?: number;
  fillColor?: number;
  strokeWidth?: number;
  padding?: number;
};

export class RoundedProgressBar extends Container {
  private track: Graphics;
  private fill: Graphics;
  private barWidth: number;
  private barHeight: number;
  private trackColor: number;
  private fillColor: number;
  private strokeWidth: number;
  private padding: number;
  private _progress = 0;

  constructor({
    width = 400,
    height = 35,
    trackColor = 0xfbf0de,
    fillColor = 0xfbf0de,
    strokeWidth = 3,
    padding = 4,
  }: RoundedProgressBarOptions = {}) {
    super();

    this.barWidth = width;
    this.barHeight = height;
    this.trackColor = trackColor;
    this.fillColor = fillColor;
    this.strokeWidth = strokeWidth;
    this.padding = padding;

    this.track = new Graphics()
      .clear()
      .roundRect(0, 0, this.barWidth, this.barHeight, this.barHeight / 2)
      .stroke({ width: this.strokeWidth, color: this.trackColor, alignment: 0.5 });
    this.fill = new Graphics();
    this.addChild(this.track, this.fill);
  }

  get width() {
    return this.barWidth;
  }

  get height() {
    return this.barHeight;
  }

  get progress() {
    return this._progress;
  }

  set progress(value: number) {
    this._progress = Math.max(0, Math.min(1, value));
    this.redrawFill();
  }

  private redrawFill() {
    const innerWidth = this.barWidth - this.padding * 2;
    const innerHeight = this.barHeight - this.padding * 2;
    const filledWidth = Math.max(0, Math.min(innerWidth, innerWidth * this._progress));

    this.fill.clear();
    if (filledWidth > 0) {
      this.fill
        .roundRect(this.padding, this.padding, filledWidth, innerHeight, innerHeight / 2)
        .fill(this.fillColor);
    }
  }
}
