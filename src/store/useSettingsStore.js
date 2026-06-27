import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeLocalStorage } from '@/utils/storage';

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // ── State ────────────────────────────────────────────────
      theme: 'system',         // 'system' | 'light' | 'dark'
      fontSize: 'md',          // 'sm' | 'md' | 'lg'
      lastOpenedNoteId: null,  // uuid | null
      aiEnabled: true,         // global AI switch
      aiFeatures: {            // per-feature flags
        actionMenu: true,
        summarize: true,
        search: true,
        journalPrompt: true,
        autoTag: true,
        relatedNotes: true,
        chat: true,
        voice: true,
        weeklyDigest: true,
      },
      vaultPasswordHash: null,
      vaultLocked: false,

      // ── Actions ──────────────────────────────────────────────
      toggleTheme: () => {
        const cycle = { system: 'light', light: 'dark', dark: 'system' };
        set({ theme: cycle[get().theme] });
      },

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLastOpenedNoteId: (id) => set({ lastOpenedNoteId: id }),
      setAiEnabled: (aiEnabled) => set({ aiEnabled }),
      toggleAiFeature: (feature) =>
        set((state) => ({
          aiFeatures: {
            ...state.aiFeatures,
            [feature]: !state.aiFeatures[feature],
          },
        })),

      setVaultPassword: async (password) => {
        if (!password) {
          set({ vaultPasswordHash: null, vaultLocked: false });
          return;
        }
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        set({ vaultPasswordHash: hashHex, vaultLocked: false });
      },

      checkVaultPassword: async (password) => {
        const hash = get().vaultPasswordHash;
        if (!hash) return true;
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        return hashHex === hash;
      },

      lockVault: () => {
        if (get().vaultPasswordHash) {
          set({ vaultLocked: true });
        }
      },

      unlockVault: async (password) => {
        const correct = await get().checkVaultPassword(password);
        if (correct) {
          set({ vaultLocked: false });
          return true;
        }
        return false;
      },
    }),
    {
      name: 'brain_settings',
      storage: safeLocalStorage,
    }
  )
);