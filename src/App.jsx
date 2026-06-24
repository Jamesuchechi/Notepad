import { useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNoteStore } from '@/store/useNoteStore';

export default function App() {
  const theme = useSettingsStore((s) => s.theme);
  const lastOpenedNoteId = useSettingsStore((s) => s.lastOpenedNoteId);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const notes = useNoteStore((s) => s.notes);

  /* Apply / remove the Tailwind `dark` class on <html> */
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // 'system' — follow OS preference
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = (e) =>
        e.matches ? root.classList.add('dark') : root.classList.remove('dark');
      apply(mq);
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  useEffect(() => {
    if (!activeNoteId && lastOpenedNoteId && notes.length > 0) {
      const lastNoteExists = notes.some((note) => note.id === lastOpenedNoteId);
      if (lastNoteExists) {
        useNoteStore.getState().setActiveNote(lastOpenedNoteId);
      }
    }
  }, [activeNoteId, lastOpenedNoteId, notes]);

  return <AppShell />;
}