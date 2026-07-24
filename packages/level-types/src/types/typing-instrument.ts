import { defineLevelType } from '../define';
import { defaultTypingInstrumentProps, typingInstrumentPropsSchema } from '../schemas/typing-game';

export const typingInstrument = defineLevelType({
  label: 'Typing instrument',
  propsSchema: typingInstrumentPropsSchema,
  defaultProps: defaultTypingInstrumentProps,
});
