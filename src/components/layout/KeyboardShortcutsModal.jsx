import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function KeyboardShortcutsModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="shortcuts-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(event) => event.stopPropagation()}>
        <div className="shortcuts-modal__header">
          <div>
            <h2>Keyboard shortcuts</h2>
            <p>Quick commands for faster note workflows.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close shortcuts" title="Close shortcuts">
            <X size={16} />
          </button>
        </div>

        <div className="shortcuts-modal__list">
          <div className="shortcut-row">
            <span>New note</span>
            <kbd>Cmd/Ctrl + N</kbd>
          </div>
          <div className="shortcut-row">
            <span>Search notes</span>
            <kbd>Cmd/Ctrl + F</kbd>
          </div>
          <div className="shortcut-row">
            <span>Force save</span>
            <kbd>Cmd/Ctrl + S</kbd>
          </div>
          <div className="shortcut-row">
            <span>Toggle markdown preview</span>
            <kbd>Cmd/Ctrl + E</kbd>
          </div>
          <div className="shortcut-row">
            <span>Toggle focus mode</span>
            <kbd>Cmd/Ctrl + Shift + F</kbd>
          </div>
          <div className="shortcut-row">
            <span>Open settings</span>
            <kbd>Cmd/Ctrl + ,</kbd>
          </div>
          <div className="shortcut-row">
            <span>Close modals</span>
            <kbd>Esc</kbd>
          </div>

          <div className="shortcuts-modal__section-title">AI features</div>
          <div className="shortcut-row">
            <span>Open AI Chat</span>
            <kbd>Cmd/Ctrl + Shift + A</kbd>
          </div>
          <div className="shortcut-row">
            <span>Open voice note</span>
            <kbd>Cmd/Ctrl + Shift + V</kbd>
          </div>
          <div className="shortcut-row">
            <span>AI features require API access and may queue if the service is busy</span>
            <kbd>Info</kbd>
          </div>
        </div>
      </div>

      <style>{`
        .shortcuts-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 60;
          padding: 20px;
        }

        .shortcuts-modal {
          width: min(520px, 100%);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
          animation: fade-in 0.15s ease;
        }

        .shortcuts-modal__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .shortcuts-modal__header h2 {
          margin: 0;
          font-size: 1.05rem;
          color: var(--text-primary);
        }

        .shortcuts-modal__header p {
          margin: 4px 0 0;
          color: var(--text-tertiary);
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .shortcuts-modal__list {
          display: grid;
          gap: 12px;
        }

        .shortcuts-modal__section-title {
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
          margin-top: 8px;
          margin-bottom: -4px;
          font-weight: 600;
        }

        .shortcut-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 14px;
          background: var(--bg-subtle);
        }

        .shortcut-row span {
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 52px;
          padding: 6px 10px;
          border-radius: 999px;
          background: var(--bg-base);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>
    </div>
  );
}
