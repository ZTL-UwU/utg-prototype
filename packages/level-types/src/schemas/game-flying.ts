import { z } from 'zod';

export const gameFlyingPropsSchema = z.object({
  wordIds: z.array(z.number().int().positive()),
  jumpHeight: z.number().positive(),
  maxLives: z.number().int().min(1).max(10),
  invulnerableSeconds: z.number().nonnegative(),
  columnSpeedPxPerSecond: z.number().positive(),
  gravityPxPerSecondSquared: z.number().positive(),
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
    invulnerableSeconds: 1,
    columnSpeedPxPerSecond: 100,
    gravityPxPerSecondSquared: 495,
    maxActiveColumns: 3,
    wordFontSize: 90,
    totalWords: 0,
  };
}
