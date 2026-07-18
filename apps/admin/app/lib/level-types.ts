import { z } from 'zod';

export const educationLetterGridPropsSchema = z.object({
  letters: z.array(z.string().min(1, 'Letter is required.')),
});

export type EducationLetterGridProps = z.infer<typeof educationLetterGridPropsSchema>;

type LevelTypeConfig<TSchema extends z.ZodType> = {
  label: string;
  propsSchema: TSchema;
  defaultProps: () => z.infer<TSchema>;
};

/**
 * Source of truth for level type ids, labels, and props schemas.
 * Add new types here; register their admin forms in `level-type-forms`.
 */
export const LEVEL_TYPES = {
  'education-letter-grid': {
    label: 'Education letter grid',
    propsSchema: educationLetterGridPropsSchema,
    defaultProps: (): EducationLetterGridProps => ({ letters: [] }),
  },
} as const satisfies Record<string, LevelTypeConfig<z.ZodType>>;

export type LevelTypeId = keyof typeof LEVEL_TYPES;

export const LEVEL_TYPE_IDS = Object.keys(LEVEL_TYPES) as [LevelTypeId, ...LevelTypeId[]];

export type LevelTypeProps = {
  [K in LevelTypeId]: z.infer<(typeof LEVEL_TYPES)[K]['propsSchema']>;
};

export function isLevelTypeId(value: string): value is LevelTypeId {
  return value in LEVEL_TYPES;
}

export function levelTypeLabel(levelType: string): string {
  if (isLevelTypeId(levelType)) {
    return LEVEL_TYPES[levelType].label;
  }
  return levelType;
}

export function defaultLevelProps<T extends LevelTypeId>(levelType: T): LevelTypeProps[T] {
  return LEVEL_TYPES[levelType].defaultProps() as LevelTypeProps[T];
}

export function parseLevelProps<T extends LevelTypeId>(
  levelType: T,
  value: unknown,
): LevelTypeProps[T] {
  const parsed = LEVEL_TYPES[levelType].propsSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data as LevelTypeProps[T];
  }
  return defaultLevelProps(levelType);
}
