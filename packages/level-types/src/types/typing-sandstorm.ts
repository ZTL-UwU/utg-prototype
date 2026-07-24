import { defineLevelType } from '../define';
import { defaultTypingSandstormProps, typingSandstormPropsSchema } from '../schemas/typing-game';

export const typingSandstorm = defineLevelType({
  label: 'Typing sandstorm',
  propsSchema: typingSandstormPropsSchema,
  defaultProps: defaultTypingSandstormProps,
});
