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
    }),
    {
      name: 'brain_settings',
      storage: safeLocalStorage,
    }
  )
);