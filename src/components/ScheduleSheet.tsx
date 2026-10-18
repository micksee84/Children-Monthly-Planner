import React, { useState, useRef } from 'react';
import { ActivityBlock, DayKey, PlannerSettings } from '../types/planner';
import { computeTotalRows, DAY_KEYS, DAY_NAMES_5, DAY_NAMES_7 } from '../utils/timeGrid';
import { GridCell } from './GridCell';
import { ActivityBlockCard } from './ActivityBlockCard';
import { CharacterSticker } from './CharacterSticker';

export interface DropPreviewState {
  day: DayKey;
  startRow: number;
  durationRows: number;
  fits: boolean;
}

interface ScheduleSheetProps {
  settings: PlannerSettings;
  blocks: ActivityBlock[];
  selectedBlockId: string | null;
  readOnly?: boolean;
  dropPreview?: DropPreviewState | null;
  draggingBlockId?: string | null;
  onSelectBlock?: (blockId: string | null) => void;
  onUpdateSettings?: (newSettings: Partial<PlannerSettings>) => void;
  onGrabRowOffset?: (offsetRow: number) => void;
  onStartResize?: (e: React.PointerEvent, block: ActivityBlock) => void;
  onCharacterClick?: () => void;
  gridRef?: React.RefObject<HTMLDivElement | null>;
}

export const ScheduleSheet = React.forwardRef<HTMLDivElement, ScheduleSheetProps>(
  (
    {
      settings,
      blocks,
      selectedBlockId,
      readOnly = false,
      dropPreview = null,
      draggingBlockId = null,
      onSelectBlock,
      onUpdateSettings,
      onGrabRowOffset,
      onStartResize,
      onCharacterClick,
      gridRef,
    },
    ref
  ) => {
    // Inline editing states
    const [editingTitle, setEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState(settings.title);

    const [editingWeek, setEditingWeek] = useState(false);
    const [tempWeek, setTempWeek] = useState(settings.weekLabel);

    const [editingName, setEditingName] = useState(false);
    const [tempName, setTempName] = useState(settings.childName);

    const totalRows = computeTotalRows(settings.startHour, settings.endHour, settings.stepMinutes);
    const is7Day = settings.daysMode === '7day';
    const visibleDays: DayKey[] = is7Day ? DAY_KEYS : DAY_KEYS.slice(0, 5);

    // Save title
    const saveTitle = () => {
      onUpdateSettings?.({ title: tempTitle.trim() || 'My week' });
      setEditingTitle(false);
    };

    // Save week
    const saveWeek = () => {
      onUpdateSettings?.({ weekLabel: tempWeek.trim() || 'Week of this week' });
      setEditingWeek(false);
    };

    // Save name
    const saveName = () => {
      onUpdateSettings?.({ childName: tempName.trim() });
      setEditingName(false);
    };

    return (
      <div
        ref={ref}
        id="schedule-page-letter"
        className="w-[1056px] h-[816px] min-w-[1056px] min-h-[816px] max-w-[1056px] max-h-[816px] bg-white text-[#2D2200] pt-[32px] px-[48px] pb-[28px] box-border relative flex flex-col justify-between overflow-hidden shadow-2xl rounded-[16px] select-none"
        onClick={() => {
          if (!readOnly) onSelectBlock?.(null);
        }}
      >
        {/* =====================================================
            1. TOP ROW: LOGO, TITLE, NAME & CHARACTER BADGE
        ===================================================== */}
        <div className="flex items-start justify-between w-full h-[108px] shrink-0">
          {/* Logo top-left: 64px tall, PNG loaded with BASE_URL */}
          <div className="shrink-0 pt-1">
            <img
              src={`${import.meta.env.BASE_URL}sb-logo-vertical.png`}
              alt="Sunshine Brigade"
              className="h-[64px] w-auto object-contain block"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Center Title block: ink sticker title & week pill badge */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-2">
            {/* Title: Super Joyful ink sticker with stacked text-shadows */}
            {editingTitle && !readOnly ? (
              <input
                type="text"
                autoFocus
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                className="text-center font-joyful text-[38px] font-black text-[#2D2200] border-b-2 border-[#2D2200] bg-transparent outline-none max-w-sm"
              />
            ) : (
              <h1
                onClick={(e) => {
                  if (readOnly) return;
                  e.stopPropagation();
                  setTempTitle(settings.title);
                  setEditingTitle(true);
                }}
                className={`ink-sticker-title text-[42px] leading-tight select-none tracking-wide text-center ${
                  !readOnly ? 'cursor-pointer hover:opacity-90' : ''
                }`}
                title={readOnly ? undefined : 'Click to edit title'}
              >
                {settings.title || 'My week'}
              </h1>
            )}

            {/* Week pill badge below title */}
            <div className="mt-1">
              {editingWeek && !readOnly ? (
                <input
                  type="text"
                  autoFocus
                  value={tempWeek}
                  onChange={(e) => setTempWeek(e.target.value)}
                  onBlur={saveWeek}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveWeek();
                    if (e.key === 'Escape') setEditingWeek(false);
                  }}
                  className="bg-white border-[1.5px] border-[#2D2200] rounded-full px-4 py-0.5 text-[13px] font-bold text-center text-[#2D2200] outline-none shadow-[2px_2px_0px_#2D2200]"
                />
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    if (readOnly) return;
                    e.stopPropagation();
                    setTempWeek(settings.weekLabel);
                    setEditingWeek(true);
                  }}
                  className={`bg-white border-[1.5px] border-[#2D2200] rounded-full px-4 py-1 text-[13px] font-bold text-[#2D2200] shadow-[2px_2px_0px_#2D2200] transition-transform ${
                    !readOnly ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
                  }`}
                  title={readOnly ? undefined : 'Click to edit week dates'}
                >
                  {settings.weekLabel || 'Week of this week'}
                </button>
              )}
            </div>
          </div>

          {/* Right zone: Child's name & optional Character Sticker Badge */}
          <div className="shrink-0 flex items-center gap-3.5">
            {/* Child's Name line */}
            <div className="flex flex-col items-end">
              <div
                onClick={(e) => {
                  if (readOnly) return;
                  e.stopPropagation();
                  setTempName(settings.childName);
                  setEditingName(true);
                }}
                className={`flex items-baseline gap-1 text-[#2D2200] ${
                  !readOnly ? 'cursor-pointer group' : ''
                }`}
                title={readOnly ? undefined : 'Click to enter child name'}
              >
                <span className="font-extrabold text-[15px] tracking-tight">Name:</span>

                {editingName && !readOnly ? (
                  <input
                    type="text"
                    autoFocus
                    placeholder="Child's name"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                    className="w-44 border-b-[1.5px] border-[#2D2200] bg-transparent pb-0.5 text-[15px] font-bold text-[#2D2200] outline-none"
                  />
                ) : (
                  <div className="w-44 border-b-[1.5px] border-[#2D2200] pb-0.5 text-[15px] font-bold text-[#2D2200] truncate min-h-[24px]">
                    {settings.childName ? (
                      settings.childName
                    ) : readOnly ? (
                      '' // clean write-on line in print
                    ) : (
                      <span className="text-[#B6B2A6] font-normal italic text-xs group-hover:text-[#2D2200]">
                        Click to add name
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Optional Character Sticker Badge: right of title row, does not cover day names */}
            {settings.selectedCharacter && (
              <CharacterSticker
                characterId={settings.selectedCharacter}
                size={62}
                onClick={readOnly ? undefined : onCharacterClick}
                className={!readOnly ? 'hover:scale-105 transition-transform' : ''}
              />
            )}
          </div>
        </div>

        {/* =====================================================
            2. SCHEDULE FRAME: 3PX INK BORDER, RADIUS 20PX
        ===================================================== */}
        <div className="flex-1 w-full border-[3px] border-[#2D2200] rounded-[20px] bg-white p-3 flex flex-col min-h-0 shadow-[4px_4px_0px_#2D2200] mt-1 mb-2">
          {/* Day Names Header Row: Super Joyful, sentence case, never under 24px */}
          <div
            className="w-full grid gap-2.5 pb-2 border-b-2 border-[#2D2200] shrink-0"
            style={{
              gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))`,
            }}
          >
            {visibleDays.map((day) => {
              const name = is7Day ? DAY_NAMES_7[day] : DAY_NAMES_5[day];
              return (
                <div
                  key={day}
                  className="font-joyful text-[26px] font-normal text-center text-[#2D2200] tracking-wide leading-none select-none"
                >
                  {name}
                </div>
              );
            })}
          </div>

          {/* Grid Area: Day columns sharing the exact same row count and gap */}
          <div
            ref={gridRef}
            id="schedule-grid-container"
            className="w-full flex-1 grid gap-2.5 pt-2 min-h-0 relative"
            style={{
              gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))`,
            }}
          >
            {visibleDays.map((day) => {
              const dayBlocks = blocks.filter((b) => b.day === day);

              return (
                <div
                  key={day}
                  className="w-full h-full relative grid"
                  style={{
                    gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))`,
                    gap: '4px',
                  }}
                >
                  {/* Faint empty guide boxes (1.5px dashed #B6B2A6 border, radius 10px) */}
                  {Array.from({ length: totalRows }).map((_, r) => (
                    <GridCell key={r} day={day} row={r} readOnly={readOnly} />
                  ))}

                  {/* Placed Activity Blocks */}
                  {dayBlocks.map((block) => (
                    <ActivityBlockCard
                      key={block.id}
                      block={block}
                      isSelected={block.id === selectedBlockId}
                      isDragging={block.id === draggingBlockId}
                      readOnly={readOnly}
                      is7DayView={is7Day}
                      showTimes={settings.showTimesOnBlocks}
                      startHour={settings.startHour}
                      stepMinutes={settings.stepMinutes}
                      onSelect={(id) => onSelectBlock?.(id)}
                      onGrabRowOffset={onGrabRowOffset}
                      onStartResize={onStartResize}
                    />
                  ))}

                  {/* Drop landing preview outline */}
                  {/* "While dragging over a row, show a dashed outline (2.5px dashed #2D2200) exactly where the block will land,
                      the same size as the block. If it won't fit, show it dashed in #E52311 with 'No room here'." */}
                  {dropPreview && dropPreview.day === day && (
                    <div
                      style={{
                        gridRow: `${dropPreview.startRow + 1} / span ${dropPreview.durationRows}`,
                        gridColumn: 1,
                        pointerEvents: 'none',
                      }}
                      className={`rounded-[12px] z-30 transition-all flex items-center justify-center p-2 text-center select-none ${
                        dropPreview.fits
                          ? 'border-[2.5px] border-dashed border-[#2D2200] bg-[#2D2200]/5'
                          : 'border-[2.5px] border-dashed border-[#E52311] bg-[#E52311]/10 text-[#E52311] font-bold text-xs'
                      }`}
                    >
                      {!dropPreview.fits && <span>No room here</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* =====================================================
            3. FOOTER: 1.5PX RULE, TAGLINE & CREDITS
        ===================================================== */}
        <div className="w-full pt-1.5 border-t-[1.5px] border-[#2D2200] flex items-center justify-between text-[#2D2200] shrink-0 text-xs">
          <div className="font-extrabold tracking-wide text-[12px]">Learn. Wonder. Shine.</div>
          <div className="font-semibold text-[11px] text-[#2D2200]/90">
            sunshinebrigade.ca · Free for home and classroom use
          </div>
        </div>
      </div>
    );
  }
);

ScheduleSheet.displayName = 'ScheduleSheet';
