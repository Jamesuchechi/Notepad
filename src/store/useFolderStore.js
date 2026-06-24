import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export const useFolderStore = create(
  persist(
    (set) => ({
      folders: [],

      createFolder: (name) => {
        const folder = {
          id: uuidv4(),
          name,
          color: '#6366f1',
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

      deleteFolder: (id) => {
        set((state) => ({
          folders: state.folders.filter((folder) => folder.id !== id),
        }));
      },
    }),
    {
      name: 'brain_folders',
    }
  )
);
