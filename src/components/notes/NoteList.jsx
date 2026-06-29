import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useFolderStore, isNoteTrashed } from '@/store/useFolderStore';
import NoteItem from './NoteItem';
import BulkActionBar from './BulkActionBar';

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Last edited' },
  { value: 'createdAt', label: 'Date created' },
  { value: 'title', label: 'Title (A–Z)' },
];

export default function NoteList() {
  const notes = useNoteStore((s) => s.notes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const folders = useFolderStore((s) => s.folders);
  const activeFolderId = useFolderStore((s) => s.activeFolderId);
  const tagFilter = useFolderStore((s) => s.tagFilter);

  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOpen, setSortOpen] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = notes.filter((note) => {
    if (activeFolderId === 'trash') {
      return isNoteTrashed(note, folders);
    }
    if (isNoteTrashed(note, folders)) return false;

    if (tagFilter && !note.tags?.includes(tagFilter)) return false;
    if (activeFolderId === 'pinned') return note.pinned;
    if (activeFolderId === 'all') return true;
    return note.folderId === activeFolderId;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (activeFolderId !== 'trash' && a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    if (sortBy === 'title') {
      return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
    }
    return new Date(b[sortBy]) - new Date(a[sortBy]);
  });

  const getGroup = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = today - noteDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Today';
    if (diffDays <= 7) return 'This Week';
    return 'Older';
  };

  const groups = {
    'Today': [],
    'This Week': [],
    'Older': []
  };

  sorted.forEach((note) => {
    const groupName = getGroup(note.updatedAt || note.createdAt);
    groups[groupName].push(note);
  });

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort';

  if (sorted.length === 0) {
    return (
      <div className="note-list-empty">
        <div className="note-list-empty__icon" aria-hidden="true">📝</div>
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
            gap: 10px;
            padding: 32px 16px;
            flex: 1;
            animation: fade-in 0.18s ease;
          }

          .note-list-empty__icon {
            font-size: 2.4rem;
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
      {/* Sort / Select control */}
      <div className="note-list-sort" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          type="button"
          className={`note-list-sort__btn ${isMultiSelect ? 'note-list-sort__btn--active' : ''}`}
          onClick={() => {
            setIsMultiSelect((v) => !v);
            setSelectedIds([]);
          }}
          title="Select multiple notes"
        >
          <span>{isMultiSelect ? 'Cancel' : 'Select'}</span>
        </button>

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

      <div className="note-list-groups">
        {Object.entries(groups).map(([groupName, groupNotes]) => {
          if (groupNotes.length === 0) return null;
          return (
            <div key={groupName} className="note-list-group-section">
              <div className="note-list-group-header">{groupName}</div>
              <ul className="note-list" role="listbox" aria-label={`Notes - ${groupName}`}>
                {groupNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    isActive={note.id === activeNoteId}
                    onSelect={() => setActiveNote(note.id)}
                    isMultiSelect={isMultiSelect}
                    isSelected={selectedIds.includes(note.id)}
                    onToggleSelect={() => {
                      setSelectedIds((prev) =>
                        prev.includes(note.id)
                          ? prev.filter((id) => id !== note.id)
                          : [...prev, note.id]
                      );
                    }}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <BulkActionBar
        selectedIds={selectedIds}
        onClear={() => {
          setSelectedIds([]);
          setIsMultiSelect(false);
        }}
        activeFolderId={activeFolderId}
      />

      <style>{`
        .note-list-group-section {
          margin-bottom: 14px;
        }

        .note-list-group-header {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
          padding: 6px 10px;
          margin-bottom: 4px;
          user-select: none;
        }

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