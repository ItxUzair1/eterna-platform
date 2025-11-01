// ui/Buttons.jsx
import React from 'react';

export function PrimaryButton({ className = '', children, ...props }) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md',
        'text-white font-medium',
        'bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500',
        'shadow-sm shadow-indigo-500/20',
        'transition-all duration-200',
        'hover:brightness-110 hover:shadow-md',
        'focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:ring-offset-1',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function SubtleButton({ className = '', children, ...props }) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md',
        'text-slate-700 bg-white border border-slate-200 shadow-sm',
        'hover:bg-slate-50 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:ring-offset-1',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
