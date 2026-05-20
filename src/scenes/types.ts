import type { AssetsBundle, Container, Ticker } from 'pixi.js';

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
