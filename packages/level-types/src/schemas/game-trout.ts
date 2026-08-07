import { z } from 'zod';

export const gameTroutPropsSchema = z.object({
  wordIds: z.array(z.number().int().positive()),
  maxActiveTrout: z.number().int().min(1).max(8),
  wordDurationMs: z.number().int().min(1000),
  /** Successful catches required to finish the level. */
  totalCatches: z.number().int().min(1),
  wordFontSize: z.number().int().positive(),
  swimSpeedPxPerSecond: z.number().positive(),
});

export type GameTroutProps = z.infer<typeof gameTroutPropsSchema>;

export function defaultGameTroutProps(): GameTroutProps {
  return {
    wordIds: [],
    maxActiveTrout: 5,
    wordDurationMs: 15000,
    totalCatches: 15,
    wordFontSize: 45,
    swimSpeedPxPerSecond: 20,
  };
}
