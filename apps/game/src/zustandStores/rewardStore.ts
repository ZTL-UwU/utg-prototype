import { Assets } from 'pixi.js';
import { create } from 'zustand';

import type { TLayer } from '../app/screens/level-map/units';
import { api } from '../lib/api';
import { ensureRemoteReady, type RemoteStatus } from '../lib/remoteResource';

/** Pixi Assets bundle name for remote reward images. */
export const REMOTE_REWARDS_BUNDLE = 'remote-rewards';

/**
 * Alias used with `Texture.from` / `Assets.load` for a reward image.
 * Keyed on the reward image rather than the reward: several rewards can share
 * one image, and it should only be registered and downloaded once.
 */
export function getRewardImageAlias(imageId: number): string {
  return `remote-rewards/${imageId}`;
}

/** Reward types tied to a single level. */
export const LEVEL_REWARD_TYPES = [
  'level_completion_badge',
  'level_three_stars_badge',
  'level_perfect_badge',
] as const;

export type LevelRewardType = (typeof LEVEL_REWARD_TYPES)[number];

/** The only reward type awarded per layer instead of per level. */
export const LAYER_REWARD_TYPE = 'three_consecutive_three_stars_trophy' as const;

export type RewardType = LevelRewardType | typeof LAYER_REWARD_TYPE;

/** Raw `/rewards/list-simple` row, before narrowing the backend's enum strings. */
interface ApiReward {
  id: number;
  type: string;
  layer: string;
  level: number | null;
  image_id: number;
  image_url: string;
}

/** Mirrors RewardSimpleOut from the backend `/rewards/list-simple` endpoint. */
export interface RewardSimple {
  id: number;
  type: RewardType;
  layer: TLayer;
  /** Null for the layer trophy, which is not tied to a single level. */
  level: number | null;
  image_id: number;
  image_url: string;
}

interface RewardStore {
  status: RemoteStatus;
  error?: string;
  rewards: RewardSimple[];
  fetchRewards: () => Promise<void>;
}

const REWARD_TYPES = new Set<string>([...LEVEL_REWARD_TYPES, LAYER_REWARD_TYPE]);

function isRewardType(value: string): value is RewardType {
  return REWARD_TYPES.has(value);
}

function isLayer(value: string): value is TLayer {
  return value === 'education' || value === 'typing' || value === 'game';
}

/** Narrow an API row, or drop it if the backend added a type this build cannot place. */
function mapReward(reward: ApiReward): RewardSimple | null {
  if (!isRewardType(reward.type) || !isLayer(reward.layer)) return null;

  return {
    id: reward.id,
    type: reward.type,
    layer: reward.layer,
    level: reward.level,
    image_id: reward.image_id,
    image_url: reward.image_url,
  };
}

/** Resolve backend reward IDs to RewardSimple entries (order preserved; missing IDs skipped). */
export function resolveRewardsByIds(rewardIds: number[]): RewardSimple[] {
  const byId = new Map(useRewardStore.getState().rewards.map((reward) => [reward.id, reward]));
  return rewardIds.flatMap((id) => {
    const reward = byId.get(id);
    return reward ? [reward] : [];
  });
}

/** The reward of a given type for a level, if one was fetched from the backend. */
export function getLevelReward(levelId: number, type: LevelRewardType): RewardSimple | undefined {
  return useRewardStore
    .getState()
    .rewards.find((reward) => reward.level === levelId && reward.type === type);
}

/** The layer-wide trophy, if one was fetched from the backend. */
export function getLayerTrophy(layer: TLayer): RewardSimple | undefined {
  return useRewardStore
    .getState()
    .rewards.find(
      (reward) =>
        reward.layer === layer && reward.level === null && reward.type === LAYER_REWARD_TYPE,
    );
}

function registerRewardsBundle(rewards: RewardSimple[]): void {
  // Several rewards can point at one reward image, and duplicate aliases would
  // collide in the resolver, so register each image exactly once.
  const srcByImageId = new Map<number, string>();

  for (const reward of rewards) {
    if (!srcByImageId.has(reward.image_id)) {
      srcByImageId.set(reward.image_id, reward.image_url);
    }
  }

  const entries = [...srcByImageId].map(([imageId, src]) => ({
    alias: getRewardImageAlias(imageId),
    src,
  }));

  // Always register so navigation can safely `loadBundle('remote-rewards')`.
  Assets.addBundle(REMOTE_REWARDS_BUNDLE, entries);

  if (entries.length > 0) {
    void Assets.backgroundLoadBundle(REMOTE_REWARDS_BUNDLE);
  }
}

const useRewardStore = create<RewardStore>((set, get) => ({
  status: 'idle',
  error: undefined,
  rewards: [],
  fetchRewards: async () => {
    const { status } = get();
    if (status === 'loading' || status === 'ready') return;

    set({ status: 'loading', error: undefined });
    try {
      const apiRewards = await api<ApiReward[]>('/rewards/list-simple');
      const rewards = apiRewards
        .map(mapReward)
        .filter((reward): reward is RewardSimple => reward != null);
      registerRewardsBundle(rewards);
      set({ status: 'ready', error: undefined, rewards });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load rewards';
      registerRewardsBundle([]);
      set({
        status: 'error',
        error: message,
        rewards: [],
      });
    }
  },
}));

/**
 * Resolves when the rewards list is ready.
 * Returns false if the fetch failed.
 */
export function ensureRewardsReady(): Promise<boolean> {
  return ensureRemoteReady({
    getStatus: () => useRewardStore.getState().status,
    subscribe: (listener) => useRewardStore.subscribe((state) => listener(state.status)),
    start: () => {
      void useRewardStore.getState().fetchRewards();
    },
  });
}

export default useRewardStore;
