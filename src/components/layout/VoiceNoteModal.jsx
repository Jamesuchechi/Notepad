import { useEffect, useRef, useState } from 'react';
import { X, Mic, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { streamToText } from '@/utils/ai';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function VoiceNoteModal({ open, onClose }) {
  const createNote = useNoteStore((s) => s.createNote);
  const aiEnabled = useSettingsStore((s) => s.aiEnabled);
  const voiceEnabled = useSettingsStore((s) => s.aiFeatures?.voice);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Press start and speak clearly.');
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setTranscript('');
      setStatus('Press start and speak clearly.');
      setError(null);
      setIsListening(false);
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const startListening = () => {
    if (!SpeechRecognition) {
      setError('Voice transcription is not supported in this browser.');
      return;
    }

    setError(null);
    setStatus('Listening...');
    setIsListening(true);

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      const spokenText = Array.from(event.results)
        .map((result) => result[0]?.transcript)
        .join(' ');
      setTranscript(spokenText);
    };

    recognition.onerror = (event) => {
      setError(`Voice capture error: ${event.error}`);
      setStatus('Voice capture failed.');
      setIsListening(false);
      recognition.stop();
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus('Recording stopped. Review the transcript below.');
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setStatus('Recording stopped. Review the transcript below.');
  };

  const handleCreateVoiceNote = async () => {
    if (!transcript.trim()) {
      setError('No transcript available to save.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let content = transcript.trim();
      if (aiEnabled && voiceEnabled) {
        const prompt = `Clean up the following spoken transcript into polished, readable note content. Preserve the meaning, remove filler words and repeated fragments, and keep paragraphs where appropriate. Return only the cleaned note content without any markdown syntax headings.

Transcript:
${content}`;
        content = await streamToText([{ role: 'user', content: prompt }]);
      }

      const noteContent = `<p>${content.replace(/\n+/g, '</p><p>')}</p>`;
      createNote({
        title: 'Voice note',
        content: noteContent,
        pinned: false,
      });
      onClose();
    } catch (err) {
      console.error('Voice note creation failed:', err);
      setError('Unable to create voice note right now.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!open || !voiceEnabled) {
    return null;
  }

  return (
    <div className="voice-note-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="voice-note-panel" onClick={(event) => event.stopPropagation()}>
        <div className="voice-note-header">
          <div>
            <h2>Voice note</h2>
            <p>Record audio and convert it into a note automatically.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close voice note" title="Close voice note">
            <X size={16} />
          </button>
        </div>

        <div className="voice-note-body">
          <div className="voice-note-status">
            <Mic size={18} />
            <span>{status}</span>
          </div>

          <div className="voice-note-controls">
            {!isListening ? (
              <button type="button" className="voice-note-btn" onClick={startListening}>
                Start recording
              </button>
            ) : (
              <button type="button" className="voice-note-btn voice-note-btn--stop" onClick={stopListening}>
                Stop recording
              </button>
            )}
          </div>

          <label className="voice-note-transcript-label">Transcript</label>
          <textarea
            className="voice-note-transcript"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={8}
            placeholder="Your spoken words will appear here..."
          />

          {error && (
            <div className="voice-note-error">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="voice-note-actions">
            <button
              type="button"
              className="voice-note-create-btn"
              onClick={handleCreateVoiceNote}
              disabled={isProcessing || !transcript.trim()}
            >
              {isProcessing ? 'Saving…' : 'Save voice note'}
            </button>
            <button type="button" className="voice-note-cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .voice-note-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 75;
          padding: 20px;
        }

        .voice-note-panel {
          width: min(640px, 100%);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(15, 23, 42, 0.2);
        }

        .voice-note-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 24px 16px;
          border-bottom: 1px solid var(--border);
        }

        .voice-note-header h2 {
          margin: 0 0 6px;
          font-size: 1.05rem;
        }

        .voice-note-header p {
          margin: 0;
          color: var(--text-tertiary);
          font-size: 0.88rem;
          line-height: 1.6;
        }

        .voice-note-body {
          padding: 0 24px 22px;
          display: grid;
          gap: 16px;
        }

        .voice-note-status {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-primary);
          font-size: 0.95rem;
        }

        .voice-note-controls {
          display: flex;
          gap: 10px;
        }

        .voice-note-btn {
          padding: 11px 18px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--brand);
          color: #fff;
          cursor: pointer;
          font-weight: 600;
        }

        .voice-note-btn--stop {
          background: #ef4444;
        }

        .voice-note-transcript-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .voice-note-transcript {
          width: 100%;
          min-height: 180px;
          border: 1px solid var(--border);
          border-radius: 16px;
          background: var(--bg-base);
          padding: 14px;
          color: var(--text-primary);
          font-size: 0.95rem;
          font-family: inherit;
          resize: vertical;
        }

        .voice-note-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.2);
          color: var(--red);
          font-size: 0.92rem;
        }

        .voice-note-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .voice-note-create-btn,
        .voice-note-cancel-btn {
          padding: 12px 18px;
          border-radius: 14px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--border);
        }

        .voice-note-create-btn {
          background: var(--brand);
          color: #fff;
          border-color: transparent;
        }

        .voice-note-cancel-btn {
          background: var(--bg-subtle);
          color: var(--text-primary);
        }

        .voice-note-create-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 720px) {
          .voice-note-panel { width: 100%; }
          .voice-note-body { padding: 0 18px 18px; }
        }
      `}</style>
    </div>
  );
}
