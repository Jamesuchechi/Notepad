import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Sparkles, AlertCircle } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { stream } from '@/utils/ai';

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || div.innerText || '';
}

function highlightTerm(text, term) {
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export default function SearchModal({ open, onClose }) {
  const notes = useNoteStore((s) => s.notes);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const searchEnabled = useSettingsStore((s) => s.aiFeatures?.search);

  const [searchMode, setSearchMode] = useState('keyword'); // 'keyword' | 'ai'
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [fallbackActive, setFallbackActive] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSearchMode('keyword');
      setAiResults([]);
      setFallbackActive(false);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return [];

    return notes
      .map((note) => {
        const title = note.title?.trim() || 'Untitled';
        const content = stripHtml(note.content || '');
        const titleMatch = title.toLowerCase().includes(term);
        const contentMatch = content.toLowerCase().includes(term);

        if (!titleMatch && !contentMatch) return null;

        const source = titleMatch ? title : content;
        const index = source.toLowerCase().indexOf(term);
        let snippet = source;

        if (!titleMatch && index >= 0) {
          const start = Math.max(0, index - 30);
          const end = Math.min(source.length, index + term.length + 90);
          snippet = `${start > 0 ? '…' : ''}${source.slice(start, end)}${end < source.length ? '…' : ''}`;
        }

        return {
          id: note.id,
          title,
          snippet: highlightTerm(snippet, term),
          titleHtml: highlightTerm(title, term),
          updatedAt: note.updatedAt,
        };
      })
      .filter(Boolean);
  }, [notes, query]);

  const handleAISearch = async (searchQuery) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    setIsSearchingAI(true);
    setFallbackActive(false);

    const notesData = notes.map((n) => ({
      id: n.id,
      title: n.title || 'Untitled',
      content: stripHtml(n.content || '').slice(0, 250),
    }));

    const systemPrompt = `You are a semantic search engine for a notes app. Given a query and a JSON list of notes, return a JSON array of the notes that match the query semantically.
Rank them in order of relevance (most relevant first).
For each matching note, return a JSON object with:
1. "id": the exact string ID of the note.
2. "snippet": a short snippet of the note content (approx 100-150 chars) highlighting the relevance. Wrap the key terms relevant to the query in <mark>...</mark> tags.

If no notes are relevant, return an empty array [].
Return ONLY the JSON array. Do not include markdown code block syntax (like \`\`\`json) or any explanations outside the JSON.`;

    const userPrompt = `Query: "${trimmed}"\n\nNotes:\n${JSON.stringify(notesData, null, 2)}`;

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      let accumulatedText = '';
      const responseStream = stream(messages);
      for await (const chunk of responseStream) {
        accumulatedText += chunk;
      }

      const cleaned = accumulatedText.replace(/```json|```/g, '').trim();
      if (cleaned === '[]' || !cleaned) {
        setAiResults([]);
        return;
      }

      const ranked = JSON.parse(cleaned);
      if (!Array.isArray(ranked)) {
        throw new Error('Response is not a JSON array');
      }

      const mapped = ranked
        .map((item) => {
          const note = notes.find((n) => n.id === item.id);
          if (!note) return null;
          return {
            id: note.id,
            title: note.title || 'Untitled',
            snippet: item.snippet,
            titleHtml: note.title || 'Untitled',
            updatedAt: note.updatedAt,
          };
        })
        .filter(Boolean);

      setAiResults(mapped);
    } catch (err) {
      console.error('AI search failed, falling back to keyword search:', err);
      setFallbackActive(true);
      
      // Fallback: use keyword filtering
      const keywordResults = notes
        .map((note) => {
          const title = note.title?.trim() || 'Untitled';
          const content = stripHtml(note.content || '');
          const titleMatch = title.toLowerCase().includes(trimmed.toLowerCase());
          const contentMatch = content.toLowerCase().includes(trimmed.toLowerCase());

          if (!titleMatch && !contentMatch) return null;

          const source = titleMatch ? title : content;
          const index = source.toLowerCase().indexOf(trimmed.toLowerCase());
          let snippet = source;

          if (!titleMatch && index >= 0) {
            const start = Math.max(0, index - 30);
            const end = Math.min(source.length, index + trimmed.length + 90);
            snippet = `${start > 0 ? '…' : ''}${source.slice(start, end)}${end < source.length ? '…' : ''}`;
          }

          return {
            id: note.id,
            title,
            snippet: highlightTerm(snippet, trimmed),
            titleHtml: highlightTerm(title, trimmed),
            updatedAt: note.updatedAt,
          };
        })
        .filter(Boolean);

      setAiResults(keywordResults);
    } finally {
      setIsSearchingAI(false);
    }
  };

  const setActiveNote = useNoteStore((s) => s.setActiveNote);

  const handleSelect = (id) => {
    setActiveNote(id);
    onClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="search-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="search-modal" onClick={(event) => event.stopPropagation()}>
        <div className="search-modal__header">
          <div className="search-modal__input-wrap">
            <Search size={18} />
            <input
              ref={inputRef}
              className="search-modal__input"
              type="text"
              placeholder={searchMode === 'ai' ? "Describe what you're looking for with AI..." : "Search notes..."}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (searchMode === 'ai') {
                    handleAISearch(query);
                  }
                }
              }}
              aria-label="Search notes"
            />
            {searchMode === 'ai' && query.trim() && (
              <button
                type="button"
                className="search-modal__ai-trigger-btn"
                onClick={() => handleAISearch(query)}
                disabled={isSearchingAI}
                title="Search with AI"
              >
                {isSearchingAI ? (
                  <span className="search-modal__spinner" />
                ) : (
                  <Sparkles size={16} />
                )}
              </button>
            )}
          </div>

          {aiEnabled && searchEnabled && (
            <div className="search-modal__mode-toggle">
              <button
                type="button"
                className={`search-modal__mode-btn ${searchMode === 'keyword' ? 'search-modal__mode-btn--active' : ''}`}
                onClick={() => setSearchMode('keyword')}
              >
                Keyword
              </button>
              <button
                type="button"
                className={`search-modal__mode-btn ${searchMode === 'ai' ? 'search-modal__mode-btn--active' : ''}`}
                onClick={() => setSearchMode('ai')}
              >
                <Sparkles size={13} />
                AI Search
              </button>
            </div>
          )}

          <button type="button" className="icon-btn search-modal__close" onClick={onClose} aria-label="Close search" title="Close search">
            <X size={18} />
          </button>
        </div>

        <div className="search-modal__content">
          {fallbackActive && (
            <div className="search-modal__alert">
              <AlertCircle size={15} />
              <span>AI Search failed. Showing keyword search fallback.</span>
            </div>
          )}

          {searchMode === 'ai' && isSearchingAI ? (
            <div className="search-modal__loading">
              <div className="search-modal__spinner search-modal__spinner--large" />
              <div>AI is analyzing and ranking your notes...</div>
            </div>
          ) : searchMode === 'ai' ? (
            !query ? (
              <div className="search-modal__empty">
                <div className="search-modal__empty-icon" aria-hidden="true">🧠</div>
                <div>Describe what you're looking for and press Enter to search with AI.</div>
              </div>
            ) : aiResults.length === 0 ? (
              <div className="search-modal__empty">
                <div className="search-modal__empty-icon" aria-hidden="true">🚫</div>
                <div>No relevant notes found. Try adjusting your query.</div>
              </div>
            ) : (
              <ul className="search-modal__results">
                {aiResults.map((result) => (
                  <li key={result.id} className="search-modal__result" onClick={() => handleSelect(result.id)}>
                    <h3 className="search-modal__title" dangerouslySetInnerHTML={{ __html: result.titleHtml }} />
                    <p className="search-modal__snippet" dangerouslySetInnerHTML={{ __html: result.snippet }} />
                  </li>
                ))}
              </ul>
            )
          ) : (
            // Keyword mode
            !query ? (
              <div className="search-modal__empty">
                <div className="search-modal__empty-icon" aria-hidden="true">🔎</div>
                <div>Type to search note titles and content.</div>
              </div>
            ) : results.length === 0 ? (
              <div className="search-modal__empty">
                <div className="search-modal__empty-icon" aria-hidden="true">🚫</div>
                <div>No matches found. Try a different keyword.</div>
              </div>
            ) : (
              <ul className="search-modal__results">
                {results.map((result) => (
                  <li key={result.id} className="search-modal__result" onClick={() => handleSelect(result.id)}>
                    <h3 className="search-modal__title" dangerouslySetInnerHTML={{ __html: result.titleHtml }} />
                    <p className="search-modal__snippet" dangerouslySetInnerHTML={{ __html: result.snippet }} />
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>

      <style>{`
        .search-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(8px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .search-modal {
          width: min(760px, 100%);
          max-height: 80vh;
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(15, 23, 42, 0.2);
          display: flex;
          flex-direction: column;
          animation: fade-in 0.16s ease;
        }

        .search-modal__header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
        }

        .search-modal__input-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 14px;
        }

        .search-modal__input {
          width: 100%;
          border: none;
          background: transparent;
          color: var(--text-primary);
          font-size: 1rem;
          outline: none;
        }

        .search-modal__close {
          border-radius: 12px;
        }

        .search-modal__content {
          overflow-y: auto;
          padding: 16px 24px 24px;
          flex: 1;
        }

        .search-modal__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--text-tertiary);
          font-size: 0.95rem;
          padding: 28px 0;
          text-align: center;
        }

        .search-modal__empty-icon {
          font-size: 1.8rem;
        }

        .search-modal__results {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 10px;
        }

        .search-modal__result {
          padding: 14px 16px;
          border-radius: 16px;
          background: var(--bg-subtle);
          cursor: pointer;
          transition: background var(--t-fast);
        }

        .search-modal__result:hover {
          background: var(--bg-hover);
        }

        .search-modal__title {
          font-size: 0.95rem;
          margin: 0 0 6px;
          color: var(--text-primary);
          font-weight: 600;
        }

        .search-modal__snippet {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.5;
          font-size: 0.88rem;
        }

        .search-modal__snippet mark,
        .search-modal__title mark {
          background: var(--brand);
          color: #fff;
          padding: 0 4px;
          border-radius: 4px;
        }

        .search-modal__mode-toggle {
          display: flex;
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 3px;
          gap: 2px;
        }

        .search-modal__mode-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          font-size: 0.82rem;
          font-weight: 500;
          border-radius: 9px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background var(--t-fast), color var(--t-fast);
        }

        .search-modal__mode-btn:hover {
          color: var(--text-primary);
        }

        .search-modal__mode-btn--active {
          background: var(--bg-base);
          color: var(--brand);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .search-modal__ai-trigger-btn {
          background: var(--brand);
          border: none;
          color: #fff;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background var(--t-fast), transform var(--t-fast);
        }

        .search-modal__ai-trigger-btn:hover {
          background: var(--brand-hover);
        }

        .search-modal__ai-trigger-btn:active {
          transform: scale(0.95);
        }

        .search-modal__loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 48px 0;
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        .search-modal__spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .search-modal__spinner--large {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top-color: var(--brand);
        }

        .search-modal__alert {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--danger-bg);
          border: 1px solid var(--danger);
          color: var(--danger);
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.85rem;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
