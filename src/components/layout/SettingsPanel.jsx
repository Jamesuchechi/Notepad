import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useNoteStore } from '@/store/useNoteStore';
import { useFolderStore } from '@/store/useFolderStore';
import { exportAllData, exportAsJsonBackup } from '@/utils/export';
import { generateWeeklyDigest } from '@/utils/ai';
import { useSyncStore } from '@/store/useSyncStore';
import { useCollabStore } from '@/store/useCollabStore';




export default function SettingsPanel({ open, onClose }) {
  const syncStore = useSyncStore();
  const collabStore = useCollabStore();
  const theme = useSettingsStore((state) => state.theme);


  const fontSize = useSettingsStore((state) => state.fontSize);
  const aiEnabled = useSettingsStore((state) => state.aiEnabled);
  const aiFeatures = useSettingsStore((state) => state.aiFeatures);
  const toggleTheme = useSettingsStore((state) => state.toggleTheme);
  const setFontSize = useSettingsStore((state) => state.setFontSize);
  const setAiEnabled = useSettingsStore((state) => state.setAiEnabled);
  const toggleAiFeature = useSettingsStore((state) => state.toggleAiFeature);
  const clearAllNotes = useNoteStore((state) => state.clearAllNotes);
  const createNote = useNoteStore((state) => state.createNote);
  const notes = useNoteStore((state) => state.notes);
  const folders = useFolderStore((state) => state.folders);
  const [digestStatus, setDigestStatus] = useState('');


  const vaultPasswordHash = useSettingsStore((state) => state.vaultPasswordHash);
  const setVaultPassword = useSettingsStore((state) => state.setVaultPassword);
  const clearVaultPassword = useSettingsStore((state) => state.clearVaultPassword);
  const lockVault = useSettingsStore((state) => state.lockVault);

  const [vaultPasswordInput, setVaultPasswordInput] = useState('');
  const [vaultVerifyInput, setVaultVerifyInput] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [vaultSuccess, setVaultSuccess] = useState('');

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="settings-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <div className="settings-panel__header">
          <div>
            <h2>Settings</h2>
            <p>Customize theme and editor preferences.</p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close settings" title="Close settings">
            <X size={16} />
          </button>
        </div>

        <div className="settings-panel__group">
          <h3>Theme</h3>
          <p>Cycle through system, light, and dark themes.</p>
          <button type="button" className="settings-panel__control" onClick={toggleTheme}>
            Current: {theme}
          </button>
        </div>

        <div className="settings-panel__group">
          <h3>Editor font size</h3>
          <div className="settings-panel__options">
            {['sm', 'md', 'lg'].map((size) => (
              <button
                key={size}
                type="button"
                className={`settings-panel__option ${fontSize === size ? 'settings-panel__option--active' : ''}`}
                onClick={() => setFontSize(size)}
              >
                {size.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-panel__group">
          <h3>AI features</h3>
          <p>Enable AI and individual AI-powered workflows.</p>
          <div className="settings-panel__toggles">
            <label className="settings-panel__toggle">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(event) => setAiEnabled(event.target.checked)}
              />
              AI enabled
            </label>
            {Object.entries(aiFeatures).map(([feature, enabled]) => (
              <label key={feature} className="settings-panel__toggle">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleAiFeature(feature)}
                />
                {feature.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
              </label>
            ))}
          </div>
        </div>

        <div className="settings-panel__group">
          <h3>Weekly digest</h3>
          <p>Generate a new pinned note summarizing notes edited in the last 7 days.</p>
          <div className="settings-panel__actions">
            <button
              type="button"
              className="settings-panel__control"
              onClick={async () => {
                setDigestStatus('Generating weekly digest...');
                const recentNotes = notes.filter((note) => {
                  const updatedAt = new Date(note.updatedAt || note.createdAt);
                  const oneWeekAgo = new Date();
                  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                  return updatedAt >= oneWeekAgo;
                });
                if (recentNotes.length === 0) {
                  setDigestStatus('No notes edited in the last 7 days.');
                  return;
                }

                try {
                  const digest = await generateWeeklyDigest(recentNotes);
                  createNote({
                    title: `Weekly Digest — ${new Date().toLocaleDateString()}`,
                    content: `<h1>Weekly Digest</h1><p>${digest.replace(/\n\n+/g, '</p><p>')}</p>`,
                    pinned: true,
                  });
                  setDigestStatus('Weekly digest created and pinned.');
                } catch (error) {
                  console.error('Weekly digest generation failed:', error);
                  setDigestStatus('Weekly digest generation failed.');
                }
              }}
            >
              Generate this week's digest
            </button>
          </div>
          {digestStatus && <p className="settings-panel__status">{digestStatus}</p>}
        </div>

        <div className="settings-panel__group">
          <h3>Security (Encrypted Vault)</h3>
          <p>Protect your workspace with client-side SHA-256 password encryption.</p>
          
          {!vaultPasswordHash ? (
            <div className="settings-vault-setup">
              <input
                type="password"
                className="settings-panel__input"
                placeholder="New vault password"
                value={vaultPasswordInput}
                onChange={(e) => { setVaultPasswordInput(e.target.value); setVaultError(''); }}
              />
              <input
                type="password"
                className="settings-panel__input"
                placeholder="Confirm password"
                value={vaultVerifyInput}
                onChange={(e) => { setVaultVerifyInput(e.target.value); setVaultError(''); }}
              />
              <button
                type="button"
                className="settings-panel__control"
                onClick={async () => {
                  if (!vaultPasswordInput.trim()) {
                    setVaultError('Password cannot be empty.');
                    return;
                  }
                  if (vaultPasswordInput !== vaultVerifyInput) {
                    setVaultError('Passwords do not match.');
                    return;
                  }
                  await setVaultPassword(vaultPasswordInput);
                  setVaultPasswordInput('');
                  setVaultVerifyInput('');
                  setVaultSuccess('Vault password set successfully.');
                  setTimeout(() => setVaultSuccess(''), 3000);
                }}
              >
                Enable Vault Lock
              </button>
            </div>
          ) : (
            <div className="settings-vault-status">
              <div className="settings-vault-status__row">
                <span className="settings-vault-status__badge">Locked when app closes</span>
                <button
                  type="button"
                  className="settings-panel__control"
                  onClick={() => {
                    lockVault();
                    onClose();
                  }}
                >
                  Lock Vault Now
                </button>
              </div>
              
              <div className="settings-vault-clear" style={{ marginTop: '12px' }}>
                <input
                  type="password"
                  className="settings-panel__input"
                  placeholder="Enter password to disable vault"
                  value={vaultPasswordInput}
                  onChange={(e) => { setVaultPasswordInput(e.target.value); setVaultError(''); }}
                />
                <button
                  type="button"
                  className="settings-panel__control settings-panel__control--danger"
                  onClick={async () => {
                    const success = await clearVaultPassword(vaultPasswordInput);
                    if (success) {
                      setVaultPasswordInput('');
                      setVaultSuccess('Vault lock disabled.');
                      setTimeout(() => setVaultSuccess(''), 3000);
                    } else {
                      setVaultError('Incorrect password.');
                    }
                  }}
                >
                  Disable Vault Lock
                </button>
              </div>
            </div>
          )}
          {vaultError && <p className="settings-panel__error" style={{ color: 'var(--danger, #ef4444)', fontSize: '0.8rem', marginTop: '6px' }}>{vaultError}</p>}
          {vaultSuccess && <p className="settings-panel__success" style={{ color: 'var(--brand)', fontSize: '0.8rem', marginTop: '6px' }}>{vaultSuccess}</p>}
        </div>

        <div className="settings-panel__group">
          <h3>Data</h3>
          <p>Export your local notes and settings as a backup zip file.</p>
          <div className="settings-panel__actions">
            <button
              type="button"
              className="settings-panel__control"
              onClick={() => exportAllData(notes, { theme, fontSize })}
            >
              Export all data
            </button>
            <button
              type="button"
              className="settings-panel__control"
              onClick={() => {
                const settings = {
                  theme,
                  fontSize,
                  aiEnabled,
                  aiFeatures,
                };
                exportAsJsonBackup(notes, folders, settings);
              }}
            >
              Export JSON backup
            </button>

            <button
              type="button"
              className="settings-panel__control settings-panel__control--danger"
              onClick={() => {
                if (window.confirm('Clear all notes? This cannot be undone.')) {
                  clearAllNotes();
                  onClose();
                }
              }}
            >
              Clear all notes
            </button>
          </div>
        </div>

        <div className="settings-panel__group">
          <h3>Local Vault Sync (File System API)</h3>
          <p>Link your notes directly to a folder on your computer's file system for automatic local markdown backups.</p>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {syncStore.dirHandle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-subtle)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: syncStore.permissionGranted ? '#10b981' : '#f59e0b' }} />
                  Linked Directory: <strong>{syncStore.dirHandle.name}</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {!syncStore.permissionGranted && (
                    <button
                      type="button"
                      className="settings-panel__control"
                      style={{ background: 'var(--brand)', color: 'white' }}
                      onClick={() => syncStore.requestPermission()}
                    >
                      Authorize Read/Write
                    </button>
                  )}
                  {syncStore.permissionGranted && (
                    <button
                      type="button"
                      className="settings-panel__control"
                      onClick={() => syncStore.syncNotesFromDisk()}
                    >
                      Sync Now
                    </button>
                  )}
                  <button
                    type="button"
                    className="settings-panel__control settings-panel__control--danger"
                    onClick={() => syncStore.disconnectDirectory()}
                  >
                    Disconnect Folder
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="settings-panel__control"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => syncStore.selectDirectory()}
              >
                Connect Local Folder
              </button>
            )}
          </div>
        </div>

        <div className="settings-panel__group">
          <h3>P2P Collaboration</h3>
          <p>Share and sync your notes in real-time with other devices using peer-to-peer WebRTC encryption.</p>
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={collabStore.enabled}
                onChange={() => collabStore.toggleEnabled()}
                style={{ width: '16px', height: '16px', accentColor: 'var(--brand)' }}
              />
              Enable Real-time P2P Collaboration
            </label>

            {collabStore.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-subtle)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Collaboration Room ID (Secret Key):</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={collabStore.roomId}
                      onChange={(e) => collabStore.setRoomId(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                      placeholder="Enter room ID or generate one"
                    />
                    <button
                      type="button"
                      className="settings-panel__control"
                      onClick={() => {
                        const randomId = crypto.randomUUID ? crypto.randomUUID() : 'collab-' + Math.random().toString(36).substr(2, 9);
                        collabStore.setRoomId(randomId);
                      }}
                    >
                      Generate ID
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Signaling Server (Optional):</label>
                  <input
                    type="text"
                    value={collabStore.signalingServer}
                    onChange={(e) => collabStore.setSignalingServer(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                    placeholder="wss://signaling.yjs.dev"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .settings-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 60;
          padding: 20px;
        }

        .settings-panel {
          width: min(520px, 100%);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.2);
          animation: fade-in 0.15s ease;
        }

        .settings-panel__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
        }

        .settings-panel__header h2 {
          margin: 0;
          font-size: 1.05rem;
          color: var(--text-primary);
        }

        .settings-panel__header p {
          margin: 4px 0 0;
          color: var(--text-tertiary);
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .settings-panel__group {
          margin-bottom: 18px;
        }

        .settings-panel__toggles {
          display: grid;
          gap: 10px;
        }

        .settings-panel__toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-primary);
          font-size: 0.92rem;
        }

        .settings-panel__toggle input {
          accent-color: var(--brand);
        }

        .settings-panel__status {
          margin-top: 10px;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .settings-panel__group h3 {
          margin: 0 0 8px;
          font-size: 0.92rem;
          color: var(--text-primary);
        }

        .settings-panel__group p {
          margin: 0 0 12px;
          color: var(--text-tertiary);
          font-size: 0.82rem;
        }

        .settings-panel__control,
        .settings-panel__option {
          padding: 10px 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg-subtle);
          color: var(--text-primary);
          cursor: pointer;
          font-family: inherit;
          transition: background var(--t-fast), border-color var(--t-fast);
        }

        .settings-panel__control:hover,
        .settings-panel__option:hover {
          background: var(--bg-muted);
        }

        .settings-panel__options {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .settings-panel__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .settings-panel__control {
          min-width: 170px;
        }

        .settings-panel__option--active {
          border-color: var(--brand);
          background: rgba(79, 70, 229, 0.08);
          color: var(--brand);
        }

        .settings-panel__input {
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg-subtle);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.85rem;
          min-width: 200px;
        }

        .settings-panel__input:focus {
          outline: none;
          border-color: var(--brand);
        }

        .settings-vault-setup,
        .settings-vault-clear {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .settings-vault-status__row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .settings-vault-status__badge {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          padding: 4px 8px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
