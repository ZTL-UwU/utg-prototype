import { z } from 'zod';

/** Shared word-id props for education-image and education-word. */
export const educationWordsPropsSchema = z.object({
  wordIds: z.array(z.number().int().positive()),
});

export type EducationWordsProps = z.infer<typeof educationWordsPropsSchema>;

export function defaultEducationWordsProps(): EducationWordsProps {
  return { wordIds: [] };
}
