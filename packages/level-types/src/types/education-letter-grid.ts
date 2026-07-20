import { defineLevelType } from '../define';
import {
  defaultEducationLettersProps,
  educationLettersPropsSchema,
  type EducationLettersProps,
} from '../schemas/education-letters';

/** Alias kept for existing admin imports; prefer `educationLettersPropsSchema`. */
export const educationLetterGridPropsSchema = educationLettersPropsSchema;

/** Alias kept for existing admin imports; prefer `EducationLettersProps`. */
export type EducationLetterGridProps = EducationLettersProps;

export const educationLetterGrid = defineLevelType({
  label: 'Education letter grid',
  propsSchema: educationLettersPropsSchema,
  defaultProps: defaultEducationLettersProps,
});
