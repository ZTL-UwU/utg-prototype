import { defineLevelType } from '../define';
import {
  defaultEducationSheepProps,
  educationSheepPropsSchema,
} from '../schemas/education-letters';

export const educationSheep = defineLevelType({
  label: 'Education sheep',
  propsSchema: educationSheepPropsSchema,
  defaultProps: defaultEducationSheepProps,
});
