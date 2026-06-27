import { useState } from 'react';
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function VaultLockScreen() {
  const vaultLocked = useSettingsStore((s) => s.vaultLocked);
  const unlockVault = useSettingsStore((s) => s.unlockVault);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!vaultLocked) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(false);

    // Artificial tiny delay for realistic cryptographic verification feel
    setTimeout(async () => {
      const success = await unlockVault(password);
      setLoading(false);
      if (success) {
        setPassword('');
      } else {
        setError(true);
      }
    }, 4000);
  };

  return (
    <div className="vault-lock-screen">
      <div className="vault-lock-card">
        <div className="vault-lock-icon-wrap">
          {error ? (
            <AlertCircle size={32} className="lock-icon lock-icon--error" />
          ) : (
            <Lock size={32} className="lock-icon" />
          )}
        </div>

        <h1 className="vault-lock-title">Vault Locked</h1>
        <p className="vault-lock-desc">
          This personal knowledge workspace is password protected. Enter your password to unlock.
        </p>

        <form onSubmit={handleSubmit} className="vault-lock-form">
          <input
            type="password"
            className={`vault-lock-input ${error ? 'vault-lock-input--error' : ''}`}
            placeholder="Enter password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            disabled={loading}
            autoFocus
          />

          <button type="submit" className="vault-lock-btn" disabled={loading}>
            {loading ? 'Decrypting...' : 'Unlock'}
          </button>
        </form>

        {error && <p className="vault-lock-error-msg">Incorrect password. Please try again.</p>}
      </div>

      <style>{`
        .vault-lock-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .vault-lock-card {
          width: min(420px, 100%);
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
          text-align: center;
          animation: lock-card-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .vault-lock-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 20px;
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          margin-bottom: 20px;
        }

        .lock-icon {
          color: var(--brand);
          transition: transform 0.2s ease;
        }

        .lock-icon--error {
          color: var(--danger, #ef4444);
          animation: lock-shake 0.4s ease;
        }

        .vault-lock-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }

        .vault-lock-desc {
          font-size: 0.8125rem;
          color: var(--text-tertiary);
          line-height: 1.5;
          margin: 0 0 24px 0;
        }

        .vault-lock-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .vault-lock-input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-primary);
          font-size: 0.95rem;
          text-align: center;
          transition: border-color 0.2s ease;
        }

        .vault-lock-input:focus {
          outline: none;
          border-color: var(--brand);
        }

        .vault-lock-input--error {
          border-color: var(--danger, #ef4444);
        }

        .vault-lock-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: var(--brand);
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          transition: filter 0.2s ease;
        }

        .vault-lock-btn:hover {
          filter: brightness(1.1);
        }

        .vault-lock-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .vault-lock-error-msg {
          font-size: 0.75rem;
          color: var(--danger, #ef4444);
          margin: 12px 0 0 0;
          animation: fade-in 0.2s ease;
        }

        @keyframes lock-card-pop {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes lock-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
