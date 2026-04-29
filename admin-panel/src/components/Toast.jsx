import { useState, useEffect, useCallback } from 'react';

let _setState = null;
let _id = 0;

export function showToast(message, type = 'info') {
  if (_setState) {
    const id = ++_id;
    _setState(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      _setState(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }
}

const ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

const BORDER_COLORS = {
  success: 'border-green-400',
  error:   'border-red-500',
  info:    'border-cyan-400',
};

const TEXT_COLORS = {
  success: 'text-green-400',
  error:   'text-red-500',
  info:    'text-cyan-400',
};

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _setState = setToasts;
    return () => { _setState = null; };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`slide-up pointer-events-auto flex items-start gap-3 min-w-[280px] max-w-sm
            bg-surface2 border-l-4 ${BORDER_COLORS[toast.type]}
            rounded-xl px-4 py-3 shadow-2xl`}
        >
          <span className={`text-lg font-bold ${TEXT_COLORS[toast.type]} mt-0.5`}>
            {ICONS[toast.type]}
          </span>
          <span className="text-sm text-text-primary leading-snug">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
