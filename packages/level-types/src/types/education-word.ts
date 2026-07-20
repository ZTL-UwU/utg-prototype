import { defineLevelType } from '../define';
import {
  defaultEducationLettersProps,
  educationLettersPropsSchema,
} from '../schemas/education-letters';

export const educationWord = defineLevelType({
  label: 'Education word',
  propsSchema: educationLettersPropsSchema,
  defaultProps: defaultEducationLettersProps,
});
