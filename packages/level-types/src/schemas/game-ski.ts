import { z } from 'zod';

export const gameSkiPropsSchema = z.object({
  sentenceIds: z.array(z.number().int().positive()),
  /** Barriers / sentences in the race. Spec default is 5. */
  roundCount: z.number().int().positive(),
  maxLives: z.number().int().min(1).max(10),
  /** How long the skier has to finish a sentence before the barrier arrives. */
  approachDurationMs: z.number().int().positive(),
  sentenceFontSize: z.number().int().positive(),
  /** Duration of each Ready / Set / Go beat. */
  countdownStepMs: z.number().int().positive(),
});

export type GameSkiProps = z.infer<typeof gameSkiPropsSchema>;

export function defaultGameSkiProps(): GameSkiProps {
  return {
    sentenceIds: [],
    roundCount: 5,
    maxLives: 5,
    approachDurationMs: 25_000,
    sentenceFontSize: 56,
    countdownStepMs: 900,
  };
}
