import { PanelLeft, FileText } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import Editor from '@/components/editor/Editor';


export default function EditorPane({ onOpenSidebar, previewMode, forceSaveSignal, focusMode, onTogglePreview, onToggleFocusMode }) {
  // ✅ Select each value separately — avoids new-object-on-every-render infinite loop
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const notes        = useNoteStore((s) => s.notes);

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  return (
    <div className="editor-pane">
      {/* Mobile top-bar */}
      <div className="editor-pane__mobile-bar">
        <button
          className="icon-btn"
          aria-label="Open sidebar"
          title="Open sidebar"
          onClick={onOpenSidebar}
        >
          <PanelLeft size={18} />
        </button>
        <span className="editor-pane__mobile-title">
          {activeNote ? activeNote.title || 'Untitled' : 'Brain'}
        </span>
        <div style={{ width: 28 }} />
      </div>

      {/* Content area */}
      <div className="editor-pane__content">
        {activeNote ? (
          <Editor
            note={activeNote}
            previewMode={previewMode}
            forceSaveSignal={forceSaveSignal}
            focusMode={focusMode}
            onTogglePreview={onTogglePreview}
            onToggleFocusMode={onToggleFocusMode}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   EmptyState
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
   Scoped styles
───────────────────────────────────────────────────────────────── */
if (typeof document !== 'undefined') {
  const id = 'editor-pane-styles';
  if (!document.getElementById(id)) {
    const tag = document.createElement('style');
    tag.id = id;
    tag.textContent = `
      .editor-pane {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        background-color: var(--bg-base);
      }

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
        .editor-pane__mobile-bar { display: flex; }
      }

      .editor-pane__content {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

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

      .editor-empty__icon-wrap { color: var(--text-tertiary); opacity: 0.6; }

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

      .note-title-wrapper { padding: 28px 48px 0; flex-shrink: 0; }

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

      .note-title-input::placeholder { color: var(--text-tertiary); }

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
        .note-title-wrapper    { padding: 20px 20px 0; }
        .note-editor-placeholder { padding: 16px 20px; }
      }

      .editor-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 48px;
        border-top: 1px solid var(--border);
        background-color: var(--bg-base);
        flex-shrink: 0;
      }

      .editor-footer__stat { font-size: 0.75rem; color: var(--text-tertiary); }
      .editor-footer__sep  { color: var(--border-strong); font-size: 0.75rem; }

      @media (max-width: 640px) {
        .editor-footer { padding: 8px 20px; }
      }
    `;
    document.head.appendChild(tag);
  }
}