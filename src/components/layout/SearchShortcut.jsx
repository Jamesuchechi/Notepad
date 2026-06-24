import { useEffect } from 'react';

export default function SearchShortcut({ onOpen }) {
  useEffect(() => {
    const downHandler = (event) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? event.metaKey : event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        onOpen();
      }
    };

    window.addEventListener('keydown', downHandler);
    return () => window.removeEventListener('keydown', downHandler);
  }, [onOpen]);

  return null;
}
