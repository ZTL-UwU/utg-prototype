import { defineLevelType } from '../define';
import {
  defaultEducationLettersProps,
  educationLettersPropsSchema,
} from '../schemas/education-letters';

export const educationSheepJump = defineLevelType({
  label: 'Education sheep jump',
  propsSchema: educationLettersPropsSchema,
  defaultProps: defaultEducationLettersProps,
});
