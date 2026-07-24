import { defineLevelType } from '../define';
import { defaultTypingWordsProps, typingWordsPropsSchema } from '../schemas/typing-game';

export const typingWord = defineLevelType({
  label: 'Typing word',
  propsSchema: typingWordsPropsSchema,
  defaultProps: defaultTypingWordsProps,
});
