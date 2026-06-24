import { PenLine, Settings, Sun, Moon, Monitor, X } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNoteStore } from '@/store/useNoteStore';

/**
 * Sidebar
 * ────────
 * Three sections:
 *   1. Header   — logo + mobile close button
 *   2. Body     — "New note" button + note list placeholder
 *   3. Footer   — settings icon + theme cycle button
 *
 * @param {{ onClose: () => void }} props
 */
export default function Sidebar({ onClose }) {
  const theme       = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);

  const ThemeIcon =
    theme === 'dark'   ? Moon    :
    theme === 'light'  ? Sun     :
                         Monitor ;

  const themeLabel =
    theme === 'dark'   ? 'Dark mode'   :
    theme === 'light'  ? 'Light mode'  :
                         'System theme';

  const createNote = useNoteStore((state) => state.createNote);

  return (
    <div className="sidebar">
      {/* ── 1. Header ─────────────────────────────────────────── */}
      <header className="sidebar__header">
        <div className="sidebar__logo">
          <span className="sidebar__logo-emoji" aria-hidden="true">🧠</span>
          <span className="sidebar__logo-name">Brain</span>
        </div>

        {/* Mobile close button — hidden on desktop via CSS */}
        <button
          className="icon-btn sidebar__close"
          aria-label="Close sidebar"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </header>

      {/* ── 2. Body ───────────────────────────────────────────── */}
      <div className="sidebar__body">
        {/* New Note button */}
        <div className="sidebar__new-note-wrapper">
          <button
            className="sidebar__new-note-btn"
            aria-label="New note"
            onClick={() => createNote()}
          >
            <PenLine size={15} strokeWidth={2} />
            <span>New note</span>
          </button>
        </div>

        {/* Note list placeholder — wired up in Phase 4 */}
        <div className="sidebar__section-label">Notes</div>
        <div className="sidebar__note-list-placeholder">
          <p className="sidebar__empty-hint">No notes yet.</p>
          <p className="sidebar__empty-hint sidebar__empty-hint--sub">
            Hit <kbd className="sidebar__kbd">⌘ N</kbd> to start writing.
          </p>
        </div>
      </div>

      {/* ── 3. Footer ─────────────────────────────────────────── */}
      <footer className="sidebar__footer">
        <button
          className="icon-btn"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={16} />
        </button>

        <button
          className="icon-btn"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={toggleTheme}
        >
          <ThemeIcon size={16} />
        </button>
      </footer>

      {/* ── Scoped styles ─────────────────────────────────────── */}
      <style>{`
        .sidebar {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        /* Header */
        .sidebar__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 14px 12px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .sidebar__logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sidebar__logo-emoji {
          font-size: 1.15rem;
          line-height: 1;
        }

        .sidebar__logo-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        /* Only visible on mobile (AppShell controls the sidebar visibility) */
        @media (min-width: 641px) {
          .sidebar__close {
            display: none;
          }
        }

        /* Body */
        .sidebar__body {
          flex: 1;
          overflow-y: auto;
          padding: 10px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar__new-note-wrapper {
          padding: 0 4px 8px;
        }

        .sidebar__new-note-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          width: 100%;
          padding: 7px 10px;
          border-radius: 7px;
          border: none;
          background-color: var(--brand);
          color: #fff;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color var(--t-base), transform var(--t-fast);
          font-family: inherit;
        }

        .sidebar__new-note-btn:hover {
          background-color: var(--brand-hover);
        }

        .sidebar__new-note-btn:active {
          transform: scale(0.98);
        }

        .sidebar__section-label {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-tertiary);
          padding: 8px 12px 4px;
        }

        .sidebar__note-list-placeholder {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 32px 16px;
        }

        .sidebar__empty-hint {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          text-align: center;
        }

        .sidebar__empty-hint--sub {
          font-size: 0.75rem;
        }

        .sidebar__kbd {
          display: inline-block;
          padding: 1px 5px;
          background: var(--bg-muted);
          border: 1px solid var(--border-strong);
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        /* Footer */
        .sidebar__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}