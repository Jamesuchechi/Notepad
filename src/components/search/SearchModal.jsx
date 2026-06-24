import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';

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

  useEffect(() => {
    if (open) {
      setQuery('');
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
              placeholder="Search notes..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search notes"
            />
          </div>
          <button type="button" className="icon-btn search-modal__close" onClick={onClose} aria-label="Close search">
            <X size={18} />
          </button>
        </div>

        <div className="search-modal__content">
          {!query ? (
            <div className="search-modal__empty">Type to search note titles and content.</div>
          ) : results.length === 0 ? (
            <div className="search-modal__empty">No matches found.</div>
          ) : (
            <ul className="search-modal__results">
              {results.map((result) => (
                <li key={result.id} className="search-modal__result" onClick={() => handleSelect(result.id)}>
                  <h3 className="search-modal__title" dangerouslySetInnerHTML={{ __html: result.titleHtml }} />
                  <p className="search-modal__snippet" dangerouslySetInnerHTML={{ __html: result.snippet }} />
                </li>
              ))}
            </ul>
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
          color: var(--text-tertiary);
          font-size: 0.95rem;
          padding: 28px 0;
          text-align: center;
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
      `}</style>
    </div>
  );
}
