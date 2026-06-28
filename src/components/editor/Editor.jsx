import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Mark, mergeAttributes, markInputRule } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import TurndownService from 'turndown';
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
  Code,
  Minus,
  RotateCcw,
  RotateCw,
  Eye,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Sparkles,
  Link2,
  Sigma,
  Workflow,
} from 'lucide-react';
import { MathBlock } from './MathBlock';
import { MermaidBlock } from './MermaidBlock';

import { useNoteStore } from '@/store/useNoteStore';
import ExportMenu from '@/components/editor/ExportMenu';
import HistoryMenu from '@/components/editor/HistoryMenu';
import MarkdownPreview from '@/components/editor/MarkdownPreview';
import { useToastStore } from '@/store/useToastStore';

// AI Extensions and Store
import { Details, DetailsSummary, DetailsContent } from '@tiptap/extension-details';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAIStore } from '@/store/useAIStore';
import { stream } from '@/utils/ai';
import AIActionMenu from '@/components/editor/AIActionMenu';
import JournalPrompt from '@/components/editor/JournalPrompt';
import RelatedNotes from '@/components/editor/RelatedNotes';

const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('css', css);
lowlight.register('bash', bash);
lowlight.register('html', xml);
lowlight.register('xml', xml);
lowlight.register('markdown', markdown);

const WikiLink = Mark.create({
  name: 'wikiLink',

  addAttributes() {
    return {
      noteId: {
        default: null,
      },
      noteTitle: {
        default: null,
      },
      href: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-wiki-link]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-wiki-link': '',
        class: 'wiki-link',
      }),
      0,
    ];
  },

  addInputRules() {
    return [
      markInputRule({
        find: /\[\[([^\]]+)\]\]$/,
        type: this.type,
        getAttributes: (match) => {
          const noteTitle = match[1];
          const notes = useNoteStore.getState().notes;
          const found = notes.find((n) => n.title?.toLowerCase() === noteTitle.toLowerCase());
          return {
            noteTitle,
            noteId: found ? found.id : 'new',
            href: found ? `note://${found.id}` : `note-new://${encodeURIComponent(noteTitle)}`,
          };
        },
      }),
    ];
  },
});

const DEFAULT_DOC = '<p></p>';
const DEBOUNCE_DELAY = 500;
const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

export default function Editor({ note, previewMode = false, focusMode = false, forceSaveSignal = 0, onToggleFocusMode }) {
  const updateNote = useNoteStore((s) => s.updateNote);
  const notes = useNoteStore((s) => s.notes);
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const summarizeEnabled = useSettingsStore((s) => s.aiFeatures?.summarize);
  const autoTagEnabled = useSettingsStore((s) => s.aiFeatures?.autoTag);
  const isAIWorking = useAIStore((s) => s.isGenerating);
  const queueLength = useAIStore((s) => s.queueLength);
  const rateLimitMessage = useAIStore((s) => s.rateLimitMessage);

  const [suggestedTags, setSuggestedTags] = useState([]);

  // ── Slash Commands State ──────────────────────────────────────
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuCoords, setSlashMenuCoords] = useState({ top: 0, left: 0 });
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  const SLASH_COMMANDS = useMemo(
    () => [
      {
        name: 'Heading 1',
        description: 'Big section heading',
        icon: Heading1,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        name: 'Heading 2',
        description: 'Medium section heading',
        icon: Heading2,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        name: 'Heading 3',
        description: 'Small section heading',
        icon: Heading3,
        action: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        name: 'Bullet List',
        description: 'Create a simple bulleted list',
        icon: List,
        action: (ed) => ed.chain().focus().toggleBulletList().run(),
      },
      {
        name: 'Numbered List',
        description: 'Create a list with numbering',
        icon: ListOrdered,
        action: (ed) => ed.chain().focus().toggleOrderedList().run(),
      },
      {
        name: 'Quote',
        description: 'Capture a quote block',
        icon: Quote,
        action: (ed) => ed.chain().focus().toggleBlockquote().run(),
      },
      {
        name: 'Code Block',
        description: 'Code snippet with syntax highlighting',
        icon: Code,
        action: (ed) => ed.chain().focus().toggleCodeBlock().run(),
      },
      {
        name: 'Divider',
        description: 'Insert a horizontal line separator',
        icon: Minus,
        action: (ed) => ed.chain().focus().setHorizontalRule().run(),
      },
      {
        name: 'Mermaid Diagram',
        description: 'Visual diagram or flowchart block',
        icon: Workflow,
        action: (ed) =>
          ed
            .chain()
            .focus()
            .insertContent({ type: 'mermaidBlock', attrs: { code: 'graph TD\n  A --> B' } })
            .run(),
      },
      {
        name: 'Math Formula',
        description: 'LaTeX mathematical expression block',
        icon: Sigma,
        action: (ed) =>
          ed
            .chain()
            .focus()
            .insertContent({ type: 'mathBlock', attrs: { latex: 'E = mc^2' } })
            .run(),
      },
    ],
    []
  );

  const filteredCommands = useMemo(() => {
    if (!slashSearchQuery) return SLASH_COMMANDS;
    const q = slashSearchQuery.toLowerCase();
    return SLASH_COMMANDS.filter(
      (cmd) => cmd.name.toLowerCase().includes(q) || cmd.description.toLowerCase().includes(q)
    );
  }, [slashSearchQuery, SLASH_COMMANDS]);

  const slashStateRef = useRef({
    show: false,
    query: '',
    index: 0,
    commands: [],
    execute: null,
    detect: null,
  });

  const [title, setTitle] = useState(note.title ?? '');
  const [tags, setTags] = useState(note.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState('Saved');
  const [stats, setStats] = useState({ words: 0, chars: 0, readTime: 0 });
  const [showFocusToolbar, setShowFocusToolbar] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const backlinks = useMemo(() => {
    return notes.filter((n) => {
      if (n.id === note.id || n.trashed) return false;
      const content = n.content || '';
      return (
        content.includes(`note://${note.id}`) ||
        content.toLowerCase().includes(`[[${note.title?.toLowerCase()}]]`) ||
        content.includes(`note-new://${encodeURIComponent(note.title || '')}`)
      );
    });
  }, [notes, note.id, note.title]);
  const saveTimer = useRef(null);
  const revealTimer = useRef(null);
  const summarizeAbortControllerRef = useRef(null);
  const lastSaveRef = useRef({ noteId: note.id, title: note.title ?? '', tags: note.tags ?? [], content: note.content || DEFAULT_DOC });
  const latestTitleRef = useRef(title);
  const latestTagsRef = useRef(tags);
  const latestNoteIdRef = useRef(note.id);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    latestTitleRef.current = title;
  }, [title]);

  useEffect(() => {
    latestTagsRef.current = tags;
  }, [tags]);

  const flushSave = useCallback(
    (nextContent, nextTitle, nextTags, nextNoteId) => {
      const noteId = nextNoteId ?? latestNoteIdRef.current;
      const currentTitle = typeof nextTitle === 'string' ? nextTitle : latestTitleRef.current;
      const currentTags = Array.isArray(nextTags) ? nextTags : latestTagsRef.current;
      if (
        lastSaveRef.current.noteId === noteId &&
        lastSaveRef.current.content === nextContent &&
        lastSaveRef.current.title === currentTitle &&
        JSON.stringify(lastSaveRef.current.tags) === JSON.stringify(currentTags)
      ) {
        setStatus('Saved');
        saveTimer.current = null;
        return;
      }

      const savePayload = { content: nextContent };
      if (typeof currentTitle === 'string') savePayload.title = currentTitle;
      if (Array.isArray(currentTags)) savePayload.tags = currentTags;
      updateNote(noteId, savePayload);
      setStatus('Saved');
      lastSaveRef.current = { noteId, title: currentTitle, tags: currentTags, content: nextContent };
      saveTimer.current = null;
    },
    [note.id, updateNote]
  );

  const scheduleSave = useCallback(
    (nextContent, nextTitle, nextTags, nextNoteId) => {
      const currentTitle = typeof nextTitle === 'string' ? nextTitle : latestTitleRef.current;
      const currentTags = Array.isArray(nextTags) ? nextTags : latestTagsRef.current;
      const noteId = nextNoteId ?? latestNoteIdRef.current;

      if (
        lastSaveRef.current.noteId === noteId &&
        lastSaveRef.current.content === nextContent &&
        lastSaveRef.current.title === currentTitle &&
        JSON.stringify(lastSaveRef.current.tags) === JSON.stringify(currentTags)
      ) {
        if (saveTimer.current) {
          window.clearTimeout(saveTimer.current);
          saveTimer.current = null;
        }
        setStatus('Saved');
        return;
      }

      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
      setStatus('Saving…');
      saveTimer.current = window.setTimeout(() => {
        flushSave(nextContent, nextTitle, nextTags, noteId);
      }, DEBOUNCE_DELAY);
    },
    [flushSave]
  );

  const updateEditorStats = useCallback((editorInstance) => {
    const text = editorInstance.storage?.text?.text ?? editorInstance.getText();
    const words = text.trim().length > 0 ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const readTime = words === 0 ? 0 : Math.max(1, Math.ceil(words / 200));
    setStats({ words, chars, readTime });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block',
        },
      }),
      Details.configure({
        persist: true,
        HTMLAttributes: {
          class: 'details-block',
        },
      }),
      DetailsSummary,
      DetailsContent,
      WikiLink,
      MathBlock,
      MermaidBlock,
    ],
    content: note.content || DEFAULT_DOC,
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellCheck: 'true',
        'data-placeholder': 'Start writing your note…',
      },
      handleKeyDown(view, event) {
        const current = slashStateRef.current;
        if (current.show) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSlashSelectedIndex((prev) => (prev + 1) % current.commands.length);
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSlashSelectedIndex((prev) => (prev - 1 + current.commands.length) % current.commands.length);
            return true;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            const selected = current.commands[current.index];
            if (selected) {
              current.execute(selected);
            }
            return true;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setShowSlashMenu(false);
            return true;
          }
        }
        return false;
      },
      handleClick(view, pos, event) {
        const target = event.target;
        const link = target.closest('.wiki-link');
        if (link) {
          const href = link.getAttribute('href');
          if (href) {
            event.preventDefault();
            if (href.startsWith('note://')) {
              const noteId = href.replace('note://', '');
              useNoteStore.getState().setActiveNote(noteId);
            } else if (href.startsWith('note-new://')) {
              const noteTitle = decodeURIComponent(href.replace('note-new://', ''));
              const newNoteId = useNoteStore.getState().createNote({
                title: noteTitle,
                content: `<h1>${noteTitle}</h1><p>Start writing here...</p>`,
              });
              useNoteStore.getState().setActiveNote(newNoteId);
              useToastStore.getState().showToast(`Created new note "${noteTitle}"`);
            }
            return true;
          }
        }
        return false;
      },
    },
    onSelectionUpdate: ({ editor }) => {
      slashStateRef.current.detect?.(editor);
    },
    onCreate: ({ editor }) => {
      updateEditorStats(editor);
    },
    onUpdate: ({ editor }) => {
      if (isSyncingRef.current) {
        isSyncingRef.current = false;
        return;
      }
      updateEditorStats(editor);
      scheduleSave(editor.getHTML(), latestTitleRef.current, latestTagsRef.current, latestNoteIdRef.current);
      slashStateRef.current.detect?.(editor);
    },
  });

  const executeSlashCommand = useCallback(
    (cmd) => {
      if (!editor || !cmd) return;
      const { state } = editor;
      const { $from } = state.selection;
      const currentQuery = slashStateRef.current.query;
      const from = $from.pos - currentQuery.length - 1;
      const to = $from.pos;

      editor.commands.deleteRange({ from, to });
      cmd.action(editor);

      setShowSlashMenu(false);
      setSlashSelectedIndex(0);
      setSlashSearchQuery('');
    },
    [editor]
  );

  const detectSlashTrigger = useCallback((ed) => {
    const { state } = ed;
    const { $from } = state.selection;
    const textBefore = $from.parent.textBetween(
      Math.max(0, $from.parentOffset - 20),
      $from.parentOffset,
      null,
      '\n'
    );

    const match = textBefore.match(/\/(\w*)$/);
    if (match) {
      const query = match[1];
      setSlashSearchQuery(query);
      setShowSlashMenu(true);

      const coords = ed.view.coordsAtPos($from.pos);
      const container = ed.view.dom.closest('.note-editor-content');
      if (container) {
        const rect = container.getBoundingClientRect();
        setSlashMenuCoords({
          top: coords.bottom - rect.top + container.scrollTop + 8,
          left: coords.left - rect.left,
        });
      }
    } else {
      setShowSlashMenu(false);
    }
  }, []);

  useEffect(() => {
    slashStateRef.current = {
      show: showSlashMenu,
      query: slashSearchQuery,
      index: slashSelectedIndex,
      commands: filteredCommands,
      execute: executeSlashCommand,
      detect: detectSlashTrigger,
    };
  }, [showSlashMenu, slashSearchQuery, slashSelectedIndex, filteredCommands, executeSlashCommand, detectSlashTrigger]);

  useEffect(() => {
    const previousNoteId = latestNoteIdRef.current;

    if (note.id !== previousNoteId) {
      setTitle(note.title ?? '');
      setTags(note.tags ?? []);
      latestNoteIdRef.current = note.id;
      if (editor) {
        isSyncingRef.current = true;
        editor.commands.setContent(note.content || DEFAULT_DOC, false);
      }
    } else {
      if (editor) {
        const currentContent = editor.getHTML();
        if (note.content && note.content !== currentContent) {
          isSyncingRef.current = true;
          editor.commands.setContent(note.content || DEFAULT_DOC, false);
        }
      }

      if (note.title !== title && note.title !== lastSaveRef.current.title) {
        setTitle(note.title ?? '');
      }

      const tagsStr = JSON.stringify(tags);
      const noteTagsStr = JSON.stringify(note.tags ?? []);
      const lastSavedTagsStr = JSON.stringify(lastSaveRef.current.tags ?? []);
      if (noteTagsStr !== tagsStr && noteTagsStr !== lastSavedTagsStr) {
        setTags(note.tags ?? []);
      }
    }

    if (editor) {
      editor.setEditable(!note.trashed);
    }

    lastSaveRef.current = {
      noteId: note.id,
      title: note.title ?? '',
      tags: note.tags ?? [],
      content: note.content || DEFAULT_DOC,
    };
    
    if (editor) {
      updateEditorStats(editor);
    }
  }, [note.id, note.title, note.content, note.tags, editor, updateEditorStats]);

  useEffect(() => {
    if (!focusMode) {
      setShowFocusToolbar(false);
      if (revealTimer.current) {
        window.clearTimeout(revealTimer.current);
        revealTimer.current = null;
      }
    }
  }, [focusMode]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        if (editor) flushSave(editor.getHTML(), title, note.id);
      }
      if (revealTimer.current) {
        window.clearTimeout(revealTimer.current);
      }
      if (summarizeAbortControllerRef.current) {
        summarizeAbortControllerRef.current.abort();
      }
    };
  }, [editor, flushSave, note.id, title]);

  useEffect(() => {
    if (forceSaveSignal > 0 && editor) {
      flushSave(editor.getHTML(), title, tags);
    }
  }, [forceSaveSignal, editor, flushSave, title, tags]);

  const handleSummarize = async () => {
    if (isSummarizing || !editor) return;

    const text = editor.getText();
    if (!text.trim()) return;

    setIsSummarizing(true);

    // Insert placeholder details block at pos 0
    editor.commands.insertContentAt(0, {
      type: 'details',
      attrs: { open: true },
      content: [
        {
          type: 'detailsSummary',
          content: [{ type: 'text', text: '✨ AI Summary' }],
        },
        {
          type: 'detailsContent',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Generating summary...' }],
            },
          ],
        },
      ],
    });

    const prompt = `Summarize the following note content in a clear, concise bulleted format. Return only the summary text, without introductions or explanations:\n\n${text}`;

    const controller = new AbortController();
    summarizeAbortControllerRef.current = controller;

    try {
      let accumulatedText = '';
      const messages = [{ role: 'user', content: prompt }];
      const responseStream = stream(messages, { signal: controller.signal });

      for await (const chunk of responseStream) {
        if (controller.signal.aborted) {
          break;
        }
        accumulatedText += chunk;

        // Replace the details block at position 0
        const node = editor.state.doc.nodeAt(0);
        if (node && node.type.name === 'details') {
          editor.commands.deleteRange({ from: 0, to: node.nodeSize });
        }

        editor.commands.insertContentAt(0, {
          type: 'details',
          attrs: { open: true },
          content: [
            {
              type: 'detailsSummary',
              content: [{ type: 'text', text: '✨ AI Summary' }],
            },
            {
              type: 'detailsContent',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: accumulatedText }],
                },
              ],
            },
          ],
        });
      }
    } catch (error) {
      console.error('Summarize error:', error);
    } finally {
      setIsSummarizing(false);
      summarizeAbortControllerRef.current = null;
    }
  };

  const handleTitleChange = (event) => {
    const nextTitle = event.target.value;
    setTitle(nextTitle);
    scheduleSave(editor?.getHTML() ?? DEFAULT_DOC, nextTitle, latestTagsRef.current, latestNoteIdRef.current);
  };

  const handleTitleBlur = () => {
    if (title !== note.title) {
      flushSave(editor?.getHTML() ?? DEFAULT_DOC, title, tags, latestNoteIdRef.current);
    }
  };

  const toggleMobileDetails = () => {
    setMobileDetailsOpen((current) => !current);
  };

  const handleFocusMouseMove = (event) => {
    if (!focusMode) return;
    if (event.clientY > 80) return;

    setShowFocusToolbar(true);
    if (revealTimer.current) window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => {
      setShowFocusToolbar(false);
      revealTimer.current = null;
    }, 2500);
  };

  const handleAddTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag || tags.includes(nextTag)) return;
    const nextTags = [...tags, nextTag];
    setTags(nextTags);
    setTagInput('');
    scheduleSave(editor?.getHTML() ?? DEFAULT_DOC, title, nextTags, latestNoteIdRef.current);
  };

  const handleRemoveTag = (tagToRemove) => {
    const nextTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(nextTags);
    scheduleSave(editor?.getHTML() ?? DEFAULT_DOC, title, nextTags, latestNoteIdRef.current);
  };

  const filteredSuggestedTags = useMemo(() => {
    return suggestedTags.filter((tag) => !tags.includes(tag));
  }, [suggestedTags, tags]);

  const handleAddSuggestedTag = (tagToAdd) => {
    if (tags.includes(tagToAdd)) return;
    const nextTags = [...tags, tagToAdd];
    setTags(nextTags);
    setSuggestedTags((prev) => prev.filter((t) => t !== tagToAdd));
    scheduleSave(editor?.getHTML() ?? DEFAULT_DOC, title, nextTags, latestNoteIdRef.current);
  };

  const handleAddAllSuggestedTags = () => {
    const nextTags = [...tags];
    filteredSuggestedTags.forEach((tag) => {
      if (!nextTags.includes(tag)) {
        nextTags.push(tag);
      }
    });
    setTags(nextTags);
    setSuggestedTags([]);
    scheduleSave(editor?.getHTML() ?? DEFAULT_DOC, title, nextTags, latestNoteIdRef.current);
  };

  useEffect(() => {
    if (!aiEnabled || !autoTagEnabled || !editor) {
      setSuggestedTags([]);
      return;
    }

    const plainText = editor.getText().trim();
    if (plainText.length < 30) {
      setSuggestedTags([]);
      return;
    }

    const timer = setTimeout(async () => {
      const prompt = `Analyze the following note content and suggest up to 5 relevant, concise tags (each 1-2 words, lowercase, no spaces or special characters other than hyphens). Return only the suggested tags as a comma-separated list, without any formatting or other text. If no specific tags are relevant, return an empty response.
      
Note Title: ${title}
Note Content: ${plainText}

Suggested tags:`;

      try {
        let responseText = '';
        const responseStream = stream([{ role: 'user', content: prompt }]);
        for await (const chunk of responseStream) {
          responseText += chunk;
        }

        const cleanTags = responseText
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t && t.length > 1)
          .slice(0, 5);

        setSuggestedTags(cleanTags);
      } catch (err) {
        console.error('Failed to suggest tags:', err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [editor, note.id, note.content, title, aiEnabled, autoTagEnabled]);

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
        label: 'Code block',
        icon: Code,
        action: () => editor?.chain().focus().toggleCodeBlock().run(),
        active: editor?.isActive('codeBlock'),
      },
      {
        label: 'Horizontal rule',
        icon: Minus,
        action: () => editor?.chain().focus().setHorizontalRule().run(),
        active: false,
      },
      {
        label: 'Math formula',
        icon: Sigma,
        action: () => editor?.chain().focus().insertContent({ type: 'mathBlock' }).run(),
        active: editor?.isActive('mathBlock'),
      },
      {
        label: 'Mermaid diagram',
        icon: Workflow,
        action: () => editor?.chain().focus().insertContent({ type: 'mermaidBlock' }).run(),
        active: editor?.isActive('mermaidBlock'),
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
    <div
      className={`editor-root${focusMode ? ' editor-root--focus' : ''}`}
      onPointerMove={handleFocusMouseMove}
    >
      {/* ── Title ─────────────────────────────────────────────── */}
      <div className="note-title-wrapper">
        <input
          className="note-title-input"
          type="text"
          placeholder="Untitled"
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          aria-label="Note title"
          disabled={note.trashed}
        />
        <button
          type="button"
          className="details-toggle-btn"
          onClick={toggleMobileDetails}
          aria-expanded={mobileDetailsOpen}
          aria-label={mobileDetailsOpen ? 'Hide note details' : 'Show note details'}
        >
          {mobileDetailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{mobileDetailsOpen ? 'Hide details' : 'Show details'}</span>
        </button>
      </div>

      <div className={`editor-details${mobileDetailsOpen ? ' editor-details--open' : ' editor-details--closed'}`}>
        {/* ── Metadata (Phase 9) ────────────────────────────────── */}
        <div className="note-meta-bar">
          <span className="note-meta-item">
            Created{' '}
            <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
          </span>
          <span className="note-meta-sep" aria-hidden="true">·</span>
          <span className="note-meta-item">
            Edited{' '}
            <time dateTime={note.updatedAt}>{formatDate(note.updatedAt)}</time>
          </span>
        </div>

        {/* ── Tags ──────────────────────────────────────────────── */}
        <div className="note-tags-wrapper">
          <div className="note-tags">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="note-tag"
                onClick={() => !note.trashed && handleRemoveTag(tag)}
                disabled={note.trashed}
                title={note.trashed ? undefined : `Remove ${tag}`}
              >
                <span>{tag}</span>
                {!note.trashed && <X size={12} />}
              </button>
            ))}
          </div>
          <div className="note-tag-input-wrapper">
            <input
              className="note-tag-input"
              type="text"
              placeholder={note.trashed ? "Note is in Trash" : "Add tag and press Enter"}
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddTag();
                }
              }}
              aria-label="Add tag"
              disabled={note.trashed}
            />
            <button
              type="button"
              className="note-tag-add-btn"
              onClick={handleAddTag}
              aria-label="Add tag"
              disabled={note.trashed}
            >
              <Plus size={14} />
            </button>
          </div>

        {/* ── Backlinks ─────────────────────────────────────────── */}
        <div className="note-backlinks-section">
          <div className="note-backlinks-title">
            <Link2 size={13} />
            <span>Backlinks ({backlinks.length})</span>
          </div>
          {backlinks.length === 0 ? (
            <div className="note-backlinks-empty">No notes link to this one yet.</div>
          ) : (
            <div className="note-backlinks-list">
              {backlinks.map((bl) => (
                <button
                  key={bl.id}
                  type="button"
                  className="note-backlink-item"
                  onClick={() => useNoteStore.getState().setActiveNote(bl.id)}
                >
                  {bl.title || 'Untitled'}
                </button>
              ))}
            </div>
          )}
        </div>  {aiEnabled && autoTagEnabled && filteredSuggestedTags.length > 0 && (
            <div className="note-tags-suggestions">
              <span className="note-tags-suggestions__label">AI Suggestions:</span>
              <div className="note-tags-suggestions__list">
                {filteredSuggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="note-tags-suggestions__chip"
                    onClick={() => handleAddSuggestedTag(tag)}
                    title={`Add tag "${tag}"`}
                  >
                    + {tag}
                  </button>
                ))}
                {filteredSuggestedTags.length > 1 && (
                  <button
                    type="button"
                    className="note-tags-suggestions__add-all"
                    onClick={handleAddAllSuggestedTags}
                    title="Add all suggested tags"
                  >
                    Add all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <JournalPrompt note={note} editor={editor} />
      </div>

      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className={`editor-toolbar${focusMode && !showFocusToolbar ? ' editor-toolbar--hidden' : ''}`} role="toolbar" aria-label="Formatting toolbar">
          <div className="editor-toolbar__formatting">
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
            <button
              type="button"
              className="editor-toolbar__button"
              onClick={() => onTogglePreview?.()}
              disabled={!editor}
              title={previewMode ? 'Return to editor' : 'Preview markdown'}
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              className="editor-toolbar__button"
              onClick={() => onToggleFocusMode?.()}
              disabled={!editor}
              title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
            >
              <Maximize2 size={16} />
            </button>
            {aiEnabled && summarizeEnabled && (
              <button
                type="button"
                className={`editor-toolbar__button ${isSummarizing ? 'editor-toolbar__button--active' : ''}`}
                onClick={handleSummarize}
                disabled={!editor || isSummarizing}
                title="Summarize note with AI"
              >
                <Sparkles size={16} />
              </button>
            )}
          </div>

          {/* Export and History menus live in the toolbar */}
          <div className="editor-toolbar__export" style={{ display: 'flex', gap: '8px' }}>
            <HistoryMenu note={note} editor={editor} />
            <ExportMenu note={{ ...note, title, content: editor?.getHTML() ?? note.content }} />
          </div>
        </div>

      {/* ── Editor content ────────────────────────────────────── */}
      {note.trashed && (
        <div className="editor-trash-banner">
          <div className="editor-trash-banner__text">
            This note is in the Trash. You cannot edit it.
          </div>
          <div className="editor-trash-banner__actions">
            <button
              type="button"
              className="editor-trash-banner__btn editor-trash-banner__btn--restore"
              onClick={() => {
                useNoteStore.getState().restoreNote(note.id);
                useToastStore.getState().showToast(`Restored "${note.title}"`);
              }}
            >
              Restore Note
            </button>
            <button
              type="button"
              className="editor-trash-banner__btn editor-trash-banner__btn--delete"
              onClick={() => {
                if (window.confirm(`Permanently delete "${note.title}"? This cannot be undone.`)) {
                  useNoteStore.getState().deleteNotePermanently(note.id);
                  useToastStore.getState().showToast(`Permanently deleted "${note.title}"`);
                }
              }}
            >
              Delete Permanently
            </button>
          </div>
        </div>
      )}

      <div className="note-editor-content">
        {previewMode ? (
          <MarkdownPreview markdown={td.turndown(editor?.getHTML() ?? (note.content || DEFAULT_DOC))} />
        ) : editor ? (
          <>
            <EditorContent editor={editor} />
            <AIActionMenu editor={editor} />
            {showSlashMenu && (
              <div
                className="editor-slash-menu"
                style={{
                  top: `${slashMenuCoords.top}px`,
                  left: `${slashMenuCoords.left}px`,
                }}
              >
                {filteredCommands.length === 0 ? (
                  <div className="editor-slash-menu__empty">No commands found</div>
                ) : (
                  filteredCommands.map((cmd, idx) => {
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.name}
                        type="button"
                        className={`editor-slash-menu__item ${
                          idx === slashSelectedIndex ? 'editor-slash-menu__item--selected' : ''
                        }`}
                        onClick={() => executeSlashCommand(cmd)}
                        onMouseEnter={() => setSlashSelectedIndex(idx)}
                      >
                        <Icon size={16} className="editor-slash-menu__icon" />
                        <div className="editor-slash-menu__info">
                          <span className="editor-slash-menu__name">{cmd.name}</span>
                          <span className="editor-slash-menu__desc">{cmd.description}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </>
        ) : (
          <div className="note-editor-loading">Loading editor…</div>
        )}
      </div>

      {/* ── Footer (Phase 9 stats) ────────────────────────────── */}
      <footer className={`editor-footer${focusMode ? ' editor-footer--hidden' : ''}${!mobileDetailsOpen ? ' editor-footer--mobile-hidden' : ''}`}>
        <div className="editor-footer__stats">
          <span>{stats.words} {stats.words === 1 ? 'word' : 'words'}</span>
          <span className="editor-footer__sep" aria-hidden="true">·</span>
          <span>{stats.chars} {stats.chars === 1 ? 'character' : 'characters'}</span>
          <span className="editor-footer__sep" aria-hidden="true">·</span>
          <span>{stats.readTime} min read</span>
        </div>
        <div className="editor-footer__status">
          {aiEnabled && isAIWorking && (
            <span className="ai-status-indicator" title="AI is active...">
              <span className="ai-status-indicator__dot" />
              <span>AI active</span>
            </span>
          )}
          {aiEnabled && !isAIWorking && queueLength > 0 && (
            <span className="ai-status-indicator ai-status-indicator--queued" title="AI request queued">
              <span className="ai-status-indicator__dot" />
              <span>AI queued</span>
            </span>
          )}
          {rateLimitMessage ? <span className="editor-footer__rate-limit">{rateLimitMessage}</span> : status}
        </div>
      </footer>

      <style>{`
        .note-meta-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 48px 0;
          flex-shrink: 0;
        }

        .editor-trash-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: rgba(245, 158, 11, 0.08);
          border-bottom: 1px solid var(--border);
          color: #f59e0b;
          font-size: 0.8125rem;
          gap: 16px;
          animation: fade-in 0.15s ease;
        }

        .editor-trash-banner__text {
          font-weight: 500;
        }

        .editor-trash-banner__actions {
          display: flex;
          gap: 8px;
        }

        .editor-trash-banner__btn {
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease, filter 0.15s ease;
        }

        .editor-trash-banner__btn--restore {
          background: var(--brand, #6366f1);
          color: #fff;
        }

        .editor-trash-banner__btn--restore:hover {
          filter: brightness(1.1);
        }

        .editor-trash-banner__btn--delete {
          background: rgba(239, 68, 68, 0.1);
          color: var(--danger, #ef4444);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .editor-trash-banner__btn--delete:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .note-meta-item {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .note-meta-sep {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          opacity: 0.5;
        }

        .editor-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 12px 48px 12px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-base);
          z-index: 1;
        }

        .editor-toolbar__formatting {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .editor-toolbar__export {
          flex-shrink: 0;
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

        .editor-root {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .editor-root--focus {
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          padding: 26px 0 32px;
        }

        .editor-root--focus .note-title-wrapper,
        .editor-root--focus .note-meta-bar,
        .editor-root--focus .note-tags-wrapper,
        .editor-root--focus .editor-toolbar,
        .editor-root--focus .note-editor-content,
        .editor-root--focus .editor-footer {
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          padding-left: 24px;
          padding-right: 24px;
        }

        .editor-root--focus .note-title-wrapper {
          padding-top: 18px;
        }

        .editor-root--focus .note-editor-content {
          padding-top: 18px;
          padding-bottom: 24px;
        }

        .editor-toolbar--hidden,
        .editor-footer--hidden {
          opacity: 0;
          height: 0;
          padding: 0;
          margin: 0;
          overflow: hidden;
          pointer-events: none;
          transition: opacity 0.2s ease, height 0.2s ease, padding 0.2s ease, margin 0.2s ease;
        }

        .note-tags-wrapper {
          padding: 12px 48px 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--bg-base);
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

        .note-tag span { line-height: 1; }

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

        .note-tag-add-btn:hover { background: var(--bg-hover); }

        .note-editor-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px 48px 24px;
          min-height: 0;
          position: relative;
        }

        .editor-details {
          display: block;
          transition: max-height 0.25s ease, opacity 0.25s ease;
          overflow: hidden;
          max-height: 999px;
          opacity: 1;
        }

        .editor-details.editor-details--closed {
          max-height: 0;
          opacity: 0;
          padding: 0;
          margin: 0;
        }

        .details-toggle-btn {
          display: none;
          align-items: center;
          gap: 6px;
          margin-left: 12px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-secondary);
          font-size: 0.82rem;
          cursor: pointer;
          white-space: nowrap;
        }

        .details-toggle-btn:hover {
          background: var(--bg-muted);
          color: var(--text-primary);
        }

        .editor-footer--mobile-hidden {
          display: none;
        }

        @media (max-width: 640px) {
          .details-toggle-btn {
            display: inline-flex;
          }

          .editor-details.editor-details--closed {
            max-height: 0;
            opacity: 0;
            padding: 0;
            margin: 0;
          }

          .editor-details.editor-details--open {
            display: block;
          }

          .editor-details {
            border-bottom: 1px solid var(--border);
            padding-bottom: 12px;
          }

          .note-title-wrapper {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 18px 16px 0;
          }

          .note-title-input {
            font-size: 1.25rem;
          }

          .note-meta-bar {
            flex-wrap: wrap;
            gap: 8px;
            padding: 6px 16px 0;
          }

          .note-tags-wrapper {
            padding: 12px 16px 0;
          }

          .note-tag-input-wrapper {
            grid-template-columns: 1fr auto;
          }

          .note-tag-input {
            font-size: 0.85rem;
            padding: 10px 12px;
          }

          .note-tag-add-btn {
            width: 38px;
            height: 38px;
          }

          .editor-toolbar {
            flex-wrap: wrap;
            gap: 8px;
            padding: 10px 16px 8px;
          }

          .editor-toolbar__formatting {
            display: inline-flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 4px;
            margin-right: 8px;
            -webkit-overflow-scrolling: touch;
          }

          .editor-toolbar__formatting::-webkit-scrollbar {
            height: 6px;
          }

          .editor-toolbar__formatting::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.5);
            border-radius: 999px;
          }

          .editor-toolbar__button {
            width: 32px;
            height: 32px;
          }

          .editor-toolbar__export {
            width: 100%;
            display: flex;
            justify-content: flex-end;
          }

          .note-editor-content {
            padding: 18px 16px 24px;
          }

          .editor-footer {
            padding: 10px 16px 14px;
            gap: 6px;
          }

          .editor-footer__stats {
            flex-wrap: wrap;
            gap: 6px;
          }
        }

        .note-preview-view {
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 22px 26px;
          color: var(--text-primary);
          min-height: 300px;
          white-space: pre-wrap;
          overflow-x: auto;
        }

        .note-preview-view pre {
          margin: 0;
          font-family: 'JetBrains Mono', monospace;
          line-height: 1.6;
          word-break: break-word;
          white-space: pre-wrap;
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
          padding: 10px 48px 16px;
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

        .editor-footer__sep { color: var(--text-tertiary); }

        @media (max-width: 640px) {
          .note-title-wrapper {
            padding: 18px 16px 0;
          }

          .note-title-input {
            font-size: 1.25rem;
          }

          .note-meta-bar {
            flex-wrap: wrap;
            gap: 8px;
            padding: 6px 16px 0;
          }

          .note-tags-wrapper {
            padding: 12px 16px 0;
          }

          .note-tag-input-wrapper {
            grid-template-columns: 1fr auto;
          }

          .note-tag-input {
            font-size: 0.85rem;
            padding: 10px 12px;
          }

          .note-tag-add-btn {
            width: 38px;
            height: 38px;
          }

          .editor-toolbar {
            flex-wrap: wrap;
            gap: 8px;
            padding: 10px 16px 8px;
          }

          .editor-toolbar__formatting {
            display: inline-flex;
            flex-wrap: nowrap;
            overflow-x: auto;
            padding-bottom: 4px;
            margin-right: 8px;
            -webkit-overflow-scrolling: touch;
          }

          .editor-toolbar__formatting::-webkit-scrollbar {
            height: 6px;
          }

          .editor-toolbar__formatting::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.5);
            border-radius: 999px;
          }

          .editor-toolbar__button {
            width: 32px;
            height: 32px;
          }

          .editor-toolbar__export {
            width: 100%;
            display: flex;
            justify-content: flex-end;
          }

          .note-editor-content {
            padding: 18px 16px 24px;
          }

          .editor-footer {
            padding: 10px 16px 14px;
            gap: 6px;
          }

          .editor-footer__stats {
            flex-wrap: wrap;
            gap: 6px;
          }
        }

        .details-block {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
          background: var(--bg-subtle);
        }

        .details-block summary {
          font-weight: 600;
          color: var(--text-primary);
          cursor: pointer;
          outline: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .details-block div[data-type="details-content"] {
          margin-top: 10px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .ai-status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-right: 12px;
          color: var(--brand);
          font-weight: 500;
        }

        .ai-status-indicator--queued {
          background: rgba(251, 191, 36, 0.1);
          color: #b45309;
          border-radius: 999px;
          padding: 4px 8px;
        }

        .ai-status-indicator__dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--brand);
          animation: ai-pulse 1.5s infinite;
        }

        .ai-status-indicator--queued .ai-status-indicator__dot {
          background: #d97706;
        }

        .editor-footer__rate-limit {
          display: inline-flex;
          margin-left: 10px;
          color: #b45309;
          font-size: 0.82rem;
        }

        @keyframes ai-pulse {
          0% {
            transform: scale(0.9);
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
          }
          70% {
            transform: scale(1);
            opacity: 0.8;
            box-shadow: 0 0 0 6px rgba(99, 102, 241, 0);
          }
          100% {
            transform: scale(0.9);
            opacity: 1;
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
          }
        }

        .note-tags-suggestions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(99, 102, 241, 0.04);
          border: 1px solid var(--border);
          border-radius: 10px;
        }

        .note-tags-suggestions__label {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .note-tags-suggestions__list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .note-tags-suggestions__chip {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: var(--bg-base);
          border: 1px dashed var(--border);
          border-radius: 99px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background var(--t-fast), border-color var(--t-fast), color var(--t-fast);
        }

        .note-tags-suggestions__chip:hover {
          background: rgba(99, 102, 241, 0.08);
          border-color: var(--brand);
          color: var(--brand);
        }

        .note-tags-suggestions__add-all {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: var(--brand);
          border: none;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: background var(--t-fast);
        }

        .note-tags-suggestions__add-all:hover {
          background: var(--brand-hover);
        }

        .note-backlinks-section {
          padding: 14px 48px;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .note-backlinks-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .note-backlinks-empty {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .note-backlinks-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .note-backlink-item {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--brand);
          cursor: pointer;
          font-family: inherit;
          transition: background var(--t-fast);
        }

        .note-backlink-item:hover {
          background: var(--bg-hover);
        }

        .editor-slash-menu {
          position: absolute;
          z-index: 100;
          width: 300px;
          max-height: 280px;
          overflow-y: auto;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25);
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          backdrop-filter: blur(10px);
        }

        .editor-slash-menu__empty {
          padding: 12px;
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          text-align: center;
        }

        .editor-slash-menu__item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          text-align: left;
          width: 100%;
          font-family: inherit;
          transition: background var(--t-fast), color var(--t-fast);
        }

        .editor-slash-menu__item--selected {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .editor-slash-menu__icon {
          color: var(--brand);
          flex-shrink: 0;
        }

        .editor-slash-menu__info {
          display: flex;
          flex-direction: column;
        }

        .editor-slash-menu__name {
          font-size: 0.84rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .editor-slash-menu__desc {
          font-size: 0.72rem;
          color: var(--text-tertiary);
          margin-top: 1px;
        }

        .wiki-link {
          color: var(--brand);
          text-decoration: underline;
          cursor: pointer;
          font-weight: 500;
        }

        .wiki-link[href^="note-new://"] {
          color: var(--text-tertiary);
          text-decoration-style: dashed;
        }
      `}</style>
    </div>
  );
}

/* ── Date formatter ───────────────────────────────────────────── */
function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
