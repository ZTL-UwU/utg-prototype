import { defineLevelType } from '../define';
import { defaultEmptyProps, emptyPropsSchema } from '../schemas/empty-props';

export const typingSandstorm = defineLevelType({
  label: 'Typing sandstorm',
  propsSchema: emptyPropsSchema,
  defaultProps: defaultEmptyProps,
});
