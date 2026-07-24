import { defineLevelType } from '../define';
import { defaultEducationWordsProps, educationWordsPropsSchema } from '../schemas/education-words';

export const educationWord = defineLevelType({
  label: 'Education word',
  propsSchema: educationWordsPropsSchema,
  defaultProps: defaultEducationWordsProps,
});
