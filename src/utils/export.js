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

// ─── JSON Backup Export ─────────────────────────────────────────

export function exportAsJsonBackup(notes, folders, settings) {
  const backup = {
    version: '1.0.0',
    notes,
    folders,
    settings,
    timestamp: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  saveAs(blob, `brain-backup-${datestamp()}.json`);
}

// ─── PDF Export / Printing ──────────────────────────────────────

export function printNoteAsPdf(note) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export as PDF.');
    return;
  }
  const title = note.title?.trim() || 'Untitled';
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            max-width: 800px;
            margin: 40px auto;
            padding: 0 20px;
          }
          h1 {
            font-size: 2.2rem;
            margin-bottom: 8px;
            border-bottom: 2px solid #eaeaea;
            padding-bottom: 8px;
          }
          .meta {
            color: #666;
            font-size: 0.85rem;
            margin-bottom: 24px;
          }
          pre {
            background: #f4f4f4;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
          }
          code {
            font-family: "Courier New", Courier, monospace;
            background: #f4f4f4;
            padding: 2px 4px;
            border-radius: 3px;
          }
          blockquote {
            border-left: 4px solid #6366f1;
            margin: 0;
            padding-left: 16px;
            color: #555;
            font-style: italic;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          ul, ol {
            padding-left: 20px;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Created: ${new Date(note.createdAt).toLocaleDateString()} &middot; Edited: ${new Date(note.updatedAt).toLocaleDateString()}</div>
        <div>${note.content || ''}</div>
        <script>
          window.onload = function() {
            window.print();
            // Optional: close window after print dialog is closed
            setTimeout(() => { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
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