import { defineLevelType } from '../define';
import { defaultTypingDesertProps, typingDesertPropsSchema } from '../schemas/typing-game';

export const typingDesert = defineLevelType({
  label: 'Typing desert',
  propsSchema: typingDesertPropsSchema,
  defaultProps: defaultTypingDesertProps,
});
