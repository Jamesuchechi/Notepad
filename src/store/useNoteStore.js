import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { useSettingsStore } from './useSettingsStore';

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
          notes: state.notes.map((note) =>
            note.id === id
              ? {
                  ...note,
                  ...patch,
                  updatedAt: new Date().toISOString(),
                }
              : note
          ),
        }));
      },

      deleteNote: (id) => {
        const isActive = get().activeNoteId === id;
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
          activeNoteId: isActive ? null : state.activeNoteId,
        }));

        if (isActive) {
          useSettingsStore.getState().setLastOpenedNoteId(null);
        }
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
    }
  )
);
