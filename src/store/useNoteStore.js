import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { useSettingsStore } from './useSettingsStore';
import { safeLocalStorage } from '@/utils/storage';

export const useNoteStore = create(
  persist(
    (set, get) => ({
      notes: [],
      activeNoteId: null,

      createNote: (attrs = {}) => {
        const note = {
          id: attrs.id ?? uuidv4(),
          title: attrs.title ?? 'Untitled',
          content: attrs.content ?? '',
          folderId: attrs.folderId ?? null,
          tags: attrs.tags ?? [],
          pinned: attrs.pinned ?? false,
          templateId: attrs.templateId ?? null,
          trashed: attrs.trashed ?? false,
          trashedAt: attrs.trashedAt ?? null,
          history: attrs.history ?? [],
          createdAt: attrs.createdAt ?? new Date().toISOString(),
          updatedAt: attrs.updatedAt ?? new Date().toISOString(),
        };

        set((state) => ({
          notes: [note, ...state.notes],
          activeNoteId: note.id,
        }));

        useSettingsStore.getState().setLastOpenedNoteId(note.id);
        return note;
      },

      updateNote: (id, patch) => {
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id !== id) return note;

            let history = note.history || [];
            // If content or title is changing, check if we should push to history
            const hasContentChanged = patch.content !== undefined && patch.content !== note.content;
            const hasTitleChanged = patch.title !== undefined && patch.title !== note.title;

            if (hasContentChanged || hasTitleChanged) {
              const lastSnapshot = history[0];
              const now = Date.now();
              const timeSinceLastSnapshot = lastSnapshot ? now - new Date(lastSnapshot.timestamp).getTime() : Infinity;

              // Only save if it's the first snapshot or if 1 minute has passed
              if (!lastSnapshot || timeSinceLastSnapshot > 60000) {
                history = [
                  {
                    title: note.title,
                    content: note.content,
                    timestamp: new Date().toISOString(),
                  },
                  ...history,
                ].slice(0, 10); // Keep last 10 versions
              }
            }

            return {
              ...note,
              ...patch,
              history,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      deleteNote: (id) => {
        // Now moves to Trash by default (soft delete)
        const isActive = get().activeNoteId === id;
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? {
                  ...note,
                  trashed: true,
                  trashedAt: new Date().toISOString(),
                  pinned: false,
                }
              : note
          ),
          activeNoteId: isActive ? null : state.activeNoteId,
        }));

        if (isActive) {
          useSettingsStore.getState().setLastOpenedNoteId(null);
        }
      },

      restoreNote: (id) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? {
                  ...note,
                  trashed: false,
                  trashedAt: null,
                }
              : note
          ),
        }));
      },

      deleteNotePermanently: (id) => {
        const isActive = get().activeNoteId === id;
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
          activeNoteId: isActive ? null : state.activeNoteId,
        }));

        if (isActive) {
          useSettingsStore.getState().setLastOpenedNoteId(null);
        }
      },

      emptyTrash: () => {
        set((state) => ({
          notes: state.notes.filter((note) => !note.trashed),
        }));
      },

      // Bulk actions
      bulkTrashNotes: (ids) => {
        const activeId = get().activeNoteId;
        set((state) => ({
          notes: state.notes.map((note) =>
            ids.includes(note.id)
              ? {
                  ...note,
                  trashed: true,
                  trashedAt: new Date().toISOString(),
                  pinned: false,
                }
              : note
          ),
          activeNoteId: ids.includes(activeId) ? null : activeId,
        }));
        if (ids.includes(activeId)) {
          useSettingsStore.getState().setLastOpenedNoteId(null);
        }
      },

      bulkRestoreNotes: (ids) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            ids.includes(note.id)
              ? {
                  ...note,
                  trashed: false,
                  trashedAt: null,
                }
              : note
          ),
        }));
      },

      bulkDeleteNotesPermanently: (ids) => {
        const activeId = get().activeNoteId;
        set((state) => ({
          notes: state.notes.filter((note) => !ids.includes(note.id)),
          activeNoteId: ids.includes(activeId) ? null : activeId,
        }));
        if (ids.includes(activeId)) {
          useSettingsStore.getState().setLastOpenedNoteId(null);
        }
      },

      bulkMoveNotesToFolder: (ids, folderId) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            ids.includes(note.id)
              ? {
                  ...note,
                  folderId,
                  updatedAt: new Date().toISOString(),
                }
              : note
          ),
        }));
      },

      bulkAddTagToNotes: (ids, tag) => {
        set((state) => ({
          notes: state.notes.map((note) => {
            if (!ids.includes(note.id)) return note;
            const tags = note.tags || [];
            if (tags.includes(tag)) return note;
            return {
              ...note,
              tags: [...tags, tag],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      clearAllNotes: () => {
        set({ notes: [], activeNoteId: null });
        useSettingsStore.getState().setLastOpenedNoteId(null);
      },

      setActiveNote: (id) => {
        set({ activeNoteId: id });
        useSettingsStore.getState().setLastOpenedNoteId(id);
      },

      pinNote: (id) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? {
                  ...note,
                  pinned: !note.pinned,
                  updatedAt: new Date().toISOString(),
                }
              : note
          ),
        }));
      },
    }),
    {
      name: 'brain_notes',
      storage: safeLocalStorage,
    }
  )
);
