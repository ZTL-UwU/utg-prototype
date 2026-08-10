import { defineLevelType } from '../define';
import { defaultTypingGoatsProps, typingGoatsPropsSchema } from '../schemas/typing-game';

export const typingGoat = defineLevelType({
  label: 'Typing goats',
  propsSchema: typingGoatsPropsSchema,
  defaultProps: defaultTypingGoatsProps,
});
