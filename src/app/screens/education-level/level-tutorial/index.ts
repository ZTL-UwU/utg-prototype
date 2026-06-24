import { sound, type IMediaInstance } from '@pixi/sound';
import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, Graphics, Sprite, Texture, Ticker } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { EDUCATION_LETTERS } from '../../../../utils/example-words';
import { HUD } from '../../../ui/hud';
import { LevelMapScreen } from '../../level-map';
import type { TMapUnit } from '../../level-map/units';
import { EducationYoutubeScreen } from '../youtube-videos';
import { LetterGrid } from './letter-grid';

const ALPHABET_SONG_ALIAS = 'education-levels/education-tutorial/uyghur-alphabet-song.mp3';

const letters = [
  EDUCATION_LETTERS.slice(0, 8),
  EDUCATION_LETTERS.slice(8, 16),
  EDUCATION_LETTERS.slice(16, 24),
  EDUCATION_LETTERS.slice(24, 32),
];

const STOP_BUTTON_SIZE = 115;

function drawStopButton(size: number, state: 'default' | 'hover') {
  const sq = size * 0.38;
  const off = (size - sq) / 2;
  const shadow = state === 'default' ? 0xa93226 : 0x922b21;
  const fill = state === 'default' ? 0xe74c3c : 0xcb4335;
  return new Graphics()
    .roundRect(0, 4, size, size, size / 4)
    .fill({ color: shadow })
    .roundRect(0, 0, size, size, size / 4)
    .fill({ color: fill })
    .rect(off, off, sq, sq)
    .fill({ color: 0xffffff });
}

export class EducationTutorialScreen extends Container {
  public static assetBundles = [
    'education-level',
    'ui',
    'education-letters-audio',
    'education-words-audio',
    'education-tutorial',
  ];

  private background: Sprite;
  private hud: HUD;
  private letterGrid: LetterGrid;
  private songButton: FancyButton;
  private songPlaying = false;
  private videoButton: FancyButton;
  private songInstance?: IMediaInstance;

  private timings: { char: string; time: number }[] = [];
  private nextBounceIndex: number = 0;
  private songEndTime?: number;
  constructor(mapUnit: TMapUnit) {
    super();

    this.background = new Sprite({
      texture: Texture.from('education-levels/education-level/background.png'),
      layout: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      },
    });

    this.hud = new HUD({
      onBack: () => void engine().navigation.showScreen(LevelMapScreen, mapUnit),
      noHelpButton: true,
    });

    engine().audio.bgm.setVolume(0);

    this.letterGrid = new LetterGrid(letters, () => void this.onStop());

    this.songButton = new FancyButton({
      defaultView: 'education-levels/education-tutorial/song-icon.png',
      animations: {
        hover: {
          props: { scale: { x: 1.1, y: 1.1 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.97, y: 0.97 } },
          duration: 100,
        },
      },
      anchor: 0.5,
    });

    this.songButton.onPress.connect(() => {
      if (this.songPlaying) void this.onStop();
      else void this.onPlay();
    });

    this.songButton.layout = {
      position: 'absolute',
      top: 90,
      right: 90,
    };

    this.videoButton = new FancyButton({
      defaultView: 'ui/video-button.png',
      animations: {
        hover: {
          props: { scale: { x: 1.1, y: 1.1 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.97, y: 0.97 } },
          duration: 100,
        },
      },
      anchor: 0.5,
    });
    this.videoButton.onPress.connect(() => {
      void engine().audio.sfx.play('preload-audio/sfx/button-click.mp3');
      void engine().navigation.showScreen(EducationYoutubeScreen, mapUnit);
    });
    this.videoButton.layout = {
      position: 'absolute',
      top: 230,
      right: 90,
    };

    this.addChild(this.background, this.letterGrid, this.videoButton, this.hud, this.songButton);
  }

  public resize(width: number, height: number) {
    this.layout = { width, height };
    this.letterGrid.resize(width, height);
  }

  public async show() {
    this.letterGrid.alpha = 0;
    this.letterGrid.scale.set(0.4);
    await Promise.all([
      animate(this.letterGrid, { alpha: 1 }, { duration: 0.4, ease: 'backOut' }),
      animate(this.letterGrid.scale, { x: 1, y: 1 }, { duration: 0.4, ease: 'backOut' }),
    ]);
  }

  public async hide() {
    void this.onStop();
    await Promise.all([
      animate(this.letterGrid, { alpha: 0 }, { duration: 0.2, ease: 'easeIn' }),
      animate(this.letterGrid.scale, { x: 0.4, y: 0.4 }, { duration: 0.2, ease: 'easeIn' }),
    ]);
  }
  private async onPlay() {
    if (this.songPlaying) return;
    this.songPlaying = true;

    this.updateSongButtonViews();
    await Promise.all([
      animate(this.hud, { alpha: 0 }, { duration: 0.3, ease: 'easeIn' }),
      animate(this.videoButton, { alpha: 0 }, { duration: 0.3, ease: 'easeIn' }),
    ]);
    this.hud.eventMode = 'none';

    this.songInstance = await engine().audio.sfx.play(ALPHABET_SONG_ALIAS, { start: 1.15 });
    this.letterGrid.setSongMode(true);

    this.timings = this.letterGrid.getLetterTimingOffsets();
    this.songEndTime = this.timings[this.timings.length - 1].time + 2;
  }

  public update(_ticker: Ticker) {
    if (!this.songPlaying || !this.songInstance || !this.songEndTime) return;

    const duration = sound.find(ALPHABET_SONG_ALIAS)?.duration ?? 0;
    const t = this.songInstance.progress * duration;

    while (
      this.nextBounceIndex < this.timings.length &&
      this.timings[this.nextBounceIndex].time <= t
    ) {
      this.letterGrid.bounceKey(this.timings[this.nextBounceIndex].char);
      this.nextBounceIndex++;
    }

    if (t >= duration) void this.onStop();
  }

  private async onStop() {
    this.songPlaying = false;
    engine().audio.sfx.stop(ALPHABET_SONG_ALIAS);
    this.nextBounceIndex = 0;
    this.songInstance = undefined;
    this.letterGrid.setSongMode(false);
    await Promise.all([
      animate(this.hud, { alpha: 1 }, { duration: 0.3, ease: 'easeOut' }),
      animate(this.videoButton, { alpha: 1 }, { duration: 0.3, ease: 'easeOut' }),
    ]);
    this.hud.eventMode = 'static';
    this.updateSongButtonViews();
  }

  private updateSongButtonViews() {
    if (this.songPlaying) {
      this.songButton.defaultView = drawStopButton(STOP_BUTTON_SIZE, 'default');
      this.songButton.hoverView = drawStopButton(STOP_BUTTON_SIZE, 'hover');
      this.songButton.pressedView = drawStopButton(STOP_BUTTON_SIZE, 'hover');
    } else {
      this.songButton.defaultView = 'education-levels/education-tutorial/song-icon.png';
      this.songButton.removeView('hoverView');
      this.songButton.removeView('pressedView');
    }
  }
}
