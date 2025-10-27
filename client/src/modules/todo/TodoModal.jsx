import React, { useEffect, useRef, useState } from 'react';
import { CalendarIcon, TagIcon, FlagIcon, DocumentIcon } from '@heroicons/react/24/outline';

const ALLOWED = ['New', 'In Progress', 'Pending', 'Completed', 'Cancelled'];

const clamp = (min, v, max) => Math.max(min, Math.min(v, max));

const TodoModal = ({ todo, categories, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'New',
    priority: 'Medium',
    categoryId: '',
    assignedDate: new Date().toISOString().split('T')[0],
    dueDate: '',
  });

  // slider state (height percentage of viewport)
  const [vhPct, setVhPct] = useState(85);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startPct = useRef(vhPct);

  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title || '',
        description: todo.description || '',
        status: ALLOWED.includes(todo.status) ? todo.status : 'New',
        priority: todo.priority || 'Medium',
        categoryId: todo.categoryId || '',
        assignedDate: todo.assignedDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: todo.dueDate?.split('T')[0] || '',
      });
    }
  }, [todo]);

  const onChange = (k) => (e) => setFormData((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (todo) onSubmit(todo.id, formData);
    else onSubmit(formData);
  };

  // drag-to-resize handlers
  const onPointerDown = (e) => {
    dragging.current = true;
    startY.current = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    startPct.current = vhPct;
    document.body.style.userSelect = 'none';
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    const delta = y - startY.current;
    const deltaPct = (delta / window.innerHeight) * 100;
    setVhPct((prev) => clamp(55, startPct.current - deltaPct, 95));
  };
  const onPointerUp = () => {
    dragging.current = false;
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/45">
      {/* Modal shell with adjustable height */}
      <div
        className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ height: `min(${vhPct}vh, 900px)` }}
        role="dialog"
        aria-modal="true"
      >
        {/* Top gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-cyan-500" />

        {/* Sticky header with grab handle */}
        <div className="sticky top-0 -mb-px bg-white z-10">
          <div
            className="w-full flex items-center justify-center pt-2 cursor-row-resize"
            onMouseDown={onPointerDown}
            onTouchStart={onPointerDown}
          >
            <div className="h-1.5 w-16 rounded-full bg-slate-200" />
          </div>
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
              {todo ? 'Edit Task' : 'Create Task'}
            </h2>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-auto px-5 sm:px-6 pb-4 pt-5">
          <form id="todoForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Title</label>
              <input
                required
                value={formData.title}
                onChange={onChange('title')}
                placeholder="e.g., Prepare sprint demo"
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Description</label>
              <div className="relative">
                <DocumentIcon className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={onChange('description')}
                  placeholder="Add helpful details..."
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 sm:py-3.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Category</label>
              <div className="relative">
                <TagIcon className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                <select
                  value={formData.categoryId}
                  onChange={onChange('categoryId')}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 sm:py-3.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">No Category</option>
                  {Array.isArray(categories) &&
                    categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Priority</label>
              <div className="relative">
                <FlagIcon className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                <select
                  value={formData.priority}
                  onChange={onChange('priority')}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 sm:py-3.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Status</label>
              <select
                value={formData.status}
                onChange={onChange('status')}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:py-3.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {ALLOWED.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Assigned Date</label>
              <div className="relative">
                <CalendarIcon className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="date"
                  value={formData.assignedDate}
                  onChange={onChange('assignedDate')}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 sm:py-3.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Due Date</label>
              <div className="relative">
                <CalendarIcon className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={onChange('dueDate')}
                  min={formData.assignedDate}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 sm:py-3.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Sticky footer with actions */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              form="todoForm"
              type="submit"
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-cyan-500 text-white font-semibold shadow-lg hover:shadow-xl"
            >
              {todo ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoModal;
