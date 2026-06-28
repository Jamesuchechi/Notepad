import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { useNoteStore } from './useNoteStore';
import { indexedDBStorage } from '@/utils/storage';

export const useFolderStore = create(
  persist(
    (set, get) => ({
      folders: [],
      activeFolderId: 'all',
      tagFilter: null,

      createFolder: (name, color = '#6366f1') => {
        const folder = {
          id: uuidv4(),
          name,
          color,
        };
        set((state) => ({ folders: [...state.folders, folder] }));
        return folder;
      },

      renameFolder: (id, name) => {
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? { ...folder, name } : folder
          ),
        }));
      },

      setFolderColor: (id, color) => {
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? { ...folder, color } : folder
          ),
        }));
      },

      setActiveFolderId: (id) => set({ activeFolderId: id }),
      setTagFilter: (tag) => set({ tagFilter: tag }),
      clearTagFilter: () => set({ tagFilter: null }),

      deleteFolder: (id) => {
        const noteIds = useNoteStore.getState()
          .notes.filter((note) => note.folderId === id)
          .map((note) => note.id);

        noteIds.forEach((noteId) => {
          useNoteStore.getState().updateNote(noteId, { folderId: null });
        });

        set((state) => ({
          folders: state.folders.filter((folder) => folder.id !== id),
          activeFolderId: state.activeFolderId === id ? 'all' : state.activeFolderId,
        }));
      },
    }),
    {
      name: 'brain_folders',
      storage: indexedDBStorage,
      skipHydration: true,
    }
  )
);
