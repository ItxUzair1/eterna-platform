import React, { useEffect, useMemo, useState } from 'react';
import { usePermission } from '../modules/auth/usePermission';
import {
  listBoards, createBoard, getBoardFull,
  createColumn, reorderColumns, updateColumn, deleteColumn,
  createCard, updateCard, deleteCard, moveCard, reorderCards,
  attachFile, addComment, listComments
} from '../services/kanbanService';

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

// ---------- Small utilities ----------
const bySort = (a,b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0);
const columnContainerId = (columnId) => `column-${columnId}`;

// ---------- Sortable Card ----------
function SortableCard({ card, onOpenCard }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({
    id: `card-${card.id}`,
    data: { type: 'card', cardId: card.id, fromColumnId: card.columnId }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={()=> onOpenCard(card)}
      className={`group relative cursor-grab select-none
        rounded-xl border border-slate-200 bg-white/95 backdrop-blur
        p-3 shadow-sm hover:shadow-md transition
        ring-0 hover:ring-2 hover:ring-indigo-200
        after:absolute after:inset-y-0 after:left-0 after:w-1.5 after:rounded-l-xl after:bg-indigo-400/70`}
    >
      {/* Title */}
      <div className="font-semibold text-slate-800 leading-snug break-words">
        {card.title}
      </div>

      {/* Meta row */}
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        {card.deadlineDate && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            ⏰ {new Date(card.deadlineDate).toLocaleDateString()}
          </span>
        )}
        {/* You can add assignee chip here later if you want */}
      </div>

      {/* Subtle grab handle hint on hover */}
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition text-slate-400">
        ⋮⋮
      </div>
    </div>
  );
}
// ---------- Column droppable shell ----------
function SortableColumnShell({ columnId, children }) {
  const { setNodeRef } = useDroppable({
    id: columnContainerId(columnId),
    data: { type: 'column-droppable', columnId }
  });
  return <div ref={setNodeRef}>{children}</div>;
}

// ---------- Column ----------
function Column({
  column,
  cards,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  onOpenCard,
  canWrite = true
}) {
  return (
    <div
      className="
        w-[18rem] sm:w-80 min-w-[18rem]
        rounded-2xl border border-slate-200 bg-white/90 backdrop-blur
        shadow-md hover:shadow-lg transition-shadow
      "
    >
      {/* Header - sticky inside column */}
      <div className="sticky top-0 z-10 -mx-3 px-3 pt-3 pb-2 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between">
        {canWrite ? (
          <>
            <input
              className="flex-1 font-semibold text-slate-800 bg-transparent outline-none px-1 rounded
                         hover:bg-slate-50 focus:ring-2 focus:ring-indigo-300"
              defaultValue={column.title}
              onBlur={(e)=> onEditColumn?.(column.id, { title: e.target.value })}
            />
            <button
              onClick={()=> onDeleteColumn?.(column.id)}
              className="ml-2 inline-flex items-center text-xs px-2 py-1 rounded-md text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
              title="Delete column"
            >
              Delete
            </button>
          </>
        ) : (
          <span className="flex-1 font-semibold text-slate-800">{column.title}</span>
        )}
      </div>

      {/* Droppable container for cards */}
      <SortableColumnShell columnId={column.id}>
        <div className="p-3">
          <SortableContext items={cards.map(c => `card-${c.id}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {cards.map(card => (
                <SortableCard key={card.id} card={card} onOpenCard={onOpenCard} />
              ))}
            </div>
          </SortableContext>
        </div>
      </SortableColumnShell>

      {/* Column footer action */}
      {canWrite && onAddCard && (
        <div className="px-3 pb-3">
          <button
            onClick={()=> onAddCard(column.id)}
            className="w-full rounded-xl py-2 text-sm font-semibold
                       text-indigo-700 bg-indigo-50 hover:bg-indigo-100
                       border border-indigo-200 shadow-sm active:scale-[.99] transition"
          >
            + Add card
          </button>
        </div>
      )}
    </div>
  );
}
// ---------- Card Modal (scroll constrained) ----------
function CardModal({ open, onClose, card, setCardState, onSave, onDelete, onAttach, comments, onAddComment, canWrite = true }) {
  if (!open || !card) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white/95 backdrop-blur w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur p-4 border-b border-slate-200 shadow-sm flex items-center gap-3">
          {canWrite ? (
            <input
              className="flex-1 text-xl font-semibold text-slate-800 bg-transparent outline-none
                         px-2 py-1 rounded-md focus:ring-2 focus:ring-indigo-300"
              value={card.title || ''}
              onChange={(e)=> setCardState(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Card title"
            />
          ) : (
            <h2 className="flex-1 text-xl font-semibold text-slate-800">{card.title || 'Untitled'}</h2>
          )}
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md px-2.5 py-1.5
                       text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition"
            aria-label="Close"
            title="Close"
          >
            ✖
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            {canWrite ? (
              <textarea
                rows={8}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white
                           focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y overflow-auto"
                value={card.description || ''}
                onChange={(e)=> setCardState(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add a detailed description..."
              />
            ) : (
              <div className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 min-h-[8rem]">
                {card.description || 'No description'}
              </div>
            )}
          </div>

          {/* Two-column inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
              {canWrite ? (
                <input
                  type="date"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={card.deadlineDate ? new Date(card.deadlineDate).toISOString().slice(0,10) : ''}
                  onChange={(e)=> setCardState(prev => ({ ...prev, deadlineDate: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                />
              ) : (
                <div className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700">
                  {card.deadlineDate ? new Date(card.deadlineDate).toLocaleDateString() : 'No deadline'}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assignee (userId)</label>
              {canWrite ? (
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white
                             focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={card.assigneeId || ''}
                  onChange={(e)=> setCardState(prev => ({ ...prev, assigneeId: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="Enter user id"
                />
              ) : (
                <div className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700">
                  {card.assigneeId || 'Unassigned'}
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Attachments</label>
            {canWrite && onAttach && (
              <input
                type="file"
                onChange={(e)=> e.target.files?.[0] && onAttach(e.target.files[0])}
                className="text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0
                           file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            )}
            {card.attachments?.length > 0 && (
              <div className="mt-2 text-sm text-slate-600">
                {card.attachments.length} file(s) linked
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <div className="text-sm font-semibold text-slate-700 mb-2">Comments</div>
            <ul className="space-y-3">
              {comments.map(c => (
                <li key={c.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{c.body}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    by {c.author?.username || c.author?.email || 'User'} • {new Date(c.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
              {comments.length === 0 && (
                <li className="text-sm text-slate-400">No comments yet.</li>
              )}
            </ul>

            {canWrite && <AddComment onAdd={onAddComment} />}
          </div>
        </div>

        {/* Footer */}
        {canWrite && (onDelete || onSave) && (
          <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur p-4 border-t border-slate-200 shadow-sm flex items-center justify-between">
            {onDelete && (
              <button
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200
                           rounded-lg px-3 py-2 text-sm font-semibold transition"
                onClick={onDelete}
              >
                Delete card
              </button>
            )}
            {onSave && (
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl shadow-sm"
                onClick={onSave}
              >
                Save changes
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AddComment({ onAdd }) {
  const [text, setText] = useState('');
  return (
    <div className="mt-3 flex gap-2">
      <input
        className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white
                   focus:outline-none focus:ring-2 focus:ring-indigo-300"
        placeholder="Write a comment..."
        value={text}
        onChange={(e)=> setText(e.target.value)}
      />
      <button
        onClick={()=> { if (text.trim()) { onAdd(text); setText(''); } }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-2 rounded-xl text-sm shadow-sm"
      >
        Add
      </button>
    </div>
  );
}

// ---------- Main Page ----------
export default function Kanban() {
  const { allowed: canWrite } = usePermission("kanban", "write");
  // Boards
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  // Active board payload: { columns[], cards[] }
  const [boardData, setBoardData] = useState(null);

  // Card modal
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [activeCardComments, setActiveCardComments] = useState([]);

  // Load boards once
  useEffect(() => { listBoards().then(r => setBoards(r.data)); }, []);

  // Load selected board
  useEffect(() => {
    if (activeBoardId) getBoardFull(activeBoardId).then(r => setBoardData(r.data));
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
    const { data } = await createBoard({ title });
    setBoards(prev => [data, ...prev]);
    setActiveBoardId(data.id);
    setNewBoardTitle('');
  };

  // Columns
  const handleAddColumn = async () => {
    if (!activeBoardId) return;
    const title = prompt('Column title?');
    if (!title) return;
    const { data } = await createColumn({ boardId: activeBoardId, title });
    setBoardData(prev => ({ ...prev, columns: [...(prev?.columns||[]), data] }));
  };

  const handleEditColumn = async (columnId, payload) => {
    await updateColumn(columnId, payload);
    setBoardData(prev => ({
      ...prev,
      columns: prev.columns.map(c => c.id === columnId ? { ...c, ...payload } : c)
    }));
  };

  const handleDeleteColumn = async (columnId) => {
    if (!confirm('Delete column and its cards?')) return;
    await deleteColumn(columnId);
    setBoardData(prev => ({
      ...prev,
      columns: prev.columns.filter(c => c.id !== columnId),
      cards: prev.cards.filter(cd => cd.columnId !== columnId)
    }));
  };

  // Reorder columns
  const sensorsCols = useSensors(useSensor(PointerSensor));
  const onColumnsDragEnd = async (e) => {
    const { active, over } = e;
    if (!active || !over || active.id === over.id) return;

    const ordered = [...columns];
    const fromIndex = ordered.findIndex(c => `col-${c.id}` === active.id || c.id === active.id);
    const toIndex = ordered.findIndex(c => `col-${c.id}` === over.id || c.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;

    const newOrder = arrayMove(ordered, fromIndex, toIndex);
    setBoardData(prev => ({ ...prev, columns: newOrder }));
    await reorderColumns({ boardId: activeBoardId, orderedIds: newOrder.map(c => c.id) });
  };

  // Helpers for optimistic cross-column moves
  const setCardsForColumns = (updater) => {
    setBoardData(prev => {
      const next = { ...prev, cards: [...prev.cards] };
      next.cards = updater(next.cards);
      return next;
    });
  };

  // Cross-column drag-over feedback (optimistic)
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
    setCardsForColumns(cards => {
      const card = cards.find(c => c.id === cardId);
      if (!card) return cards;
      if (card.columnId === toColumnId) return cards;
      const without = cards.filter(c => c.id !== cardId);
      return [...without, { ...card, columnId: toColumnId }];
    });
  };

  // Cards: same-column reorder or cross-column move commit
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
        await reorderCards({ columnId: dropColumnId, orderedIds: newOrderIds });
      }
      return;
    }

    // cross-column move
    const targetList = (boardData?.cards || []).filter(c => c.columnId === dropColumnId).sort(bySort);
    let toIndex = targetList.length; // append by default
    if (overCardIdNum) {
      const i = targetList.findIndex(x => x.id === overCardIdNum);
      if (i >= 0) toIndex = i;
    }
    await moveCard({ cardId: activeIdNum, toColumnId: dropColumnId, toIndex });
    const { data } = await getBoardFull(activeBoardId);
    setBoardData(data);
  };

  // Card Modal open/close
  const openCard = async (card) => {
    setActiveCard(card);
    setModalOpen(true);
    const { data } = await listComments(card.id);
    setActiveCardComments(data);
  };
  const closeModal = () => { setModalOpen(false); setActiveCard(null); setActiveCardComments([]); };

  // Cards: create a new card in a column
const handleAddCard = async (columnId) => {
  const title = prompt('Card title?');
  if (!title) return;
  const { data } = await createCard({ boardId: activeBoardId, columnId, title });
  setBoardData(prev => ({ ...prev, cards: [...prev.cards, data] }));
};


  // Save/Delete card
  const saveCard = async () => {
    const payload = {
      title: activeCard.title,
      description: activeCard.description,
      deadlineDate: activeCard.deadlineDate,
      assigneeId: activeCard.assigneeId
    };
    await updateCard(activeCard.id, payload);
    setBoardData(prev => ({
      ...prev,
      cards: prev.cards.map(c => c.id === activeCard.id ? { ...c, ...payload } : c)
    }));
    closeModal();
  };
  const deleteActiveCard = async () => {
    if (!confirm('Delete this card?')) return;
    await deleteCard(activeCard.id);
    setBoardData(prev => ({ ...prev, cards: prev.cards.filter(c => c.id !== activeCard.id) }));
    closeModal();
  };

  // Attachments & Comments
  const attachToActiveCard = async (file) => {
    await attachFile({ cardId: activeCard.id, file });
    const { data } = await getBoardFull(activeBoardId);
    setBoardData(data);
  };
  const addCommentToActiveCard = async (text) => {
    const { data } = await addComment({ cardId: activeCard.id, body: text });
    setActiveCardComments(prev => [...prev, data]);
  };

  // Sensors for card DnD
  const sensorsCards = useSensors(useSensor(PointerSensor));
return (
  <div className="w-full h-[calc(100vh-56px)] flex bg-gradient-to-b from-slate-50 to-slate-100">
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
          <select
            className="min-w-[200px] border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={activeBoardId || ''}
            onChange={(e)=> setActiveBoardId(Number(e.target.value))}
          >
            <option value="" disabled>Pick a board</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>

          <div className="flex items-center gap-2">
            <input
              className="w-64 border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="New board title"
              value={newBoardTitle}
              onChange={(e)=> setNewBoardTitle(e.target.value)}
            />
            {canWrite && (
              <button
                onClick={handleCreateBoard}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm active:scale-[.99] transition"
              >
                <span>➕</span> Create Board
              </button>
            )}
          </div>

          {activeBoardId && canWrite && (
            <button
              onClick={handleAddColumn}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-sm active:scale-[.99] transition"
            >
              <span>➕</span> Add Column
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8 py-5">
          {!activeBoardId && (
            <div className="text-slate-600 bg-white/80 backdrop-blur border border-slate-200 rounded-xl p-4 shadow-sm">
              Select a board or create a new one to get started.
            </div>
          )}

          {activeBoardId && (
            <>
              {/* Columns DnD */}
              <DndContext
                sensors={sensorsCols}
                collisionDetection={closestCenter}
                onDragEnd={onColumnsDragEnd}
              >
                <SortableContext items={columns.map(c => `col-${c.id}`)}>
                  {/* Board-level DnD for cards (single context) */}
                  <DndContext
                    sensors={sensorsCards}
                    collisionDetection={closestCenter}
                    onDragOver={onCardDragOverBoard}
                    onDragEnd={onCardDragEndBoard}
                  >
                    <div className="flex items-start gap-4 md:gap-5 lg:gap-6 overflow-x-auto pb-2 min-h-[70vh]">
                      {columns.map(col => (
                        <div key={col.id} id={`col-${col.id}`}>
                          <Column
                            column={col}
                            cards={(cardsByColumn[col.id] || [])}
                            onAddCard={canWrite ? handleAddCard : undefined}
                            onEditColumn={canWrite ? handleEditColumn : undefined}
                            onDeleteColumn={canWrite ? handleDeleteColumn : undefined}
                            onOpenCard={openCard}
                            canWrite={canWrite}
                          />
                        </div>
                      ))}
                    </div>
                  </DndContext>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>
      </div>
    </div>

    <CardModal
      open={modalOpen}
      onClose={closeModal}
      card={activeCard}
      setCardState={setActiveCard}
      onSave={canWrite ? saveCard : undefined}
      onDelete={canWrite ? deleteActiveCard : undefined}
      onAttach={canWrite ? attachToActiveCard : undefined}
      comments={activeCardComments}
      canWrite={canWrite}
      onAddComment={addCommentToActiveCard}
    />
  </div>
);
}
