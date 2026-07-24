import { defineLevelType } from '../define';
import { defaultEducationWordsProps, educationWordsPropsSchema } from '../schemas/education-words';

export const educationImage = defineLevelType({
  label: 'Education image',
  propsSchema: educationWordsPropsSchema,
  defaultProps: defaultEducationWordsProps,
});
