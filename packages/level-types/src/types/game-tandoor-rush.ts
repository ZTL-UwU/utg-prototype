import { defineLevelType } from '../define';
import { defaultEmptyProps, emptyPropsSchema } from '../schemas/empty-props';

export const gameTandoorRush = defineLevelType({
  label: 'Game tandoor rush',
  propsSchema: emptyPropsSchema,
  defaultProps: defaultEmptyProps,
});
