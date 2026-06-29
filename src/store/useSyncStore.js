import { create } from 'zustand';
import { indexedDBStorage } from '@/utils/storage';
import { verifyPermission, scanLocalDirectory, writeNoteToDirectory, deleteNoteFromDirectory } from '@/utils/fileSystem';
import { useToastStore } from './useToastStore';

export const useSyncStore = create((set, get) => ({
  dirHandle: null,
  permissionGranted: false,
  syncActive: false,

  initSync: async () => {
    try {
      const handle = await indexedDBStorage.getItem('local_dir_handle');
      if (handle) {
        set({ dirHandle: handle });
        // Verify if we already have permission (handles can persist read/write within sessions)
        const granted = await verifyPermission(handle, true);
        set({ permissionGranted: granted, syncActive: granted });
        if (granted) {
          await get().syncNotesFromDisk();
        }
      }
    } catch (err) {
      console.error('Failed to restore directory handle:', err);
    }
  },

  selectDirectory: async () => {
    try {
      if (!window.showDirectoryPicker) {
        useToastStore.getState().showToast('Local Folder Sync is not supported by this browser.', 'error');
        return;
      }
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await indexedDBStorage.setItem('local_dir_handle', handle);
      set({ dirHandle: handle, permissionGranted: true, syncActive: true });
      useToastStore.getState().showToast('Local directory successfully connected!', 'success');
      await get().syncNotesFromDisk();
    } catch (err) {
      console.error(err);
      useToastStore.getState().showToast('Failed to connect directory', 'error');
    }
  },

  disconnectDirectory: async () => {
    try {
      await indexedDBStorage.removeItem('local_dir_handle');
      set({ dirHandle: null, permissionGranted: false, syncActive: false });
      useToastStore.getState().showToast('Local directory sync disabled', 'info');
    } catch (err) {
      console.error(err);
    }
  },

  requestPermission: async () => {
    const { dirHandle } = get();
    if (!dirHandle) return false;
    try {
      const granted = await verifyPermission(dirHandle, true);
      set({ permissionGranted: granted, syncActive: granted });
      if (granted) {
        useToastStore.getState().showToast('Permission granted. Sync active.', 'success');
        await get().syncNotesFromDisk();
      }
      return granted;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  syncNotesFromDisk: async () => {
    const { dirHandle, permissionGranted } = get();
    if (!dirHandle || !permissionGranted) return;

    try {
      const { useFolderStore } = await import('./useFolderStore');
      const { useNoteStore } = await import('./useNoteStore');

      const currentFolders = useFolderStore.getState().folders;
      const getFolderPath = (folder) => {
        const path = [folder.name];
        let curr = folder;
        while (curr.parentId) {
          const parent = currentFolders.find((f) => f.id === curr.parentId);
          if (!parent) break;
          path.unshift(parent.name);
          curr = parent;
        }
        return path.join('/');
      };

      const foldersMap = new Map(currentFolders.map((f) => [getFolderPath(f), f.id]));

      const { notes: diskNotes, folders: diskFolders } = await scanLocalDirectory(dirHandle, foldersMap);

      // Merge folders in order of appearance (since parents are pushed before children)
      diskFolders.forEach((df) => {
        const pathSegments = [];
        let currDf = df;
        while (currDf) {
          pathSegments.unshift(currDf.name);
          currDf = currDf.parentId ? diskFolders.find((f) => f.id === currDf.parentId) : null;
        }
        const fullPath = pathSegments.join('/');

        const existingFolders = useFolderStore.getState().folders;
        const exists = existingFolders.some((f) => getFolderPath(f).toLowerCase() === fullPath.toLowerCase());
        if (!exists) {
          let parentIdInApp = null;
          if (df.parentId) {
            const diskParent = diskFolders.find((f) => f.id === df.parentId);
            if (diskParent) {
              const parentPathSegments = [];
              let currParent = diskParent;
              while (currParent) {
                parentPathSegments.unshift(currParent.name);
                currParent = currParent.parentId ? diskFolders.find((f) => f.id === currParent.parentId) : null;
              }
              const parentFullPath = parentPathSegments.join('/');
              const matchedAppParent = useFolderStore.getState().folders.find(
                (f) => getFolderPath(f).toLowerCase() === parentFullPath.toLowerCase()
              );
              if (matchedAppParent) {
                parentIdInApp = matchedAppParent.id;
              }
            }
          }
          useFolderStore.getState().createFolder(df.name, parentIdInApp, df.color);
        }
      });

      // Reload mapping after folder additions
      const updatedFolders = useFolderStore.getState().folders;
      const updatedFoldersMap = new Map(updatedFolders.map((f) => [getFolderPath(f), f.id]));

      // Link notes from disk into the app
      const noteStore = useNoteStore.getState();
      diskNotes.forEach((dn) => {
        // Resolve containing folder link in case of folder ID mismatch
        let matchedFolderId = null;
        if (dn.folderId) {
          const diskParent = diskFolders.find((df) => df.id === dn.folderId);
          if (diskParent) {
            const parentPathSegments = [];
            let currParent = diskParent;
            while (currParent) {
              parentPathSegments.unshift(currParent.name);
              currParent = currParent.parentId ? diskFolders.find((f) => f.id === currParent.parentId) : null;
            }
            const parentFullPath = parentPathSegments.join('/');
            matchedFolderId = updatedFoldersMap.get(parentFullPath) || null;
          }
        }
        dn.folderId = matchedFolderId;

        const existing = noteStore.notes.find(
          (n) => n.id === dn.id || (n.title.toLowerCase() === dn.title.toLowerCase() && n.folderId === matchedFolderId)
        );

        if (existing) {
          if (new Date(dn.updatedAt) > new Date(existing.updatedAt)) {
            noteStore.updateNote(existing.id, {
              title: dn.title,
              content: dn.content,
              folderId: dn.folderId,
              tags: dn.tags,
              pinned: dn.pinned,
              trashed: dn.trashed,
            });
          }
        } else {
          noteStore.createNote({
            id: dn.id,
            title: dn.title,
            content: dn.content,
            folderId: dn.folderId,
            tags: dn.tags,
            pinned: dn.pinned,
            trashed: dn.trashed,
          });
        }
      });

      useToastStore.getState().showToast('Sync from disk complete!', 'success');
    } catch (err) {
      console.error('Failed to sync notes from disk:', err);
      useToastStore.getState().showToast('Failed to sync from disk', 'error');
    }
  },

  writeNoteToDisk: async (note) => {
    const { dirHandle, permissionGranted, syncActive } = get();
    if (!dirHandle || !permissionGranted || !syncActive) return;
    try {
      const { useFolderStore } = await import('./useFolderStore');
      const folders = useFolderStore.getState().folders;
      await writeNoteToDirectory(dirHandle, note, folders);
    } catch (err) {
      console.error(err);
    }
  },

  deleteNoteFromDisk: async (note) => {
    const { dirHandle, permissionGranted, syncActive } = get();
    if (!dirHandle || !permissionGranted || !syncActive) return;
    try {
      const { useFolderStore } = await import('./useFolderStore');
      const folders = useFolderStore.getState().folders;
      await deleteNoteFromDirectory(dirHandle, note, folders);
    } catch (err) {
      console.error(err);
    }
  },

  createFolderOnDisk: async (folderId, folders) => {
    const { dirHandle, permissionGranted, syncActive } = get();
    if (!dirHandle || !permissionGranted || !syncActive) return;
    try {
      const { createFolderInDirectory } = await import('@/utils/fileSystem');
      await createFolderInDirectory(dirHandle, folderId, folders);
    } catch (err) {
      console.error(err);
    }
  },

  deleteFolderFromDisk: async (folderId, folders) => {
    const { dirHandle, permissionGranted, syncActive } = get();
    if (!dirHandle || !permissionGranted || !syncActive) return;
    try {
      const { deleteFolderFromDirectory } = await import('@/utils/fileSystem');
      await deleteFolderFromDirectory(dirHandle, folderId, folders);
    } catch (err) {
      console.error(err);
    }
  },

  renameFolderOnDisk: async (folderId, newName, folders) => {
    const { dirHandle, permissionGranted, syncActive } = get();
    if (!dirHandle || !permissionGranted || !syncActive) return;
    try {
      const { renameFolderOnDirectory } = await import('@/utils/fileSystem');
      await renameFolderOnDirectory(dirHandle, folderId, newName, folders);
    } catch (err) {
      console.error(err);
    }
  },
}));
