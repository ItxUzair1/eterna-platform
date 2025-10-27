import React from 'react';

const TodoSidebar = ({
  categories,
  selectedCategory,
  selectedStatus,
  onCategorySelect,
  onStatusSelect,
  onCreateCategory,
  todoCount,
}) => {
  const statusOptions = [
    { value: 'all', label: 'All Tasks', count: todoCount },
    { value: 'New', label: 'New', color: 'blue' },
    { value: 'In Progress', label: 'In Progress', color: 'yellow' },
    { value: 'Pending', label: 'Pending', color: 'orange' },
    { value: 'Completed', label: 'Completed', color: 'green' },
    { value: 'Cancelled', label: 'Cancelled', color: 'red' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search Task Here"
          className="form-control"
        />
      </div>

      {/* Tasks Section */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          TASKS
        </h3>
        <div className="space-y-1">
          {statusOptions.map((status) => (
            <button
              key={status.value}
              onClick={() => onStatusSelect(status.value)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedStatus === status.value
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {status.value !== 'all' && (
                  <span
                    className={`w-2 h-2 rounded-full bg-${status.color}-500`}
                  />
                )}
                <span>{status.label}</span>
              </div>
              {status.count !== undefined && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  {status.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Categories Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            CATEGORIES
          </h3>
          <button
            onClick={onCreateCategory}
            className="text-primary hover:text-primary-hover text-xl"
            title="Add Category"
          >
            +
          </button>
        </div>
        <div className="space-y-1">
          <button
            onClick={() => onCategorySelect('all')}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedCategory === 'all'
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span>All Categories</span>
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: category.color }}
              />
              <span className="truncate">{category.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TodoSidebar;
