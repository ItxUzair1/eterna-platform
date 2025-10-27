import React, { useEffect, useMemo, useState } from 'react';
import {
  listBoards, createBoard, getBoardFull,
  createColumn, reorderColumns, updateColumn, deleteColumn,
  createCard, updateCard, deleteCard, moveCard, reorderCards,
  attachFile, addComment, listComments
} from '../services/kanbanService';

import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy
} from '@dnd-kit/sortable';

// ---------- Small utilities ----------
const bySort = (a,b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0);

// ---------- Column ----------
function Column({
  column,
  cards,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
  onReorderCards,
  onOpenCard
}) {
  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <div className="w-80 min-w-[20rem] bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <input
          className="font-semibold bg-transparent outline-none px-1 rounded hover:bg-white"
          defaultValue={column.title}
          onBlur={(e)=> onEditColumn(column.id, { title: e.target.value })}
        />
        <button
          onClick={()=> onDeleteColumn(column.id)}
          className="text-red-600 hover:underline text-xs"
          title="Delete column"
        >
          Delete
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e)=> onReorderCards(column.id, e)}
      >
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {cards.map(card => (
              <div
                key={card.id}
                id={card.id}
                className="bg-white border border-gray-200 rounded-lg p-3 shadow hover:shadow-md cursor-grab"
                onClick={()=> onOpenCard(card)}
              >
                <div className="font-medium text-gray-800">{card.title}</div>
                {card.deadlineDate && (
                  <div className="text-xs text-gray-500 mt-1">⏰ {new Date(card.deadlineDate).toLocaleDateString()}</div>
                )}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={()=> onAddCard(column.id)}
        className="mt-3 w-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg py-1.5 text-sm font-semibold"
      >
        + Add card
      </button>
    </div>
  );
}

// ---------- Card Modal ----------
function CardModal({
  open,
  onClose,
  card,
  setCardState,
  onSave,
  onDelete,
  onAttach,
  comments,
  onAddComment
}) {
  if (!open || !card) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b">
          <input
            className="text-xl font-semibold w-full outline-none"
            value={card.title || ''}
            onChange={(e)=> setCardState(prev => ({ ...prev, title: e.target.value }))}
          />
          <button onClick={onClose} className="ml-3 text-gray-500 hover:text-gray-700">✖</button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={5}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={card.description || ''}
              onChange={(e)=> setCardState(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add a detailed description..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-xl px-3 py-2"
                value={card.deadlineDate ? new Date(card.deadlineDate).toISOString().slice(0,10) : ''}
                onChange={(e)=> setCardState(prev => ({ ...prev, deadlineDate: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignee (userId)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-xl px-3 py-2"
                value={card.assigneeId || ''}
                onChange={(e)=> setCardState(prev => ({ ...prev, assigneeId: e.target.value ? Number(e.target.value) : null }))}
                placeholder="Enter user id"
              />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
            <input
              type="file"
              onChange={(e)=> e.target.files?.[0] && onAttach(e.target.files[0])}
              className="text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {card.attachments?.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">{card.attachments.length} file(s) linked</div>
            )}
          </div>

          {/* Comments */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Comments</div>
            <ul className="space-y-3">
              {comments.map(c => (
                <li key={c.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{c.body}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    by {c.author?.username || c.author?.email || 'User'} • {new Date(c.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
              {comments.length === 0 && <li className="text-sm text-gray-400">No comments yet.</li>}
            </ul>

            <AddComment onAdd={onAddComment} />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button className="text-red-600 hover:text-red-700" onClick={onDelete}>Delete card</button>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl" onClick={onSave}>Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddComment({ onAdd }) {
  const [text, setText] = useState('');
  return (
    <div className="mt-3 flex gap-2">
      <input
        className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm"
        placeholder="Write a comment..."
        value={text}
        onChange={(e)=> setText(e.target.value)}
      />
      <button
        onClick={()=> { if (text.trim()) { onAdd(text); setText(''); } }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-2 rounded-xl text-sm"
      >
        Add
      </button>
    </div>
  );
}

// ---------- Main Page ----------
export default function Kanban() {
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
    const fromIndex = ordered.findIndex(c => c.id === active.id);
    const toIndex = ordered.findIndex(c => c.id === over.id);
    const newOrder = arrayMove(ordered, fromIndex, toIndex);

    setBoardData(prev => ({ ...prev, columns: newOrder }));
    await reorderColumns({ boardId: activeBoardId, orderedIds: newOrder.map(c => c.id) });
  };

  // Cards
  const handleAddCard = async (columnId) => {
    const title = prompt('Card title?');
    if (!title) return;
    const { data } = await createCard({ boardId: activeBoardId, columnId, title });
    setBoardData(prev => ({ ...prev, cards: [...prev.cards, data] }));
  };

  // Reorder cards in a column
  const handleReorderCards = (columnId, e) => {
    const { active, over } = e;
    if (!active || !over || active.id === over.id) return;

    const current = (cardsByColumn[columnId] || []).slice();
    const fromIndex = current.findIndex(c => c.id === active.id);
    const toIndex = current.findIndex(c => c.id === over.id);

    const newOrder = arrayMove(current, fromIndex, toIndex);
    // optimistic UI
    setBoardData(prev => ({
      ...prev,
      cards: [
        ...prev.cards.filter(c => c.columnId !== columnId),
        ...newOrder
      ]
    }));

    reorderCards({ columnId, orderedIds: newOrder.map(c => c.id) });
  };

  // Cross-column move (quick helpers)
  const moveLeft = async (card) => {
    const idx = columns.findIndex(c => c.id === card.columnId);
    if (idx > 0) {
      await moveCard({ cardId: card.id, toColumnId: columns[idx - 1].id, toIndex: 0 });
      const { data } = await getBoardFull(activeBoardId);
      setBoardData(data);
    }
  };
  const moveRight = async (card) => {
    const idx = columns.findIndex(c => c.id === card.columnId);
    if (idx < columns.length - 1) {
      await moveCard({ cardId: card.id, toColumnId: columns[idx + 1].id, toIndex: 0 });
      const { data } = await getBoardFull(activeBoardId);
      setBoardData(data);
    }
  };

  // Card Modal open/close
  const openCard = async (card) => {
    setActiveCard(card);
    setModalOpen(true);
    const { data } = await listComments(card.id);
    setActiveCardComments(data);
  };
  const closeModal = () => { setModalOpen(false); setActiveCard(null); setActiveCardComments([]); };

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

  return (
    <div className="w-full h-[calc(100vh-56px)] bg-gray-50 flex">
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="border-b bg-white">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={activeBoardId || ''}
              onChange={(e)=> setActiveBoardId(Number(e.target.value))}
            >
              <option value="" disabled>Pick a board</option>
              {boards.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>

            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="New board title"
              value={newBoardTitle}
              onChange={(e)=> setNewBoardTitle(e.target.value)}
            />
            <button
              onClick={handleCreateBoard}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-semibold"
            >
              ➕ Create Board
            </button>

            {activeBoardId && (
              <button
                onClick={handleAddColumn}
                className="ml-auto bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-3 py-2 rounded-lg text-sm font-semibold"
              >
                ➕ Add Column
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1600px] mx-auto px-6 py-5">
            {!activeBoardId && (
              <div className="text-gray-500">Select a board or create a new one.</div>
            )}

            {activeBoardId && (
              <DndContext
                sensors={sensorsCols}
                collisionDetection={closestCenter}
                onDragEnd={onColumnsDragEnd}
              >
                <div className="flex gap-4 items-start">
                  <SortableContext items={columns.map(c => c.id)}>
                    {columns.map(col => (
                      <Column
                        key={col.id}
                        column={col}
                        cards={(cardsByColumn[col.id] || [])}
                        onAddCard={handleAddCard}
                        onEditColumn={handleEditColumn}
                        onDeleteColumn={handleDeleteColumn}
                        onReorderCards={handleReorderCards}
                        onOpenCard={openCard}
                      />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      <CardModal
        open={modalOpen}
        onClose={closeModal}
        card={activeCard}
        setCardState={setActiveCard}
        onSave={saveCard}
        onDelete={deleteActiveCard}
        onAttach={attachToActiveCard}
        comments={activeCardComments}
        onAddComment={addCommentToActiveCard}
      />
    </div>
  );
}
