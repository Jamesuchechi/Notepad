import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // ── State ────────────────────────────────────────────────
      theme: 'system',         // 'system' | 'light' | 'dark'
      fontSize: 'md',          // 'sm' | 'md' | 'lg'
      lastOpenedNoteId: null,  // uuid | null

      // ── Actions ──────────────────────────────────────────────
      toggleTheme: () => {
        const cycle = { system: 'light', light: 'dark', dark: 'system' };
        set({ theme: cycle[get().theme] });
      },

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLastOpenedNoteId: (id) => set({ lastOpenedNoteId: id }),
    }),
    { name: 'brain_settings' }
  )
);