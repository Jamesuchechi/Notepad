# 🧠 Brain

> A premium, minimal notepad for people who think a lot.

Brain is a local-first, distraction-free note-taking app built with React and Vite. Your notes live in your browser — no accounts, no sync, no noise. Just you and your thoughts. Export them whenever you want.

---

## ✨ Features

- **Rich text editing** — Bold, italic, headings, lists, and more via Tiptap
- **Folders & tags** — Organise notes your way
- **Full-text search** — Find anything across all your notes instantly
- **Pin notes** — Keep important notes at the top
- **Writing stats** — Live word count, character count, and reading time
- **Dark & light mode** — Follows your system or set it manually
- **Keyboard shortcuts** — Stay in flow without touching the mouse
- **Export notes** — Download as `.md`, `.txt`, or `.html`
- **Bulk export** — Export all notes as a `.zip` archive
- **Import notes** — Drag and drop `.md` or `.txt` files
- **Markdown preview** — Toggle between edit and rendered view
- **Templates** — Quick-start with journal, meeting notes, or todo layouts
- **Focus mode** — Hide everything. Just write.
- **Local-first** — Everything stored in `localStorage`. Nothing leaves your device.

---

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite |
| Editor | Tiptap (ProseMirror-based) |
| State | Zustand |
| Styling | Tailwind CSS |
| Export | `jszip` + `file-saver` |
| Icons | Lucide React |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Install & run

```bash
# Clone the repo
git clone https://github.com/your-username/brain.git
cd brain

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
brain/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/         # AppShell, Sidebar, EditorPane
│   │   ├── editor/         # Tiptap editor, toolbar, stats bar
│   │   ├── notes/          # NoteList, NoteItem, NoteCard
│   │   ├── folders/        # FolderList, FolderItem
│   │   ├── search/         # SearchModal, SearchResult
│   │   └── ui/             # Buttons, modals, tooltips, badges
│   ├── store/
│   │   ├── useNoteStore.js   # Notes CRUD + localStorage sync
│   │   ├── useFolderStore.js
│   │   └── useSettingsStore.js
│   ├── hooks/
│   │   ├── useSearch.js
│   │   ├── useExport.js
│   │   └── useKeyboardShortcuts.js
│   ├── utils/
│   │   ├── export.js       # md / txt / html / zip export logic
│   │   ├── storage.js      # localStorage read/write helpers
│   │   └── templates.js    # Note templates
│   ├── styles/
│   │   └── index.css
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + N` | New note |
| `Cmd/Ctrl + F` | Open search |
| `Cmd/Ctrl + S` | Force save |
| `Cmd/Ctrl + E` | Toggle markdown preview |
| `Cmd/Ctrl + Shift + F` | Toggle focus mode |
| `Cmd/Ctrl + ,` | Open settings |

---

## 📦 localStorage Schema

```json
{
  "brain_notes": [
    {
      "id": "uuid",
      "title": "Note title",
      "content": "<html tiptap content>",
      "folderId": "uuid | null",
      "tags": ["tag1", "tag2"],
      "pinned": false,
      "createdAt": "ISO string",
      "updatedAt": "ISO string"
    }
  ],
  "brain_folders": [
    {
      "id": "uuid",
      "name": "Work",
      "color": "#6366f1"
    }
  ],
  "brain_settings": {
    "theme": "system | light | dark",
    "lastOpenedNoteId": "uuid | null",
    "fontSize": "sm | md | lg"
  }
}
```

---

## 🗺 Roadmap

See [TODO.md](./TODO.md) for the full phased build plan.

---

## 📄 License

MIT