import React from 'react';
import { createPortal } from 'react-dom';
import { ActivityBlock, PlannerSettings } from '../types/planner';
import { ScheduleSheet } from './ScheduleSheet';

interface PrintPortalProps {
  settings: PlannerSettings;
  blocks: ActivityBlock[];
  printRef: React.RefObject<HTMLDivElement | null>;
}

export const PrintPortal: React.FC<PrintPortalProps> = ({ settings, blocks, printRef }) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="print-root">
      <style>{`
        @page {
          size: letter landscape;
          margin: 0;
        }
      `}</style>
      <ScheduleSheet
        ref={printRef}
        settings={settings}
        blocks={blocks}
        selectedBlockId={null}
        readOnly={true}
      />
    </div>,
    document.body
  );
};
