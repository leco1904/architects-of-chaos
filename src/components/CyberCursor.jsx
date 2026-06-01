import React, { useEffect, useState, useRef } from 'react';

const CyberCursor = () => {
  const cursorRef = useRef(null);
  const waveRef = useRef(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const move = (e) => {
      if (hidden) setHidden(false);
      const zoomLevel = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
      const x = e.clientX / zoomLevel;
      const y = e.clientY / zoomLevel;

      // Direkte DOM-Manipulation entkoppelt die Maus von React-Renderzyklus!
      window.requestAnimationFrame(() => {
        if (cursorRef.current) {
          cursorRef.current.style.left = `${x}px`;
          cursorRef.current.style.top = `${y}px`;
        }
      });
    };

    const down = (e) => {
      if (cursorRef.current) {
        cursorRef.current.style.filter = 'drop-shadow(0 0 15px #00e5ff)';
        const path = cursorRef.current.querySelector('path');
        if (path) path.style.fill = 'rgba(0, 229, 255, 0.4)';
      }
      if (waveRef.current) {
        const zoomLevel = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
        waveRef.current.style.left = `${e.clientX / zoomLevel}px`;
        waveRef.current.style.top = `${e.clientY / zoomLevel}px`;
        
        // Animations-Reset Trick (CSS Reflow erzwingen)
        waveRef.current.style.animation = 'none';
        void waveRef.current.offsetHeight; 
        waveRef.current.style.animation = 'cursor-pulse-wave 0.4s ease-out forwards';
      }
    };

    const up = () => {
      if (cursorRef.current) {
        cursorRef.current.style.filter = 'drop-shadow(0 0 8px #00e5ff)';
        const path = cursorRef.current.querySelector('path');
        if (path) path.style.fill = 'rgba(0, 229, 255, 0.15)';
      }
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
      pointerEvents: 'none', zIndex: 3000000, overflow: 'hidden',
    }}>
      {/* Der Cyberpunk Navigations-Pfeil über Ref gesteuert */}
      <div ref={cursorRef} style={{
        position: 'absolute', 
        width: '32px', 
        height: '32px', 
        transformOrigin: '50% 0%',
        transform: 'translate(-50%, 0%) rotate(335deg)', 
        filter: 'drop-shadow(0 0 8px #00e5ff)',
        pointerEvents: 'none',
        transition: 'filter 0.1s'
      }}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <path 
            d="M12 0L24 24L12 18L0 24L12 0Z" 
            fill="rgba(0, 229, 255, 0.15)" 
            stroke="#00e5ff" 
            strokeWidth="1.5"
            strokeLinejoin="round"
            style={{ transition: 'fill 0.1s' }}
          />
        </svg>
      </div>

      {/* Die dynamische Klick-Pulswelle über Ref gesteuert */}
      <div ref={waveRef} style={{
        position: 'absolute', 
        width: '60px', 
        height: '60px',
        border: '3px solid #00e5ff',
        borderRadius: '50%', 
        transform: 'translate(-50%, -50%) scale(0)',
        opacity: 0,
        boxShadow: '0 0 20px #00e5ff88',
        pointerEvents: 'none', 
        zIndex: -1 
      }}/>
    </div>
  );
};

// CSS Animation Definition (am Ende der Datei einfügen, außerhalb der Komponente)
const styleTag = document.createElement('style');
styleTag.innerHTML = `
@keyframes cursor-pulse-wave {
  0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
}
`;
document.head.appendChild(styleTag);

export default CyberCursor;