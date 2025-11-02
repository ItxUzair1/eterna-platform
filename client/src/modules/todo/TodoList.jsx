import React from 'react';
import TodoCard from './TodoCard';

const TABS = ['All Tasks', 'Pending', 'In Progress', 'Completed'];

const TodoList = ({ todos, categories, loading, selectedTodos, onSelectTodo, onSelectAll, onEdit, onDelete, onStatusChange }) => {
  const [activeTab, setActiveTab] = React.useState('All Tasks');

  const filtered = React.useMemo(() => (activeTab === 'All Tasks' ? todos : todos.filter((t) => t.status === activeTab)), [todos, activeTab]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-72">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {(onEdit || onDelete) && (
        <div className="flex items-center gap-3 mb-4">
          <input type="checkbox" checked={selectedTodos.length === todos.length && todos.length > 0} onChange={onSelectAll} className="w-4 h-4 rounded border-slate-300" />
          <span className="text-sm text-slate-600">Select All</span>
          <span className="text-xs text-slate-400 ml-auto">
            {filtered.length} {filtered.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">🗂️</div>
          <p className="text-slate-600">No tasks found</p>
          <p className="text-sm text-slate-400 mt-1">Create your first task to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              category={categories.find((c) => c.id === todo.categoryId)}
              isSelected={onSelectTodo ? selectedTodos.includes(todo.id) : false}
              onSelect={onSelectTodo ? () => onSelectTodo(todo.id) : undefined}
              onEdit={onEdit ? () => onEdit(todo) : undefined}
              onDelete={onDelete ? () => onDelete(todo.id) : undefined}
              onStatusChange={onStatusChange ? (status) => onStatusChange(todo.id, status) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TodoList;
