import { defineLevelType } from '../define';
import { defaultGameKiteProps, gameKitePropsSchema } from '../schemas/game-kite';

export const gameKite = defineLevelType({
  label: 'Game kite',
  propsSchema: gameKitePropsSchema,
  defaultProps: defaultGameKiteProps,
});
