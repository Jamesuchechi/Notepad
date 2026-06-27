import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, MoreHorizontal, Edit2, Trash2, X } from 'lucide-react';
import { useFolderStore } from '@/store/useFolderStore';
import { useNoteStore } from '@/store/useNoteStore';

const FOLDER_COLORS = ['#6366f1', '#ec4899', '#f97316', '#14b8a6', '#10b981', '#0ea5e9', '#a855f7'];

export default function FolderList() {
  const folders = useFolderStore((s) => s.folders);
  const activeFolderId = useFolderStore((s) => s.activeFolderId);
  const tagFilter = useFolderStore((s) => s.tagFilter);
  const setActiveFolderId = useFolderStore((s) => s.setActiveFolderId);
  const setTagFilter = useFolderStore((s) => s.setTagFilter);
  const clearTagFilter = useFolderStore((s) => s.clearTagFilter);
  const createFolder = useFolderStore((s) => s.createFolder);
  const renameFolder = useFolderStore((s) => s.renameFolder);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);

  const notes = useNoteStore((s) => s.notes);

  const [menuOpenId, setMenuOpenId] = useState(null);
  const [modalState, setModalState] = useState({ isOpen: false, folder: null });
  const [folderName, setFolderName] = useState('');
  const modalRef = useRef(null);

  const folderCounts = useMemo(() => {
    return notes.reduce((counts, note) => {
      if (note.folderId && !note.trashed) {
        counts[note.folderId] = (counts[note.folderId] ?? 0) + 1;
      }
      return counts;
    }, {});
  }, [notes]);

  const uniqueTags = useMemo(() => {
    const tags = new Set();
    notes.forEach((note) => {
      if (!note.trashed) {
        note.tags?.forEach((tag) => tags.add(tag));
      }
    });
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [notes]);

  useEffect(() => {
    if (!modalState.isOpen) return;
    const handler = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setModalState({ isOpen: false, folder: null });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modalState.isOpen]);

  useEffect(() => {
    if (menuOpenId === null) return;
    const handler = (event) => {
      const target = event.target;
      if (target.closest?.('.folder-item__menu') || target.closest?.('.folder-item__menu-btn')) {
        return;
      }
      setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpenId]);

  const openCreateFolder = () => {
    setFolderName('');
    setModalState({ isOpen: true, folder: null });
  };

  const openRenameFolder = (folder) => {
    setFolderName(folder.name);
    setModalState({ isOpen: true, folder });
    setMenuOpenId(null);
  };

  const handleSaveFolder = () => {
    const trimmedName = folderName.trim();
    if (!trimmedName) return;
    if (modalState.folder) {
      renameFolder(modalState.folder.id, trimmedName);
    } else {
      createFolder(trimmedName);
    }
    setModalState({ isOpen: false, folder: null });
  };

  const handleDeleteFolder = (folderId) => {
    deleteFolder(folderId);
    setMenuOpenId(null);
  };

  const setFolderColor = useFolderStore((s) => s.setFolderColor);

  const cycleFolderColor = (folderId) => {
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) return;
    const currentIndex = FOLDER_COLORS.indexOf(folder.color);
    const nextColor = FOLDER_COLORS[(currentIndex + 1) % FOLDER_COLORS.length];
    setFolderColor(folder.id, nextColor);
    setMenuOpenId(null);
  };

  const smartFolders = [
    { id: 'all', label: 'All Notes', count: notes.filter((n) => !n.trashed).length },
    { id: 'pinned', label: 'Pinned', count: notes.filter((note) => note.pinned && !note.trashed).length },
    { id: 'trash', label: 'Trash', count: notes.filter((note) => note.trashed).length },
  ];

  return (
    <section className="folder-list">
      <div className="folder-list__header">
        <div>
          <div className="sidebar__section-label">Folders</div>
          <p className="folder-list__hint">Organise notes and filter by folder.</p>
        </div>
        <button
          className="icon-btn folder-list__create-btn"
          aria-label="Create folder"
          title="Create folder"
          onClick={openCreateFolder}
        >
          <Plus size={14} />
        </button>
      </div>

      <ul className="folder-list__items" role="list">
        {smartFolders.map((item) => (
          <li
            key={item.id}
            className={`folder-item ${activeFolderId === item.id ? 'folder-item--active' : ''}`}
          >
            <button
              type="button"
              className="folder-item__button"
              onClick={() => setActiveFolderId(item.id)}
            >
              <span className="folder-item__label">{item.label}</span>
              <span className="folder-item__count">{item.count}</span>
            </button>
          </li>
        ))}

        {folders.map((folder) => (
          <li
            key={folder.id}
            className={`folder-item ${activeFolderId === folder.id ? 'folder-item--active' : ''}`}
          >
            <button
              type="button"
              className="folder-item__button"
              onClick={() => setActiveFolderId(folder.id)}
            >
              <span className="folder-item__dot" style={{ backgroundColor: folder.color }} />
              <span className="folder-item__label">{folder.name}</span>
              <span className="folder-item__count">{folderCounts[folder.id] ?? 0}</span>
            </button>

            <button
              className="icon-btn folder-item__menu-btn"
              type="button"
              aria-label={`Folder options for ${folder.name}`}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpenId(menuOpenId === folder.id ? null : folder.id);
              }}
            >
              <MoreHorizontal size={14} />
            </button>

            {menuOpenId === folder.id && (
              <div className="folder-item__menu" role="menu">
                <button
                  className="folder-item__menu-action"
                  type="button"
                  onClick={() => openRenameFolder(folder)}
                >
                  <Edit2 size={14} /> Rename
                </button>
                <button
                  className="folder-item__menu-action"
                  type="button"
                  onClick={() => cycleFolderColor(folder.id)}
                >
                  <span
                    className="folder-item__color-swatch"
                    style={{ backgroundColor: folder.color }}
                  />
                  Change colour
                </button>
                <div className="folder-item__menu-divider" aria-hidden="true" />
                <button
                  className="folder-item__menu-action folder-item__menu-action--danger"
                  type="button"
                  onClick={() => handleDeleteFolder(folder.id)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="tag-filter">
        <div className="tag-filter__header">
          <span>Tags</span>
          {tagFilter && (
            <button type="button" className="tag-filter__clear" onClick={clearTagFilter}>
              Clear
            </button>
          )}
        </div>
        <div className="tag-filter__list">
          {uniqueTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`tag-pill ${tagFilter === tag ? 'tag-pill--active' : ''}`}
              onClick={() => setTagFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {folders.length === 0 && (
        <div className="folder-list-empty">
          <div className="folder-list-empty__emoji" aria-hidden="true">
            📁
          </div>
          <p>No folders yet.</p>
          <p className="folder-list-empty__sub">Create one to organise your notes.</p>
        </div>
      )}

      {modalState.isOpen && (
        <div className="folder-modal-backdrop" aria-modal="true" role="dialog">
          <div className="folder-modal" ref={modalRef}>
            <div className="folder-modal__header">
              <strong>{modalState.folder ? 'Rename folder' : 'Create folder'}</strong>
              <button
                className="icon-btn"
                onClick={() => setModalState({ isOpen: false, folder: null })}
                aria-label="Close folder dialog"
                title="Close folder dialog"
              >
                <X size={16} />
              </button>
            </div>
            <label className="folder-modal__label">
              Folder name
              <input
                className="folder-modal__input"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Work, Ideas, Journal…"
                autoFocus
              />
            </label>
            <div className="folder-modal__actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setModalState({ isOpen: false, folder: null })}
              >
                Cancel
              </button>
              <button type="button" className="button" onClick={handleSaveFolder}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .folder-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 0 4px 12px;
        }

        .folder-list__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .folder-list__hint {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          margin-top: 4px;
        }

        .folder-list__create-btn {
          border: 1px solid var(--border);
          width: 34px;
          height: 34px;
          border-radius: 10px;
          padding: 0;
        }

        .folder-list__items {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .folder-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 8px 8px 10px;
          border-radius: 10px;
          background: var(--bg-subtle);
        }

        .folder-item--active {
          background: var(--bg-active);
        }

        .folder-item__button {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          background: none;
          color: inherit;
          text-align: left;
          padding: 0;
          cursor: pointer;
          font-family: inherit;
        }

        .folder-item__dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          flex-shrink: 0;
        }

        .folder-item__label {
          flex: 1;
          font-size: 0.8125rem;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .folder-item__count {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .folder-item__menu-btn {
          width: 32px;
          height: 32px;
          border-radius: 10px;
        }

        .folder-item__menu {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 170px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
          z-index: 20;
        }

        .folder-item__menu-action {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 10px;
          border: none;
          background: none;
          color: var(--text-primary);
          text-align: left;
          cursor: pointer;
          border-radius: 10px;
          font-size: 0.8125rem;
          font-family: inherit;
        }

        .folder-item__menu-action:hover {
          background: var(--bg-hover);
        }

        .folder-item__menu-action--danger {
          color: var(--danger, #ef4444);
        }

        .folder-item__menu-divider {
          height: 1px;
          background: var(--border);
          margin: 4px 0;
        }

        .folder-item__color-swatch {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        }

        .tag-filter {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 10px;
          border-radius: 14px;
          background: var(--bg-subtle);
        }

        .tag-filter__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .tag-filter__clear {
          border: none;
          background: none;
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.75rem;
        }

        .tag-filter__list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .folder-list-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 20px 12px;
          border-radius: 16px;
          background: var(--bg-subtle);
          color: var(--text-secondary);
          text-align: center;
          animation: fade-in 0.18s ease;
        }

        .folder-list-empty__emoji {
          font-size: 2rem;
        }

        .folder-list-empty__sub {
          margin: 0;
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }

        .tag-pill {
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 6px 10px;
          background: var(--bg-base);
          color: var(--text-primary);
          font-size: 0.75rem;
          cursor: pointer;
        }

        .tag-pill--active {
          background: var(--brand);
          color: #fff;
          border-color: transparent;
        }

        .folder-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 16px;
        }

        .folder-modal {
          width: min(420px, 100%);
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.14);
          animation: fade-in 0.14s ease;
        }

        .folder-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
          font-size: 0.95rem;
        }

        .folder-modal__label {
          display: grid;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .folder-modal__input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--bg-subtle);
          color: var(--text-primary);
          font-size: 0.95rem;
        }

        .folder-modal__actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
        }

        .button {
          padding: 10px 14px;
          border-radius: 12px;
          border: none;
          font-size: 0.9rem;
          cursor: pointer;
          font-family: inherit;
        }

        .button--secondary {
          background: var(--bg-subtle);
          color: var(--text-primary);
          border: 1px solid var(--border);
        }

        .button:not(.button--secondary) {
          background: var(--brand);
          color: #fff;
        }
      `}</style>
    </section>
  );
}
