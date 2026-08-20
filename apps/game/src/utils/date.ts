/**
 * Calendar-day helpers for the streak surfaces.
 *
 * Everything here works in the *viewer's own timezone*, deliberately. The backend stores and
 * serialises `created_at` as UTC (`TIME_ZONE = "UTC"`, `USE_TZ = True`), but a streak is about
 * the player's day: a level finished at 23:00 in UTC+5:45 belongs to that evening, not to the
 * previous UTC day. Bucketing on UTC would silently shift half the world's streaks by a day.
 */

/** Days per week, and the length of a calendar grid row. */
export const DAYS_IN_WEEK = 7;

/**
 * Weekday the calendar grid starts on, as a `Date.getDay()` index (0 = Sunday).
 * Flip to 1 for a Monday-first calendar; the weekday labels follow automatically.
 */
export const WEEK_STARTS_ON = 0;

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * `YYYY-MM-DD` for the local calendar day a `Date` falls on.
 *
 * Not `toISOString().slice(0, 10)` — that converts to UTC first, which is exactly the shift this
 * module exists to avoid.
 */
export function toLocalDayKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Weekday initials in grid order, honouring {@link WEEK_STARTS_ON}. */
export function getWeekdayInitials(): string[] {
  return Array.from(
    { length: DAYS_IN_WEEK },
    (_, index) => WEEKDAY_INITIALS[(WEEK_STARTS_ON + index) % DAYS_IN_WEEK],
  );
}

/** e.g. `AUGUST 2026`, to title a month grid. */
export function formatMonthTitle(month: Date): string {
  return `${MONTH_NAMES[month.getMonth()].toUpperCase()} ${month.getFullYear()}`;
}

/** Number of days in the month `date` falls in. Day 0 of the next month is the last of this one. */
export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * How many blank cells precede the 1st in the grid, honouring {@link WEEK_STARTS_ON}.
 * The `+ DAYS_IN_WEEK` keeps the modulo non-negative for a non-Sunday week start.
 */
export function getLeadingBlankCount(month: Date): number {
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  return (firstWeekday - WEEK_STARTS_ON + DAYS_IN_WEEK) % DAYS_IN_WEEK;
}
