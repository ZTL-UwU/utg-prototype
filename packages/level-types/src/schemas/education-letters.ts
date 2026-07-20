import { z } from 'zod';

// TODO: this is a placeholder schema, should be replaced with the actual schema
export const educationLettersPropsSchema = z.object({
  letters: z.array(z.string().min(1, 'Letter is required.')),
});

export type EducationLettersProps = z.infer<typeof educationLettersPropsSchema>;

export function defaultEducationLettersProps(): EducationLettersProps {
  return { letters: [] };
}
