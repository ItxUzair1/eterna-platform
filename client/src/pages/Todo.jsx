import React, { useState, useEffect } from 'react';
import TodoSidebar from '../modules/todo/TodoSidebar';
import TodoList from '../modules/todo/TodoList';
import TodoModal from '../modules/todo/TodoModal';
import CategoryModal from '../modules/todo/CategoryModal';
import { todoService } from '../services/todoService';
import { toast } from 'react-hot-toast';

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

  useEffect(() => {
    fetchCategories();
    fetchTodos();
  }, [selectedCategory, selectedStatus]);

  const fetchCategories = async () => {
    try {
      const response = await todoService.getCategories();
      const data = response?.data || [];
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

      const data = response?.data || [];
      setTodos(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load tasks');
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTodo = async (todoData) => {
    try {
      await todoService.createTodo(todoData);
      toast.success('Task created successfully');
      setShowTodoModal(false);
      fetchTodos();
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTodo = async (id, todoData) => {
    try {
      await todoService.updateTodo(id, todoData);
      toast.success('Task updated successfully');
      setShowTodoModal(false);
      setEditingTodo(null);
      fetchTodos();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTodo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await todoService.deleteTodo(id);
      toast.success('Task deleted successfully');
      fetchTodos();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedTodos.length} selected tasks?`)) return;

    try {
      await todoService.bulkDelete(selectedTodos);
      toast.success('Tasks deleted successfully');
      setSelectedTodos([]);
      fetchTodos();
    } catch (error) {
      toast.error('Failed to delete tasks');
    }
  };

  const handleBulkComplete = async () => {
    try {
      await todoService.bulkUpdateStatus(selectedTodos, 'Completed');
      toast.success('Tasks marked as completed');
      setSelectedTodos([]);
      fetchTodos();
    } catch (error) {
      toast.error('Failed to update tasks');
    }
  };

  const handleCreateCategory = async (categoryData) => {
    try {
      await todoService.createCategory(categoryData);
      toast.success('Category created successfully');
      setShowCategoryModal(false);
      fetchCategories();
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <TodoSidebar
        categories={categories || []}
        selectedCategory={selectedCategory}
        selectedStatus={selectedStatus}
        onCategorySelect={setSelectedCategory}
        onStatusSelect={setSelectedStatus}
        onCreateCategory={() => setShowCategoryModal(true)}
        todoCount={Array.isArray(todos) ? todos.length : 0}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Tasks</h1>
              <p className="text-sm text-gray-500 mt-1">
                {Array.isArray(todos) ? todos.length : 0}{' '}
                {todos?.length === 1 ? 'task' : 'tasks'}
              </p>
            </div>
            <button
              onClick={() => setShowTodoModal(true)}
              className="btn btn--primary flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              Create New Task
            </button>
          </div>

          {/* Bulk Actions */}
          {Array.isArray(selectedTodos) && selectedTodos.length > 0 && (
            <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <span className="text-sm text-blue-700 font-medium">
                {selectedTodos.length} selected
              </span>
              <button
                onClick={handleBulkComplete}
                className="btn btn--sm btn--secondary"
              >
                Mark Complete
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn btn--sm btn--outline text-red-600 border-red-300 hover:bg-red-50"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedTodos([])}
                className="btn btn--sm btn--outline ml-auto"
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Task List */}
          <TodoList
            todos={Array.isArray(todos) ? todos : []}
            categories={Array.isArray(categories) ? categories : []}
            loading={loading}
            selectedTodos={Array.isArray(selectedTodos) ? selectedTodos : []}
            onSelectTodo={(id) => {
              setSelectedTodos((prev) =>
                prev.includes(id)
                  ? prev.filter((tid) => tid !== id)
                  : [...prev, id]
              );
            }}
            onSelectAll={() => {
              setSelectedTodos(
                selectedTodos.length === todos.length ? [] : todos.map((t) => t.id)
              );
            }}
            onEdit={(todo) => {
              setEditingTodo(todo);
              setShowTodoModal(true);
            }}
            onDelete={handleDeleteTodo}
            onStatusChange={(id, status) => handleUpdateTodo(id, { status })}
          />
        </div>
      </div>

      {/* Modals */}
      {showTodoModal && (
        <TodoModal
          todo={editingTodo}
          categories={Array.isArray(categories) ? categories : []}
          onClose={() => {
            setShowTodoModal(false);
            setEditingTodo(null);
          }}
          onSubmit={editingTodo ? handleUpdateTodo : handleCreateTodo}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSubmit={handleCreateCategory}
        />
      )}
    </div>
  );
};

export default Todo;
