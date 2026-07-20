import { defineLevelType } from '../define';
import {
  defaultEducationLettersProps,
  educationLettersPropsSchema,
} from '../schemas/education-letters';

export const educationWhackAMole = defineLevelType({
  label: 'Education whack-a-mole',
  propsSchema: educationLettersPropsSchema,
  defaultProps: defaultEducationLettersProps,
});
