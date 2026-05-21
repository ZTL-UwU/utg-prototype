import { Container, Sprite, Texture, type AssetsBundle } from 'pixi.js';

import type { SceneLifecycle } from '../types';
import { CloseButton } from './CloseButton';
import { LayerButton } from './LayerButton';

export type LayerSelectSceneData = {
  onClose?: () => void;
  onLayerButtonClick?: () => void;
};
export class LayerSelectScene extends Container implements SceneLifecycle<LayerSelectSceneData> {
  public static readonly sceneId = 'layer-select';
  private readonly background = new Sprite();
  public static readonly assetBundles: AssetsBundle[] = [
    {
      name: 'layer-select',
      assets: [
        { alias: 'layer-select-bg', src: '/assets/layer_select/layer-select-bg.png' },
        { alias: 'typing-icon', src: '/assets/layer_select/typing-icon.png' },
        { alias: 'x-mark', src: '/assets/layer_select/x-mark.png' },
        { alias: 'education-icon', src: '/assets/layer_select/education-icon.png' },
      ],
    },
  ] as const;

  private closeButton?: CloseButton;
  private typingButton?: LayerButton;
  private educationButton?: LayerButton;

  private panel = new Container();

  constructor() {
    super();
    this.panel.addChild(this.background);
    this.addChild(this.panel);
  }
  public prepare(data?: LayerSelectSceneData) {
    this.layout = {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    };

    this.panel.layout = {
      position: 'relative',
      width: '75%',
      height: '75%',
    };

    this.background.layout = {
      position: 'absolute',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    };

    this.background.texture = Texture.from('layer-select-bg');

    if (data?.onClose) {
      this.closeButton = new CloseButton(data.onClose);
      this.closeButton.layout = { position: 'absolute', top: 16, left: 160 };
      this.panel.addChild(this.closeButton);
    }
    if (data?.onLayerButtonClick) {
      this.typingButton = new LayerButton(data?.onLayerButtonClick, 'typing-icon');
      this.educationButton = new LayerButton(data?.onLayerButtonClick, 'education-icon');
      this.typingButton.layout = { position: 'absolute', top: 80, left: 575 };
      this.educationButton.layout = { position: 'absolute', top: 360, left: 150 };
      this.panel.addChild(this.typingButton, this.educationButton);
    }

    this.alpha = 0;
  }

  public reset() {
    this.background.layout = null;
    this.panel.layout = null;
    if (this.closeButton) this.closeButton.layout = null;
    this.closeButton = undefined;
    if (this.typingButton) this.typingButton.layout = null;
    this.typingButton = undefined;
    this.layout = null;
  }
  public show() {
    this.alpha = 1;
  }
  public hide() {
    this.alpha = 0;
  }
}
