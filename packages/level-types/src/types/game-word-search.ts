import { defineLevelType } from '../define';
import { defaultGameWordSearchProps, gameWordSearchPropsSchema } from '../schemas/game-word-search';

export const gameWordSearch = defineLevelType({
  label: 'Game word search',
  propsSchema: gameWordSearchPropsSchema,
  defaultProps: defaultGameWordSearchProps,
});
