import { defineLevelType } from '../define';
import { defaultTypingWordsProps, typingWordsPropsSchema } from '../schemas/typing-game';

export const typingMarket = defineLevelType({
  label: 'Typing market',
  propsSchema: typingWordsPropsSchema,
  defaultProps: defaultTypingWordsProps,
});
