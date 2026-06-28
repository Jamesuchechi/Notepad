import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState, useEffect, useRef } from 'react';
import { loadMermaid } from '@/utils/cdn';

function MermaidBlockView({ node, updateAttributes }) {
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(node.attrs.code || 'graph TD\n  A[Start] --> B(Process)\n  B --> C[End]');
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      try {
        const mermaid = await loadMermaid();
        if (!mermaid || !active) return;
        
        setError(null);
        // Clear previous chart
        containerRef.current.innerHTML = '';
        
        const id = `mermaid-svg-${Math.random().toString(36).substr(2, 9)}`;
        // Use mermaid render API to draw SVG and set it
        const { svg } = await mermaid.render(id, code);
        if (active && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        console.error('Mermaid render error:', e);
        if (active) {
          setError(e.message || 'Mermaid Syntax Error');
        }
      }
    };
    
    renderDiagram();
    
    return () => {
      active = false;
    };
  }, [code]);

  const handleSave = () => {
    updateAttributes({ code });
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="mermaid-block-wrapper">
      {isEditing ? (
        <div className="mermaid-block-editor" contentEditable={false}>
          <textarea
            className="mermaid-block-textarea"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="graph TD..."
            autoFocus
          />
          <div className="mermaid-block-actions">
            <button className="mermaid-btn mermaid-btn--save" onClick={handleSave}>Render</button>
            <button className="mermaid-btn mermaid-btn--cancel" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mermaid-block-preview" contentEditable={false}>
          <div 
            className="mermaid-block-render" 
            onClick={() => setIsEditing(true)}
            title="Click to edit diagram"
            ref={containerRef}
          />
          {error && <div className="mermaid-error">{error}</div>}
          <button className="mermaid-edit-btn" onClick={() => setIsEditing(true)}>Edit Diagram</button>
        </div>
      )}

      <style>{`
        .mermaid-block-wrapper {
          margin: 1.5em 0;
          background: var(--bg-subtle, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          padding: 16px;
          min-height: 80px;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .mermaid-block-preview {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .mermaid-block-render {
          width: 100%;
          cursor: pointer;
          display: flex;
          justify-content: center;
          padding: 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
          overflow-x: auto;
        }

        .mermaid-block-render:hover {
          background: rgba(99, 102, 241, 0.05);
        }

        .mermaid-block-render svg {
          max-width: 100%;
          height: auto;
        }

        .mermaid-error {
          width: 100%;
          padding: 10px;
          background: rgba(239, 68, 68, 0.08);
          border-left: 3px solid var(--danger, #ef4444);
          color: var(--danger, #ef4444);
          font-size: 0.78rem;
          font-family: monospace;
          white-space: pre-wrap;
          border-radius: 4px;
        }

        .mermaid-edit-btn {
          align-self: flex-end;
          background: var(--bg-base, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 0.72rem;
          color: var(--text-secondary, #475569);
          cursor: pointer;
        }

        .mermaid-edit-btn:hover {
          background: var(--bg-subtle, #f8fafc);
          color: var(--text-primary, #0f172a);
        }

        .mermaid-block-editor {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mermaid-block-textarea {
          width: 100%;
          min-height: 120px;
          padding: 10px;
          font-family: monospace;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 6px;
          background: var(--bg-base, #ffffff);
          color: var(--text-primary, #0f172a);
          resize: vertical;
        }

        .mermaid-block-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .mermaid-btn {
          padding: 6px 12px;
          border-radius: 5px;
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
        }

        .mermaid-btn--save {
          background: var(--brand, #6366f1);
          color: white;
        }

        .mermaid-btn--cancel {
          background: var(--border, #e2e8f0);
          color: var(--text-secondary, #475569);
        }
      `}</style>
    </NodeViewWrapper>
  );
}

export const MermaidBlock = Node.create({
  name: 'mermaidBlock',
  group: 'block',
  content: 'inline*',
  atom: true,

  addAttributes() {
    return {
      code: {
        default: 'graph TD\n  A[Start] --> B(Process)\n  B --> C[End]',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-mermaid-block]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-mermaid-block': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockView);
  },
});
