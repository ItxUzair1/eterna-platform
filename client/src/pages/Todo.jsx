// Todo.jsx
import React, { useState, useEffect } from 'react';
import TodoSidebar from '../modules/todo/TodoSidebar';
import TodoList from '../modules/todo/TodoList';
import TodoModal from '../modules/todo/TodoModal';
import CategoryModal from '../modules/todo/CategoryModal';
import { todoService } from '../services/todoService';
import { toast } from 'react-hot-toast';
import { Bars3Icon, PlusIcon } from '@heroicons/react/24/outline';

const Todo = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [selectedTodos, setSelectedTodos] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchTodos();
  }, [selectedCategory, selectedStatus]);

  const fetchCategories = async () => {
    try {
      const response = await todoService.getCategories();
      const data = response || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load categories');
      setCategories([]);
    }
  };

  const fetchTodos = async () => {
    setLoading(true);
    try {
      const response = await todoService.getTodos({
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });
      const data = response || [];
      setTodos(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load tasks');
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const openNewTask = () => setShowTodoModal(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Top bar for mobile */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
            <Bars3Icon className="w-6 h-6 text-slate-700" />
          </button>
          <div className="text-lg font-bold text-slate-900">Tasks</div>
          <button onClick={openNewTask} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white">
            <PlusIcon className="w-5 h-5" /> New
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <TodoSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            selectedStatus={selectedStatus}
            onCategorySelect={setSelectedCategory}
            onStatusSelect={setSelectedStatus}
            onCreateCategory={() => setShowCategoryModal(true)}
            todoCount={Array.isArray(todos) ? todos.length : 0}
          />
        </div>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setSidebarOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85%] bg-white shadow-2xl">
              <TodoSidebar
                categories={categories}
                selectedCategory={selectedCategory}
                selectedStatus={selectedStatus}
                onCategorySelect={(v) => { setSelectedCategory(v); setSidebarOpen(false); }}
                onStatusSelect={(v) => { setSelectedStatus(v); setSidebarOpen(false); }}
                onCreateCategory={() => { setShowCategoryModal(true); setSidebarOpen(false); }}
                todoCount={Array.isArray(todos) ? todos.length : 0}
              />
            </div>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 overflow-hidden">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {/* Desktop header */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {Array.isArray(todos) ? todos.length : 0} {todos?.length === 1 ? 'task' : 'tasks'}
                </p>
              </div>
              <button id="newTaskBtn" onClick={openNewTask} className="btn btn--primary px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500">
                Create New Task
              </button>
            </div>
            {/* Bulk actions bar */}
{Array.isArray(selectedTodos) && selectedTodos.length > 0 && (
  <div className="sticky top-2 z-20 mb-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 backdrop-blur px-3 sm:px-4 py-2.5 shadow-sm">
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <span className="text-sm font-medium text-indigo-800">
        {selectedTodos.length} selected
      </span>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={async () => {
            try {
              await todoService.bulkUpdateStatus(selectedTodos, 'Completed');
              toast.success('Tasks marked as completed');
              setSelectedTodos([]);
              fetchTodos();
            } catch {
              toast.error('Failed to update tasks');
            }
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
        >
          Mark Complete
        </button>

        <button
          onClick={async () => {
            if (!window.confirm(`Delete ${selectedTodos.length} selected tasks?`)) return;
            try {
              await todoService.bulkDelete(selectedTodos);
              toast.success('Tasks deleted successfully');
              setSelectedTodos([]);
              fetchTodos();
            } catch {
              toast.error('Failed to delete tasks');
            }
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50"
        >
          Delete Selected
        </button>
      </div>

      <button
        onClick={() => setSelectedTodos([])}
        className="sm:ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
      >
        Clear
      </button>
    </div>
  </div>
)}

            

            <TodoList
              todos={todos}
              categories={categories}
              loading={loading}
              selectedTodos={selectedTodos}
              onSelectTodo={(id) =>
                setSelectedTodos((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
              }
              onSelectAll={() =>
                setSelectedTodos((p) => (p.length === todos.length ? [] : todos.map((t) => t.id)))
              }
              onEdit={(todo) => { setEditingTodo(todo); setShowTodoModal(true); }}
              onDelete={async (id) => {
                try { await todoService.deleteTodo(id); toast.success('Task deleted'); fetchTodos(); } catch { toast.error('Delete failed'); }
              }}
              onStatusChange={async (id, status) => {
                try { await todoService.updateTodo(id, { status }); toast.success('Status updated'); fetchTodos(); } catch { toast.error('Update failed'); }
              }}
            />
          </div>
        </main>
      </div>

      {/* Modals */}
      {showTodoModal && (
        <TodoModal
          todo={editingTodo}
          categories={categories}
          onClose={() => { setShowTodoModal(false); setEditingTodo(null); }}
          onSubmit={async (...args) => { await (editingTodo ? todoService.updateTodo(...args) : todoService.createTodo(args[0])); fetchTodos(); setShowTodoModal(false); setEditingTodo(null); }}
        />
      )}
      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSubmit={async (payload) => { await todoService.createCategory(payload); fetchCategories(); setShowCategoryModal(false); }}
        />
      )}
    </div>
  );
};

export default Todo;
