import React, { useState, useEffect, useRef } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Sparkles, Check, CornerDownLeft, X, ArrowLeft, SpellCheck, Shrink, Expand, AlignLeft } from 'lucide-react';
import { stream } from '@/utils/ai';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function AIActionMenu({ editor }) {
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const actionMenuEnabled = useSettingsStore((s) => s.aiFeatures.actionMenu);
  
  const [view, setView] = useState('main'); // 'main' | 'tone'
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef(null);

  // Close / reset view when selection changes or menu hides
  useEffect(() => {
    if (!editor) return;
    const handleSelectionUpdate = () => {
      if (editor.state.selection.empty) {
        setView('main');
      }
    };
    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor]);

  // Escape listener to abort generation
  useEffect(() => {
    if (!isGenerating) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        abortGeneration();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.addEventListener('keydown', handleKeyDown);
  }, [isGenerating]);

  if (!editor || !aiEnabled || !actionMenuEnabled) {
    return null;
  }

  const abortGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleAction = async (action, option = '') => {
    if (isGenerating) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText.trim()) return;

    setIsGenerating(true);
    let prompt = '';
    switch (action) {
      case 'improve':
        prompt = `Improve the following text, making it clearer, more professional, and engaging while retaining its original meaning. Return only the improved text, without quotes, introductions, or explanations:\n\n"${selectedText}"`;
        break;
      case 'shorten':
        prompt = `Make the following text more concise. Return only the shortened text, without quotes, introductions, or explanations:\n\n"${selectedText}"`;
        break;
      case 'lengthen':
        prompt = `Elaborate on the following text to add details and depth. Return only the expanded text, without quotes, introductions, or explanations:\n\n"${selectedText}"`;
        break;
      case 'grammar':
        prompt = `Correct any grammatical, spelling, or punctuation errors in the following text. Return only the corrected text, without quotes, introductions, or explanations:\n\n"${selectedText}"`;
        break;
      case 'continue':
        prompt = `Continue writing the following text naturally. Return only the continuation, without repeating the input, quotes, or explanations:\n\n"${selectedText}"`;
        break;
      case 'tone':
        prompt = `Rewrite the following text in a ${option} tone. Return only the rewritten text, without quotes, introductions, or explanations:\n\n"${selectedText}"`;
        break;
      default:
        setIsGenerating(false);
        return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const messages = [{ role: 'user', content: prompt }];
      const responseStream = stream(messages, { signal: controller.signal });

      if (action === 'continue') {
        editor.commands.setTextSelection(to);
        editor.commands.insertContent(' ');
      } else {
        editor.commands.deleteSelection();
      }

      for await (const chunk of responseStream) {
        if (controller.signal.aborted) {
          break;
        }
        editor.commands.insertContent(chunk);
      }
    } catch (error) {
      console.error('AI Action Menu Error:', error);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
      setView('main');
    }
  };

  const shouldShowMenu = ({ state }) => {
    // Only show if there is an active, non-empty selection and editor is editable
    return !state.selection.empty && editor.isEditable && !isGenerating;
  };

  return (
    <>
      <BubbleMenu
        editor={editor}
        tippyOptions={{
          duration: 100,
          placement: 'top',
          interactive: true,
          theme: 'ai-bubble',
        }}
        shouldShow={shouldShowMenu}
      >
        <div className="ai-action-menu">
          {view === 'main' ? (
            <div className="ai-action-menu__list">
              <div className="ai-action-menu__header">
                <Sparkles size={12} className="ai-icon-pulse" />
                <span>Ask AI</span>
              </div>
              <button
                type="button"
                className="ai-action-menu__btn"
                onClick={() => handleAction('improve')}
              >
                Improve writing
              </button>
              <button
                type="button"
                className="ai-action-menu__btn"
                onClick={() => handleAction('grammar')}
              >
                <SpellCheck size={13} style={{ marginRight: '4px' }} />
                Fix grammar
              </button>
              <button
                type="button"
                className="ai-action-menu__btn"
                onClick={() => handleAction('shorten')}
              >
                <Shrink size={13} style={{ marginRight: '4px' }} />
                Make shorter
              </button>
              <button
                type="button"
                className="ai-action-menu__btn"
                onClick={() => handleAction('lengthen')}
              >
                <Expand size={13} style={{ marginRight: '4px' }} />
                Make longer
              </button>
              <button
                type="button"
                className="ai-action-menu__btn"
                onClick={() => handleAction('continue')}
              >
                <AlignLeft size={13} style={{ marginRight: '4px' }} />
                Continue writing
              </button>
              <button
                type="button"
                className="ai-action-menu__btn ai-action-menu__btn--more"
                onClick={() => setView('tone')}
              >
                Change tone...
              </button>
            </div>
          ) : (
            <div className="ai-action-menu__list">
              <button
                type="button"
                className="ai-action-menu__btn ai-action-menu__btn--back"
                onClick={() => setView('main')}
              >
                <ArrowLeft size={13} style={{ marginRight: '4px' }} />
                Back
              </button>
              <div className="ai-action-menu__divider" />
              <button
                type="button"
                className="ai-action-menu__btn"
                onClick={() => handleAction('tone', 'professional')}
              >
                Professional
              </button>
              <button
                type="button"
                className="ai-action-menu__btn"
                onClick={() => handleAction('tone', 'casual')}
              >
                Casual
              </button>
              <button
                type="button"
                className="ai-action-menu__btn"
                onClick={() => handleAction('tone', 'academic')}
              >
                Academic
              </button>
              <button
                type="button"
                className="ai-action-menu__btn"
                onClick={() => handleAction('tone', 'creative')}
              >
                Creative
              </button>
            </div>
          )}
        </div>
      </BubbleMenu>

      <style>{`
        .ai-action-menu {
          background: rgba(30, 41, 59, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 5px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          color: #f8fafc;
          font-family: inherit;
          max-width: 90vw;
          overflow-x: auto;
          scrollbar-width: none;
        }
        
        .ai-action-menu::-webkit-scrollbar {
          display: none;
        }

        .ai-action-menu__list {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ai-action-menu__header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 10px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #a78bfa;
          border-right: 1px solid rgba(255, 255, 255, 0.15);
          margin-right: 2px;
          white-space: nowrap;
        }

        .ai-icon-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .ai-action-menu__btn {
          background: transparent;
          border: none;
          color: #e2e8f0;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .ai-action-menu__btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .ai-action-menu__btn--more {
          color: #a78bfa;
        }

        .ai-action-menu__btn--more:hover {
          background: rgba(167, 139, 250, 0.15);
          color: #c084fc;
        }

        .ai-action-menu__btn--back {
          color: #94a3b8;
        }

        .ai-action-menu__divider {
          width: 1px;
          height: 16px;
          background: rgba(255, 255, 255, 0.15);
          margin: 0 4px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
      `}</style>
    </>
  );
}
