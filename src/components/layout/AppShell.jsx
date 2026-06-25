import { useState } from 'react';
import Sidebar from './Sidebar';
import EditorPane from './EditorPane';
import SearchModal from '../search/SearchModal';
import SettingsPanel from './SettingsPanel';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import TemplateModal from './TemplateModal';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { useNoteStore } from '@/store/useNoteStore';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [forceSaveSignal, setForceSaveSignal] = useState(0);

  const createNote = useNoteStore((s) => s.createNote);

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);
  const openSearch = () => setSearchOpen(true);
  const closeSearch = () => setSearchOpen(false);
  const openSettings = () => setSettingsOpen(true);
  const closeSettings = () => setSettingsOpen(false);
  const openShortcuts = () => setShortcutsOpen(true);
  const closeShortcuts = () => setShortcutsOpen(false);
  const openTemplate = () => setTemplateOpen(true);
  const closeTemplate = () => setTemplateOpen(false);

  const toggleFocusMode = () => {
    setFocusMode((current) => !current);
    if (sidebarOpen) setSidebarOpen(false);
  };

  const togglePreviewMode = () => setPreviewMode((current) => !current);
  const forceSave = () => setForceSaveSignal((current) => current + 1);
  const closeModals = () => {
    if (focusMode) setFocusMode(false);
    setSearchOpen(false);
    setSettingsOpen(false);
    setShortcutsOpen(false);
    setTemplateOpen(false);
    setSidebarOpen(false);
  };

  useKeyboardShortcuts({
    onCreateNote: createNote,
    onOpenTemplate: openTemplate,
    onOpenSearch: openSearch,
    onForceSave: forceSave,
    onTogglePreview: togglePreviewMode,
    onToggleFocusMode: toggleFocusMode,
    onOpenSettings: openSettings,
    onOpenShortcuts: openShortcuts,
    onCloseModals: closeModals,
  });

  return (
    <div className={`app-shell ${focusMode ? 'app-shell--focus' : ''}`}>
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          aria-hidden="true"
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`app-sidebar ${sidebarOpen ? 'app-sidebar--open' : ''}`}>
        <Sidebar
          onClose={closeSidebar}
          onOpenSearch={openSearch}
          onOpenSettings={openSettings}
          onOpenShortcuts={openShortcuts}
          onOpenTemplate={openTemplate}
        />
      </aside>

      {/* ── Main editor area ── */}
      <main className={`app-main ${focusMode ? 'app-main--focus' : ''}`}>
        <EditorPane
          onOpenSidebar={openSidebar}
          previewMode={previewMode}
          forceSaveSignal={forceSaveSignal}
          focusMode={focusMode}
          onTogglePreview={togglePreviewMode}
          onToggleFocusMode={toggleFocusMode}
        />
      </main>

      <SearchModal open={searchOpen} onClose={closeSearch} />
      <SettingsPanel open={settingsOpen} onClose={closeSettings} />
      <TemplateModal open={templateOpen} onClose={closeTemplate} />
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={closeShortcuts} />

      {/* ── Scoped styles ─────────────────────────────────────── */}
      <style>{`
        .app-shell {
          display: flex;
          height: 100%;
          width: 100%;
          overflow: hidden;
          background-color: var(--bg-base);
          color: var(--text-primary);
        }

        /* ── Sidebar (desktop: always visible) ── */
        .app-sidebar {
          flex-shrink: 0;
          width: var(--sidebar-width);
          height: 100%;
          background-color: var(--sidebar-bg);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: transform var(--t-slow);
          z-index: 40;
        }

        /* ── Main pane ── */
        .app-main {
          flex: 1;
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ── Responsive — narrow screens ── */
        @media (max-width: 640px) {
          .app-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100%;
            transform: translateX(-100%);
          }

          .app-sidebar--open {
            transform: translateX(0);
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
          }
        }

        .app-shell--focus .app-sidebar {
          transform: translateX(-100%);
          pointer-events: none;
        }

        .app-main {
          transition: padding 0.3s ease, align-items 0.3s ease;
        }

        .app-main--focus {
          align-items: center;
          justify-content: flex-start;
          padding: 32px 24px;
        }
      `}</style>
    </div>
  );
}