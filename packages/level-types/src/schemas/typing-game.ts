import { z } from 'zod';

export const typingDesertPropsSchema = z.object({
  rowSize: z.number().int().min(1).max(12),
});

export type TypingDesertProps = z.infer<typeof typingDesertPropsSchema>;

export function defaultTypingDesertProps(): TypingDesertProps {
  return { rowSize: 6 };
}

export const typingSandstormPropsSchema = z
  .object({
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
    letterGoal: 18,
    maxActiveLetters: 3,
    minSpawnDelayMs: 1000,
    maxSpawnDelayMs: 1800,
    fallSpeedMin: 60,
    fallSpeedMax: 80,
  };
}

export const typingInstrumentPropsSchema = z.object({
  noteCount: z.number().int().positive(),
});

export type TypingInstrumentProps = z.infer<typeof typingInstrumentPropsSchema>;

export function defaultTypingInstrumentProps(): TypingInstrumentProps {
  return { noteCount: 20 };
}

export const typingWordsPropsSchema = z.object({
  wordIds: z.array(z.number().int().positive()),
  roundCount: z.number().int().positive(),
});

export type TypingWordsProps = z.infer<typeof typingWordsPropsSchema>;

export function defaultTypingWordsProps(): TypingWordsProps {
  return { wordIds: [], roundCount: 5 };
}

export const typingStoryPropsSchema = z.object({
  storyId: z.number().int().positive().nullable(),
  roundCount: z.number().int().positive(),
  sentenceDurationMs: z.number().int().positive(),
});

export type TypingStoryProps = z.infer<typeof typingStoryPropsSchema>;

export function defaultTypingStoryProps(): TypingStoryProps {
  return { storyId: null, roundCount: 3, sentenceDurationMs: 60_000 };
}

export const typingGoatsPropsSchema = z.object({
  sentenceIds: z.array(z.number().int().positive()),
  roundCount: z.number().int().positive(),
  sentenceDurationMs: z.number().int().positive(),
});

export type TypingGoatsProps = z.infer<typeof typingGoatsPropsSchema>;

export function defaultTypingGoatsProps(): TypingGoatsProps {
  return { sentenceIds: [], roundCount: 3, sentenceDurationMs: 60_000 };
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

export const gameNaanStackPropsSchema = z.object({
  letters: z.array(z.string().min(1)),
  plateCapacity: z.number().int().positive(),
  maxLives: z.number().int().min(1).max(10),
  spawnDelayMs: z.number().nonnegative(),
  moveSpeed: z.number().positive(),
});

export type GameNaanStackProps = z.infer<typeof gameNaanStackPropsSchema>;

export function defaultGameNaanStackProps(): GameNaanStackProps {
  return {
    letters: [],
    plateCapacity: 6,
    maxLives: 5,
    spawnDelayMs: 3000,
    moveSpeed: 100,
  };
}
