import { useState, useRef, useEffect } from 'react';
import { Pin, MoreHorizontal, Trash2, PinOff, FolderPlus, X, Unlock } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useFolderStore } from '@/store/useFolderStore';
import { useToastStore } from '@/store/useToastStore';

export default function NoteItem({ note, isActive, onSelect, isMultiSelect, isSelected, onToggleSelect }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef  = useRef(null);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const pinNote    = useNoteStore((s) => s.pinNote);
  const updateNote = useNoteStore((s) => s.updateNote);
  const folders = useFolderStore((s) => s.folders);
  const folder = folders.find((folder) => folder.id === note.folderId);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setMenuOpen((v) => !v);
  };

  const handlePin = (e) => {
    e.stopPropagation();
    pinNote(note.id);
    setMenuOpen(false);
    useToastStore.getState().showToast(
      note.pinned ? `Unpinned "${note.title}"` : `Pinned "${note.title}" to top`
    );
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNote(note.id);
    setMenuOpen(false);
    useToastStore.getState().showToast(`Moved "${note.title}" to Trash.`, {
      actionLabel: 'Undo',
      onAction: () => {
        useNoteStore.getState().restoreNote(note.id);
      },
    });
  };

  const handleRestore = (e) => {
    e.stopPropagation();
    useNoteStore.getState().restoreNote(note.id);
    setMenuOpen(false);
    useToastStore.getState().showToast(`Restored "${note.title}"`);
  };

  const handleDeletePermanently = (e) => {
    e.stopPropagation();
    if (window.confirm(`Permanently delete "${note.title}"? This cannot be undone.`)) {
      useNoteStore.getState().deleteNotePermanently(note.id);
      setMenuOpen(false);
      useToastStore.getState().showToast(`Permanently deleted "${note.title}"`);
    }
  };

  const handleMoveToFolder = (e, folderId) => {
    e.stopPropagation();
    const targetFolder = folders.find((f) => f.id === folderId);
    updateNote(note.id, { folderId });
    setMenuOpen(false);
    useToastStore.getState().showToast(
      folderId ? `Moved "${note.title}" to folder "${targetFolder?.name}"` : `Removed "${note.title}" from folder`
    );
  };

  return (
    <li
      className={`note-item ${isActive ? 'note-item--active' : ''} ${isSelected ? 'note-item--selected' : ''}`}
      role="option"
      aria-selected={isActive}
      onClick={(e) => {
        if (isMultiSelect) {
          e.stopPropagation();
          onToggleSelect();
        } else {
          onSelect();
        }
      }}
    >
      {isMultiSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="note-item__checkbox"
        />
      )}

      {/* Left: folder colour dot (Phase 6 — hidden until folderId is set) */}
      {!isMultiSelect && note.folderId && !note.trashed && (
        <span
          className="note-item__folder-dot"
          aria-hidden="true"
          style={{ backgroundColor: folder?.color ?? 'var(--brand)' }}
        />
      )}

      {/* Centre: title + timestamp */}
      <div className="note-item__body">
        <span className="note-item__title">
          {note.title?.trim() || 'Untitled'}
        </span>
        <span className="note-item__meta">
          {note.pinned && !note.trashed && (
            <Pin size={10} className="note-item__pin-icon" aria-label="Pinned" />
          )}
          <time className="note-item__time" dateTime={note.updatedAt}>
            {formatRelative(note.updatedAt)}
          </time>
        </span>
      </div>

      {/* Right: ⋯ menu trigger */}
      {!isMultiSelect && (
        <div className="note-item__actions" ref={menuRef}>
          <button
            className="icon-btn note-item__menu-btn"
            aria-label="Note options"
            title="Note options"
            onClick={handleMenuToggle}
          >
            <MoreHorizontal size={14} />
          </button>

          {menuOpen && (
            <ul className="note-item__menu" role="menu">
              {note.trashed ? (
                <>
                  <li role="none">
                    <button
                      className="note-item__menu-action"
                      role="menuitem"
                      onClick={handleRestore}
                    >
                      <Unlock size={13} /> Restore note
                    </button>
                  </li>
                  <li role="none" className="note-item__menu-divider" aria-hidden="true" />
                  <li role="none">
                    <button
                      className="note-item__menu-action note-item__menu-action--danger"
                      role="menuitem"
                      onClick={handleDeletePermanently}
                    >
                      <Trash2 size={13} /> Delete permanently
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li role="none">
                    <button
                      className="note-item__menu-action"
                      role="menuitem"
                      onClick={handlePin}
                    >
                      {note.pinned ? (
                        <><PinOff size={13} /> Unpin</>
                      ) : (
                        <><Pin size={13} /> Pin to top</>
                      )}
                    </button>
                  </li>
                  <li role="none">
                    <div className="note-item__menu-section">Move to folder</div>
                  </li>
                  <li role="none">
                    <button
                      className="note-item__menu-action"
                      role="menuitem"
                      onClick={(e) => handleMoveToFolder(e, null)}
                    >
                      <X size={13} /> No folder
                    </button>
                  </li>
                  {folders.map((folderItem) => (
                    <li key={folderItem.id} role="none">
                      <button
                        className="note-item__menu-action"
                        role="menuitem"
                        onClick={(e) => handleMoveToFolder(e, folderItem.id)}
                      >
                        <FolderPlus size={13} /> {folderItem.name}
                      </button>
                    </li>
                  ))}
                  <li role="none" className="note-item__menu-divider" aria-hidden="true" />
                  <li role="none">
                    <button
                      className="note-item__menu-action note-item__menu-action--danger"
                      role="menuitem"
                      onClick={handleDelete}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </li>
                </>
              )}
            </ul>
          )}
        </div>
      )}

      <style>{`
        .note-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 7px;
          cursor: pointer;
          transition: background-color var(--t-base);
          user-select: none;
        }

        .note-item:hover {
          background-color: var(--bg-hover);
          transform: translateX(1px);
        }
        .note-item--active { background-color: var(--bg-active); }
        .note-item--active .note-item__title { color: var(--brand); }
        
        .note-item--selected {
          background-color: var(--bg-muted);
        }

        .note-item__checkbox {
          accent-color: var(--brand);
          cursor: pointer;
          width: 14px;
          height: 14px;
          flex-shrink: 0;
        }

        /* Folder colour dot */
        .note-item__folder-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: var(--folder-color, var(--brand));
          flex-shrink: 0;
        }

        /* Body */
        .note-item__body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .note-item__title {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .note-item__meta {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .note-item__pin-icon { color: var(--brand); flex-shrink: 0; }

        .note-item__time {
          font-size: 0.6875rem;
          color: var(--text-tertiary);
          white-space: nowrap;
        }

        /* ⋯ button — only show on hover or when menu is open */
        .note-item__actions { position: relative; flex-shrink: 0; }

        .note-item__menu-btn {
          opacity: 0;
          transition: opacity var(--t-fast);
        }

        .note-item:hover .note-item__menu-btn,
        .note-item--active .note-item__menu-btn {
          opacity: 1;
        }

        /* Dropdown menu */
        .note-item__menu {
          position: absolute;
          right: 0;
          top: calc(100% + 4px);
          z-index: 50;
          list-style: none;
          margin: 0;
          padding: 4px;
          min-width: 150px;
          background-color: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          animation: fade-in 0.1s ease;
        }

        .note-item__menu-action {
          display: flex;
          align-items: center;
          gap: 7px;
          width: 100%;
          padding: 6px 10px;
          border: none;
          background: none;
          border-radius: 5px;
          font-size: 0.8125rem;
          color: var(--text-primary);
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          transition: background-color var(--t-fast);
        }

        .note-item__menu-action:hover {
          background-color: var(--bg-hover);
        }

        .note-item__menu-action--danger { color: var(--danger, #ef4444); }
        .note-item__menu-action--danger:hover { background-color: var(--danger-bg, #fef2f2); }

        .note-item__menu-divider {
          height: 1px;
          background-color: var(--border);
          margin: 3px 4px;
        }
      `}</style>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Relative time helper
───────────────────────────────────────────────────────────────── */
function formatRelative(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  <  1) return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;

  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}