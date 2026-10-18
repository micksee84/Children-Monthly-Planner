import { ActivityBlock, DayKey } from '../types/planner';

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_NAMES_5: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export const DAY_NAMES_7: Record<DayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

/**
 * Format total minutes from midnight into 12-hour string (e.g. "9am", "9:30am", "12pm", "1:30pm")
 * Lowercase am/pm, no leading zero.
 */
export function formatMinutes(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const period = hours24 >= 12 ? 'pm' : 'am';
  let hour12 = hours24 % 12;
  if (hour12 === 0) hour12 = 12;

  if (mins === 0) {
    return `${hour12}${period}`;
  }
  const minsPadded = mins < 10 ? `0${mins}` : `${mins}`;
  return `${hour12}:${minsPadded}${period}`;
}

/**
 * Format time range for a block (e.g. "9:30am – 10am")
 */
export function formatTimeRange(
  startRow: number,
  durationRows: number,
  startHour: number,
  stepMinutes: number
): string {
  const startMins = startHour * 60 + startRow * stepMinutes;
  const endMins = startMins + durationRows * stepMinutes;
  return `${formatMinutes(startMins)} – ${formatMinutes(endMins)}`;
}

/**
 * Calculate total rows
 */
export function computeTotalRows(startHour: number, endHour: number, stepMinutes: number): number {
  const totalMinutes = (endHour - startHour) * 60;
  return Math.max(1, Math.round(totalMinutes / stepMinutes));
}

/**
 * Estimate row height inside the 816px Letter page.
 * Available grid content height is approx 517px.
 * Row gap is 4px.
 */
export function estimateRowHeight(totalRows: number): number {
  const availableHeight = 517 - (totalRows - 1) * 4;
  return availableHeight / totalRows;
}

/**
 * Validates if the chosen hours and step maintain at least 24px per row.
 */
export function validateRowHeight(startHour: number, endHour: number, stepMinutes: number): {
  valid: boolean;
  rowHeight: number;
  totalRows: number;
  message?: string;
} {
  const totalRows = computeTotalRows(startHour, endHour, stepMinutes);
  const rowHeight = estimateRowHeight(totalRows);

  if (rowHeight < 24) {
    return {
      valid: false,
      rowHeight,
      totalRows,
      message: `Rows would be only ${Math.round(rowHeight)}px tall (minimum 24px). Please choose a shorter day range (e.g. 8am–5pm) or a 60-minute step so your schedule fits on one page.`,
    };
  }

  return { valid: true, rowHeight, totalRows };
}

/**
 * Check if a contiguous span of rows [startRow, startRow + durationRows - 1] is free in a day.
 */
export function isRangeFree(
  day: DayKey,
  startRow: number,
  durationRows: number,
  existingBlocks: ActivityBlock[],
  totalRows: number,
  excludeBlockId?: string | null
): boolean {
  if (startRow < 0 || startRow + durationRows > totalRows) {
    return false;
  }

  const occupied = new Set<number>();
  for (const block of existingBlocks) {
    if (block.day === day && block.id !== excludeBlockId) {
      for (let r = block.startRow; r < block.startRow + block.durationRows; r++) {
        occupied.add(r);
      }
    }
  }

  for (let r = startRow; r < startRow + durationRows; r++) {
    if (occupied.has(r)) {
      return false;
    }
  }

  return true;
}

/**
 * Outward search for nearest free start row:
 * Searches outward from targetStartRow (same distance below first, then above).
 */
export function findNearestFreeSlot(
  day: DayKey,
  targetStartRow: number,
  durationRows: number,
  existingBlocks: ActivityBlock[],
  totalRows: number,
  excludeBlockId?: string | null
): number | null {
  // First check targetStartRow directly
  if (isRangeFree(day, targetStartRow, durationRows, existingBlocks, totalRows, excludeBlockId)) {
    return targetStartRow;
  }

  // Search outward
  const maxDistance = totalRows;
  for (let d = 1; d <= maxDistance; d++) {
    // 1. Same distance below first
    const candBelow = targetStartRow + d;
    if (isRangeFree(day, candBelow, durationRows, existingBlocks, totalRows, excludeBlockId)) {
      return candBelow;
    }

    // 2. Then distance above
    const candAbove = targetStartRow - d;
    if (isRangeFree(day, candAbove, durationRows, existingBlocks, totalRows, excludeBlockId)) {
      return candAbove;
    }
  }

  return null;
}

/**
 * Get current default week label e.g. "Week of Oct 19 – 23"
 */
export function getDefaultWeekLabel(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monMonth = months[monday.getMonth()];
  const friMonth = months[friday.getMonth()];

  if (monMonth === friMonth) {
    return `Week of ${monMonth} ${monday.getDate()} – ${friday.getDate()}`;
  }
  return `Week of ${monMonth} ${monday.getDate()} – ${friMonth} ${friday.getDate()}`;
}
