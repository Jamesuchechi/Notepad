import { useToastStore } from '@/store/useToastStore';
import { X } from 'lucide-react';

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="live" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast-item">
          <span className="toast-item__message">{toast.message}</span>
          
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              className="toast-item__action-btn"
              onClick={() => {
                toast.onAction();
                removeToast(toast.id);
              }}
            >
              {toast.actionLabel}
            </button>
          )}

          <button
            type="button"
            className="toast-item__close-btn"
            onClick={() => removeToast(toast.id)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 1000;
          pointer-events: none;
          max-width: 380px;
          width: calc(100vw - 48px);
        }

        .toast-item {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: var(--bg-elevated, #1e293b);
          border: 1px solid var(--border, #334155);
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          color: var(--text-primary, #f8fafc);
          animation: toast-slide-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          font-size: 0.85rem;
        }

        .toast-item__message {
          flex: 1;
        }

        .toast-item__action-btn {
          border: none;
          background: none;
          color: var(--brand, #6366f1);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.85rem;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.15s ease;
        }

        .toast-item__action-btn:hover {
          background: var(--bg-hover);
        }

        .toast-item__close-btn {
          border: none;
          background: none;
          color: var(--text-tertiary, #94a3b8);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.15s ease, background 0.15s ease;
        }

        .toast-item__close-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        @keyframes toast-slide-in {
          from {
            transform: translateY(12px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
