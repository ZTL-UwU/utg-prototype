import { z } from 'zod';

import { defineLevelType } from '../define';

export const educationLetterGridPropsSchema = z.object({
  letters: z.array(z.string().min(1, 'Letter is required.')),
});

export type EducationLetterGridProps = z.infer<typeof educationLetterGridPropsSchema>;

export const educationLetterGrid = defineLevelType({
  label: 'Education letter grid',
  propsSchema: educationLetterGridPropsSchema,
  defaultProps: (): EducationLetterGridProps => ({ letters: [] }),
});
