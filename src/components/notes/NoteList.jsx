import { useNoteStore } from '@/store/useNoteStore';
import NoteItem from './NoteItem';

/**
 * NoteList
 * ─────────
 * Renders sorted notes from the store inside the sidebar.
 * Sort order: pinned first → then by updatedAt descending.
 */
export default function NoteList() {
  const notes        = useNoteStore((s) => s.notes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

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
    <ul className="note-list" role="listbox" aria-label="Notes">
      {sorted.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          isActive={note.id === activeNoteId}
          onSelect={() => setActiveNote(note.id)}
        />
      ))}

      <style>{`
        .note-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
      `}</style>
    </ul>
  );
}