import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';

/**
 * ImportButton
 * ─────────────
 * Renders an "Import" button that opens a file picker.
 * Accepts .md and .txt files, creates a new note per file.
 * Also registers a global drag-and-drop handler onto document.body.
 */
export default function ImportButton() {
  const fileInputRef = useRef(null);
  const createNote = useNoteStore((s) => s.createNote);
  const [importing, setImporting] = useState(false);

  const processFiles = async (files) => {
    const accepted = [...files].filter((f) =>
      f.name.endsWith('.md') || f.name.endsWith('.txt')
    );
    if (accepted.length === 0) return;

    setImporting(true);
    for (const file of accepted) {
      const text = await file.text();
      const title = file.name.replace(/\.(md|txt)$/, '').trim() || 'Imported note';

      // Convert plain text to minimal HTML paragraphs
      const content = text
        .split(/\n{2,}/)
        .map((para) => `<p>${para.trim().replace(/\n/g, '<br />')}</p>`)
        .join('');

      createNote({ title, content });
    }
    setImporting(false);
  };

  useEffect(() => {
    const handleDragOver = (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (event) => {
      event.preventDefault();
      if (event.dataTransfer.files?.length) {
        processFiles(event.dataTransfer.files);
      }
    };

    document.body.addEventListener('dragover', handleDragOver);
    document.body.addEventListener('drop', handleDrop);

    return () => {
      document.body.removeEventListener('dragover', handleDragOver);
      document.body.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files?.length) processFiles(e.target.files);
    // Reset so the same file can be re-imported
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt"
        multiple
        className="import-file-input"
        onChange={handleFileChange}
        aria-label="Import notes from file"
      />

      <button
        type="button"
        className="import-btn"
        title="Import .md or .txt files"
        aria-label="Import notes"
        disabled={importing}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={15} />
        <span>{importing ? 'Importing…' : 'Import'}</span>
      </button>

      <style>{`
        .import-file-input {
          display: none;
        }

        .import-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-family: inherit;
          cursor: pointer;
          transition: background var(--t-fast), color var(--t-fast);
          white-space: nowrap;
        }

        .import-btn:hover {
          background: var(--bg-muted);
          color: var(--text-primary);
        }

        .import-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}