import { defineLevelType } from '../define';
import { defaultGameTroutProps, gameTroutPropsSchema } from '../schemas/game-trout';

export const gameTrout = defineLevelType({
  label: 'Game trout',
  propsSchema: gameTroutPropsSchema,
  defaultProps: defaultGameTroutProps,
});
