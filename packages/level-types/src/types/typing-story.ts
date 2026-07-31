import { defineLevelType } from '../define';
import { defaultTypingStoryProps, typingStoryPropsSchema } from '../schemas/typing-game';

export const typingStory = defineLevelType({
  label: 'Typing story',
  propsSchema: typingStoryPropsSchema,
  defaultProps: defaultTypingStoryProps,
});
