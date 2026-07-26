import { Clock, Upload, CircleCheck, CircleAlert, RefreshCw, Trash2, FolderOpen, Images } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { QueuedPhoto, UploadStatus } from '@/types';

export default function GalleryPage() {
  const { queue, stats, processing, isOnline, isConnected, retryPhoto, deletePhoto, clearSuccessful, runQueue } = useApp();

  const sorted = [...queue].reverse();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Galerie</div>
          <div className="page-subtitle">
            {stats.total === 0 ? 'Aucune photo' : `${stats.total} photo${stats.total > 1 ? 's' : ''}`}
          </div>
        </div>
        <ConnBadge online={isOnline} />
      </div>

      {stats.total > 0 && (
        <>
          <div className="stats-row">
            <StatChip label="Attente" count={stats.pending} color="var(--warning)" />
            <StatChip label="Upload" count={stats.uploading} color="var(--accent)" />
            <StatChip label="Réussis" count={stats.success} color="var(--success)" />
            <StatChip label="Erreurs" count={stats.error} color="var(--error)" />
          </div>

          <div className="action-bar">
            {isConnected && (stats.pending > 0 || stats.error > 0) && (
              <button
                className={`action-btn sync${processing ? ' spinning' : ''}`}
                onClick={runQueue}
                disabled={processing}
              >
                <RefreshCw size={14} />
                {processing ? 'Sync…' : 'Synchroniser'}
              </button>
            )}
            {!isConnected && (stats.pending > 0 || stats.error > 0) && (
              <span className="action-btn disabled">
                <RefreshCw size={14} />
                Connectez Drive pour uploader
              </span>
            )}
            {stats.success > 0 && (
              <button className="action-btn clear" onClick={clearSuccessful}>
                <Trash2 size={14} />
                Vider les réussis
              </button>
            )}
          </div>
        </>
      )}

      <div className="page-scroll" style={{ background: 'var(--bg-0)' }}>
        {sorted.length === 0 ? (
          <div className="empty-state">
            <Images size={52} />
            <h3>Aucune photo</h3>
            <p>Prenez des photos depuis l'onglet Caméra. Elles apparaîtront ici avec leur statut d'upload.</p>
          </div>
        ) : (
          <div className="gallery-list">
            {sorted.map((photo, i) => (
              <div key={photo.id} className="fade-in" style={{ animationDelay: `${i * 25}ms` }}>
                <PhotoCard photo={photo} onRetry={retryPhoto} onDelete={deletePhoto} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="stat-chip">
      <span className="stat-chip-num" style={{ color }}>{count}</span>
      <span className="stat-chip-lbl">{label}</span>
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

const STATUS_ICON: Record<UploadStatus, typeof Clock> = {
  pending: Clock,
  uploading: Upload,
  success: CircleCheck,
  error: CircleAlert,
};
const STATUS_LABEL: Record<UploadStatus, string> = {
  pending: 'En attente',
  uploading: 'Upload en cours',
  success: 'Uploadé',
  error: 'Erreur',
};

function PhotoCard({ photo, onRetry, onDelete }: { photo: QueuedPhoto; onRetry: (id: string) => void; onDelete: (id: string) => void }) {
  const Icon = STATUS_ICON[photo.status];
  const timestamp = new Date(photo.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const sizeMb = photo.fileSize ? (photo.fileSize / (1024 * 1024)).toFixed(1) + ' MB' : '';

  return (
    <div className="photo-card">
      <div className="photo-card-thumb">
        {photo.uri ? (
          <img src={photo.uri} alt={photo.filename} loading="lazy" />
        ) : (
          <div className="photo-card-thumb-icon">
            <Images size={24} />
          </div>
        )}
      </div>

      <div className="photo-card-info">
        <div className="photo-card-name">{photo.filename}</div>
        <div className="photo-card-meta">
          <span>{timestamp}</span>
          {sizeMb && <span>{sizeMb}</span>}
        </div>
        {photo.drivePath && (
          <div className="photo-card-path">
            <FolderOpen size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
            {photo.drivePath}
          </div>
        )}
        {photo.error && <div className="photo-card-error">{photo.error}</div>}
        {photo.status === 'uploading' && (
          <div className="photo-card-progress">
            <div
              className="photo-card-progress-fill"
              style={{ width: `${Math.round((photo.progress ?? 0) * 100)}%` }}
            />
          </div>
        )}
        <span className={`status-badge ${photo.status}`}>
          <Icon size={10} />
          {STATUS_LABEL[photo.status]}
        </span>
      </div>

      <div className="photo-card-actions">
        {(photo.status === 'error' || photo.status === 'pending') && (
          <button className="card-action-btn retry" onClick={() => onRetry(photo.id)} title="Réessayer">
            <RefreshCw size={15} />
          </button>
        )}
        <button className="card-action-btn delete" onClick={() => onDelete(photo.id)} title="Supprimer">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
