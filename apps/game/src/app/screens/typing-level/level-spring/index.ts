import { REMOTE_SENTENCES_BUNDLE } from '../../../../zustandStores/sentenceStore';
import type { TLevel } from '../../level-map/units';
import { BLUE_BOOK_ART } from '../book-layout';
import { SentenceTypingScreen } from '../sentence-typing-screen';

/** The spring's story, typed from a blue book. */
export class TypingSpringScreen extends SentenceTypingScreen {
  public readonly screenName = 'TypingSpringScreen';
  public static assetBundles = ['typing-level-spring', 'ui', REMOTE_SENTENCES_BUNDLE];
  public static loadingBackgroundAsset = 'typing-levels/typing-level-spring/background.png';
  public static helpAssets: string[] = [];

  constructor(level: TLevel) {
    super(level, {
      levelType: 'typing-spring',
      background: 'typing-levels/typing-level-spring/background.png',
      book: 'typing-levels/typing-level-spring/book.svg',
      bookArt: BLUE_BOOK_ART,
    });
  }
}
