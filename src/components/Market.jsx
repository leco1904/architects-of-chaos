import React, { useState } from 'react';
import Card from './Card';
import cardsData from '../data/cards.json';
import { playSound } from '../logic/audio';

export default function Market({ credits, setCredits, inventory, setInventory, onBack, onShowRules, onPackBought }) {
  const [isOpening, setIsOpening] = useState(false);
  const [pulledCards, setPulledCards] = useState([]);
  const [showFlash, setShowFlash] = useState(false);

  // ─── NEUE, HARTE ECONOMY ────────────────────────────────────────────────
  const packs = [
    { id: 'basic', name: 'BASIC DATACACHE', cost: 250, icon: '💾', num: 3, desc: 'Enthält 3 Karten. Standard-Dropraten. Gut für den Start.' },
    { id: 'premium', name: 'EXECUTIVE ARCHIVE', cost: 1000, icon: '🗄️', num: 5, desc: 'Enthält 5 Karten. Erhöhte Wahrscheinlichkeit auf Apex & Legacy.' },
    { id: 'apex', name: 'BLACK MARKET OVERRIDE', cost: 3500, icon: '👑', num: 1, desc: 'Zieht nur 1 Karte! Massive Chance auf Apex/Legacy. Nichts für schwache Nerven.' }
  ];

  // ─── GACHA DROP RATES (Brutal gewichtet) ──────────────────────────
  const getRandomCard = (packType) => {
    const roll = Math.random(); // Würfelt eine Zahl zwischen 0.000 und 1.000
    let selectedCardType = 'std';

   if (packType === 'apex') {
      // Das 3500-Credit High-Roller Pack (1 Karte)
      if (roll < 0.015) selectedCardType = 'anomaly';      // 1.5% Chance
      else if (roll < 0.265) selectedCardType = 'apex';    // 25% Chance auf Apex
      else if (roll < 0.715) selectedCardType = 'legacy';  // 45% Chance auf Legacy
      else selectedCardType = 'std';                       // 28.5% Chance auf Standard-Agent (die "Niete", aber KEINE Taktik mehr!)
    }
    else if (packType === 'premium') {
      // Das 1000-Credit Pack (5 Karten)
      if (roll < 0.004) selectedCardType = 'anomaly';      // 0.4% Chance
      else if (roll < 0.044) selectedCardType = 'apex';    // 4.0% Chance
      else if (roll < 0.144) selectedCardType = 'legacy';  // 10.0% Chance
      else if (roll < 0.394) selectedCardType = 'effect';  // 25.0% Chance
      else selectedCardType = 'std';                       // 60.6% Chance
    } 
    else {
      // Das 250-Credit Basic Pack (3 Karten)
      if (roll < 0.001) selectedCardType = 'anomaly';      // 0.1% Chance (1 von 1000!)
      else if (roll < 0.011) selectedCardType = 'apex';    // 1.0% Chance
      else if (roll < 0.061) selectedCardType = 'legacy';  // 5.0% Chance
      else if (roll < 0.311) selectedCardType = 'effect';  // 25.0% Chance
      else selectedCardType = 'std';                       // 68.8% Chance
    }

    // 1. Filtere den gesamten Karten-Pool nach dem ausgewählten Typ
    const allCards = [...cardsData.characters, ...(cardsData.effects || [])];
    let pool = allCards.filter(c => c.type === selectedCardType);

    // 2. Fallback, falls der Pool leer ist
    if (pool.length === 0) pool = allCards.filter(c => c.type === 'std');

    // 3. Wähle eine zufällige Karte aus dem gefilterten Pool
    const randomCard = pool[Math.floor(Math.random() * pool.length)];
    
    // 4. Gib die Karte mit eindeutiger ID und Level 1 zurück
    return { ...randomCard, id: Date.now() + Math.random(), isNew: true, level: 1 };
  };

  const handleBuy = (pack) => {
    if (credits < pack.cost) {
      playSound('error');
      return;
    }
    
    playSound('click');
    setCredits(prev => prev - pack.cost);
    setIsOpening(true);
    
    // SOUND: Hacking/Rattern startet
    playSound('decrypt');

    let newCards = [];
    for (let i = 0; i < pack.num; i++) {
      newCards.push(getRandomCard(pack.id));
    }

    // Warte auf die Wackel-Animation
    setTimeout(() => {
      setShowFlash(true);
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

      {isOpening && pulledCards.length === 0 && (
        <div className="pack-opening-center">
          <div className="pack-shaking">
            <div style={{ fontSize: '5rem', animation: 'gtiPulse 0.5s infinite alternate' }}>📡</div>
            <h2 className="mono" style={{ color: 'var(--win)', marginTop: '20px' }}>DECRYPTING...</h2>
          </div>
        </div>
      )}

      {showFlash && <div className="screen-flash"></div>}

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