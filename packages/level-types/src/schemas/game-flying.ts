import { z } from 'zod';

export const gameFlyingPropsSchema = z.object({
  wordIds: z.array(z.number().int().positive()),
  jumpHeight: z.number().positive(),
  maxLives: z.number().int().min(1).max(10),
  invulnerableMs: z.number().nonnegative(),
  columnVelocity: z.number().positive(),
  maxActiveColumns: z.number().int().min(1),
  wordFontSize: z.number().int().positive(),
  // 0 (or ≥ wordIds.length) → every word once; otherwise this many words picked at random
  totalWords: z.number().int().nonnegative(),
});

export type GameFlyingProps = z.infer<typeof gameFlyingPropsSchema>;

export function defaultGameFlyingProps(): GameFlyingProps {
  return {
    wordIds: [],
    jumpHeight: 100,
    maxLives: 5,
    invulnerableMs: 1000,
    columnVelocity: 0.1,
    maxActiveColumns: 3,
    wordFontSize: 90,
    totalWords: 0,
  };
}
