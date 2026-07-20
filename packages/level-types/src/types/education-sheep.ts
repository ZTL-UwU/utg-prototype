import { defineLevelType } from '../define';
import {
  defaultEducationLettersProps,
  educationLettersPropsSchema,
} from '../schemas/education-letters';

export const educationSheep = defineLevelType({
  label: 'Education sheep',
  propsSchema: educationLettersPropsSchema,
  defaultProps: defaultEducationLettersProps,
});
