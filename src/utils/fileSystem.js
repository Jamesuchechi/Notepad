// Sanitizes folder/filenames for OS compatibility
export function sanitizeName(name) {
  if (!name) return 'Untitled';
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

// Convert frontmatter and markdown body back to Note format
export function parseMarkdownFile(content, filename, fileId) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  let metadata = {};
  let body = content;

  if (match) {
    const yaml = match[1];
    body = match[2].trim();
    yaml.split('\n').forEach((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim();
        let value = line.slice(colonIdx + 1).trim();
        // Remove leading/trailing quotes if they exist
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        try {
          if (value === 'true') metadata[key] = true;
          else if (value === 'false') metadata[key] = false;
          else if (value === 'null') metadata[key] = null;
          else if (value.startsWith('[') && value.endsWith(']')) {
            metadata[key] = JSON.parse(value);
          } else {
            metadata[key] = value;
          }
        } catch {
          metadata[key] = value;
        }
      }
    });
  }

  return {
    id: metadata.id || fileId,
    title: metadata.title || filename.replace(/\.md$/, ''),
    content: body,
    folderId: metadata.folderId || null,
    tags: Array.isArray(metadata.tags) ? metadata.tags : (metadata.tags ? metadata.tags.split(',') : []),
    pinned: !!metadata.pinned,
    trashed: !!metadata.trashed,
    updatedAt: metadata.updatedAt || new Date().toISOString(),
    createdAt: metadata.createdAt || new Date().toISOString(),
  };
}

// Convert Note to Markdown with metadata in Frontmatter
export function serializeNoteToMarkdown(note, folderName = '') {
  const frontmatter = [
    '---',
    `id: "${note.id}"`,
    `title: "${(note.title || 'Untitled').replace(/"/g, '\\"')}"`,
    `folderId: ${note.folderId ? `"${note.folderId}"` : 'null'}`,
    `folderName: ${folderName ? `"${folderName.replace(/"/g, '\\"')}"` : 'null'}`,
    `tags: ${JSON.stringify(note.tags || [])}`,
    `pinned: ${!!note.pinned}`,
    `trashed: ${!!note.trashed}`,
    `updatedAt: "${note.updatedAt || new Date().toISOString()}"`,
    `createdAt: "${note.createdAt || new Date().toISOString()}"`,
    '---',
  ].join('\n');

  return `${frontmatter}\n\n${note.content || ''}`;
}

// Check and request readwrite permission to directory handle
export async function verifyPermission(fileHandle, readWrite = true) {
  const options = {};
  if (readWrite) {
    options.mode = 'readwrite';
  }
  if ((await fileHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  if ((await fileHandle.requestPermission(options)) === 'granted') {
    return true;
  }
  return false;
}

// Scan a directory recursively and parse all .md files
export async function scanLocalDirectory(dirHandle, foldersMap = new Map()) {
  const notes = [];
  const folders = [];

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file' && entry.name.endsWith('.md')) {
      const file = await entry.getFile();
      const text = await file.text();
      const fileId = entry.name.replace(/\.md$/, '') + '-' + file.lastModified;
      notes.push(parseMarkdownFile(text, entry.name, fileId));
    } else if (entry.kind === 'directory') {
      const folderName = entry.name;
      let folderId = foldersMap.get(folderName);
      if (!folderId) {
        folderId = crypto.randomUUID ? crypto.randomUUID() : 'f-' + Math.random().toString(36).substr(2, 9);
        folders.push({
          id: folderId,
          name: folderName,
          color: '#6366f1',
        });
      }
      
      // Scan nested notes inside the folder
      for await (const subEntry of entry.values()) {
        if (subEntry.kind === 'file' && subEntry.name.endsWith('.md')) {
          const file = await subEntry.getFile();
          const text = await file.text();
          const note = parseMarkdownFile(text, subEntry.name, file.name);
          note.folderId = folderId; // Link note to the containing folder
          notes.push(note);
        }
      }
    }
  }

  return { notes, folders };
}

// Write note file to disk
export async function writeNoteToDirectory(dirHandle, note, folders = []) {
  try {
    let currentDir = dirHandle;
    const folder = folders.find((f) => f.id === note.folderId);
    if (folder) {
      const folderName = sanitizeName(folder.name);
      currentDir = await dirHandle.getDirectoryHandle(folderName, { create: true });
    }

    const fileName = `${sanitizeName(note.title || 'Untitled')}.md`;
    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    
    const markdown = serializeNoteToMarkdown(note, folder?.name || '');
    await writable.write(markdown);
    await writable.close();
  } catch (err) {
    console.error('Failed to write note to local disk:', err);
  }
}

// Delete note file from disk
export async function deleteNoteFromDirectory(dirHandle, note, folders = []) {
  try {
    let currentDir = dirHandle;
    const folder = folders.find((f) => f.id === note.folderId);
    if (folder) {
      const folderName = sanitizeName(folder.name);
      currentDir = await dirHandle.getDirectoryHandle(folderName, { create: false });
    }
    const fileName = `${sanitizeName(note.title || 'Untitled')}.md`;
    await currentDir.removeEntry(fileName);
  } catch (err) {
    console.warn('Failed to delete note from local disk (might already be deleted or folder missing):', err);
  }
}
