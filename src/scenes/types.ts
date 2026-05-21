import gsap from 'gsap';
import { Rectangle, type AssetsBundle, Container, type Ticker, Graphics } from 'pixi.js';
export interface SceneLifecycle<TData = unknown> {
  prepare?(data?: TData): void | Promise<void>;
  show?(): void | Promise<void>;
  hide?(): void | Promise<void>;
  reset?(): void;
  onTick?(ticker: Ticker): void;
  resize?(width: number, height: number): void;
  pause?(): void | Promise<void>;
  resume?(): void | Promise<void>;
  blur?(): void;
  focus?(): void;
}

export type Scene<TData = unknown> = Container & SceneLifecycle<TData>;

export interface SceneConstructor<TData = unknown> {
  readonly sceneId: string;
  readonly assetBundles?: readonly AssetsBundle[];
  new (): Scene<TData>;
}

export abstract class AbstractButton extends Container {
  protected readonly background = new Graphics();
  protected WIDTH: number;
  protected HEIGHT: number;
  constructor(width: number, height: number) {
    super({ layout: { width: width, height: height } });
    this.WIDTH = width;
    this.HEIGHT = height;
    this.pivot.set(width / 2, height / 2);
    this.hitArea = new Rectangle(0, 0, width, height);
    this.eventMode = 'static';
    this.cursor = 'pointer';
  }
  protected draw(color: number) {
    this.background.clear().roundRect(0, 0, this.WIDTH, this.HEIGHT, 20).fill(color);
  }
  protected setState(color: number, scale: number) {
    this.draw(color);
    gsap.to(this.scale, { x: scale, y: scale, duration: 0.1, ease: 'power2.out' });
  }
  override destroy(options?: Parameters<Container['destroy']>[0]) {
    gsap.killTweensOf(this.scale);
    super.destroy(options);
  }
}
