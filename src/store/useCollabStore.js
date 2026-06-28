import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncEngineInstance } from '@/utils/syncEngine';
import { useToastStore } from './useToastStore';

export const useCollabStore = create(
  persist(
    (set, get) => ({
      enabled: false,
      roomId: '',
      signalingServer: 'wss://signaling.yjs.dev',

      toggleEnabled: async () => {
        const nextEnabled = !get().enabled;
        set({ enabled: nextEnabled });

        if (nextEnabled) {
          if (!get().roomId) {
            const randomId = crypto.randomUUID
              ? crypto.randomUUID()
              : 'collab-' + Math.random().toString(36).substr(2, 9);
            set({ roomId: randomId });
          }
          await get().connect();
        } else {
          get().disconnect();
        }
      },

      setRoomId: async (roomId) => {
        set({ roomId });
        if (get().enabled) {
          await get().connect();
        }
      },

      setSignalingServer: async (server) => {
        set({ signalingServer: server });
        if (get().enabled) {
          await get().connect();
        }
      },

      connect: async () => {
        const { enabled, roomId, signalingServer } = get();
        if (!enabled || !roomId) return;

        try {
          const servers = signalingServer ? [signalingServer.trim()] : ['wss://signaling.yjs.dev'];
          await syncEngineInstance.initialize(roomId, servers);
          useToastStore.getState().showToast('Connected to collaboration room!', 'success');
        } catch (err) {
          console.error(err);
          useToastStore.getState().showToast('Failed to connect to room', 'error');
        }
      },

      disconnect: () => {
        syncEngineInstance.disconnect();
        useToastStore.getState().showToast('Collaboration disconnected', 'info');
      },
    }),
    {
      name: 'brain_collab_settings',
    }
  )
);
