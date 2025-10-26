import React from 'react';
import TodoCard from './TodoCard';

const TodoList = ({
  todos,
  categories,
  loading,
  selectedTodos,
  onSelectTodo,
  onSelectAll,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const statusTabs = ['All Tasks', 'Pending', 'In Progress', 'Completed'];
  const [activeTab, setActiveTab] = React.useState('All Tasks');

  const filteredTodos = React.useMemo(() => {
    if (activeTab === 'All Tasks') return todos;
    return todos.filter(todo => todo.status === activeTab);
  }, [todos, activeTab]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Status Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {statusTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Select All */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="checkbox"
          checked={selectedTodos.length === todos.length && todos.length > 0}
          onChange={onSelectAll}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="text-sm text-gray-600">Select All</span>
        <span className="text-xs text-gray-400 ml-auto">
          {filteredTodos.length} {filteredTodos.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Task Grid */}
      {filteredTodos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-gray-500">No tasks found</p>
          <p className="text-sm text-gray-400 mt-1">
            Create your first task to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTodos.map(todo => (
            <TodoCard
              key={todo.id}
              todo={todo}
              category={categories.find(c => c.id === todo.categoryId)}
              isSelected={selectedTodos.includes(todo.id)}
              onSelect={() => onSelectTodo(todo.id)}
              onEdit={() => onEdit(todo)}
              onDelete={() => onDelete(todo.id)}
              onStatusChange={(status) => onStatusChange(todo.id, status)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TodoList;
