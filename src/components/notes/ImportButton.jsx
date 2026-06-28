import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useFolderStore } from '@/store/useFolderStore';
import { useToastStore } from '@/store/useToastStore';
import { useSettingsStore } from '@/store/useSettingsStore';


/**
 * ImportButton
 * ─────────────
 * Renders an "Import" button that opens a file picker.
 * Accepts .md, .txt, .html, and .json files, creates a new note per file or restores backup.
 * Also registers a global drag-and-drop handler onto document.body.
 */
export default function ImportButton() {
  const fileInputRef = useRef(null);
  const createNote = useNoteStore((s) => s.createNote);
  const [importing, setImporting] = useState(false);

  const processFiles = async (files) => {
    const accepted = [...files].filter((f) =>
      f.name.endsWith('.md') ||
      f.name.endsWith('.txt') ||
      f.name.endsWith('.html') ||
      f.name.endsWith('.json')
    );
    if (accepted.length === 0) return;

    setImporting(true);
    let importedNotesCount = 0;

    for (const file of accepted) {
      try {
        const text = await file.text();

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          
          if (parsed && Array.isArray(parsed.notes)) {
            // Workspace JSON Backup
            const existingNoteIds = new Set(useNoteStore.getState().notes.map((n) => n.id));
            let restoredCount = 0;

            if (Array.isArray(parsed.folders)) {
              const currentFolders = useFolderStore.getState().folders;
              const existingFolderIds = new Set(currentFolders.map((f) => f.id));

              parsed.folders.forEach((folder) => {
                if (!existingFolderIds.has(folder.id)) {
                  useFolderStore.setState((state) => ({
                    folders: [...state.folders, folder],
                  }));
                }
              });
            }

            parsed.notes.forEach((note) => {
              if (!existingNoteIds.has(note.id)) {
                useNoteStore.setState((state) => ({
                  notes: [note, ...state.notes],
                }));
                restoredCount++;
              } else {
                const { id, ...attrs } = note;
                createNote({
                  ...attrs,
                  title: `${attrs.title} (Imported)`,
                });
                restoredCount++;
              }
            });

            if (parsed.settings) {
              const { theme, fontSize, aiEnabled, aiFeatures } = parsed.settings;
              if (theme) useSettingsStore.getState().setTheme(theme);
              if (fontSize) useSettingsStore.getState().setFontSize(fontSize);
              if (aiEnabled !== undefined) useSettingsStore.getState().setAiEnabled(aiEnabled);
              if (aiFeatures) {
                Object.entries(aiFeatures).forEach(([feature, enabled]) => {
                  const currentFeatures = useSettingsStore.getState().aiFeatures;
                  if (currentFeatures && currentFeatures[feature] !== enabled) {
                    useSettingsStore.getState().toggleAiFeature(feature);
                  }
                });
              }
            }

            useToastStore.getState().showToast(`Restored backup: ${restoredCount} notes and settings imported.`);
          } else if (parsed && parsed.type === 'doc') {
            // Single note editor JSON format
            const title = file.name.replace(/\.json$/, '').trim() || 'Imported JSON Note';
            createNote({ title, content: text });
            importedNotesCount++;
          } else {
            useToastStore.getState().showToast(`Unrecognized JSON format in ${file.name}.`);
          }
        } else if (file.name.endsWith('.html')) {
          // HTML Note Import
          const titleMatch = text.match(/<title>(.*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : file.name.replace(/\.html$/, '').trim();

          const bodyMatch = text.match(/<body>([\s\S]*?)<\/body>/i);
          const content = bodyMatch ? bodyMatch[1].trim() : text;

          createNote({ title, content });
          importedNotesCount++;
        } else {
          // Markdown / Plain Text
          const title = file.name.replace(/\.(md|txt)$/, '').trim() || 'Imported note';
          const content = text
            .split(/\n{2,}/)
            .map((para) => `<p>${para.trim().replace(/\n/g, '<br />')}</p>`)
            .join('');

          createNote({ title, content });
          importedNotesCount++;
        }
      } catch (err) {
        console.error(`Failed to process file ${file.name}:`, err);
        useToastStore.getState().showToast(`Error importing ${file.name}: invalid format.`);
      }
    }

    if (importedNotesCount > 0) {
      useToastStore.getState().showToast(`Successfully imported ${importedNotesCount} note(s).`);
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
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,.html,.json"
        multiple
        className="import-file-input"
        onChange={handleFileChange}
        aria-label="Import notes from file"
      />

      <button
        type="button"
        className="import-btn"
        title="Import .md, .txt, .html or .json files"
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