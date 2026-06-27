import { useState, useRef, useEffect } from 'react';
import { Trash2, FolderPlus, Tag, X, RotateCcw } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useFolderStore } from '@/store/useFolderStore';
import { useToastStore } from '@/store/useToastStore';

export default function BulkActionBar({ selectedIds, onClear, activeFolderId }) {
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagName, setTagName] = useState('');
  const folderMenuRef = useRef(null);
  const tagInputRef = useRef(null);

  const folders = useFolderStore((s) => s.folders);
  const bulkTrashNotes = useNoteStore((s) => s.bulkTrashNotes);
  const bulkRestoreNotes = useNoteStore((s) => s.bulkRestoreNotes);
  const bulkDeleteNotesPermanently = useNoteStore((s) => s.bulkDeleteNotesPermanently);
  const bulkMoveNotesToFolder = useNoteStore((s) => s.bulkMoveNotesToFolder);
  const bulkAddTagToNotes = useNoteStore((s) => s.bulkAddTagToNotes);

  const isTrashView = activeFolderId === 'trash';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target)) {
        setShowFolderMenu(false);
      }
      if (tagInputRef.current && !tagInputRef.current.contains(e.target)) {
        setShowTagInput(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedIds.length === 0) return null;

  const handleBulkTrash = () => {
    bulkTrashNotes(selectedIds);
    useToastStore.getState().showToast(`Moved ${selectedIds.length} notes to Trash.`, {
      actionLabel: 'Undo',
      onAction: () => {
        bulkRestoreNotes(selectedIds);
      },
    });
    onClear();
  };

  const handleBulkRestore = () => {
    bulkRestoreNotes(selectedIds);
    useToastStore.getState().showToast(`Restored ${selectedIds.length} notes.`);
    onClear();
  };

  const handleBulkDeletePermanently = () => {
    if (window.confirm(`Permanently delete ${selectedIds.length} notes? This cannot be undone.`)) {
      bulkDeleteNotesPermanently(selectedIds);
      useToastStore.getState().showToast(`Permanently deleted ${selectedIds.length} notes.`);
      onClear();
    }
  };

  const handleMoveFolder = (folderId) => {
    bulkMoveNotesToFolder(selectedIds, folderId);
    const targetFolder = folders.find((f) => f.id === folderId);
    useToastStore.getState().showToast(
      folderId
        ? `Moved ${selectedIds.length} notes to "${targetFolder?.name}"`
        : `Removed ${selectedIds.length} notes from folders`
    );
    setShowFolderMenu(false);
    onClear();
  };

  const handleAddTagSubmit = (e) => {
    e.preventDefault();
    const cleanTag = tagName.trim();
    if (!cleanTag) return;
    bulkAddTagToNotes(selectedIds, cleanTag);
    useToastStore.getState().showToast(`Added tag "${cleanTag}" to ${selectedIds.length} notes.`);
    setTagName('');
    setShowTagInput(false);
    onClear();
  };

  return (
    <div className="bulk-action-bar" role="toolbar" aria-label="Bulk actions">
      <div className="bulk-action-bar__count">
        <span>{selectedIds.length} selected</span>
      </div>

      <div className="bulk-action-bar__actions">
        {isTrashView ? (
          <>
            <button
              type="button"
              className="bulk-action-bar__btn"
              onClick={handleBulkRestore}
              title="Restore selected notes"
            >
              <RotateCcw size={14} />
              <span>Restore</span>
            </button>
            <button
              type="button"
              className="bulk-action-bar__btn bulk-action-bar__btn--danger"
              onClick={handleBulkDeletePermanently}
              title="Delete selected notes permanently"
            >
              <Trash2 size={14} />
              <span>Delete Permanently</span>
            </button>
          </>
        ) : (
          <>
            <div className="bulk-action-bar__popover-wrap" ref={folderMenuRef}>
              <button
                type="button"
                className="bulk-action-bar__btn"
                onClick={() => setShowFolderMenu((v) => !v)}
                title="Move selected to folder"
              >
                <FolderPlus size={14} />
                <span>Move</span>
              </button>
              {showFolderMenu && (
                <div className="bulk-popover bulk-popover--folders">
                  <button
                    type="button"
                    className="bulk-popover__item"
                    onClick={() => handleMoveFolder(null)}
                  >
                    No folder (remove)
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className="bulk-popover__item"
                      onClick={() => handleMoveFolder(f.id)}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bulk-action-bar__popover-wrap" ref={tagInputRef}>
              <button
                type="button"
                className="bulk-action-bar__btn"
                onClick={() => setShowTagInput((v) => !v)}
                title="Add tag to selected"
              >
                <Tag size={14} />
                <span>Tag</span>
              </button>
              {showTagInput && (
                <form className="bulk-popover bulk-popover--tag-form" onSubmit={handleAddTagSubmit}>
                  <input
                    type="text"
                    className="bulk-popover__tag-input"
                    placeholder="Enter tag name"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="bulk-popover__tag-btn">
                    Add
                  </button>
                </form>
              )}
            </div>

            <button
              type="button"
              className="bulk-action-bar__btn bulk-action-bar__btn--danger"
              onClick={handleBulkTrash}
              title="Move selected notes to Trash"
            >
              <Trash2 size={14} />
              <span>Trash</span>
            </button>
          </>
        )}

        <div className="bulk-action-bar__sep" />

        <button
          type="button"
          className="bulk-action-bar__close-btn"
          onClick={onClear}
          title="Cancel selection"
          aria-label="Cancel selection"
        >
          <X size={15} />
        </button>
      </div>

      <style>{`
        .bulk-action-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 999;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 8px 16px;
          background: var(--bg-elevated, #1e293b);
          border: 1px solid var(--border, #334155);
          border-radius: 16px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
          animation: bulk-bar-slide 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--text-primary);
        }

        .bulk-action-bar__count {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--brand, #6366f1);
          border-right: 1px solid var(--border);
          padding-right: 16px;
        }

        .bulk-action-bar__actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bulk-action-bar__btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .bulk-action-bar__btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .bulk-action-bar__btn--danger:hover {
          color: var(--danger, #ef4444);
          border-color: rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.05);
        }

        .bulk-action-bar__sep {
          width: 1px;
          height: 16px;
          background: var(--border);
        }

        .bulk-action-bar__close-btn {
          border: none;
          background: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .bulk-action-bar__close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .bulk-action-bar__popover-wrap {
          position: relative;
        }

        .bulk-popover {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.15);
          padding: 6px;
          z-index: 1000;
          animation: fade-in 0.15s ease;
        }

        .bulk-popover--folders {
          min-width: 160px;
          max-height: 180px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .bulk-popover__item {
          display: block;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: none;
          color: var(--text-primary);
          font-size: 0.75rem;
          text-align: left;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease;
        }

        .bulk-popover__item:hover {
          background: var(--bg-hover);
        }

        .bulk-popover--tag-form {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px;
          min-width: 220px;
        }

        .bulk-popover__tag-input {
          flex: 1;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-primary);
          font-size: 0.75rem;
        }

        .bulk-popover__tag-input:focus {
          outline: none;
          border-color: var(--brand);
        }

        .bulk-popover__tag-btn {
          border: none;
          background: var(--brand);
          color: #fff;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          cursor: pointer;
        }

        @keyframes bulk-bar-slide {
          from {
            transform: translate(-50%, 20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
