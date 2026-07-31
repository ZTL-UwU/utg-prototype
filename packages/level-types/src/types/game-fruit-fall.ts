import { defineLevelType } from '../define';
import { defaultGameFruitFallProps, gameFruitFallPropsSchema } from '../schemas/game-fruit-fall';

export const gameFruitFall = defineLevelType({
  label: 'Game fruit fall',
  propsSchema: gameFruitFallPropsSchema,
  defaultProps: defaultGameFruitFallProps,
});
