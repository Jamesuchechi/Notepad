import { useState, useRef, useEffect } from 'react';
import { X, Plus, Type, Image as ImageIcon, ZoomIn, ZoomOut, Maximize2, Trash2, ArrowUpRight } from 'lucide-react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useNoteStore } from '@/store/useNoteStore';

export default function CanvasModal({ open, onClose }) {
  const notes = useNoteStore((s) => s.notes);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  
  const { cards, connections, addCard, updateCardPosition, updateCardSize, updateCardContent, removeCard, addConnection, removeConnection } = useCanvasStore();

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeNotesDropdown, setActiveNotesDropdown] = useState(false);
  
  // Connection line drawing state
  const [drawingFromId, setDrawingFromId] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const workspaceRef = useRef(null);

  const startPan = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  // Zoom handlers
  const handleZoomIn = () => setScale((s) => Math.min(2, s + 0.1));
  const handleZoomOut = () => setScale((s) => Math.max(0.5, s - 0.1));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Convert client coordinate to workspace coordinate
  const toWorkspaceCoords = (clientX, clientY) => {
    if (!workspaceRef.current) return { x: 0, y: 0 };
    const rect = workspaceRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    };
  };

  // Workspace Mouse Handlers (Panning & Drawing connection)
  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.classList.contains('canvas-grid')) {
      setIsPanning(true);
      startPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.current.x,
        y: e.clientY - startPan.current.y,
      });
    } else if (draggedCardId) {
      // Dragging card
      const workspacePos = toWorkspaceCoords(e.clientX, e.clientY);
      updateCardPosition(
        draggedCardId,
        workspacePos.x - dragOffset.x,
        workspacePos.y - dragOffset.y
      );
    } else if (drawingFromId) {
      // Drawing connection
      const workspacePos = toWorkspaceCoords(e.clientX, e.clientY);
      setMousePos(workspacePos);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedCardId(null);
    setDrawingFromId(null);
  };

  // Card Drag Handlers
  const handleCardDragStart = (e, cardId) => {
    e.stopPropagation();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    
    setDraggedCardId(cardId);
    const workspacePos = toWorkspaceCoords(e.clientX, e.clientY);
    setDragOffset({
      x: workspacePos.x - card.x,
      y: workspacePos.y - card.y,
    });
  };

  // Connector drawing handle
  const handleConnectorStart = (e, cardId) => {
    e.stopPropagation();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    setDrawingFromId(cardId);
    // Initial mouse pos in workspace coords
    const workspacePos = toWorkspaceCoords(e.clientX, e.clientY);
    setMousePos(workspacePos);
  };

  const handleConnectorEnd = (e, cardId) => {
    e.stopPropagation();
    if (drawingFromId && drawingFromId !== cardId) {
      addConnection(drawingFromId, cardId);
    }
    setDrawingFromId(null);
  };

  const handleAddNoteCard = (noteId) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    addCard({
      type: 'note',
      noteId: note.id,
      x: 100 - pan.x / scale,
      y: 100 - pan.y / scale,
    });
    setActiveNotesDropdown(false);
  };

  const handleAddTextCard = () => {
    addCard({
      type: 'text',
      content: 'Double click to edit text...',
      x: 150 - pan.x / scale,
      y: 150 - pan.y / scale,
    });
  };

  const handleAddImageCard = () => {
    const url = window.prompt('Enter image URL:', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80');
    if (url) {
      addCard({
        type: 'image',
        content: url,
        x: 200 - pan.x / scale,
        y: 200 - pan.y / scale,
      });
    }
  };

  // Helper to strip html from note snippet
  const stripHtml = (html) => {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    return doc.body.textContent || '';
  };

  return (
    <div className="canvas-modal-backdrop" role="dialog" aria-modal="true">
      {/* ── Toolbar Header ───────────────────────────────────────────── */}
      <div className="canvas-modal__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="canvas-modal__title-icon">🎨</span>
          <h2 className="canvas-modal__title">Visual Canvas</h2>
        </div>

        <div className="canvas-modal__toolbar">
          {/* Add Cards Dropdown/Buttons */}
          <div style={{ position: 'relative' }}>
            <button className="canvas-btn" onClick={() => setActiveNotesDropdown(!activeNotesDropdown)}>
              <Plus size={15} />
              Add Note
            </button>
            {activeNotesDropdown && (
              <ul className="canvas-dropdown">
                {notes.filter(n => !n.trashed).map((n) => (
                  <li key={n.id} onClick={() => handleAddNoteCard(n.id)}>
                    {n.title || 'Untitled'}
                  </li>
                ))}
                {notes.length === 0 && <li style={{ color: 'var(--text-tertiary)' }}>No notes found</li>}
              </ul>
            )}
          </div>

          <button className="canvas-btn" onClick={handleAddTextCard}>
            <Type size={15} />
            Text Block
          </button>

          <button className="canvas-btn" onClick={handleAddImageCard}>
            <ImageIcon size={15} />
            Image Block
          </button>

          <div className="canvas-divider" />

          {/* Zoom Actions */}
          <button className="canvas-btn canvas-btn--icon" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn size={15} />
          </button>
          <span className="canvas-zoom-text">{Math.round(scale * 100)}%</span>
          <button className="canvas-btn canvas-btn--icon" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut size={15} />
          </button>
          <button className="canvas-btn canvas-btn--icon" onClick={handleResetZoom} title="Reset View">
            <Maximize2 size={14} />
          </button>
        </div>

        <button className="icon-btn canvas-modal__close" onClick={onClose} aria-label="Close Canvas">
          <X size={18} />
        </button>
      </div>

      {/* ── Workspace ────────────────────────────────────────────────── */}
      <div
        className="canvas-viewport"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="canvas-workspace"
          ref={workspaceRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Grid lines */}
          <div className="canvas-grid" />

          {/* SVG Connection Lines */}
          <svg className="canvas-connections-svg">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-tertiary, #94a3b8)" />
              </marker>
            </defs>

            {/* Render Saved Connections */}
            {connections.map((conn) => {
              const fromCard = cards.find((c) => c.id === conn.fromId);
              const toCard = cards.find((c) => c.id === conn.toId);
              if (!fromCard || !toCard) return null;

              // Calculate connection coordinates from card centers
              const x1 = fromCard.x + fromCard.width / 2;
              const y1 = fromCard.y + fromCard.height / 2;
              const x2 = toCard.x + toCard.width / 2;
              const y2 = toCard.y + toCard.height / 2;

              // Quadratic Bezier control point for curved path
              const dx = x2 - x1;
              const dy = y2 - y1;
              const cx = x1 + dx / 2;
              const cy = y1 + dy / 2 - Math.min(100, Math.abs(dx) * 0.15);

              return (
                <g key={conn.id} className="connection-group">
                  <path
                    d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                    fill="none"
                    stroke="var(--brand)"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r="8"
                    className="connection-delete-handle"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeConnection(conn.id);
                    }}
                  />
                  <text
                    x={cx}
                    y={cy + 3}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9px"
                    style={{ pointerEvents: 'none' }}
                  >
                    ×
                  </text>
                </g>
              );
            })}

            {/* Render active dragging line */}
            {drawingFromId && (() => {
              const fromCard = cards.find((c) => c.id === drawingFromId);
              if (!fromCard) return null;
              const x1 = fromCard.x + fromCard.width / 2;
              const y1 = fromCard.y + fromCard.height / 2;
              return (
                <path
                  d={`M ${x1} ${y1} L ${mousePos.x} ${mousePos.y}`}
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              );
            })()}
          </svg>

          {/* Cards Layer */}
          {cards.map((card) => {
            const linkedNote = card.type === 'note' ? notes.find((n) => n.id === card.noteId) : null;

            return (
              <div
                key={card.id}
                className={`canvas-card canvas-card--${card.type}`}
                style={{
                  left: card.x,
                  top: card.y,
                  width: card.width,
                  height: card.height,
                  borderColor: card.color,
                }}
                onMouseUp={(e) => handleConnectorEnd(e, card.id)}
              >
                {/* Drag Titlebar */}
                <div
                  className="canvas-card__titlebar"
                  onMouseDown={(e) => handleCardDragStart(e, card.id)}
                  style={{ background: card.color }}
                >
                  <span className="canvas-card__title">
                    {card.type === 'note'
                      ? (linkedNote?.title || 'Untitled Note')
                      : card.type === 'text'
                      ? 'Text Box'
                      : 'Image'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {card.type === 'note' && linkedNote && (
                      <button
                        className="canvas-card__action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveNote(linkedNote.id);
                          onClose();
                        }}
                        title="Open Note"
                      >
                        <ArrowUpRight size={12} />
                      </button>
                    )}
                    <button
                      className="canvas-card__action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCard(card.id);
                      }}
                      title="Remove Block"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Card Content Area */}
                <div className="canvas-card__content">
                  {card.type === 'note' ? (
                    linkedNote ? (
                      <div className="canvas-card__note-body">
                        {stripHtml(linkedNote.content).slice(0, 140) || 'Empty note content...'}
                      </div>
                    ) : (
                      <div className="canvas-card__error">Linked note missing</div>
                    )
                  ) : card.type === 'text' ? (
                    <textarea
                      className="canvas-card__textarea"
                      value={card.content}
                      onChange={(e) => updateCardContent(card.id, e.target.value)}
                      placeholder="Type text here..."
                    />
                  ) : (
                    <img
                      src={card.content}
                      alt="Canvas asset"
                      className="canvas-card__image"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                  )}
                </div>

                {/* Connection link handle point */}
                <div
                  className="canvas-card__connector"
                  onMouseDown={(e) => handleConnectorStart(e, card.id)}
                  title="Drag to link this node"
                />
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .canvas-modal-backdrop {
          position: fixed;
          inset: 0;
          background: var(--bg-base, #ffffff);
          z-index: 150;
          display: flex;
          flex-direction: column;
        }

        .canvas-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-base);
          z-index: 10;
        }

        .canvas-modal__title-icon {
          font-size: 1.3rem;
        }

        .canvas-modal__title {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }

        .canvas-modal__close {
          border-radius: 10px;
        }

        .canvas-modal__toolbar {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-subtle, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 12px;
          padding: 4px 10px;
        }

        .canvas-divider {
          width: 1px;
          height: 16px;
          background: var(--border);
          margin: 0 8px;
        }

        .canvas-zoom-text {
          font-size: 0.76rem;
          color: var(--text-secondary);
          min-width: 36px;
          text-align: center;
          font-weight: 500;
        }

        .canvas-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background 0.16s, color 0.16s;
        }

        .canvas-btn:hover {
          background: var(--bg-hover, #e2e8f0);
          color: var(--text-primary);
        }

        .canvas-btn--icon {
          padding: 6px;
          border-radius: 6px;
        }

        .canvas-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 6px;
          list-style: none;
          margin: 0;
          min-width: 160px;
          max-height: 200px;
          overflow-y: auto;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          z-index: 50;
        }

        .canvas-dropdown li {
          padding: 6px 12px;
          font-size: 0.82rem;
          color: var(--text-primary);
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .canvas-dropdown li:hover {
          background: var(--bg-subtle);
          color: var(--brand);
        }

        /* Viewport & Grid */
        .canvas-viewport {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: var(--bg-base);
          cursor: grab;
        }

        .canvas-viewport:active {
          cursor: grabbing;
        }

        .canvas-workspace {
          position: absolute;
          width: 8000px;
          height: 8000px;
          left: 0;
          top: 0;
        }

        .canvas-grid {
          position: absolute;
          inset: 0;
          background-size: 24px 24px;
          background-image: radial-gradient(var(--border) 1px, transparent 1px);
          pointer-events: none;
          opacity: 0.7;
        }

        /* SVG Overlay */
        .canvas-connections-svg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .connection-group {
          pointer-events: auto;
        }

        .connection-delete-handle {
          cursor: pointer;
          fill: var(--danger, #ef4444);
          transition: transform 0.2s;
        }

        .connection-delete-handle:hover {
          transform: scale(1.3);
        }

        /* Card Container Styles */
        .canvas-card {
          position: absolute;
          background: var(--bg-base);
          border: 2px solid;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 2;
          cursor: default;
        }

        .canvas-card__titlebar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          color: white;
          cursor: move;
          font-weight: 600;
          font-size: 0.78rem;
          user-select: none;
        }

        .canvas-card__title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 140px;
        }

        .canvas-card__action-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 4px;
          color: white;
          padding: 3px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .canvas-card__action-btn:hover {
          background: rgba(255, 255, 255, 0.35);
        }

        .canvas-card__content {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .canvas-card__note-body {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.55;
          word-break: break-word;
          overflow: hidden;
        }

        .canvas-card__textarea {
          width: 100%;
          height: 100%;
          border: none;
          background: transparent;
          color: var(--text-primary);
          resize: none;
          font-size: 0.82rem;
          font-family: inherit;
          line-height: 1.5;
          outline: none;
        }

        .canvas-card__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 6px;
        }

        .canvas-card__error {
          font-size: 0.78rem;
          color: var(--danger);
          text-align: center;
          margin-top: 10px;
        }

        /* Node connectors */
        .canvas-card__connector {
          position: absolute;
          bottom: -7px;
          left: calc(50% - 7px);
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--brand);
          border: 2px solid var(--bg-base);
          cursor: crosshair;
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
          transition: transform 0.15s;
          z-index: 3;
        }

        .canvas-card__connector:hover {
          transform: scale(1.3);
        }
      `}</style>
    </div>
  );
}
