import { defineLevelType } from '../define';
import {
  defaultEducationLetterGridProps,
  educationLetterGridPropsSchema,
} from '../schemas/education-letters';

export const educationLetterGrid = defineLevelType({
  label: 'Education letter grid',
  propsSchema: educationLetterGridPropsSchema,
  defaultProps: defaultEducationLetterGridProps,
});
