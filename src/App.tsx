import { NavLink, Route, Routes } from 'react-router-dom';
import { Camera, Images, Settings } from 'lucide-react';
import { AppProvider, useApp } from '@/context/AppContext';
import CameraPage from '@/pages/Camera';
import GalleryPage from '@/pages/Gallery';
import SettingsPage from '@/pages/Settings';

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

function Shell() {
  const { stats } = useApp();
  const pendingBadge = stats.pending + stats.uploading + stats.error;

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<CameraPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<CameraPage />} />
      </Routes>

      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
          <Camera size={22} />
          Caméra
        </NavLink>

        <NavLink to="/gallery" className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
          <Images size={22} />
          Galerie
          {pendingBadge > 0 && (
            <span className="nav-badge">{pendingBadge > 99 ? '99+' : pendingBadge}</span>
          )}
        </NavLink>

        <NavLink to="/settings" className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
          <Settings size={22} />
          Paramètres
        </NavLink>
      </nav>
    </div>
  );
}
