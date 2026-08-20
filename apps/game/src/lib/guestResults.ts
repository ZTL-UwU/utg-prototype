interface StoredLevelResult {
  id: number;
  level_id: number;
  star: number;
  score: number;
  correct: number;
  mistake: number;
  /** Absent on histories persisted before the streak calendar (storage version 1). */
  created_at?: string;
}

const STORAGE_KEY = 'utg-guest-level-results';
// 2: rows carry `created_at`. Version 1 rows stay valid; they just have no date.
const VERSION = 2;

function isLevelResult(value: unknown): value is StoredLevelResult {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'number' &&
    typeof row.level_id === 'number' &&
    typeof row.star === 'number' &&
    typeof row.score === 'number' &&
    typeof row.correct === 'number' &&
    typeof row.mistake === 'number' &&
    (row.created_at === undefined || typeof row.created_at === 'string')
  );
}

/** Load guest level attempts from localStorage. Invalid or missing data is an empty history. */
export function loadGuestResults(): StoredLevelResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter(isLevelResult);
    if (typeof parsed === 'object' && parsed !== null && 'results' in parsed) {
      const results = (parsed as { results: unknown }).results;
      return Array.isArray(results) ? results.filter(isLevelResult) : [];
    }
    return [];
  } catch (err) {
    console.warn('Failed to load guest level results', err);
    return [];
  }
}

/** Persist guest level attempts so progression survives a reload. */
export function saveGuestResults(results: StoredLevelResult[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, results }));
  } catch (err) {
    console.warn('Failed to save guest level results', err);
  }
}
