# 🧠 Brain — Build TODO

Phased plan from project setup to a fully polished app. Work through each phase in order. Check off tasks as you go.

---

-## Phase 1 — Project Setup

- [x] Scaffold project with Vite: `npm create vite@latest brain -- --template react`
- [x] Install core dependencies
  ```bash
  npm install zustand @tiptap/react @tiptap/starter-kit tailwindcss lucide-react uuid jszip file-saver
  npm install -D @tailwindcss/typography autoprefixer postcss
  ```
 - [x] Configure Tailwind (`tailwind.config.js`, `postcss.config.js`, import in `index.css`)
 - [x] Set up folder structure (`components/`, `store/`, `hooks/`, `utils/`)
 - [x] Configure path aliases in `vite.config.js` (e.g. `@/` → `src/`)
 - [x] Add base global styles (font, reset, scrollbar, selection colour)
 - [x] Set up `eslint` + `prettier` for code consistency
 - [x] Confirm dev server runs cleanly at `localhost:5173`

---

## Phase 2 — Layout Shell

- [x] Build `AppShell` component — full-height two-panel layout (sidebar + editor pane)
- [x] Build `Sidebar` component
  - [x] App logo / name at the top (`🧠 Brain`)
  - [x] "New note" button
  - [x] Note list area (placeholder for now)
  - [x] Bottom: settings icon + theme toggle
- [x] Build `EditorPane` component
  - [x] Empty state when no note is selected ("Select or create a note")
  - [x] Note title input at the top
  - [x] Editor area (placeholder)
  - [x] Footer bar (word count placeholder)
- [x] Make layout responsive — sidebar collapses on narrow screens
- [x] Add dark/light mode toggle
  - [x] Detect system preference on load
  - [x] Persist preference to `localStorage`
  - [x] Apply `dark` class to `<html>` via Tailwind

---

## Phase 3 — State & localStorage

- [x] Create `useNoteStore` (Zustand)
  - [x] State: `notes[]`, `activeNoteId`
  - [x] Actions: `createNote`, `updateNote`, `deleteNote`, `setActiveNote`, `pinNote`
  - [x] Persist entire store to `localStorage` key `brain_notes` on every change (Zustand `persist` middleware)
- [x] Create `useFolderStore` (Zustand)
  - [x] State: `folders[]`
  - [x] Actions: `createFolder`, `renameFolder`, `deleteFolder`
  - [x] Persist to `brain_folders`
- [x] Create `useSettingsStore` (Zustand)
  - [x] State: `theme`, `lastOpenedNoteId`, `fontSize`
  - [x] Persist to `brain_settings`
- [x] Write `storage.js` utility helpers (safe get/set with JSON parse error handling)
- [x] Restore last opened note on app load

---

## Phase 4 — Note List

- [x] Build `NoteList` component in sidebar
  - [x] Render notes from store
  - [x] Show note title (fallback: "Untitled") and last edited timestamp
  - [x] Highlight active note
  - [x] Click to open a note
- [x] Build `NoteItem` component
  - [x] Pin icon (filled if pinned)
  - [x] Right-click or `⋯` menu: rename, pin, move to folder, delete
  - [x] Show folder colour dot if note is in a folder
- [x] Sort notes: pinned first, then by `updatedAt` descending
- [x] Show empty state when no notes exist

---

## Phase 5 — Tiptap Editor

- [ ] Install and configure Tiptap with `StarterKit`
- [ ] Build `Editor` component wrapping `<EditorContent>`
- [ ] Build `Toolbar` component
  - [ ] Bold, italic, strikethrough
  - [ ] Headings (H1, H2, H3)
  - [ ] Bullet list, ordered list
  - [ ] Blockquote
  - [ ] Horizontal rule
  - [ ] Undo / redo
- [ ] Wire editor content to active note in store
- [ ] Auto-save on every editor `onUpdate` event (debounce 500ms)
- [ ] Auto-save note title from `<input>` at top of editor pane
- [ ] Show "Saved" / "Saving…" indicator in footer

---

## Phase 6 — Folders & Tags

- [ ] Build `FolderList` in sidebar above note list
  - [ ] Show all folders with note count
  - [ ] "All Notes" and "Pinned" as default smart folders at the top
  - [ ] Click folder to filter note list
  - [ ] `+` button to create new folder
- [ ] Build `FolderItem` with right-click/`⋯` menu: rename, change colour, delete
- [ ] Build `FolderModal` for create/rename
- [ ] Build tag input in note metadata (below title)
  - [ ] Add/remove tags inline
  - [ ] Filter note list by tag

---

## Phase 7 — Search

- [ ] Build `SearchModal` (triggered by `Cmd+F`)
  - [ ] Full-screen overlay or command-palette style popover
  - [ ] Input with instant filtering
  - [ ] Search across note titles and content (strip HTML for content search)
  - [ ] Show matched note title + content snippet
  - [ ] Click result to open note and close modal
  - [ ] Highlight matched term in results list
- [ ] Add search icon button in sidebar header as alternative trigger

---

## Phase 8 — Export & Import

- [ ] Write `export.js` utility
  - [ ] `exportAsMarkdown(note)` — convert Tiptap HTML → markdown (use `turndown`)
  - [ ] `exportAsTxt(note)` — strip HTML, plain text
  - [ ] `exportAsHtml(note)` — full HTML file with inline styles
  - [ ] `exportAllAsZip(notes)` — use `jszip` to bundle all notes as `.md` files
- [ ] Add export button / dropdown in editor toolbar or `⋯` note menu
  - [ ] Single note: choose format (md / txt / html)
  - [ ] Bulk: "Export all" → zip download
- [ ] Build import flow
  - [ ] Drag-and-drop `.md` or `.txt` onto the app
  - [ ] Or "Import" button in sidebar → file picker
  - [ ] Parse file, create new note in store with file content

---

## Phase 9 — Writing Stats & Metadata

- [ ] Build `StatsBar` in editor footer
  - [ ] Live word count
  - [ ] Character count
  - [ ] Estimated reading time (`words / 200` minutes)
- [ ] Show `createdAt` and `updatedAt` below note title in a muted style
- [ ] Make note list sortable: by date edited, date created, title (A–Z)

---

## Phase 10 — Keyboard Shortcuts

- [ ] Create `useKeyboardShortcuts` hook
- [ ] Implement shortcuts:
  - [ ] `Cmd/Ctrl + N` → create new note
  - [ ] `Cmd/Ctrl + F` → open search modal
  - [ ] `Cmd/Ctrl + S` → force save (flush debounce)
  - [ ] `Cmd/Ctrl + E` → toggle markdown preview
  - [ ] `Cmd/Ctrl + Shift + F` → toggle focus mode
  - [ ] `Cmd/Ctrl + ,` → open settings panel
  - [ ] `Escape` → close any open modal
- [ ] Build keyboard shortcuts reference modal (`?` icon in sidebar)

---

## Phase 11 — Markdown Preview

- [ ] Install `marked` or `react-markdown`
- [ ] Add preview toggle button in toolbar
- [ ] Build `MarkdownPreview` component — renders HTML from note content
- [ ] Animate toggle transition between edit and preview

---

## Phase 12 — Focus Mode

- [ ] Add focus mode toggle (button in toolbar or `Cmd+Shift+F`)
- [ ] In focus mode: hide sidebar, hide toolbar, hide footer
- [ ] Centred single-column layout with max-width ~680px
- [ ] Subtle fade-in/out transition
- [ ] Move mouse to top to temporarily reveal toolbar (optional)
- [ ] `Escape` exits focus mode

---

## Phase 13 — Templates & Settings

- [ ] Write `templates.js` with starter content for:
  - [ ] Daily journal
  - [ ] Meeting notes
  - [ ] Todo list
  - [ ] Blank (default)
- [ ] Show template picker when creating a new note (or in a "New note" modal)
- [ ] Build `SettingsPanel` (slide-in drawer or modal)
  - [ ] Theme: system / light / dark
  - [ ] Editor font size: small / medium / large
  - [ ] "Clear all notes" with confirmation
  - [ ] "Export all data" as zip

---

## Phase 14 — Polish & Code Blocks

- [ ] Add Tiptap `CodeBlockLowlight` extension with `highlight.js`
- [ ] Style code blocks to match app theme (dark in light mode, darker in dark mode)
- [ ] Audit all components for consistent spacing, colour, and border-radius
- [ ] Add subtle animations: sidebar note hover, modal open/close, new note slide-in
- [ ] Add empty state illustrations for: no notes, no search results, empty folder
- [ ] Tune dark mode — check every surface, input, and modal in dark
- [ ] Add `title` attribute tooltips on all icon buttons
- [ ] Test and fix any localStorage edge cases (quota exceeded, corrupted data)

---

## Phase 15 — Final QA & Deploy

- [ ] Test full flow end to end: create, edit, organise, search, export, import
- [ ] Test in Chrome, Firefox, Safari
- [ ] Test on mobile screen widths (sidebar collapse behaviour)
- [ ] Lighthouse audit — aim for 95+ performance, 100 accessibility
- [ ] Write final `README.md` sections: screenshots, demo GIF
- [ ] Deploy to Vercel or Netlify (connect GitHub repo, auto-deploy on push)
- [ ] Add custom domain (optional)
- [ ] Tag `v1.0.0` release on GitHub

---

## Backlog (post v1)

- [ ] PWA support — installable, works offline
- [ ] Note version history (store last N snapshots in localStorage)
- [ ] Slash commands in editor (`/heading`, `/todo`, `/code`)
- [ ] Draggable note reordering in sidebar
- [ ] iCloud / Google Drive export integration
- [ ] Public share link (via a backend — out of scope for local-first v1)