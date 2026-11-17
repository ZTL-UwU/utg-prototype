import { REMOTE_SENTENCES_BUNDLE } from '../../../../zustandStores/sentenceStore';
import type { TLevel } from '../../level-map/units';
import { BLUE_BOOK_ART } from '../book-layout';
import { SentenceTypingScreen } from '../sentence-typing-screen';

/** The goat's story, typed from a blue book. */
export class TypingGoatsScreen extends SentenceTypingScreen {
  public readonly screenName = 'TypingGoatsScreen';
  public static assetBundles = ['typing-level-goat', 'ui', REMOTE_SENTENCES_BUNDLE];
  public static helpAssets = [
    'tutorial-popups/typing-level-goat-1.png',
    'tutorial-popups/typing-level-goat-2.png',
    'tutorial-popups/typing-level-goat-3.png',
  ];
  public static loadingBackgroundAsset = 'typing-levels/typing-level-goat/splash.png';

  constructor(level: TLevel) {
    super(level, {
      levelType: 'typing-goat',
      background: 'typing-levels/typing-level-goat/background.png',
      book: 'typing-levels/typing-level-goat/book.svg',
      bookArt: BLUE_BOOK_ART,
    });
  }
}
