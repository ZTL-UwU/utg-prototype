import { defineLevelType } from '../define';
import { defaultEmptyProps, emptyPropsSchema } from '../schemas/empty-props';

export const typingInstrument = defineLevelType({
  label: 'Typing instrument',
  propsSchema: emptyPropsSchema,
  defaultProps: defaultEmptyProps,
});
