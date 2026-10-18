/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  DragStartEvent,
  DragOverEvent,
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
  isRangeFree,
  validateRowHeight,
} from './utils/timeGrid';
import {
  createNewPlan,
  loadPlans,
  savePlans,
  DEFAULT_SETTINGS,
} from './data/defaultData';

import { Toolbar } from './components/Toolbar';
import { Palette } from './components/Palette';
import { RightSidebar } from './components/RightSidebar';
import { ScheduleSheet, DropPreviewState } from './components/ScheduleSheet';
import { ActivityBlockCard } from './components/ActivityBlockCard';
import { PrintPortal } from './components/PrintPortal';
import { ToastContainer } from './components/Toast';

export default function App() {
  // Load saved plans from localStorage (with safety try/catch inside data layer)
  const [plans, setPlans] = useState<PlanRecord[]>(() => {
    const loaded = loadPlans();
    return loaded.plans;
  });

  const [activePlanId, setActivePlanId] = useState<string>(() => {
    const loaded = loadPlans();
    return loaded.activePlanId;
  });

  // Current active plan & its settings/blocks
  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];
  const settings = activePlan.settings;
  const blocks = activePlan.blocks;

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
  const grabOffsetRef = useRef<number>(0);

  // Zoom control state
  const [zoom, setZoom] = useState<number>(1.0);
  const viewportContainerRef = useRef<HTMLDivElement>(null);
  const sheetGridRef = useRef<HTMLDivElement>(null);
  const printSheetRef = useRef<HTMLDivElement>(null);

  // Custom palette items created by the user
  const [customItems, setCustomItems] = useState<PaletteItem[]>([]);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // PDF generation state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // dnd-kit sensors: PointerSensor with 6px distance constraint so simple clicks still select
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
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
      setHistory((prev) => [...prev.slice(-40), blocks]);
      setFuture([]);
      updateActivePlan((prev) => ({
        ...prev,
        blocks: newBlocks,
      }));
    },
    [blocks, updateActivePlan]
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

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
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
      document.fonts.ready.then(() => {
        setTimeout(() => {
          window.print();
        }, 400);
      });
    }
  }, []);

  // Update planner settings
  const handleUpdateSettings = (newSettings: Partial<PlannerSettings>) => {
    updateActivePlan((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings,
      },
    }));
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
    savePlans(nextPlans, dup.id);
    addToast(`Duplicated "${activePlan.name}".`);
  };

  // Delete plan
  const handleDeletePlan = (planId: string) => {
    if (plans.length <= 1) return;
    const filtered = plans.filter((p) => p.id !== planId);
    setPlans(filtered);
    const nextActive = filtered[0].id;
    setActivePlanId(nextActive);
    setSelectedBlockId(null);
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
    commitBlocksChange([]);
    setSelectedBlockId(null);
    addToast('All blocks cleared from schedule.', 'Undo', () => {
      commitBlocksChange(saved);
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const isPalette = !!active.data.current?.isPaletteItem;

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

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;

    if (!over) {
      setDropPreview(null);
      return;
    }

    const overId = String(over.id);
    if (!overId.startsWith('cell|')) {
      setDropPreview(null);
      return;
    }

    const [, dayStr, rowStr] = overId.split('|');
    const day = dayStr as DayKey;
    const hoveredRow = parseInt(rowStr, 10);

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

    // Offset row: grabbing a 3-hour block by bottom does not shift it
    const grabOffset = isPalette ? 0 : grabOffsetRef.current || 0;
    const targetStartRow = hoveredRow - grabOffset;

    // Search outward for free spot in this column
    let landingRow = findNearestFreeSlot(
      day,
      targetStartRow,
      desiredDurationRows,
      blocks,
      totalRows,
      excludeId
    );

    // If palette item won't fit at default duration, try 1-row block
    if (landingRow === null && isPalette && desiredDurationRows > 1) {
      desiredDurationRows = 1;
      landingRow = findNearestFreeSlot(
        day,
        targetStartRow,
        1,
        blocks,
        totalRows,
        excludeId
      );
    }

    if (landingRow !== null) {
      setDropPreview({
        day,
        startRow: landingRow,
        durationRows: desiredDurationRows,
        fits: true,
      });
    } else {
      // Won't fit anywhere in that day column
      setDropPreview({
        day,
        startRow: Math.max(0, Math.min(totalRows - 1, hoveredRow)),
        durationRows: 1,
        fits: false,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    const currentPreview = dropPreview;

    setActiveDragItem(null);
    setDropPreview(null);

    const isPalette = !!active.data.current?.isPaletteItem;
    const activeBlock = active.data.current?.block as ActivityBlock | undefined;

    // Case 1: Dropped off the page (over is null)
    if (!over) {
      if (!isPalette && activeBlock) {
        // Dragging a block off the page deletes it, with a toast "Block removed" and an Undo button (5 seconds)
        const removedBlock = activeBlock;
        const newBlocks = blocks.filter((b) => b.id !== removedBlock.id);
        commitBlocksChange(newBlocks);
        if (selectedBlockId === removedBlock.id) {
          setSelectedBlockId(null);
        }

        addToast('Block removed', 'Undo', () => {
          commitBlocksChange([...newBlocks, removedBlock]);
        });
      }
      return;
    }

    // Case 2: Dropped onto a cell
    if (!currentPreview || !currentPreview.fits) {
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

      const newBlocks = [...blocks, newBlock];
      commitBlocksChange(newBlocks);
      setSelectedBlockId(newBlock.id);
    } else if (activeBlock) {
      const updatedBlock: ActivityBlock = {
        ...activeBlock,
        day: currentPreview.day,
        startRow: currentPreview.startRow,
        durationRows: currentPreview.durationRows,
      };

      const newBlocks = blocks.map((b) => (b.id === activeBlock.id ? updatedBlock : b));
      commitBlocksChange(newBlocks);
      setSelectedBlockId(updatedBlock.id);
    }
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
    setDropPreview(null);
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

    // Measure row step in screen pixels: gridElement.getBoundingClientRect().height / rows
    const gridEl = document.getElementById('schedule-grid-container');
    if (!gridEl) return;

    const gridRect = gridEl.getBoundingClientRect();
    const rowStepPx = gridRect.height / totalRows;
    const startY = e.clientY;
    const initialDuration = targetBlock.durationRows;

    // Find next block in this day to stop at
    const otherBlocksInDay = blocks.filter(
      (b) => b.day === targetBlock.day && b.id !== targetBlock.id && b.startRow > targetBlock.startRow
    );
    const sorted = [...otherBlocksInDay].sort((a, b) => a.startRow - b.startRow);
    const nextBlock = sorted[0];
    const maxAllowedRows = nextBlock
      ? nextBlock.startRow - targetBlock.startRow
      : totalRows - targetBlock.startRow;

    let currentDuration = initialDuration;

    const onPointerMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - startY;
      const rowDelta = Math.round(deltaY / rowStepPx);
      const newDuration = Math.max(1, Math.min(maxAllowedRows, initialDuration + rowDelta));

      if (newDuration !== currentDuration) {
        currentDuration = newDuration;
        // Live visual update
        setPlans((prev) =>
          prev.map((p) => {
            if (p.id === activePlanId) {
              return {
                ...p,
                blocks: p.blocks.map((b) =>
                  b.id === targetBlock.id ? { ...b, durationRows: newDuration } : b
                ),
              };
            }
            return p;
          })
        );
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      // Save as ONE undo step on release
      if (currentDuration !== initialDuration) {
        setHistory((prev) => [...prev.slice(-40), blocks]);
        setFuture([]);
        savePlans(plans, activePlanId);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
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
    commitBlocksChange(newBlocks);
    setSelectedBlockId(null);
    addToast('Block removed', 'Undo', () => {
      commitBlocksChange([...newBlocks, blockToDelete]);
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
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="w-screen h-screen flex flex-col bg-[#F6F4EE] text-[#2D2200] overflow-hidden">
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
            onAddCustomItem={(item) => setCustomItems((prev) => [...prev, item])}
          />

          {/* Centre Canvas with Zoom Control */}
          <main
            ref={viewportContainerRef}
            className="flex-1 h-full bg-[#EAE6DD] overflow-auto flex items-center justify-center p-6 relative select-none scrollbar-thin"
            onClick={() => setSelectedBlockId(null)}
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
                onSelectBlock={setSelectedBlockId}
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
              <div className="w-48 bg-white border-2 border-[#2D2200] rounded-xl px-3 py-2 flex items-center gap-2 shadow-[4px_4px_0px_#2D2200] cursor-grabbing select-none pointer-events-none">
                <span className="font-bold text-xs text-[#2D2200] truncate">
                  {activeDragItem.paletteItem.title}
                </span>
              </div>
            ) : activeDragItem.block ? (
              <div className="w-40 pointer-events-none select-none">
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
            PRINT PORTAL (Rendered into document.body outside DndContext)
        ========================================================= */}
        <PrintPortal
          settings={settings}
          blocks={blocks}
          printRef={printSheetRef}
        />

        {/* =========================================================
            TOAST CONTAINER
        ========================================================= */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </DndContext>
  );
}
