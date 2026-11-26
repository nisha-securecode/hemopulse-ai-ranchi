import React from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  detail: string;
  tone: 'success' | 'info' | 'warning';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 right-6 z-50 flex flex-col gap-2.5 max-w-md w-[calc(100vw-3rem)] pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl bg-slate-900 text-white px-4 py-3.5 shadow-lg border border-slate-700"
        >
          {toast.tone === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-[#10B981] shrink-0 mt-0.5" />
          ) : (
            <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">{toast.title}</div>
            <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">{toast.detail}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white p-0.5 rounded"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
