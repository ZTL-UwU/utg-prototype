import { defineLevelType } from '../define';
import { defaultGameNaanStackProps, gameNaanStackPropsSchema } from '../schemas/typing-game';

export const gameNaanStack = defineLevelType({
  label: 'Game stack the naan',
  propsSchema: gameNaanStackPropsSchema,
  defaultProps: defaultGameNaanStackProps,
});
