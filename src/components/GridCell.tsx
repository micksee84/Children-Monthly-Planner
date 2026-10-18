import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { DayKey } from '../types/planner';

interface GridCellProps {
  day: DayKey;
  row: number;
  readOnly?: boolean;
}

export const GridCell: React.FC<GridCellProps> = ({ day, row, readOnly = false }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell|${day}|${row}`,
    disabled: readOnly,
    data: {
      day,
      row,
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        gridRow: `${row + 1} / span 1`,
        gridColumn: 1,
      }}
      className={`relative w-full h-full border-[1.5px] border-dashed border-[#B6B2A6] rounded-[10px] bg-white transition-colors duration-150 ${
        isOver && !readOnly ? 'bg-[#2D2200]/5' : ''
      }`}
    />
  );
};
