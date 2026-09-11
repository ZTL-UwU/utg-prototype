import { defineLevelType } from '../define';
import { defaultTypingTestProps, typingTestStoredPropsSchema } from '../schemas/typing-game';

export const typingTest = defineLevelType({
  label: 'Typing test',
  propsSchema: typingTestStoredPropsSchema,
  defaultProps: defaultTypingTestProps,
});
