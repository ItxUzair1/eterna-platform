import React, { useState } from 'react';
import { XMarkIcon, SwatchIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#14b8a6', '#f97316', '#22c55e', '#eab308',
];

const CategoryModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    color: '#3b82f6',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Accent strip */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-cyan-500" />

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SwatchIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">Create Category</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[70vh] overflow-auto px-6 py-5">
          <form id="categoryForm" onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-slate-600">Category Name</label>
              <div className="relative mt-1">
                <PencilSquareIcon className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Personal, Work, Home"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-xs font-semibold text-slate-600">Color</label>
              <div className="mt-2 flex items-center gap-4">
                {/* Native color input */}
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-12 rounded-md border border-slate-300 cursor-pointer"
                />
                {/* Hex preview */}
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              {/* Presets */}
              <div className="mt-3 grid grid-cols-8 gap-2">
                {PRESET_COLORS.map((color) => {
                  const selected = formData.color.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      title={color}
                      className={`h-8 w-8 rounded-md border-2 transition ${
                        selected ? 'border-slate-900' : 'border-transparent hover:border-slate-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100">
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="categoryForm"
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-cyan-500 text-white font-medium shadow-lg hover:shadow-xl"
            >
              Create Category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryModal;
