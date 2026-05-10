import React, { useState, useEffect, useMemo, memo } from 'react';
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

const MiniCard = memo(function MiniCard({ card, onClick, onRightClick, onHover, isFactionSynergyActive }) {
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
    <Card card={card} context="inventory" isFactionSynergyActive={isFactionSynergyActive} />
  </div>
  );
});

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

const UpgradeModal = ({ group, isEffect, fromLevel = 1, onClose, onConfirm }) => {
  const [phase, setPhase] = useState('hidden'); 
  // Animation startet auf fromLevel, springt dann auf fromLevel+1
  const [simCard, setSimCard] = useState({ ...group.main, level: fromLevel });

  const upgradeLabel = fromLevel === 1 ? 'LEVEL UP 1 → 2' : '★ PRESTIGE 2 → 3 ★';

  useEffect(() => {
    playSound('clash'); 
    const t0 = setTimeout(() => setPhase('entering'), 50); 
    const t1 = setTimeout(() => {
      playSound('win'); 
      setPhase('upgrading');
      setSimCard(prev => ({ ...prev, level: fromLevel + 1 }));
    }, 1200); 
    const t2 = setTimeout(() => {
      setPhase('done');
    }, 2200); 
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, [group, fromLevel]);

  return (
    <div className="glass-overlay cinematic active" style={{ zIndex: 9999 }}>
      <div className="game-title-small" style={{ fontSize: '2rem', marginBottom: '40px', opacity: phase === 'hidden' ? 0 : 1, transition: 'opacity 0.5s', letterSpacing: '8px', textAlign: 'center', color: phase === 'done' ? (fromLevel === 2 ? '#bc13fe' : 'var(--win)') : '#fff', textShadow: phase === 'done' ? `0 0 15px ${fromLevel === 2 ? '#bc13fe' : 'var(--win)'}` : 'none' }}>
        {phase === 'done' ? upgradeLabel + ' ABGESCHLOSSEN' : 'SYSTEM-UPGRADE INITIALISIERT...'}
      </div>
      <div className={`upgrade-modal-card phase-${phase}`} style={{
        position: 'relative', width: 'clamp(220px, 40vw, 360px)', aspectRatio: '5/7', margin: '0 auto',
        transition: 'all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        transform: phase === 'done' ? 'scale(1.1)' : (phase === 'upgrading' ? 'scale(1.05)' : 'scale(1)'),
        filter: (phase === 'done' || phase === 'upgrading') ? `drop-shadow(0 0 40px ${fromLevel === 2 ? '#bc13fe' : 'var(--win)'})` : 'none',
        zIndex: 10
      }}>
        <Card card={simCard} context="inventory" />
        
        {(phase === 'upgrading' || phase === 'done') && (
          <div className="mono" style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: '6rem', color: fromLevel === 2 ? '#bc13fe' : 'var(--win)', textShadow: `0 0 40px ${fromLevel === 2 ? '#bc13fe' : 'var(--win)'}`,
            animation: 'pulse 0.5s infinite', pointerEvents: 'none', zIndex: 20
          }}>
                      </div>
        )}
      </div>
      <div style={{ height: '80px', marginTop: '60px', opacity: phase === 'done' ? 1 : 0, transition: 'opacity 0.5s', visibility: phase === 'done' ? 'visible' : 'hidden' }}>
        <button className="menu-btn btn-play modern-btn" onClick={() => { 
            onConfirm(group.main.name, isEffect, fromLevel); 
            onClose(); 
        }}>
            BESTÄTIGEN
        </button>
      </div>
    </div>
  );
};

const UpgradeCard = ({ group, isUpgrading, onInitiateUpgrade, onSell }) => {
  const { main, count, countByLevel = {} } = group;
  const isEffect = main.type === 'effect';
  const isMax = (main.level || 1) >= 3;

  const countL1 = countByLevel[1] || 0;
  const countL2 = countByLevel[2] || 0;

  // L1→L2: braucht 3 LVL-1 Kopien
  const canUpgradeToL2 = countL1 >= 3;
  // L2→L3 (Prestige): braucht 3 LVL-2 Kopien
  const canUpgradeToL3 = countL2 >= 3;

  const canSell = count > 1 && (isMax || isEffect);
  const sellValue = getSellValue(main);

  // Tracks anzeigen wenn relevant
  const showL1Track = countL1 > 0 && !isMax;
  const showL2Track = (main.level || 1) >= 2 && !isMax;

  const TrackBar = ({ current, color }) => (
    <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${(Math.min(current, 3) / 3) * 100}%`, background: color, transition: 'width 0.4s ease' }} />
    </div>
  );

  return (
    <div className="upgrade-pod" style={{ position: 'relative' }}>
       <div className="upgrade-card-wrapper" style={{ 
          transition: 'all 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
          transform: isUpgrading ? 'translateY(-20px) scale(1.02)' : 'none',
          filter: isUpgrading ? 'drop-shadow(0 0 25px var(--win))' : 'none',
          zIndex: isUpgrading ? 10 : 1
       }}>
         <Card card={main} context="inventory" />
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

         {/* ── Track 1: LVL 1 → 2 ── */}
         {showL1Track && (
           <div style={{
             display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px',
             background: canUpgradeToL2 ? 'rgba(0,229,255,0.05)' : 'rgba(255,255,255,0.02)',
             border: `1px solid ${canUpgradeToL2 ? 'rgba(0,229,255,0.25)' : 'rgba(255,255,255,0.07)'}`,
             borderLeft: `3px solid ${canUpgradeToL2 ? 'var(--win)' : '#333'}`,
           }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span className="mono" style={{ fontSize: '0.58rem', color: canUpgradeToL2 ? 'var(--win)' : '#555', letterSpacing: '2px' }}>LVL 1 → 2</span>
               <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 'bold', color: canUpgradeToL2 ? 'var(--win)' : '#444' }}>
                 {Math.min(countL1, 3)}/3 LVL-1
               </span>
             </div>
             <TrackBar current={countL1} color={canUpgradeToL2 ? 'var(--win)' : '#333'} />
             {canUpgradeToL2 && (
               <button className="btn-act" style={{ width: '100%', borderLeftColor: 'var(--win)', marginTop: '4px' }} onClick={() => onInitiateUpgrade(main.name, isEffect, 1)}>
                 <span className="act-title">LEVEL UP (1→2)</span>
               </button>
             )}
           </div>
         )}

         {/* ── Track 2: LVL 2 → 3 (Prestige) ── */}
         {showL2Track && (
           <div style={{
             display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px',
             background: canUpgradeToL3 ? 'rgba(188,19,254,0.06)' : 'rgba(255,255,255,0.02)',
             border: `1px solid ${canUpgradeToL3 ? 'rgba(188,19,254,0.35)' : 'rgba(255,255,255,0.07)'}`,
             borderLeft: `3px solid ${canUpgradeToL3 ? '#bc13fe' : '#333'}`,
           }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span className="mono" style={{ fontSize: '0.58rem', color: canUpgradeToL3 ? '#bc13fe' : '#555', letterSpacing: '2px' }}>LVL 2 → 3 ★</span>
               <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 'bold', color: canUpgradeToL3 ? '#bc13fe' : '#444' }}>
                 {Math.min(countL2, 3)}/3 LVL-2
               </span>
             </div>
             <TrackBar current={countL2} color={canUpgradeToL3 ? '#bc13fe' : '#333'} />
             {!canUpgradeToL3 && (
               <span className="mono" style={{ fontSize: '0.52rem', color: '#444', letterSpacing: '1px', marginTop: '2px' }}>
                 Noch {3 - Math.min(countL2, 3)} LVL-2 Kopie{3 - Math.min(countL2, 3) !== 1 ? 'n' : ''} benötigt
               </span>
             )}
             {canUpgradeToL3 && (
               <button className="btn-act" style={{ width: '100%', borderLeftColor: '#bc13fe', marginTop: '4px' }} onClick={() => onInitiateUpgrade(main.name, isEffect, 2)}>
                 <span className="act-title" style={{ color: '#bc13fe' }}>PRESTIGE (2→3)</span>
               </button>
             )}
           </div>
         )}

         {canSell && (
            <button className="btn-act" style={{ width: '100%', borderLeftColor: 'var(--ep)' }} onClick={(e) => onSell(main.name, isEffect, e)}>
               <span className="act-title">VERKAUFEN</span>
               <span className="act-cost mono" style={{ color: 'var(--ep)' }}>+{sellValue}💳</span>
            </button>
         )}

         {!showL1Track && !showL2Track && !canSell && (
            <button className="btn-act" style={{ width: '100%', borderLeftColor: '#333', opacity: 0.5, cursor: 'not-allowed' }} disabled>
               <span className="act-title" style={{ color: '#555' }}>
                 {isMax ? 'MAX LEVEL ✓' : 'ZU WENIG KOPIEN'}
               </span>
            </button>
         )}
       </div>
    </div>
  );
};

export default function Inventory({ inventory = [], setInventory, decks = [], setDecks, allFactions = [], credits, username, onBack, onOpenShop, onClearNew, onCreditGain, onMissionAction }) {  const [search, setSearch] = useState('');
  const [factionFilter, setFactionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rating');
  const [mode, setMode] = useState('deck'); 
  const [mobileTab, setMobileTab] = useState('deck'); 
  
  const [deckTab,  setDeckTab]  = useState('chars');    // 'chars' | 'taktiken'
  const [poolTab,  setPoolTab]  = useState('chars');    // 'chars' | 'taktiken'

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
        const lvl = c.level || 1;
        if (!grouped[c.name]) {
            grouped[c.name] = { main: { ...c }, count: 1, hasNew: c.isNew, countByLevel: { [lvl]: 1 } };
        } else {
            grouped[c.name].count++;
            // NEU: Kopien pro Level zählen – Basis für das zweistufige Upgrade-System
            grouped[c.name].countByLevel[lvl] = (grouped[c.name].countByLevel[lvl] || 0) + 1;
            if (c.isNew) grouped[c.name].hasNew = true;
            if (lvl > (grouped[c.name].main.level || 1)) {
                grouped[c.name].main = { ...c }; 
            }
        }
    });
    Object.values(grouped).forEach(g => {
        if (g.hasNew) g.main.isNew = true;
    });
    return grouped;
  };

  const executeLevelUp = (cardName, isEffect, fromLevel = 1) => {
      const grouped = getGroupedInventory();
      const group = grouped[cardName];
      if (!group) return;

      // Sicherheitsprüfung: Genug Kopien auf dem Quell-Level?
      const countAtLevel = group.countByLevel?.[fromLevel] || 0;
      if (countAtLevel < 3) return;

      const nextLevel = fromLevel + 1;
      onMissionAction('upgrade', 1); 

      let burned = 0;
      let upgraded = false;
      
      // Verbrenne exakt 2 Kopien vom fromLevel und upgrade die 3. auf nextLevel
      const finalInv = safeInv.reduce((acc, c) => {
          if (c.name === cardName && (c.level || 1) === fromLevel) {
              if (burned < 2) { burned++; return acc; }
              if (!upgraded) {
                  upgraded = true;
                  acc.push({ ...c, level: nextLevel });
                  return acc;
              }
          }
          acc.push(c);
          return acc;
      }, []);
      
      setInventory(finalInv);

      // Decks updaten: nur Karten auf fromLevel werden hochgestuft
      setDecks(prev => prev.map(d => ({
          ...d,
          chars: d.chars.map(c => (c.name === cardName && (c.level || 1) === fromLevel) ? { ...c, level: nextLevel } : c),
          effs:  d.effs.map(c => (c.name === cardName && (c.level || 1) === fromLevel) ? { ...c, level: nextLevel } : c)
      })));
      
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

  const groupedInventory = useMemo(() => getGroupedInventory(), [safeInv]);
  
  const totalCardsInGame = cardsData.characters.length + cardsData.effects.length;
  const currentCollected = Object.keys(groupedInventory).length;
  
  const hasUpgradesAvailable = useMemo(() =>
    Object.values(groupedInventory).some(g => {
      const c1 = g.countByLevel?.[1] || 0;
      const c2 = g.countByLevel?.[2] || 0;
      return c1 >= 3 || c2 >= 3;
    }),
    [groupedInventory]
  );

  const uniqueInvChars = useMemo(() =>
    Object.values(groupedInventory)
      .map(g => g.main)
      .filter(c => c.type !== 'effect' && !safeChars.some(dc => dc.name === c.name))
      .filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))
      .filter(c => factionFilter === 'ALL' || c.faction === factionFilter)
      .sort(sortLogic),
    [groupedInventory, safeChars, search, factionFilter, sortBy]
  );

  const uniqueInvEffs = useMemo(() =>
    Object.values(groupedInventory)
      .map(g => g.main)
      .filter(c => c.type === 'effect' && !safeEffs.some(de => de.name === c.name))
      .filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()))
      .sort(sortLogic),
    [groupedInventory, safeEffs, search, sortBy]
  );

  const sortedDeckChars = useMemo(() =>
    [...safeChars].sort((a, b) => (b.gti || 0) - (a.gti || 0)),
    [safeChars]
  );
  const isDeckValid = safeChars.length === 12 && safeEffs.length === 3;

  return (
    <div className="command-center-layout inv-screen" style={{ display: 'flex', flexDirection: 'column', padding: '60px 40px 20px', gap: '10px', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      
      {/* VIEWPORT FRAMING */}
      <div className="hud-bracket tl"></div>
      <div className="hud-bracket bl"></div>
      <div className="hud-bracket br"></div>

      {activeUpgradeSession && (
         <UpgradeModal 
            group={activeUpgradeSession.group} 
            isEffect={activeUpgradeSession.isEffect}
            fromLevel={activeUpgradeSession.fromLevel || 1}
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

      {/* HEADER: HUD STATUS BAR (Stack Design) */}
      <div style={{ position: 'absolute', top: '15px', right: '35px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', zIndex: 1000 }}>
        
        {/* ZEILE 1: GLOBAL HUD (Genaue Kopie vom Hauptmenü) */}
        <div style={{ display: 'flex', filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}>
          <div className="hud-status-module funds" onClick={() => { playSound('click'); onOpenShop && onOpenShop(); }} title="Shop öffnen" style={{ cursor: 'pointer', transition: '0.3s' }}>
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

        {/* ZEILE 2: CONTEXT HUD (Inventar-Spezifisch) */}
        <div style={{ display: 'flex', filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}>
          <div className="hud-status-module funds" onClick={() => { playSound('click'); setMode('deck'); }} style={{ borderColor: mode === 'deck' ? 'var(--win)' : 'rgba(255,255,255,0.1)', color: mode === 'deck' ? '#fff' : '#888', background: mode === 'deck' ? 'rgba(0,229,255,0.15)' : 'rgba(10,10,15,0.85)', cursor: 'pointer', transition: '0.3s', position: 'relative' }}>
            <span className="hud-label" style={{ color: mode === 'deck' ? 'var(--win)' : '#888' }}>MODE</span>
            <span className="hud-value" style={{ fontSize: '0.8rem' }}>DECK</span>
            {safeInv.some(c => c.isNew) && <div className="notif-badge" style={{ background: 'var(--win)', boxShadow: '0 0 12px var(--win)', top: '-5px', right: '5px' }}></div>}
          </div>
          <div className="hud-status-module agent" onClick={() => { playSound('click'); setMode('upgrade'); }} style={{ borderColor: mode === 'upgrade' ? 'var(--ep)' : 'rgba(255,255,255,0.1)', color: mode === 'upgrade' ? '#fff' : '#888', background: mode === 'upgrade' ? 'rgba(255,215,0,0.15)' : 'rgba(10,10,15,0.85)', cursor: 'pointer', transition: '0.3s', position: 'relative', borderRight: '1px solid rgba(255,255,255,0.1)', clipPath: 'none', marginLeft: '-5px' }}>
            <span className="hud-label" style={{ color: mode === 'upgrade' ? 'var(--ep)' : '#888' }}>MODE</span>
            <span className="hud-value" style={{ fontSize: '0.8rem' }}>UPGRADE</span>
            {hasUpgradesAvailable && <div className="notif-badge" style={{ background: 'var(--r-epi)', boxShadow: '0 0 12px var(--r-epi)', top: '-5px', right: '5px' }}></div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
         <div className="ops-header" style={{ fontSize: '1.4rem', color: mode === 'deck' ? 'var(--win)' : 'var(--ep)', textShadow: `0 0 10px ${mode === 'deck' ? 'var(--win)' : 'var(--ep)'}` }}>
            [ {mode === 'deck' ? 'INVENTORY & DECK-BUILDER' : 'UPGRADE LABORATORY'} ]
         </div>
         <div className="mono" style={{ fontSize: '0.8rem', color: '#aaa', letterSpacing: '1px' }}>
            // EXTRACTED ASSETS: <span style={{ color: 'var(--win)' }}>{currentCollected} / {totalCardsInGame}</span> LOGGED
         </div>
      </div>

      {mode === 'deck' ? (
        <div className="inv-dual-panel" style={{ display: 'flex', gap: '30px', flex: 1, minHeight: 0, width: '100%', flexDirection: 'column' }}>
          
          <div className="mobile-tab-switcher">
            <button className={`tab-btn ${mobileTab === 'deck' ? 'active' : ''}`} onClick={() => { playSound('click'); setMobileTab('deck'); }}>
              MEIN DECK
            </button>
            <button className={`tab-btn ${mobileTab === 'pool' ? 'active' : ''}`} onClick={() => { playSound('click'); setMobileTab('pool'); }}>
              INVENTAR POOL
            </button>
          </div>

          <div className="inv-content-wrapper" style={{ display: 'flex', gap: '30px', flex: 1, minHeight: 0 }}>
            
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

                 <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: '#aaa', flexWrap: 'wrap', fontWeight: 'bold', marginTop: '10px', lineHeight: '1.4' }}>
                   <span style={{ color: stats.apex > 1 ? 'var(--lose)' : 'var(--apex-pink)' }}>APEX: {stats.apex}/1</span>
                   <span style={{ color: '#444' }}>|</span>
                   <span style={{ color: stats.legacy > 1 ? 'var(--lose)' : 'var(--legacy-sepia)' }}>LEGACY: {stats.legacy}/1</span>
                   <span style={{ color: '#444' }}>|</span>
                   <span style={{ color: stats.legendary > 3 ? 'var(--lose)' : 'var(--r-leg)' }}>LEGENDARY: {stats.legendary}/3</span>
                   <span style={{ color: '#444' }}>|</span>
                   <span style={{ color: stats.epic > 3 ? 'var(--lose)' : 'var(--r-epi)' }}>EPIC: {stats.epic}/3</span>
                   {isDeckValid ? <span style={{ marginLeft: 'auto', color: 'var(--win)' }}>BEREIT ✓</span> : <span style={{ marginLeft: 'auto', color: 'var(--lose)' }}>UNVOLLSTÄNDIG ⚠</span>}
                 </div>
              </div>

              {/* DECK SUB-TABS */}
              <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid #333' }}>
                <button
                  onClick={() => { playSound('click'); setDeckTab('chars'); }}
                  style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', borderBottom: deckTab === 'chars' ? '2px solid #888' : '2px solid transparent', color: deckTab === 'chars' ? '#fff' : '#555', fontFamily: "'Roboto Mono', monospace", fontSize: '0.75rem', letterSpacing: '2px', cursor: 'pointer', transition: '0.2s' }}
                >
                  CHARAKTERE ({safeChars.length}/12)
                </button>
                <button
                  onClick={() => { playSound('click'); setDeckTab('taktiken'); }}
                  style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', borderBottom: deckTab === 'taktiken' ? `2px solid var(--eff-col)` : '2px solid transparent', color: deckTab === 'taktiken' ? 'var(--eff-col)' : '#555', fontFamily: "'Roboto Mono', monospace", fontSize: '0.75rem', letterSpacing: '2px', cursor: 'pointer', transition: '0.2s' }}
                >
                  TAKTIKEN ({safeEffs.length}/3)
                </button>
              </div>

              {deckTab === 'chars' && (
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
              )}

              {deckTab === 'taktiken' && (
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
                  {safeEffs.length === 0 && (
                    <p className="mono" style={{ color: '#555', fontSize: '0.75rem', letterSpacing: '1px' }}>KEINE TAKTIKEN IM DECK</p>
                  )}
                </div>
              )}
            </div>

            {/* POOL SPALTE */}
            <div className={`glass-panel inv-column mobile-tab-pool ${mobileTab === 'pool' ? 'active-tab' : ''}`}>
              <div style={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #333' }}>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start', flexWrap: 'wrap', width: '100%' }}>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--win)', color: 'var(--win)', borderRadius: '4px', outline: 'none', fontWeight: 'bold' }}>
                       <option value="rating">NACH RATING</option>
                       <option value="new">NACH NEU</option>
                    </select>
                    <input type="text" placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.5)', border: '1px solid #444', color: '#fff', borderRadius: '4px', outline: 'none' }} />
                    {poolTab === 'chars' && (
                      <select value={factionFilter} onChange={e => setFactionFilter(e.target.value)} style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.5)', border: '1px solid #444', color: '#fff', borderRadius: '4px', outline: 'none' }}>
                         <option value="ALL">ALLE FRAKTIONEN</option>
                         {allFactions.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    )}
                    
                    {/* NEU: ALLES GESEHEN BUTTON */}
                    {safeInv.some(c => c.isNew) && (
                      <button className="btn-info" style={{ borderColor: 'var(--win)', color: 'var(--win)', marginLeft: 'auto' }} onClick={() => {
                         playSound('click');
                         setInventory(prev => prev.map(c => ({...c, isNew: false})));
                         setDecks(prev => prev.map(d => ({ ...d, chars: d.chars.map(c => ({...c, isNew: false})), effs: d.effs.map(c => ({...c, isNew: false})) })));
                      }}>✓ ALLES GESEHEN</button>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                    <h2 style={{ color: '#fff', letterSpacing: '2px', margin: 0, fontSize: '1.2rem' }}>INVENTAR POOL</h2>
                  </div>
              </div>

              {/* POOL SUB-TABS */}
              <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid #333' }}>
                <button
                  onClick={() => { playSound('click'); setPoolTab('chars'); }}
                  style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', borderBottom: poolTab === 'chars' ? '2px solid #888' : '2px solid transparent', color: poolTab === 'chars' ? '#fff' : '#555', fontFamily: "'Roboto Mono', monospace", fontSize: '0.75rem', letterSpacing: '2px', cursor: 'pointer', transition: '0.2s' }}
                >
                  CHARAKTERE ({uniqueInvChars.length})
                </button>
                <button
                  onClick={() => { playSound('click'); setPoolTab('taktiken'); }}
                  style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', borderBottom: poolTab === 'taktiken' ? `2px solid var(--eff-col)` : '2px solid transparent', color: poolTab === 'taktiken' ? 'var(--eff-col)' : '#555', fontFamily: "'Roboto Mono', monospace", fontSize: '0.75rem', letterSpacing: '2px', cursor: 'pointer', transition: '0.2s' }}
                >
                  TAKTIKEN ({uniqueInvEffs.length})
                </button>
              </div>

              {poolTab === 'chars' && (
                <>
                  {uniqueInvChars.length === 0 && <p style={{ color: '#555', marginTop: '20px' }}>Keine passenden Karten gefunden.</p>}
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
                </>
              )}

              {poolTab === 'taktiken' && (
                <>
                  {uniqueInvEffs.length === 0 && <p style={{ color: '#555', marginTop: '20px' }}>Keine passenden Taktiken gefunden.</p>}
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
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel inv-column" style={{ flex: 1, minHeight: 0 }}>
          <h2 style={{ color: 'var(--ep)', letterSpacing: '2px', borderBottom: '1px solid #333', paddingBottom: '10px', textAlign: 'center' }}>
            KARTEN UPGRADEN & VERKAUFEN
          </h2>
          <p style={{textAlign: 'center', color: '#888', marginBottom: '30px'}}>
            <b style={{color:'var(--win)'}}>LVL 1 → 2:</b> 3× LVL-1 Kopien (verbrennt 2, upgraded 1). &nbsp;
            <b style={{color:'#bc13fe'}}>LVL 2 → 3 (PRESTIGE):</b> 3× LVL-2 Kopien = insgesamt 9 Basiskarten. &nbsp;
            Charaktere: +2 auf alle Stats. Taktiken: +2 Boost & +4 Synergie pro Level.
          </p>
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
                       onInitiateUpgrade={(name, isEff, fromLevel) => setActiveUpgradeSession({ group, isEffect: isEff, fromLevel })}
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