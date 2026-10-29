import React, { useEffect } from 'react';
import { ToastMessage } from '../types/planner';
import { X, Undo2, AlertCircle, Check } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none no-print">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const duration = toast.duration ?? 5000;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div className="pointer-events-auto bg-[#2D2200] text-white px-4 py-2.5 rounded-full shadow-[3px_3px_0px_rgba(0,0,0,0.3)] border border-[#2D2200] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-md">
      <span className="text-xs font-bold leading-tight">{toast.text}</span>

      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          onClick={() => {
            toast.onAction?.();
            onDismiss(toast.id);
          }}
          className="px-2.5 py-0.5 rounded-full bg-white text-[#2D2200] text-xs font-extrabold hover:bg-[#FAF8F0] active:scale-95 transition-all flex items-center gap-1"
        >
          <Undo2 className="w-3 h-3" />
          {toast.actionLabel}
        </button>
      )}

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 text-white/60 hover:text-white"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
