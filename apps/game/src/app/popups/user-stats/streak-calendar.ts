import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import {
  DAYS_IN_WEEK,
  getDaysInMonth,
  getLeadingBlankCount,
  getWeekdayInitials,
  toLocalDayKey,
} from '../../../utils/date';

/** Always six, so the panel never changes height between a 28-day and a 31-day month. */
const WEEK_ROWS = 6;

const CELL_WIDTH = 108;
const CELL_HEIGHT = 50;
const CELL_GAP = 8;
const CELL_RADIUS = 12;

const FIRE_SIZE = 32;
const FIRE_ASSET = 'stats-popup/fire.svg';

const PANEL_PADDING = 18;
const PANEL_RADIUS = 15;

const GRID_WIDTH = DAYS_IN_WEEK * CELL_WIDTH + (DAYS_IN_WEEK - 1) * CELL_GAP;
const GRID_HEIGHT = WEEK_ROWS * CELL_HEIGHT + (WEEK_ROWS - 1) * CELL_GAP;
const WEEKDAY_ROW_HEIGHT = 30;

/**
 * Tuned to fill the popup's streaks slot, which is a fixed ~847x416 box: the popup content is a
 * 1481x833 design that is never scaled, the section takes `flex: 2` of the body, and the
 * "Streaks" heading above it costs one row.
 */
const PANEL_WIDTH = GRID_WIDTH + PANEL_PADDING * 2;
const PANEL_HEIGHT = WEEKDAY_ROW_HEIGHT + CELL_GAP + GRID_HEIGHT + PANEL_PADDING * 2;

const PANEL_FILL = { color: 0xffffff, alpha: 0.35 } as const;
const PANEL_STROKE = { color: 0xcccccc, width: 2 } as const;

const CELL_FILL = { color: 0xffffff, alpha: 0.55 } as const;
const ACTIVE_CELL_FILL = { color: 0xffe2b8, alpha: 1 } as const;
const TODAY_STROKE = { color: 0xd89456, width: 3 } as const;

const WEEKDAY_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 22,
  fill: 0x808080,
} as const;

const DAY_NUMBER_STYLE = {
  fontFamily: 'Concert One',
  fontSize: 22,
  fill: 0x808080,
} as const;

const ACTIVE_DAY_NUMBER_COLOR = 0x8a4b12;

/**
 * One day of the month.
 *
 * Nothing inside is layout-managed: the cell itself carries the layout box, and its contents are
 * positioned by hand. That is the same arrangement `popups/passport/page.ts` uses for its slots,
 * and it is what keeps the fire free to be scaled or animated later without fighting Yoga.
 */
class DayCell extends Container {
  private readonly surface: Graphics;
  private readonly number: Text;
  private readonly fire: Sprite;
  private isToday = false;

  constructor(dayOfMonth: number) {
    super({ layout: { width: CELL_WIDTH, height: CELL_HEIGHT } });

    this.surface = new Graphics();

    this.number = new Text({
      text: String(dayOfMonth),
      style: DAY_NUMBER_STYLE,
      position: { x: 12, y: 8 },
    });

    const texture = Texture.from(FIRE_ASSET);
    this.fire = new Sprite({
      texture,
      anchor: 0.5,
      position: { x: CELL_WIDTH * 0.63, y: CELL_HEIGHT * 0.56 },
      visible: false,
    });
    // Manual "contain": the sprite is not layout-managed, so nothing else will size it.
    this.fire.scale.set(FIRE_SIZE / Math.max(texture.width, texture.height));

    this.addChild(this.surface, this.number, this.fire);
    this.setActive(false);
  }

  /** Marks this cell as the current day, which only changes its outline. */
  public markToday() {
    this.isToday = true;
    this.setActive(this.fire.visible);
  }

  public setActive(active: boolean) {
    this.fire.visible = active;
    this.number.style.fill = active ? ACTIVE_DAY_NUMBER_COLOR : DAY_NUMBER_STYLE.fill;

    this.surface.clear();
    this.surface
      .roundRect(0, 0, CELL_WIDTH, CELL_HEIGHT, CELL_RADIUS)
      .fill(active ? ACTIVE_CELL_FILL : CELL_FILL);
    if (this.isToday) this.surface.stroke(TODAY_STROKE);
  }
}

/**
 * A month grid where every day the player finished a level carries a flame.
 *
 * The month is fixed at construction. That is safe because `navigation.showPopup` constructs a
 * fresh popup on every open, so the grid is never left showing a stale month.
 */
export class StreakCalendar extends Container {
  private readonly cellsByDay = new Map<string, DayCell>();

  constructor(month: Date = new Date()) {
    super({
      layout: {
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: PANEL_PADDING,
        paddingBottom: PANEL_PADDING,
        gap: CELL_GAP,
      },
    });

    const panel = new Graphics()
      .roundRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS)
      .fill(PANEL_FILL)
      .stroke(PANEL_STROKE);

    this.addChild(panel, buildWeekdayHeader(), this.buildGrid(month));
  }

  /** One row per calendar week, blank-padded at both ends so the 1st lands on its weekday. */
  private buildGrid(month: Date): Container {
    const grid = new Container({
      layout: { flexDirection: 'column', gap: CELL_GAP },
    });

    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = getDaysInMonth(month);
    const leadingBlanks = getLeadingBlankCount(month);
    const todayKey = toLocalDayKey(new Date());

    for (let week = 0; week < WEEK_ROWS; week++) {
      const row = new Container({
        layout: { flexDirection: 'row', gap: CELL_GAP },
      });

      for (let weekday = 0; weekday < DAYS_IN_WEEK; weekday++) {
        const dayOfMonth = week * DAYS_IN_WEEK + weekday - leadingBlanks + 1;

        // Padding cells hold the grid's shape without pretending to be days.
        if (dayOfMonth < 1 || dayOfMonth > daysInMonth) {
          row.addChild(new Container({ layout: { width: CELL_WIDTH, height: CELL_HEIGHT } }));
          continue;
        }

        const dayKey = toLocalDayKey(new Date(year, monthIndex, dayOfMonth));
        const cell = new DayCell(dayOfMonth);
        if (dayKey === todayKey) cell.markToday();

        this.cellsByDay.set(dayKey, cell);
        row.addChild(cell);
      }

      grid.addChild(row);
    }

    return grid;
  }

  /**
   * Re-mark the grid from a set of `YYYY-MM-DD` keys (see `selectStreakDays`). Only repaints
   * cells, so it is cheap enough to call on every result-store emission. Keys outside the
   * displayed month are ignored.
   */
  public setActiveDays(days: Set<string>) {
    for (const [dayKey, cell] of this.cellsByDay) {
      cell.setActive(days.has(dayKey));
    }
  }
}

function buildWeekdayHeader(): Container {
  return new Container({
    layout: { flexDirection: 'row', gap: CELL_GAP },
    children: getWeekdayInitials().map(
      (initial) =>
        new Text({
          text: initial,
          style: WEEKDAY_STYLE,
          anchor: { x: 0.5, y: 0 },
          layout: { width: CELL_WIDTH, height: WEEKDAY_ROW_HEIGHT, isLeaf: true },
        }),
    ),
  });
}
