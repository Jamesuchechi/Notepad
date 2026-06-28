import { useEffect, useRef, useState, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useNoteStore } from '@/store/useNoteStore';
import { useFolderStore } from '@/store/useFolderStore';

export default function GraphModal({ open, onClose }) {
  const notes = useNoteStore((s) => s.notes);
  const folders = useFolderStore((s) => s.folders);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDraggingCanvas = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Physics simulation state stored in refs to avoid React re-render lag
  const stateRef = useRef({
    nodes: [],
    links: [],
    draggedNode: null,
    hoveredNode: null,
  });

  // Folder colors map
  const folderColors = useMemo(() => {
    const map = {};
    folders.forEach(f => {
      map[f.id] = f.color;
    });
    return map;
  }, [folders]);

  // Construct Nodes and Links
  useEffect(() => {
    if (!open) return;

    const filteredNotes = notes.filter((n) => !n.trashed);
    
    // Maintain positions of existing nodes if already simulated
    const prevNodesMap = new Map(stateRef.current.nodes.map(n => [n.id, n]));
    
    const nodes = filteredNotes.map((note, index) => {
      const prev = prevNodesMap.get(note.id);
      const angle = (index / filteredNotes.length) * Math.PI * 2;
      const radius = 250;
      return {
        id: note.id,
        title: note.title || 'Untitled',
        folderId: note.folderId,
        x: prev?.x ?? (window.innerWidth / 2 + Math.cos(angle) * radius),
        y: prev?.y ?? (window.innerHeight / 2 + Math.sin(angle) * radius),
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
        radius: note.pinned ? 8 : 6,
      };
    });

    const links = [];
    filteredNotes.forEach((note) => {
      filteredNotes.forEach((other) => {
        if (other.id === note.id) return;
        const content = note.content || '';
        const isLinked =
          content.includes(`note://${other.id}`) ||
          content.toLowerCase().includes(`[[${other.title?.toLowerCase()}]]`) ||
          content.includes(`note-new://${encodeURIComponent(other.title || '')}`);
        if (isLinked) {
          links.push({ source: note.id, target: other.id });
        }
      });
    });

    stateRef.current.nodes = nodes;
    stateRef.current.links = links;
  }, [notes, open]);

  // Physics & Animation Loop
  useEffect(() => {
    if (!open) return undefined;

    const runPhysics = () => {
      const { nodes, links, draggedNode } = stateRef.current;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const cx = width / 2;
      const cy = height / 2;

      // 1. Repulsion (nodes push each other away)
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = 180;
          if (dist < minDist) {
            const force = ((minDist - dist) ** 2) * 0.0018;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // 2. Attraction (links pull connected nodes)
      links.forEach((link) => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        if (!sourceNode || !targetNode) return;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const restLength = 120;
        const k = 0.04; // Link strength
        const force = (dist - restLength) * k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        sourceNode.vx += fx;
        sourceNode.vy += fy;
        targetNode.vx -= fx;
        targetNode.vy -= fy;
      });

      // 3. Gravity towards center & update positions
      nodes.forEach((node) => {
        if (node === draggedNode) return;

        // Pull to center slightly
        const dx = cx - node.x;
        const dy = cy - node.y;
        node.vx += dx * 0.0006;
        node.vy += dy * 0.0006;

        // Friction / Damping
        node.vx *= 0.82;
        node.vy *= 0.82;

        node.x += node.vx;
        node.y += node.vy;
      });
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Apply zoom & offset pan
      ctx.translate(rect.width / 2 + offset.x, rect.height / 2 + offset.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-rect.width / 2, -rect.height / 2);

      const { nodes, links, hoveredNode } = stateRef.current;

      // Draw Links
      ctx.lineWidth = 1;
      links.forEach((link) => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        if (!sourceNode || !targetNode) return;

        const isHighlighted = hoveredNode && (hoveredNode.id === link.source || hoveredNode.id === link.target);
        ctx.strokeStyle = isHighlighted ? 'var(--brand)' : 'var(--border)';
        ctx.lineWidth = isHighlighted ? 1.5 : 0.8;
        
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
      });

      // Draw Nodes
      nodes.forEach((node) => {
        const color = folderColors[node.folderId] || '#94a3b8';
        const isHovered = hoveredNode && hoveredNode.id === node.id;
        const matchesSearch = search.trim() && node.title.toLowerCase().includes(search.toLowerCase());

        // Draw shadow/glow on hover or search match
        if (isHovered || matchesSearch) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = isHovered ? 'rgba(99, 102, 241, 0.15)' : 'rgba(244, 63, 94, 0.15)';
          ctx.fill();
        }

        // Draw Node Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = matchesSearch ? '#f43f5e' : (isHovered ? 'var(--brand)' : color);
        ctx.fill();
        ctx.strokeStyle = 'var(--bg-base)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw Text Label
        ctx.fillStyle = matchesSearch ? 'var(--danger, #ef4444)' : 'var(--text-primary)';
        ctx.font = isHovered ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.title, node.x, node.y - node.radius - 6);
      });
    };

    const loop = () => {
      runPhysics();
      draw();
      requestRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [open, zoom, offset, search, folderColors]);

  if (!open) return null;

  // Event Handlers for Canvas Interaction
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Convert screen coordinates to canvas world coordinates
    const worldX = (clientX - rect.width / 2 - offset.x) / zoom + rect.width / 2;
    const worldY = (clientY - rect.height / 2 - offset.y) / zoom + rect.height / 2;

    const clickedNode = stateRef.current.nodes.find((node) => {
      const dx = node.x - worldX;
      const dy = node.y - worldY;
      return Math.sqrt(dx * dx + dy * dy) <= node.radius + 12;
    });

    if (clickedNode) {
      stateRef.current.draggedNode = clickedNode;
    } else {
      isDraggingCanvas.current = true;
      dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const worldX = (clientX - rect.width / 2 - offset.x) / zoom + rect.width / 2;
    const worldY = (clientY - rect.height / 2 - offset.y) / zoom + rect.height / 2;

    const { draggedNode } = stateRef.current;

    if (draggedNode) {
      draggedNode.x = worldX;
      draggedNode.y = worldY;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
    } else if (isDraggingCanvas.current) {
      setOffset({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    } else {
      // Hover detection
      const hovered = stateRef.current.nodes.find((node) => {
        const dx = node.x - worldX;
        const dy = node.y - worldY;
        return Math.sqrt(dx * dx + dy * dy) <= node.radius + 12;
      });
      stateRef.current.hoveredNode = hovered || null;
    }
  };

  const handleMouseUp = (e) => {
    const { draggedNode } = stateRef.current;
    if (draggedNode && !isDraggingCanvas.current) {
      // If we didn't drag the node far, consider it a click / navigation action
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const worldX = (clientX - rect.width / 2 - offset.x) / zoom + rect.width / 2;
      const worldY = (clientY - rect.height / 2 - offset.y) / zoom + rect.height / 2;

      const dx = draggedNode.x - worldX;
      const dy = draggedNode.y - worldY;
      if (Math.sqrt(dx * dx + dy * dy) < 5) {
        setActiveNote(draggedNode.id);
        onClose();
      }
    }
    stateRef.current.draggedNode = null;
    isDraggingCanvas.current = false;
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="graph-modal-backdrop" aria-modal="true" role="dialog">
      <div className="graph-modal-card">
        <header className="graph-modal-header">
          <div>
            <h2 className="graph-modal-title">Link Graph View</h2>
            <p className="graph-modal-desc">Visualize connections, backlinks, and wiki-links between notes.</p>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close graph"
            title="Close graph"
          >
            <X size={18} />
          </button>
        </header>

        <div className="graph-modal-toolbar">
          <input
            type="text"
            className="graph-modal-search"
            placeholder="Search notes in graph..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="graph-modal-controls">
            <button className="icon-btn" onClick={() => setZoom(z => Math.min(2.5, z + 0.15))} title="Zoom In">
              <ZoomIn size={15} />
            </button>
            <button className="icon-btn" onClick={() => setZoom(z => Math.max(0.4, z - 0.15))} title="Zoom Out">
              <ZoomOut size={15} />
            </button>
            <button className="icon-btn" onClick={resetView} title="Reset View">
              <Maximize2 size={15} />
            </button>
          </div>
        </div>

        <div className="graph-modal-canvas-wrap">
          <canvas
            ref={canvasRef}
            className="graph-modal-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>

      <style>{`
        .graph-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1500;
          padding: 24px;
        }

        .graph-modal-card {
          width: min(940px, 100%);
          height: min(720px, 100%);
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.22);
          overflow: hidden;
          animation: lock-card-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .graph-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-subtle);
        }

        .graph-modal-title {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }

        .graph-modal-desc {
          font-size: 0.78rem;
          color: var(--text-tertiary);
          margin: 4px 0 0 0;
        }

        .graph-modal-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          border-bottom: 1px solid var(--border);
          gap: 16px;
        }

        .graph-modal-search {
          max-width: 280px;
          width: 100%;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-primary);
          font-size: 0.82rem;
        }

        .graph-modal-search:focus {
          outline: none;
          border-color: var(--brand);
        }

        .graph-modal-controls {
          display: flex;
          gap: 8px;
        }

        .graph-modal-canvas-wrap {
          flex: 1;
          position: relative;
          background: var(--bg-subtle);
          overflow: hidden;
        }

        .graph-modal-canvas {
          display: block;
          width: 100%;
          height: 100%;
          cursor: grab;
        }

        .graph-modal-canvas:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  );
}
