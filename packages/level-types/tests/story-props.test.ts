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

describe('typing test story props', () => {
  it('carries a legacy storyId into storyIds', () => {
    const props = parseLevelProps('typing-test', { storyId: 42 });
    expect(props.storyIds).toEqual([42]);
    expect(props).not.toHaveProperty('storyId');
  });

  it('turns a legacy null storyId into no stories', () => {
    expect(parseLevelProps('typing-test', { storyId: null }).storyIds).toEqual([]);
  });

  it('keeps storyIds, which win over a legacy storyId', () => {
    expect(parseLevelProps('typing-test', { storyIds: [1, 2] }).storyIds).toEqual([1, 2]);
    expect(parseLevelProps('typing-test', { storyId: 42, storyIds: [1, 2] }).storyIds).toEqual([
      1, 2,
    ]);
  });
});
