import { useRef, useState, useEffect } from 'react';
import { Download, FileText, FileCode, File, Archive, ChevronDown } from 'lucide-react';
import { exportAsMarkdown, exportAsTxt, exportAsHtml, exportAllAsZip, printNoteAsPdf } from '@/utils/export';
import { useNoteStore } from '@/store/useNoteStore';

export default function ExportMenu({ note }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const notes = useNoteStore((s) => s.notes);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const actions = [
    {
      label: 'Export as Markdown',
      icon: FileCode,
      action: () => { exportAsMarkdown(note); setOpen(false); },
    },
    {
      label: 'Export as Plain Text',
      icon: FileText,
      action: () => { exportAsTxt(note); setOpen(false); },
    },
    {
      label: 'Export as HTML',
      icon: File,
      action: () => { exportAsHtml(note); setOpen(false); },
    },
    {
      label: 'Export as PDF / Print',
      icon: FileCode,
      action: () => { printNoteAsPdf(note); setOpen(false); },
    },
    { divider: true },
    {
      label: `Export all ${notes.length} notes as ZIP`,
      icon: Archive,
      action: () => { exportAllAsZip(notes); setOpen(false); },
    },
  ];

  return (
    <div className="export-menu" ref={menuRef}>
      <button
        type="button"
        className="export-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        title="Export note"
        aria-label="Export note"
        aria-expanded={open}
      >
        <Download size={15} />
        <span>Export</span>
        <ChevronDown size={13} className={`export-menu__chevron ${open ? 'export-menu__chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="export-menu__dropdown" role="menu">
          {actions.map((item, i) =>
            item.divider ? (
              <div key={i} className="export-menu__divider" aria-hidden="true" />
            ) : (
              <button
                key={item.label}
                type="button"
                className="export-menu__action"
                role="menuitem"
                onClick={item.action}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            )
          )}
        </div>
      )}

      <style>{`
        .export-menu {
          position: relative;
        }

        .export-menu__trigger {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-family: inherit;
          cursor: pointer;
          transition: background var(--t-fast), color var(--t-fast);
        }

        .export-menu__trigger:hover {
          background: var(--bg-muted);
          color: var(--text-primary);
        }

        .export-menu__chevron {
          transition: transform var(--t-fast);
          opacity: 0.6;
        }

        .export-menu__chevron--open {
          transform: rotate(180deg);
        }

        .export-menu__dropdown {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          min-width: 230px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
          padding: 6px;
          z-index: 50;
          animation: fade-in 0.1s ease;
        }

        .export-menu__action {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 9px 12px;
          border: none;
          background: none;
          color: var(--text-primary);
          font-size: 0.8125rem;
          font-family: inherit;
          text-align: left;
          border-radius: 10px;
          cursor: pointer;
          transition: background var(--t-fast);
        }

        .export-menu__action:hover {
          background: var(--bg-hover);
        }

        .export-menu__divider {
          height: 1px;
          background: var(--border);
          margin: 4px 6px;
        }
      `}</style>
    </div>
  );
}