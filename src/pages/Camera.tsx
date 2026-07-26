import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CloudUpload, Image, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';

type FacingMode = 'environment' | 'user';

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<FacingMode>('environment');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [lastUri, setLastUri] = useState<string | null>(null);
  const { addPhoto, stats, isOnline, isConnected } = useApp();

  const startCamera = useCallback(async (mode: FacingMode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasPermission(true);
    } catch {
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    startCamera(facing);
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [facing, startCamera]);

  const capture = useCallback(async () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);

    // Flash
    setFlash(true);
    setTimeout(() => setFlash(false), 160);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const fileSize = Math.round((base64.length * 3) / 4);

    // Object URL for display (lighter than keeping data URL)
    canvas.toBlob(async (blob) => {
      const uri = blob ? URL.createObjectURL(blob) : dataUrl;
      setLastUri(uri);
      await addPhoto(uri, base64, fileSize);
      setCapturing(false);
    }, 'image/jpeg', 0.75);
  }, [capturing, addPhoto]);

  const flipCamera = useCallback(() => {
    setFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  if (hasPermission === false) {
    return (
      <div className="camera-no-access">
        <Camera size={52} />
        <h2>Accès caméra requis</h2>
        <p>
          UploadCam a besoin de votre caméra pour prendre des photos. Autorisez l'accès dans les
          réglages de votre navigateur puis rechargez la page.
        </p>
        <button className="primary-btn" onClick={() => startCamera(facing)}>
          Réessayer
        </button>
      </div>
    );
  }

  const pendingCount = stats.pending + stats.uploading + stats.error;

  return (
    <div className="camera-page">
      <video
        ref={videoRef}
        className="camera-video"
        autoPlay
        playsInline
        muted
      />

      {/* Flash overlay */}
      <div className={`camera-flash${flash ? ' active' : ''}`} />

      {/* Top bar */}
      <div className="camera-top">
        <ConnBadge online={isOnline} />
        <div className="camera-top-right">
          {isConnected && (
            <div className="drive-pill">
              <CloudUpload size={13} />
              Drive
            </div>
          )}
          {pendingCount > 0 && (
            <div className="queue-pill">{pendingCount}</div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="camera-bottom">
        <div className="camera-controls">
          {/* Last thumbnail */}
          <div className="camera-thumb">
            {lastUri ? (
              <img src={lastUri} alt="Dernière photo" />
            ) : (
              <Image size={20} />
            )}
          </div>

          {/* Shutter */}
          <button
            className="shutter"
            onClick={capture}
            disabled={capturing || hasPermission === null}
            aria-label="Prendre une photo"
          >
            <div className="shutter-inner" />
          </button>

          {/* Flip */}
          <button className="flip-btn" onClick={flipCamera} aria-label="Retourner la caméra">
            <RefreshCw size={22} />
          </button>
        </div>

        {stats.total > 0 && (
          <div className="camera-status">
            <span className="camera-status-text">
              {stats.uploading > 0
                ? `Upload en cours (${stats.uploading})…`
                : stats.pending > 0
                ? `${stats.pending} photo${stats.pending > 1 ? 's' : ''} en attente`
                : stats.error > 0
                ? `${stats.error} erreur${stats.error > 1 ? 's' : ''}`
                : `${stats.success} uploadée${stats.success > 1 ? 's' : ''} ✓`}
            </span>
          </div>
        )}
      </div>
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
