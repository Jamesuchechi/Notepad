import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { indexedDBStorage } from '@/utils/storage';

export const isFolderTrashed = (folder, folders) => {
  if (!folder) return false;
  if (folder.trashed) return true;
  if (folder.parentId) {
    const parent = folders.find((f) => f.id === folder.parentId);
    return isFolderTrashed(parent, folders);
  }
  return false;
};

export const isNoteTrashed = (note, folders) => {
  if (note.trashed) return true;
  if (note.folderId) {
    const parent = folders.find((f) => f.id === note.folderId);
    return isFolderTrashed(parent, folders);
  }
  return false;
};

export const useFolderStore = create(
  persist(
    (set, get) => ({
      folders: [],
      activeFolderId: 'all',
      tagFilter: null,

      createFolder: (nameOrObj, parentId = null, color = '#6366f1') => {
        let name = nameOrObj;
        let pId = parentId;
        let col = color;
        if (typeof nameOrObj === 'object' && nameOrObj !== null) {
          name = nameOrObj.name;
          pId = nameOrObj.parentId ?? parentId;
          col = nameOrObj.color ?? color;
        }
        const folder = {
          id: uuidv4(),
          name,
          color: col,
          parentId: pId,
          trashed: false,
          trashedAt: null,
        };
        set((state) => ({ folders: [...state.folders, folder] }));

        import('./useSyncStore').then(({ useSyncStore }) => {
          useSyncStore.getState().createFolderOnDisk(folder.id, [...get().folders, folder]);
        });

        return folder;
      },

      renameFolder: (id, name) => {
        const foldersBefore = get().folders;
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? { ...folder, name } : folder
          ),
        }));

        import('./useSyncStore').then(({ useSyncStore }) => {
          useSyncStore.getState().renameFolderOnDisk(id, name, foldersBefore);
        });
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
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id
              ? { ...folder, trashed: true, trashedAt: new Date().toISOString() }
              : folder
          ),
        }));

        const getDescendantFolderIds = (folderId, folders) => {
          let ids = [folderId];
          folders.forEach((f) => {
            if (f.parentId === folderId) {
              ids = [...ids, ...getDescendantFolderIds(f.id, folders)];
            }
          });
          return ids;
        };

        const targetFolderIds = getDescendantFolderIds(id, get().folders);
        const activeFolderId = get().activeFolderId;
        if (targetFolderIds.includes(activeFolderId)) {
          set({ activeFolderId: 'all' });
        }

        import('./useNoteStore').then(({ useNoteStore }) => {
          const noteStore = useNoteStore.getState();
          if (noteStore.activeNoteId) {
            const activeNote = noteStore.notes.find((n) => n.id === noteStore.activeNoteId);
            if (activeNote && activeNote.folderId && targetFolderIds.includes(activeNote.folderId)) {
              noteStore.setActiveNote(null);
            }
          }
        });
      },

      restoreFolder: (id) => {
        set((state) => {
          const updatedFolders = state.folders.map((folder) =>
            folder.id === id ? { ...folder, trashed: false, trashedAt: null } : folder
          );

          // Recursively restore all parent folders of this folder as well
          const restoreParents = (folderId, list) => {
            const folder = list.find((f) => f.id === folderId);
            if (folder && folder.parentId) {
              list = list.map((f) =>
                f.id === folder.parentId ? { ...f, trashed: false, trashedAt: null } : f
              );
              return restoreParents(folder.parentId, list);
            }
            return list;
          };

          return { folders: restoreParents(id, updatedFolders) };
        });
      },

      deleteFolderPermanently: (id) => {
        const getAllChildFolderIds = (folderId, folders) => {
          let ids = [folderId];
          folders.forEach((f) => {
            if (f.parentId === folderId) {
              ids = [...ids, ...getAllChildFolderIds(f.id, folders)];
            }
          });
          return ids;
        };

        const targetFolderIds = getAllChildFolderIds(id, get().folders);
        const foldersBefore = get().folders;

        // Permanently delete all notes inside all deleted folders
        import('./useNoteStore').then(({ useNoteStore }) => {
          const noteStore = useNoteStore.getState();
          const notesToDelete = noteStore.notes.filter(
            (note) => note.folderId && targetFolderIds.includes(note.folderId)
          );

          notesToDelete.forEach((note) => {
            noteStore.deleteNotePermanently(note.id);
          });
        });

        // Delete from disk recursively
        import('./useSyncStore').then(({ useSyncStore }) => {
          useSyncStore.getState().deleteFolderFromDisk(id, foldersBefore);
        });

        set((state) => ({
          folders: state.folders.filter((folder) => !targetFolderIds.includes(folder.id)),
          activeFolderId: targetFolderIds.includes(state.activeFolderId) ? 'all' : state.activeFolderId,
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
