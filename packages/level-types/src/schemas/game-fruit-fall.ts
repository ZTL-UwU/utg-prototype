import { z } from 'zod';

export const gameFruitFallPropsSchema = z
  .object({
    letters: z.array(z.string().min(1)),
    maxActiveFruits: z.number().int().min(1),
    minSpawnDelayMs: z.number().nonnegative(),
    maxSpawnDelayMs: z.number().nonnegative(),
    fallVelocity: z.number().positive(),
  })
  .refine((v) => v.minSpawnDelayMs <= v.maxSpawnDelayMs, {
    message: 'minSpawnDelayMs must be ≤ maxSpawnDelayMs',
    path: ['maxSpawnDelayMs'],
  });

export type GameFruitFallProps = z.infer<typeof gameFruitFallPropsSchema>;

export function defaultGameFruitFallProps(): GameFruitFallProps {
  return {
    letters: [],
    maxActiveFruits: 3,
    minSpawnDelayMs: 1000,
    maxSpawnDelayMs: 2000,
    fallVelocity: 0.05,
  };
}
