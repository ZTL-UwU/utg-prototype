import { defineLevelType } from '../define';
import {
  defaultEducationLettersProps,
  educationLettersPropsSchema,
} from '../schemas/education-letters';

export const educationBubble = defineLevelType({
  label: 'Education bubble',
  propsSchema: educationLettersPropsSchema,
  defaultProps: defaultEducationLettersProps,
});
