import React, { useState, useEffect } from 'react';
import { Sparkles, Check, X, Loader2 } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNoteStore } from '@/store/useNoteStore';
import { stream } from '@/utils/ai';

export default function JournalPrompt({ note, editor }) {
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const journalPromptEnabled = useSettingsStore((s) => s.aiFeatures?.journalPrompt);
  const updateNote = useNoteStore((s) => s.updateNote);

  const [isGenerating, setIsGenerating] = useState(false);

  const showPrompt =
    aiEnabled &&
    journalPromptEnabled &&
    note?.templateId === 'journal' &&
    note?.promptState !== 'dismissed' &&
    note?.promptState !== 'inserted';

  useEffect(() => {
    if (!showPrompt || note.journalPromptText || isGenerating) return;

    let active = true;
    const generatePrompt = async () => {
      setIsGenerating(true);
      const todayStr = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const prompt = `Generate a single, deeply reflective, open-ended journal prompt / question suitable for a daily diary reflection. The current date is ${todayStr}. Return only the question itself, without any introductory phrases, quotes, or conversational filler. Keep it under 25 words:`;

      try {
        let resultText = '';
        const responseStream = stream([{ role: 'user', content: prompt }]);
        for await (const chunk of responseStream) {
          if (!active) return;
          resultText += chunk;
        }

        if (active) {
          updateNote(note.id, {
            journalPromptText: resultText.trim(),
            promptState: 'pending',
          });
        }
      } catch (err) {
        console.error('Failed to generate journal prompt:', err);
      } finally {
        if (active) {
          setIsGenerating(false);
        }
      }
    };

    generatePrompt();

    return () => {
      active = false;
    };
  }, [note?.id, showPrompt, note?.journalPromptText]);

  if (!showPrompt) return null;

  const handleInsert = () => {
    if (!editor || !note.journalPromptText) return;

    editor.commands.insertContentAt(0, `<blockquote><strong>Daily Prompt:</strong> <em>${note.journalPromptText}</em></blockquote>`);
    updateNote(note.id, { promptState: 'inserted' });
  };

  const handleDismiss = () => {
    updateNote(note.id, { promptState: 'dismissed' });
  };

  return (
    <div className="journal-prompt-banner">
      <div className="journal-prompt-banner__content">
        <Sparkles size={16} className="journal-prompt-banner__icon" />
        <div className="journal-prompt-banner__text">
          {isGenerating ? (
            <span className="journal-prompt-banner__loading">
              <Loader2 size={12} className="spinner" />
              Generating daily journal prompt...
            </span>
          ) : (
            <>
              <strong>Daily Prompt:</strong> {note.journalPromptText}
            </>
          )}
        </div>
      </div>
      {!isGenerating && note.journalPromptText && (
        <div className="journal-prompt-banner__actions">
          <button
            type="button"
            className="journal-prompt-banner__btn journal-prompt-banner__btn--insert"
            onClick={handleInsert}
          >
            <Check size={14} />
            Insert
          </button>
          <button
            type="button"
            className="journal-prompt-banner__btn journal-prompt-banner__btn--dismiss"
            onClick={handleDismiss}
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <style>{`
        .journal-prompt-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 16px 48px 0;
          padding: 12px 16px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(167, 139, 250, 0.08));
          border: 1px dashed rgba(99, 102, 241, 0.3);
          border-radius: 14px;
          animation: slide-down 0.2s ease;
        }

        .journal-prompt-banner__content {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .journal-prompt-banner__icon {
          color: var(--brand);
          flex-shrink: 0;
        }

        .journal-prompt-banner__text {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .journal-prompt-banner__loading {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .journal-prompt-banner__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .journal-prompt-banner__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: background var(--t-fast), border-color var(--t-fast);
          border: 1px solid transparent;
        }

        .journal-prompt-banner__btn--insert {
          background: var(--brand);
          color: #fff;
        }

        .journal-prompt-banner__btn--insert:hover {
          background: var(--brand-hover);
        }

        .journal-prompt-banner__btn--dismiss {
          background: transparent;
          border-color: var(--border);
          color: var(--text-secondary);
          padding: 6px;
        }

        .journal-prompt-banner__btn--dismiss:hover {
          background: var(--bg-muted);
          color: var(--text-primary);
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes slide-down {
          from {
            transform: translateY(-8px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .journal-prompt-banner {
            margin: 12px 16px 0;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .journal-prompt-banner__actions {
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
