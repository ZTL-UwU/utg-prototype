import { z } from 'zod';

/** Shared letter-pool props for letter-based education levels. */
export const educationLettersPropsSchema = z.object({
  letters: z.array(z.string().min(1, 'Letter is required.')),
});

export type EducationLettersProps = z.infer<typeof educationLettersPropsSchema>;

export function defaultEducationLettersProps(
  overrides?: Partial<EducationLettersProps>,
): EducationLettersProps {
  return {
    letters: [],
    ...overrides,
  };
}

export const educationLetterGridPropsSchema = educationLettersPropsSchema;

export type EducationLetterGridProps = EducationLettersProps;

export function defaultEducationLetterGridProps(): EducationLetterGridProps {
  return defaultEducationLettersProps();
}

export const educationBubblePropsSchema = educationLettersPropsSchema;

export type EducationBubbleProps = EducationLettersProps;

export function defaultEducationBubbleProps(): EducationBubbleProps {
  return defaultEducationLettersProps();
}

export const educationSheepPropsSchema = educationLettersPropsSchema;

export type EducationSheepProps = EducationLettersProps;

export function defaultEducationSheepProps(): EducationSheepProps {
  return defaultEducationLettersProps();
}

export const educationSheepJumpPropsSchema = z.object({
  letters: z.array(z.string().min(1, 'Letter is required.')),
  thankYouMinStars: z.number().int().min(0).max(3),
});

export type EducationSheepJumpProps = z.infer<typeof educationSheepJumpPropsSchema>;

export function defaultEducationSheepJumpProps(): EducationSheepJumpProps {
  return {
    letters: [],
    thankYouMinStars: 2,
  };
}

export const educationWhackAMolePropsSchema = z.object({
  letters: z.array(z.string().min(1, 'Letter is required.')),
  moleTurnDelayMs: z.number().int().positive(),
  initialMoleDelayMs: z.number().int().positive(),
});

export type EducationWhackAMoleProps = z.infer<typeof educationWhackAMolePropsSchema>;

export function defaultEducationWhackAMoleProps(): EducationWhackAMoleProps {
  return {
    letters: [],
    moleTurnDelayMs: 1200,
    initialMoleDelayMs: 700,
  };
}
