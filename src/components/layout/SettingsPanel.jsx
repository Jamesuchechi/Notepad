import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function SettingsPanel({ open, onClose }) {
  const theme = useSettingsStore((state) => state.theme);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const toggleTheme = useSettingsStore((state) => state.toggleTheme);
  const setFontSize = useSettingsStore((state) => state.setFontSize);

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
    <div className="settings-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <div className="settings-panel__header">
          <div>
            <h2>Settings</h2>
            <p>Customize theme and editor preferences.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close settings">
            <X size={16} />
          </button>
        </div>

        <div className="settings-panel__group">
          <h3>Theme</h3>
          <p>Cycle through system, light, and dark themes.</p>
          <button type="button" className="settings-panel__control" onClick={toggleTheme}>
            Current: {theme}
          </button>
        </div>

        <div className="settings-panel__group">
          <h3>Editor font size</h3>
          <div className="settings-panel__options">
            {['sm', 'md', 'lg'].map((size) => (
              <button
                key={size}
                type="button"
                className={`settings-panel__option ${fontSize === size ? 'settings-panel__option--active' : ''}`}
                onClick={() => setFontSize(size)}
              >
                {size.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .settings-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 60;
          padding: 20px;
        }

        .settings-panel {
          width: min(520px, 100%);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
        }

        .settings-panel__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .settings-panel__header h2 {
          margin: 0;
          font-size: 1.05rem;
          color: var(--text-primary);
        }

        .settings-panel__header p {
          margin: 4px 0 0;
          color: var(--text-tertiary);
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .settings-panel__group {
          margin-bottom: 18px;
        }

        .settings-panel__group h3 {
          margin: 0 0 8px;
          font-size: 0.92rem;
          color: var(--text-primary);
        }

        .settings-panel__group p {
          margin: 0 0 12px;
          color: var(--text-tertiary);
          font-size: 0.82rem;
        }

        .settings-panel__control,
        .settings-panel__option {
          padding: 10px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg-subtle);
          color: var(--text-primary);
          cursor: pointer;
          font-family: inherit;
          transition: background var(--t-fast), border-color var(--t-fast);
        }

        .settings-panel__control:hover,
        .settings-panel__option:hover {
          background: var(--bg-muted);
        }

        .settings-panel__options {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .settings-panel__option--active {
          border-color: var(--brand);
          background: rgba(79, 70, 229, 0.08);
          color: var(--brand);
        }
      `}</style>
    </div>
  );
}
