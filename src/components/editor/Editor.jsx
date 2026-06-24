import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  RotateCcw,
  RotateCw,
  Plus,
  X,
} from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';

const DEFAULT_DOC = '<p></p>';
const DEBOUNCE_DELAY = 500;

export default function Editor({ note }) {
  const updateNote = useNoteStore((s) => s.updateNote);

  const [title, setTitle] = useState(note.title ?? '');
  const [tags, setTags] = useState(note.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState('Saved');
  const [stats, setStats] = useState({ words: 0, chars: 0, readTime: 0 });
  const saveTimer = useRef(null);
  const lastSaveRef = useRef({ noteId: note.id, title: note.title ?? '' });

  const editor = useEditor({
    extensions: [StarterKit],
    content: note.content || DEFAULT_DOC,
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellCheck: 'true',
        'data-placeholder': 'Start writing your note…',
      },
    },
    onCreate: ({ editor }) => {
      updateEditorStats(editor);
    },
    onUpdate: ({ editor }) => {
      updateEditorStats(editor);
      scheduleSave(editor.getHTML(), title);
    },
  });

  const updateEditorStats = useCallback((editorInstance) => {
    const text = editorInstance.storage?.text?.text ?? editorInstance.getText();
    const words = text.trim().length > 0 ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const readTime = words === 0 ? 0 : Math.max(1, Math.ceil(words / 200));

    setStats({ words, chars, readTime });
  }, []);

  const flushSave = useCallback(
    (nextContent, nextTitle, nextTags, nextNoteId) => {
      const noteId = nextNoteId ?? note.id;
      const savePayload = { content: nextContent };
      if (typeof nextTitle === 'string') {
        savePayload.title = nextTitle;
      }
      if (Array.isArray(nextTags)) {
        savePayload.tags = nextTags;
      }
      updateNote(noteId, savePayload);
      setStatus('Saved');
      lastSaveRef.current = {
        noteId,
        title: nextTitle ?? title,
        tags: nextTags ?? tags,
      };
      saveTimer.current = null;
    },
    [note.id, title, tags, updateNote]
  );

  const scheduleSave = useCallback(
    (nextContent, nextTitle, nextTags) => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }

      setStatus('Saving…');
      saveTimer.current = window.setTimeout(() => {
        flushSave(nextContent, nextTitle, nextTags);
      }, DEBOUNCE_DELAY);
    },
    [flushSave]
  );

  useEffect(() => {
    setTitle(note.title ?? '');
    setTags(note.tags ?? []);
    lastSaveRef.current = { noteId: note.id, title: note.title ?? '', tags: note.tags ?? [] };

    if (!editor) return;
    editor.commands.setContent(note.content || DEFAULT_DOC, false);
    updateEditorStats(editor);
  }, [note.id, note.title, note.content, note.tags, editor, updateEditorStats]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        if (editor) {
          flushSave(editor.getHTML(), title, note.id);
        }
      }
    };
  }, [editor, flushSave, note.id, title]);

  const handleTitleChange = (event) => {
    const nextTitle = event.target.value;
    setTitle(nextTitle);
    scheduleSave(editor?.getHTML() ?? DEFAULT_DOC, nextTitle, tags);
  };

  const handleTitleBlur = () => {
    if (title !== note.title) {
      flushSave(editor?.getHTML() ?? DEFAULT_DOC, title, tags);
    }
  };

  const handleAddTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag || tags.includes(nextTag)) return;

    const nextTags = [...tags, nextTag];
    setTags(nextTags);
    setTagInput('');
    scheduleSave(editor?.getHTML() ?? DEFAULT_DOC, title, nextTags);
  };

  const handleRemoveTag = (tagToRemove) => {
    const nextTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(nextTags);
    scheduleSave(editor?.getHTML() ?? DEFAULT_DOC, title, nextTags);
  };

  const toolbarButtons = useMemo(
    () => [
      {
        label: 'Bold',
        icon: Bold,
        action: () => editor?.chain().focus().toggleBold().run(),
        active: editor?.isActive('bold'),
      },
      {
        label: 'Italic',
        icon: Italic,
        action: () => editor?.chain().focus().toggleItalic().run(),
        active: editor?.isActive('italic'),
      },
      {
        label: 'Strikethrough',
        icon: Strikethrough,
        action: () => editor?.chain().focus().toggleStrike().run(),
        active: editor?.isActive('strike'),
      },
      {
        label: 'H1',
        icon: Heading1,
        action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
        active: editor?.isActive('heading', { level: 1 }),
      },
      {
        label: 'H2',
        icon: Heading2,
        action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
        active: editor?.isActive('heading', { level: 2 }),
      },
      {
        label: 'H3',
        icon: Heading3,
        action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
        active: editor?.isActive('heading', { level: 3 }),
      },
      {
        label: 'Bullet list',
        icon: List,
        action: () => editor?.chain().focus().toggleBulletList().run(),
        active: editor?.isActive('bulletList'),
      },
      {
        label: 'Numbered list',
        icon: ListOrdered,
        action: () => editor?.chain().focus().toggleOrderedList().run(),
        active: editor?.isActive('orderedList'),
      },
      {
        label: 'Blockquote',
        icon: Quote,
        action: () => editor?.chain().focus().toggleBlockquote().run(),
        active: editor?.isActive('blockquote'),
      },
      {
        label: 'Horizontal rule',
        icon: Minus,
        action: () => editor?.chain().focus().setHorizontalRule().run(),
        active: false,
      },
      {
        label: 'Undo',
        icon: RotateCcw,
        action: () => editor?.chain().focus().undo().run(),
        active: false,
      },
      {
        label: 'Redo',
        icon: RotateCw,
        action: () => editor?.chain().focus().redo().run(),
        active: false,
      },
    ],
    [editor]
  );

  return (
    <>
      <div className="note-title-wrapper">
        <input
          className="note-title-input"
          type="text"
          placeholder="Untitled"
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          aria-label="Note title"
        />
      </div>

      <div className="note-tags-wrapper">
        <div className="note-tags">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="note-tag"
              onClick={() => handleRemoveTag(tag)}
              title={`Remove ${tag}`}
            >
              <span>{tag}</span>
              <X size={12} />
            </button>
          ))}
        </div>
        <div className="note-tag-input-wrapper">
          <input
            className="note-tag-input"
            type="text"
            placeholder="Add tag and press Enter"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddTag();
              }
            }}
            aria-label="Add tag"
          />
          <button type="button" className="note-tag-add-btn" onClick={handleAddTag} aria-label="Add tag">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="editor-toolbar" role="toolbar" aria-label="Formatting toolbar">
        {toolbarButtons.map((button) => {
          const Icon = button.icon;
          return (
            <button
              key={button.label}
              type="button"
              className={`editor-toolbar__button${button.active ? ' editor-toolbar__button--active' : ''}`}
              onClick={button.action}
              disabled={!editor}
              title={button.label}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      <div className="note-editor-content">
        {editor ? <EditorContent editor={editor} /> : <div className="note-editor-loading">Loading editor…</div>}
      </div>

      <footer className="editor-footer">
        <div className="editor-footer__stats">
          <span>{stats.words} words</span>
          <span className="editor-footer__sep" aria-hidden="true">·</span>
          <span>{stats.chars} characters</span>
          <span className="editor-footer__sep" aria-hidden="true">·</span>
          <span>{stats.readTime} min read</span>
        </div>
        <div className="editor-footer__status">{status}</div>
      </footer>

      <style>{`
        .editor-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 16px 48px 0;
          border-bottom: 1px solid var(--border);
          background: var(--bg-base);
          z-index: 1;
        }

        .editor-toolbar__button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg-subtle);
          color: var(--text-secondary);
          cursor: pointer;
          transition: background var(--t-fast), color var(--t-fast), transform var(--t-fast);
        }

        .editor-toolbar__button:hover {
          background: var(--bg-muted);
          color: var(--text-primary);
        }

        .editor-toolbar__button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .editor-toolbar__button--active {
          background: var(--brand);
          border-color: transparent;
          color: #fff;
        }

        .note-tags-wrapper {
          padding: 12px 48px 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--bg-base);
          border-bottom: 1px solid var(--border);
        }

        .note-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .note-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-primary);
          font-size: 0.8rem;
          cursor: pointer;
        }

        .note-tag span {
          line-height: 1;
        }

        .note-tag-input-wrapper {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .note-tag-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .note-tag-add-btn {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .note-tag-add-btn:hover {
          background: var(--bg-hover);
        }

        .note-editor-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px 48px 24px;
          min-height: 0;
        }

        .note-editor-loading {
          color: var(--text-tertiary);
          font-size: 0.9375rem;
        }

        .editor-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 48px 22px;
          border-top: 1px solid var(--border);
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          flex-shrink: 0;
        }

        .editor-footer__stats {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .editor-footer__sep {
          color: var(--text-tertiary);
        }
      `}</style>
    </>
  );
}
