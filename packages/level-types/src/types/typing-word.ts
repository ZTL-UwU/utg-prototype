import { defineLevelType } from '../define';
import { defaultEmptyProps, emptyPropsSchema } from '../schemas/empty-props';

export const typingWord = defineLevelType({
  label: 'Typing word',
  propsSchema: emptyPropsSchema,
  defaultProps: defaultEmptyProps,
});
