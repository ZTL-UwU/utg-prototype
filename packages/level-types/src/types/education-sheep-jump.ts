import { defineLevelType } from '../define';
import {
  defaultEducationSheepJumpProps,
  educationSheepJumpPropsSchema,
} from '../schemas/education-letters';

export const educationSheepJump = defineLevelType({
  label: 'Education sheep jump',
  propsSchema: educationSheepJumpPropsSchema,
  defaultProps: defaultEducationSheepJumpProps,
});
