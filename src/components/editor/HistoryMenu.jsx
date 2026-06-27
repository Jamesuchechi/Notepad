import { useRef, useState, useEffect } from 'react';
import { History, RotateCcw, ChevronDown, Calendar } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useToastStore } from '@/store/useToastStore';

export default function HistoryMenu({ note, editor }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const updateNote = useNoteStore((s) => s.updateNote);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const history = note.history || [];

  const handleRestore = (version) => {
    if (!editor) return;
    if (window.confirm('Restore note to this version? Current unsaved changes will be overwritten.')) {
      updateNote(note.id, {
        title: version.title,
        content: version.content,
      });
      editor.commands.setContent(version.content, true);
      useToastStore.getState().showToast('Restored note to previous version.');
      setOpen(false);
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className="history-menu" ref={menuRef}>
      <button
        type="button"
        className="history-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        title="Version History"
        aria-label="Version History"
        aria-expanded={open}
        disabled={note.trashed}
      >
        <History size={15} />
        <span>History</span>
        {history.length > 0 && <span className="history-menu__count">{history.length}</span>}
        <ChevronDown size={13} className={`history-menu__chevron ${open ? 'history-menu__chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="history-menu__dropdown" role="menu">
          <div className="history-menu__header">Version History</div>
          
          {history.length === 0 ? (
            <div className="history-menu__empty">
              No previous versions. Snapshots are auto-saved on edits.
            </div>
          ) : (
            <div className="history-menu__list">
              {history.map((version, index) => (
                <div key={index} className="history-menu__item" role="menuitem">
                  <div className="history-menu__item-info">
                    <div className="history-menu__item-time">
                      <Calendar size={11} />
                      <span>{formatTime(version.timestamp)}</span>
                    </div>
                    <div className="history-menu__item-title">
                      {version.title || 'Untitled'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="history-menu__restore-btn"
                    onClick={() => handleRestore(version)}
                    title="Restore this version"
                  >
                    <RotateCcw size={12} />
                    <span>Restore</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .history-menu {
          position: relative;
        }

        .history-menu__trigger {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-family: inherit;
          cursor: pointer;
          transition: background var(--t-fast), color var(--t-fast);
        }

        .history-menu__trigger:hover:not(:disabled) {
          background: var(--bg-muted);
          color: var(--text-primary);
        }

        .history-menu__trigger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .history-menu__count {
          font-size: 0.7rem;
          font-weight: 700;
          background: var(--brand);
          color: #fff;
          padding: 1px 6px;
          border-radius: 10px;
          line-height: 1;
        }

        .history-menu__chevron {
          transition: transform var(--t-fast);
          opacity: 0.6;
        }

        .history-menu__chevron--open {
          transform: rotate(180deg);
        }

        .history-menu__dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          min-width: 280px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
          padding: 8px 6px;
          z-index: 50;
          animation: fade-in 0.1s ease;
        }

        .history-menu__header {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
          padding: 6px 8px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 6px;
        }

        .history-menu__empty {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          padding: 12px 8px;
          text-align: center;
          line-height: 1.4;
        }

        .history-menu__list {
          max-height: 220px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .history-menu__item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
          border-radius: 10px;
          transition: background var(--t-fast);
          gap: 12px;
        }

        .history-menu__item:hover {
          background: var(--bg-hover);
        }

        .history-menu__item-info {
          flex: 1;
          min-width: 0;
        }

        .history-menu__item-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.6875rem;
          color: var(--text-tertiary);
          margin-bottom: 2px;
        }

        .history-menu__item-title {
          font-size: 0.8125rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .history-menu__restore-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: none;
          background: var(--brand);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: filter 0.15s ease;
        }

        .history-menu__restore-btn:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}
