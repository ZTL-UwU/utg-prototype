import { defineLevelType } from '../define';
import { defaultGameTandoorRushProps, gameTandoorRushPropsSchema } from '../schemas/typing-game';

export const gameTandoorRush = defineLevelType({
  label: 'Game tandoor rush',
  propsSchema: gameTandoorRushPropsSchema,
  defaultProps: defaultGameTandoorRushProps,
});
