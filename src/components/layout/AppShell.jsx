import { useState } from 'react';
import Sidebar from './Sidebar';
import EditorPane from './EditorPane';
import SearchModal from '../search/SearchModal';
import SearchShortcut from './SearchShortcut';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);
  const openSearch = () => setSearchOpen(true);
  const closeSearch = () => setSearchOpen(false);

  return (
    <div className="app-shell">
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
        <Sidebar onClose={closeSidebar} onOpenSearch={openSearch} />
      </aside>

      {/* ── Main editor area ── */}
      <main className="app-main">
        <EditorPane onOpenSidebar={openSidebar} />
      </main>

      <SearchModal open={searchOpen} onClose={closeSearch} />
      <SearchShortcut onOpen={openSearch} />

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

          .sidebar-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.4);
            z-index: 30;
            animation: fade-in 0.15s ease;
          }
        }
      `}</style>
    </div>
  );
}