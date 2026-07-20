import { defineLevelType } from '../define';
import {
  defaultEducationLettersProps,
  educationLettersPropsSchema,
} from '../schemas/education-letters';

export const educationImage = defineLevelType({
  label: 'Education image',
  propsSchema: educationLettersPropsSchema,
  defaultProps: defaultEducationLettersProps,
});
