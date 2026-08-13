import { queryOptions } from '@tanstack/react-query';
import { FetchError } from 'ofetch';

import { api } from '~/lib/api';
import type { Layer } from '~/lib/game';

export const LEVEL_REWARD_TYPES = [
  'level_completion_badge',
  'level_three_stars_badge',
  'level_perfect_badge',
] as const;

export type LevelRewardType = (typeof LEVEL_REWARD_TYPES)[number];

export const LAYER_REWARD_TYPE = 'three_consecutive_three_stars_trophy' as const;

export type RewardType = LevelRewardType | typeof LAYER_REWARD_TYPE;

export const REWARD_TYPE_LABELS: Record<RewardType, string> = {
  level_completion_badge: 'Completion',
  level_three_stars_badge: 'Three stars',
  level_perfect_badge: 'Perfect',
  three_consecutive_three_stars_trophy: 'Three consecutive three stars',
};

export interface RewardMedia {
  name: string;
  url: string;
  filename: string;
}

export interface RewardImage {
  id: number;
  name: string;
  image: RewardMedia;
  reward_count: number;
  is_published: boolean;
}

export interface Reward {
  id: number;
  type: string;
  layer: Layer;
  level: number | null;
  image_id: number;
  image: RewardMedia;
  is_published: boolean;
}

export interface RewardWrite {
  type: string;
  layer: Layer;
  level: number | null;
  image_id: number;
  is_published: boolean;
}

export interface RewardBulkResult {
  created: number;
  updated: number;
  skipped: number;
  rewards: Reward[];
}

export interface RewardUnitLevel {
  id: number;
  sort_order: number;
  title: string | null;
}

export interface RewardUnit {
  id: number;
  sort_order: number;
  layer: Layer;
  title: string;
  levels: RewardUnitLevel[];
}

export const rewardsQueryOptions = queryOptions({
  queryKey: ['rewards', 'list'],
  queryFn: () => api<Reward[]>('/rewards/list'),
  staleTime: Infinity,
});

export const rewardImagesQueryOptions = queryOptions({
  queryKey: ['reward-images', 'list'],
  queryFn: () => api<RewardImage[]>('/reward-images/list'),
  staleTime: Infinity,
});

export const rewardUnitsQueryOptions = queryOptions({
  queryKey: ['units', 'list-all'],
  queryFn: () => api<RewardUnit[]>('/units/list-all'),
  staleTime: Infinity,
});

export function getErrorDescription(error: unknown): string | undefined {
  if (error instanceof FetchError) {
    return error.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : undefined;
}
