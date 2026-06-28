import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState, useEffect, useRef } from 'react';
import { loadKatex } from '@/utils/cdn';

function MathBlockView({ node, updateAttributes }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formula, setFormula] = useState(node.attrs.formula || '');
  const containerRef = useRef(null);

  useEffect(() => {
    loadKatex().then((katex) => {
      if (containerRef.current && katex) {
        katex.render(formula || '\\text{Click to enter LaTeX formula}', containerRef.current, {
          throwOnError: false,
          displayMode: true,
        });
      }
    });
  }, [formula]);

  const handleSave = () => {
    updateAttributes({ formula });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="math-block-wrapper">
      {isEditing ? (
        <div className="math-block-editor" contentEditable={false}>
          <textarea
            className="math-block-textarea"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="e.g. E = mc^2"
            autoFocus
          />
          <div className="math-block-actions">
            <button className="math-btn math-btn--save" onClick={handleSave}>Save</button>
            <button className="math-btn math-btn--cancel" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div 
          className="math-block-render" 
          contentEditable={false}
          onClick={() => setIsEditing(true)}
          title="Click to edit formula"
          ref={containerRef}
        />
      )}

      <style>{`
        .math-block-wrapper {
          margin: 1.5em 0;
          background: var(--bg-subtle, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          padding: 16px;
          min-height: 50px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .math-block-render {
          width: 100%;
          cursor: pointer;
          display: flex;
          justify-content: center;
          padding: 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .math-block-render:hover {
          background: rgba(99, 102, 241, 0.05);
        }

        .math-block-editor {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .math-block-textarea {
          width: 100%;
          min-height: 80px;
          padding: 10px;
          font-family: monospace;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 6px;
          background: var(--bg-base, #ffffff);
          color: var(--text-primary, #0f172a);
          resize: vertical;
        }

        .math-block-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .math-btn {
          padding: 6px 12px;
          border-radius: 5px;
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
        }

        .math-btn--save {
          background: var(--brand, #6366f1);
          color: white;
        }

        .math-btn--cancel {
          background: var(--border, #e2e8f0);
          color: var(--text-secondary, #475569);
        }
      `}</style>
    </NodeViewWrapper>
  );
}

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  content: 'inline*',
  atom: true,

  addAttributes() {
    return {
      formula: {
        default: 'f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i x \\xi}\\,d\\xi',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-math-block]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-math-block': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },
});
