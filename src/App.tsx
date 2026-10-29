/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  CollisionDetection,
  DragStartEvent,
  DragMoveEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { domToCanvas } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

import {
  ActivityBlock,
  DayKey,
  PaletteItem,
  PlannerSettings,
  PlanRecord,
  ToastMessage,
} from './types/planner';
import {
  computeTotalRows,
  DAY_KEYS,
  DAY_NAMES_5,
  findNearestFreeSlot,
  getDefaultWeekLabel,
  isRangeFree,
  remapBlocksToGrid,
} from './utils/timeGrid';
import {
  createNewPlan,
  loadCustomItems,
  loadPlans,
  savePlans,
  saveCustomItems,
} from './data/defaultData';

import { Toolbar } from './components/Toolbar';
import { Palette } from './components/Palette';
import { RightSidebar } from './components/RightSidebar';
import { ScheduleSheet, DropPreviewState, ROW_GAP_PX } from './components/ScheduleSheet';
import { ActivityBlockCard } from './components/ActivityBlockCard';
import { PrintPortal } from './components/PrintPortal';
import { ToastContainer } from './components/Toast';

export default function App() {
  // Load saved plans from localStorage (with safety try/catch inside data layer)
  const [initialLoad] = useState(() => loadPlans());
  const [plans, setPlans] = useState<PlanRecord[]>(initialLoad.plans);
  const [activePlanId, setActivePlanId] = useState<string>(initialLoad.activePlanId);

  // Current active plan & its settings/blocks
  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];
  const settings = activePlan.settings;
  const blocks = activePlan.blocks;

  // Latest values for callbacks that run later (toast Undo buttons, pointer
  // handlers), so they never act on a stale snapshot.
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const activePlanIdRef = useRef(activePlanId);
  activePlanIdRef.current = activePlanId;

  // Selected block for editing in the RightSidebar & resize handle
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Undo / Redo history stacks
  const [history, setHistory] = useState<ActivityBlock[][]>([]);
  const [future, setFuture] = useState<ActivityBlock[][]>([]);

  // Drag and drop state
  const [activeDragItem, setActiveDragItem] = useState<{
    id: string;
    isPaletteItem: boolean;
    block?: ActivityBlock;
    paletteItem?: PaletteItem;
    defaultDuration?: number;
  } | null>(null);

  const [dropPreview, setDropPreview] = useState<DropPreviewState | null>(null);
  const dropPreviewRef = useRef<DropPreviewState | null>(null);
  const grabOffsetRef = useRef<number>(0);
  // Set briefly after a drag ends so the click that follows the release does
  // not clear the selection of the block that was just dropped.
  const suppressDeselectRef = useRef(false);

  // Zoom control state
  const [zoom, setZoom] = useState<number>(1.0);
  const viewportContainerRef = useRef<HTMLDivElement>(null);
  const sheetGridRef = useRef<HTMLDivElement>(null);
  const printSheetRef = useRef<HTMLDivElement>(null);

  // Custom palette items created by the user
  const [customItems, setCustomItems] = useState<PaletteItem[]>(() => loadCustomItems());

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // PDF generation state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // dnd-kit sensors: mouse starts after 6px so simple clicks still select;
  // touch starts after a short press so the palette and page can still scroll.
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    })
  );

  // Toast helper
  const addToast = useCallback(
    (text: string, actionLabel?: string, onAction?: () => void, duration = 5000) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      setToasts((prev) => [...prev, { id, text, actionLabel, onAction, duration }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update plans & persist to localStorage
  const updateActivePlan = useCallback(
    (updater: (prevPlan: PlanRecord) => PlanRecord) => {
      setPlans((prevPlans) => {
        const next = prevPlans.map((p) => {
          if (p.id === activePlanId) {
            const updated = updater(p);
            return { ...updated, updatedAt: Date.now() };
          }
          return p;
        });
        savePlans(next, activePlanId);
        return next;
      });
    },
    [activePlanId]
  );

  // Update current blocks with history tracking
  const commitBlocksChange = useCallback(
    (newBlocks: ActivityBlock[]) => {
      const before = blocksRef.current;
      setHistory((prev) => [...prev.slice(-40), before]);
      setFuture([]);
      updateActivePlan((prev) => ({
        ...prev,
        blocks: newBlocks,
      }));
    },
    [updateActivePlan]
  );

  // Put removed blocks back (toast "Undo"). Works on the schedule as it is
  // now, so anything added in the meantime is kept; a block whose spot was
  // taken since slides to the nearest free rows on the same day.
  const restoreBlocks = useCallback(
    (planId: string, removed: ActivityBlock[], rows: number) => {
      if (activePlanIdRef.current !== planId) return;
      const current = blocksRef.current;
      const next = [...current];
      let skipped = 0;
      for (const b of removed) {
        if (next.some((n) => n.id === b.id)) continue;
        const row = findNearestFreeSlot(b.day, b.startRow, b.durationRows, next, rows, null);
        if (row === null) {
          skipped++;
          continue;
        }
        next.push({ ...b, startRow: row });
      }
      if (next.length !== current.length) commitBlocksChange(next);
      if (skipped > 0) {
        addToast(`${skipped} ${skipped === 1 ? 'block' : 'blocks'} could not be put back because the day is full.`);
      }
    },
    [commitBlocksChange, addToast]
  );

  // Undo / Redo implementation
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFuture((prev) => [blocks, ...prev]);
    updateActivePlan((prev) => ({
      ...prev,
      blocks: previous,
    }));
    setSelectedBlockId(null);
  }, [history, blocks, updateActivePlan]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, blocks]);
    updateActivePlan((prev) => ({
      ...prev,
      blocks: next,
    }));
    setSelectedBlockId(null);
  }, [future, blocks, updateActivePlan]);

  // Keyboard shortcuts (Ctrl/Cmd+Z, Shift+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'Escape') {
        // Escape closes the block settings by deselecting, like clicking the page
        setSelectedBlockId(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Auto-fit zoom to window on initial load and resize
  const handleFitZoom = useCallback(() => {
    if (!viewportContainerRef.current) return;
    const { clientWidth, clientHeight } = viewportContainerRef.current;
    // Target page size is 1056 x 816 px, allow 40px margins
    const scaleX = (clientWidth - 40) / 1056;
    const scaleY = (clientHeight - 40) / 816;
    const idealZoom = Math.min(scaleX, scaleY);
    // Clamp zoom between 0.45 and 1.25
    setZoom(Math.max(0.45, Math.min(1.25, Number(idealZoom.toFixed(2)))));
  }, []);

  useEffect(() => {
    handleFitZoom();
    window.addEventListener('resize', handleFitZoom);
    return () => window.removeEventListener('resize', handleFitZoom);
  }, [handleFitZoom]);

  // Handle #print hash (e.g. when opened in a new tab from iframe)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#print') {
      // Clear the hash so a refresh of this tab does not print again.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      document.fonts.ready.then(() => {
        setTimeout(() => {
          window.print();
        }, 400);
      });
    }
  }, []);

  // Update planner settings
  const handleUpdateSettings = (newSettings: Partial<PlannerSettings>) => {
    const next: PlannerSettings = { ...settings, ...newSettings };

    // Switching 5/7 days: keep an untouched automatic week label in step.
    if (next.daysMode !== settings.daysMode && settings.weekLabel === getDefaultWeekLabel(settings.daysMode)) {
      next.weekLabel = getDefaultWeekLabel(next.daysMode);
    }

    const gridChanged =
      next.startHour !== settings.startHour ||
      next.endHour !== settings.endHour ||
      next.stepMinutes !== settings.stepMinutes;

    if (!gridChanged || blocks.length === 0) {
      updateActivePlan((prev) => ({ ...prev, settings: next }));
      return;
    }

    // Blocks are stored as rows, so re-place them by clock time on the new grid.
    const previousSettings = settings;
    const previousBlocks = blocks;
    const planId = activePlanId;
    const { blocks: remapped, dropped } = remapBlocksToGrid(blocks, settings, next);

    updateActivePlan((prev) => ({ ...prev, settings: next, blocks: remapped }));
    // Older undo steps are in the old row layout, so they no longer apply.
    setHistory([]);
    setFuture([]);
    setSelectedBlockId(null);

    if (dropped.length > 0) {
      addToast(
        `${dropped.length} ${dropped.length === 1 ? 'block is' : 'blocks are'} outside the new hours and ${
          dropped.length === 1 ? 'was' : 'were'
        } removed.`,
        'Undo',
        () => {
          if (activePlanIdRef.current !== planId) return;
          updateActivePlan((prev) => ({ ...prev, settings: previousSettings, blocks: previousBlocks }));
        },
        8000
      );
    }
  };

  // Switch between saved plans
  const handleSwitchPlan = (planId: string) => {
    setActivePlanId(planId);
    setSelectedBlockId(null);
    setHistory([]);
    setFuture([]);
    savePlans(plans, planId);
  };

  // Create new blank plan (start blank)
  const handleCreateNewPlan = () => {
    const newP = createNewPlan(`Plan ${plans.length + 1}`);
    const nextPlans = [...plans, newP];
    setPlans(nextPlans);
    setActivePlanId(newP.id);
    setSelectedBlockId(null);
    setHistory([]);
    setFuture([]);
    savePlans(nextPlans, newP.id);
    addToast(`Created new plan "${newP.name}".`);
  };

  // Duplicate current plan
  const handleDuplicatePlan = () => {
    const dup: PlanRecord = {
      id: 'plan_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: `${activePlan.name} (Copy)`,
      updatedAt: Date.now(),
      settings: { ...activePlan.settings },
      blocks: activePlan.blocks.map((b) => ({
        ...b,
        id: 'block_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      })),
    };
    const nextPlans = [...plans, dup];
    setPlans(nextPlans);
    setActivePlanId(dup.id);
    setSelectedBlockId(null);
    setHistory([]);
    setFuture([]);
    savePlans(nextPlans, dup.id);
    addToast(`Duplicated "${activePlan.name}".`);
  };

  // Delete plan
  const handleDeletePlan = (planId: string) => {
    if (plans.length <= 1) return;
    const filtered = plans.filter((p) => p.id !== planId);
    setPlans(filtered);
    // Stay on the current plan unless it is the one being deleted.
    const deletingActive = planId === activePlanId;
    const nextActive = deletingActive ? filtered[0].id : activePlanId;
    setActivePlanId(nextActive);
    if (deletingActive) {
      setSelectedBlockId(null);
      setHistory([]);
      setFuture([]);
    }
    savePlans(filtered, nextActive);
    addToast('Plan deleted.');
  };

  // Rename plan
  const handleRenamePlan = (newName: string) => {
    updateActivePlan((prev) => ({
      ...prev,
      name: newName,
    }));
  };

  // Clear all blocks on schedule
  const handleClearAllBlocks = () => {
    if (blocks.length === 0) return;
    const saved = [...blocks];
    const planId = activePlanId;
    const rows = totalRows;
    commitBlocksChange([]);
    setSelectedBlockId(null);
    addToast('All blocks cleared from schedule.', 'Undo', () => {
      restoreBlocks(planId, saved, rows);
    });
  };

  // Total rows & space metrics
  const totalRows = computeTotalRows(settings.startHour, settings.endHour, settings.stepMinutes);
  const is7Day = settings.daysMode === '7day';
  const visibleDays: DayKey[] = is7Day ? DAY_KEYS : DAY_KEYS.slice(0, 5);
  const totalSpaces = totalRows * visibleDays.length;

  const spacesUsed = blocks
    .filter((b) => visibleDays.includes(b.day))
    .reduce((acc, b) => acc + b.durationRows, 0);

  const isScheduleFull = spacesUsed >= totalSpaces;

  // Selected block object
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  // =========================================================================
  // DND-KIT HANDLERS
  // =========================================================================

  // Prefer the day column under the pointer; otherwise the sheet itself, so a
  // drop over a gap or the header is never treated as "off the page".
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const hits = pointerWithin(args);
    const dayHit = hits.find((h) => String(h.id).startsWith('day|'));
    if (dayHit) return [dayHit];
    return hits.filter((h) => h.id === 'sheet');
  }, []);

  const setPreview = (next: DropPreviewState | null) => {
    const prev = dropPreviewRef.current;
    const same =
      prev === next ||
      (prev &&
        next &&
        prev.day === next.day &&
        prev.startRow === next.startRow &&
        prev.durationRows === next.durationRows &&
        prev.fits === next.fits);
    if (same) return;
    dropPreviewRef.current = next;
    setDropPreview(next);
  };

  const getPointerY = (event: Event | null): number | null => {
    if (!event) return null;
    if ('touches' in event) {
      const t = (event as TouchEvent).touches[0] || (event as TouchEvent).changedTouches[0];
      return t ? t.clientY : null;
    }
    if ('clientY' in event) return (event as MouseEvent).clientY;
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const isPalette = !!active.data.current?.isPaletteItem;
    dropPreviewRef.current = null;

    if (isPalette) {
      const paletteItem = active.data.current?.paletteItem as PaletteItem;
      setActiveDragItem({
        id: String(active.id),
        isPaletteItem: true,
        paletteItem,
        defaultDuration: paletteItem.defaultDuration,
      });
      grabOffsetRef.current = 0;
    } else {
      const block = active.data.current?.block as ActivityBlock;
      setActiveDragItem({
        id: String(active.id),
        isPaletteItem: false,
        block,
      });
      // Grab offset was recorded onPointerDown on the card
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { over, active, delta, activatorEvent } = event;

    if (!over) {
      // Outside the sheet entirely.
      setPreview(null);
      return;
    }

    const overId = String(over.id);
    if (!overId.startsWith('day|')) {
      // Over the sheet but between columns or on the header: keep the last
      // landing spot so crossing a gap does not lose it.
      return;
    }

    const startY = getPointerY(activatorEvent);
    if (startY === null) return;
    const pointerY = startY + delta.y;

    const day = over.data.current?.day as DayKey;
    const rect = over.rect;
    // Rows are equal with a fixed gap: column = n*row + (n-1)*gap (all scaled by zoom).
    const gap = ROW_GAP_PX * zoom;
    const rowStep = (rect.height + gap) / totalRows;
    const hoveredRow = Math.max(0, Math.min(totalRows - 1, Math.floor((pointerY - rect.top) / rowStep)));

    const isPalette = !!active.data.current?.isPaletteItem;
    let desiredDurationRows = 1;
    let excludeId: string | null = null;

    if (isPalette) {
      const pItem = active.data.current?.paletteItem as PaletteItem;
      const defaultDuration = pItem?.defaultDuration || 60;
      desiredDurationRows = Math.max(1, Math.ceil(defaultDuration / settings.stepMinutes));
    } else {
      const block = active.data.current?.block as ActivityBlock;
      desiredDurationRows = block?.durationRows || 1;
      excludeId = block?.id || null;
    }
    desiredDurationRows = Math.min(desiredDurationRows, totalRows);

    // Offset row: grabbing a 3-hour block by its bottom does not shift it
    const grabOffset = isPalette ? 0 : grabOffsetRef.current || 0;
    const targetStartRow = Math.max(0, Math.min(totalRows - desiredDurationRows, hoveredRow - grabOffset));

    // Search outward for free spot in this column
    let landingRow = findNearestFreeSlot(day, targetStartRow, desiredDurationRows, blocks, totalRows, excludeId);

    // If a palette item won't fit at its default length, try a 1-row block
    if (landingRow === null && isPalette && desiredDurationRows > 1) {
      desiredDurationRows = 1;
      landingRow = findNearestFreeSlot(day, hoveredRow, 1, blocks, totalRows, excludeId);
    }

    if (landingRow !== null) {
      setPreview({ day, startRow: landingRow, durationRows: desiredDurationRows, fits: true });
    } else {
      setPreview({ day, startRow: hoveredRow, durationRows: 1, fits: false });
    }
  };

  const finishDrag = () => {
    setActiveDragItem(null);
    dropPreviewRef.current = null;
    setDropPreview(null);
    suppressDeselectRef.current = true;
    setTimeout(() => {
      suppressDeselectRef.current = false;
    }, 0);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    const currentPreview = dropPreviewRef.current;
    finishDrag();

    const isPalette = !!active.data.current?.isPaletteItem;
    const activeBlock = active.data.current?.block as ActivityBlock | undefined;

    // Case 1: Let go outside the sheet. A block dragged off the page is removed
    // (with Undo); a palette item simply is not added.
    if (!over) {
      if (!isPalette && activeBlock) {
        const removedBlock = activeBlock;
        const planId = activePlanId;
        const rows = totalRows;
        commitBlocksChange(blocks.filter((b) => b.id !== removedBlock.id));
        if (selectedBlockId === removedBlock.id) {
          setSelectedBlockId(null);
        }
        addToast('Block removed', 'Undo', () => {
          restoreBlocks(planId, [removedBlock], rows);
        });
      }
      return;
    }

    // Case 2: Over the sheet but never over a day column: nothing to do.
    if (!currentPreview) return;

    if (!currentPreview.fits) {
      addToast('No room there. Try another spot.');
      return;
    }

    if (isPalette) {
      const paletteItem = active.data.current?.paletteItem as PaletteItem;
      const newBlock: ActivityBlock = {
        id: 'block_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        day: currentPreview.day,
        startRow: currentPreview.startRow,
        durationRows: currentPreview.durationRows,
        title: paletteItem.title,
        icon: paletteItem.icon,
        hasCheckCircle: paletteItem.hasCheckCircle,
        category: paletteItem.category,
      };

      commitBlocksChange([...blocks, newBlock]);
      setSelectedBlockId(newBlock.id);
    } else if (activeBlock) {
      const current = blocks.find((b) => b.id === activeBlock.id);
      if (!current) return;
      if (
        current.day === currentPreview.day &&
        current.startRow === currentPreview.startRow &&
        current.durationRows === currentPreview.durationRows
      ) {
        // Dropped where it already was: no undo step needed.
        setSelectedBlockId(current.id);
        return;
      }
      const updatedBlock: ActivityBlock = {
        ...current,
        day: currentPreview.day,
        startRow: currentPreview.startRow,
        durationRows: currentPreview.durationRows,
      };

      commitBlocksChange(blocks.map((b) => (b.id === current.id ? updatedBlock : b)));
      setSelectedBlockId(updatedBlock.id);
    }
  };

  const handleDragCancel = () => {
    finishDrag();
  };

  // Clicking empty canvas clears the selection, except for the click that
  // the browser fires right after a drag is released.
  const handleBackgroundDeselect = () => {
    if (suppressDeselectRef.current) return;
    setSelectedBlockId(null);
  };

  // =========================================================================
  // TAP TO ADD FROM PALETTE
  // =========================================================================
  const handleTapAddBlock = (item: PaletteItem) => {
    let desiredDurationRows = Math.max(1, Math.ceil(item.defaultDuration / settings.stepMinutes));

    // Try Monday first, then subsequent visible days
    let chosenDay: DayKey | null = null;
    let chosenRow: number | null = null;

    for (const d of visibleDays) {
      const slot = findNearestFreeSlot(d, 0, desiredDurationRows, blocks, totalRows, null);
      if (slot !== null) {
        chosenDay = d;
        chosenRow = slot;
        break;
      }
    }

    // If default duration didn't fit, try 1-row block
    if (chosenDay === null && desiredDurationRows > 1) {
      desiredDurationRows = 1;
      for (const d of visibleDays) {
        const slot = findNearestFreeSlot(d, 0, 1, blocks, totalRows, null);
        if (slot !== null) {
          chosenDay = d;
          chosenRow = slot;
          break;
        }
      }
    }

    if (chosenDay !== null && chosenRow !== null) {
      const newBlock: ActivityBlock = {
        id: 'block_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        day: chosenDay,
        startRow: chosenRow,
        durationRows: desiredDurationRows,
        title: item.title,
        icon: item.icon,
        hasCheckCircle: item.hasCheckCircle,
        category: item.category,
      };
      commitBlocksChange([...blocks, newBlock]);
      setSelectedBlockId(newBlock.id);
      addToast(`Added "${item.title}" to ${DAY_NAMES_5[chosenDay]}.`);
    } else {
      addToast('No room on the schedule. Try freeing up a spot.');
    }
  };

  // =========================================================================
  // RESIZE BLOCK HANDLE LOGIC
  // =========================================================================
  const handleStartResize = (e: React.PointerEvent, targetBlock: ActivityBlock) => {
    e.preventDefault();
    e.stopPropagation();

    // Measure one row step in screen pixels from the block's own day column
    // (already scaled by zoom): column = n*row + (n-1)*gap.
    const columnEl = sheetGridRef.current?.querySelector<HTMLElement>(
      `[data-day-column="${targetBlock.day}"]`
    );
    if (!columnEl) return;

    const columnRect = columnEl.getBoundingClientRect();
    const rowStepPx = (columnRect.height + ROW_GAP_PX * zoom) / totalRows;
    const startY = e.clientY;
    const initialDuration = targetBlock.durationRows;
    const blocksBefore = blocksRef.current;
    const planId = activePlanId;

    // Stop at the next block in this day
    const nextBlock = blocksBefore
      .filter((b) => b.day === targetBlock.day && b.id !== targetBlock.id && b.startRow > targetBlock.startRow)
      .sort((a, b) => a.startRow - b.startRow)[0];
    const maxAllowedRows = nextBlock
      ? nextBlock.startRow - targetBlock.startRow
      : totalRows - targetBlock.startRow;

    let currentDuration = initialDuration;

    const setDuration = (durationRows: number) => {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? { ...p, blocks: p.blocks.map((b) => (b.id === targetBlock.id ? { ...b, durationRows } : b)) }
            : p
        )
      );
    };

    const onPointerMove = (ev: PointerEvent) => {
      const rowDelta = Math.round((ev.clientY - startY) / rowStepPx);
      const newDuration = Math.max(1, Math.min(maxAllowedRows, initialDuration + rowDelta));
      if (newDuration !== currentDuration) {
        currentDuration = newDuration;
        setDuration(newDuration); // live visual update, saved on release
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (currentDuration === initialDuration) return;

      // One undo step per resize, and save the resized plan (not the copy
      // from before the resize started).
      setHistory((prev) => [...prev.slice(-40), blocksBefore]);
      setFuture([]);
      setPlans((prev) => {
        const next = prev.map((p) => (p.id === planId ? { ...p, updatedAt: Date.now() } : p));
        savePlans(next, planId);
        return next;
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // =========================================================================
  // BLOCK EDITING & COPY TO OTHER DAYS
  // =========================================================================
  const handleUpdateBlock = (updated: ActivityBlock) => {
    const newBlocks = blocks.map((b) => (b.id === updated.id ? updated : b));
    commitBlocksChange(newBlocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    const blockToDelete = blocks.find((b) => b.id === blockId);
    if (!blockToDelete) return;
    const newBlocks = blocks.filter((b) => b.id !== blockId);
    const planId = activePlanId;
    const rows = totalRows;
    commitBlocksChange(newBlocks);
    setSelectedBlockId(null);
    addToast('Block removed', 'Undo', () => {
      restoreBlocks(planId, [blockToDelete], rows);
    });
  };

  const handleCopyBlockToDays = (block: ActivityBlock, targetDays: DayKey[]) => {
    const newCopies: ActivityBlock[] = [];
    let skippedCount = 0;

    for (const d of targetDays) {
      if (d === block.day) continue;
      // Check if exact same time is free on target day
      if (isRangeFree(d, block.startRow, block.durationRows, blocks, totalRows, null)) {
        newCopies.push({
          ...block,
          id: 'block_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          day: d,
        });
      } else {
        skippedCount++;
      }
    }

    if (newCopies.length > 0) {
      commitBlocksChange([...blocks, ...newCopies]);
      if (skippedCount > 0) {
        addToast(
          `Copied to ${newCopies.length} ${newCopies.length === 1 ? 'day' : 'days'} (${skippedCount} skipped because time was taken).`
        );
      } else {
        addToast(`Copied to ${newCopies.length} ${newCopies.length === 1 ? 'day' : 'days'}.`);
      }
    } else {
      addToast(`Could not copy: chosen time is already taken on all selected days.`);
    }
  };

  // =========================================================================
  // PRINT & PDF EXPORT
  // =========================================================================
  const handlePrint = () => {
    // If inside an iframe (window.self !== window.top), open new tab with #print
    if (window.self !== window.top) {
      const currentUrl = window.location.href.split('#')[0] + '#print';
      window.open(currentUrl, '_blank');
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await document.fonts.ready;

      // Use modern-screenshot domToCanvas on the print-only clean sheet element
      const targetElement =
        printSheetRef.current || document.getElementById('schedule-page-letter');
      if (!targetElement) {
        throw new Error('Schedule sheet element not found');
      }

      const canvas = await domToCanvas(targetElement, {
        scale: 2.5,
        backgroundColor: '#FFFFFF',
        width: 1056,
        height: 816,
        style: {
          transform: 'none',
        },
        filter: (node: Node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        },
      });

      // Landscape Letter: 792 x 612 pt (11 x 8.5 in)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: [792, 612],
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, 792, 612);

      const safeName = (activePlan.name || 'My-Week-Routine').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`${safeName}.pdf`);
      addToast('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      addToast('Could not generate PDF. Please try using the Print button.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="w-screen h-screen flex flex-col bg-[#F2F2E2] text-[#2D2200] overflow-hidden">
        {/* =========================================================
            TOP TOOLBAR
        ========================================================= */}
        <Toolbar
          spacesUsed={spacesUsed}
          totalSpaces={totalSpaces}
          canUndo={history.length > 0}
          canRedo={future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          zoom={zoom}
          onZoomIn={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
          onZoomOut={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
          onZoomFit={handleFitZoom}
          onPrint={handlePrint}
          onDownloadPdf={handleDownloadPdf}
          isGeneratingPdf={isGeneratingPdf}
          plans={plans}
          activePlanId={activePlanId}
          onSwitchPlan={handleSwitchPlan}
        />

        {/* =========================================================
            MAIN WORKSPACE: PALETTE (LEFT) + CANVAS (CENTER) + SIDEBAR (RIGHT)
        ========================================================= */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {/* Left Palette */}
          <Palette
            isFull={isScheduleFull}
            selectedCharacter={settings.selectedCharacter}
            onSelectCharacter={(charId) => handleUpdateSettings({ selectedCharacter: charId })}
            onTapAddBlock={handleTapAddBlock}
            customItems={customItems}
            onAddCustomItem={(item) =>
              setCustomItems((prev) => {
                const next = [...prev, item];
                saveCustomItems(next);
                return next;
              })
            }
          />

          {/* Centre Canvas with Zoom Control */}
          <main
            ref={viewportContainerRef}
            className="flex-1 h-full bg-[#EAE6D6] overflow-auto flex items-center justify-center p-6 relative select-none scrollbar-thin"
            onClick={handleBackgroundDeselect}
          >
            {/* Page scaled via CSS transform */}
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 120ms ease-out',
              }}
              className="shrink-0 drop-shadow-xl"
            >
              <ScheduleSheet
                settings={settings}
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                readOnly={false}
                dropPreview={dropPreview}
                draggingBlockId={activeDragItem?.isPaletteItem ? null : activeDragItem?.id}
                onSelectBlock={(id) => (id === null ? handleBackgroundDeselect() : setSelectedBlockId(id))}
                onUpdateSettings={handleUpdateSettings}
                onGrabRowOffset={(offset) => {
                  grabOffsetRef.current = offset;
                }}
                onStartResize={handleStartResize}
                onCharacterClick={() => {
                  // Switch to characters tab or clear
                  handleUpdateSettings({
                    selectedCharacter: settings.selectedCharacter ? null : 'buddy',
                  });
                }}
                gridRef={sheetGridRef}
              />
            </div>
          </main>

          {/* Right Sidebar */}
          <RightSidebar
            selectedBlock={selectedBlock}
            settings={settings}
            blocks={blocks}
            plans={plans}
            activePlanId={activePlanId}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
            onCopyBlockToDays={handleCopyBlockToDays}
            onDeselectBlock={() => setSelectedBlockId(null)}
            onUpdateSettings={handleUpdateSettings}
            onSwitchPlan={handleSwitchPlan}
            onCreateNewPlan={handleCreateNewPlan}
            onDuplicatePlan={handleDuplicatePlan}
            onDeletePlan={handleDeletePlan}
            onRenamePlan={handleRenamePlan}
            onClearAllBlocks={handleClearAllBlocks}
          />
        </div>

        {/* =========================================================
            DND-KIT DRAG OVERLAY
        ========================================================= */}
        <DragOverlay dropAnimation={null}>
          {activeDragItem ? (
            activeDragItem.isPaletteItem && activeDragItem.paletteItem ? (
              <div className="w-full bg-white border-2 border-[#2D2200] rounded-xl px-3 py-2 flex items-center gap-2 shadow-[4px_4px_0px_#2D2200] cursor-grabbing select-none pointer-events-none">
                <span className="font-bold text-xs text-[#2D2200] truncate">
                  {activeDragItem.paletteItem.title}
                </span>
              </div>
            ) : activeDragItem.block ? (
              // The overlay box is the block's on-screen (zoomed) size; draw the
              // card at page size and scale it to match, like the sheet itself.
              <div
                className="pointer-events-none select-none"
                style={{
                  width: `${100 / zoom}%`,
                  height: `${100 / zoom}%`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <ActivityBlockCard
                  block={activeDragItem.block}
                  isOverlay={true}
                  readOnly={true}
                  startHour={settings.startHour}
                  stepMinutes={settings.stepMinutes}
                />
              </div>
            ) : null
          ) : null}
        </DragOverlay>

        {/* =========================================================
            TOAST CONTAINER
        ========================================================= */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </DndContext>

    {/* =========================================================
        PRINT PORTAL: rendered OUTSIDE DndContext on purpose. Inside it, the
        hidden print copy re-registered every drop target and block id as
        disabled, which stopped all dropping.
    ========================================================= */}
    <PrintPortal settings={settings} blocks={blocks} printRef={printSheetRef} />
    </>
  );
}
