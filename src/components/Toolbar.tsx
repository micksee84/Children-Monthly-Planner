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
    <header className="w-full h-16 bg-white border-b-[1.5px] border-[#2D2200] px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 select-none z-30">
      {/* Zone 1: Brand & Plan Selector */}
      <div className="flex items-center gap-3 shrink-0">
        <h1 className="m-0 flex items-center gap-3 font-normal">
          <picture className="shrink-0">
            <source media="(min-width: 640px)" srcSet={`${import.meta.env.BASE_URL}sb-logo-header.svg`} />
            <img
              src={`${import.meta.env.BASE_URL}sb-logo-icon.svg`}
              alt="Sunshine Brigade"
              draggable={false}
              className="h-8 sm:h-[31px] w-auto select-none"
              loading="eager"
            />
          </picture>
          <span className="hidden lg:block w-[1.5px] h-6 bg-[#2D2200]/20" aria-hidden="true" />
          {/* App name: plain Super Joyful in ink, no sticker outline or shadow (never under 24px),
              matching the worksheet builder */}
          <span className="hidden lg:block font-joyful font-normal text-[24px] leading-none text-[#2D2200] whitespace-nowrap select-none">
            My week planner
          </span>
        </h1>

        <div className="h-5 w-[1.5px] bg-[#2D2200]/20" />

        {/* Plan Switcher */}
        <div className="flex items-center gap-1.5">
          <select
            value={activePlanId}
            onChange={(e) => onSwitchPlan(e.target.value)}
            className="text-xs font-bold bg-[#FAF8F0] border border-[#2D2200] rounded-full px-3 py-1 text-[#2D2200] outline-none hover:bg-[#F2F2E2] cursor-pointer"
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
              ? 'bg-[#E52311]/10 border-[#E52311] text-[#2D2200]'
              : 'bg-[#FAF8F0] border-[#2D2200]/30 text-[#2D2200]'
          }`}
          title={`${spacesUsed} of ${totalSpaces} total time slots currently used`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>
            {spacesUsed} of {totalSpaces} spaces used
          </span>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 bg-[#FAF8F0] border border-[#2D2200]/30 rounded-full p-0.5">
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
        <div className="hidden md:flex items-center gap-1 bg-[#FAF8F0] border border-[#2D2200]/30 rounded-full px-2 py-0.5">
          <button
            type="button"
            onClick={onZoomOut}
            className="p-1 text-[#2D2200] hover:text-[#009BD9]"
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
            className="p-1 text-[#2D2200] hover:text-[#009BD9]"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onZoomFit}
            className="p-1 ml-1 text-[#2D2200] hover:text-[#009BD9]"
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
          className="py-1.5 px-3.5 rounded-full text-xs font-bold bg-[#FAF8F0] border-2 border-[#2D2200] text-[#2D2200] shadow-[2px_2px_0px_#2D2200] hover:bg-[#F2F2E2] active:translate-y-0.5 transition-all flex items-center gap-1.5"
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
