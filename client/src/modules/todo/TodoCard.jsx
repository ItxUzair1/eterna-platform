import React from 'react';
import { format } from 'date-fns';

const TodoCard = ({
  todo,
  category,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const statusColors = {
    New: 'blue',
    'In Progress': 'yellow',
    Pending: 'orange',
    Completed: 'green',
    Cancelled: 'red',
  };

  const statusColor = statusColors[todo.status] || 'gray';

  const priorityBadges = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-green-100 text-green-700',
  };

  return (
    <div
      className={`card border-l-4 hover:shadow-lg transition-shadow ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      style={{
        borderLeftColor: category?.color || '#cccccc',
      }}
    >
      <div className="card__body">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="w-4 h-4 rounded border-gray-300 mt-1"
          />
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="text-gray-400 hover:text-primary"
              title="Edit"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600"
              title="Delete"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-gray-800 mb-2 line-clamp-2">
          {todo.title}
        </h3>

        {/* Description */}
        {todo.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {todo.description}
          </p>
        )}

        {/* Category Badge */}
        {category && (
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-xs text-gray-600">{category.title}</span>
          </div>
        )}

        {/* Dates */}
        <div className="space-y-1 mb-3 text-xs text-gray-500">
          {todo.assignedDate && (
            <div className="flex items-center gap-2">
              <span>Assigned:</span>
              <span>{format(new Date(todo.assignedDate), 'dd MMM yyyy')}</span>
            </div>
          )}
          {todo.dueDate && (
            <div className="flex items-center gap-2">
              <span>Due:</span>
              <span className={`font-medium ${
                new Date(todo.dueDate) < new Date() && todo.status !== 'Completed'
                  ? 'text-red-600'
                  : ''
              }`}>
                {format(new Date(todo.dueDate), 'dd MMM yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          {/* Status Dropdown */}
          <select
            value={todo.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer status status--${statusColor}`}
          >
            {Object.keys(statusColors).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          {/* Priority Badge */}
          {todo.priority && (
            <span className={`text-xs px-2 py-1 rounded ${priorityBadges[todo.priority]}`}>
              {todo.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoCard;
