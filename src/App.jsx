import { useEffect, useState } from 'react';
import { Import, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNoteStore } from '@/store/useNoteStore';

export default function App() {
  const theme = useSettingsStore((s) => s.theme);
  const lastOpenedNoteId = useSettingsStore((s) => s.lastOpenedNoteId);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const notes = useNoteStore((s) => s.notes);

  const [sharedNote, setSharedNote] = useState(null);

  /* Apply / remove the Tailwind `dark` class on <html> */
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // 'system' — follow OS preference
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = (e) =>
        e.matches ? root.classList.add('dark') : root.classList.remove('dark');
      apply(mq);
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  useEffect(() => {
    if (!activeNoteId && lastOpenedNoteId && notes.length > 0) {
      const lastNoteExists = notes.some((note) => note.id === lastOpenedNoteId);
      if (lastNoteExists) {
        useNoteStore.getState().setActiveNote(lastOpenedNoteId);
      }
    }
  }, [activeNoteId, lastOpenedNoteId, notes]);

  // Check for shared note link hash
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#share=')) {
        try {
          const b64 = hash.replace('#share=', '');
          const json = decodeURIComponent(
            atob(b64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const data = JSON.parse(json);
          if (data && data.title && data.content) {
            setSharedNote(data);
          }
        } catch (err) {
          console.error('Failed to parse shared note link:', err);
        }
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleImport = () => {
    if (!sharedNote) return;
    const newId = useNoteStore.getState().createNote({
      title: sharedNote.title,
      content: sharedNote.content,
      tags: sharedNote.tags || [],
    });
    useNoteStore.getState().setActiveNote(newId);
    window.location.hash = '';
    setSharedNote(null);
    import('@/store/useToastStore').then(({ useToastStore }) => {
      useToastStore.getState().showToast(`Successfully imported "${sharedNote.title}"!`);
    });
  };

  const handleCancel = () => {
    window.location.hash = '';
    setSharedNote(null);
  };

  return (
    <>
      <AppShell />
      {sharedNote && (
        <div className="shared-note-backdrop" role="dialog" aria-modal="true">
          <div className="shared-note-modal">
            <div className="shared-note-modal__header">
              <div className="shared-note-modal__title-wrap">
                <Import size={18} className="shared-note-modal__icon" />
                <h2>Import Shared Note</h2>
              </div>
              <button onClick={handleCancel} className="shared-note-modal__close-btn" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="shared-note-modal__body">
              <p className="shared-note-modal__hint">
                Someone shared this note with you. You can preview it below and import it into your local vault.
              </p>

              <div className="shared-note-modal__preview-card">
                <h3 className="shared-note-modal__note-title">{sharedNote.title || 'Untitled'}</h3>
                {sharedNote.tags && sharedNote.tags.length > 0 && (
                  <div className="shared-note-modal__tags">
                    {sharedNote.tags.map((tag) => (
                      <span key={tag} className="shared-note-modal__tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  className="shared-note-modal__note-content"
                  dangerouslySetInnerHTML={{ __html: sharedNote.content }}
                />
              </div>
            </div>

            <div className="shared-note-modal__footer">
              <button className="shared-note-modal__btn shared-note-modal__btn--secondary" onClick={handleCancel}>
                Dismiss
              </button>
              <button className="shared-note-modal__btn shared-note-modal__btn--primary" onClick={handleImport}>
                Import to Vault
              </button>
            </div>
          </div>

          <style>{`
            .shared-note-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(15, 23, 42, 0.6);
              backdrop-filter: blur(8px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
              padding: 16px;
              animation: shared-fade-in 0.2s ease;
            }

            @keyframes shared-fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            .shared-note-modal {
              width: min(600px, 100%);
              max-height: min(80vh, 700px);
              background: var(--bg-base);
              border: 1px solid var(--border);
              border-radius: 20px;
              box-shadow: 0 24px 60px rgba(0, 0, 0, 0.2);
              display: flex;
              flex-direction: column;
              overflow: hidden;
              animation: shared-slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @keyframes shared-slide-up {
              from { transform: translateY(20px); }
              to { transform: translateY(0); }
            }

            .shared-note-modal__header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 18px 24px;
              border-bottom: 1px solid var(--border);
            }

            .shared-note-modal__title-wrap {
              display: flex;
              align-items: center;
              gap: 10px;
            }

            .shared-note-modal__title-wrap h2 {
              margin: 0;
              font-size: 1.1rem;
              font-weight: 600;
              color: var(--text-primary);
            }

            .shared-note-modal__icon {
              color: var(--brand);
            }

            .shared-note-modal__close-btn {
              border: none;
              background: none;
              color: var(--text-tertiary);
              cursor: pointer;
              padding: 4px;
              border-radius: 8px;
              transition: background var(--t-fast), color var(--t-fast);
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .shared-note-modal__close-btn:hover {
              background: var(--bg-subtle);
              color: var(--text-primary);
            }

            .shared-note-modal__body {
              padding: 24px;
              overflow-y: auto;
              display: flex;
              flex-direction: column;
              gap: 16px;
              flex: 1;
            }

            .shared-note-modal__hint {
              margin: 0;
              font-size: 0.85rem;
              color: var(--text-secondary);
              line-height: 1.5;
            }

            .shared-note-modal__preview-card {
              border: 1px solid var(--border-strong, var(--border));
              background: var(--bg-subtle);
              border-radius: 14px;
              padding: 20px;
              max-height: 350px;
              overflow-y: auto;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .shared-note-modal__note-title {
              margin: 0;
              font-size: 1.25rem;
              font-weight: 700;
              color: var(--text-primary);
            }

            .shared-note-modal__tags {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
            }

            .shared-note-modal__tag-pill {
              background: var(--bg-active);
              border: 1px solid var(--border);
              color: var(--text-secondary);
              padding: 4px 10px;
              border-radius: 999px;
              font-size: 0.72rem;
              font-weight: 500;
            }

            .shared-note-modal__note-content {
              font-size: 0.875rem;
              line-height: 1.7;
              color: var(--text-secondary);
            }

            .shared-note-modal__note-content h1,
            .shared-note-modal__note-content h2,
            .shared-note-modal__note-content h3 {
              color: var(--text-primary);
              margin-top: 1.2em;
              margin-bottom: 0.4em;
            }

            .shared-note-modal__note-content p {
              margin: 0 0 1em;
            }

            .shared-note-modal__footer {
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              padding: 16px 24px;
              border-top: 1px solid var(--border);
              background: var(--bg-subtle);
            }

            .shared-note-modal__btn {
              padding: 10px 18px;
              border-radius: 12px;
              font-size: 0.85rem;
              font-weight: 500;
              cursor: pointer;
              font-family: inherit;
              transition: all var(--t-fast);
              border: none;
            }

            .shared-note-modal__btn--secondary {
              background: var(--bg-base);
              border: 1px solid var(--border);
              color: var(--text-primary);
            }

            .shared-note-modal__btn--secondary:hover {
              background: var(--bg-hover);
            }

            .shared-note-modal__btn--primary {
              background: var(--brand);
              color: #fff;
            }

            .shared-note-modal__btn--primary:hover {
              filter: brightness(1.08);
            }
          `}</style>
        </div>
      )}
    </>
  );
}