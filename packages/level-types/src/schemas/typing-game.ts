import { z } from 'zod';

export const typingDesertPropsSchema = z.object({
  letters: z.array(z.string().min(1)),
  rowSize: z.number().int().min(1).max(12),
});

export type TypingDesertProps = z.infer<typeof typingDesertPropsSchema>;

export function defaultTypingDesertProps(): TypingDesertProps {
  return { letters: [], rowSize: 6 };
}

export const typingSandstormPropsSchema = z
  .object({
    letters: z.array(z.string().min(1)),
    letterGoal: z.number().int().positive(),
    maxActiveLetters: z.number().int().min(1),
    minSpawnDelayMs: z.number().nonnegative(),
    maxSpawnDelayMs: z.number().nonnegative(),
    fallSpeedMin: z.number().positive(),
    fallSpeedMax: z.number().positive(),
  })
  .refine((value) => value.minSpawnDelayMs <= value.maxSpawnDelayMs, {
    message: 'minSpawnDelayMs must be ≤ maxSpawnDelayMs',
    path: ['maxSpawnDelayMs'],
  })
  .refine((value) => value.fallSpeedMin <= value.fallSpeedMax, {
    message: 'fallSpeedMin must be ≤ fallSpeedMax',
    path: ['fallSpeedMax'],
  });

export type TypingSandstormProps = z.infer<typeof typingSandstormPropsSchema>;

export function defaultTypingSandstormProps(): TypingSandstormProps {
  return {
    letters: [],
    letterGoal: 18,
    maxActiveLetters: 3,
    minSpawnDelayMs: 1000,
    maxSpawnDelayMs: 1800,
    fallSpeedMin: 60,
    fallSpeedMax: 80,
  };
}

export const typingInstrumentPropsSchema = z.object({
  letters: z.array(z.string().min(1)),
  noteCount: z.number().int().positive(),
});

export type TypingInstrumentProps = z.infer<typeof typingInstrumentPropsSchema>;

export function defaultTypingInstrumentProps(): TypingInstrumentProps {
  return { letters: [], noteCount: 20 };
}

export const typingWordsPropsSchema = z.object({
  wordIds: z.array(z.number().int().positive()),
  roundCount: z.number().int().positive(),
});

export type TypingWordsProps = z.infer<typeof typingWordsPropsSchema>;

export function defaultTypingWordsProps(): TypingWordsProps {
  return { wordIds: [], roundCount: 5 };
}

export const gameTandoorRushPropsSchema = z.object({
  letters: z.array(z.string().min(1)),
  targetCount: z.number().int().positive(),
  roundDurationMs: z.number().int().positive(),
});

export type GameTandoorRushProps = z.infer<typeof gameTandoorRushPropsSchema>;

export function defaultGameTandoorRushProps(): GameTandoorRushProps {
  return { letters: [], targetCount: 8, roundDurationMs: 30_000 };
}
