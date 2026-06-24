import { PanelLeft, FileText } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';

/**
 * EditorPane
 * ───────────
 * Right-side panel. In Phase 2 it renders placeholders that will be replaced
 * by real components in later phases:
 *
 *   • No-note selected  → EmptyState
 *   • Note selected     → title input + editor + footer stats bar
 *
 * Phase 3 wires up `useNoteStore` so active note state is available.
 *
 * @param {{ onOpenSidebar: () => void }} props
 */
export default function EditorPane({ onOpenSidebar }) {
  const { activeNoteId, notes } = useNoteStore((state) => ({
    activeNoteId: state.activeNoteId,
    notes: state.notes,
  }));
  const activeNote = notes.find((note) => note.id === activeNoteId) ?? null;

  return (
    <div className="editor-pane">
      {/* Mobile top-bar — shows only on narrow screens */}
      <div className="editor-pane__mobile-bar">
        <button
          className="icon-btn"
          aria-label="Open sidebar"
          onClick={onOpenSidebar}
        >
          <PanelLeft size={18} />
        </button>
        <span className="editor-pane__mobile-title">
          {activeNote ? activeNote.title || 'Untitled' : 'Brain'}
        </span>
        {/* Right slot — e.g. export button in Phase 8 */}
        <div style={{ width: 28 }} />
      </div>

      {/* ── Content area ── */}
      <div className="editor-pane__content">
        {activeNote ? (
          <NoteEditor note={activeNote} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   EmptyState — shown when no note is selected
───────────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="editor-empty">
      <div className="editor-empty__icon-wrap" aria-hidden="true">
        <FileText size={36} strokeWidth={1.25} />
      </div>
      <h2 className="editor-empty__heading">Select or create a note</h2>
      <p className="editor-empty__sub">
        Pick a note from the sidebar, or press{' '}
        <kbd className="editor-empty__kbd">⌘ N</kbd> to start a new one.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   NoteEditor — placeholder until Phase 5 wires up Tiptap
───────────────────────────────────────────────────────────────── */
function NoteEditor({ note }) {
  return (
    <>
      {/* Title */}
      <div className="note-title-wrapper">
        <input
          className="note-title-input"
          type="text"
          placeholder="Untitled"
          defaultValue={note.title ?? ''}
          aria-label="Note title"
        />
      </div>

      {/* Editor placeholder — replaced by Tiptap in Phase 5 */}
      <div className="note-editor-placeholder">
        <p className="note-editor-placeholder__text">
          Editor loads in Phase 5…
        </p>
      </div>

      {/* Footer */}
      <EditorFooter />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   EditorFooter — word count / stats (placeholder; live in Phase 9)
───────────────────────────────────────────────────────────────── */
function EditorFooter() {
  return (
    <footer className="editor-footer">
      <span className="editor-footer__stat">0 words</span>
      <span className="editor-footer__sep" aria-hidden="true">·</span>
      <span className="editor-footer__stat">0 characters</span>
      <span className="editor-footer__sep" aria-hidden="true">·</span>
      <span className="editor-footer__stat">0 min read</span>
    </footer>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Scoped styles
───────────────────────────────────────────────────────────────── */
const _styles = (
  <style>{`
    /* ── Outer shell ── */
    .editor-pane {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background-color: var(--bg-base);
    }

    /* ── Mobile top-bar ── */
    .editor-pane__mobile-bar {
      display: none;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      background-color: var(--bg-base);
      flex-shrink: 0;
    }

    .editor-pane__mobile-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 640px) {
      .editor-pane__mobile-bar {
        display: flex;
      }
    }

    /* ── Scrollable content area ── */
    .editor-pane__content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    /* ── Empty state ── */
    .editor-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 48px 32px;
      animation: fade-in 0.2s ease;
    }

    .editor-empty__icon-wrap {
      color: var(--text-tertiary);
      opacity: 0.6;
    }

    .editor-empty__heading {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .editor-empty__sub {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
      text-align: center;
      line-height: 1.6;
    }

    .editor-empty__kbd {
      display: inline-block;
      padding: 1px 6px;
      background: var(--bg-muted);
      border: 1px solid var(--border-strong);
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      color: var(--text-secondary);
    }

    /* ── Note editor ── */
    .note-title-wrapper {
      padding: 28px 48px 0;
      flex-shrink: 0;
    }

    .note-title-input {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
      font-family: inherit;
      line-height: 1.3;
      caret-color: var(--brand);
    }

    .note-title-input::placeholder {
      color: var(--text-tertiary);
    }

    .note-editor-placeholder {
      flex: 1;
      display: flex;
      align-items: flex-start;
      padding: 20px 48px;
      min-height: 200px;
    }

    .note-editor-placeholder__text {
      color: var(--text-tertiary);
      font-size: 0.9375rem;
    }

    @media (max-width: 640px) {
      .note-title-wrapper   { padding: 20px 20px 0; }
      .note-editor-placeholder { padding: 16px 20px; }
    }

    /* ── Footer ── */
    .editor-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 48px;
      border-top: 1px solid var(--border);
      background-color: var(--bg-base);
      flex-shrink: 0;
    }

    .editor-footer__stat {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .editor-footer__sep {
      color: var(--border-strong);
      font-size: 0.75rem;
    }

    @media (max-width: 640px) {
      .editor-footer { padding: 8px 20px; }
    }
  `}</style>
);

// Inject styles once into document head
if (typeof document !== 'undefined') {
  const id = 'editor-pane-styles';
  if (!document.getElementById(id)) {
    const tag = document.createElement('style');
    tag.id = id;
    tag.textContent = _styles.props.children;
    document.head.appendChild(tag);
  }
}