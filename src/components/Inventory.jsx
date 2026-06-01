import React, { useState, useEffect, useMemo, memo } from 'react';
import { Settings } from 'lucide-react';
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

const MiniCard = memo(function MiniCard({ card, onClick, onRightClick, onHover, activeFactions = [] }) {
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
    <Card card={card} context="inventory" activeFactions={activeFactions} />
  </div>
  );
}, (prev, next) => 
  prev.card.name === next.card.name && 
  prev.card.level === next.card.level && 
  prev.card.isNew === next.card.isNew && 
  JSON.stringify(prev.activeFactions) === JSON.stringify(next.activeFactions)
);

const InspectorModal = ({ card, isInDeck, isEffect, onClose, onAdd, onRemove, activeFactions = [] }) => {
  const [gyroActive, setGyroActive] = useState(true);

  useEffect(() => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().catch(() => {});
    }
  }, []);

  return (
    <div 
      className="glass-overlay active cinematic" 
      style={{ zIndex: 99999, cursor: 'zoom-out' }} 
      // Sicherer Check: Schließe nur, wenn exakt auf den Hintergrund geklickt wurde
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* MOBILE OPTIMIZATION START: Full-width Modal auf Mobile */}
      <div className="inspector-modal-box" style={{
        cursor: 'default',
        /* Mobile styles werden über CSS-Klasse gesteuert */
      }}>
        <button className="btn-back close-btn" onClick={onClose}>
          X SCHLIESSEN
        </button>
        
        <div className="inspector-card-scaler">
          <Card card={card} context="inventory" isInspecting={gyroActive} interactiveReveal={true} activeFactions={activeFactions} />
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

const UpgradeCard = memo(function UpgradeCard({ group, isUpgrading, onInitiateUpgrade, onSell }) {
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
    <div className="upgrade-pod" style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: '220px' }}>
       <div className="upgrade-card-wrapper" style={{ 
          transition: 'all 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
          transform: isUpgrading ? 'translateY(-20px) scale(1.02)' : 'none',
          filter: isUpgrading ? 'drop-shadow(0 0 25px var(--win))' : 'none',
          zIndex: isUpgrading ? 10 : 1,
          position: 'relative',
          width: '220px', height: '308px' /* FIX: Harte Dimensionen für ALLE Karten */
       }}>
         <div style={{ borderRadius: '12px', overflow: 'hidden', width: '100%', height: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>
             <div style={{ transform: 'scale(0.611)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                <Card card={main} context="inventory" />
             </div>
         </div>
         
         <div className="count-badge mono" style={{ position: 'absolute', top: '-10px', left: '-10px', zIndex: 5 }}>KOPIEN: {count}</div>
         
         {isUpgrading && (
            <div className="mono" style={{
              position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
              fontSize: '4rem', color: 'var(--win)', textShadow: '0 0 30px var(--win)',
              animation: 'pulse 0.3s infinite', pointerEvents: 'none', zIndex: 20
            }}>
              
            </div>
         )}
       </div>

       {/* FIX: minHeight statt height:100% verhindert hässliches in-die-Länge-ziehen */}
       <div className="upgrade-actions" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '135px', justifyContent: 'flex-start' }}>

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
}, (prev, next) => 
  prev.group.main.name === next.group.main.name && 
  prev.group.count === next.group.count && 
  prev.group.main.level === next.group.main.level && 
  prev.isUpgrading === next.isUpgrading
);

export default function Inventory({ inventory = [], setInventory, decks = [], setDecks, allFactions = [], credits, username, onBack, onOpenShop, onClearNew, onCreditGain, onMissionAction }) {
  const [search, setSearch] = useState('');
  const [factionFilter, setFactionFilter] = useState('ALL');
  // NEU: Internes Warnsystem statt Browser-Alerts
  const [uiWarning, setUiWarning] = useState(null);

  useEffect(() => {
    if (uiWarning) {
      const t = setTimeout(() => setUiWarning(null), 3000);
      return () => clearTimeout(t);
    }
  }, [uiWarning]);

  const triggerWarning = (msg) => {
    playSound('error');
    setUiWarning(msg);
  };
  const [sortBy, setSortBy] = useState('rating');
  const [mode, setMode] = useState('deck'); 
  const [mobileTab, setMobileTab] = useState('deck'); 

  /* MOBILE OPTIMIZATION START */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.matchMedia('(max-width: 768px)').matches ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };
    checkMobile();
    const mq = window.matchMedia('(max-width: 768px)');
    if (mq.addEventListener) mq.addEventListener('change', checkMobile);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', checkMobile); };
  }, []);
  /* MOBILE OPTIMIZATION END */
  
  const [deckTab,  setDeckTab]  = useState('chars');    // 'chars' | 'taktiken'
  const [poolTab,  setPoolTab]  = useState('chars');    // 'chars' | 'taktiken'

  const [activeEditId, setActiveEditId] = useState(decks.find(d => d.isActive)?.id || decks[0]?.id);
  const activeEditDeck = decks.find(d => d.id === activeEditId) || decks[0];

  // FIX: Hier definieren wir alle Modal- und Upgrade-States, die verschwunden waren!
  const [activeUpgradeSession, setActiveUpgradeSession] = useState(null); 
  const [inspectCard, setInspectCard] = useState(null); 
  const [upgradingCard, setUpgradingCard] = useState(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameInputValue, setRenameInputValue] = useState('');

  const handleRenameConfirm = () => {
      playSound('click');
      if (renameInputValue.trim()) {
          updateCurrentDeck({ name: renameInputValue.trim().toUpperCase() });
      }
      setRenameModalOpen(false);
  }; 

  // --- GHOST-SPEED: 1-Klick Deckbau ---
  const handleCardClick = (card, isEff, isDeck) => {
    playSound('click');
    onClearNew(card.name);
    
    // Sofortige Aktion ohne Zwischen-Modal
    if (isDeck) {
      handleRemoveCard(card, isEff);
    } else {
      handleAddCard(card);
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
      setRenameInputValue(activeEditDeck.name);
      setRenameModalOpen(true);
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

  // NEU: Fraktionen für die Synergie im Deck Builder live berechnen (Array-sicher)
  const activeFactionsCounts = {};
  safeChars.forEach(c => {
    if (c && c.faction && c.type !== 'effect') {
        const facs = Array.isArray(c.faction) ? c.faction : [c.faction];
        facs.forEach(f => {
            const fac = f.trim().toUpperCase();
            activeFactionsCounts[fac] = (activeFactionsCounts[fac] || 0) + 1;
        });
    }
  });
  const activeFactions = Object.keys(activeFactionsCounts).filter(f => activeFactionsCounts[f] >= 3);

  const stats = {
        apexAnomaly: safeChars.filter(c => c.type === 'apex' || c.type === 'anomaly').length,
        legacy: safeChars.filter(c => c.type === 'legacy').length,
        legendary: safeChars.filter(c => getRarityClass(c.gti) === 'rarity-legendary' && c.type !== 'apex' && c.type !== 'legacy' && c.type !== 'anomaly').length,
        epic: safeChars.filter(c => getRarityClass(c.gti) === 'rarity-epic' && c.type !== 'apex' && c.type !== 'legacy' && c.type !== 'anomaly').length,
        rare: safeChars.filter(c => getRarityClass(c.gti) === 'rarity-rare' && c.type !== 'apex' && c.type !== 'legacy' && c.type !== 'anomaly').length
      };

      // FIX: Stale Closure Workaround für hoch-optimierte MiniCards
      const activeEditIdRef = React.useRef(activeEditId);
      const deckStateRef = React.useRef({ safeChars, safeEffs, stats });

      useEffect(() => {
        activeEditIdRef.current = activeEditId;
        deckStateRef.current = { safeChars, safeEffs, stats };
      }, [activeEditId, safeChars, safeEffs, stats]);

      const handleAddCard = (card) => {
        playSound('click');
        // Zieht immer den aktuellsten Stand, selbst wenn der Button-Click gecacht ist
        const { safeChars, safeEffs, stats } = deckStateRef.current;

        if (card.type === 'effect') {
          if (safeEffs.length >= 3) return triggerWarning('TAKTIK-LIMIT ERREICHT (MAX 3)');
          if (safeEffs.some(c => c.name === card.name)) return triggerWarning('TAKTIK BEREITS IM DECK');
          setDecks(prev => prev.map(d => d.id === activeEditIdRef.current ? { ...d, effs: [...d.effs, card] } : d));
          return;
        }
        if (safeChars.length >= 12) return triggerWarning('AGENTEN-LIMIT ERREICHT (12/12)');
        if (safeChars.some(c => c.name === card.name)) return triggerWarning('AGENT BEREITS IM DECK');

        // NEU: Max 2 Apex/Anomaly erlaubt!
        if ((card.type === 'apex' || card.type === 'anomaly') && stats.apexAnomaly >= 2) return triggerWarning('LIMIT: MAX 2 APEX/ANOMALY');
        
        const rarity = (card.type !== 'apex' && card.type !== 'legacy' && card.type !== 'anomaly') ? getRarityClass(card.gti) : null;

        // NEU: Legacy und Legendary teilen sich das Limit von 4! Egal welche Kombination.
        if ((card.type === 'legacy' || rarity === 'rarity-legendary') && (stats.legacy + stats.legendary) >= 4) {
            return triggerWarning('LIMIT: MAX 4 LEG/LEGACY AGENTEN');
        }
        
        if (card.type !== 'apex' && card.type !== 'legacy' && card.type !== 'anomaly') {
          if (rarity === 'rarity-epic' && stats.epic >= 3) return triggerWarning('LIMIT: MAX 3 EPIC AGENTEN');
          if (rarity === 'rarity-rare' && stats.rare >= 3) return triggerWarning('LIMIT: MAX 3 RARE AGENTEN');
        }
        
        setDecks(prev => prev.map(d => d.id === activeEditIdRef.current ? { ...d, chars: [...d.chars, card] } : d));
      };

      const handleRemoveCard = (card, isEffect) => {
        playSound('click');
        setDecks(prev => prev.map(d => {
           if (d.id === activeEditIdRef.current) {
              if (isEffect) {
                 return { ...d, effs: d.effs.filter(c => c.name !== card.name) };
              } else {
                 return { ...d, chars: d.chars.filter(c => c.name !== card.name) };
              }
           }
           return d;
        }));
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
        const isApex = card.type === 'apex' || card.type === 'anomaly';
        const isLegacy = card.type === 'legacy';
        const rarity = getRarityClass(card.gti);

        // NEU: Max 2 Apex, Legacy + Legendary teilen sich 4 Slots
        if (isApex) {
          if (counts.apex >= 2) continue;
          counts.apex++;
        } else if (isLegacy) {
          if (counts.legacy + counts.legendary >= 4) continue;
          counts.legacy++;
        } else if (rarity === 'rarity-legendary') {
          if (counts.legacy + counts.legendary >= 4) continue;
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
    <div className="command-center-layout inv-screen" style={{ display: 'flex', flexDirection: 'column', padding: '60px 40px 20px', gap: '10px', height: '100%', overflow: 'hidden', position: 'relative' }}>
      
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
            activeFactions={activeFactions}
          />
      )}

      {renameModalOpen && (
         <div className="glass-overlay active" style={{ zIndex: 99999 }}>
            <div className="glass-panel" style={{ width: '400px', padding: '30px', textAlign: 'center' }}>
               <h3 className="mono" style={{ color: 'var(--win)', marginBottom: '20px', letterSpacing: '2px' }}>DECK UMBENENNEN</h3>
               <input 
                  type="text" 
                  value={renameInputValue} 
                  onChange={e => setRenameInputValue(e.target.value)} 
                  className="mono" 
                  autoFocus
                  onKeyDown={(e) => { if(e.key === 'Enter') handleRenameConfirm(); }}
                  style={{ width: '100%', padding: '12px', background: '#000', border: '1px solid var(--win)', color: '#fff', fontSize: '1.2rem', textAlign: 'center', marginBottom: '20px', outline: 'none' }} 
               />
               <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="menu-btn" style={{ flex: 1, borderColor: '#555', color: '#888' }} onClick={() => { playSound('click'); setRenameModalOpen(false); }}>ABBRECHEN</button>
                  <button className="menu-btn btn-primary" style={{ flex: 1 }} onClick={handleRenameConfirm}>SPEICHERN</button>
               </div>
            </div>
         </div>
      )}

      {/* HEADER: HUD STATUS BAR (Stack Design) */}
      <div style={{ position: 'absolute', top: '15px', right: '35px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', zIndex: 1000 }}>
        
        {/* ZEILE 1: GLOBAL HUD (Genaue Kopie vom Hauptmenü) */}
        <div style={{ display: 'flex', filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))', alignItems: 'stretch' }}>
          <div className="hud-status-module funds" onClick={() => { playSound('click'); onOpenShop && onOpenShop(); }} title="Shop öffnen" style={{ cursor: 'pointer', transition: '0.3s' }}>
            <span className="hud-label">CREDITS</span>
            <span className="hud-value">{credits ?? 0}</span>
          </div>
          <div className="hud-status-module agent" style={{ borderColor: 'rgba(0, 229, 255, 0.2)', color: 'var(--win)', marginLeft: '-5px', clipPath: 'none' }}>
            <span className="hud-label" style={{ color: 'var(--win)' }}>SYS.ID</span>
            <span className="hud-value" style={{ fontSize: '1.1rem', textTransform: 'uppercase' }}>{username || 'UNKNOWN'}</span>
          </div>
          
          {/* CLEANER EXIT BUTTON */}
          <div className="hud-status-module" onClick={onBack} title="System Exit" 
            style={{ 
              borderColor: 'rgba(255, 0, 85, 0.2)', /* FIX: Optische Höhe exakt wie bei SYS.ID */
              color: 'var(--lose)', 
              borderLeft: '1px solid rgba(255,255,255,0.1)', 
              borderRight: 'none', 
              clipPath: 'none', 
              paddingLeft: '20px', 
              paddingRight: '20px', 
              marginLeft: '0px', /* FIX: Verhindert Überlappung */
              cursor: 'pointer', 
              transition: '0.2s',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,85,0.15)'; e.currentTarget.style.borderColor = 'var(--lose)'; e.currentTarget.style.boxShadow = 'inset 0 0 15px rgba(255,0,85,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10, 10, 15, 0.85)'; e.currentTarget.style.borderColor = 'rgba(255, 0, 85, 0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <span className="hud-value" style={{ fontSize: '1.1rem', letterSpacing: '2px', lineHeight: 1 }}>EXIT</span>
          </div>
          
          {/* SETTINGS ZAHNRAD */}
          <div className="hud-status-module" onClick={() => playSound('click')} title="System Settings" 
            style={{ 
              borderLeft: '1px solid rgba(255,255,255,0.1)', 
              cursor: 'pointer', 
              transition: '0.2s', 
              clipPath: 'polygon(0 0, 100% 0, calc(100% - 15px) 100%, 0 100%)', 
              paddingRight: '30px', 
              paddingLeft: '15px', 
              marginLeft: '0px', /* FIX: Verhindert Überlappung */
              color: 'rgba(255,255,255,0.4)',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--win)'; e.currentTarget.style.background = 'rgba(0,229,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(10, 10, 15, 0.85)'; }}
          >
            <Settings size={18} />
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px', position: 'relative' }}>
         {/* DYNAMISCHES WARNBANNER */}
         {uiWarning && (
           <div className="mono" style={{ position: 'absolute', top: '-40px', left: '0', background: 'var(--lose)', color: '#fff', padding: '5px 15px', fontSize: '0.75rem', fontWeight: 'bold', animation: 'fadeInLine 0.2s forwards', zIndex: 10, letterSpacing: '2px', borderLeft: '4px solid #fff' }}>
             ⚠️ SYSTEM_ERR: {uiWarning}
           </div>
         )}
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
                 {/* DECK HEADER & CONTROLS */}
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <select value={activeEditId} onChange={e => setActiveEditId(e.target.value)} className="mono" style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.8)', border: '1px solid #333', color: '#fff', outline: 'none', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
                         {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </select>
                       {activeEditDeck.isActive ? (
                         <span className="mono" style={{ color: 'var(--win)', fontSize: '0.7rem', padding: '4px 8px', border: '1px solid var(--win)', background: 'rgba(0,229,255,0.1)', letterSpacing: '1px' }}>[ LINK ACTIVE ]</span>
                       ) : (
                         <button className="mono btn-settings-trigger" style={{ color: '#888', border: '1px dashed #555', padding: '4px 8px', fontSize: '0.7rem', margin: 0 }} onClick={setAsActive} onMouseEnter={e => e.currentTarget.style.color='var(--win)'} onMouseLeave={e => e.currentTarget.style.color='#888'}>[ INITIALIZE LINK ]</button>
                       )}
                     </div>
                     
                     <div className="mono" style={{ display: 'flex', gap: '15px', fontSize: '0.65rem', color: '#666', marginTop: '4px' }}>
                       <span style={{ cursor: 'pointer', transition: '0.2s' }} onClick={createNewDeck} onMouseEnter={e => e.currentTarget.style.color='#fff'} onMouseLeave={e => e.currentTarget.style.color='#666'}>[+] NEU</span>
                       <span style={{ cursor: 'pointer', transition: '0.2s' }} onClick={renameDeck} onMouseEnter={e => e.currentTarget.style.color='#fff'} onMouseLeave={e => e.currentTarget.style.color='#666'}>[✎] UMBENENNEN</span>
                       {decks.length > 1 && <span style={{ cursor: 'pointer', transition: '0.2s' }} onClick={deleteDeck} onMouseEnter={e => e.currentTarget.style.color='var(--lose)'} onMouseLeave={e => e.currentTarget.style.color='#666'}>[×] LÖSCHEN</span>}
                     </div>
                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                     <div className="mono" style={{ display: 'flex', gap: '15px', fontSize: '0.65rem', marginTop: '4px' }}>
                       <span style={{ cursor: 'pointer', color: 'var(--win)', transition: '0.2s' }} onClick={autoFill} onMouseEnter={e => e.currentTarget.style.textShadow='0 0 5px var(--win)'} onMouseLeave={e => e.currentTarget.style.textShadow='none'}>&gt;_ AUTO-FILL</span>
                       <span style={{ cursor: 'pointer', color: '#888', transition: '0.2s' }} onClick={clearDeck} onMouseEnter={e => {e.currentTarget.style.color='var(--lose)'; e.currentTarget.style.textShadow='0 0 5px var(--lose)';}} onMouseLeave={e => {e.currentTarget.style.color='#888'; e.currentTarget.style.textShadow='none';}}>&gt;_ CLEAR</span>
                     </div>
                     <h2 style={{ color: '#fff', letterSpacing: '2px', margin: 0, fontSize: '1.2rem', textAlign: 'right', marginTop: '2px' }}>
                       DECK ({safeChars.length}/12 | {safeEffs.length}/3)
                     </h2>
                     {isDeckValid ? <span className="mono" style={{ color: 'var(--win)', fontSize: '0.65rem', letterSpacing: '1px' }}>SYS.READY ✓</span> : <span className="mono" style={{ color: 'var(--lose)', fontSize: '0.65rem', letterSpacing: '1px' }}>INCOMPLETE ⚠</span>}
                   </div>
                 </div>

                 {/* HUD REQUIREMENTS */}
                 <div style={{ display: 'flex', gap: '15px', fontSize: '0.6rem', color: '#555', flexWrap: 'wrap', marginTop: '20px', fontFamily: "'Roboto Mono', monospace" }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <span style={{ color: '#888' }}>APEX/ANO:</span>
                     <div style={{ display: 'flex', gap: '3px' }}>
                       {[...Array(2)].map((_, i) => (
                         <div key={i} style={{ width: '10px', height: '4px', background: i < stats.apexAnomaly ? (stats.apexAnomaly > 2 ? 'var(--lose)' : 'var(--apex-pink)') : '#222', boxShadow: i < stats.apexAnomaly && stats.apexAnomaly <= 2 ? '0 0 5px var(--apex-pink)' : 'none', border: i < stats.apexAnomaly && stats.apexAnomaly > 2 ? '1px solid var(--lose)' : 'none' }}></div>
                       ))}
                     </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <span style={{ color: '#888' }}>LEG/LEGACY:</span>
                     <div style={{ display: 'flex', gap: '3px' }}>
                       {[...Array(4)].map((_, i) => {
                         const total = stats.legacy + stats.legendary;
                         const isLegacy = i < stats.legacy;
                         const color = i < total ? (total > 4 ? 'var(--lose)' : (isLegacy ? 'var(--legacy-sepia)' : 'var(--r-leg)')) : '#222';
                         const shadow = i < total && total <= 4 ? `0 0 5px ${isLegacy ? 'var(--legacy-sepia)' : 'var(--r-leg)'}` : 'none';
                         const border = i < total && total > 4 ? '1px solid var(--lose)' : 'none';
                         return <div key={i} style={{ width: '10px', height: '4px', background: color, boxShadow: shadow, border: border }}></div>;
                       })}
                     </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <span style={{ color: '#888' }}>EPIC:</span>
                     <div style={{ display: 'flex', gap: '3px' }}>
                       {[...Array(3)].map((_, i) => (
                         <div key={i} style={{ width: '10px', height: '4px', background: i < stats.epic ? (stats.epic > 3 ? 'var(--lose)' : 'var(--r-epi)') : '#222', boxShadow: i < stats.epic && stats.epic <= 3 ? '0 0 5px var(--r-epi)' : 'none', border: i < stats.epic && stats.epic > 3 ? '1px solid var(--lose)' : 'none' }}></div>
                       ))}
                     </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <span style={{ color: '#888' }}>RARE:</span>
                     <div style={{ display: 'flex', gap: '3px' }}>
                       {[...Array(3)].map((_, i) => (
                         <div key={i} style={{ width: '10px', height: '4px', background: i < stats.rare ? (stats.rare > 3 ? 'var(--lose)' : 'var(--r-rar)') : '#222', boxShadow: i < stats.rare && stats.rare <= 3 ? '0 0 5px var(--r-rar)' : 'none', border: i < stats.rare && stats.rare > 3 ? '1px solid var(--lose)' : 'none' }}></div>
                       ))}
                     </div>
                   </div>
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
                <div className="mini-grid" style={{ paddingBottom: '150px' }}>
                  {sortedDeckChars.map((c) => (
                    <MiniCard
                      key={`deckc-${c.name}`}
                      card={c}
                      onClick={() => handleCardClick(c, false, true)}
                      onRightClick={(evt) => handleCardRightClick(evt, c, false)}
                      onHover={() => onClearNew(c.name)}
                      activeFactions={activeFactions}
                    />
                  ))}
                </div>
              )}

              {deckTab === 'taktiken' && (
                <div className="mini-grid" style={{ paddingBottom: '150px' }}>
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
                  {/* TERMINAL COMMAND LINE (Filters) */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start', flexWrap: 'wrap', width: '100%', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '4px', border: '1px solid #222' }}>
                    <span className="mono" style={{ color: '#555', display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.8rem' }}>&gt;_</span>
                    
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="mono" style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: '#aaa', outline: 'none', fontSize: '0.75rem', cursor: 'pointer' }}>
                       <option value="rating">SORT: RATING</option>
                       <option value="new">SORT: NEU</option>
                    </select>
                    
                    <span style={{ color: '#333' }}>|</span>
                    
                    {poolTab === 'chars' && (
                      <>
                        <select value={factionFilter} onChange={e => setFactionFilter(e.target.value)} className="mono" style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: '#aaa', outline: 'none', fontSize: '0.75rem', cursor: 'pointer' }}>
                           <option value="ALL">FACTION: ALL</option>
                           {allFactions.map((f, i) => <option key={`fac-${f}-${i}`} value={f}>{f}</option>)}
                        </select>
                        <span style={{ color: '#333' }}>|</span>
                      </>
                    )}

                    <input type="text" placeholder="SEARCH QUERY..." value={search} onChange={e => setSearch(e.target.value)} className="mono" style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: 'var(--win)', outline: 'none', fontSize: '0.75rem', flex: 1, minWidth: '120px' }} />
                    
                    {/* NEU: ALLES GESEHEN BUTTON */}
                    {safeInv.some(c => c.isNew) && (
                      <span className="mono" style={{ cursor: 'pointer', color: 'var(--eff-col)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', padding: '0 10px', transition: '0.2s', marginLeft: 'auto' }} onClick={() => {
                         playSound('click');
                         setInventory(prev => prev.map(c => ({...c, isNew: false})));
                         setDecks(prev => prev.map(d => ({ ...d, chars: d.chars.map(c => ({...c, isNew: false})), effs: d.effs.map(c => ({...c, isNew: false})) })));
                      }} onMouseEnter={e => e.currentTarget.style.textShadow='0 0 5px var(--eff-col)'} onMouseLeave={e => e.currentTarget.style.textShadow='none'}>✓ ALLES GESEHEN</span>
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
                  <div className="mini-grid" style={{ paddingBottom: '150px' }}>
                    {uniqueInvChars.map((c) => (
                      <MiniCard
                        key={`invc-${c.name}`}
                        card={c}
                        onClick={() => handleCardClick(c, false, false)}
                        onRightClick={(evt) => handleCardRightClick(evt, c, false)}
                        onHover={() => onClearNew(c.name)}
                        activeFactions={activeFactions}
                      />
                    ))}
                  </div>
                </>
              )}

              {poolTab === 'taktiken' && (
                <>
                  {uniqueInvEffs.length === 0 && <p style={{ color: '#555', marginTop: '20px' }}>Keine passenden Taktiken gefunden.</p>}
                  <div className="mini-grid" style={{ paddingBottom: '150px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', alignItems: 'start', justifyItems: 'center', gap: '40px', paddingBottom: '150px' }}>
            {Object.values(groupedInventory)
              .filter(g => (g.main.name || '').toLowerCase().includes(search.toLowerCase()) && (factionFilter === 'ALL' || g.main.faction === factionFilter))
              .sort((a, b) => {
                 const aMax = (a.main.level || 1) >= 3;
                 const bMax = (b.main.level || 1) >= 3;
                 const aCanUp = (!aMax && ((a.countByLevel?.[1] || 0) >= 3 || ((a.main.level||1) >= 2 && (a.countByLevel?.[2] || 0) >= 3))) ? 1 : 0;
                 const bCanUp = (!bMax && ((b.countByLevel?.[1] || 0) >= 3 || ((b.main.level||1) >= 2 && (b.countByLevel?.[2] || 0) >= 3))) ? 1 : 0;
                 if (aCanUp !== bCanUp) return bCanUp - aCanUp; // Upgradebare nach oben
                 if (a.count !== b.count) return b.count - a.count; // Danach nach Gesamtanzahl
                 return (b.main.gti || 0) - (a.main.gti || 0); // Danach nach Stärke
              })
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