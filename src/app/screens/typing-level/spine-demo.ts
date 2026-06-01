import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { Container } from 'pixi.js';

const SPINE_SKELETON = 'typing-level/spineboy/spineboy-pro.skel';
const SPINE_ATLAS = 'typing-level/spineboy/spineboy-pma.atlas';

/** Simple Spineboy walk demo (official spine-pixi-v8 sample assets). */
export class SpineDemo extends Container {
  private readonly spine: Spine;

  constructor() {
    super();

    this.spine = Spine.from({
      skeleton: SPINE_SKELETON,
      atlas: SPINE_ATLAS,
    });
    this.spine.scale.set(0.35);
    this.spine.state.setAnimation(0, 'walk', true);

    this.addChild(this.spine);
  }

  resize(screenWidth: number, screenHeight: number) {
    this.x = screenWidth * 0.5;
    this.y = screenHeight * 0.65;
  }

  pause() {
    this.spine.autoUpdate = false;
  }

  resume() {
    this.spine.autoUpdate = true;
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    this.spine.destroy();
    super.destroy(options);
  }
}
