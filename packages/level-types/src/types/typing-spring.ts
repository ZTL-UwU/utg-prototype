import { defineLevelType } from '../define';
import { defaultTypingSpringProps, typingSpringPropsSchema } from '../schemas/typing-game';

export const typingSpring = defineLevelType({
  label: 'Typing spring',
  propsSchema: typingSpringPropsSchema,
  defaultProps: defaultTypingSpringProps,
});
