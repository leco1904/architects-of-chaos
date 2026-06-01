import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// GHOST NODE DESKTOP BOOT: Verhindert Standard-Browser-Aktionen
// (Deaktiviert Rechtsklick & Refresh-Shortcuts für echtes Game-Feeling)
const isElectron = navigator.userAgent.toLowerCase().includes(' electron/');
if (isElectron) {
  // Deaktiviert das Standard-Rechtsklick-Menü
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  
  // Verhindert Browser-Zoom via Strg + Mausrad (erhält das UI-Scaling)
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    // Verhindert Refresh (Strg+R), Suche (Strg+F) und Zoom (Strg+/-)
    if ((e.ctrlKey || e.metaKey) && ['r', 'f', '+', '-', '0'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
