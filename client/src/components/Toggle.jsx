// ui/Toggle.jsx
import React from 'react';

export default function Toggle({ value, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={[
        'relative inline-flex h-7 w-12 rounded-full transition-all duration-200',
        value
          ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 shadow-[0_0_0_3px] shadow-indigo-500/10'
          : 'bg-slate-300 hover:bg-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      ].join(' ')}
      aria-pressed={value}
    >
      <span
        className={[
          'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white',
          'shadow-sm transition-transform duration-200 will-change-transform',
          value ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}
