import { HardDrive, LogIn, LogOut, CircleCheck, CircleAlert, Wifi, WifiOff, Info, Mail, FolderOpen } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function SettingsPage() {
  const { auth, isConnected, authLoading, authError, connect, disconnect, isOnline, stats } = useApp();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Paramètres</div>
          <div className="page-subtitle">Configuration</div>
        </div>
        <ConnBadge online={isOnline} />
      </div>

      <div className="page-scroll">
        <div style={{ padding: '0 16px 40px' }}>

          {/* Google Drive */}
          <SectionTitle icon={<HardDrive size={14} />} label="Google Drive" />
          <div className="settings-card">
            {isConnected ? (
              <div className="drive-connected fade-in">
                <div className="drive-connected-top">
                  <div className="drive-icon-wrap">
                    <HardDrive size={26} />
                  </div>
                  <div className="drive-info">
                    <div className="drive-status-row">
                      <CircleCheck size={12} />
                      Connecté
                    </div>
                    <div className="drive-name">Google Drive</div>
                    {auth.email && (
                      <div className="drive-email">
                        <Mail size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                        {auth.email}
                      </div>
                    )}
                  </div>
                </div>
                <button className="btn-disconnect" onClick={disconnect} disabled={authLoading}>
                  {authLoading ? <span className="spinner" /> : <LogOut size={16} />}
                  Déconnecter
                </button>
              </div>
            ) : (
              <div className="drive-disconnected fade-in">
                <div className="drive-icon-wrap">
                  <HardDrive size={30} />
                </div>
                <h3>Google Drive non connecté</h3>
                <p>
                  Connectez votre compte Google pour activer l'upload automatique. Une fenêtre d'autorisation s'ouvrira.
                </p>
                {authError && (
                  <div className="error-box">
                    <CircleAlert size={14} />
                    {authError}
                  </div>
                )}
                <button className="btn-connect" onClick={connect} disabled={authLoading}>
                  {authLoading ? <span className="spinner" /> : <LogIn size={18} />}
                  Connecter Google Drive
                </button>
                <span className="oauth-note">Nécessite un Client ID Google configuré.</span>
              </div>
            )}
          </div>

          {/* Réseau */}
          <SectionTitle icon={<Wifi size={14} />} label="Réseau" />
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-row-left">
                {isOnline
                  ? <Wifi size={18} color="var(--success)" />
                  : <WifiOff size={18} color="var(--error)" />}
                Statut réseau
              </div>
              <span className="settings-row-value" style={{ color: isOnline ? 'var(--success)' : 'var(--error)' }}>
                {isOnline ? 'Connecté' : 'Hors ligne'}
              </span>
            </div>
            <div className="settings-divider" />
            <div className="settings-row">
              <div className="settings-row-left">
                <FolderOpen size={18} color="var(--text-2)" />
                En attente d'upload
              </div>
              <span className="settings-row-value">{stats.pending + stats.error}</span>
            </div>
          </div>

          {/* Stats */}
          <SectionTitle icon={<Info size={14} />} label="Statistiques" />
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-row-left">
                <CircleCheck size={18} color="var(--success)" />
                Uploads réussis
              </div>
              <span className="settings-row-value" style={{ color: 'var(--success)' }}>{stats.success}</span>
            </div>
            <div className="settings-divider" />
            <div className="settings-row">
              <div className="settings-row-left">
                <CircleAlert size={18} color={stats.error > 0 ? 'var(--error)' : 'var(--text-3)'} />
                Erreurs
              </div>
              <span
                className="settings-row-value"
                style={{ color: stats.error > 0 ? 'var(--error)' : 'var(--text-3)' }}
              >
                {stats.error}
              </span>
            </div>
          </div>

          {/* À propos */}
          <SectionTitle icon={<Info size={14} />} label="À propos" />
          <div className="settings-card">
            <div className="settings-row">
              <div className="settings-row-left">
                <HardDrive size={18} color="var(--text-2)" />
                Version
              </div>
              <span className="settings-row-value">1.0.0</span>
            </div>
            <div className="settings-divider" />
            <div className="settings-row">
              <div className="settings-row-left" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span>Organisation Drive</span>
                <span className="settings-mono">/UploadCam/YYYY/MM/DD/</span>
              </div>
            </div>
          </div>

          <div className="settings-footer">
            Les photos sont stockées localement et synchronisées automatiquement vers Google Drive
            dès que vous êtes connecté à Internet.
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="settings-section-title">
      {icon}
      {label}
    </div>
  );
}

function ConnBadge({ online }: { online: boolean }) {
  return (
    <div className="conn-badge">
      <span className={`conn-dot ${online ? 'online' : 'offline'}`} />
      <span className={`conn-text ${online ? 'online' : 'offline'}`}>
        {online ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
