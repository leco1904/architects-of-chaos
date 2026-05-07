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
  const [showOdds, setShowOdds] = useState(false); // NEU: State für das Modal

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
      else if (roll < 0.365) selectedCardType = 'apex';
      else if (roll < 0.765) selectedCardType = 'legacy';
      else selectedCardType = 'std';
    } else if (packType === 'premium') {
      if (roll < 0.004) selectedCardType = 'anomaly';
      else if (roll < 0.044) selectedCardType = 'apex';
      else if (roll < 0.144) selectedCardType = 'legacy';
      else if (roll < 0.394) selectedCardType = 'effect';
      else selectedCardType = 'std';
    } else {
      if (roll < 0.001) selectedCardType = 'anomaly';
      else if (roll < 0.006) selectedCardType = 'apex';
      else if (roll < 0.046) selectedCardType = 'legacy';
      else if (roll < 0.296) selectedCardType = 'effect';
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
          <button className="btn-info" style={{ pointerEvents: 'auto', zIndex: 100 }} onClick={() => setShowOdds(true)}>📊 ODDS</button>
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
            {pulledCards.map((c, i) => {
              // Zählt, wie oft diese Karte im gesamten Inventar existiert
              const totalOwned = inventory.filter(inv => inv.name === c.name).length;
              
              return (
                <div key={i} className="pulled-card-wrapper" style={{ animationDelay: `${i * 0.2}s`, position: 'relative' }}>
                  <Card card={c} context="reveal" />
                  
                  {/* Badge wird nur angezeigt, wenn man die Karte als Duplikat zieht */}
                  {totalOwned > 1 && (
                    <div className="mono" style={{ 
                      position: 'absolute', top: '-15px', right: '-15px', 
                      background: 'rgba(10,10,15,0.95)', color: 'var(--win)', 
                      padding: '6px 10px', borderRadius: '4px', 
                      border: '1px solid var(--win)', borderLeft: '3px solid var(--win)',
                      fontSize: '0.75rem', fontWeight: 900, zIndex: 50, letterSpacing: '1px',
                      boxShadow: '0 0 15px rgba(0,229,255,0.3)'
                    }}>
                      {totalOwned}x IM BESITZ
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button className="menu-btn btn-primary" style={{ marginTop: '20px', maxWidth: '300px', zIndex: 100 }} onClick={closeReveal}>ÜBERNEHMEN</button>
        </div>
      )}
      {/* ODDS MODAL */}
      {showOdds && (
        <div onClick={() => setShowOdds(false)} style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <style>{`.odds-modal::-webkit-scrollbar { display: none; }`}</style>
          <div onClick={e => e.stopPropagation()} className="odds-modal" style={{
            background: 'rgba(5,5,12,0.98)', border: '1px solid rgba(0,229,255,0.2)',
            borderTop: '3px solid var(--win)', padding: '32px 36px',
            width: 'min(780px, 94vw)', maxHeight: '85vh', overflowY: 'auto',
            scrollbarWidth: "none", msOverflowStyle: "none",
            boxShadow: '0 0 60px rgba(0,229,255,0.08)',
            fontFamily: "'Roboto Mono', monospace",
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontFamily: "'Rajdhani',sans-serif", fontWeight: 900, letterSpacing: '4px', color: 'var(--win)' }}>📊 DROPRATEN</div>
                <div className="mono" style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', marginTop: 4 }}>// WAHRSCHEINLICHKEITEN PRO KARTE</div>
              </div>
              <button onClick={() => setShowOdds(false)} style={{ background: 'transparent', border: '1px solid #333', color: '#666', padding: '6px 12px', cursor: 'pointer', fontFamily: "'Roboto Mono',monospace", fontSize: '0.7rem', letterSpacing: '2px' }}>✕ SCHLIESSEN</button>
            </div>

            {/* Rarity legend */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              {[['ANOMALY','#ff00ff'],['APEX','var(--apex-pink)'],['LEGACY','#b8860b'],['EFFEKT','var(--eff-col)'],['STANDARD','#888']].map(([name, col]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${col}44` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
                  <span className="mono" style={{ fontSize: '0.52rem', color: col, letterSpacing: '1px' }}>{name}</span>
                </div>
              ))}
            </div>

            {/* Pack tables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { name: 'BASIC DATACACHE', icon: '💾', cost: 250, cards: 3,
                  rates: [['ANOMALY','#ff00ff','0.1%'],['APEX','var(--apex-pink)','0.5%'],['LEGACY','#b8860b','3.0%'],['EFFEKT','var(--eff-col)','25.0%'],['STANDARD','#888','70.4%']] },
                { name: 'EXECUTIVE ARCHIVE', icon: '🗄️', cost: 1000, cards: 5,
                  rates: [['ANOMALY','#ff00ff','0.4%'],['APEX','var(--apex-pink)','4.0%'],['LEGACY','#b8860b','10.0%'],['EFFEKT','var(--eff-col)','25.0%'],['STANDARD','#888','60.6%']] },
                { name: 'BLACK MARKET OVERRIDE', icon: '👑', cost: 3500, cards: 1,
                  rates: [['ANOMALY','#ff00ff','1.5%'],['APEX','var(--apex-pink)','35.0%'],['LEGACY','#b8860b','40.0%'],['EFFEKT','var(--eff-col)','—'],['STANDARD','#888','23.5%']] },
              ].map(pack => (
                <div key={pack.name} style={{ border: '1px solid rgba(255,255,255,0.07)', padding: '16px 18px', background: 'rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '1.3rem' }}>{pack.icon}</span>
                      <div>
                        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '0.95rem', letterSpacing: '2px', color: '#fff' }}>{pack.name}</div>
                        <div className="mono" style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)' }}>{pack.cards} KARTE{pack.cards > 1 ? 'N' : ''} PRO ÖFFNUNG</div>
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: '1.1rem', color: 'var(--ep)', fontWeight: 900 }}>{pack.cost} 💳</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {pack.rates.map(([rarity, color, pct]) => (
                      <div key={rarity} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="mono" style={{ width: 70, fontSize: '0.52rem', color, letterSpacing: '1px', flexShrink: 0 }}>{rarity}</div>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          {pct !== '—' && <div style={{ height: '100%', width: pct, background: color, borderRadius: 3, boxShadow: `0 0 6px ${color}66` }} />}
                        </div>
                        <div className="mono" style={{ width: 42, fontSize: '0.6rem', color, textAlign: 'right', fontWeight: 700, flexShrink: 0 }}>{pct}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mono" style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.18)', marginTop: 20, letterSpacing: '1px', lineHeight: 1.8 }}>
              * Jeder Ziehvorgang ist unabhängig. Dropraten gelten pro einzelner Karte.<br/>
              * EFFEKT-Karten sind im BLACK MARKET OVERRIDE nicht enthalten.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}