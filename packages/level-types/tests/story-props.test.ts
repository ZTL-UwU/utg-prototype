import { describe, expect, it } from 'vite-plus/test';

import { parseLevelProps } from '../src/helpers';

const STORY_LEVEL_TYPES = ['typing-story', 'typing-spring', 'typing-goat'] as const;

describe('story level props', () => {
  it('plays the full story: legacy roundCount is stripped and storyId is kept', () => {
    for (const levelType of STORY_LEVEL_TYPES) {
      expect(
        parseLevelProps(levelType, {
          storyId: 42,
          roundCount: 3,
          sentenceDurationMs: 45_000,
        }),
      ).toEqual({ storyId: 42, sentenceDurationMs: 45_000 });
    }
  });
});
