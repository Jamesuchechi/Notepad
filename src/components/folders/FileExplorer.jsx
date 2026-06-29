import { useState, useEffect, useRef } from 'react';
import { 
  Folder, FolderOpen, ChevronRight, ChevronDown, 
  FileText, FileCode, FileJson, FilePlus, FolderPlus, 
  Edit3, Trash2, Star, Plus, FolderKanban, RotateCcw, 
  File, Terminal
} from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useFolderStore, isFolderTrashed, isNoteTrashed } from '@/store/useFolderStore';
import { useToastStore } from '@/store/useToastStore';

export default function FileExplorer() {
  const folders = useFolderStore((s) => s.folders);
  const createFolder = useFolderStore((s) => s.createFolder);
  const renameFolder = useFolderStore((s) => s.renameFolder);
  const deleteFolder = useFolderStore((s) => s.deleteFolder);

  const notes = useNoteStore((s) => s.notes);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const createNote = useNoteStore((s) => s.createNote);
  const updateNote = useNoteStore((s) => s.updateNote);

  // Expanded folders state (persisted)
  const [expandedFolders, setExpandedFolders] = useState(() => {
    try {
      const saved = localStorage.getItem('explorer_expanded_folders');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleFolder = (id) => {
    setExpandedFolders((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      localStorage.setItem('explorer_expanded_folders', JSON.stringify(updated));
      return updated;
    });
  };

  // Inline inputs state
  const [inlineInput, setInlineInput] = useState({
    visible: false,
    parentId: null, // parent folder ID (null for root)
    type: 'file', // 'file' or 'folder'
  });
  const [inlineValue, setInlineValue] = useState('');
  const inputRef = useRef(null);

  // Renaming state
  const [renamingNode, setRenamingNode] = useState({
    id: null, // node ID
    type: 'folder', // 'folder' or 'file'
  });
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef(null);

  // Focus inline input on render
  useEffect(() => {
    if (inlineInput.visible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [inlineInput]);

  useEffect(() => {
    if (renamingNode.id && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingNode]);

  // Tree building logic
  const buildTree = () => {
    const folderMap = {};
    const rootNodes = [];

    // Initialize folders in map
    folders.forEach((f) => {
      if (isFolderTrashed(f, folders)) return;
      folderMap[f.id] = {
        ...f,
        type: 'folder',
        children: [],
      };
    });

    // Populate folder parent-child relationships
    folders.forEach((f) => {
      if (isFolderTrashed(f, folders)) return;
      const node = folderMap[f.id];
      if (f.parentId) {
        const parent = folderMap[f.parentId];
        if (parent) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Add notes to folders or root
    notes.forEach((note) => {
      if (isNoteTrashed(note, folders)) return;

      const fileNode = {
        ...note,
        type: 'file',
      };

      if (note.folderId && folderMap[note.folderId]) {
        folderMap[note.folderId].children.push(fileNode);
      } else {
        rootNodes.push(fileNode);
      }
    });

    // Sort folders first, then files alphabetically
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return (a.name || a.title || '').localeCompare(b.name || b.title || '');
      });
      nodes.forEach((n) => {
        if (n.children) sortNodes(n.children);
      });
      return nodes;
    };

    return sortNodes(rootNodes);
  };

  const buildTrashTree = () => {
    const folderMap = {};
    const allFolders = [];
    const trashRootNodes = [];

    // Initialize all folders in map
    folders.forEach((f) => {
      folderMap[f.id] = {
        ...f,
        type: 'folder',
        children: [],
      };
      allFolders.push(folderMap[f.id]);
    });

    // Populate parent-child relationships for all folders
    allFolders.forEach((node) => {
      if (node.parentId) {
        const parent = folderMap[node.parentId];
        if (parent) {
          parent.children.push(node);
        }
      }
    });

    // Add all notes to folders or as root nodes
    notes.forEach((note) => {
      const fileNode = {
        ...note,
        type: 'file',
      };

      if (note.folderId && folderMap[note.folderId]) {
        if (note.trashed && !isFolderTrashed(folders.find((f) => f.id === note.folderId), folders)) {
          trashRootNodes.push(fileNode);
        } else {
          folderMap[note.folderId].children.push(fileNode);
        }
      } else {
        if (note.trashed) {
          trashRootNodes.push(fileNode);
        }
      }
    });

    // Now, find all folders that are top-level trashed
    folders.forEach((f) => {
      const node = folderMap[f.id];
      const trashed = isFolderTrashed(f, folders);
      if (trashed) {
        const hasTrashedParent = f.parentId && isFolderTrashed(folders.find((p) => p.id === f.parentId), folders);
        if (!hasTrashedParent) {
          trashRootNodes.push(node);
        }
      }
    });

    // Sort folders first, then files alphabetically
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return (a.name || a.title || '').localeCompare(b.name || b.title || '');
      });
      nodes.forEach((n) => {
        if (n.children) sortNodes(n.children);
      });
      return nodes;
    };

    return sortNodes(trashRootNodes);
  };

  const tree = buildTree();
  const trashTree = buildTrashTree();

  // File type icon mapper
  const getFileIcon = (title) => {
    const ext = title?.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'md':
        return <FileText size={15} style={{ color: '#34d399' }} />; // Green for Markdown
      case 'js':
      case 'jsx':
        return <FileCode size={15} style={{ color: '#facc15' }} />; // Yellow for JS
      case 'ts':
      case 'tsx':
        return <FileCode size={15} style={{ color: '#60a5fa' }} />; // Blue for TS
      case 'css':
        return <FileCode size={15} style={{ color: '#c084fc' }} />; // Purple for CSS
      case 'json':
        return <FileJson size={15} style={{ color: '#fb923c' }} />; // Orange for JSON
      case 'py':
        return <Terminal size={15} style={{ color: '#38bdf8' }} />; // Sky for Python
      case 'yml':
      case 'yaml':
      case 'toml':
      case 'ini':
        return <FileText size={15} style={{ color: '#a78bfa' }} />; // Lavender for config
      default:
        return <File size={15} style={{ color: '#94a3b8' }} />; // Grey default
    }
  };

  // Inline submit action
  const handleInlineSubmit = (e) => {
    e.preventDefault();
    const name = inlineValue.trim();
    if (!name) {
      setInlineInput({ visible: false, parentId: null, type: 'file' });
      return;
    }

    if (inlineInput.type === 'folder') {
      const folder = createFolder(name, inlineInput.parentId);
      if (inlineInput.parentId) {
        // Automatically expand the parent folder
        setExpandedFolders((prev) => ({ ...prev, [inlineInput.parentId]: true }));
      }
      useToastStore.getState().showToast(`Created folder "${name}"`, 'success');
    } else {
      const note = createNote({
        title: name,
        folderId: inlineInput.parentId,
      });
      if (inlineInput.parentId) {
        setExpandedFolders((prev) => ({ ...prev, [inlineInput.parentId]: true }));
      }
      useToastStore.getState().showToast(`Created file "${note.title}"`, 'success');
    }

    setInlineValue('');
    setInlineInput({ visible: false, parentId: null, type: 'file' });
  };

  // Inline rename submit
  const handleRenameSubmit = (e) => {
    e.preventDefault();
    const name = renameValue.trim();
    if (!name) {
      setRenamingNode({ id: null, type: 'folder' });
      return;
    }

    if (renamingNode.type === 'folder') {
      renameFolder(renamingNode.id, name);
      useToastStore.getState().showToast(`Renamed folder to "${name}"`, 'success');
    } else {
      updateNote(renamingNode.id, { title: name });
      useToastStore.getState().showToast(`Renamed file to "${name}"`, 'success');
    }

    setRenamingNode({ id: null, type: 'folder' });
    setRenameValue('');
  };

  // Render Explorer Nodes Recursively
  const renderNode = (node, depth = 0) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders[node.id];
    const isSelected = !isFolder && node.id === activeNoteId;

    const handleNodeClick = (e) => {
      e.stopPropagation();
      if (isFolder) {
        toggleFolder(node.id);
      } else {
        setActiveNote(node.id);
      }
    };

    const triggerNewFile = (e) => {
      e.stopPropagation();
      setInlineInput({ visible: true, parentId: node.id, type: 'file' });
      setInlineValue('Untitled.txt');
    };

    const triggerNewFolder = (e) => {
      e.stopPropagation();
      setInlineInput({ visible: true, parentId: node.id, type: 'folder' });
      setInlineValue('New Folder');
    };

    const triggerRename = (e) => {
      e.stopPropagation();
      setRenamingNode({ id: node.id, type: node.type });
      setRenameValue(isFolder ? node.name : node.title);
    };

    const handleDelete = (e) => {
      e.stopPropagation();
      if (isFolder) {
        deleteFolder(node.id);
        useToastStore.getState().showToast(`Moved folder "${node.name}" to Trash.`, {
          actionLabel: 'Undo',
          onAction: () => {
            useFolderStore.getState().restoreFolder(node.id);
          },
        });
      } else {
        // Move note to trash
        updateNote(node.id, { trashed: true, trashedAt: new Date().toISOString() });
        useToastStore.getState().showToast(`Moved "${node.title}" to Trash.`, {
          actionLabel: 'Undo',
          onAction: () => {
            useNoteStore.getState().restoreNote(note.id);
          },
        });
      }
    };

    const togglePin = (e) => {
      e.stopPropagation();
      updateNote(node.id, { pinned: !node.pinned });
    };

    const isNodeRenaming = renamingNode.id === node.id;

    return (
      <div key={node.id} className="explorer-node-wrapper">
        <div 
          className={`explorer-node ${isSelected ? 'explorer-node--selected' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          onClick={handleNodeClick}
        >
          <span className="explorer-node__chevron">
            {isFolder && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
          </span>

          <span className="explorer-node__icon">
            {isFolder ? (
              isExpanded ? (
                <FolderOpen size={15} style={{ color: node.color || '#6366f1' }} />
              ) : (
                <Folder size={15} style={{ color: node.color || '#6366f1' }} />
              )
            ) : (
              getFileIcon(node.title)
            )}
          </span>

          {isNodeRenaming ? (
            <form onSubmit={handleRenameSubmit} className="explorer-node__rename-form" onClick={e => e.stopPropagation()}>
              <input
                ref={renameInputRef}
                className="explorer-node__rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => setRenamingNode({ id: null, type: 'folder' })}
                onKeyDown={(e) => e.key === 'Escape' && setRenamingNode({ id: null, type: 'folder' })}
              />
            </form>
          ) : (
            <span className="explorer-node__label">
              {isFolder ? node.name : node.title}
            </span>
          )}

          {/* Quick Action Buttons on Hover */}
          {!isNodeRenaming && (
            <div className="explorer-node__actions">
              {isFolder && (
                <>
                  <button type="button" onClick={triggerNewFile} title="New File" className="explorer-node__action-btn">
                    <FilePlus size={13} />
                  </button>
                  <button type="button" onClick={triggerNewFolder} title="New Folder" className="explorer-node__action-btn">
                    <FolderPlus size={13} />
                  </button>
                </>
              )}
              {!isFolder && (
                <button type="button" onClick={togglePin} title={node.pinned ? "Unpin Note" : "Pin Note"} className={`explorer-node__action-btn ${node.pinned ? 'explorer-node__action-btn--pinned' : ''}`}>
                  <Star size={13} fill={node.pinned ? "var(--brand)" : "none"} />
                </button>
              )}
              <button type="button" onClick={triggerRename} title="Rename" className="explorer-node__action-btn">
                <Edit3 size={13} />
              </button>
              <button type="button" onClick={handleDelete} title="Delete" className="explorer-node__action-btn explorer-node__action-btn--delete">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Render child tree node recursively */}
        {isFolder && isExpanded && (
          <div className="explorer-node__children">
            {/* Inline input if currently adding item to this folder */}
            {inlineInput.visible && inlineInput.parentId === node.id && renderInlineInputForm()}
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderTrashNode = (node, depth = 1) => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders[node.id];
    const isSelected = !isFolder && node.id === activeNoteId;

    const handleNodeClick = (e) => {
      e.stopPropagation();
      if (isFolder) {
        toggleFolder(node.id);
      } else {
        setActiveNote(node.id);
      }
    };

    const handleRestore = (e) => {
      e.stopPropagation();
      if (isFolder) {
        useFolderStore.getState().restoreFolder(node.id);
        useToastStore.getState().showToast(`Restored folder "${node.name}"`, 'success');
      } else {
        useNoteStore.getState().restoreNote(node.id);
        useToastStore.getState().showToast(`Restored file "${node.title}"`, 'success');
      }
    };

    const handleDeletePermanently = (e) => {
      e.stopPropagation();
      if (isFolder) {
        if (window.confirm(`Permanently delete folder "${node.name}" and all its contents? This cannot be undone.`)) {
          useFolderStore.getState().deleteFolderPermanently(node.id);
          useToastStore.getState().showToast(`Permanently deleted folder "${node.name}"`);
        }
      } else {
        if (window.confirm(`Permanently delete file "${node.title}"? This cannot be undone.`)) {
          useNoteStore.getState().deleteNotePermanently(node.id);
          useToastStore.getState().showToast(`Permanently deleted file "${node.title}"`);
        }
      }
    };

    return (
      <div key={node.id} className="explorer-node-wrapper">
        <div 
          className={`explorer-node explorer-node--trashed ${isSelected ? 'explorer-node--selected' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          onClick={handleNodeClick}
        >
          <span className="explorer-node__chevron">
            {isFolder && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
          </span>

          <span className="explorer-node__icon">
            {isFolder ? (
              isExpanded ? (
                <FolderOpen size={15} style={{ color: 'var(--text-tertiary)' }} />
              ) : (
                <Folder size={15} style={{ color: 'var(--text-tertiary)' }} />
              )
            ) : (
              getFileIcon(node.title)
            )}
          </span>

          <span className="explorer-node__label">
            {isFolder ? node.name : node.title}
          </span>

          <div className="explorer-node__actions">
            <button 
              type="button" 
              onClick={handleRestore} 
              title="Restore" 
              className="explorer-node__action-btn"
            >
              <RotateCcw size={13} />
            </button>
            <button 
              type="button" 
              onClick={handleDeletePermanently} 
              title="Delete Permanently" 
              className="explorer-node__action-btn explorer-node__action-btn--delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {isFolder && isExpanded && (
          <div className="explorer-node__children">
            {node.children.map((child) => renderTrashNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderInlineInputForm = () => {
    return (
      <form 
        onSubmit={handleInlineSubmit} 
        className="explorer-node__inline-form"
        style={{ paddingLeft: `${(inlineInput.parentId ? folders.find(f => f.id === inlineInput.parentId) ? 1 : 0 : 0) * 14 + 20}px` }}
        onClick={e => e.stopPropagation()}
      >
        <span className="explorer-node__icon">
          {inlineInput.type === 'folder' ? <Folder size={15} /> : <FileText size={15} />}
        </span>
        <input
          ref={inputRef}
          className="explorer-node__inline-input"
          value={inlineValue}
          onChange={(e) => setInlineValue(e.target.value)}
          onBlur={() => setInlineInput({ visible: false, parentId: null, type: 'file' })}
          onKeyDown={(e) => e.key === 'Escape' && setInlineInput({ visible: false, parentId: null, type: 'file' })}
        />
      </form>
    );
  };

  return (
    <div className="file-explorer">
      {/* File Explorer Header with Global Actions */}
      <div className="file-explorer__header">
        <span className="file-explorer__title">Workspace Explorer</span>
        <div className="file-explorer__actions">
          <button 
            type="button" 
            onClick={() => {
              setInlineInput({ visible: true, parentId: null, type: 'file' });
              setInlineValue('Untitled.txt');
            }} 
            title="New File at Root"
          >
            <FilePlus size={14} />
          </button>
          <button 
            type="button" 
            onClick={() => {
              setInlineInput({ visible: true, parentId: null, type: 'folder' });
              setInlineValue('New Folder');
            }} 
            title="New Folder at Root"
          >
            <FolderPlus size={14} />
          </button>
          <button 
            type="button" 
            onClick={() => setExpandedFolders({})} 
            title="Collapse All Folders"
          >
            <FolderKanban size={14} />
          </button>
        </div>
      </div>

      {/* Main File Tree Area */}
      <div className="file-explorer__tree" role="tree">
        {inlineInput.visible && inlineInput.parentId === null && renderInlineInputForm()}
        {tree.map((node) => renderNode(node, 0))}
        
        {tree.length === 0 && !inlineInput.visible && (
          <div className="file-explorer__empty">
            No files or folders yet.
          </div>
        )}
      </div>

      {/* Special Collapsible Trash Section */}
      <div className="file-explorer__trash-section">
        <div 
          className="file-explorer__trash-header"
          onClick={() => toggleFolder('trash')}
        >
          <span className="explorer-node__chevron">
            {expandedFolders['trash'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <Trash2 size={15} style={{ color: 'var(--danger, #ef4444)' }} />
          <span>Trash ({trashTree.length})</span>
          {trashTree.length > 0 && (
            <button 
              type="button" 
              className="file-explorer__empty-trash-btn"
              title="Empty Trash Permanently"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to permanently delete all items in the Trash? This cannot be undone.')) {
                  const trashedFolders = useFolderStore.getState().folders.filter(f => f.trashed);
                  trashedFolders.forEach(f => useFolderStore.getState().deleteFolderPermanently(f.id));

                  const trashedNotes = useNoteStore.getState().notes.filter(n => n.trashed);
                  trashedNotes.forEach(n => useNoteStore.getState().deleteNotePermanently(n.id));

                  useToastStore.getState().showToast('Trash emptied permanently', 'success');
                }
              }}
            >
              Empty
            </button>
          )}
        </div>

        {expandedFolders['trash'] && (
          <div className="file-explorer__trash-list">
            {trashTree.map((node) => renderTrashNode(node, 1))}
            {trashTree.length === 0 && (
              <div className="file-explorer__trash-empty">Trash is empty</div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .file-explorer {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
          min-height: 200px;
        }

        .file-explorer__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border);
          user-select: none;
          background: rgba(0, 0, 0, 0.05);
        }

        .file-explorer__title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-tertiary);
        }

        .file-explorer__actions {
          display: flex;
          gap: 6px;
        }

        .file-explorer__actions button {
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          border-radius: 4px;
          transition: background var(--t-fast), color var(--t-fast);
        }

        .file-explorer__actions button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .file-explorer__tree {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }

        .file-explorer__empty {
          padding: 16px;
          text-align: center;
          color: var(--text-tertiary);
          font-size: 0.8rem;
        }

        .explorer-node-wrapper {
          display: flex;
          flex-direction: column;
        }

        .explorer-node {
          display: flex;
          align-items: center;
          height: 28px;
          padding-right: 12px;
          cursor: pointer;
          user-select: none;
          border-radius: 6px;
          margin: 0 4px;
          transition: background var(--t-fast);
        }

        .explorer-node:hover {
          background: var(--bg-hover);
        }

        .explorer-node--selected {
          background: var(--bg-hover) !important;
          border-left: 2px solid var(--brand);
          border-radius: 2px 6px 6px 2px;
          font-weight: 500;
        }

        .explorer-node__chevron {
          width: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-tertiary);
        }

        .explorer-node__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 6px;
        }

        .explorer-node__label {
          flex: 1;
          font-size: 0.8125rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .explorer-node--selected .explorer-node__label {
          color: var(--text-primary);
        }

        .explorer-node__actions {
          display: none;
          gap: 4px;
          align-items: center;
        }

        .explorer-node:hover .explorer-node__actions {
          display: flex;
        }

        .explorer-node__action-btn {
          border: none;
          background: transparent;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 2px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
        }

        .explorer-node__action-btn:hover {
          background: var(--bg-subtle);
          color: var(--text-primary);
        }

        .explorer-node__action-btn--pinned {
          color: var(--brand) !important;
        }

        .explorer-node__action-btn--delete:hover {
          color: var(--danger, #ef4444);
          background: rgba(239, 68, 68, 0.1);
        }

        .explorer-node__inline-form,
        .explorer-node__rename-form {
          flex: 1;
          display: flex;
          align-items: center;
        }

        .explorer-node__inline-input,
        .explorer-node__rename-input {
          flex: 1;
          border: 1px solid var(--brand);
          border-radius: 4px;
          background: var(--bg-base);
          color: var(--text-primary);
          font-size: 0.8125rem;
          padding: 1px 4px;
          outline: none;
          font-family: inherit;
        }

        .file-explorer__trash-section {
          border-top: 1px solid var(--border);
          margin-top: auto;
          background: rgba(239, 68, 68, 0.02);
        }

        .file-explorer__trash-header {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          border: none;
          background: transparent;
          padding: 8px 12px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          text-align: left;
        }

        .file-explorer__trash-header:hover {
          background: var(--bg-hover);
        }

        .file-explorer__empty-trash-btn {
          margin-left: auto;
          font-size: 0.7rem;
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.05);
          color: var(--danger, #ef4444);
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
        }

        .file-explorer__empty-trash-btn:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .file-explorer__trash-list {
          max-height: 180px;
          overflow-y: auto;
          padding: 4px 0;
          border-top: 1px dashed var(--border);
        }

        .explorer-node--trashed {
          opacity: 0.7;
        }

        .file-explorer__trash-empty {
          padding: 8px 24px;
          font-size: 0.75rem;
          color: var(--text-tertiary);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
