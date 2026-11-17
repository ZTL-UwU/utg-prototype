import { REMOTE_SENTENCES_BUNDLE } from '../../../../zustandStores/sentenceStore';
import type { TLevel } from '../../level-map/units';
import { ORANGE_BOOK_ART } from '../book-layout';
import { SentenceTypingScreen } from '../sentence-typing-screen';

/** A story, typed from an orange book. */
export class TypingSentenceScreen extends SentenceTypingScreen {
  public readonly screenName = 'TypingSentenceScreen';
  public static assetBundles = ['typing-level-story', 'ui', REMOTE_SENTENCES_BUNDLE];
  public static loadingBackgroundAsset = 'typing-levels/typing-level-story/background.png';
  public static helpAssets = [
    'tutorial-popups/typing-level-story-1.png',
    'tutorial-popups/typing-level-story-2.png',
    'tutorial-popups/typing-level-story-3.png',
  ];

  constructor(level: TLevel) {
    super(level, {
      levelType: 'typing-story',
      background: 'typing-levels/typing-level-story/background.png',
      book: 'typing-levels/typing-level-story/book.svg',
      bookArt: ORANGE_BOOK_ART,
    });
  }
}
