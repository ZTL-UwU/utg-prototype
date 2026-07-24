import { defineLevelType } from '../define';
import {
  defaultEducationBubbleProps,
  educationBubblePropsSchema,
} from '../schemas/education-letters';

export const educationBubble = defineLevelType({
  label: 'Education bubble',
  propsSchema: educationBubblePropsSchema,
  defaultProps: defaultEducationBubbleProps,
});
