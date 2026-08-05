import { defineLevelType } from '../define';
import { defaultGameFlyingProps, gameFlyingPropsSchema } from '../schemas/game-flying';

export const gameFlying = defineLevelType({
  label: 'Game flying',
  propsSchema: gameFlyingPropsSchema,
  defaultProps: defaultGameFlyingProps,
});
