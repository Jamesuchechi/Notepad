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

// Helper to recursively traverse and resolve the nested DirectoryHandle path for a folder ID
async function resolveDirectoryPath(dirHandle, folderId, folders, create = true) {
  if (!folderId) return dirHandle;
  const path = [];
  let currentId = folderId;
  while (currentId) {
    const folder = folders.find((f) => f.id === currentId);
    if (!folder) break;
    path.unshift(sanitizeName(folder.name));
    currentId = folder.parentId;
  }

  let currentDir = dirHandle;
  for (const segment of path) {
    currentDir = await currentDir.getDirectoryHandle(segment, { create });
  }
  return currentDir;
}

// Scan a directory recursively and parse all supported files
export async function scanLocalDirectory(dirHandle, foldersMap = new Map()) {
  const notes = [];
  const folders = [];
  const SUPPORTED_EXTENSIONS = ['md', 'txt', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'json', 'py', 'yml', 'yaml', 'toml', 'ini'];

  async function scan(handle, parentFolderId = null, currentPath = '') {
    for await (const entry of handle.values()) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      
      if (entry.kind === 'file') {
        const ext = entry.name.split('.').pop()?.toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          const file = await entry.getFile();
          const text = await file.text();
          let parsedNote;
          if (ext === 'md') {
            parsedNote = parseMarkdownFile(text, entry.name, entry.name);
            parsedNote.folderId = parentFolderId;
          } else {
            parsedNote = {
              id: entryPath, // Temporarily use path, useSyncStore will match it
              title: entry.name,
              content: text,
              folderId: parentFolderId,
              tags: [],
              pinned: false,
              trashed: false,
              updatedAt: new Date(file.lastModified).toISOString(),
              createdAt: new Date(file.lastModified).toISOString(),
            };
          }
          parsedNote.relativePath = entryPath;
          notes.push(parsedNote);
        }
      } else if (entry.kind === 'directory') {
        const folderName = entry.name;
        const folderKey = currentPath ? `${currentPath}/${folderName}` : folderName;
        let folderId = foldersMap.get(folderKey);
        
        if (!folderId) {
          folderId = crypto.randomUUID ? crypto.randomUUID() : 'f-' + Math.random().toString(36).substr(2, 9);
          foldersMap.set(folderKey, folderId);
        }
        
        folders.push({
          id: folderId,
          name: folderName,
          color: '#6366f1',
          parentId: parentFolderId,
        });

        await scan(entry, folderId, entryPath);
      }
    }
  }

  await scan(dirHandle, null, '');
  return { notes, folders };
}

// Write note file to disk
export async function writeNoteToDirectory(dirHandle, note, folders = []) {
  try {
    const currentDir = await resolveDirectoryPath(dirHandle, note.folderId, folders, true);

    const ext = note.title?.split('.').pop()?.toLowerCase();
    const isMd = ext === 'md';
    
    let fileName = sanitizeName(note.title || 'Untitled');
    if (!note.title?.includes('.')) {
      fileName += '.txt';
    }

    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    
    if (isMd) {
      const folder = folders.find((f) => f.id === note.folderId);
      const markdown = serializeNoteToMarkdown(note, folder?.name || '');
      await writable.write(markdown);
    } else {
      await writable.write(note.content || '');
    }
    await writable.close();
  } catch (err) {
    console.error('Failed to write note to local disk:', err);
  }
}

// Delete note file from disk
export async function deleteNoteFromDirectory(dirHandle, note, folders = []) {
  try {
    const currentDir = await resolveDirectoryPath(dirHandle, note.folderId, folders, false);
    
    let fileName = sanitizeName(note.title || 'Untitled');
    if (!note.title?.includes('.')) {
      fileName += '.txt';
    }
    
    await currentDir.removeEntry(fileName);
  } catch (err) {
    console.warn('Failed to delete note from local disk (might already be deleted or folder missing):', err);
  }
}

// Create directory on disk recursively
export async function createFolderInDirectory(dirHandle, folderId, folders = []) {
  try {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    await resolveDirectoryPath(dirHandle, folderId, folders, true);
  } catch (err) {
    console.error('Failed to create folder on local disk:', err);
  }
}

// Delete directory recursively from disk
export async function deleteFolderFromDirectory(dirHandle, folderId, folders = []) {
  try {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    
    const parentDir = await resolveDirectoryPath(dirHandle, folder.parentId, folders, false);
    const segment = sanitizeName(folder.name);
    
    await parentDir.removeEntry(segment, { recursive: true });
  } catch (err) {
    console.warn('Failed to delete folder from local disk:', err);
  }
}

// Rename directory on disk
export async function renameFolderOnDirectory(dirHandle, folderId, newName, folders = []) {
  try {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    
    const currentDir = await resolveDirectoryPath(dirHandle, folderId, folders, false);
    if (currentDir.move) {
      await currentDir.move(sanitizeName(newName));
    }
  } catch (err) {
    console.warn('Failed to rename folder on local disk:', err);
  }
}
