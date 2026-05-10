import React, { useState } from 'react';
import Card from './Card';
import cardsData from '../data/cards.json';
import { playSound } from '../logic/audio';

export default function Market({ 
  credits, 
  username,
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
  const [openingTier, setOpeningTier] = useState('standard'); // NEU: Animations-Stufe

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
    return { ...randomCard, id: Date.now() + Math.random(), level: 1 };
  };

  // ─── ÖFFNUNGS-LOGIK (Mit Tier-Check) ───
  const processOpening = (newCards, rewardId = null) => {
    // Check, ob etwas extrem Seltenes drin ist
    const isHighTier = newCards.some(c => ['apex', 'legacy', 'anomaly'].includes(c.type) || (c.gti && c.gti >= 90));
    setOpeningTier(isHighTier ? 'high' : 'standard');
    setIsOpening(true);
    
    // Bei High Tier direkt Warn-Sound mit reinmischen
    if (isHighTier) { playSound('crisis'); playSound('decrypt'); }
    else { playSound('decrypt'); }

    setTimeout(() => {
      setShowFlash(true);
      if (isHighTier) playSound('heavy_impact'); // Extra Wumms
      playSound('reveal');
      
      setPulledCards(newCards);
      setInventory(prev => [...prev, ...newCards]);
      
      if (rewardId && setRewardPacks) {
        setRewardPacks(prev => prev.filter(p => p.id !== rewardId));
      }
      if (onPackBought && !rewardId) onPackBought();
      
      setTimeout(() => setShowFlash(false), 800);
    }, 2600); // 2.6 Sekunden für die fette Animation
  };

  const handleBuy = (pack) => {
    if (credits < pack.cost) {
      playSound('error');
      return;
    }
    setCredits(prev => prev - pack.cost);
    
    let newCards = [];
    let pulledNames = []; // NEU: Merkt sich Karten, die im exakt selben Pack stecken
    for (let i = 0; i < pack.num; i++) {
      const rawCard = getRandomCard(pack.id);
      // Nur 'NEW', wenn sie weder im echten Inventar noch vorher im aktuellen Pack war
      const isReallyNew = !inventory.some(inv => inv.name === rawCard.name) && !pulledNames.includes(rawCard.name);
      
      pulledNames.push(rawCard.name);
      newCards.push({ ...rawCard, isNew: isReallyNew });
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
    <div className="command-center-layout" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '60px 40px', gap: '20px' }}>
      {/* VIEWPORT FRAMING */}
      <div className="hud-bracket tl"></div>
      <div className="hud-bracket bl"></div>
      <div className="hud-bracket br"></div>

      {/* HEADER: HUD STATUS BAR (Standard) */}
      <div style={{ position: 'absolute', top: '15px', right: '35px', display: 'flex', filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))', zIndex: 1000 }}>
        <div className="hud-status-module funds" style={{ cursor: 'default' }}>
          <span className="hud-label">CREDITS</span>
          <span className="hud-value">{credits ?? 0}</span>
        </div>
        <div className="hud-status-module agent" style={{ borderColor: 'rgba(0, 229, 255, 0.2)', color: 'var(--win)', marginLeft: '-5px', clipPath: 'none' }}>
          <span className="hud-label" style={{ color: 'var(--win)' }}>SYS.ID</span>
          <span className="hud-value" style={{ fontSize: '1.1rem', textTransform: 'uppercase' }}>{username || 'UNKNOWN'}</span>
        </div>
        <div className="hud-status-module agent" onClick={onBack} style={{ borderColor: 'var(--lose)', color: 'var(--lose)', borderRight: 'none', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', paddingRight: '20px', marginLeft: '-5px', cursor: 'pointer' }}>
          <span className="hud-label" style={{ color: 'var(--lose)' }}>STATUS</span>
          <span className="hud-value" style={{ fontSize: '0.9rem' }}>EXIT</span>
        </div>
      </div>

      {/* SHOP HEADER & DROP RATES BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', marginTop: '10px' }}>
        <div className="ops-header" style={{ fontSize: '1.4rem', color: 'var(--ep)', textShadow: '0 0 10px var(--ep)', margin: 0 }}>
          [ BLACK MARKET UPLINK ]
        </div>
        <button className="btn-info" onClick={() => { playSound('click'); setShowOdds(true); }} style={{ borderColor: 'rgba(0, 229, 255, 0.4)', color: '#00e5ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem' }}>📊</span> SYS.LOG: DROP RATES
        </button>
      </div>

      {/* --- SEKTOR BELOHNUNGEN --- */}
      {rewardPacks && rewardPacks.length > 0 && (
        <div className="reward-section" style={{ marginBottom: '40px', position: 'relative' }}>
          <div className="mono" style={{ color: 'var(--win)', fontSize: '0.7rem', marginBottom: '15px', letterSpacing: '3px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ animation: 'pulse 1s infinite' }}>●</span> EXTRACTED DATA CACHES READY FOR DECRYPTION
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            {rewardPacks.map(rp => (
              <div key={rp.id} style={{ 
                position: 'relative', width: '100%', maxWidth: '320px',
                background: 'rgba(0, 0, 0, 0.6)', border: `1px solid ${rp.color}44`,
                borderLeft: `4px solid ${rp.color}`, padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '15px',
                boxShadow: `inset 0 0 20px ${rp.color}11, 0 5px 15px rgba(0,0,0,0.5)`,
                clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="mono" style={{ color: rp.color, fontSize: '0.6rem', letterSpacing: '2px', textShadow: `0 0 8px ${rp.color}` }}>[ SECURED ASSET ]</div>
                    <h3 style={{ fontSize: '1.1rem', margin: '5px 0 0 0', color: '#fff', letterSpacing: '1px' }}>{rp.name}</h3>
                  </div>
                  <div className="mono" style={{ color: '#fff', fontSize: '0.8rem', background: `${rp.color}33`, padding: '2px 8px', border: `1px solid ${rp.color}`, borderRadius: '2px' }}>FREE</div>
                </div>
                
                <button 
                  className="btn-act" 
                  style={{ borderLeftColor: rp.color, background: 'rgba(255,255,255,0.02)', padding: '10px 15px' }} 
                  onClick={() => handleOpenReward(rp)}
                  disabled={isOpening}
                >
                  <span className="act-title" style={{ fontSize: '0.9rem', color: rp.color }}>DECRYPT PAYLOAD</span>
                  <span className="act-cost">▶</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STANDARD CACHES */}
      <div className="mono" style={{ color: '#666', marginBottom: '20px', fontSize: '0.75rem', letterSpacing: '2px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        // COMMERCIAL DATA NODES
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', width: '100%', maxWidth: '1200px' }}>
        {packs.map(p => {
          const isAffordable = credits >= p.cost;
          // Farb-Zuordnung basierend auf Pack-Typ
          const pColor = p.id === 'basic' ? 'var(--win)' : p.id === 'premium' ? 'var(--r-epi)' : '#bc13fe';
          
          return (
            <div key={p.id} style={{
              position: 'relative',
              background: 'rgba(10, 10, 15, 0.8)',
              border: `1px solid ${pColor}44`,
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              padding: '30px', transition: '0.3s',
              clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
              boxShadow: `inset 0 0 30px ${pColor}08`
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = pColor; e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = `inset 0 0 30px ${pColor}15, 0 10px 20px rgba(0,0,0,0.5)`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${pColor}44`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `inset 0 0 30px ${pColor}08`; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: pColor }} />
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div className="mono" style={{ fontSize: '0.65rem', color: pColor, letterSpacing: '3px', textShadow: `0 0 10px ${pColor}` }}>NODE: {p.id.toUpperCase()}</div>
                  <div className="mono" style={{ fontSize: '0.65rem', background: '#000', padding: '2px 6px', border: `1px solid ${pColor}44`, color: '#aaa' }}>CAP: {p.num}</div>
                </div>
                
                <h3 style={{ fontSize: '1.4rem', margin: '0 0 15px 0', letterSpacing: '2px', color: '#fff' }}>{p.name}</h3>
                <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: '1.5', minHeight: '60px' }}>{p.desc}</p>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <span className="mono" style={{ fontSize: '0.7rem', color: '#666' }}>ACCESS COST</span>
                  <span className="mono" style={{ fontSize: '1.4rem', fontWeight: 'bold', color: isAffordable ? 'var(--ep)' : 'var(--lose)', textShadow: isAffordable ? '0 0 10px var(--ep)' : '0 0 10px var(--lose)' }}>
                    {p.cost}
                  </span>
                </div>
                
                <button 
                  className="btn-act" 
                  style={{ 
                    borderLeftColor: isAffordable ? pColor : '#444', 
                    opacity: isOpening ? 0.5 : 1,
                    background: 'rgba(0,0,0,0.4)',
                    padding: '15px 20px'
                  }}
                  onClick={() => handleBuy(p)}
                  disabled={isOpening}
                >
                  <span className="act-title" style={{ fontSize: '1rem', color: isAffordable ? '#fff' : '#555' }}>
                    {isAffordable ? 'PURCHASE ACCESS' : 'INSUFFICIENT FUNDS'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* OVERLAYS (Öffnen & Reveal) */}
      {isOpening && pulledCards.length === 0 && (
        <div className="pack-opening-center" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          
          <div className={`terminal-window ${openingTier === 'high' ? 'glitch-heavy' : ''}`} style={{
              width: '90%', maxWidth: '650px', height: '350px',
              border: `1px solid ${openingTier === 'high' ? 'var(--lose)' : '#00ff44'}`,
              backgroundColor: 'rgba(5, 5, 8, 0.95)',
              padding: '30px', fontFamily: "'Roboto Mono', monospace",
              display: 'flex', flexDirection: 'column',
              boxShadow: `inset 0 0 30px ${openingTier === 'high' ? 'rgba(255,0,50,0.1)' : 'rgba(0,255,68,0.05)'}, 0 0 50px ${openingTier === 'high' ? 'rgba(255,0,80,0.3)' : 'rgba(0,229,255,0.1)'}`,
              position: 'relative', overflow: 'hidden'
          }}>
            {/* Scanlines im Terminal */}
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)', pointerEvents: 'none' }}></div>
            
            <div style={{ color: openingTier === 'high' ? 'var(--lose)' : '#00ff44', borderBottom: `1px dashed ${openingTier === 'high' ? 'var(--lose)' : '#00ff44'}`, paddingBottom: '15px', marginBottom: '20px', fontSize: '1.2rem', letterSpacing: '4px', textShadow: `0 0 10px ${openingTier === 'high' ? 'var(--lose)' : '#00ff44'}` }}>
              {openingTier === 'high' ? '⚠ SYSTEM OVERRIDE IN PROGRESS ⚠' : 'SECURE DATA EXTRACTION...'}
            </div>
            
            <div style={{ color: '#00ff44', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', zIndex: 2 }}>
               <div style={{ opacity: 0, animation: 'fadeInLine 0.1s forwards 0.1s' }}> Establishing root access to node cluster... [OK]</div>
               <div style={{ opacity: 0, animation: 'fadeInLine 0.1s forwards 0.6s' }}> Bypassing ICE protocols... [SUCCESS]</div>
               <div style={{ opacity: 0, animation: 'fadeInLine 0.1s forwards 1.0s' }}> Extracting local datastream...</div>

               {openingTier === 'high' && (
                  <>
                    <div style={{ opacity: 0, animation: 'fadeInLine 0.1s forwards 1.4s', color: 'var(--apex-pink)', fontWeight: 'bold', marginTop: '10px' }}>
                       KERNEL PANIC: UNAUTHORIZED ASSET DETECTED!
                    </div>
                    <div style={{ opacity: 0, animation: 'fadeInLine 0.1s forwards 1.9s', color: 'var(--lose)', fontSize: '1.1rem', fontWeight: 900, textShadow: '0 0 10px var(--lose)' }}>
                       DECRYPTING CLASSIFIED PAYLOAD...
                    </div>
                  </>
               )}
               
               {openingTier === 'standard' && (
                  <div style={{ opacity: 0, animation: 'fadeInLine 0.1s forwards 1.6s', color: 'var(--win)', marginTop: '10px' }}>
                     Checksums verified. Revealing assets...
                  </div>
               )}
            </div>

            <div style={{ marginTop: 'auto', width: '100%', height: '15px', border: `1px solid ${openingTier === 'high' ? 'var(--lose)' : '#00ff44'}`, background: '#000', zIndex: 2 }}>
               <div style={{ height: '100%', background: openingTier === 'high' ? 'var(--lose)' : '#00ff44', animation: 'loadBar 2.5s cubic-bezier(0.1, 0.7, 1.0, 0.1) forwards', boxShadow: `0 0 15px ${openingTier === 'high' ? 'var(--lose)' : '#00ff44'}` }}></div>
            </div>
          </div>

          <style>{`
             @keyframes fadeInLine {
               0% { opacity: 0; transform: translateX(-10px); }
               100% { opacity: 1; transform: translateX(0); }
             }
             @keyframes loadBar {
               0% { width: 0%; }
               15% { width: 8%; }
               35% { width: 45%; }
               50% { width: 55%; }
               65% { width: 55%; }
               85% { width: 92%; }
               100% { width: 100%; }
             }
             .glitch-heavy {
               animation: cyberGlitch 0.4s infinite 1.4s;
             }
             @keyframes cyberGlitch {
               0% { transform: translate(0); }
               20% { transform: translate(-4px, 2px); }
               40% { transform: translate(-1px, -3px); }
               60% { transform: translate(4px, 1px); }
               80% { transform: translate(2px, -2px); }
               100% { transform: translate(0); }
             }
          `}</style>
        </div>
      )}

      {showFlash && <div className="screen-flash"></div>}

      {pulledCards.length > 0 && (
        <div className="reveal-container" style={{ 
          zIndex: 2000, position: 'fixed', inset: 0, background: 'rgba(5, 5, 12, 0.98)', 
          overflowY: 'auto', display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', padding: '40px 20px' 
        }}>
          <h2 className="reveal-title" style={{ flexShrink: 0, marginBottom: '40px' }}>ACCESS GRANTED</h2>
          <div className="pull-reveal-grid" style={{ 
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', 
            gap: '2vw', width: '100%', maxWidth: '1800px', marginBottom: '40px', flexShrink: 0 
          }}>
            {pulledCards.map((c, i) => {
              // Zählt, wie oft diese Karte im gesamten Inventar existiert
              const totalOwned = inventory.filter(inv => inv.name === c.name).length;
              
              return (
                <div key={i} className="pulled-card-wrapper" style={{ animationDelay: `${i * 0.2}s`, position: 'relative', width: 'clamp(140px, 18vw, 300px)', aspectRatio: '5/7', height: 'auto' }}>
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
          <button className="menu-btn btn-primary" style={{ flexShrink: 0, marginTop: '10px', maxWidth: '300px', zIndex: 100, padding: '15px 40px' }} onClick={closeReveal}>ÜBERNEHMEN</button>
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