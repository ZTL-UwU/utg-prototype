import { defineLevelType } from '../define';
import { defaultGameSkiProps, gameSkiPropsSchema } from '../schemas/game-ski';

export const gameSki = defineLevelType({
  label: 'Game ski racing',
  propsSchema: gameSkiPropsSchema,
  defaultProps: defaultGameSkiProps,
});
