import { useEffect, useMemo, useRef, useState } from 'react';
import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { X, Send, MessageCircle, Link2 } from 'lucide-react';
import { stream } from '@/utils/ai';

function parseMarkdownInline(text) {
  if (typeof text !== 'string') return text;
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index}>{part}</strong>;
    }
    const subParts = part.split('*');
    if (subParts.length > 1) {
      return subParts.map((subPart, subIndex) => {
        if (subIndex % 2 === 1) {
          return <em key={`${index}-${subIndex}`}>{subPart}</em>;
        }
        return subPart;
      });
    }
    return part;
  });
}


const MAX_CHUNK_LENGTH = 1200;

function formatNoteSnippet(note) {
    const plain = note.content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return `Note ID: ${note.id}\nTitle: ${note.title || 'Untitled'}\nContent: ${plain.slice(0, 280)}\n`;
}

function buildNoteChunks(notes) {
    const chunks = [];
    let current = '';

    for (const note of notes) {
        const snippet = formatNoteSnippet(note);
        if (current.length + snippet.length > MAX_CHUNK_LENGTH && current.length > 0) {
            chunks.push(current);
            current = '';
        }
        current += `${snippet}\n`;
    }

    if (current.length > 0) {
        chunks.push(current);
    }

    return chunks;
}

export default function AIChatModal({ open, onClose }) {
    const notes = useNoteStore((s) => s.notes);
    const setActiveNote = useNoteStore((s) => s.setActiveNote);
    const aiEnabled = useSettingsStore((s) => s.aiEnabled);
    const chatEnabled = useSettingsStore((s) => s.aiFeatures?.chat);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: 'Ask me anything about your notes, and I will answer using your note library as context.',
            citedNoteIds: [],
        },
    ]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    const noteChunks = useMemo(() => buildNoteChunks(notes), [notes]);

    const extractCitations = (text) => {
        const citationRegex = /Note ID:\s*([0-9a-fA-F-]{36})/g;
        const ids = new Set();
        let match;
        while ((match = citationRegex.exec(text)) !== null) {
            ids.add(match[1]);
        }
        return Array.from(ids);
    };

    const citedNotes = useMemo(() => {
        const ids = new Set(messages.flatMap((message) => message.citedNoteIds || []));
        return Array.from(ids)
            .map((id) => notes.find((note) => note.id === id))
            .filter(Boolean);
    }, [messages, notes]);

    if (!open || !aiEnabled || !chatEnabled) {
        return null;
    }

    const handleSend = async () => {
        if (!input.trim() || !aiEnabled || !chatEnabled) return;
        const question = input.trim();
        setInput('');
        setError(null);

        const newMessage = { role: 'user', text: question };
        setMessages((current) => [...current, newMessage]);
        setIsSending(true);

        try {
            const systemPrompt = `You are an AI assistant that answers questions about the user's note library. Use the note context provided to answer as accurately as possible. When you reference a note, append a citation marker in the form [Note ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx]. Do not invent note IDs. If a note is not directly relevant, do not cite it.`;
            const responseMessages = [
                { role: 'system', content: systemPrompt },
            ];

            noteChunks.forEach((chunk, index) => {
                responseMessages.push({
                    role: 'system',
                    content: `Note context chunk ${index + 1}/${noteChunks.length}:\n${chunk}`,
                });
            });

            responseMessages.push({
                role: 'user',
                content: `Question: ${question}`,
            });

            let assistantText = '';
            const iterator = stream(responseMessages, { model: 'google/gemini-2.5-flash' });
            for await (const chunk of iterator) {
                assistantText += chunk;
                setMessages((current) => {
                    const last = current[current.length - 1];
                    if (last?.role === 'assistant' && last?.isPartial) {
                        return [...current.slice(0, -1), { ...last, text: assistantText, isPartial: true }];
                    }
                    return [...current, { role: 'assistant', text: assistantText, isPartial: true }];
                });
            }

            const citedNoteIds = extractCitations(assistantText);
            setMessages((current) =>
                current.map((message) =>
                    message.role === 'assistant' && message.isPartial
                        ? { role: 'assistant', text: assistantText, citedNoteIds }
                        : message
                )
            );
        } catch (err) {
            console.error('AI chat error:', err);
            setError('AI chat failed. Try again later.');
            setMessages((current) => [...current, { role: 'assistant', text: 'I could not answer that right now.', citedNoteIds: [] }]);
        } finally {
            setIsSending(false);
        }
    };

    if (!open || !aiEnabled || !chatEnabled) {
        return null;
    }

    return (
        <div className="ai-chat-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="ai-chat-panel" onClick={(event) => event.stopPropagation()}>
                <div className="ai-chat-header">
                    <div>
                        <h2>AI Chat</h2>
                        <p>Ask questions about your notes and get answers with citations.</p>
                    </div>
                    <button className="icon-btn" onClick={onClose} aria-label="Close AI chat" title="Close AI chat">
                        <X size={16} />
                    </button>
                </div>
                <div className="ai-chat-messages">
                    {messages.map((message, index) => (
                        <div
                            key={`${message.role}-${index}`}
                            className={`ai-chat-message ai-chat-message--${message.role}`}
                        >
                            <div className="ai-chat-message__bubble">
                                <div className="ai-chat-message__meta">{message.role === 'user' ? 'You' : 'AI'}</div>
                                <div className="ai-chat-message__text">
                                    {message.text.split('\n').map((line, lineIndex) => {
                                        const trimmed = line.trim();
                                        if (!trimmed) {
                                            return <div key={`${message.role}-${index}-${lineIndex}`} className="ai-chat-message__line" />;
                                        }

                                        if (/^[-*]\s+/.test(trimmed)) {
                                            const content = trimmed.replace(/^[-*]\s+/, '');
                                            return (
                                                <div key={`${message.role}-${index}-${lineIndex}`} className="ai-chat-message__bullet">
                                                    • {parseMarkdownInline(content)}
                                                </div>
                                            );
                                        }

                                        if (/^\d+\.\s+/.test(trimmed)) {
                                            const match = trimmed.match(/^(\d+\.\s+)(.*)$/);
                                            if (match) {
                                                return (
                                                    <div key={`${message.role}-${index}-${lineIndex}`} className="ai-chat-message__numbered">
                                                        <span style={{ fontWeight: '600' }}>{match[1]}</span>
                                                        {parseMarkdownInline(match[2])}
                                                    </div>
                                                );
                                            }
                                            return <div key={`${message.role}-${index}-${lineIndex}`} className="ai-chat-message__numbered">{parseMarkdownInline(trimmed)}</div>;
                                        }

                                        if (/^#{1,3}\s+/.test(trimmed)) {
                                            const level = trimmed.match(/^#+/)[0].length;
                                            const HeadingTag = `h${Math.min(level + 1, 4)}`;
                                            const content = trimmed.replace(/^#{1,3}\s+/, '');
                                            return (
                                                <HeadingTag key={`${message.role}-${index}-${lineIndex}`} className="ai-chat-message__heading">
                                                    {parseMarkdownInline(content)}
                                                </HeadingTag>
                                            );
                                        }

                                        return (
                                            <div key={`${message.role}-${index}-${lineIndex}`} className="ai-chat-message__paragraph">
                                                {parseMarkdownInline(trimmed)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {message.role === 'assistant' && (message.citedNoteIds || []).length > 0 && (
                                <div className="ai-chat-message__citations">
                                    <span>Cited notes:</span>
                                    <div className="ai-chat-message__citation-list">
                                        {message.citedNoteIds.map((id) => {
                                            const note = notes.find((item) => item.id === id);
                                            if (!note) return null;
                                            return (
                                                <button
                                                    type="button"
                                                    key={id}
                                                    className="ai-chat-message__citation"
                                                    onClick={() => setActiveNote(id)}
                                                >
                                                    <Link2 size={12} />
                                                    {note.title || 'Untitled'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {error && <div className="ai-chat-error">{error}</div>}
                </div>

                <div className="ai-chat-input-row">
                    <textarea
                        ref={inputRef}
                        className="ai-chat-input"
                        placeholder="Ask a question about your notes..."
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        rows={3}
                        disabled={isSending}
                    />
                    <button
                        type="button"
                        className="ai-chat-send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || isSending}
                        title="Send message"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>

            <style>{`
        .ai-chat-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.48);
          display: flex;
          align-items: stretch;
          justify-content: flex-end;
          z-index: 70;
          padding: 0;
        }

        .ai-chat-panel {
          width: min(40vw, 520px);
          max-width: 520px;
          height: 100vh;
          background: var(--bg-elevated);
          border-left: 1px solid var(--border);
          border-radius: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: -20px 0 60px rgba(15, 23, 42, 0.2);
        }

        @media (max-width: 900px) {
          .ai-chat-panel {
            width: 100%;
            max-width: 100%;
          }
        }

        .ai-chat-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 24px 14px;
          border-bottom: 1px solid var(--border);
        }

        .ai-chat-header h2 {
          margin: 0 0 6px;
          font-size: 1.05rem;
        }

        .ai-chat-header p {
          margin: 0;
          color: var(--text-tertiary);
          font-size: 0.88rem;
          line-height: 1.6;
        }

        .ai-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 18px 24px;
          display: grid;
          gap: 16px;
        }

        .ai-chat-message {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .ai-chat-message--user .ai-chat-message__bubble {
          align-self: flex-end;
          background: rgba(59, 130, 246, 0.12);
          border-color: rgba(59, 130, 246, 0.25);
        }

        .ai-chat-message--assistant .ai-chat-message__bubble {
          align-self: flex-start;
          background: var(--bg-base);
          border-color: var(--border);
        }

        .ai-chat-message__bubble {
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: 18px;
          max-width: 100%;
          word-break: break-word;
        }

        .ai-chat-message__meta {
          margin-bottom: 8px;
          color: var(--text-secondary);
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .ai-chat-message__text {
          display: flex;
          flex-direction: column;
          gap: 6px;
          white-space: normal;
          color: var(--text-primary);
          font-size: 0.92rem;
          line-height: 1.6;
        }

        .ai-chat-message__paragraph,
        .ai-chat-message__bullet,
        .ai-chat-message__numbered {
          white-space: normal;
        }

        .ai-chat-message__bullet {
          padding-left: 8px;
        }

        .ai-chat-message__numbered {
          padding-left: 4px;
        }

        .ai-chat-message__heading {
          margin: 2px 0 0;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .ai-chat-message__line {
          height: 0.5rem;
        }

        .ai-chat-message__citations {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-left: 4px;
        }

        .ai-chat-message__citation-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ai-chat-message__citation {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-secondary);
          font-size: 0.78rem;
          cursor: pointer;
        }

        .ai-chat-message__citation:hover {
          border-color: var(--brand);
          color: var(--text-primary);
        }

        .ai-chat-error {
          color: var(--red);
          font-size: 0.9rem;
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.16);
        }

        .ai-chat-input-row {
          display: flex;
          gap: 10px;
          padding: 14px 24px 20px;
          border-top: 1px solid var(--border);
          background: var(--bg-base);
          flex-shrink: 0;
        }

        .ai-chat-input {
          flex: 1;
          min-height: 84px;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 12px 14px;
          font-size: 0.95rem;
          background: var(--bg-subtle);
          color: var(--text-primary);
          resize: none;
          font-family: inherit;
        }

        .ai-chat-input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.08);
        }

        .ai-chat-send-btn {
          width: 46px;
          height: 46px;
          border-radius: 14px;
          border: none;
          background: var(--brand);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .ai-chat-send-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        @media (max-width: 760px) {
          .ai-chat-panel { width: 100%; max-height: 100vh; border-radius: 16px; }
          .ai-chat-messages { padding: 14px 16px; gap: 14px; }
          .ai-chat-input-row { padding: 12px 16px 16px; }
        }
      `}</style>
        </div>
    );
}
