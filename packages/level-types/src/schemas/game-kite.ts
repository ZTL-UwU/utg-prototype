import { z } from 'zod';

export const gameKitePropsSchema = z.object({
  wordIds: z.array(z.number().int().positive()),
  maxLives: z.number().int().min(1).max(10),
  wordFontSize: z.number().int().positive(),
  pointsOnLetter: z.number().int().min(1),
  pointsOnWord: z.number().int().min(1),
  gustDurationSeconds: z.number().int().min(5),
});

export type GameKiteProps = z.infer<typeof gameKitePropsSchema>;

export function defaultGameKiteProps(): GameKiteProps {
  return {
    wordIds: [],
    maxLives: 3,
    wordFontSize: 90,
    pointsOnLetter: 10,
    pointsOnWord: 20,
    gustDurationSeconds: 7,
  };
}
