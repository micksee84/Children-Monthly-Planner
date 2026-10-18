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
 * Default week label, e.g. "Week of Oct 19 – 23" (or "Oct 19 – 25" in 7-day mode).
 * On Saturday and Sunday this is the coming week, since that is the week
 * people plan at the weekend.
 */
export function getDefaultWeekLabel(daysMode: '5day' | '7day' = '5day', now: Date = new Date()): string {
  const dayOfWeek = now.getDay(); // 0 is Sunday
  let mondayOffset: number;
  if (dayOfWeek === 6) mondayOffset = 2; // Saturday -> next Monday
  else if (dayOfWeek === 0) mondayOffset = 1; // Sunday -> next Monday
  else mondayOffset = 1 - dayOfWeek; // Weekday -> this Monday

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const lastDay = new Date(monday);
  lastDay.setDate(monday.getDate() + (daysMode === '7day' ? 6 : 4));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monMonth = months[monday.getMonth()];
  const lastMonth = months[lastDay.getMonth()];

  if (monMonth === lastMonth) {
    return `Week of ${monMonth} ${monday.getDate()} – ${lastDay.getDate()}`;
  }
  return `Week of ${monMonth} ${monday.getDate()} – ${lastMonth} ${lastDay.getDate()}`;
}

/**
 * Re-place blocks after the day hours or row step change, so each block keeps
 * its real clock time and length instead of its old row number.
 * Blocks that would overlap slide to the nearest free rows; blocks that no
 * longer fit anywhere in their day are returned in `dropped`.
 */
export function remapBlocksToGrid(
  blocks: ActivityBlock[],
  from: { startHour: number; stepMinutes: number },
  to: { startHour: number; endHour: number; stepMinutes: number }
): { blocks: ActivityBlock[]; dropped: ActivityBlock[] } {
  const totalRows = computeTotalRows(to.startHour, to.endHour, to.stepMinutes);
  const placed: ActivityBlock[] = [];
  const dropped: ActivityBlock[] = [];

  const withMinutes = blocks
    .map((b) => ({
      block: b,
      startMin: from.startHour * 60 + b.startRow * from.stepMinutes,
      lengthMin: b.durationRows * from.stepMinutes,
    }))
    .sort((a, b) => a.startMin - b.startMin);

  for (const { block, startMin, lengthMin } of withMinutes) {
    const targetRow = Math.floor((startMin - to.startHour * 60) / to.stepMinutes);
    let durationRows = Math.max(1, Math.round(lengthMin / to.stepMinutes));
    durationRows = Math.min(durationRows, totalRows);

    // Entirely outside the new day: cannot be kept.
    if (targetRow + durationRows <= 0 || targetRow >= totalRows) {
      dropped.push(block);
      continue;
    }

    const clampedTarget = Math.max(0, Math.min(totalRows - durationRows, targetRow));
    let row = findNearestFreeSlot(block.day, clampedTarget, durationRows, placed, totalRows, null);
    if (row === null && durationRows > 1) {
      durationRows = 1;
      row = findNearestFreeSlot(block.day, Math.max(0, Math.min(totalRows - 1, targetRow)), 1, placed, totalRows, null);
    }
    if (row === null) {
      dropped.push(block);
      continue;
    }
    placed.push({ ...block, startRow: row, durationRows });
  }

  return { blocks: placed, dropped };
}
