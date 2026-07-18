import type { z } from 'zod';

/**
 * Shape of a single level type entry in the registry.
 * Keep UI (forms, editors) out of this package — only schema + metadata.
 */
export type LevelTypeConfig<TSchema extends z.ZodType = z.ZodType> = {
  label: string;
  propsSchema: TSchema;
  defaultProps: () => z.infer<TSchema>;
};

/**
 * Define a level type config with inferred props typing.
 * Prefer one module per type under `./types/`, then register it in `./registry.ts`.
 */
export function defineLevelType<TSchema extends z.ZodType>(
  config: LevelTypeConfig<TSchema>,
): LevelTypeConfig<TSchema> {
  return config;
}
