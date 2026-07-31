import { sound, type IMediaInstance } from '@pixi/sound';
import { FancyButton } from '@pixi/ui';
import { animate } from 'motion';
import { Container, HTMLText, Texture } from 'pixi.js';

import { engine } from '../../../../engine/getEngine';
import { createExampleWordStyle, getCompletedWordMarkup } from '../../../../utils/example-words';
import useSessionStore from '../../../../zustandStores/sessionStore';
import {
  getWordAudioAlias,
  getWordImageAlias,
  type WordSimple,
} from '../../../../zustandStores/wordStore';

const DISPLAY_SIZE = 280;
const WORD_FONT_SIZE = 72;
const WORD_GAP = 20;

export class LetterChoice extends Container {
  public readonly letter: string;
  private readonly imageButton: FancyButton;
  private readonly isCorrect: boolean;
  private readonly onCorrect?: () => void;
  private readonly word: WordSimple;
  private clicked = false;

  constructor(word: WordSimple, correctLetter: string, onCorrect?: () => void) {
    super();

    const letter = word.target_letter ?? '';
    this.word = word;
    this.letter = letter;
    this.isCorrect = letter === correctLetter;
    this.onCorrect = onCorrect;

    const imageAlias = getWordImageAlias(word.id);
    this.imageButton = new FancyButton({
      defaultView: Texture.from(imageAlias),
      anchor: 0.5,
      animations: {
        hover: {
          props: { scale: { x: 1.05, y: 1.05 } },
          duration: 100,
        },
        pressed: {
          props: { scale: { x: 0.97, y: 0.97 } },
          duration: 100,
        },
      },
    });

    const wordText = word.word.trim();
    const wordLabel = new HTMLText({
      text: getCompletedWordMarkup(letter, wordText),
      style: createExampleWordStyle(WORD_FONT_SIZE),
    });
    wordLabel.anchor.set(0.5, 0);

    this.addChild(this.imageButton, wordLabel);

    const texture = Texture.from(imageAlias);
    if (!texture?.width || !texture?.height) return;

    const naturalHeight = texture.height;
    if (naturalHeight <= 0) return;

    const scale = 0.75;
    this.imageButton.scale.set(scale);
    wordLabel.y = (naturalHeight * scale) / 2 + WORD_GAP;

    this.imageButton.eventMode = 'static';
    this.imageButton.onPress.connect(() => {
      if (this.clicked) return;
      this.clicked = true;
      this.imageButton.eventMode = 'none';

      if (this.isCorrect) void this.handleCorrect();
      else void this.handleIncorrect();
    });
  }

  private async handleCorrect() {
    void engine().audio.sfx.play('preload-audio/sfx/correct-answer.mp3');
    useSessionStore.getState().recordCorrect();
    const sx = this.imageButton.scale.x;
    const sy = this.imageButton.scale.y;
    this.imageButton.tint = 0x8ec24d;
    await animate(
      this.imageButton.scale,
      { x: [sx, sx * 1.15, sx], y: [sy, sy * 1.15, sy] },
      { duration: 0.4, ease: 'easeOut' },
    );
    this.imageButton.tint = 0xffffff;
    const wordAudioAlias = getWordAudioAlias(this.word.id);
    if (sound.exists(wordAudioAlias)) {
      const audio: IMediaInstance = await engine().audio.sfx.play(wordAudioAlias);
      await new Promise<void>((resolve) => {
        audio.once('end', resolve);
        audio.once('stop', resolve);
      });
    }
    this.onCorrect?.();
  }

  private async handleIncorrect() {
    void engine().audio.sfx.play('preload-audio/sfx/wrong-answer.mp3');
    useSessionStore.getState().recordMistake();
    const baseX = this.x;
    const amp = DISPLAY_SIZE * 0.06;
    this.imageButton.tint = 0xef5a42;
    await animate(
      this,
      { x: [baseX, baseX + amp, baseX - amp, baseX + amp, baseX - amp, baseX] },
      { duration: 0.4, ease: 'linear' },
    );
    this.imageButton.tint = 0xffffff;
    this.clicked = false;
    this.imageButton.eventMode = 'static';
  }
}
