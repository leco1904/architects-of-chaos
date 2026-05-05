import React, { useState } from 'react';
import Card from './Card';
import cardsData from '../data/cards.json';
import { playSound } from '../logic/audio';

export default function Market({ credits, setCredits, inventory, setInventory, onBack, onShowRules, onPackBought }) {
  const [isOpening, setIsOpening] = useState(false);
  const [pulledCards, setPulledCards] = useState([]);
  const [showFlash, setShowFlash] = useState(false);

  // Shop-Angebote
  const packs = [
    { id: 'standard', name: 'BASIC DATACACHE', cost: 100, icon: '💾', desc: 'Enthält 3 zufällige Agenten oder Taktikkarten. Gut für den Start.' },
    { id: 'premium', name: 'ENCRYPTED ARCHIVE', cost: 250, icon: '🗄️', desc: 'Enthält 5 Karten. Erhöhte Wahrscheinlichkeit auf Epic & Legendary.' },
    { id: 'apex', name: 'APEX PROTOCOL', cost: 500, icon: '👑', desc: 'Enthält 3 Karten. Garantiert mindestens 1 Apex Unit oder Legacy Asset.' }
  ];

  // Zieh-Logik
  const getRandomCard = (guaranteeApex = false) => {
    let pool = [...cardsData.characters, ...cardsData.effects];
    
    if (guaranteeApex) {
      pool = pool.filter(c => c.type === 'apex' || c.type === 'legacy');
    }

    const randomCard = pool[Math.floor(Math.random() * pool.length)];
    // Wir fügen eine einzigartige ID und den 'isNew' State hinzu
    return { ...randomCard, id: Date.now() + Math.random(), isNew: true, level: 1 };
  };

  const handleBuy = (pack) => {
    if (credits < pack.cost) {
      playSound('error');
      // Kleiner visuelle Hinweis wäre hier gut (z.B. ein roter Flash auf den Credits)
      return;
    }
    
    playSound('click');
    setCredits(prev => prev - pack.cost);
    setIsOpening(true);
    
    // 1. SOUND: Hacking/Rattern startet
    playSound('decrypt');

    let newCards = [];
    const numCards = pack.id === 'premium' ? 5 : 3;
    
    for (let i = 0; i < numCards; i++) {
      // Wenn es das Apex-Pack ist, wird die erste Karte garantiert ein Apex/Legacy Asset
      const guarantee = (pack.id === 'apex' && i === 0);
      newCards.push(getRandomCard(guarantee));
    }

    // Warte auf die Wackel-Animation (2 Sekunden)
    setTimeout(() => {
      setShowFlash(true);
      
      // 2. SOUND: Einschlag und Erfolg-Ping
      playSound('reveal');
      
      setPulledCards(newCards);
      setInventory(prev => [...prev, ...newCards]);
      if (onPackBought) onPackBought();
      
      setTimeout(() => setShowFlash(false), 800);
    }, 2000);
  };

  const closeReveal = () => {
    playSound('click');
    setPulledCards([]);
    setIsOpening(false);
  };

  return (
    <div className="screen active" style={{ display: 'block', padding: '30px' }}>
      <div className="top-bar">
        <div className="game-title-small">SCHWARZMARKT</div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div className="mono" style={{ fontSize: '1.5rem', color: '#fff', textShadow: '0 0 10px var(--ep)' }}>
            <span style={{color: 'var(--ep)'}}>{credits}</span> 💳
          </div>
          <button className="btn-info" onClick={onShowRules}>RULES</button>
          <button className="btn-back" onClick={onBack}>ZURÜCK</button>
        </div>
      </div>

      <div className="market-grid">
        {packs.map(p => (
          <div key={p.id} className="pack-item">
            <div>
              <div className="pack-icon">{p.icon}</div>
              <h3>{p.name}</h3>
              <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.4' }}>{p.desc}</p>
            </div>
            <div>
              <div className="pack-cost mono" style={{ color: credits >= p.cost ? 'var(--ep)' : 'var(--lose)' }}>{p.cost} 💳</div>
              <button 
                className="btn-act" 
                style={{ borderLeftColor: credits >= p.cost ? 'var(--win)' : '#444' }}
                onClick={() => handleBuy(p)}
                disabled={isOpening}
              >
                <span className="act-title">KAUFEN</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Das Wackelnde Paket */}
      {isOpening && pulledCards.length === 0 && (
        <div className="pack-opening-center">
          <div className="pack-shaking">
            <div style={{ fontSize: '5rem', animation: 'gtiPulse 0.5s infinite alternate' }}>📡</div>
            <h2 className="mono" style={{ color: 'var(--win)', marginTop: '20px' }}>DECRYPTING...</h2>
          </div>
        </div>
      )}

      {/* Weißer/Cyaner Screen-Flash */}
      {showFlash && <div className="screen-flash"></div>}

      {/* Das Reveal der gezogenen Karten */}
      {pulledCards.length > 0 && (
        <div className="reveal-container">
          <h2 style={{ color: '#fff', fontSize: '3rem', letterSpacing: '8px', marginBottom: '40px', textShadow: '0 0 20px var(--win)' }}>ACCESS GRANTED</h2>
          <div className="pull-reveal-grid">
            {pulledCards.map((c, i) => (
              <div key={i} className="pulled-card-wrapper" style={{ animationDelay: `${i * 0.2}s` }}>
                <Card card={c} context="inventory" />
              </div>
            ))}
          </div>
          <button className="menu-btn btn-primary" style={{ marginTop: '50px', maxWidth: '300px' }} onClick={closeReveal}>AKZEPTIEREN</button>
        </div>
      )}
    </div>
  );
}