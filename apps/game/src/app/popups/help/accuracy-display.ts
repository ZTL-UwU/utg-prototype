import { ProgressBar } from '@pixi/ui';
import { Graphics, Text } from 'pixi.js';

const PROGRESS_BAR_WIDTH = 340;
const PROGRESS_BAR_HEIGHT = 24;
const PROGRESS_BAR_RADIUS = 12;
const PROGRESS_BAR_BORDER = 2;

import { m } from '../../../paraglide/messages.js';
import { DISPLAY_FONT_FAMILY } from '../../../utils/fonts';
import { getAccuracyPercent } from '../../../zustandStores/scoreManager';

function createAccuracyProgressBar() {
  const bg = new Graphics()
    .roundRect(0, 0, PROGRESS_BAR_WIDTH, PROGRESS_BAR_HEIGHT, PROGRESS_BAR_RADIUS)
    .fill(0x000000)
    .roundRect(
      PROGRESS_BAR_BORDER,
      PROGRESS_BAR_BORDER,
      PROGRESS_BAR_WIDTH - PROGRESS_BAR_BORDER * 2,
      PROGRESS_BAR_HEIGHT - PROGRESS_BAR_BORDER * 2,
      PROGRESS_BAR_RADIUS,
    )
    .fill(0xffffff);

  const fill = new Graphics()
    .roundRect(0, 0, PROGRESS_BAR_WIDTH, PROGRESS_BAR_HEIGHT, PROGRESS_BAR_RADIUS)
    .fill(0x000000)
    .roundRect(
      PROGRESS_BAR_BORDER,
      PROGRESS_BAR_BORDER,
      PROGRESS_BAR_WIDTH - PROGRESS_BAR_BORDER * 2,
      PROGRESS_BAR_HEIGHT - PROGRESS_BAR_BORDER * 2,
      PROGRESS_BAR_RADIUS,
    )
    .fill(0x4caf50);

  return new ProgressBar({
    bg,
    fill,
    progress: 0,
  });
}

export class AccuracyDisplay {
  readonly label: Text;
  readonly progressBar: ProgressBar;

  constructor() {
    this.label = new Text({
      text: m.accuracy_percent({ accuracy: 0 }),
      resolution: 2,
      style: {
        fontFamily: DISPLAY_FONT_FAMILY,
        fontSize: 24,
        fill: 0x000000,
      },
    });

    this.progressBar = createAccuracyProgressBar();
    this.progressBar.setSize(PROGRESS_BAR_WIDTH, PROGRESS_BAR_HEIGHT);
  }

  get content() {
    return [this.label, this.progressBar];
  }

  update(correctCount: number, mistakeCount: number) {
    const accuracy = getAccuracyPercent(correctCount, mistakeCount);

    this.label.text = m.accuracy_percent({ accuracy });
    this.progressBar.progress = accuracy;
  }
}
