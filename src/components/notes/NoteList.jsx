import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useFolderStore } from '@/store/useFolderStore';
import NoteItem from './NoteItem';

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Last edited' },
  { value: 'createdAt', label: 'Date created' },
  { value: 'title',     label: 'Title (A–Z)'  },
];

export default function NoteList() {
  const notes         = useNoteStore((s) => s.notes);
  const activeNoteId  = useNoteStore((s) => s.activeNoteId);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const activeFolderId = useFolderStore((s) => s.activeFolderId);
  const tagFilter      = useFolderStore((s) => s.tagFilter);

  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = notes.filter((note) => {
    if (tagFilter && !note.tags?.includes(tagFilter)) return false;
    if (activeFolderId === 'pinned') return note.pinned;
    if (activeFolderId === 'all')    return true;
    return note.folderId === activeFolderId;
  });

  const sorted = [...filtered].sort((a, b) => {
    // Pinned always first
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    if (sortBy === 'title') {
      return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
    }
    return new Date(b[sortBy]) - new Date(a[sortBy]);
  });

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort';

  if (sorted.length === 0) {
    return (
      <div className="note-list-empty">
        <p className="note-list-empty__hint">No notes yet.</p>
        <p className="note-list-empty__hint note-list-empty__hint--sub">
          Hit <kbd className="note-list-empty__kbd">⌘ N</kbd> to start writing.
        </p>

        <style>{`
          .note-list-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 32px 16px;
            flex: 1;
          }
          .note-list-empty__hint {
            font-size: 0.8125rem;
            color: var(--text-tertiary);
            text-align: center;
          }
          .note-list-empty__hint--sub { font-size: 0.75rem; }
          .note-list-empty__kbd {
            display: inline-block;
            padding: 1px 5px;
            background: var(--bg-muted);
            border: 1px solid var(--border-strong);
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.7rem;
            color: var(--text-secondary);
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {/* Sort control */}
      <div className="note-list-sort">
        <div className="note-list-sort__wrap">
          <button
            type="button"
            className="note-list-sort__btn"
            onClick={() => setSortOpen((v) => !v)}
            aria-label="Sort notes"
            title="Sort notes"
          >
            <ArrowUpDown size={11} />
            <span>{currentSortLabel}</span>
          </button>

          {sortOpen && (
            <div className="note-list-sort__menu" role="menu">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`note-list-sort__option ${sortBy === opt.value ? 'note-list-sort__option--active' : ''}`}
                  role="menuitem"
                  onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ul className="note-list" role="listbox" aria-label="Notes">
        {sorted.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            isActive={note.id === activeNoteId}
            onSelect={() => setActiveNote(note.id)}
          />
        ))}
      </ul>

      <style>{`
        .note-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .note-list-sort {
          padding: 0 4px 4px;
          display: flex;
          justify-content: flex-end;
        }

        .note-list-sort__wrap {
          position: relative;
        }

        .note-list-sort__btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 7px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-tertiary);
          font-size: 0.7rem;
          font-family: inherit;
          cursor: pointer;
          transition: background var(--t-fast), color var(--t-fast);
        }

        .note-list-sort__btn:hover {
          background: var(--bg-muted);
          color: var(--text-primary);
        }

        .note-list-sort__menu {
          position: absolute;
          right: 0;
          top: calc(100% + 4px);
          min-width: 140px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
          padding: 4px;
          z-index: 30;
          animation: fade-in 0.1s ease;
        }

        .note-list-sort__option {
          display: block;
          width: 100%;
          padding: 7px 10px;
          border: none;
          background: none;
          color: var(--text-primary);
          font-size: 0.75rem;
          font-family: inherit;
          text-align: left;
          border-radius: 7px;
          cursor: pointer;
          transition: background var(--t-fast);
        }

        .note-list-sort__option:hover {
          background: var(--bg-hover);
        }

        .note-list-sort__option--active {
          color: var(--brand);
          font-weight: 600;
        }
      `}</style>
    </>
  );
}