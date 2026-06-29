import { useEffect, useRef } from 'react';

export default function CodeEditor({ value, onChange, placeholder = 'Start typing code...' }) {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const lines = value ? value.split('\n') : [''];
  const lineCount = Math.max(1, lines.length);

  const handleScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Keep line numbers scrolled with textarea on load or edit
  useEffect(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [value]);

  const handleKeyDown = (e) => {
    // Basic code editing convenience: Tab inserts 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      // Reset cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div className="code-editor-container">
      <div className="code-editor-gutter" ref={lineNumbersRef} aria-hidden="true">
        {Array.from({ length: lineCount }).map((_, index) => (
          <div key={index} className="code-editor-line-number">
            {index + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className="code-editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck="false"
      />

      <style>{`
        .code-editor-container {
          display: flex;
          flex: 1;
          height: 100%;
          min-height: 350px;
          background: var(--bg-subtle, #1e293b);
          border: 1px solid var(--border, #334155);
          border-radius: 12px;
          overflow: hidden;
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .code-editor-gutter {
          width: 48px;
          padding: 16px 0;
          background: rgba(0, 0, 0, 0.15);
          color: var(--text-tertiary, #64748b);
          text-align: right;
          padding-right: 12px;
          user-select: none;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .code-editor-line-number {
          height: 1.6em;
        }

        .code-editor-textarea {
          flex: 1;
          padding: 16px;
          border: none;
          outline: none;
          background: transparent;
          color: var(--text-primary, #f8fafc);
          resize: none;
          overflow-y: auto;
          line-height: 1.6;
          font-family: inherit;
          font-size: inherit;
          white-space: pre;
        }

        .code-editor-textarea::placeholder {
          color: var(--text-tertiary, #64748b);
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
