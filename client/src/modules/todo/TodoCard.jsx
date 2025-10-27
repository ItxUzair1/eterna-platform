import React from 'react';
import { format } from 'date-fns';
import { PencilSquareIcon, TrashIcon, CalendarIcon, TagIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  New:        { bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: '#6366f1' },
  'In Progress': { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: '#f59e0b' },
  Pending:    { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: '#fb923c' },
  Completed:  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: '#10b981' },
  Cancelled:  { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: '#ef4444' },
};

const PRIORITY_BADGES = {
  High: 'bg-rose-100 text-rose-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-emerald-100 text-emerald-700',
};

const TodoCard = ({ todo, category, isSelected, onSelect, onEdit, onDelete, onStatusChange }) => {
  const s = STATUS_COLORS[todo.status] || { bg: 'bg-slate-100', text: 'text-slate-700', dot: '#94a3b8' };

  return (
    <div
      className="group relative rounded-3xl border border-white/60 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition p-5 overflow-hidden"
      style={{ boxShadow: '0 10px 30px rgba(2,6,23,0.04)' }}
    >
      {/* Category color rail */}
      <div className="absolute left-0 top-4 bottom-4 w-1.5 rounded-full" style={{ backgroundColor: category?.color || '#cbd5e1' }} />

      {/* Select indicator */}
      <div className="absolute top-3 right-3">
        <CheckCircleIcon className={`w-5 h-5 ${isSelected ? 'text-emerald-500' : 'text-slate-300'}`} />
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mt-1.5 w-4 h-4 rounded border-slate-300 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900 leading-tight truncate">{todo.title}</h3>
            <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
              <span className="whitespace-nowrap">{todo.status}</span>
            </span>
          </div>

          {/* Description */}
          {todo.description && (
            <p className="mt-2 text-sm text-slate-600 line-clamp-2">{todo.description}</p>
          )}

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            {category && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50">
                <TagIcon className="w-4 h-4 text-slate-400" />
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: category.color }} />
                <span className="max-w-[8rem] truncate">{category.title}</span>
              </span>
            )}
            {todo.assignedDate && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                {format(new Date(todo.assignedDate), 'dd MMM yyyy')}
              </span>
            )}
            {todo.dueDate && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 ${
                  new Date(todo.dueDate) < new Date() && todo.status !== 'Completed' ? 'text-rose-600' : ''
                }`}
              >
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                {format(new Date(todo.dueDate), 'dd MMM yyyy')}
              </span>
            )}
            {todo.priority && (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${PRIORITY_BADGES[todo.priority] || 'bg-slate-100 text-slate-700'}`}>
                {todo.priority}
              </span>
            )}
          </div>

          {/* Footer: fully contained, wraps on small screens */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <button
                onClick={onEdit}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition"
                title="Edit"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Edit
              </button>

              <button
                onClick={onDelete}
                className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition"
                title="Delete"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>

            <div className="hidden sm:block sm:flex-1" />

            {/* Constrained select to avoid overflow */}
            <div className="min-w-0">
              <select
                value={todo.status}
                onChange={(e) => onStatusChange(e.target.value)}
                className="block w-full sm:w-auto max-w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-300"
              >
                {Object.keys(STATUS_COLORS).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoCard;
