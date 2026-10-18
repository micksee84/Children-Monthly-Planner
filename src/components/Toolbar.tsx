import React from 'react';
import { PlanRecord } from '../types/planner';
import {
  Undo2,
  Redo2,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  Layers,
} from 'lucide-react';

interface ToolbarProps {
  spacesUsed: number;
  totalSpaces: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  isGeneratingPdf: boolean;
  plans: PlanRecord[];
  activePlanId: string;
  onSwitchPlan: (planId: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  spacesUsed,
  totalSpaces,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onPrint,
  onDownloadPdf,
  isGeneratingPdf,
  plans,
  activePlanId,
  onSwitchPlan,
}) => {
  return (
    <header className="w-full h-14 bg-white border-b-2 border-[#2D2200] px-4 flex items-center justify-between gap-4 shrink-0 select-none z-30">
      {/* Zone 1: Brand & Plan Selector */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#F2B800] border-2 border-[#2D2200] flex items-center justify-center font-black text-xs text-[#2D2200] shadow-[1.5px_1.5px_0px_#2D2200]">
            SB
          </div>
          <span className="font-extrabold text-sm text-[#2D2200] hidden sm:inline tracking-tight">
            My Week Planner
          </span>
        </div>

        <div className="h-5 w-[1.5px] bg-[#2D2200]/20" />

        {/* Plan Switcher */}
        <div className="flex items-center gap-1.5">
          <select
            value={activePlanId}
            onChange={(e) => onSwitchPlan(e.target.value)}
            className="text-xs font-bold bg-[#FAF8F5] border border-[#2D2200] rounded-full px-3 py-1 text-[#2D2200] outline-none hover:bg-[#EFECE6] cursor-pointer"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Zone 2: Spaces Used counter & History */}
      <div className="flex items-center gap-4">
        {/* Spaces used indicator */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-colors ${
            spacesUsed >= totalSpaces
              ? 'bg-[#EE7B22]/15 border-[#EE7B22] text-[#EE7B22]'
              : 'bg-[#FAF8F5] border-[#2D2200]/30 text-[#2D2200]'
          }`}
          title={`${spacesUsed} of ${totalSpaces} total time slots currently used`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>
            {spacesUsed} of {totalSpaces} spaces used
          </span>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#2D2200]/30 rounded-full p-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-full transition-all ${
              canUndo
                ? 'text-[#2D2200] hover:bg-white hover:shadow-[1px_1px_0px_#2D2200] active:scale-95'
                : 'text-[#2D2200]/30 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z / ⌘Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-full transition-all ${
              canRedo
                ? 'text-[#2D2200] hover:bg-white hover:shadow-[1px_1px_0px_#2D2200] active:scale-95'
                : 'text-[#2D2200]/30 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Shift+Z / ⌘Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden md:flex items-center gap-1 bg-[#FAF8F5] border border-[#2D2200]/30 rounded-full px-2 py-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1 text-[#2D2200] hover:text-[#EE7B22]"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-bold text-[#2D2200] w-11 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            className="p-1 text-[#2D2200] hover:text-[#EE7B22]"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onZoomFit}
            className="p-1 ml-1 text-[#2D2200] hover:text-[#EE7B22]"
            title="Fit to screen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Zone 3: Print & PDF CTAs */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Print Button */}
        <button
          type="button"
          onClick={onPrint}
          className="py-1.5 px-3.5 rounded-full text-xs font-bold bg-[#FAF8F5] border-2 border-[#2D2200] text-[#2D2200] shadow-[2px_2px_0px_#2D2200] hover:bg-[#EFECE6] active:translate-y-0.5 transition-all flex items-center gap-1.5"
          title="Print 1 landscape Letter page"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">Print</span>
        </button>

        {/* PDF Download Button */}
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isGeneratingPdf}
          className={`py-1.5 px-4 rounded-full text-xs font-extrabold bg-[#2D2200] text-white shadow-[2px_2px_0px_#2D2200] active:translate-y-0.5 transition-all flex items-center gap-1.5 ${
            isGeneratingPdf
              ? 'opacity-60 cursor-wait'
              : 'hover:scale-105 active:scale-95'
          }`}
          title="Download single-page Letter PDF"
        >
          <Download className="w-4 h-4" />
          <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
        </button>
      </div>
    </header>
  );
};
