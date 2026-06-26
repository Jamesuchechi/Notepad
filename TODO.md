# 🧠 Brain — Build TODO

Phased plan from project setup to a fully polished app. Work through each phase in order. Check off tasks as you go.

---

## Phase 1 — Project Setup

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

- [x] Install and configure Tiptap with `StarterKit`
- [x] Build `Editor` component wrapping `<EditorContent>`
- [x] Build `Toolbar` component
  - [x] Bold, italic, strikethrough
  - [x] Headings (H1, H2, H3)
  - [x] Bullet list, ordered list
  - [x] Blockquote
  - [x] Horizontal rule
  - [x] Undo / redo
- [x] Wire editor content to active note in store
- [x] Auto-save on every editor `onUpdate` event (debounce 500ms)
- [x] Auto-save note title from `<input>` at top of editor pane
- [x] Show "Saved" / "Saving…" indicator in footer

---

## Phase 6 — Folders & Tags

- [x] Build `FolderList` in sidebar above note list
  - [x] Show all folders with note count
  - [x] "All Notes" and "Pinned" as default smart folders at the top
  - [x] Click folder to filter note list
  - [x] `+` button to create new folder
- [x] Build `FolderItem` with right-click/`⋯` menu: rename, change colour, delete
- [x] Build `FolderModal` for create/rename
- [x] Build tag input in note metadata (below title)
  - [x] Add/remove tags inline
  - [x] Filter note list by tag

---

## Phase 7 — Search

- [x] Build `SearchModal` (triggered by `Cmd+F`)
  - [x] Full-screen overlay or command-palette style popover
  - [x] Input with instant filtering
  - [x] Search across note titles and content (strip HTML for content search)
  - [x] Show matched note title + content snippet
  - [x] Click result to open note and close modal
  - [x] Highlight matched term in results list
- [x] Add search icon button in sidebar header as alternative trigger

---

## Phase 8 — Export & Import

- [x] Write `export.js` utility
  - [x] `exportAsMarkdown(note)` — convert Tiptap HTML → markdown (use `turndown`)
  - [x] `exportAsTxt(note)` — strip HTML, plain text
  - [x] `exportAsHtml(note)` — full HTML file with inline styles
  - [x] `exportAllAsZip(notes)` — use `jszip` to bundle all notes as `.md` files
- [x] Add export button / dropdown in editor toolbar or `⋯` note menu
  - [x] Single note: choose format (md / txt / html)
  - [x] Bulk: "Export all" → zip download
- [x] Build import flow
  - [x] Drag-and-drop `.md` or `.txt` onto the app
  - [x] Or "Import" button in sidebar → file picker
  - [x] Parse file, create new note in store with file content

---

## Phase 9 — Writing Stats & Metadata

- [x] Build `StatsBar` in editor footer
  - [x] Live word count
  - [x] Character count
  - [x] Estimated reading time (`words / 200` minutes)
- [x] Show `createdAt` and `updatedAt` below note title in a muted style
- [x] Make note list sortable: by date edited, date created, title (A–Z)

---

## Phase 10 — Keyboard Shortcuts

- [x] Create `useKeyboardShortcuts` hook
- [x] Implement shortcuts:
  - [x] `Cmd/Ctrl + N` → create new note
  - [x] `Cmd/Ctrl + F` → open search modal
  - [x] `Cmd/Ctrl + S` → force save (flush debounce)
  - [x] `Cmd/Ctrl + E` → toggle markdown preview
  - [x] `Cmd/Ctrl + Shift + F` → toggle focus mode
  - [x] `Cmd/Ctrl + ,` → open settings panel
  - [x] `Escape` → close any open modal
- [x] Build keyboard shortcuts reference modal (`?` icon in sidebar)

---

## Phase 11 — Markdown Preview

- [x] Install `marked` or `react-markdown`
- [x] Add preview toggle button in toolbar
- [x] Build `MarkdownPreview` component — renders HTML from note content
- [x] Animate toggle transition between edit and preview

---

## Phase 12 — Focus Mode

- [x] Add focus mode toggle (button in toolbar or `Cmd+Shift+F`)
- [x] In focus mode: hide sidebar, hide toolbar, hide footer
- [x] Centred single-column layout with max-width ~680px
- [x] Subtle fade-in/out transition
- [x] Move mouse to top to temporarily reveal toolbar (optional)
- [x] `Escape` exits focus mode

---

## Phase 13 — Templates & Settings

- [x] Write `templates.js` with starter content for:
  - [x] Daily journal
  - [x] Meeting notes
  - [x] Todo list
  - [x] Blank (default)
- [x] Show template picker when creating a new note (or in a "New note" modal)
- [x] Build `SettingsPanel` (slide-in drawer or modal)
  - [x] Theme: system / light / dark
  - [x] Editor font size: small / medium / large
  - [x] "Clear all notes" with confirmation
  - [x] "Export all data" as zip
---

## Phase 14 — Polish & Code Blocks

- [x] Add Tiptap `CodeBlockLowlight` extension with `highlight.js`
- [x] Style code blocks to match app theme (dark in light mode, darker in dark mode)
- [x] Audit all components for consistent spacing, colour, border-radius, and input states
- [x] Add subtle animations: sidebar note hover, modal open/close, new note slide-in
- [x] Add empty state illustrations for: no notes, no search results, empty folder
- [x] Tune dark mode — check every surface, input, and modal in dark
- [x] Add `title` attribute tooltips on all icon buttons
- [x] Test and fix any localStorage edge cases (quota exceeded, corrupted data)
- [x] Review accessibility and keyboard interactions for template / settings flows

---

## Phase 15 — AI Layer

### Setup

- [x] Install Openai(openrouter) SDK: `npm install @openrouter-ai/sdk`
- [x] Create `src/utils/ai.js` — central wrapper around Openai(openrouter) API calls
  - [x] Streaming support via `stream()` helper
  - [x] Shared error handling and loading state management
  - [x] Request queue to prevent concurrent flood
  - [x] Graceful no-op fallback when API is unavailable
- [x] Add `VITE_OPENROUTER_API_KEY` to `.env` and document in `README.md`
- [x] Add AI toggles to `useSettingsStore`: `aiEnabled`, per-feature flags
- [x] Add _"AI"_ section to keyboard shortcuts modal (`Cmd+Shift+A` for Chat)

### Tier 1 — Core AI Features

- [x] Build `AIActionMenu` component
  - [x] Appears as a floating toolbar when the user selects text in the editor
  - [x] Actions: _Improve writing_, _Make shorter_, _Make longer_, _Fix grammar_, _Continue writing_, _Change tone_
  - [x] Streams AI response back into editor, replacing or appending to the selection
  - [x] Dismiss with `Escape` or clicking outside
- [x] Build `SummarizeButton` in editor toolbar
  - [x] Summarises full note content on click
  - [x] Inserts summary as a collapsible callout block at the top of the note
  - [x] Shows `AIStatusIndicator` while generating
- [x] Build `AISearch` — semantic search mode inside `SearchModal`
  - [x] Toggle between _Keyword_ and _AI_ search mode
  - [x] Sends query + all note titles/snippets to AI, returns ranked relevant notes
  - [x] Gracefully falls back to keyword search if API fails

### Tier 2 — Smart Features

- [x] Build `JournalPrompt`
  - [x] Shown when opening a blank journal template
  - [x] AI generates a reflective question based on the current date
  - [x] Dismiss or insert the prompt into the note as a starting line
- [x] Build `AutoTagSuggestion`
  - [x] Triggers after note content settles (debounce ~2s after last edit)
  - [x] AI suggests up to 5 relevant tags
  - [x] Shows non-intrusive chip suggestions below tag input: _"+ productivity + react + ideas"_
  - [x] One click to apply any or all suggestions
- [x] Build `RelatedNotes` panel
  - [x] Shown as a collapsible section at the bottom of `EditorPane`
  - [x] AI compares current note to others in store, surfaces top 3 related notes
  - [x] Click a related note to open it
  - [x] _"Link this note"_ button to insert an inline reference

### Tier 3 — Power Features

- [x] Build `ChatWithNotes` modal (`Cmd+Shift+A`)
  - [x] Full conversation UI — user asks questions, AI answers using the note library as context
  - [x] Sends all notes as context with each message (chunked if large)
  - [x] Cites which note(s) the answer came from, each citation clickable to open the note
  - [x] Conversation history preserved for the session
- [x] Build `VoiceToNote`
  - [x] Microphone button in sidebar or toolbar
  - [x] Records audio → transcribes via Web Speech API
  - [x] AI cleans up and formats the transcript, creates a new note automatically
- [x] Build `WeeklyDigest`
  - [x] Button in settings or sidebar footer: _"Generate this week's digest"_
  - [x] AI reads all notes edited in the last 7 days
  - [x] Produces a structured summary: themes, highlights, open threads
  - [x] Creates a new pinned note with the digest content

### Cross-cutting AI Concerns

- [x] Build `AIStatusIndicator` — subtle pulsing dot in footer shown whenever AI is working
- [x] Add per-feature AI toggles in `SettingsPanel` (disable individual features)
- [x] Ensure every AI feature has a graceful no-op fallback if the API is unavailable
- [x] Rate limit awareness — queue concurrent AI requests, show a friendly message if overwhelmed
- [x] Add AI usage section to keyboard shortcuts reference modal

---

## Phase 16 — Product polish, reliability, and AI enhancements

- [ ] Add archive / trash with undo support instead of hard delete
- [ ] Add note history / versioning and restore previous note versions
- [ ] Add multi-select bulk actions for notes: delete, move, tag, export
- [ ] Improve folder/tag filtering with UI controls in the sidebar
- [ ] Add note linking / backlinks support (wiki-style `[[note]]` links)
- [ ] Add date-based note groups in the sidebar: Today, This week, Older
- [ ] Move local persistence from `localStorage` to IndexedDB or `localForage` for larger note sets
- [ ] Add explicit backup / restore workflow for app state and settings
- [ ] Add JSON backup export / restore flow
- [ ] Add optional encrypted local vault or password-lock mode for privacy
- [ ] Improve AI availability UX when API key is missing or the service is unavailable
- [ ] Surface AI status clearly in the UI: busy, queued, failed, unavailable
- [ ] Add fallback AI-free workflows for search and note helpers
- [ ] Add more AI actions: note summarization, action item extraction, rewrite/expand/shorten note text
- [ ] Let users accept or reject AI-suggested tags, prompts, and related note recommendations
- [ ] Add PDF export support
- [ ] Support importing `.html` or editor JSON content in addition to `.md` / `.txt`
- [ ] Add copy-to-clipboard and share note text flow
- [ ] Add a command palette / quick add menu for fast actions
- [ ] Add daily note / calendar view support for journal workflows
- [ ] Add inline todo checkboxes or task metadata support
- [ ] Add custom editor themes and additional font options beyond size
- [ ] Improve mobile responsiveness for sidebar, modals, and keyboard shortcut help
- [ ] Add visible onboarding / first-run tour for templates and AI features
- [ ] Add a “last saved” / status indicator for saving state
- [ ] Add settings for autosave frequency, note sort order, and default new note folder
- [ ] Improve export/import interoperability with markdown-first workflows
- [ ] Add a simpler mobile UI or optimized mobile layout
- [ ] Consider a stronger product positioning as a “local-first personal knowledge workspace” rather than only a notepad---

## Phase 17 — Final QA & Deploy

- [ ] Test full flow end to end: create, edit, organise, search, export, import
- [ ] Test all AI features: action menu, summarise, search, journal prompt, auto-tag, related notes, chat, voice, digest
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
