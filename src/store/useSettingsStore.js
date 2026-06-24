import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Settings store — persisted to localStorage under 'brain_settings'.
 * Phase 2 uses `theme` + `toggleTheme`.
 * Phase 3 will add fontSize, lastOpenedNoteId, etc.
 */
export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // ── State ────────────────────────────────────────────────
      theme: 'system',         // 'system' | 'light' | 'dark'
      fontSize: 'md',          // 'sm' | 'md' | 'lg'  (used from Phase 9)
      lastOpenedNoteId: null,  // uuid | null          (used from Phase 3)

      // ── Actions ──────────────────────────────────────────────
      /**
       * Cycle through: system → light → dark → system
       */
      toggleTheme() {
        const cycle = { system: 'light', light: 'dark', dark: 'system' };
        set({ theme: cycle[get().theme] });
      },

      setTheme(theme) {
        set({ theme });
      },

      setFontSize(fontSize) {
        set({ fontSize });
      },

      setLastOpenedNoteId(id) {
        set({ lastOpenedNoteId: id });
      },
    }),
    {
      name: 'brain_settings',
    }
  )
);