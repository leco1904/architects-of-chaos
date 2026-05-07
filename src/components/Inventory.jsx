import React, { useState, useEffect } from 'react';
import Card, { getRarityClass } from './Card';
import { getSellValue } from '../logic/gameLogic';
import { playSound } from '../logic/audio';
import cardsData from '../data/cards.json'; 

function getMiniCardColor(card) {
  if (card?.type === 'apex')   return 'var(--apex-pink)';
  if (card?.type === 'legacy') return '#b8860b';
  if (card?.type === 'effect') return 'var(--eff-col)';
  const cls = getRarityClass(card?.gti ?? 0);
  if (cls === 'rarity-legendary') return 'var(--r-leg)';
  if (cls === 'rarity-epic')      return 'var(--r-epi)';
  if (cls === 'rarity-rare')      return 'var(--r-rar)';
  return 'transparent';
}

const MiniCard = ({ card, onClick, onRightClick, onHover, isFactionSynergyActive }) => {
  const rc = getMiniCardColor(card);
  return (
  <div 
    className={`mini-card-wrapper ${card.type === 'apex' ? 'is-apex-thumb' : card.type === 'legacy' ? 'is-legacy-thumb' : ''}`} 
    onClick={onClick} 
    onContextMenu={onRightClick}
    onMouseEnter={onHover}
    style={{
      borderColor: rc,
      background: `linear-gradient(135deg, ${rc}18, transparent)`,
      boxShadow: rc !== 'transparent' ? `0 0 8px ${rc}44` : 'none',
    }}
  >
    <div className="mini-card-scaler">
      <Card card={card} context="inventory" isFactionSynergyActive={isFactionSynergyActive} />
    </div>
  </div>
  );
};

const InspectorModal = ({ card, isInDeck, isEffect, onClose, onAdd, onRemove, isFactionSynergyActive }) => {
  const [gyroActive, setGyroActive] = useState(true);

  useEffect(() => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().catch(() => {});
    }
  }, []);

  return (
    <div className="glass-overlay active cinematic" style={{ zIndex: 99999 }}>
      <div className="inspector-modal-box">
        <button className="btn-back close-btn" onClick={onClose}>
          X SCHLIESSEN
        </button>
        
        <div className="inspector-card-scaler">
          <Card card={card} context="inventory" isInspecting={gyroActive} interactiveReveal={true} isFactionSynergyActive={isFactionSynergyActive} />
        </div>

        <div className="inspector-actions">
          {isInDeck ? (
            <button className="menu-btn btn-danger" style={{ maxWidth: '300px' }} onClick={() => { onRemove(card, isEffect); onClose(); }}>
              AUS DECK ENTFERNEN
            </button>
          ) : (
            <button className="menu-btn btn-primary" style={{ maxWidth: '300px' }} onClick={() => { onAdd(card); onClose(); }}>
              ZUM DECK HINZUFÜGEN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const UpgradeModal = ({ group, isEffect, onClose, onConfirm }) => {
  const [phase, setPhase] = useState('hidden'); 
  const [simCard, setSimCard] = useState(group.main);

  useEffect(() => {
    playSound('clash'); 
    const t0 = setTimeout(() => setPhase('entering'), 50); 
    const t1 = setTimeout(() => {
      playSound('win'); 
      setPhase('upgrading');
      // FIX: Nur das Level hochziehen, Card.jsx rechnet den Rest
      setSimCard(prev => ({ ...prev, level: (prev.level || 1) + 1 }));
    }, 1200); 
    const t2 = setTimeout(() => {
      setPhase('done');
    }, 2200); 
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [group]);

  return (
    <div className="glass-overlay cinematic active" style={{ zIndex: 9999 }}>
      <div className="game-title-small" style={{ fontSize: '2rem', marginBottom: '40px', opacity: phase === 'hidden' ? 0 : 1, transition: 'opacity 0.5s', letterSpacing: '8px', textAlign: 'center', color: phase === 'done' ? 'var(--win)' : '#fff', textShadow: phase === 'done' ? '0 0 15px var(--win)' : 'none' }}>
        {phase === 'done' ? 'UPGRADE ABGESCHLOSSEN' : 'SYSTEM-UPGRADE INITIALISIERT...'}
      </div>
      <div className={`upgrade-modal-card phase-${phase}`} style={{
        position: 'relative',
        transition: 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: phase === 'done' ? 'scale(1.15)' : (phase === 'upgrading' ? 'scale(1.05)' : 'scale(1)'),
        filter: (phase === 'done' || phase === 'upgrading') ? 'drop-shadow(0 0 40px var(--win))' : 'none',
        zIndex: 10
      }}>
        <Card card={simCard} context="inventory" />
        
        {/* Die Pfeil-Animation direkt im Modal */}
        {(phase === 'upgrading' || phase === 'done') && (
          <div className="mono" style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: '6rem', color: 'var(--win)', textShadow: '0 0 40px var(--win)',
            animation: 'pulse 0.5s infinite', pointerEvents: 'none', zIndex: 20
          }}>
                      </div>
        )}
      </div>
      <div style={{ height: '80px', marginTop: '60px', opacity: phase === 'done' ? 1 : 0, transition: 'opacity 0.5s', visibility: phase === 'done' ? 'visible' : 'hidden' }}>
        <button className="menu-btn btn-play modern-btn" onClick={() => { 
            onConfirm(group.main.name, isEffect); 
            onClose(); 
        }}>
            BESTÄTIGEN
        </button>
      </div>
    </div>
  );
};

const UpgradeCard = ({ group, isUpgrading, onInitiateUpgrade, onSell }) => {
  const { main, count } = group;
  const isEffect = main.type === 'effect';
  const isMax = main.level === 3;
  
  const canUpgrade = count >= 3 && !isMax && !isEffect;
  const canSell = count > 1 && (isMax || isEffect);
  const sellValue = getSellValue(main);

  return (
    <div className="upgrade-pod" style={{ position: 'relative' }}>
       <div className="upgrade-card-wrapper" style={{ 
          transition: 'all 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
          transform: isUpgrading ? 'translateY(-20px) scale(1.05)' : 'none',
          filter: isUpgrading ? 'drop-shadow(0 0 25px var(--win))' : 'none',
          zIndex: isUpgrading ? 10 : 1
       }}>
         <div className="mini-card-scaler">
            <Card card={main} context="inventory" />
         </div>
         <div className="count-badge mono">KOPIEN: {count}</div>
         
         {isUpgrading && (
            <div className="mono" style={{
              position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
              fontSize: '4rem', color: 'var(--win)', textShadow: '0 0 30px var(--win)',
              animation: 'pulse 0.3s infinite', pointerEvents: 'none', zIndex: 20
            }}>
              
            </div>
         )}
       </div>

       <div className="upgrade-actions" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
         {canUpgrade && (
            <button className="btn-act" style={{ width: '100%', borderLeftColor: 'var(--win)' }} onClick={() => onInitiateUpgrade(main.name, isEffect)}>
               <span className="act-title">LEVEL UP (3)</span>
            </button>
         )}
         
         {canSell && (
            <button className="btn-act" style={{ width: '100%', borderLeftColor: 'var(--ep)' }} onClick={(e) => onSell(main.name, isEffect, e)}>
               <span className="act-title">VERKAUFEN</span>
               <span className="act-cost mono" style={{ color: 'var(--ep)' }}>+{sellValue}💳</span>
            </button>
         )}

         {!canUpgrade && !canSell && (
            <button className="btn-act" style={{ width: '100%', borderLeftColor: '#444', opacity: 0.5, cursor: 'not-allowed' }} disabled>
               <span className="act-title" style={{ color: '#888' }}>ZU WENIG KOPIEN</span>
            </button>
         )}
       </div>
    </div>
  )
}

export default function Inventory({ inventory = [], setInventory, decks = [], setDecks, allFactions = [], onBack, onShowRules, onClearNew, onCreditGain, onMissionAction }) {
  const [search, setSearch] = useState('');
  const [factionFilter, setFactionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rating');
  const [mode, setMode] = useState('deck'); 
  const [mobileTab, setMobileTab] = useState('deck'); 
  
  const [activeEditId, setActiveEditId] = useState(decks.find(d => d.isActive)?.id || decks[0]?.id);
  const activeEditDeck = decks.find(d => d.id === activeEditId) || decks[0];

  const [activeUpgradeSession, setActiveUpgradeSession] = useState(null);
  const [inspectCard, setInspectCard] = useState(null); 
  const [upgradingCard, setUpgradingCard] = useState(null); // NEU: Animations-State 

  // --- NEU: 1-Click PC Logik ---
  const handleCardClick = (card, isEff, isDeck) => {
    playSound('click');
    onClearNew(card.name);
    // Wenn PC (Breite > 768px), sofort verschieben
    if (window.innerWidth > 768) {
      if (isDeck) handleRemoveCard(card, isEff);
      else handleAddCard(card);
    } else {
      // Wenn Handy, Modal öffnen
      setInspectCard({ data: card, isEff });
    }
  };

  const handleCardRightClick = (evt, card, isEff) => {
    evt.preventDefault(); // Verhindert das Browser-Kontextmenü
    playSound('click');
    onClearNew(card.name);
    setInspectCard({ data: card, isEff });
  };
  // -----------------------------

  const updateCurrentDeck = (updates) => {
      setDecks(prev => prev.map(d => d.id === activeEditId ? { ...d, ...updates } : d));
  };

  const createNewDeck = () => {
      playSound('click');
      const newId = 'deck-' + Date.now();
      setDecks(prev => [...prev, { id: newId, name: 'NEUES DECK', chars: [], effs: [], isActive: false }]);
      setActiveEditId(newId);
  };

  const renameDeck = () => {
      playSound('click');
      const newName = prompt('Wie soll das Deck heißen?', activeEditDeck.name);
      if (newName && newName.trim()) {
          updateCurrentDeck({ name: newName.trim().toUpperCase() });
      }
  };

  const setAsActive = () => {
      playSound('win');
      setDecks(prev => prev.map(d => ({ ...d, isActive: d.id === activeEditId })));
  };

  const deleteDeck = () => {
      playSound('error');
      if (decks.length <= 1) return alert("Du musst mindestens ein Deck besitzen!");
      if (window.confirm(`Möchtest du das Deck "${activeEditDeck.name}" wirklich löschen?`)) {
          const remaining = decks.filter(d => d.id !== activeEditId);
          if (activeEditDeck.isActive) remaining[0].isActive = true;
          setDecks(remaining);
          setActiveEditId(remaining[0].id);
      }
  };

  const safeChars = Array.isArray(activeEditDeck?.chars) ? activeEditDeck.chars : [];
  const safeEffs = Array.isArray(activeEditDeck?.effs) ? activeEditDeck.effs : [];
  const safeInv = Array.isArray(inventory) ? inventory : [];

  // NEU: Fraktionen für die Synergie im Deck Builder live berechnen
  const activeFactionsCounts = {};
  safeChars.forEach(c => {
    if (c && c.faction && c.type !== 'effect') activeFactionsCounts[c.faction] = (activeFactionsCounts[c.faction] || 0) + 1;
  });
  const activeFactions = Object.keys(activeFactionsCounts).filter(f => activeFactionsCounts[f] >= 3);

  const stats = {
    apex: safeChars.filter(c => c.type === 'apex').length,
    legacy: safeChars.filter(c => c.type === 'legacy').length,
    legendary: safeChars.filter(c => getRarityClass(c.gti) === 'rarity-legendary' && c.type !== 'apex' && c.type !== 'legacy').length,
    epic: safeChars.filter(c => getRarityClass(c.gti) === 'rarity-epic' && c.type !== 'apex' && c.type !== 'legacy').length
  };

  const handleAddCard = (card) => {
    playSound('click');
    if (card.type === 'effect') {
      if (safeEffs.length >= 3) return alert('Du hast bereits 3 Effekte im Deck!');
      if (safeEffs.some(c => c.name === card.name)) return alert('Diesen Effekt hast du bereits im Deck!');
      updateCurrentDeck({ effs: [...safeEffs, card] });
      return;
    }
    if (safeChars.length >= 12) return alert('Dein Charakter-Deck ist voll (12/12)!');
    if (safeChars.some(c => c.name === card.name)) return alert('Diesen Charakter hast du bereits im Deck!');

    if (card.type === 'apex' && stats.apex >= 1) return alert('Maximal 1 APEX Karte erlaubt!');
    if (card.type === 'legacy' && stats.legacy >= 1) return alert('Maximal 1 LEGACY Karte erlaubt!');
    if (card.type !== 'apex' && card.type !== 'legacy') {
      const rarity = getRarityClass(card.gti);
      if (rarity === 'rarity-legendary' && stats.legendary >= 3) return alert('Maximal 3 normale LEGENDARY Karten erlaubt!');
      if (rarity === 'rarity-epic' && stats.epic >= 3) return alert('Maximal 3 EPIC Karten erlaubt!');
    }
    updateCurrentDeck({ chars: [...safeChars, card] });
  };

  const handleRemoveCard = (card, isEffect) => {
    playSound('click');
    if (isEffect) {
      updateCurrentDeck({ effs: safeEffs.filter(c => c.name !== card.name) });
    } else {
      updateCurrentDeck({ chars: safeChars.filter(c => c.name !== card.name) });
    }
  };

  const clearDeck = () => { playSound('click'); updateCurrentDeck({ chars: [], effs: [] }); };

  const autoFill = () => {
      playSound('win');
      const grouped = getGroupedInventory();
      const sortedAvailableChars = Object.values(grouped).map(g => g.main).filter(c => c.type !== 'effect').sort((a,b) => (b.gti || 0) - (a.gti || 0));
      const selectedChars = [];
      let counts = { apex: 0, legacy: 0, legendary: 0, epic: 0 };

      for (const card of sortedAvailableChars) {
        if (selectedChars.length >= 12) break;
        const isApex = card.type === 'apex';
        const isLegacy = card.type === 'legacy';
        const rarity = getRarityClass(card.gti);

        if (isApex) {
          if (counts.apex >= 1) continue;
          counts.apex++;
        } else if (isLegacy) {
          if (counts.legacy >= 1) continue;
          counts.legacy++;
        } else if (rarity === 'rarity-legendary') {
          if (counts.legendary >= 3) continue;
          counts.legendary++;
        } else if (rarity === 'rarity-epic') {
          if (counts.epic >= 3) continue;
          counts.epic++;
        }
        selectedChars.push(card);
      }
      
      const bestEffs = Object.values(grouped).map(g => g.main).filter(c => c.type === 'effect').slice(0, 3);
      updateCurrentDeck({ chars: selectedChars, effs: bestEffs });
  };

  const getGroupedInventory = () => {
    const grouped = {};
    safeInv.forEach(c => {
        if (!grouped[c.name]) {
            grouped[c.name] = { main: { ...c }, count: 1, hasNew: c.isNew };
        } else {
            grouped[c.name].count++;
            if (c.isNew) grouped[c.name].hasNew = true;
            if ((c.level || 1) > (grouped[c.name].main.level || 1)) {
                grouped[c.name].main = { ...c }; 
            }
        }
    });
    Object.values(grouped).forEach(g => {
        if (g.hasNew) g.main.isNew = true;
    });
    return grouped;
  };

  const executeLevelUp = (cardName, isEffect) => {
      const grouped = getGroupedInventory();
      const group = grouped[cardName];
      if (!group || group.count < 3) return;

      const mainCard = group.main;
      const currentLevel = mainCard.level || 1;

      onMissionAction('upgrade', 1); 
      let removed = 0;
      let upgraded = false;
      
      // FIX: Wir bauen das Array neu auf, verbrennen exakt 2 Kopien und leveln die 3. auf!
      const finalInv = safeInv.reduce((acc, c) => {
          if (c.name === cardName) {
              if (removed < 2) {
                  removed++; // Verbrenne diese Kopie
                  return acc; 
              }
              if (!upgraded) {
                  upgraded = true; // Level diese Kopie auf!
                  acc.push({ ...c, level: currentLevel + 1 });
                  return acc;
              }
          }
          acc.push(c); // Alle anderen Karten unverändert übernehmen
          return acc;
      }, []);
      
      setInventory(finalInv);

      setDecks(prev => prev.map(d => ({
          ...d,
          chars: d.chars.map(c => c.name === cardName ? { ...c, level: currentLevel + 1 } : c),
          effs: d.effs.map(c => c.name === cardName ? { ...c, level: currentLevel + 1 } : c)
      })));
      
      // NEU: Inline-Animation triggern
      setUpgradingCard(cardName);
      setTimeout(() => setUpgradingCard(null), 1200);
  };

  const handleSell = (cardName, isEffect, e) => {
      const grouped = getGroupedInventory();
      const group = grouped[cardName];
      if (!group || group.count <= 1) return;

      const mainCard = group.main;
      playSound('click');
      onMissionAction('sell', 1); 
      
      let removed = false;
      const newInv = safeInv.filter(c => {
          if (!removed && c.name === cardName && c !== mainCard) {
              removed = true;
              return false; 
          }
          return true;
      });
      setInventory(newInv);
      onCreditGain(e.clientX, e.clientY, getSellValue(mainCard));
  };

  const sortLogic = (a, b) => {
    if (sortBy === 'new') {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
    }
    return (b.gti || 0) - (a.gti || 0);
  };

  const groupedInventory = getGroupedInventory();
  
  const totalCardsInGame = cardsData.characters.length + cardsData.effects.length;
  const currentCollected = Object.keys(groupedInventory).length;
  
  const hasUpgradesAvailable = Object.values(groupedInventory).some(g => g.count >= 3 && (g.main.level || 1) < 3 && g.main.type !== 'effect');

  const uniqueInvChars = Object.values(groupedInventory)
    .map(g => g.main)
    .filter(c => c.type !== 'effect' && !safeChars.some(dc => dc.name === c.name))
    .filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))
    .filter(c => factionFilter === 'ALL' || c.faction === factionFilter)
    .sort(sortLogic);

  const uniqueInvEffs = Object.values(groupedInventory)
    .map(g => g.main)
    .filter(c => c.type === 'effect' && !safeEffs.some(de => de.name === c.name))
    .filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))
    .sort(sortLogic);

  const sortedDeckChars = [...safeChars].sort((a, b) => (b.gti || 0) - (a.gti || 0));
  const isDeckValid = safeChars.length === 12 && safeEffs.length === 3;

  return (
    <div className="screen active inv-screen" style={{ display: 'flex', padding: '20px', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      
      {activeUpgradeSession && (
         <UpgradeModal 
            group={activeUpgradeSession.group} 
            isEffect={activeUpgradeSession.isEffect}
            onClose={() => setActiveUpgradeSession(null)}
            onConfirm={executeLevelUp}
         />
      )}

      {inspectCard && (
        <InspectorModal 
          card={inspectCard.data} 
          isEffect={inspectCard.isEff}
          isInDeck={inspectCard.isEff ? safeEffs.some(e => e.name === inspectCard.data.name) : safeChars.some(c => c.name === inspectCard.data.name)}
          onClose={() => setInspectCard(null)}
          onAdd={handleAddCard}
          onRemove={handleRemoveCard}
          isFactionSynergyActive={activeFactions.includes(inspectCard.data?.faction)}
        />
      )}

      <div className="top-bar" style={{ flexShrink: 0, width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
           <div className="game-title-small" style={{ color: mode === 'deck' ? 'var(--r-epi)' : 'var(--ep)', textShadow: `0 0 15px ${mode === 'deck' ? 'var(--r-epi)' : 'var(--ep)'}` }}>
              {mode === 'deck' ? 'INVENTAR & DECK-BUILDER' : 'UPGRADE LABOR'}
           </div>
           <div className="mono" style={{ fontSize: '0.8rem', color: '#aaa', letterSpacing: '1px' }}>
              SAMMLUNG: <span style={{ color: 'var(--win)' }}>{currentCollected} / {totalCardsInGame}</span> KARTEN
           </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: '#111', borderRadius: '8px', padding: '5px', display: 'flex', gap: '5px', marginRight: '20px' }}>
             <div style={{ position: 'relative', display: 'inline-block' }}>
               <button className="btn-info" style={{ borderColor: mode === 'deck' ? 'var(--win)' : '#444', color: mode === 'deck' ? '#fff' : '#888', background: mode === 'deck' ? 'rgba(0,229,255,0.2)' : 'transparent' }} onClick={() => { playSound('click'); setMode('deck'); }}>DECK MODUS</button>
               {safeInv.some(c => c.isNew) && <div className="notif-badge" style={{ background: 'var(--win)', boxShadow: '0 0 12px var(--win)', zIndex: 100, top: '-7px', right: '-7px' }}></div>}
             </div>
             
             <div style={{ position: 'relative', display: 'inline-block' }}>
               <button className="btn-info" style={{ borderColor: mode === 'upgrade' ? 'var(--ep)' : '#444', color: mode === 'upgrade' ? '#fff' : '#888', background: mode === 'upgrade' ? 'rgba(255,215,0,0.2)' : 'transparent' }} onClick={() => { playSound('click'); setMode('upgrade'); }}>
                  UPGRADE LAB
               </button>
               {hasUpgradesAvailable && <div className="notif-badge" style={{ background: 'var(--r-epi)', boxShadow: '0 0 12px var(--r-epi)', zIndex: 100, top: '-7px', right: '-7px' }}></div>}
             </div>
          </div>
          <button className="btn-info" onClick={onShowRules}>RULES</button>
          <button className="btn-back" onClick={onBack}>ZURÜCK</button>
        </div>
      </div>

      {mode === 'deck' ? (
        <div className="inv-dual-panel" style={{ display: 'flex', gap: '30px', height: 'calc(100% - 70px)', width: '100%', flexDirection: 'column' }}>
          
          <div className="mobile-tab-switcher">
            <button className={`tab-btn ${mobileTab === 'deck' ? 'active' : ''}`} onClick={() => { playSound('click'); setMobileTab('deck'); }}>
              MEIN DECK
            </button>
            <button className={`tab-btn ${mobileTab === 'pool' ? 'active' : ''}`} onClick={() => { playSound('click'); setMobileTab('pool'); }}>
              INVENTAR POOL
            </button>
          </div>

          <div style={{ display: 'flex', gap: '30px', flex: 1, overflow: 'hidden' }}>
            
            {/* DECK SPALTE */}
            <div className={`glass-panel inv-column mobile-tab-deck ${mobileTab === 'deck' ? 'active-tab' : ''}`}>
              <div style={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #333' }}>
                 <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                   <select value={activeEditId} onChange={e => setActiveEditId(e.target.value)} className="mono" style={{ padding: '8px', background: '#000', border: '1px solid var(--ep)', color: '#fff', outline: 'none', fontWeight: 'bold' }}>
                     {decks.map(d => <option key={d.id} value={d.id}>{d.name} {d.isActive ? '[AKTIV]' : ''}</option>)}
                   </select>
                   <button className="btn-info" onClick={createNewDeck}>+ NEU</button>
                   <button className="btn-info" onClick={renameDeck}>UMBENENNEN</button>
                   {!activeEditDeck.isActive && <button className="btn-info" style={{borderColor: 'var(--win)', color: 'var(--win)'}} onClick={setAsActive}>AKTIVIEREN</button>}
                   {decks.length > 1 && <button className="btn-back" style={{borderColor: 'var(--lose)', color: 'var(--lose)'}} onClick={deleteDeck}>LÖSCHEN</button>}
                 </div>

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginTop: '15px' }}>
                    <h2 style={{ color: '#fff', letterSpacing: '2px', margin: 0, fontSize: '1.2rem' }}>
                      DECK ({safeChars.length}/12 | {safeEffs.length}/3)
                    </h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn-info" style={{borderColor: 'var(--win)', color: 'var(--win)', padding: '4px 10px'}} onClick={autoFill}>AUTO-DECK</button>
                      <button className="btn-back" style={{borderColor: 'var(--lose)', color: 'var(--lose)', padding: '4px 10px'}} onClick={clearDeck}>CLEAR</button>
                    </div>
                 </div>

                 <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', color: '#aaa', flexWrap: 'wrap', fontWeight: 'bold', marginTop: '10px' }}>
                   <span style={{ color: stats.apex > 1 ? 'var(--lose)' : 'var(--apex-pink)' }}>APEX: {stats.apex}/1</span> |
                   <span style={{ color: stats.legacy > 1 ? 'var(--lose)' : 'var(--legacy-sepia)' }}>LEGACY: {stats.legacy}/1</span> |
                   <span style={{ color: stats.legendary > 3 ? 'var(--lose)' : 'var(--r-leg)' }}>LEGENDARY: {stats.legendary}/3</span> |
                   <span style={{ color: stats.epic > 3 ? 'var(--lose)' : 'var(--r-epi)' }}>EPIC: {stats.epic}/3</span>
                   {isDeckValid ? <span style={{ marginLeft: 'auto', color: 'var(--win)' }}>BEREIT ✓</span> : <span style={{ marginLeft: 'auto', color: 'var(--lose)' }}>UNVOLLSTÄNDIG ⚠</span>}
                 </div>
              </div>
              
              <h3 style={{color: '#888', margin: '0 0 15px 0'}}>CHARAKTERE</h3>
              <div className="mini-grid">
                {sortedDeckChars.map((c) => (
                  <MiniCard 
                    key={`deckc-${c.name}`} 
                    card={c} 
                    onClick={() => handleCardClick(c, false, true)} 
                    onRightClick={(evt) => handleCardRightClick(evt, c, false)} 
                    onHover={() => onClearNew(c.name)} 
                    isFactionSynergyActive={activeFactions.includes(c.faction)}
                  />
                ))}
              </div>
              <h3 style={{color: 'var(--eff-col)', margin: '20px 0 15px 0', borderTop: '1px dashed #333', paddingTop: '20px'}}>EFFEKTE</h3>
              <div className="mini-grid" style={{ paddingBottom: '30px' }}>
                {safeEffs.map((eff) => (
                  <MiniCard 
                    key={`decke-${eff.name}`} 
                    card={eff} 
                    onClick={() => handleCardClick(eff, true, true)} 
                    onRightClick={(evt) => handleCardRightClick(evt, eff, true)} 
                    onHover={() => onClearNew(eff.name)} 
                  />
                ))}
              </div>
            </div>

            {/* POOL SPALTE */}
            <div className={`glass-panel inv-column mobile-tab-pool ${mobileTab === 'pool' ? 'active-tab' : ''}`}>
              <div style={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #333' }}>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--win)', color: 'var(--win)', borderRadius: '4px', outline: 'none', fontWeight: 'bold' }}>
                       <option value="rating">NACH RATING</option>
                       <option value="new">NACH NEU</option>
                    </select>
                    <input type="text" placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.5)', border: '1px solid #444', color: '#fff', borderRadius: '4px', outline: 'none' }} />
                    <select value={factionFilter} onChange={e => setFactionFilter(e.target.value)} style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.5)', border: '1px solid #444', color: '#fff', borderRadius: '4px', outline: 'none' }}>
                       <option value="ALL">ALLE FRAKTIONEN</option>
                       {allFactions.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                    <h2 style={{ color: '#fff', letterSpacing: '2px', margin: 0, fontSize: '1.2rem' }}>INVENTAR POOL</h2>
                  </div>
              </div>

              {uniqueInvChars.length === 0 && uniqueInvEffs.length === 0 && <p style={{ color: '#555', marginTop: '20px' }}>Keine passenden Karten gefunden.</p>}
              
              <h3 style={{color: '#888', margin: '0 0 15px 0'}}>VERFÜGBARE CHARAKTERE</h3>
              <div className="mini-grid">
                {uniqueInvChars.map((c) => (
                  <MiniCard 
                    key={`invc-${c.name}`} 
                    card={c} 
                    onClick={() => handleCardClick(c, false, false)} 
                    onRightClick={(evt) => handleCardRightClick(evt, c, false)} 
                    onHover={() => onClearNew(c.name)} 
                    isFactionSynergyActive={activeFactions.includes(c.faction)}
                  />
                ))}
              </div>
              <h3 style={{color: 'var(--eff-col)', margin: '20px 0 15px 0', borderTop: '1px dashed #333', paddingTop: '20px'}}>VERFÜGBARE EFFEKTE</h3>
              <div className="mini-grid" style={{ paddingBottom: '30px' }}>
                {uniqueInvEffs.map((eff) => (
                  <MiniCard 
                    key={`inve-${eff.name}`} 
                    card={eff} 
                    onClick={() => handleCardClick(eff, true, false)} 
                    onRightClick={(evt) => handleCardRightClick(evt, eff, true)} 
                    onHover={() => onClearNew(eff.name)} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel inv-column" style={{ height: 'calc(100% - 70px)' }}>
          <h2 style={{ color: 'var(--ep)', letterSpacing: '2px', borderBottom: '1px solid #333', paddingBottom: '10px', textAlign: 'center' }}>
            KARTEN UPGRADEN & VERKAUFEN
          </h2>
          <p style={{textAlign: 'center', color: '#888', marginBottom: '30px'}}>Klicke auf LEVEL UP, um überschüssige Kopien zu verbrennen und die Stats der Karte dauerhaft zu verbessern (+2 auf alle Werte pro Level). Max Level Karten und Effekte können verkauft werden.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', justifyItems: 'center', gap: '40px', paddingBottom: '50px' }}>
            {Object.values(groupedInventory)
              .filter(g => (g.main.name || '').toLowerCase().includes(search.toLowerCase()) && (factionFilter === 'ALL' || g.main.faction === factionFilter))
              .sort(sortLogic)
              .sort((a,b) => b.count - a.count)
              .map((group, i) => (
                 <div key={i} onMouseEnter={() => onClearNew(group.main.name)}>
                    <UpgradeCard 
                       group={group} 
                       isUpgrading={upgradingCard === group.main.name}
                       onInitiateUpgrade={(name, isEff) => setActiveUpgradeSession({ group, isEffect: isEff })}
                       onSell={handleSell}
                    />
                 </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}