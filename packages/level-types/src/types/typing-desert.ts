import { defineLevelType } from '../define';
import { defaultEmptyProps, emptyPropsSchema } from '../schemas/empty-props';

export const typingDesert = defineLevelType({
  label: 'Typing desert',
  propsSchema: emptyPropsSchema,
  defaultProps: defaultEmptyProps,
});
