import { PenLine, Settings, Sun, Moon, Monitor, X, HelpCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNoteStore } from '@/store/useNoteStore';
import FolderList from '@/components/folders/FolderList';
import NoteList from '@/components/notes/NoteList';
import ImportButton from '@/components/notes/ImportButton';

export default function Sidebar({ onClose, onOpenSearch, onOpenSettings, onOpenShortcuts }) {
  const theme       = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const createNote  = useNoteStore((s) => s.createNote);

  const ThemeIcon =
    theme === 'dark'  ? Moon    :
    theme === 'light' ? Sun     :
                        Monitor ;

  const themeLabel =
    theme === 'dark'  ? 'Dark mode'   :
    theme === 'light' ? 'Light mode'  :
                        'System theme';

  return (
    <div className="sidebar">
      {/* ── 1. Header ─────────────────────────────────────────── */}
      <header className="sidebar__header">
        <div className="sidebar__logo">
          <span className="sidebar__logo-emoji" aria-hidden="true">🧠</span>
          <span className="sidebar__logo-name">Brain</span>
        </div>
        <div className="sidebar__header-actions">
          <button
            className="icon-btn sidebar__search"
            aria-label="Search notes"
            title="Search notes"
            onClick={onOpenSearch}
          >
            <PenLine size={16} />
          </button>
          <button
            className="icon-btn sidebar__close"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* ── 2. Body ───────────────────────────────────────────── */}
      <div className="sidebar__body">
        {/* New note + Import row */}
        <div className="sidebar__action-row">
          <button
            className="sidebar__new-note-btn"
            aria-label="New note"
            onClick={() => createNote()}
          >
            <PenLine size={15} strokeWidth={2} />
            <span>New note</span>
          </button>
          <ImportButton />
        </div>

        <FolderList />

        <div className="sidebar__section-label">Notes</div>
        <NoteList />
      </div>

      {/* ── 3. Footer ─────────────────────────────────────────── */}
      <footer className="sidebar__footer">
        <button
          className="icon-btn"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
          onClick={onOpenShortcuts}
        >
          <HelpCircle size={16} />
        </button>
        <button
          className="icon-btn"
          aria-label="Settings"
          title="Settings"
          onClick={onOpenSettings}
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

        .sidebar__logo-emoji { font-size: 1.15rem; line-height: 1; }

        .sidebar__logo-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }

        .sidebar__header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sidebar__search { color: var(--text-tertiary); }
        .sidebar__search:hover { color: var(--text-primary); }

        @media (min-width: 641px) {
          .sidebar__close { display: none; }
        }

        .sidebar__body {
          flex: 1;
          overflow-y: auto;
          padding: 10px 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar__action-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 4px 8px;
        }

        .sidebar__new-note-btn {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 7px;
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

        .sidebar__new-note-btn:hover  { background-color: var(--brand-hover); }
        .sidebar__new-note-btn:active { transform: scale(0.98); }

        .sidebar__section-label {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-tertiary);
          padding: 8px 12px 4px;
        }

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