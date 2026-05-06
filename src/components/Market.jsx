import React, { useState } from 'react';
import Card from './Card';
import cardsData from '../data/cards.json';
import { playSound } from '../logic/audio';

export default function Market({ 
  credits, 
  setCredits, 
  inventory, 
  setInventory, 
  onBack, 
  onShowRules, 
  onPackBought,
  rewardPacks,      // Empfängt die Gratis-Packs
  setRewardPacks    // Erlaubt das saubere Löschen der Packs
}) {
  const [isOpening, setIsOpening] = useState(false);
  const [pulledCards, setPulledCards] = useState([]);
  const [showFlash, setShowFlash] = useState(false);

  const packs = [
    { id: 'basic', name: 'BASIC DATACACHE', cost: 250, icon: '💾', num: 3, desc: 'Enthält 3 Karten. Standard-Dropraten. Gut für den Start.' },
    { id: 'premium', name: 'EXECUTIVE ARCHIVE', cost: 1000, icon: '🗄️', num: 5, desc: 'Enthält 5 Karten. Erhöhte Wahrscheinlichkeit auf Apex & Legacy.' },
    { id: 'apex', name: 'BLACK MARKET OVERRIDE', cost: 3500, icon: '👑', num: 1, desc: 'Zieht nur 1 Karte! Massive Chance auf Apex/Legacy.' }
  ];

  // ─── GACHA DROP RATES ───
  const getRandomCard = (packType) => {
    const roll = Math.random();
    let selectedCardType = 'std';

    if (packType === 'apex') {
      if (roll < 0.015) selectedCardType = 'anomaly';
      else if (roll < 0.265) selectedCardType = 'apex';
      else if (roll < 0.715) selectedCardType = 'legacy';
      else selectedCardType = 'std';
    } else if (packType === 'premium') {
      if (roll < 0.004) selectedCardType = 'anomaly';
      else if (roll < 0.044) selectedCardType = 'apex';
      else if (roll < 0.144) selectedCardType = 'legacy';
      else if (roll < 0.394) selectedCardType = 'effect';
      else selectedCardType = 'std';
    } else {
      if (roll < 0.001) selectedCardType = 'anomaly';
      else if (roll < 0.011) selectedCardType = 'apex';
      else if (roll < 0.061) selectedCardType = 'legacy';
      else if (roll < 0.311) selectedCardType = 'effect';
      else selectedCardType = 'std';
    }

    const allCards = [...cardsData.characters, ...(cardsData.effects || [])];
    let pool = allCards.filter(c => c.type === selectedCardType);
    if (pool.length === 0) pool = allCards.filter(c => c.type === 'std');

    const randomCard = pool[Math.floor(Math.random() * pool.length)];
    return { ...randomCard, id: Date.now() + Math.random(), isNew: true, level: 1 };
  };

  // ─── ÖFFNUNGS-LOGIK (Fix für Endlos-Packs) ───
  const processOpening = (newCards, rewardId = null) => {
    setIsOpening(true);
    playSound('decrypt');

    setTimeout(() => {
      setShowFlash(true);
      playSound('reveal');
      
      // 1. Karten sicher ins Inventar schieben
      setPulledCards(newCards);
      setInventory(prev => [...prev, ...newCards]);
      
      // 2. Pack SAUBER aus dem State löschen (verhindert unendliches Öffnen)
      if (rewardId && setRewardPacks) {
        setRewardPacks(prev => prev.filter(p => p.id !== rewardId));
      }
      
      if (onPackBought && !rewardId) onPackBought();
      
      setTimeout(() => setShowFlash(false), 800);
    }, 2000);
  };

  const handleBuy = (pack) => {
    if (credits < pack.cost) {
      playSound('error');
      return;
    }
    setCredits(prev => prev - pack.cost);
    
    let newCards = [];
    for (let i = 0; i < pack.num; i++) {
      newCards.push(getRandomCard(pack.id));
    }
    processOpening(newCards);
  };

  const handleOpenReward = (rp) => {
    processOpening(rp.cards, rp.id);
  };

  const closeReveal = () => {
    playSound('click');
    setPulledCards([]);
    setIsOpening(false);
  };

  return (
    <div className="screen active" style={{ display: 'block', padding: '30px', overflowY: 'auto' }}>
      {/* HEADER */}
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

      {/* --- SEKTOR BELOHNUNGEN --- */}
      {rewardPacks && rewardPacks.length > 0 && (
        <div className="reward-section" style={{ 
          marginBottom: '40px', 
          border: '1px solid var(--win)', 
          padding: '20px', 
          background: 'rgba(0,229,255,0.03)', 
          borderRadius: '4px',
          boxShadow: 'inset 0 0 20px rgba(0,229,255,0.05)'
        }}>
          <div className="mono" style={{ color: 'var(--win)', fontSize: '0.7rem', marginBottom: '20px', letterSpacing: '3px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ animation: 'pulse 1s infinite' }}>●</span> // GEFUNDENE DATENFRAGMENTE (KOSTENLOS)
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {rewardPacks.map(rp => (
              <div key={rp.id} className="pack-item" style={{ borderColor: rp.color, width: '280px', minHeight: 'auto', padding: '15px', margin: 0, boxShadow: `0 0 15px ${rp.color}33` }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div className="pack-icon" style={{ color: rp.color, fontSize: '2rem', marginBottom: 0, textShadow: `0 0 10px ${rp.color}` }}>🎁</div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', margin: 0 }}>{rp.name}</h3>
                    <div className="mono" style={{ color: 'var(--win)', fontSize: '0.8rem' }}>GRATIS</div>
                  </div>
                </div>
                <button 
                  className="btn-act" 
                  style={{ borderLeftColor: 'var(--win)', marginTop: '15px', height: '35px' }} 
                  onClick={() => handleOpenReward(rp)}
                  disabled={isOpening}
                >
                  <span className="act-title">DECRYPTEN</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STANDARD CACHES */}
      <div className="mono" style={{ color: '#555', marginBottom: '15px', fontSize: '0.7rem', letterSpacing: '2px' }}>// STANDARD CACHES</div>
      <div className="market-grid">
        {packs.map(p => (
          <div key={p.id} className="pack-item">
            <div>
              <div className="pack-icon">{p.icon}</div>
              <h3>{p.name}</h3>
              <p style={{ color: '#aaa', fontSize: '0.8rem', lineHeight: '1.4' }}>{p.desc}</p>
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

      {/* OVERLAYS (Öffnen & Reveal) */}
      {isOpening && pulledCards.length === 0 && (
        <div className="pack-opening-center" style={{ zIndex: 1000 }}>
          <div className="pack-shaking">
            <div style={{ fontSize: '5rem', animation: 'gtiPulse 0.5s infinite alternate' }}>📡</div>
            <h2 className="mono" style={{ color: 'var(--win)', marginTop: '20px' }}>DECRYPTING...</h2>
          </div>
        </div>
      )}

      {showFlash && <div className="screen-flash"></div>}

      {pulledCards.length > 0 && (
        <div className="reveal-container" style={{ zIndex: 2000 }}>
          <h2 className="reveal-title">ACCESS GRANTED</h2>
          <div className="pull-reveal-grid">
            {pulledCards.map((c, i) => (
              <div key={i} className="pulled-card-wrapper" style={{ animationDelay: `${i * 0.2}s` }}>
                <Card card={c} context="reveal" />
              </div>
            ))}
          </div>
          <button className="menu-btn btn-primary" style={{ marginTop: '50px', maxWidth: '300px' }} onClick={closeReveal}>ÜBERNEHMEN</button>
        </div>
      )}
    </div>
  );
}