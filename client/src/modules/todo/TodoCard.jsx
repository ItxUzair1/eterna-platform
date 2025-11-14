import React, { useId, useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import {
  PencilSquareIcon,
  TrashIcon,
  CalendarIcon,
  TagIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  New: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: '#6366f1' },
  'In Progress': { bg: 'bg-amber-100', text: 'text-amber-700', dot: '#f59e0b' },
  Pending: { bg: 'bg-orange-100', text: 'text-orange-700', dot: '#fb923c' },
  Completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: '#10b981' },
  Cancelled: { bg: 'bg-rose-100', text: 'text-rose-700', dot: '#ef4444' },
};

const PRIORITY_BADGES = {
  High: 'bg-rose-100 text-rose-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-emerald-100 text-emerald-700',
};

// Minimal accessible confirm dialog
function ConfirmDialog({ open, title = 'Confirm action', message, confirmText = 'Delete', cancelText = 'Cancel', onConfirm, onCancel }) {
  const dialogId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const focusable = panelRef.current?.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Tab' && focusable?.length) {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    first?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${dialogId}-title`}
      aria-describedby={`${dialogId}-desc`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div ref={panelRef} className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrashIcon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={`${dialogId}-title`} className="text-sm font-bold text-rose-600">{title}</h2>
            <p id={`${dialogId}-desc`} className="mt-1 text-sm text-slate-600">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            aria-label="Close dialog"
          >
            <XMarkIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3 py-1.5 rounded-lg text-sm bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Clean icon-only button
const IconButton = ({ title, ariaLabel, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={ariaLabel || title}
    className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition"
  >
    {children}
  </button>
);

const TodoCard = ({ todo, category, isSelected, onSelect, onEdit, onDelete, onStatusChange }) => {
  const s = STATUS_COLORS[todo.status] || { bg: 'bg-slate-100', text: 'text-slate-700', dot: '#94a3b8' };
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dueOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && todo.status !== 'Completed';

  return (
    <div className="group relative rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition p-6 sm:p-7 overflow-hidden w-full h-full">
      <div className="absolute left-0 top-4 bottom-4 w-1.5 rounded-full" style={{ backgroundColor: category?.color || '#cbd5e1' }} />

      <div className="absolute top-3 right-3">
        <CheckCircleIcon className={`w-5 h-5 ${isSelected ? 'text-emerald-500' : 'text-slate-300'}`} aria-hidden="true" />
      </div>

      <div className="flex items-start gap-3">
        {onSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="mt-1.5 w-4 h-4 rounded border-slate-300 shrink-0"
            aria-label="Select task"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-2xl font-semibold text-slate-900 leading-tight line-clamp-2" title={todo.title}>
                {todo.title}
              </h3>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dot }} />
              <span className="whitespace-nowrap">{todo.status}</span>
            </span>
          </div>

          {todo.description && (
            <p className="mt-2 text-sm text-slate-600 line-clamp-2">{todo.description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            {category && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50">
                <TagIcon className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: category.color }} />
                <span className="max-w-32 truncate" title={category.title}>{category.title}</span>
              </span>
            )}
            {todo.assignedDate && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50">
                <CalendarIcon className="w-4 h-4 text-slate-400" aria-hidden="true" />
                {format(new Date(todo.assignedDate), 'dd MMM yyyy')}
              </span>
            )}
            {todo.dueDate && (
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-50 ${dueOverdue ? 'text-rose-600' : ''}`}
                title={dueOverdue ? 'Overdue' : undefined}
              >
                <CalendarIcon className="w-4 h-4 text-slate-400" aria-hidden="true" />
                {format(new Date(todo.dueDate), 'dd MMM yyyy')}
              </span>
            )}
            {todo.priority && (
              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${PRIORITY_BADGES[todo.priority] || 'bg-slate-100 text-slate-700'}`}>
                {todo.priority}
              </span>
            )}
          </div>

          {(onEdit || onDelete || onStatusChange) && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              {(onEdit || onDelete) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {onEdit && (
                    <IconButton title="Edit task" onClick={onEdit}>
                      <PencilSquareIcon className="w-5 h-5" aria-hidden="true" />
                    </IconButton>
                  )}
                  {onDelete && (
                    <IconButton title="Delete task" onClick={() => setConfirmOpen(true)}>
                      <TrashIcon className="w-5 h-5" aria-hidden="true" />
                    </IconButton>
                  )}
                </div>
              )}

              {onStatusChange && (
                <>
                  <div className="hidden sm:block sm:flex-1" />
                  <div className="min-w-0">
                    <select
                      value={todo.status}
                      onChange={(e) => onStatusChange(e.target.value)}
                      className="block w-full sm:w-auto max-w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      aria-label="Change status"
                    >
                      {Object.keys(STATUS_COLORS).map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this task?"
        message={`This action cannot be undone. Delete “${todo.title}”?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          setConfirmOpen(false);
          onDelete?.();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default TodoCard;
