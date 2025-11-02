import React from 'react';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  PauseCircleIcon,
  XCircleIcon,
  BoltIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';

const STATUS_META = {
  all: { label: 'All Tasks', icon: ListBulletIcon, bg: 'bg-slate-100', fc: 'text-slate-700' },
  New: { label: 'New', icon: BoltIcon, bg: 'bg-indigo-100', fc: 'text-indigo-700' },
  'In Progress': { label: 'In Progress', icon: ClockIcon, bg: 'bg-amber-100', fc: 'text-amber-700' },
  Pending: { label: 'Pending', icon: PauseCircleIcon, bg: 'bg-orange-100', fc: 'text-orange-700' },
  Completed: { label: 'Completed', icon: CheckCircleIcon, bg: 'bg-emerald-100', fc: 'text-emerald-700' },
  Cancelled: { label: 'Cancelled', icon: XCircleIcon, bg: 'bg-rose-100', fc: 'text-rose-700' },
};

const TodoSidebar = ({
  categories,
  selectedCategory,
  selectedStatus,
  onCategorySelect,
  onStatusSelect,
  onCreateCategory,
  todoCount,
}) => {
  const statusKeys = ['all', 'New', 'In Progress', 'Pending', 'Completed', 'Cancelled'];

  return (
    <aside className="w-72 shrink-0 h-screen sticky top-0 backdrop-blur-xl bg-white/70 border-r border-white/40 shadow-[0_8px_30px_rgba(0,0,0,0.06)] px-5 py-6 flex flex-col">
      {/* Brand + quick new category */}
      <div className="flex items-center justify-between">
        <div className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
          Eterna Tasks
        </div>
        {onCreateCategory && (
          <button
            onClick={onCreateCategory}
            className="inline-flex items-center justify-center p-2 rounded-xl bg-white/70 border border-white/50 hover:bg-white transition shadow-sm"
            title="Create category"
          >
            <PlusIcon className="w-5 h-5 text-slate-700" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mt-6">
        <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
        <input
          placeholder="Search tasks..."
          className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white/80 border border-white/60 shadow-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none"
        />
      </div>

      {/* Status filters */}
      <div className="mt-6">
        <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase mb-3">
          Tasks
        </div>
        <div className="space-y-2">
          {statusKeys.map((key) => {
            const m = STATUS_META[key];
            const Active = selectedStatus === key;
            const Icon = m.icon;
            return (
              <button
                key={key}
                onClick={() => onStatusSelect(key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition ${
                  Active ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white/70 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${Active ? 'bg-white/20' : m.bg}`}>
                    <Icon className={`w-5 h-5 ${Active ? 'text-white' : m.fc}`} />
                  </span>
                  <span className="text-sm">{m.label}</span>
                </span>
                {key === 'all' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${Active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {todoCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable categories fill remaining height */}
      <div className="mt-4 flex-1 overflow-y-auto overscroll-contain pr-1">
        {/* Sticky subheader */}
        <div className="sticky top-0 z-10 bg-white/70 backdrop-blur pt-1 pb-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Categories</div>
            <button
              onClick={onCreateCategory}
              className="text-xs text-indigo-600 hover:text-indigo-500"
            >
              New
            </button>
          </div>
        </div>

        <div className="space-y-1.5 pb-4">
          <button
            onClick={() => onCategorySelect('all')}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm transition ${
              selectedCategory === 'all' ? 'bg-cyan-600 text-white shadow' : 'hover:bg-white/70 text-slate-700'
            }`}
          >
            All Categories
          </button>

          {Array.isArray(categories) &&
            categories.map((c) => (
              <button
                key={c.id}
                onClick={() => onCategorySelect(c.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition ${
                  selectedCategory === c.id ? 'bg-cyan-600 text-white shadow' : 'hover:bg-white/70 text-slate-700'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                <span className="truncate">{c.title}</span>
              </button>
            ))}
        </div>
      </div>
    </aside>
  );
};

export default TodoSidebar;
