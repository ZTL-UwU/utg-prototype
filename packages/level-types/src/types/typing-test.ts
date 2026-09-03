import { defineLevelType } from '../define';
import { defaultTypingTestProps, typingTestPropsSchema } from '../schemas/typing-game';

export const typingTest = defineLevelType({
  label: 'Typing test',
  propsSchema: typingTestPropsSchema,
  defaultProps: defaultTypingTestProps,
});
