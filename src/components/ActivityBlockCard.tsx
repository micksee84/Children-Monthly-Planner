import React, { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ActivityBlock } from '../types/planner';
import { ActivityIcon } from './ActivityIcon';
import { formatTimeRange } from '../utils/timeGrid';

interface ActivityBlockCardProps {
  block: ActivityBlock;
  isSelected?: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  readOnly?: boolean;
  is7DayView?: boolean;
  showTimes?: boolean;
  startHour: number;
  stepMinutes: number;
  onSelect?: (blockId: string) => void;
  onGrabRowOffset?: (offsetRow: number) => void;
  onStartResize?: (e: React.PointerEvent, block: ActivityBlock) => void;
}

export const ActivityBlockCard: React.FC<ActivityBlockCardProps> = ({
  block,
  isSelected = false,
  isDragging = false,
  isOverlay = false,
  readOnly = false,
  is7DayView = false,
  showTimes = true,
  startHour,
  stepMinutes,
  onSelect,
  onGrabRowOffset,
  onStartResize,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: block.id,
    disabled: readOnly || isOverlay,
    data: {
      block,
      isPaletteItem: false,
    },
  });

  const timeString = formatTimeRange(block.startRow, block.durationRows, startHour, stepMinutes);
  const isOneRow = block.durationRows === 1;

  // Font sizing according to exact prompt specifications:
  // "Block labels Nunito 700 (15px for 1-row blocks, 17px for taller; 13–14px in 7-day view). Times Nunito 600, 10–11px."
  const titleClass = is7DayView
    ? isOneRow
      ? 'text-[13px] font-bold'
      : 'text-[14px] font-bold'
    : isOneRow
    ? 'text-[15px] font-bold'
    : 'text-[17px] font-bold';

  const timeClass = is7DayView ? 'text-[10px] font-semibold' : 'text-[11px] font-semibold';

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly || isOverlay) return;

    // Check which row of this tall block was grabbed
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const rowHeight = rect.height / Math.max(1, block.durationRows);
      const pointerY = e.clientY;
      const offset = Math.floor((pointerY - rect.top) / rowHeight);
      const clampedOffset = Math.max(0, Math.min(block.durationRows - 1, offset));
      onGrabRowOffset?.(clampedOffset);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (readOnly || isOverlay) return;
    e.stopPropagation();
    onSelect?.(block.id);
  };

  // Dragging transform style
  const style: React.CSSProperties = {
    gridRow: isOverlay ? undefined : `${block.startRow + 1} / span ${block.durationRows}`,
    gridColumn: isOverlay ? undefined : 1,
    opacity: isDragging ? 0.2 : 1,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        cardRef.current = node;
      }}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        handlePointerDown(e);
        listeners?.onPointerDown?.(e);
      }}
      onClick={handleClick}
      className={`relative w-full h-full bg-white border-2 border-[#2D2200] rounded-[12px] p-2 flex flex-col justify-between overflow-visible transition-shadow select-none group ${
        isOverlay ? 'shadow-[4px_4px_0px_#2D2200] z-50 cursor-grabbing' : 'cursor-grab'
      } ${
        isSelected && !readOnly
          ? 'shadow-[3.5px_3.5px_0px_#2D2200] ring-2 ring-[#2D2200] ring-offset-1 z-20'
          : 'shadow-[2px_2px_0px_#2D2200] hover:shadow-[3px_3px_0px_#2D2200] z-10'
      }`}
    >
      {/* Content wrapper */}
      <div className="flex items-start gap-1.5 w-full min-w-0">
        {/* Icon */}
        <div className="shrink-0 mt-0.5 text-[#2D2200]">
          <ActivityIcon
            name={block.icon}
            size={is7DayView ? (isOneRow ? 14 : 16) : isOneRow ? 16 : 18}
            strokeWidth={2.2}
          />
        </div>

        {/* Text info */}
        <div className="min-w-0 flex-1 leading-tight">
          <div className={`${titleClass} text-[#2D2200] truncate`} title={block.title}>
            {block.title}
          </div>

          {showTimes && (
            <div className={`${timeClass} text-[#2D2200]/80 tracking-tight mt-0.5 whitespace-nowrap`}>
              {timeString}
            </div>
          )}
        </div>

        {/* Optional tick circle */}
        {block.hasCheckCircle && (
          <div
            className={`shrink-0 rounded-full border-[1.5px] border-[#2D2200] bg-white self-start mt-0.5 ${
              is7DayView ? 'w-3.5 h-3.5' : 'w-4 h-4'
            }`}
            title="Tick circle when completed"
          />
        )}
      </div>

      {/* Resize handle: Only when selected and not readOnly */}
      {/* Hanging BELOW the block's bottom edge (top: calc(100% - 2px)), 48 x 14px, #2D2200 with white grip icon */}
      {isSelected && !readOnly && !isOverlay && onStartResize && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onStartResize(e, block);
          }}
          className="absolute left-1/2 -translate-x-1/2 w-[48px] h-[14px] bg-[#2D2200] rounded-full cursor-ns-resize z-30 flex items-center justify-center shadow-[1px_1px_0px_#2D2200] hover:scale-105 active:scale-95 transition-transform"
          style={{
            top: 'calc(100% - 2px)',
          }}
          title="Drag up or down to resize block duration"
        >
          {/* White grip icon (3 white dots) */}
          <div className="flex items-center justify-center gap-1 w-full h-full pointer-events-none">
            <div className="w-[3px] h-[3px] rounded-full bg-white" />
            <div className="w-[3px] h-[3px] rounded-full bg-white" />
            <div className="w-[3px] h-[3px] rounded-full bg-white" />
          </div>
        </div>
      )}
    </div>
  );
};
