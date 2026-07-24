import { defineLevelType } from '../define';
import {
  defaultEducationWhackAMoleProps,
  educationWhackAMolePropsSchema,
} from '../schemas/education-letters';

export const educationWhackAMole = defineLevelType({
  label: 'Education whack-a-mole',
  propsSchema: educationWhackAMolePropsSchema,
  defaultProps: defaultEducationWhackAMoleProps,
});
