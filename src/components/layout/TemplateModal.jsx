import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import templates from '@/utils/templates';

export default function TemplateModal({ open, onClose }) {
    const createNote = useNoteStore((s) => s.createNote);

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

    if (!open) return null;

    return (
        <div className="template-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="template-panel" onClick={(event) => event.stopPropagation()}>
                <div className="template-panel__header">
                    <div>
                        <h2>New note template</h2>
                        <p>Choose a starter template to begin faster.</p>
                    </div>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Close template picker" title="Close template picker">
                        <X size={16} />
                    </button>
                </div>

                <div className="template-panel__grid">
                    {templates.map((template) => (
                        <button
                            key={template.id}
                            type="button"
                            className="template-panel__card"
                            onClick={() => {
                                createNote({
                                    title: template.title,
                                    content: template.content,
                                    templateId: template.id,
                                });
                                onClose();
                            }}
                        >
                            <div className="template-panel__pill">{template.category}</div>
                            <h3>{template.title}</h3>
                            <p>{template.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            <style>{`
        .template-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 60;
        }

        .template-panel {
          width: min(620px, 100%);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
          animation: fade-in 0.15s ease;
        }

        .template-panel__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .template-panel__header h2 {
          margin: 0;
          font-size: 1.05rem;
          color: var(--text-primary);
        }

        .template-panel__header p {
          margin: 4px 0 0;
          color: var(--text-tertiary);
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .template-panel__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .template-panel__card {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
          padding: 18px;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: var(--bg-base);
          color: var(--text-primary);
          text-align: left;
          cursor: pointer;
          transition: transform var(--t-fast), border-color var(--t-fast), background var(--t-fast);
        }

        .template-panel__card:hover {
          transform: translateY(-1px);
          border-color: var(--brand);
          background: var(--bg-muted);
        }

        .template-panel__card span,
        .template-panel__card h3,
        .template-panel__card p {
          transition: color var(--t-fast);
        }

        .template-panel__pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.1);
          color: var(--brand);
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .template-panel__card h3 {
          margin: 0;
          font-size: 1rem;
          color: var(--text-primary);
          text-align: left;
        }

        .template-panel__card p {
          margin: 0;
          color: var(--text-tertiary);
          font-size: 0.85rem;
          line-height: 1.5;
          text-align: left;
        }

        @media (max-width: 640px) {
          .template-panel {
            width: 100%;
            padding: 18px;
          }

          .template-panel__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
}
