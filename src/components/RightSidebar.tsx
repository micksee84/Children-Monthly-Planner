import React, { useState } from 'react';
import { ActivityBlock, DayKey, PlannerSettings, PlanRecord } from '../types/planner';
import {
  computeTotalRows,
  DAY_KEYS,
  DAY_NAMES_5,
  DAY_NAMES_7,
  formatMinutes,
  formatTimeRange,
  isRangeFree,
  validateRowHeight,
} from '../utils/timeGrid';
import { AVAILABLE_ICONS, CHARACTERS } from '../data/defaultData';
import { ActivityIcon } from './ActivityIcon';
import {
  Trash2,
  Copy,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Plus,
  Files,
  Sliders,
  X,
} from 'lucide-react';

interface RightSidebarProps {
  selectedBlock: ActivityBlock | null;
  settings: PlannerSettings;
  blocks: ActivityBlock[];
  plans: PlanRecord[];
  activePlanId: string;
  onUpdateBlock: (updated: ActivityBlock) => void;
  onDeleteBlock: (blockId: string) => void;
  onCopyBlockToDays: (block: ActivityBlock, targetDays: DayKey[]) => void;
  onDeselectBlock: () => void;
  onUpdateSettings: (newSettings: Partial<PlannerSettings>) => void;
  onSwitchPlan: (planId: string) => void;
  onCreateNewPlan: () => void;
  onDuplicatePlan: () => void;
  onDeletePlan: (planId: string) => void;
  onRenamePlan: (newName: string) => void;
  onClearAllBlocks: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedBlock,
  settings,
  blocks,
  plans,
  activePlanId,
  onUpdateBlock,
  onDeleteBlock,
  onCopyBlockToDays,
  onDeselectBlock,
  onUpdateSettings,
  onSwitchPlan,
  onCreateNewPlan,
  onDuplicatePlan,
  onDeletePlan,
  onRenamePlan,
  onClearAllBlocks,
}) => {
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [selectedCopyDays, setSelectedCopyDays] = useState<Record<DayKey, boolean>>({
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
    sat: false,
    sun: false,
  });

  const [rowValidationWarning, setRowValidationWarning] = useState<string | null>(null);

  const totalRows = computeTotalRows(settings.startHour, settings.endHour, settings.stepMinutes);
  const is7Day = settings.daysMode === '7day';
  const visibleDays: DayKey[] = is7Day ? DAY_KEYS : DAY_KEYS.slice(0, 5);

  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];

  // Open copy modal preset logic
  const handleOpenCopy = () => {
    if (!selectedBlock) return;
    const initial: Record<DayKey, boolean> = {
      mon: false,
      tue: false,
      wed: false,
      thu: false,
      fri: false,
      sat: false,
      sun: false,
    };
    setSelectedCopyDays(initial);
    setCopyModalOpen(true);
  };

  const handleSelectPreset = (preset: 'weekdays' | 'weekend' | 'all') => {
    if (!selectedBlock) return;
    const next = { ...selectedCopyDays };
    if (preset === 'weekdays') {
      DAY_KEYS.slice(0, 5).forEach((d) => {
        if (d !== selectedBlock.day) next[d] = true;
      });
    } else if (preset === 'weekend') {
      next.sat = selectedBlock.day !== 'sat';
      next.sun = selectedBlock.day !== 'sun';
    } else if (preset === 'all') {
      DAY_KEYS.forEach((d) => {
        if (d !== selectedBlock.day) next[d] = true;
      });
    }
    setSelectedCopyDays(next);
  };

  const handleExecuteCopy = () => {
    if (!selectedBlock) return;
    const targets = (Object.keys(selectedCopyDays) as DayKey[]).filter(
      (d) => selectedCopyDays[d] && d !== selectedBlock.day
    );
    if (targets.length === 0) {
      setCopyModalOpen(false);
      return;
    }
    onCopyBlockToDays(selectedBlock, targets);
    setCopyModalOpen(false);
  };

  // Safe settings adjustment with row height rule validation
  const handleTimeChange = (newStart: number, newEnd: number, newStep: 30 | 60) => {
    const val = validateRowHeight(newStart, newEnd, newStep);
    if (!val.valid) {
      setRowValidationWarning(val.message || 'Row height too short for single-page print.');
      return;
    }
    setRowValidationWarning(null);
    onUpdateSettings({
      startHour: newStart,
      endHour: newEnd,
      stepMinutes: newStep,
    });
  };

  return (
    <div className="w-80 h-full bg-white border-l-2 border-[#2D2200] flex flex-col shrink-0 select-none overflow-hidden">
      {/* =========================================================
          CASE 1: A BLOCK IS CURRENTLY SELECTED
      ========================================================= */}
      {selectedBlock ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="p-3.5 border-b-2 border-[#2D2200] bg-[#FAF8F5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2D2200]" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#2D2200]">
                Block Settings
              </h3>
            </div>
            <button
              type="button"
              onClick={onDeselectBlock}
              className="p-1 rounded-full text-[#2D2200]/60 hover:text-[#2D2200] hover:bg-[#EFECE6]"
              title="Close block settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-extrabold text-[#2D2200] mb-1">
                Activity Label
              </label>
              <input
                type="text"
                value={selectedBlock.title}
                onChange={(e) =>
                  onUpdateBlock({ ...selectedBlock, title: e.target.value })
                }
                className="w-full px-3 py-2 text-sm font-bold border-2 border-[#2D2200] rounded-xl outline-none focus:shadow-[2px_2px_0px_#2D2200]"
              />
            </div>

            {/* Day Selector */}
            <div>
              <label className="block text-xs font-extrabold text-[#2D2200] mb-1">
                Day of Week
              </label>
              <select
                value={selectedBlock.day}
                onChange={(e) => {
                  const targetDay = e.target.value as DayKey;
                  // Try to place at same startRow or outward nearest
                  onUpdateBlock({ ...selectedBlock, day: targetDay });
                }}
                className="w-full px-3 py-2 text-xs font-bold border-2 border-[#2D2200] rounded-xl outline-none bg-white"
              >
                {visibleDays.map((d) => (
                  <option key={d} value={d}>
                    {DAY_NAMES_5[d]}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Time & Duration */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-extrabold text-[#2D2200] mb-1">
                  Start Time
                </label>
                <select
                  value={selectedBlock.startRow}
                  onChange={(e) => {
                    const newStartRow = Number(e.target.value);
                    onUpdateBlock({ ...selectedBlock, startRow: newStartRow });
                  }}
                  className="w-full px-2.5 py-2 text-xs font-bold border-2 border-[#2D2200] rounded-xl outline-none bg-white"
                >
                  {Array.from({ length: totalRows }).map((_, r) => {
                    const mins = settings.startHour * 60 + r * settings.stepMinutes;
                    return (
                      <option key={r} value={r}>
                        {formatMinutes(mins)}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#2D2200] mb-1">
                  Duration
                </label>
                <select
                  value={selectedBlock.durationRows}
                  onChange={(e) => {
                    const newRows = Math.max(1, Number(e.target.value));
                    onUpdateBlock({ ...selectedBlock, durationRows: newRows });
                  }}
                  className="w-full px-2.5 py-2 text-xs font-bold border-2 border-[#2D2200] rounded-xl outline-none bg-white"
                >
                  {Array.from({ length: Math.min(8, totalRows - selectedBlock.startRow) }).map(
                    (_, i) => {
                      const rows = i + 1;
                      const mins = rows * settings.stepMinutes;
                      const label = mins >= 60 ? `${mins / 60} hr` : `${mins} min`;
                      return (
                        <option key={rows} value={rows}>
                          {label} ({rows} {rows === 1 ? 'row' : 'rows'})
                        </option>
                      );
                    }
                  )}
                </select>
              </div>
            </div>

            {/* Time range preview */}
            <div className="px-3 py-2 bg-[#FAF8F5] border border-[#B6B2A6] rounded-xl flex items-center justify-between text-xs font-bold text-[#2D2200]">
              <span className="flex items-center gap-1.5 text-[#2D2200]/70">
                <Clock className="w-3.5 h-3.5" /> Time span:
              </span>
              <span>
                {formatTimeRange(
                  selectedBlock.startRow,
                  selectedBlock.durationRows,
                  settings.startHour,
                  settings.stepMinutes
                )}
              </span>
            </div>

            {/* Check Circle Toggle */}
            <div className="pt-1">
              <label className="flex items-center justify-between p-2.5 border-[1.5px] border-[#2D2200] rounded-xl bg-white cursor-pointer hover:bg-[#FAF8F5]">
                <span className="text-xs font-bold text-[#2D2200] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#5BAE3C]" /> Show tick circle
                </span>
                <input
                  type="checkbox"
                  checked={selectedBlock.hasCheckCircle}
                  onChange={(e) =>
                    onUpdateBlock({
                      ...selectedBlock,
                      hasCheckCircle: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-[#2D2200] text-[#2D2200] focus:ring-0"
                />
              </label>
              <p className="text-[10px] text-[#2D2200]/60 mt-1 px-1">
                Prints a check circle for your child to mark off when completed!
              </p>
            </div>

            {/* Icon picker */}
            <div>
              <label className="block text-xs font-extrabold text-[#2D2200] mb-1.5">
                Activity Icon
              </label>
              <div className="grid grid-cols-6 gap-1 p-2 border border-[#B6B2A6] rounded-xl max-h-32 overflow-y-auto bg-white">
                {AVAILABLE_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() =>
                      onUpdateBlock({ ...selectedBlock, icon: iconName })
                    }
                    className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                      selectedBlock.icon === iconName
                        ? 'bg-[#2D2200] text-white shadow-[1.5px_1.5px_0px_#2D2200]'
                        : 'hover:bg-[#FAF8F5] text-[#2D2200]'
                    }`}
                  >
                    <ActivityIcon name={iconName} size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Copy To Feature */}
            <div className="pt-2 border-t border-[#2D2200]/20">
              <button
                type="button"
                onClick={handleOpenCopy}
                className="w-full py-2 px-3 text-xs font-extrabold rounded-full bg-[#FAF8F5] border-2 border-[#2D2200] text-[#2D2200] shadow-[2px_2px_0px_#2D2200] hover:bg-[#EFECE6] active:translate-y-0.5 flex items-center justify-center gap-2 transition-all"
              >
                <Copy className="w-3.5 h-3.5" /> Copy to other days...
              </button>
            </div>

            {/* Delete Block */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onDeleteBlock(selectedBlock.id)}
                className="w-full py-2 px-3 text-xs font-bold rounded-full border border-[#E52311] text-[#E52311] hover:bg-[#E52311]/10 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Block
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================
            CASE 2: NO BLOCK SELECTED -> PAGE & SCHEDULE SETTINGS
        ========================================================= */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3.5 border-b-2 border-[#2D2200] bg-[#FAF8F5] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#2D2200]" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#2D2200]">
              Schedule Settings
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Days Toggle: Mon–Fri or Mon–Sun */}
            <div>
              <label className="block text-xs font-extrabold text-[#2D2200] mb-1.5">
                Week Days
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#EFECE6] border border-[#2D2200]/30 rounded-full">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ daysMode: '5day' })}
                  className={`py-1.5 text-xs font-extrabold rounded-full transition-all ${
                    settings.daysMode === '5day'
                      ? 'bg-white text-[#2D2200] shadow-[2px_2px_0px_#2D2200] border border-[#2D2200]'
                      : 'text-[#2D2200]/70 hover:text-[#2D2200]'
                  }`}
                >
                  Mon – Fri (5 days)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ daysMode: '7day' })}
                  className={`py-1.5 text-xs font-extrabold rounded-full transition-all ${
                    settings.daysMode === '7day'
                      ? 'bg-white text-[#2D2200] shadow-[2px_2px_0px_#2D2200] border border-[#2D2200]'
                      : 'text-[#2D2200]/70 hover:text-[#2D2200]'
                  }`}
                >
                  Mon – Sun (7 days)
                </button>
              </div>
            </div>

            {/* Time range: Start Hour, End Hour, Step */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-[#2D2200]">
                Daily Hours & Row Step
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-[#2D2200]/70 block mb-0.5">
                    Start time
                  </span>
                  <select
                    value={settings.startHour}
                    onChange={(e) =>
                      handleTimeChange(
                        Number(e.target.value),
                        settings.endHour,
                        settings.stepMinutes
                      )
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-bold border-2 border-[#2D2200] rounded-xl outline-none bg-white"
                  >
                    {[5, 6, 7, 8, 9].map((h) => (
                      <option key={h} value={h}>
                        {formatMinutes(h * 60)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#2D2200]/70 block mb-0.5">
                    End time
                  </span>
                  <select
                    value={settings.endHour}
                    onChange={(e) =>
                      handleTimeChange(
                        settings.startHour,
                        Number(e.target.value),
                        settings.stepMinutes
                      )
                    }
                    className="w-full px-2.5 py-1.5 text-xs font-bold border-2 border-[#2D2200] rounded-xl outline-none bg-white"
                  >
                    {[16, 17, 18, 19, 20, 21].map((h) => (
                      <option key={h} value={h}>
                        {formatMinutes(h * 60)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#2D2200]/70 block mb-0.5">
                  Time step per row
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleTimeChange(settings.startHour, settings.endHour, 60)
                    }
                    className={`py-1.5 text-xs font-bold rounded-xl border-2 transition-all ${
                      settings.stepMinutes === 60
                        ? 'border-[#2D2200] bg-[#FAF8F5] shadow-[2px_2px_0px_#2D2200] text-[#2D2200]'
                        : 'border-[#B6B2A6] text-[#2D2200]/70 hover:border-[#2D2200]'
                    }`}
                  >
                    60 mins (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleTimeChange(settings.startHour, settings.endHour, 30)
                    }
                    className={`py-1.5 text-xs font-bold rounded-xl border-2 transition-all ${
                      settings.stepMinutes === 30
                        ? 'border-[#2D2200] bg-[#FAF8F5] shadow-[2px_2px_0px_#2D2200] text-[#2D2200]'
                        : 'border-[#B6B2A6] text-[#2D2200]/70 hover:border-[#2D2200]'
                    }`}
                  >
                    30 mins
                  </button>
                </div>
              </div>

              {/* Warning if combination is invalid or blocked */}
              {rowValidationWarning && (
                <div className="p-2.5 bg-[#E52311]/10 border border-[#E52311] rounded-xl text-[11px] font-bold text-[#E52311] flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{rowValidationWarning}</span>
                </div>
              )}
            </div>

            {/* Show times on blocks toggle */}
            <div className="pt-1">
              <label className="flex items-center justify-between p-2.5 border-[1.5px] border-[#2D2200] rounded-xl bg-white cursor-pointer hover:bg-[#FAF8F5]">
                <span className="text-xs font-bold text-[#2D2200]">
                  Show times on blocks
                </span>
                <input
                  type="checkbox"
                  checked={settings.showTimesOnBlocks}
                  onChange={(e) =>
                    onUpdateSettings({ showTimesOnBlocks: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-[#2D2200] text-[#2D2200] focus:ring-0"
                />
              </label>
              <p className="text-[10px] text-[#2D2200]/60 mt-1 px-1">
                E.g. shows "9:30am – 10am" directly on each activity.
              </p>
            </div>

            {/* Text labels */}
            <div className="space-y-2.5 pt-2 border-t border-[#2D2200]/15">
              <div>
                <label className="block text-xs font-extrabold text-[#2D2200] mb-1">
                  Child's Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Leo, Maya, Oliver"
                  value={settings.childName}
                  onChange={(e) => onUpdateSettings({ childName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-bold border-2 border-[#2D2200] rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#2D2200] mb-1">
                  Page Title
                </label>
                <input
                  type="text"
                  value={settings.title}
                  onChange={(e) => onUpdateSettings({ title: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-bold border-2 border-[#2D2200] rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#2D2200] mb-1">
                  Week Label Badge
                </label>
                <input
                  type="text"
                  value={settings.weekLabel}
                  onChange={(e) => onUpdateSettings({ weekLabel: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-bold border-2 border-[#2D2200] rounded-xl outline-none"
                />
              </div>
            </div>

            {/* Character Badge Picker */}
            <div className="pt-2 border-t border-[#2D2200]/15">
              <label className="block text-xs font-extrabold text-[#2D2200] mb-1.5">
                Corner Sticker Badge
              </label>
              <select
                value={settings.selectedCharacter || ''}
                onChange={(e) =>
                  onUpdateSettings({ selectedCharacter: e.target.value || null })
                }
                className="w-full px-3 py-2 text-xs font-bold border-2 border-[#2D2200] rounded-xl outline-none bg-white"
              >
                <option value="">No character badge</option>
                {CHARACTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.badgeLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Plan Manager */}
            <div className="pt-3 border-t border-[#2D2200]/15 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#2D2200]">
                  Saved Routines ({plans.length})
                </span>
                <button
                  type="button"
                  onClick={onCreateNewPlan}
                  className="text-xs font-extrabold text-[#2D2200] hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" /> New Plan
                </button>
              </div>

              <div className="space-y-1">
                <input
                  type="text"
                  value={activePlan.name}
                  onChange={(e) => onRenamePlan(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold border-2 border-[#2D2200] rounded-xl outline-none bg-[#FAF8F5]"
                  title="Rename current plan"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onDuplicatePlan}
                  className="py-1.5 px-2 text-xs font-bold rounded-xl border border-[#2D2200] bg-white hover:bg-[#FAF8F5] flex items-center justify-center gap-1 text-[#2D2200]"
                >
                  <Files className="w-3.5 h-3.5" /> Duplicate
                </button>

                {plans.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeletePlan(activePlanId)}
                    className="py-1.5 px-2 text-xs font-bold rounded-xl border border-[#E52311] text-[#E52311] hover:bg-[#E52311]/10 flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>

              {/* Clear all blocks on schedule */}
              {blocks.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClearAllBlocks}
                    className="w-full py-1.5 text-[11px] font-bold rounded-xl border border-dashed border-[#2D2200]/40 text-[#2D2200]/70 hover:text-[#E52311] hover:border-[#E52311] transition-colors"
                  >
                    Clear all blocks on this week
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          COPY TO DAYS MODAL
      ========================================================= */}
      {copyModalOpen && selectedBlock && (
        <div className="fixed inset-0 bg-[#2D2200]/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#2D2200] rounded-2xl p-5 max-w-sm w-full shadow-[5px_5px_0px_#2D2200] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#2D2200]/20">
              <h3 className="font-extrabold text-sm text-[#2D2200] flex items-center gap-1.5">
                <Copy className="w-4 h-4" /> Copy "{selectedBlock.title}"
              </h3>
              <button
                type="button"
                onClick={() => setCopyModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-[#2D2200]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <p className="text-xs text-[#2D2200]/80">
                Copies this activity to the exact same time slot on chosen days:
              </p>

              {/* Presets */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('weekdays')}
                  className="px-2.5 py-1 text-xs font-bold rounded-full bg-[#FAF8F5] border border-[#2D2200] hover:bg-[#EFECE6] text-[#2D2200]"
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('weekend')}
                  className="px-2.5 py-1 text-xs font-bold rounded-full bg-[#FAF8F5] border border-[#2D2200] hover:bg-[#EFECE6] text-[#2D2200]"
                >
                  Weekend
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('all')}
                  className="px-2.5 py-1 text-xs font-bold rounded-full bg-[#FAF8F5] border border-[#2D2200] hover:bg-[#EFECE6] text-[#2D2200]"
                >
                  Every day
                </button>
              </div>

              {/* Day checkboxes */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2D2200]/10">
                {visibleDays.map((d) => {
                  const isCurrentDay = d === selectedBlock.day;
                  return (
                    <label
                      key={d}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold ${
                        isCurrentDay
                          ? 'opacity-40 cursor-not-allowed border-dashed border-[#B6B2A6]'
                          : 'cursor-pointer hover:bg-[#FAF8F5] border-[#2D2200]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isCurrentDay}
                        checked={selectedCopyDays[d]}
                        onChange={(e) =>
                          setSelectedCopyDays((prev) => ({
                            ...prev,
                            [d]: e.target.checked,
                          }))
                        }
                        className="rounded border-[#2D2200] text-[#2D2200] focus:ring-0"
                      />
                      <span>
                        {DAY_NAMES_5[d]} {isCurrentDay && '(Current)'}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#2D2200]/10">
                <button
                  type="button"
                  onClick={() => setCopyModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-full border border-[#B6B2A6] text-[#2D2200] hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCopy}
                  className="px-4 py-1.5 text-xs font-extrabold rounded-full bg-[#2D2200] text-white shadow-[2px_2px_0px_#2D2200] hover:scale-105 active:scale-95 transition-transform"
                >
                  Copy to Days
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
