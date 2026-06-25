import TurndownService from 'turndown';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

// ─── Single-note exports ────────────────────────────────────────

export function exportAsMarkdown(note) {
  const title = note.title?.trim() || 'Untitled';
  const body = td.turndown(note.content || '');
  const md = `# ${title}\n\n${body}`;
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${sanitize(title)}.md`);
}

export function exportAsTxt(note) {
  const title = note.title?.trim() || 'Untitled';
  const body = stripHtml(note.content || '');
  const txt = `${title}\n${'='.repeat(title.length)}\n\n${body}`;
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${sanitize(title)}.txt`);
}

export function exportAsHtml(note) {
  const title = note.title?.trim() || 'Untitled';
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 24px; line-height: 1.7; color: #1e293b; }
    h1 { font-size: 2rem; margin-bottom: 0.25em; }
    .meta { color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; }
    pre { background: #f1f5f9; padding: 16px; border-radius: 8px; overflow: auto; }
    code { background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: 0.9em; }
    blockquote { border-left: 3px solid #6366f1; margin: 0; padding-left: 16px; color: #64748b; }
  </style>
</head>
<body>
  <h1>${escHtml(title)}</h1>
  <p class="meta">Last edited ${new Date(note.updatedAt).toLocaleString()}</p>
  ${note.content || ''}
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  saveAs(blob, `${sanitize(title)}.html`);
}

// ─── Bulk export ────────────────────────────────────────────────

export async function exportAllAsZip(notes) {
  const zip = new JSZip();
  const folder = zip.folder('brain-notes');

  notes.forEach((note) => {
    const title = note.title?.trim() || 'Untitled';
    const body = td.turndown(note.content || '');
    const md = `# ${title}\n\n${body}`;
    folder.file(`${sanitize(title)}.md`, md);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `brain-notes-${datestamp()}.zip`);
}

export async function exportAllData(notes, settings) {
  const zip = new JSZip();
  const folder = zip.folder('brain-notes');

  notes.forEach((note) => {
    const title = note.title?.trim() || 'Untitled';
    const body = td.turndown(note.content || '');
    const md = `# ${title}\n\n${body}`;
    folder.file(`${sanitize(title)}.md`, md);
  });

  zip.file('settings.json', JSON.stringify(settings, null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `brain-data-${datestamp()}.zip`);
}

// ─── Helpers ────────────────────────────────────────────────────

function stripHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sanitize(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80);
}

function datestamp() {
  return new Date().toISOString().slice(0, 10);
}