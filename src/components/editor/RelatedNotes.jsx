import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Link as LinkIcon, Sparkles, Loader2 } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { stream } from '@/utils/ai';

export default function RelatedNotes({ note, editor }) {
  const notes = useNoteStore((s) => s.notes);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const relatedNotesEnabled = useSettingsStore((s) => s.aiFeatures?.relatedNotes);

  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [related, setRelated] = useState([]);

  const otherNotes = useMemo(() => {
    return notes.filter((n) => n.id !== note.id);
  }, [notes, note.id]);

  const stripHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div.textContent || div.innerText || '';
  };

  useEffect(() => {
    if (!aiEnabled || !relatedNotesEnabled || otherNotes.length === 0 || !editor) {
      setRelated([]);
      return;
    }

    const plainText = stripHtml(note.content).trim();
    if (plainText.length < 30) {
      setRelated([]);
      return;
    }

    let active = true;
    const analyzeTimer = setTimeout(async () => {
      setIsAnalyzing(true);
      const otherNotesPayload = otherNotes.map((n) => ({
        id: n.id,
        title: n.title || 'Untitled',
        content: stripHtml(n.content).slice(0, 150),
      }));

      const prompt = `You are a semantic analysis system. Given the source note below, compare it to the list of other notes and identify the top 3 most contextually related notes.
Return the result strictly as a JSON array of objects, ordered by relevance (highest first). Each object must have:
1. "id": the exact string ID of the related note.
2. "reason": a very short reason (under 12 words) explaining the relationship.

Source Note Title: ${note.title || 'Untitled'}
Source Note Content: ${plainText.slice(0, 500)}

Other Notes:
${JSON.stringify(otherNotesPayload, null, 2)}

Return ONLY the JSON array. Do not include markdown code block syntax (like \`\`\`json) or any explanations.`;

      try {
        let responseText = '';
        const responseStream = stream([{ role: 'user', content: prompt }]);
        for await (const chunk of responseStream) {
          if (!active) return;
          responseText += chunk;
        }

        const cleaned = responseText.replace(/```json|```/g, '').trim();
        if (cleaned === '[]' || !cleaned) {
          if (active) setRelated([]);
          return;
        }

        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          const mapped = parsed
            .map((item) => {
              const matchingNote = otherNotes.find((n) => n.id === item.id);
              if (!matchingNote) return null;
              return {
                id: matchingNote.id,
                title: matchingNote.title || 'Untitled',
                reason: item.reason,
              };
            })
            .filter(Boolean);

          if (active) setRelated(mapped);
        }
      } catch (err) {
        console.error('Failed to get related notes:', err);
      } finally {
        if (active) setIsAnalyzing(false);
      }
    }, 2500);

    return () => {
      active = false;
      clearTimeout(analyzeTimer);
    };
  }, [note.id, note.content, note.title, otherNotes, aiEnabled, relatedNotesEnabled]);

  if (!aiEnabled || !relatedNotesEnabled || otherNotes.length === 0) {
    return null;
  }

  const handleLinkNote = (relatedNote, e) => {
    e.stopPropagation();
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertContent(`<a href="#" class="note-link" data-note-id="${relatedNote.id}">${relatedNote.title}</a>`)
      .run();
  };

  return (
    <div className={`related-notes-panel ${isOpen ? 'related-notes-panel--open' : ''}`}>
      <button
        type="button"
        className="related-notes-panel__header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="related-notes-panel__title">
          <Sparkles size={14} className="related-icon" />
          <span>Related Notes ({related.length})</span>
          {isAnalyzing && <Loader2 size={12} className="spinner" />}
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {isOpen && (
        <div className="related-notes-panel__content">
          {related.length === 0 ? (
            <div className="related-notes-panel__empty">
              {isAnalyzing ? 'Analyzing connections...' : 'No related notes found.'}
            </div>
          ) : (
            <ul className="related-notes-panel__list">
              {related.map((item) => (
                <li
                  key={item.id}
                  className="related-notes-panel__item"
                  onClick={() => setActiveNote(item.id)}
                >
                  <div className="related-notes-panel__item-info">
                    <h4>{item.title}</h4>
                    <p>{item.reason}</p>
                  </div>
                  <button
                    type="button"
                    className="related-notes-panel__link-btn"
                    onClick={(e) => handleLinkNote(item, e)}
                    title="Insert link in editor"
                  >
                    <LinkIcon size={13} />
                    <span>Link this note</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <style>{`
        .related-notes-panel {
          border-top: 1px solid var(--border);
          background: var(--bg-subtle);
          flex-shrink: 0;
          transition: max-height 0.2s ease;
        }

        .related-notes-panel__header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 48px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.82rem;
          cursor: pointer;
          transition: background var(--t-fast), color var(--t-fast);
        }

        .related-notes-panel__header:hover {
          background: var(--bg-muted);
          color: var(--text-primary);
        }

        .related-notes-panel__title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .related-icon {
          color: var(--brand);
        }

        .related-notes-panel__content {
          padding: 12px 48px 20px;
          border-top: 1px solid var(--border);
          max-height: 250px;
          overflow-y: auto;
        }

        .related-notes-panel__empty {
          color: var(--text-tertiary);
          font-size: 0.85rem;
          text-align: center;
          padding: 16px 0;
        }

        .related-notes-panel__list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 10px;
        }

        .related-notes-panel__item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 10px 14px;
          border-radius: 12px;
          background: var(--bg-base);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: transform var(--t-fast), border-color var(--t-fast);
        }

        .related-notes-panel__item:hover {
          transform: translateY(-1px);
          border-color: var(--brand);
        }

        .related-notes-panel__item-info {
          flex: 1;
        }

        .related-notes-panel__item-info h4 {
          margin: 0 0 2px;
          font-size: 0.88rem;
          color: var(--text-primary);
          font-weight: 600;
        }

        .related-notes-panel__item-info p {
          margin: 0;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .related-notes-panel__link-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-secondary);
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
        }

        .related-notes-panel__link-btn:hover {
          background: rgba(99, 102, 241, 0.08);
          border-color: var(--brand);
          color: var(--brand);
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .related-notes-panel__header {
            padding: 10px 20px;
          }
          .related-notes-panel__content {
            padding: 12px 20px;
          }
          .related-notes-panel__item {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .related-notes-panel__link-btn {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
