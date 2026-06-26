import { useEffect } from 'react';

export default function useKeyboardShortcuts({
  onCreateNote,
  onOpenTemplate,
  onOpenSearch,
  onForceSave,
  onTogglePreview,
  onToggleFocusMode,
  onOpenSettings,
  onOpenShortcuts,
  onCloseModals,
  onOpenAIChat,
  onOpenVoiceNote,
}) {
  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');

    const handleKeyDown = (event) => {
      const mod = isMac ? event.metaKey : event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === 'n') {
        event.preventDefault();
        if (onOpenTemplate) {
          onOpenTemplate();
        } else {
          onCreateNote?.();
        }
        return;
      }

      if (mod && key === 'f' && !event.shiftKey) {
        event.preventDefault();
        onOpenSearch?.();
        return;
      }

      if (mod && key === 's') {
        event.preventDefault();
        onForceSave?.();
        return;
      }

      if (mod && key === 'e') {
        event.preventDefault();
        onTogglePreview?.();
        return;
      }

      if (mod && event.shiftKey && key === 'f') {
        event.preventDefault();
        onToggleFocusMode?.();
        return;
      }

      if (mod && event.shiftKey && key === 'a') {
        event.preventDefault();
        onOpenAIChat?.();
        return;
      }

      if (mod && event.shiftKey && key === 'v') {
        event.preventDefault();
        onOpenVoiceNote?.();
        return;
      }

      if (key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        onOpenShortcuts?.();
        return;
      }

      if (mod && key === ',') {
        event.preventDefault();
        onOpenSettings?.();
        return;
      }

      if (key === 'escape') {
        onCloseModals?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onCreateNote,
    onOpenTemplate,
    onOpenSearch,
    onForceSave,
    onTogglePreview,
    onToggleFocusMode,
    onOpenSettings,
    onOpenShortcuts,
    onCloseModals,
    onOpenAIChat,
    onOpenVoiceNote,
  ]);
}
