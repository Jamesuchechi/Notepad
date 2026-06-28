let yjsLoaded = false;
let yjsPromise = null;

export function loadYjsLibraries() {
  if (yjsLoaded) {
    return Promise.resolve({
      Y: window.Y,
      WebrtcProvider: window.WebrtcProvider,
    });
  }

  if (yjsPromise) return yjsPromise;

  yjsPromise = new Promise((resolve, reject) => {
    // Inject Yjs Script
    const yjsScript = document.createElement('script');
    yjsScript.src = 'https://cdn.jsdelivr.net/npm/yjs@13.6.10/dist/yjs.min.js';
    yjsScript.onload = () => {
      // Inject y-webrtc script after Yjs is loaded
      const webrtcScript = document.createElement('script');
      webrtcScript.src = 'https://cdn.jsdelivr.net/npm/y-webrtc@10.3.0/dist/y-webrtc.min.js';
      webrtcScript.onload = () => {
        yjsLoaded = true;
        resolve({
          Y: window.Y,
          WebrtcProvider: window.WebrtcProvider,
        });
      };
      webrtcScript.onerror = (err) => reject(new Error('Failed to load y-webrtc: ' + err.message));
      document.head.appendChild(webrtcScript);
    };
    yjsScript.onerror = (err) => reject(new Error('Failed to load Yjs: ' + err.message));
    document.head.appendChild(yjsScript);
  });

  return yjsPromise;
}

export class CollaborativeSyncEngine {
  constructor() {
    this.ydoc = null;
    this.provider = null;
    this.yNotes = null;
    this.yFolders = null;
    this.isUpdatingLocal = false;
    this.roomName = '';
    this.signalingServers = ['wss://signaling.yjs.dev'];
  }

  async initialize(roomName, signalingServers = null) {
    if (!roomName) return;
    this.roomName = roomName;
    if (signalingServers && signalingServers.length > 0) {
      this.signalingServers = signalingServers;
    }

    try {
      const { Y, WebrtcProvider } = await loadYjsLibraries();

      // Clear any existing connection
      this.disconnect();

      this.ydoc = new Y.Doc();
      
      // Initialize shared maps
      this.yNotes = this.ydoc.getMap('notes');
      this.yFolders = this.ydoc.getMap('folders');

      // Bind WebRTC connection
      this.provider = new WebrtcProvider(this.roomName, this.ydoc, {
        signaling: this.signalingServers,
        password: roomName, // Use roomName as a basic key to encrypt WebRTC traffic
      });

      // Import stores dynamically to avoid circular dependency
      const { useNoteStore } = await import('@/store/useNoteStore');
      const { useFolderStore } = await import('@/store/useFolderStore');

      // 1. Initial push from Local to CRDT document if CRDT is empty
      const localNotes = useNoteStore.getState().notes;
      const localFolders = useFolderStore.getState().folders;

      this.ydoc.transact(() => {
        if (this.yNotes.size === 0 && localNotes.length > 0) {
          localNotes.forEach((note) => this.yNotes.set(note.id, note));
        }
        if (this.yFolders.size === 0 && localFolders.length > 0) {
          localFolders.forEach((folder) => this.yFolders.set(folder.id, folder));
        }
      });

      // 2. Sync incoming changes from peers to local Zustand store
      this.yNotes.observe((event) => {
        if (this.isUpdatingLocal) return;
        
        const noteStore = useNoteStore.getState();
        
        event.keysChanged.forEach((key) => {
          const remoteNote = this.yNotes.get(key);
          const localNote = noteStore.notes.find((n) => n.id === key);

          if (!remoteNote) {
            // Delete locally if deleted from CRDT map
            if (localNote) {
              noteStore.deleteNotePermanently(key);
            }
          } else {
            // Upsert note locally
            if (!localNote) {
              noteStore.createNote(remoteNote);
            } else if (new Date(remoteNote.updatedAt) > new Date(localNote.updatedAt)) {
              noteStore.updateNote(key, remoteNote);
            }
          }
        });
      });

      this.yFolders.observe((event) => {
        if (this.isUpdatingLocal) return;

        const folderStore = useFolderStore.getState();

        event.keysChanged.forEach((key) => {
          const remoteFolder = this.yFolders.get(key);
          const localFolder = folderStore.folders.find((f) => f.id === key);

          if (!remoteFolder) {
            if (localFolder) {
              folderStore.deleteFolder(key);
            }
          } else {
            if (!localFolder) {
              folderStore.createFolder(remoteFolder);
            } else {
              folderStore.updateFolder(key, remoteFolder);
            }
          }
        });
      });

      // 3. Listen to Zustand changes and propagate to CRDT Map
      this.unsubscribeNotes = useNoteStore.subscribe((state) => {
        if (!this.yNotes) return;
        this.isUpdatingLocal = true;
        this.ydoc.transact(() => {
          state.notes.forEach((note) => {
            const current = this.yNotes.get(note.id);
            if (!current || JSON.stringify(current) !== JSON.stringify(note)) {
              this.yNotes.set(note.id, note);
            }
          });
          
          // Clean up entries that were deleted locally
          for (const key of this.yNotes.keys()) {
            if (!state.notes.some((n) => n.id === key)) {
              this.yNotes.delete(key);
            }
          }
        });
        this.isUpdatingLocal = false;
      });

      this.unsubscribeFolders = useFolderStore.subscribe((state) => {
        if (!this.yFolders) return;
        this.isUpdatingLocal = true;
        this.ydoc.transact(() => {
          state.folders.forEach((folder) => {
            const current = this.yFolders.get(folder.id);
            if (!current || JSON.stringify(current) !== JSON.stringify(folder)) {
              this.yFolders.set(folder.id, folder);
            }
          });

          for (const key of this.yFolders.keys()) {
            if (!state.folders.some((f) => f.id === key)) {
              this.yFolders.delete(key);
            }
          }
        });
        this.isUpdatingLocal = false;
      });

    } catch (err) {
      console.error('Failed to initialize CRDT sync engine:', err);
    }
  }

  disconnect() {
    if (this.unsubscribeNotes) {
      this.unsubscribeNotes();
      this.unsubscribeNotes = null;
    }
    if (this.unsubscribeFolders) {
      this.unsubscribeFolders();
      this.unsubscribeFolders = null;
    }
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
    this.ydoc = null;
    this.yNotes = null;
    this.yFolders = null;
  }
}

export const syncEngineInstance = new CollaborativeSyncEngine();
