import React, { useEffect, useMemo, useState, useRef } from 'react';
import { usePermission } from '../modules/auth/usePermission';
import { showError, showSuccess } from '../utils/toast';
import {
  listBoards, createBoard, getBoardFull, updateBoard,
  createColumn, reorderColumns, updateColumn, deleteColumn,
  createCard, updateCard, deleteCard, moveCard, reorderCards,
  attachFile, addComment, listComments
} from '../services/kanbanService';
import { listOwnersMinimal } from '../services/userService';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ---------- Utilities ----------
const bySort = (a,b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0);
const columnContainerId = (columnId) => `column-${columnId}`;

// Color palette for labels (Trello-style)
const LABEL_COLORS = [
  { name: 'green', bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
  { name: 'yellow', bg: 'bg-yellow-400', text: 'text-gray-900', border: 'border-yellow-500' },
  { name: 'orange', bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
  { name: 'red', bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' },
  { name: 'purple', bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600' },
  { name: 'blue', bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
  { name: 'pink', bg: 'bg-pink-500', text: 'text-white', border: 'border-pink-600' },
  { name: 'gray', bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-600' },
];

// Board background colors
const BOARD_COLORS = [
  { name: 'blue', class: 'bg-gradient-to-br from-blue-500 to-blue-600' },
  { name: 'green', class: 'bg-gradient-to-br from-green-500 to-green-600' },
  { name: 'orange', class: 'bg-gradient-to-br from-orange-500 to-orange-600' },
  { name: 'red', class: 'bg-gradient-to-br from-red-500 to-red-600' },
  { name: 'purple', class: 'bg-gradient-to-br from-purple-500 to-purple-600' },
  { name: 'pink', class: 'bg-gradient-to-br from-pink-500 to-pink-600' },
  { name: 'teal', class: 'bg-gradient-to-br from-teal-500 to-teal-600' },
  { name: 'gray', class: 'bg-gradient-to-br from-gray-400 to-gray-500' },
];

// ---------- Inline Editor Component ----------
function InlineEditor({ value, placeholder, onSave, onCancel, multiline = false, className = '' }) {
  const [text, setText] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (multiline) {
        inputRef.current.select();
      } else {
        inputRef.current.setSelectionRange(0, text.length);
      }
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleSave = () => {
    if (text.trim() !== (value || '')) {
      onSave(text.trim());
    } else {
      onCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const Component = multiline ? 'textarea' : 'input';
  return (
    <Component
      ref={inputRef}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`${className} w-full px-2 py-1.5 rounded border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 ${multiline ? 'resize-none' : ''}`}
      rows={multiline ? 3 : undefined}
    />
  );
}

// ---------- Sortable Card Component ----------
function SortableCard({ card, onOpenCard, users = [] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: `card-${card.id}`,
    data: { type: 'card', cardId: card.id, fromColumnId: card.columnId }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignee = users.find(u => u.id === card.assigneeId);
  const hasDeadline = card.deadlineDate;
  const isOverdue = hasDeadline && new Date(card.deadlineDate) < new Date();
  const daysUntil = hasDeadline ? Math.ceil((new Date(card.deadlineDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;

  // Mock labels (can be stored in card metadata later)
  const labels = card.labels || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpenCard(card)}
      className={`group relative cursor-pointer select-none
        rounded-lg border border-gray-300 bg-white
        p-3 shadow-sm hover:shadow-md transition-all mb-2
        hover:border-gray-400 ${isDragging ? 'rotate-2' : ''}`}
    >
      {/* Labels */}
      {labels.length > 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {labels.map((label, idx) => {
            const color = LABEL_COLORS.find(c => c.name === label) || LABEL_COLORS[0];
            return (
              <div
                key={idx}
                className={`h-2 w-12 rounded ${color.bg} ${color.border} border`}
                title={label}
              />
            );
          })}
        </div>
      )}

      {/* Title */}
      <div className="font-medium text-gray-800 leading-snug break-words mb-2">
        {card.title}
      </div>

      {/* Description preview */}
      {card.description && (
        <div className="text-xs text-gray-500 mb-2 line-clamp-2">
          {card.description.substring(0, 100)}
          {card.description.length > 100 && '...'}
        </div>
      )}

      {/* Footer with metadata */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {/* Attachments count */}
          {card.attachments?.length > 0 && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              📎 {card.attachments.length}
            </span>
          )}
          
          {/* Comments count */}
          {card.comments?.length > 0 && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              💬 {card.comments.length}
            </span>
          )}

          {/* Deadline */}
          {hasDeadline && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              isOverdue 
                ? 'bg-red-100 text-red-700 border border-red-300' 
                : daysUntil <= 3 
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}>
              📅 {daysUntil <= 0 ? 'Overdue' : `${daysUntil}d`}
            </span>
          )}
        </div>

        {/* Assignee avatar */}
        {assignee && (
          <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-semibold border-2 border-white shadow-sm"
               title={assignee.firstName || assignee.username || assignee.email}>
            {(assignee.firstName?.[0] || assignee.username?.[0] || assignee.email?.[0] || 'U').toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Column Droppable Shell ----------
function SortableColumnShell({ columnId, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnContainerId(columnId),
    data: { type: 'column-droppable', columnId }
  });
  return (
    <div 
      ref={setNodeRef}
      className={`min-h-[100px] ${isOver ? 'bg-blue-50 rounded-lg' : ''}`}
    >
      {children}
    </div>
  );
}

// ---------- Column Component ----------
function Column({
  column,
  cards,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  onOpenCard,
  canWrite = true,
  users = []
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveTitle = (newTitle) => {
    if (newTitle && newTitle !== column.title) {
      onEditColumn?.(column.id, { title: newTitle });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDeleteColumn?.(column.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <div className="w-[272px] flex-shrink-0 bg-gray-100 rounded-lg p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2 py-1">
        {isEditing ? (
          <div className="flex-1">
            <InlineEditor
              value={column.title}
              placeholder="Column title"
              onSave={handleSaveTitle}
              onCancel={() => setIsEditing(false)}
              className="text-sm font-semibold"
            />
          </div>
        ) : (
          <>
            <h3
              onClick={() => canWrite && setIsEditing(true)}
              className={`flex-1 font-semibold text-gray-700 text-sm px-2 py-1 rounded ${
                canWrite ? 'cursor-pointer hover:bg-gray-200' : ''
              }`}
            >
              {column.title}
            </h3>
            {canWrite && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                  title="Edit column"
                >
                  ✏️
                </button>
                <button
                  onClick={handleDelete}
                  className={`p-1 rounded ${showDeleteConfirm ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                  title={showDeleteConfirm ? 'Click again to confirm' : 'Delete column'}
                >
                  {showDeleteConfirm ? '✓' : '🗑️'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Card count badge */}
      <div className="px-2 mb-2">
        <span className="text-xs text-gray-500">{cards.length} {cards.length === 1 ? 'card' : 'cards'}</span>
      </div>

      {/* Droppable container for cards */}
      <SortableColumnShell columnId={column.id}>
        <div className="space-y-0">
          <SortableContext items={cards.map(c => `card-${c.id}`)} strategy={verticalListSortingStrategy}>
            {cards.map(card => (
              <SortableCard key={card.id} card={card} onOpenCard={onOpenCard} users={users} />
            ))}
          </SortableContext>
        </div>
      </SortableColumnShell>

      {/* Add card button */}
      {canWrite && onAddCard && (
        <div className="mt-2">
          <button
            onClick={() => onAddCard(column.id)}
            className="w-full rounded-lg py-2 text-sm font-medium
                       text-gray-600 hover:text-gray-800 hover:bg-gray-200
                       transition-colors flex items-center gap-2 justify-center"
          >
            <span className="text-lg">+</span> Add a card
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Board Header Component ----------
function BoardHeader({ board, onEditBoard, canWrite, users = [] }) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [boardColor, setBoardColor] = useState(BOARD_COLORS[0]);

  if (!board) return null;

  const boardCreator = users.find(u => u.id === board.createdBy);

  return (
    <div className={`${boardColor.class} text-white p-4 rounded-t-lg`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditingTitle ? (
            <InlineEditor
              value={board.title}
              placeholder="Board title"
              onSave={(newTitle) => {
                if (newTitle && newTitle !== board.title) {
                  onEditBoard?.({ title: newTitle });
                }
                setIsEditingTitle(false);
              }}
              onCancel={() => setIsEditingTitle(false)}
              className="text-xl font-bold bg-white/90 text-gray-800"
            />
          ) : (
            <h1
              onClick={() => canWrite && setIsEditingTitle(true)}
              className={`text-xl font-bold mb-1 ${canWrite ? 'cursor-pointer hover:bg-white/10 rounded px-2 py-1 -mx-2 -my-1' : ''}`}
            >
              {board.title}
            </h1>
          )}
          {boardCreator && (
            <p className="text-sm text-white/80">
              Created by {boardCreator.firstName || boardCreator.username || boardCreator.email}
            </p>
          )}
        </div>

        {canWrite && (
          <div className="relative">
            <button
              onClick={() => setShowBoardMenu(!showBoardMenu)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Board menu"
            >
              ⚙️
            </button>
            {showBoardMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Board Color</p>
                </div>
                <div className="grid grid-cols-4 gap-2 p-2">
                  {BOARD_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => {
                        setBoardColor(color);
                        setShowBoardMenu(false);
                      }}
                      className={`h-8 rounded ${color.class} border-2 ${
                        boardColor.name === color.name ? 'border-white ring-2 ring-offset-2 ring-blue-500' : 'border-transparent'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Card Modal (Trello-style) ----------
function CardModal({ open, onClose, card, setCardState, onSave, onDelete, onAttach, comments, onAddComment, canWrite = true, users = [] }) {
  const [editingDescription, setEditingDescription] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [cardLabels, setCardLabels] = useState(card?.labels || []);

  if (!open || !card) return null;

  const assignee = users.find(u => u.id === card.assigneeId);
  const availableUsers = users.filter(u => u.isActive !== false);

  const toggleLabel = (labelName) => {
    const newLabels = cardLabels.includes(labelName)
      ? cardLabels.filter(l => l !== labelName)
      : [...cardLabels, labelName];
    setCardLabels(newLabels);
    setCardState(prev => ({ ...prev, labels: newLabels }));
  };

  const handleSave = () => {
    onSave?.();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative z-50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-start justify-between mb-2">
            {canWrite ? (
              <input
                className="flex-1 text-xl font-semibold text-gray-800 bg-transparent outline-none
                           px-2 py-1 rounded border-2 border-transparent hover:border-gray-300 focus:border-blue-500"
                value={card.title || ''}
                onChange={(e) => setCardState(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Card title"
              />
            ) : (
              <h2 className="flex-1 text-xl font-semibold text-gray-800">{card.title || 'Untitled'}</h2>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Labels */}
          <div className="flex items-center gap-2 mb-2">
            {cardLabels.length > 0 && (
              <div className="flex gap-1">
                {cardLabels.map((label, idx) => {
                  const color = LABEL_COLORS.find(c => c.name === label) || LABEL_COLORS[0];
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color.bg} ${color.text}`}
                    >
                      {label}
                      {canWrite && (
                        <button
                          onClick={() => toggleLabel(label)}
                          className="ml-1 hover:bg-black/20 rounded px-0.5"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
            {canWrite && (
              <button
                onClick={() => setShowLabels(!showLabels)}
                className="text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-2 py-1 rounded"
              >
                {cardLabels.length > 0 ? 'Edit labels' : '+ Add labels'}
              </button>
            )}
          </div>

          {/* Labels picker */}
          {showLabels && canWrite && (
            <div className="mb-2 p-2 bg-gray-50 rounded border">
              <div className="grid grid-cols-4 gap-2">
                {LABEL_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => toggleLabel(color.name)}
                    className={`h-8 rounded ${color.bg} border-2 ${
                      cardLabels.includes(color.name) ? 'border-gray-900 ring-2 ring-gray-300' : 'border-transparent'
                    } hover:ring-2 hover:ring-gray-300`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ overflowX: 'visible', position: 'relative' }}>
          {/* Description */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-700">📝 Description</span>
              {canWrite && !editingDescription && (
                <button
                  onClick={() => setEditingDescription(true)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  {card.description ? 'Edit' : 'Add description'}
                </button>
              )}
            </div>
            {editingDescription && canWrite ? (
              <div>
                <textarea
                  rows={4}
                  className="w-full border-2 border-blue-500 rounded-lg px-3 py-2 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
                  value={card.description || ''}
                  onChange={(e) => setCardState(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add a detailed description..."
                  onBlur={() => {
                    setEditingDescription(false);
                    handleSave();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingDescription(false);
                    }
                  }}
                  autoFocus
                />
                <div className="mt-1 text-xs text-gray-500">
                  Press Esc to cancel, or click outside to save
                </div>
              </div>
            ) : (
              <div
                onClick={() => canWrite && setEditingDescription(true)}
                className={`min-h-[60px] w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 ${
                  canWrite ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
              >
                {card.description || (
                  <span className="text-gray-400 italic">Add a detailed description...</span>
                )}
              </div>
            )}
          </div>

          {/* Details sidebar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assignee */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">👤 Assignee</label>
              {canWrite ? (
                <select
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                  value={card.assigneeId || ''}
                  onChange={(e) => {
                    setCardState(prev => ({ 
                      ...prev, 
                      assigneeId: e.target.value ? Number(e.target.value) : null 
                    }));
                    handleSave();
                  }}
                >
                  <option value="">Unassigned</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.firstName || user.username || user.email}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                  {assignee ? (assignee.firstName || assignee.username || assignee.email) : 'Unassigned'}
                </div>
              )}
            </div>

            {/* Deadline */}
            <div style={{ position: 'relative', zIndex: 1000 }}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">📅 Due Date</label>
              {canWrite ? (
                <div style={{ position: 'relative', overflow: 'visible' }}>
                  <input
                    type="date"
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 bg-white
                               focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500"
                    value={card.deadlineDate ? new Date(card.deadlineDate).toISOString().slice(0,10) : ''}
                    onChange={(e) => {
                      const newDate = e.target.value ? new Date(e.target.value + 'T00:00:00').toISOString() : null;
                      setCardState(prev => ({ 
                        ...prev, 
                        deadlineDate: newDate
                      }));
                    }}
                    onBlur={() => {
                      // Auto-save on blur instead of onChange to avoid interfering with date picker
                      handleSave();
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ) : (
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                  {card.deadlineDate ? new Date(card.deadlineDate).toLocaleDateString() : 'No due date'}
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📎 Attachments</label>
            {canWrite && onAttach && (
              <input
                type="file"
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.target.files?.[0]) {
                    onAttach(e.target.files[0]);
                  }
                  e.target.value = '';
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="text-sm file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0
                           file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100
                           cursor-pointer"
              />
            )}
            {card.attachments?.length > 0 && (
              <div className="mt-2 space-y-1">
                {card.attachments.map((att, idx) => (
                  <div key={idx} className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                    📄 {att.file?.originalName || 'File'}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity / Comments */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">💬 Activity</div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-start gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-semibold">
                      {(c.author?.firstName?.[0] || c.author?.username?.[0] || c.author?.email?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-700">
                        {c.author?.firstName || c.author?.username || c.author?.email || 'User'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(c.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap ml-8">{c.body}</div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="text-sm text-gray-400 italic">No comments yet.</div>
              )}
            </div>

            {canWrite && (
              <AddComment onAdd={onAddComment} />
            )}
          </div>
        </div>

        {/* Footer */}
        {canWrite && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between">
            {onDelete && (
              <button
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200
                           rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                onClick={() => {
                  if (window.confirm('Delete this card?')) {
                    onDelete();
                  }
                }}
              >
                Delete card
              </button>
            )}
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-sm transition-colors"
              onClick={handleSave}
            >
              Save changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddComment({ onAdd }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    if (text.trim()) {
      onAdd(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mt-3 flex gap-2">
      <textarea
        ref={textareaRef}
        className="flex-1 border-2 border-gray-300 rounded-lg px-3 py-2 text-sm bg-white
                   focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 resize-none"
        placeholder="Write a comment..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition-colors"
      >
        Save
      </button>
    </div>
  );
}

// ---------- Add Card Form Component ----------
function AddCardForm({ columnId, onAdd, onCancel }) {
  const [title, setTitle] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(columnId, title.trim());
      setTitle('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="p-2 bg-white rounded-lg border border-gray-300 shadow-sm">
      <textarea
        ref={inputRef}
        className="w-full border-2 border-blue-500 rounded-lg px-3 py-2 text-sm bg-white
                   focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none mb-2"
        placeholder="Enter a title for this card..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition-colors"
        >
          Add card
        </button>
        <button
          onClick={onCancel}
          className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------- Main Kanban Component ----------
export default function Kanban() {
  const { allowed: canWrite } = usePermission("kanban", "write");
  
  // Boards
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [activeBoard, setActiveBoard] = useState(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [showNewBoardForm, setShowNewBoardForm] = useState(false);

  // Active board data
  const [boardData, setBoardData] = useState(null);

  // Card modal
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [activeCardComments, setActiveCardComments] = useState([]);

  // Users for assignees
  const [users, setUsers] = useState([]);

  // Column editing states
  const [addingCardToColumn, setAddingCardToColumn] = useState(null);

  // Load boards and users
  useEffect(() => {
    listBoards().then(r => setBoards(r.data));
    listOwnersMinimal().then(setUsers).catch(() => setUsers([]));
  }, []);

  // Load selected board
  useEffect(() => {
    if (activeBoardId) {
      getBoardFull(activeBoardId).then(r => {
        setBoardData(r.data);
        setActiveBoard(r.data);
      });
    } else {
      setBoardData(null);
      setActiveBoard(null);
    }
  }, [activeBoardId]);

  const columns = useMemo(() => (boardData?.columns || []).slice().sort(bySort), [boardData]);
  const cardsByColumn = useMemo(() => {
    const map = {};
    (boardData?.cards || []).forEach(c => {
      if (!map[c.columnId]) map[c.columnId] = [];
      map[c.columnId].push(c);
    });
    Object.keys(map).forEach(k => map[k].sort(bySort));
    return map;
  }, [boardData]);

  // Create Board
  const handleCreateBoard = async () => {
    const title = newBoardTitle.trim();
    if (!title) return;
    try {
      const { data } = await createBoard({ title });
      setBoards(prev => [data, ...prev]);
      setActiveBoardId(data.id);
      setNewBoardTitle('');
      setShowNewBoardForm(false);
    } catch (err) {
      showError('Failed to create board');
    }
  };

  // Edit Board
  const handleEditBoard = async (updates) => {
    if (!activeBoardId) return;
    try {
      await updateBoard(activeBoardId, updates);
      setActiveBoard(prev => ({ ...prev, ...updates }));
      setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, ...updates } : b));
    } catch (err) {
      showError('Failed to update board');
    }
  };

  // Columns
  const handleAddColumn = async () => {
    if (!activeBoardId) return;
    const title = prompt('Column title?');
    if (!title || !title.trim()) return;
    try {
      const response = await createColumn({ boardId: activeBoardId, title: title.trim() });
      const newColumn = response.data || response; // Handle both response formats
      // Reload the board to ensure consistency
      const boardResponse = await getBoardFull(activeBoardId);
      setBoardData(boardResponse.data);
      setActiveBoard(boardResponse.data);
    } catch (err) {
      console.error('Failed to create column:', err);
      showError(err?.response?.data?.error || 'Failed to create column');
    }
  };

  const handleEditColumn = async (columnId, payload) => {
    try {
      await updateColumn(columnId, payload);
      setBoardData(prev => ({
        ...prev,
        columns: prev.columns.map(c => c.id === columnId ? { ...c, ...payload } : c)
      }));
    } catch (err) {
      showError('Failed to update column');
    }
  };

  const handleDeleteColumn = async (columnId) => {
    if (!window.confirm('Delete column and all its cards?')) return;
    try {
      await deleteColumn(columnId);
      setBoardData(prev => ({
        ...prev,
        columns: prev.columns.filter(c => c.id !== columnId),
        cards: prev.cards.filter(cd => cd.columnId !== columnId)
      }));
    } catch (err) {
      showError('Failed to delete column');
    }
  };

  // Reorder columns
  const sensorsCols = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const onColumnsDragEnd = async (e) => {
    const { active, over } = e;
    if (!active || !over || active.id === over.id) return;

    const ordered = [...columns];
    const fromIndex = ordered.findIndex(c => `col-${c.id}` === active.id || c.id === active.id);
    const toIndex = ordered.findIndex(c => `col-${c.id}` === over.id || c.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;

    const newOrder = arrayMove(ordered, fromIndex, toIndex);
    setBoardData(prev => ({ ...prev, columns: newOrder }));
    try {
      await reorderColumns({ boardId: activeBoardId, orderedIds: newOrder.map(c => c.id) });
    } catch (err) {
      showError('Failed to reorder columns');
    }
  };

  // Card drag handlers
  const onCardDragOverBoard = (event) => {
    const { active, over } = event;
    if (!active || !over) return;

    const a = active.data?.current;
    const overData = over.data?.current;
    if (!a || a.type !== 'card') return;

    let toColumnId = null;

    if (overData?.type === 'column-droppable') {
      toColumnId = overData.columnId;
    } else {
      const overCardId = String(over.id).startsWith('card-') ? Number(String(over.id).replace('card-', '')) : null;
      if (overCardId) {
        const overCard = (boardData?.cards || []).find(c => c.id === overCardId);
        if (overCard) toColumnId = overCard.columnId;
      }
    }

    if (!toColumnId) return;
    const fromColumnId = a.fromColumnId;
    if (toColumnId === fromColumnId) return;

    const cardId = a.cardId;
    setBoardData(prev => {
      const next = { ...prev, cards: [...prev.cards] };
      const card = next.cards.find(c => c.id === cardId);
      if (!card || card.columnId === toColumnId) return next;
      const without = next.cards.filter(c => c.id !== cardId);
      return { ...next, cards: [...without, { ...card, columnId: toColumnId }] };
    });
  };

  const onCardDragEndBoard = async (event) => {
    const { active, over } = event;
    if (!active || !over) return;

    const a = active.data?.current;
    const overData = over.data?.current;
    if (!a || a.type !== 'card') return;

    const activeIdNum = a.cardId;
    let dropColumnId = null;
    let overCardIdNum = null;

    if (overData?.type === 'column-droppable') {
      dropColumnId = overData.columnId;
    } else if (String(over.id).startsWith('card-')) {
      overCardIdNum = Number(String(over.id).replace('card-', ''));
      const overCard = (boardData?.cards || []).find(x => x.id === overCardIdNum);
      dropColumnId = overCard?.columnId ?? a.fromColumnId;
    }

    if (!dropColumnId) return;

    if (dropColumnId === a.fromColumnId) {
      // same-column reorder
      const list = (boardData?.cards || []).filter(c => c.columnId === dropColumnId);
      const ids = list.map(c => c.id);
      const fromIndex = ids.indexOf(activeIdNum);
      const toIndex = overCardIdNum ? ids.indexOf(overCardIdNum) : ids.length - 1;
      if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
        const newOrderIds = arrayMove(ids, fromIndex, toIndex);
        const ordered = newOrderIds.map(id => list.find(c => c.id === id)).filter(Boolean);
        setBoardData(prev => ({
          ...prev,
          cards: [
            ...prev.cards.filter(c => c.columnId !== dropColumnId),
            ...ordered
          ]
        }));
        try {
          await reorderCards({ columnId: dropColumnId, orderedIds: newOrderIds });
        } catch (err) {
          showError('Failed to reorder cards');
        }
      }
      return;
    }

    // cross-column move
    const targetList = (boardData?.cards || []).filter(c => c.columnId === dropColumnId).sort(bySort);
    let toIndex = targetList.length;
    if (overCardIdNum) {
      const i = targetList.findIndex(x => x.id === overCardIdNum);
      if (i >= 0) toIndex = i;
    }
    try {
      await moveCard({ cardId: activeIdNum, toColumnId: dropColumnId, toIndex });
      const { data } = await getBoardFull(activeBoardId);
      setBoardData(data);
    } catch (err) {
      showError('Failed to move card');
    }
  };

  // Card Modal
  const openCard = async (card) => {
    setActiveCard({ ...card });
    setModalOpen(true);
    try {
      const { data } = await listComments(card.id);
      setActiveCardComments(data);
    } catch (err) {
      setActiveCardComments([]);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveCard(null);
    setActiveCardComments([]);
  };

  // Cards: create
  const handleAddCard = async (columnId, title) => {
    if (!activeBoardId || !title) return;
    try {
      const { data } = await createCard({ boardId: activeBoardId, columnId, title });
      setBoardData(prev => ({ ...prev, cards: [...(prev?.cards || []), data] }));
      setAddingCardToColumn(null);
    } catch (err) {
      showError('Failed to create card');
    }
  };

  // Save/Delete card
  const saveCard = async () => {
    if (!activeCard) return;
    const payload = {
      title: activeCard.title,
      description: activeCard.description,
      deadlineDate: activeCard.deadlineDate,
      assigneeId: activeCard.assigneeId
    };
    try {
      await updateCard(activeCard.id, payload);
      setBoardData(prev => ({
        ...prev,
        cards: prev.cards.map(c => c.id === activeCard.id ? { ...c, ...payload } : c)
      }));
      closeModal();
    } catch (err) {
      showError('Failed to save card');
    }
  };

  const deleteActiveCard = async () => {
    if (!activeCard || !window.confirm('Delete this card?')) return;
    try {
      await deleteCard(activeCard.id);
      setBoardData(prev => ({ ...prev, cards: prev.cards.filter(c => c.id !== activeCard.id) }));
      closeModal();
    } catch (err) {
      showError('Failed to delete card');
    }
  };

  // Attachments & Comments
  const attachToActiveCard = async (file) => {
    if (!activeCard) return;
    try {
      await attachFile({ cardId: activeCard.id, file });
      const { data } = await getBoardFull(activeBoardId);
      setBoardData(data);
      setActiveCard(data.cards.find(c => c.id === activeCard.id));
    } catch (err) {
      showError('Failed to attach file');
    }
  };

  const addCommentToActiveCard = async (text) => {
    if (!activeCard) return;
    try {
      const { data } = await addComment({ cardId: activeCard.id, body: text });
      setActiveCardComments(prev => [...prev, data]);
      setBoardData(prev => ({
        ...prev,
        cards: prev.cards.map(c => 
          c.id === activeCard.id 
            ? { ...c, comments: [...(c.comments || []), data] }
            : c
        )
      }));
    } catch (err) {
      showError('Failed to add comment');
    }
  };

  const sensorsCards = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  return (
    <div className="w-full h-[calc(100vh-56px)] flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              className="border border-gray-300 bg-white rounded-lg px-4 py-2 text-sm shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[200px]"
              value={activeBoardId || ''}
              onChange={(e) => setActiveBoardId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="" disabled>Select a board</option>
              {boards.map(b => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>

            {showNewBoardForm ? (
              <div className="flex items-center gap-2">
                <input
                  className="border border-gray-300 bg-white rounded-lg px-3 py-2 text-sm shadow-sm 
                             focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
                  placeholder="Board title"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateBoard();
                    if (e.key === 'Escape') {
                      setShowNewBoardForm(false);
                      setNewBoardTitle('');
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={handleCreateBoard}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewBoardForm(false);
                    setNewBoardTitle('');
                  }}
                  className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              canWrite && (
                <button
                  onClick={() => setShowNewBoardForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition-colors"
                >
                  + Create Board
                </button>
              )
            )}
          </div>

          {activeBoardId && canWrite && (
            <button
              onClick={handleAddColumn}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition-colors"
            >
              + Add Column
            </button>
          )}
        </div>
      </div>

      {/* Board Header */}
      {activeBoard && (
        <BoardHeader 
          board={activeBoard} 
          onEditBoard={handleEditBoard}
          canWrite={canWrite}
          users={users}
        />
      )}

      {/* Kanban Canvas */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="px-4 py-4 inline-block min-w-full">
          {!activeBoardId ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No board selected</div>
              <div className="text-gray-400 text-sm">Select a board from the dropdown or create a new one</div>
            </div>
          ) : columns.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No columns yet</div>
              {canWrite && (
                <button
                  onClick={handleAddColumn}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
                >
                  + Add your first column
                </button>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensorsCols}
              collisionDetection={closestCenter}
              onDragEnd={onColumnsDragEnd}
            >
              <SortableContext items={columns.map(c => `col-${c.id}`)}>
                <DndContext
                  sensors={sensorsCards}
                  collisionDetection={closestCenter}
                  onDragOver={onCardDragOverBoard}
                  onDragEnd={onCardDragEndBoard}
                >
                  <div className="flex items-start gap-4">
                    {columns.map(col => (
                      <div key={col.id} id={`col-${col.id}`}>
                        <Column
                          column={col}
                          cards={(cardsByColumn[col.id] || [])}
                          onAddCard={canWrite ? (colId) => setAddingCardToColumn(colId) : undefined}
                          onEditColumn={canWrite ? handleEditColumn : undefined}
                          onDeleteColumn={canWrite ? handleDeleteColumn : undefined}
                          onOpenCard={openCard}
                          canWrite={canWrite}
                          users={users}
                        />
                        {addingCardToColumn === col.id && (
                          <div className="mt-2">
                            <AddCardForm
                              columnId={col.id}
                              onAdd={handleAddCard}
                              onCancel={() => setAddingCardToColumn(null)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </DndContext>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Card Modal */}
      <CardModal
        open={modalOpen}
        onClose={closeModal}
        card={activeCard}
        setCardState={setActiveCard}
        onSave={canWrite ? saveCard : undefined}
        onDelete={canWrite ? deleteActiveCard : undefined}
        onAttach={canWrite ? attachToActiveCard : undefined}
        comments={activeCardComments}
        onAddComment={addCommentToActiveCard}
        canWrite={canWrite}
        users={users}
      />
    </div>
  );
}
