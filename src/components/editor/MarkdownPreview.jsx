import ReactMarkdown from 'react-markdown';

export default function MarkdownPreview({ markdown }) {
  return (
    <div className="note-preview-view">
      <ReactMarkdown>{markdown}</ReactMarkdown>

      <style>{`
        .note-preview-view {
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 22px 26px;
          color: var(--text-primary);
          min-height: 300px;
          overflow-x: auto;
        }

        .note-preview-view :where(h1, h2, h3, h4, h5, h6) {
          margin-top: 1.4rem;
          margin-bottom: 0.5rem;
          line-height: 1.2;
        }

        .note-preview-view p {
          margin: 0 0 1rem;
          line-height: 1.8;
        }

        .note-preview-view ul,
        .note-preview-view ol {
          margin: 0 0 1rem 1.35rem;
        }

        .note-preview-view code {
          font-family: 'JetBrains Mono', monospace;
          background: rgba(148, 163, 184, 0.12);
          padding: 0.15rem 0.35rem;
          border-radius: 8px;
        }

        .note-preview-view pre {
          margin: 0 0 1rem;
          padding: 14px 16px;
          background: rgba(148, 163, 184, 0.08);
          border-radius: 16px;
          overflow: auto;
        }

        .note-preview-view blockquote {
          margin: 0 0 1rem;
          padding-left: 16px;
          border-left: 4px solid var(--brand);
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
}
