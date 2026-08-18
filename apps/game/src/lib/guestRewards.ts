import { findLayerForLevelId, getLayerMaps, type TLayer } from '../app/screens/level-map/units';
import type { LevelResult } from '../zustandStores/resultStore';
import {
  getLayerTrophy,
  getLevelReward,
  type LevelRewardType,
  type RewardSimple,
} from '../zustandStores/rewardStore';

const STORAGE_KEY = 'utg-guest-rewards';
const VERSION = 1;

function isRewardId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

/**
 * Load the ids of rewards this guest owns. Ownership is the only thing stored:
 * placement and artwork are read back from the reward catalog, which is the same
 * data `/user/rewards/list` returns for a signed-in player.
 */
export function loadGuestRewardIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(isRewardId);
    if (typeof parsed === 'object' && parsed !== null && 'reward_ids' in parsed) {
      const ids = (parsed as { reward_ids: unknown }).reward_ids;
      return Array.isArray(ids) ? ids.filter(isRewardId) : [];
    }
    return [];
  } catch (err) {
    console.warn('Failed to load guest rewards', err);
    return [];
  }
}

/** Persist guest reward ownership so the passport survives a reload. */
export function saveGuestRewardIds(rewardIds: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, reward_ids: rewardIds }));
  } catch (err) {
    console.warn('Failed to save guest rewards', err);
  }
}

interface Attempt {
  level: number;
  star: number;
  correct: number;
  mistake: number;
}

/**
 * Client mirror of `_grant_level_result_rewards`: a starred finish earns the completion
 * badge, three stars earn the 3-star badge, a mistake-free typing attempt earns the
 * perfect badge, and three 3-star finishes in a row in the same layer earn that layer's
 * trophy. Already-owned rewards are not granted again.
 *
 * Only catalog rows are granted, and only ones attached to this exact level, or for the
 * trophy to this layer with no level. `/rewards/list-simple` publishes exactly the rows
 * the backend grant query can match, so a badge the catalog does not define is earned by
 * nobody. `results` must already include the attempt being submitted, matching the
 * backend granting inside the transaction that inserts it.
 */
export function grantRewardsForAttempt(
  attempt: Attempt,
  results: LevelResult[],
  ownedRewardIds: number[],
): RewardSimple[] {
  if (attempt.star <= 0) return [];

  const layer = findLayerForLevelId(attempt.level);
  if (layer == null) return [];

  const types: LevelRewardType[] = ['level_completion_badge'];
  if (attempt.star === 3) types.push('level_three_stars_badge');
  if (layer === 'typing' && attempt.mistake === 0 && attempt.correct > 0) {
    types.push('level_perfect_badge');
  }

  const earned: RewardSimple[] = [];
  for (const type of types) {
    const reward = getLevelReward(attempt.level, type);
    if (reward) earned.push(reward);
  }

  if (attempt.star === 3 && hasThreeConsecutiveThreeStars(results, layer)) {
    const trophy = getLayerTrophy(layer);
    if (trophy) earned.push(trophy);
  }

  const owned = new Set(ownedRewardIds);
  return earned.filter((reward) => !owned.has(reward.id));
}

/**
 * Whether the three most recent attempts in this layer are all 3-star. Guest results are
 * append-ordered, so scanning from the end reads the same rows as the backend's
 * `order_by("-created_at", "-id")[:3]`.
 */
function hasThreeConsecutiveThreeStars(results: LevelResult[], layer: TLayer): boolean {
  const layerLevelIds = new Set(
    getLayerMaps(layer).flatMap((unit) => unit.levels.map((level) => level.id)),
  );

  const recent: number[] = [];
  for (let i = results.length - 1; i >= 0 && recent.length < 3; i--) {
    if (layerLevelIds.has(results[i].level_id)) recent.push(results[i].star);
  }

  return recent.length === 3 && recent.every((star) => star === 3);
}
