import React from 'react';

interface GridCellProps {
  row: number;
}

/**
 * Faint empty guide box for one row of a day column.
 * Drops are handled by the whole day column (see DayColumn in ScheduleSheet),
 * which works out the row from the pointer, so gaps between rows never lose a drop.
 */
export const GridCell: React.FC<GridCellProps> = ({ row }) => {
  return (
    <div
      style={{
        gridRow: `${row + 1} / span 1`,
        gridColumn: 1,
      }}
      className="relative w-full h-full border-[1.5px] border-dashed border-[#B6B2A6] rounded-[10px] bg-white pointer-events-none"
    />
  );
};
