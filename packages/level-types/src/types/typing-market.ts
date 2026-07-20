import { defineLevelType } from '../define';
import { defaultEmptyProps, emptyPropsSchema } from '../schemas/empty-props';

export const typingMarket = defineLevelType({
  label: 'Typing market',
  propsSchema: emptyPropsSchema,
  defaultProps: defaultEmptyProps,
});
