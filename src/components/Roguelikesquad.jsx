import React, { useState, useMemo } from 'react';
import Card, { getFactionIcon, CAT_CONFIG } from './Card';
import { playSound } from '../logic/audio'; // FIX: Importiert die Sound-Engine

// â”€â”€ Type colour helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const typeColor = (card) => {
  if (!card) return '#2a3a4a';
  if (card.id === 'avatar' || card.sp !== undefined) return '#bc13fe';
  if (card.type === 'apex')    return 'var(--apex-pink)';
  if (card.type === 'legacy')  return 'var(--legacy-sepia)';
  if (card.type === 'effect' || card.buff !== undefined) return 'var(--eff-col)';
  return 'var(--win)';
};

const typeIcon = (card) => {
  if (!card)                   return '○';
  if (card.id === 'avatar' || card.sp !== undefined) return '★';
  if (card.type === 'effect' || card.buff !== undefined) return '◈';
  return '⬡';
};

// ── Empty slot placeholder (SLIM CHIP STYLE) ─────────────────────────────
function EmptySlot({ label, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '8px 12px', background: 'rgba(0,0,0,0.3)',
      border: '1px dashed #2a3a4a', borderLeft: '4px solid #2a3a4a',
      display: 'flex', alignItems: 'center', gap: '12px', minHeight: '45px',
      cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s',
      marginBottom: '2px'
    }} onMouseEnter={e => onClick && (e.currentTarget.style.background = 'rgba(0,229,255,0.05)')} onMouseLeave={e => onClick && (e.currentTarget.style.background = 'rgba(0,0,0,0.3)')}>
      <div className="mono" style={{ fontSize: '0.65rem', color: onClick ? '#4a5a6a' : '#3a4a5a', letterSpacing: '3px' }}>{label}</div>
    </div>
  );
}

// ── Filled slot (SLIM CHIP STYLE) ────────────────────────────────────────
function FilledSlot({ card, locked, onRemove }) {
  const isAv = card?.id === 'avatar' || card?.sp !== undefined;
  
  // RGB Colors for high reliability (matches terminal chips on map)
  let tc = '0, 229, 255'; 
  if (isAv) tc = '188, 19, 254'; 
  else if (card?.type === 'effect') tc = '0, 255, 204'; 
  else if (card?.type === 'apex') tc = '255, 0, 127'; 
  else if (card?.type === 'legacy') tc = '210, 180, 140'; 

  const facIcon = card && card.faction && card.type !== 'effect' ? getFactionIcon(card.faction) : '';

  return (
    <div style={{
      padding: '6px 12px', background: locked ? `rgba(${tc}, 0.12)` : `rgba(${tc}, 0.06)`,
      border: `1px solid rgba(${tc}, 0.3)`, borderLeft: `4px solid rgba(${tc}, 1)`,
      display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px',
      transition: 'all 0.15s ease-out'
    }}>
      <div className="mono" style={{ fontSize: '0.9rem', color: `rgba(${tc}, 1)`, textAlign: 'center', flexShrink: 0, width: '15px' }}>
        {typeIcon(card)}
      </div>
      
      {facIcon && (
        <div className="mono" style={{ fontSize: '1.1rem', color: `rgba(${tc}, 1)`, textShadow: `0 0 8px rgba(${tc}, 0.5)`, width: '20px', textAlign: 'center', flexShrink: 0, marginTop: '-2px' }}>
          {facIcon}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '0.95rem', color: locked ? `rgba(${tc}, 1)` : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {card.name.toUpperCase()}
        </div>
        <div className="mono" style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '2px', marginTop: '1px' }}>
          GTI {card.gti || '—'} // L{card.level || 1}
        </div>
      </div>
      {locked
        ? <div className="mono" style={{ fontSize: '0.45rem', color: `rgba(${tc}, 1)`, flexShrink: 0, letterSpacing: '1px' }}>[KERNEL]</div>
        : <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--lose)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px', lineHeight: 1, transition: '0.2s', opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.6}>✕</button>
      }
    </div>
  );
}

// â”€â”€ New Visual Draft Card (PERFORMANCE OPTIMIZED) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ── New Visual Draft Card (PERFORMANCE OPTIMIZED) ────────────────────────
const DraftCard = React.memo(function DraftCard({ card, selected, disabled, onToggle, activeFactions = [], isSynergyHint = false, isEffectSynergyHint = false }) {
  const tc = typeColor(card);
  return (
    <div
      onPointerDown={(e) => { 
        if (disabled) return;
        e.preventDefault();
        onToggle(); 
      }}
      style={{
        width: '100%', position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transform: selected ? 'translateY(-8px)' : 'none',
        boxShadow: isSynergyHint 
          ? '0 0 25px #abce21, inset 0 0 20px #abce21, 0 0 40px rgba(171, 206, 33, 0.3)' 
          : isEffectSynergyHint
          ? '0 0 25px #00e5ff, inset 0 0 20px #00e5ff, 0 0 40px rgba(0, 229, 255, 0.3)'
          : (selected ? `0 0 30px ${tc}66` : 'none'),
        animation: ((isSynergyHint || isEffectSynergyHint) && !selected) ? 'glowPulse 1.5s infinite' : 'none',
        borderRadius: '8px', overflow: 'visible',
        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
    >
      <Card card={card} context="inventory" activeFactions={activeFactions} isSynergyHint={isSynergyHint} isEffectSynergyHint={isEffectSynergyHint} />
      
      {selected && (
        <div style={{ position: 'absolute', inset: 0, border: `3px solid ${tc}`, borderRadius: '8px', pointerEvents: 'none', zIndex: 5 }} />
      )}
      
      {selected && (
        <div className="mono" style={{ 
          position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', 
          background: tc, color: '#000', padding: '6px 16px', fontSize: '0.85rem', 
          fontWeight: 900, borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' 
        }}>
          ✓ IM SQUAD
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // CUSTOM EQUALITY CHECK
  return (
    prevProps.card.name === nextProps.card.name &&
    prevProps.selected === nextProps.selected &&
    prevProps.disabled === nextProps.disabled &&
    JSON.stringify(prevProps.activeFactions) === JSON.stringify(nextProps.activeFactions) &&
    prevProps.isSynergyHint === nextProps.isSynergyHint &&
    prevProps.isEffectSynergyHint === nextProps.isEffectSynergyHint &&
    prevProps.onToggle === nextProps.onToggle
  );
});

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function RoguelikeSquad({ avatarCard, avatars = [], onChangeAvatar, inventory = [], ghostPresets = [], setGhostPresets, onConfirm, onBack, isCoop, isHost, partnerReady, mySquadReady }) {
  const [selChars, setSelChars] = useState([]);  // 5 Charaktere (Immer, auch im Co-Op)
  const [selEffs,  setSelEffs]  = useState([]);  // 2 Effekte
  const [search,   setSearch]   = useState('');
  const [tab,      setTab]      = useState('chars');
  const [factionFilter, setFactionFilter] = useState('ALL');
  const [statFilter, setStatFilter] = useState('ALL');
  const [gtiSort, setGtiSort] = useState('desc'); // 'asc' | 'desc'

  /* MOBILE OPTIMIZATION START */
  const [isMobile, setIsMobile] = React.useState(false);
  // Mobile: Squad-Liste einklappbar
  const [squadPanelOpen, setSquadPanelOpen] = React.useState(false);

  React.useEffect(() => {
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

  // NEU: Preset States & Logic
  const [newPresetName, setNewPresetName] = useState('');

  const uniqueInventory = useMemo(() => {
    return Object.values((inventory || []).reduce((acc, card) => {
      if (!acc[card.name] || (card.level || 1) > (acc[card.name].level || 1)) {
        acc[card.name] = card;
      }
      return acc;
    }, {}));
  }, [inventory]);

  // NEU: Liste aller verfügbaren Fraktionen für das Dropdown (Array-sicher für Anomalien)
  const availableFactions = useMemo(() => {
    const facs = new Set();
    uniqueInventory.forEach(c => {
      if (c.type !== 'effect' && c.buff === undefined && c.faction) {
        const fArray = Array.isArray(c.faction) ? c.faction : [c.faction];
        fArray.forEach(f => facs.add(f.trim()));
      }
    });
    return Array.from(facs).sort();
  }, [uniqueInventory]);

  const matchesSearch = (c, q) => {
    if (!q) return true;
    const n = (c.name || '').toLowerCase();
    const t = (c.type || '').toLowerCase();
    // FIX: Wenn faction ein Array ist (z.B. bei Anomalien), verbinden wir die Begriffe erst zu einem String
    const f = Array.isArray(c.faction) ? c.faction.join(' ').toLowerCase() : (c.faction || '').toLowerCase();
    const synStr = Array.isArray(c.syn) ? c.syn.join(' ') : (c.syn || '');
    const s = synStr.toLowerCase();
    return n.includes(q) || t.includes(q) || f.includes(q) || s.includes(q);
  };

  const invChars = useMemo(() => {
    const q = search.toLowerCase();
    return uniqueInventory
      .filter(c => c.type !== 'effect' && c.buff === undefined && c.id !== 'avatar' && c.name !== avatarCard?.name)
      .filter(c => matchesSearch(c, q))
      .filter(c => {
        if (factionFilter === 'ALL') return true;
        // Array-sicher checken, ob die Karte zur gewählten Fraktion gehört
        const fArray = Array.isArray(c.faction) ? c.faction : (c.faction ? [c.faction] : []);
        return fArray.some(f => f.trim().toUpperCase() === factionFilter.toUpperCase());
      })
      .sort((a,b) => gtiSort === 'asc' ? (a.gti||0) - (b.gti||0) : (b.gti||0) - (a.gti||0));
  }, [uniqueInventory, avatarCard, search, factionFilter, gtiSort]);

  // Collect stat keys from effect cards via card.stat and card.passiveBuff.stat
  const availableStats = useMemo(() => {
    const statKeys = new Set();
    uniqueInventory.filter(c => c.type === 'effect').forEach(c => {
      if (c.stat && CAT_CONFIG[c.stat]) statKeys.add(c.stat);
      if (c.passiveBuff?.stat && CAT_CONFIG[c.passiveBuff.stat]) statKeys.add(c.passiveBuff.stat);
    });
    // Sort by display name
    return Array.from(statKeys).sort((a, b) => CAT_CONFIG[a].name.localeCompare(CAT_CONFIG[b].name));
  }, [uniqueInventory]);

  const invEffs = useMemo(() => {
    const q = search.toLowerCase();
    return uniqueInventory
      .filter(c => c.type === 'effect')
      .filter(c => matchesSearch(c, q))
      .filter(c => {
        if (statFilter === 'ALL') return true;
        return c.stat === statFilter || c.passiveBuff?.stat === statFilter;
      });
  }, [uniqueInventory, search, statFilter]);

  const toggleChar = (card) => {
    playSound('click');
    setSelChars(prev => {
      const already = prev.some(c => c.name === card.name);
      if (already) return prev.filter(c => c.name !== card.name);
      if (prev.length >= 5) return prev; // Immer maximal 5 Slots
      return [...prev, card];
    });
  };
  const toggleEff = (card) => {
    playSound('click');
    setSelEffs(prev => {
      const already = prev.some(c => c.name === card.name);
      if (already) return prev.filter(c => c.name !== card.name);
      if (prev.length >= 2) return prev;
      return [...prev, card];
    });
  };

  // NEU: Preset Funktionen
  const handleSavePreset = () => {
    if (!newPresetName.trim()) return alert('Bitte einen Namen für das Preset eingeben.');
    if (selChars.length === 0 && selEffs.length === 0) return alert('Dein Squad ist leer!');
    
    const newPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      chars: selChars.map(c => c.name),
      effs: selEffs.map(c => c.name)
    };
    
    const updated = [...ghostPresets, newPreset];
    setGhostPresets(updated); // App.jsx übernimmt den Cloud Sync!
    setNewPresetName('');
  };

  const handleLoadPreset = (preset) => {
    // Sucht die Karten im aktuellen Inventar, behält dabei die höchsten verfügbaren Level
    const loadedChars = preset.chars.map(name => uniqueInventory.find(c => c.name === name)).filter(Boolean).slice(0, 5);
    const loadedEffs = preset.effs.map(name => uniqueInventory.find(c => c.name === name)).filter(Boolean).slice(0, 2);
    
    setSelChars(loadedChars);
    setSelEffs(loadedEffs);
  };

  const handleDeletePreset = (id) => {
    const updated = ghostPresets.filter(p => p.id !== id);
    setGhostPresets(updated); // App.jsx übernimmt den Cloud Sync!
  };

  // NEU: Fraktions-Synergie Check für Squad Draft (inkl. Avatar) (Array-sicher)
  const activeFactions = useMemo(() => {
    const counts = {};
    const allSquadChars = [...selChars, ...(avatarCard ? [avatarCard] : [])];
    allSquadChars.forEach(c => {
      if (c && c.faction && c.type !== 'effect') {
          const facs = Array.isArray(c.faction) ? c.faction : [c.faction];
          facs.forEach(f => {
              const fac = f.trim().toUpperCase();
              counts[fac] = (counts[fac] || 0) + 1;
          });
      }
    });
    return Object.keys(counts).filter(f => counts[f] >= 3);
  }, [selChars, avatarCard]);

  const GTI_CAP  = 450; 
  const charsDone = selChars.length === 5;
  const effsDone  = selEffs.length  === 2;
  
  const totalGTI  = selChars.reduce((s,c) => s+(c.gti||0), 0);
  const overCap   = charsDone && totalGTI > GTI_CAP;
  const ready     = charsDone && effsDone && !overCap && !!avatarCard; // FIX: Avatar ist jetzt zwingend!
  const progress  = Math.round(((selChars.length / 5) * 50) + ((selEffs.length / 2) * 50));

  const handleConfirm = () => {
    if (!ready) return;
    onConfirm(selChars, selEffs);
  };

  return (
    <div className="screen active" style={{ display: 'block', padding: '22px 24px', overflow: 'hidden' }}>
      {/* Header */}
      <div className="top-bar" style={{ marginBottom: '14px' }}>
        <div>
          <div className="game-title-small" style={{ color: 'var(--apex-pink)' }}>⬡ SQUAD-REKRUTIERUNG</div>
          <div className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '3px', marginTop: '4px' }}>
            {selChars.length}/5 AGENTEN · {selEffs.length}/2 TAKTIKEN
          </div>
        </div>
        <button className="btn-back" onClick={onBack}>ZURÜCK</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', marginBottom: '20px', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: ready ? 'var(--win)' : '#bc13fe', borderRadius: '2px', transition: 'width 0.3s', boxShadow: `0 0 10px ${ready ? 'var(--win)' : '#bc13fe'}` }}/>
      </div>

      {/* MOBILE OPTIMIZATION START: Vertikales Stack-Layout auf Mobile */}
      <div className="rl-squad-layout" style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '24px',
        height: isMobile ? 'calc(100dvh - 130px)' : 'calc(100vh - 165px)',
        overflow: 'hidden'
      }}>

        {/* â”€â”€ Left: Squad preview (WIDER & BIGGER) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* MOBILE OPTIMIZATION START: Sidebar auf Mobile einklappbar */}
        {isMobile ? (
          <div className="rl-squad-sidebar" style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px',
            overflow: 'hidden',
            maxHeight: squadPanelOpen ? '45vh' : '58px',
            transition: 'max-height 0.3s ease',
            background: 'rgba(5,2,12,0.9)',
            border: '1px solid rgba(188,19,254,0.2)',
            borderRadius: '8px',
          }}>
            {/* Toggle Header */}
            <div
              onClick={() => setSquadPanelOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', cursor: 'pointer', flexShrink: 0, minHeight: '58px',
                borderBottom: squadPanelOpen ? '1px solid rgba(188,19,254,0.2)' : 'none',
              }}
            >
              <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--apex-pink)', letterSpacing: '2px' }}>
                ▸ SQUAD {selChars.length}/5 · {selEffs.length}/2 TAKTIKEN {ready ? '✓' : ''}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', transform: squadPanelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>▼</span>
            </div>
            {squadPanelOpen && (
              <div style={{ overflowY: 'auto', padding: '10px 12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {avatarCard ? <FilledSlot card={avatarCard} locked /> : <EmptySlot label="KEIN AVATAR" />}
                <div className="mono" style={{ fontSize: '0.55rem', color: charsDone ? 'var(--win)' : 'rgba(255,255,255,0.3)', letterSpacing: '2px', padding: '4px 0 2px' }}>AGENTEN {selChars.length}/5</div>
                {Array.from({ length: 5 }).map((_, i) => (
                  selChars[i]
                    ? <FilledSlot key={i} card={selChars[i]} locked={false} onRemove={() => setSelChars(p => p.filter((_, j) => j !== i))} />
                    : <EmptySlot key={i} label={`CHAR SLOT ${i + 1}`} onClick={() => { setTab('chars'); setSquadPanelOpen(false); }} />
                ))}
                <div className="mono" style={{ fontSize: '0.55rem', color: effsDone ? 'var(--win)' : 'rgba(255,255,255,0.3)', letterSpacing: '2px', padding: '4px 0 2px' }}>TAKTIKEN {selEffs.length}/2</div>
                {Array.from({ length: 2 }).map((_, i) => (
                  selEffs[i]
                    ? <FilledSlot key={i} card={selEffs[i]} locked={false} onRemove={() => setSelEffs(p => p.filter((_, j) => j !== i))} />
                    : <EmptySlot key={i} label={`EFFEKT SLOT ${i + 1}`} onClick={() => { setTab('effs'); setSquadPanelOpen(false); }} />
                ))}
                <button
                  className="space-action-btn"
                  onClick={handleConfirm}
                  disabled={!ready || mySquadReady || (isCoop && isHost && !partnerReady)}
                  style={{
                    marginTop: '10px', padding: '14px',
                    opacity: (!ready || mySquadReady) ? 0.5 : 1,
                    background: ready ? 'rgba(255,0,127,0.15)' : 'transparent',
                    border: '2px solid ' + (ready ? 'var(--apex-pink)' : '#2a3a4a'),
                    color: ready ? 'var(--apex-pink)' : '#3a4a5a',
                    fontFamily: "'Roboto Mono',monospace", fontSize: '0.8rem', fontWeight: 700, letterSpacing: '3px',
                    cursor: (!ready || mySquadReady) ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {mySquadReady ? '✓ WARTE AUF HOST' : (ready ? '▸ RUN STARTEN' : (5 - selChars.length + (2 - selEffs.length)) + ' FEHLEN')}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Desktop Sidebar – unverändert */
          <div className="rl-squad-sidebar" style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '10px', paddingBottom: '60px' }}>
          
          {/* Avatar locked / Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <div className="mono" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px' }}>▸ GHOST AGENT</div>
            {avatars && avatars.some(a => a !== null) && (
              <select
                className="mono"
                value={avatarCard?.name || ''}
                onChange={(e) => {
                  const selected = avatars.find(a => a && a.name === e.target.value);
                  if (selected && onChangeAvatar) {
                    playSound('click');
                    onChangeAvatar(selected);
                  }
                }}
                style={{ background: 'transparent', border: '1px solid rgba(188,19,254,0.3)', borderRadius: '4px', color: '#bc13fe', fontSize: '0.65rem', outline: 'none', cursor: 'pointer', padding: '2px 6px', maxWidth: '120px' }}
              >
                <option value="" disabled>WÄHLEN...</option>
                {avatars.filter(a => a !== null).map((a, idx) => (
                  <option key={idx} value={a.name} style={{ background: '#000', color: '#bc13fe' }}>{a.name}</option>
                ))}
              </select>
            )}
          </div>
          {avatarCard
            ? <FilledSlot card={avatarCard} locked/>
            : <EmptySlot label="KEIN AVATAR"/>
          }

          {/* Char slots */}
          <div className="mono" style={{ fontSize: '0.6rem', color: charsDone ? 'var(--win)' : 'rgba(255,255,255,0.3)', letterSpacing: '2px', padding: '10px 0 2px' }}>
            ▸ AGENTEN {selChars.length}/5 {charsDone ? '✓' : ''}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            selChars[i]
              ? <FilledSlot key={i} card={selChars[i]} locked={false} onRemove={() => setSelChars(p => p.filter((_, j) => j !== i))} />
              : <EmptySlot key={i} label={`CHAR SLOT ${i + 1}`} onClick={() => setTab('chars')} />
          ))}

          {/* Effect slots */}
          <div className="mono" style={{ fontSize: '0.6rem', color: effsDone ? 'var(--win)' : 'rgba(255,255,255,0.3)', letterSpacing: '2px', padding: '10px 0 2px' }}>
            ▸ TAKTIKEN {selEffs.length}/2 {effsDone ? 'âœ“' : ''}
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            selEffs[i]
              ? <FilledSlot key={i} card={selEffs[i]} locked={false} onRemove={() => setSelEffs(p => p.filter((_, j) => j !== i))} />
              : <EmptySlot key={i} label={`EFFEKT SLOT ${i + 1}`} onClick={() => setTab('effs')} />
          ))}

          {/* GTI Cap indicator (#005) */}
          {selChars.length > 0 && (
            <div style={{padding:'7px 10px',background:overCap?'rgba(255,215,0,0.07)':'rgba(0,0,0,0.2)',border:`1px solid ${overCap?'var(--ep)':'rgba(255,255,255,0.05)'}`,borderLeft:`3px solid ${overCap?'var(--ep)':'transparent'}`}}>
              <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.22)',letterSpacing:'2px',marginBottom:'2px'}}>▸ GESAMT-GTI</div>
              <div className="mono" style={{fontSize:'0.8rem',fontWeight:700,color:overCap?'var(--ep)':'rgba(255,255,255,0.5)'}}>{totalGTI}/{GTI_CAP} {overCap?'⚠️ LIMIT':''}</div>
              {overCap && <div className="mono" style={{fontSize:'0.46rem',color:'var(--ep)',marginTop:'2px',letterSpacing:'1px'}}>Squad zu stark â€” BALANCING</div>}
            </div>
          )}

          {/* Confirm */}
         <button 
            className="space-action-btn"
            onClick={handleConfirm} 
            disabled={!ready || mySquadReady || (isCoop && isHost && !partnerReady)}
            style={{
              marginTop: '16px', padding: '18px 10px',
              opacity: (!ready || mySquadReady || (isCoop && isHost && !partnerReady)) ? 0.5 : 1,
              background: (ready && (!isCoop || !isHost || partnerReady)) ? 'rgba(255,0,127,0.15)' : 'transparent',
              border: `2px solid ${(ready && (!isCoop || !isHost || partnerReady)) ? 'var(--apex-pink)' : '#2a3a4a'}`,
              color: (ready && (!isCoop || !isHost || partnerReady)) ? 'var(--apex-pink)' : '#3a4a5a',
              fontFamily: "'Roboto Mono',monospace", fontSize: '0.9rem', fontWeight: 700, letterSpacing: '4px',
              cursor: (!ready || mySquadReady || (isCoop && isHost && !partnerReady)) ? 'not-allowed' : 'pointer',
              boxShadow: (ready && (!isCoop || !isHost || partnerReady)) ? '0 0 20px rgba(255,0,127,0.2)' : 'none',
              transition: 'all 0.2s',
          }}>
            {mySquadReady 
              ? '✓ SQUAD BEREIT. WARTE AUF HOST...' 
              : (isCoop && !isHost 
                  ? (!avatarCard ? 'AVATAR FEHLT' : (ready ? '▸ SQUAD BEREIT MELDEN' : 'KARTEN FEHLEN')) 
                  : (isCoop && isHost 
                      ? (!avatarCard ? 'AVATAR FEHLT' : (!ready ? 'KARTEN FEHLEN' : (!partnerReady ? 'WARTE AUF PARTNER SQUAD...' : '▸ RUN INITIALISIEREN'))) 
                      : (!avatarCard ? 'AVATAR FEHLT' : (ready ? '▸ RUN INITIALISIEREN' : overCap ? `⚠️ GTI ${totalGTI}/${GTI_CAP}` : `${(5 - selChars.length) + (2 - selEffs.length)} KARTEN FEHLEN`))))}
          </button>
        </div>
        )}
        {/* MOBILE OPTIMIZATION END */}

        {/* â”€â”€ Right: Inventory (GRID LAYOUT) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          
          {/* Search + Tab */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="text" placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: '3px solid var(--win)', color: '#fff', fontFamily: "'Roboto Mono',monospace", fontSize: '0.9rem', outline: 'none' }} />
            
            {/* Agenten-Filter: Fraktion + GTI-Sortierung */}
            {tab === 'chars' && (<>
              <select 
                value={factionFilter} 
                onChange={e => { playSound('click'); setFactionFilter(e.target.value); }}
                style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--win)', fontFamily: "'Roboto Mono',monospace", fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="ALL">ALLE FRAKTIONEN</option>
                {availableFactions.map(f => (
                  <option key={f} value={f}>{f.toUpperCase()}</option>
                ))}
              </select>
              {/* GTI Sortierung */}
              <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                {[['desc','GTI ↓'],['asc','GTI ↑']].map(([val, label]) => (
                  <button key={val} onClick={() => { playSound('click'); setGtiSort(val); }}
                    style={{ padding: '12px 14px', background: gtiSort === val ? 'rgba(0,229,255,0.15)' : 'transparent', border: 'none', borderRight: val === 'desc' ? '1px solid rgba(255,255,255,0.1)' : 'none', color: gtiSort === val ? 'var(--win)' : '#555', fontFamily: "'Roboto Mono',monospace", fontSize: '0.75rem', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {label}
                  </button>
                ))}
              </div>
            </>)}

            {/* Taktiken-Filter: nach geboostetem Stat */}
            {tab === 'effs' && (
              <select
                value={statFilter}
                onChange={e => { playSound('click'); setStatFilter(e.target.value); }}
                style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--eff-col)', fontFamily: "'Roboto Mono',monospace", fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="ALL">ALLE STATS</option>
                {availableStats.map(s => (
                  <option key={s} value={s}>{CAT_CONFIG[s]?.name.toUpperCase() ?? s.toUpperCase()}</option>
                ))}
              </select>
            )}

            <button onClick={() => { playSound('click'); setTab('chars'); setStatFilter('ALL'); }}
              style={{ padding: '12px 24px', background: tab === 'chars' ? 'rgba(0,229,255,0.12)' : 'transparent', border: `1px solid ${tab === 'chars' ? 'var(--win)' : '#333'}`, color: tab === 'chars' ? 'var(--win)' : '#555', fontFamily: "'Roboto Mono',monospace", fontSize: '0.85rem', letterSpacing: '3px', cursor: 'pointer', transition: 'all 0.2s' }}>
              ⬡ AGENTEN
            </button>
            <button onClick={() => { playSound('click'); setTab('effs'); setFactionFilter('ALL'); }}
              style={{ padding: '12px 24px', background: tab === 'effs' ? 'rgba(188,19,254,0.12)' : 'transparent', border: `1px solid ${tab === 'effs' ? 'var(--eff-col)' : '#333'}`, color: tab === 'effs' ? 'var(--eff-col)' : '#555', fontFamily: "'Roboto Mono',monospace", fontSize: '0.85rem', letterSpacing: '3px', cursor: 'pointer', transition: 'all 0.2s' }}>
              ◈ TAKTIKEN
            </button>
            <button onClick={() => { playSound('click'); setTab('presets'); }}
              style={{ padding: '12px 24px', background: tab === 'presets' ? 'rgba(255,215,0,0.12)' : 'transparent', border: `1px solid ${tab === 'presets' ? '#ffd700' : '#333'}`, color: tab === 'presets' ? '#ffd700' : '#555', fontFamily: "'Roboto Mono',monospace", fontSize: '0.85rem', letterSpacing: '3px', cursor: 'pointer', transition: 'all 0.2s', marginLeft: 'auto' }}>
              💾 PRESETS
            </button>
          </div>

          {/* Cyberpunk Grid / Presets Area */}
          <div style={{ 
            flex: 1, overflowY: 'auto', paddingRight: '10px', paddingBottom: '120px', minHeight: 0, 
            display: tab === 'presets' ? 'block' : 'grid', 
            gridTemplateColumns: tab === 'presets' ? 'none' : (isMobile ? 'repeat(auto-fill, minmax(clamp(130px, 28vw, 180px), 1fr))' : 'repeat(auto-fill, minmax(clamp(160px, 16vw, 260px), 1fr))'), 
            gridAutoRows: 'auto', gap: '20px', justifyItems: 'center', alignContent: 'start'
          }}>
            {tab === 'presets' ? (
              <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <div style={{ padding: '20px', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', borderLeft: '3px solid #ffd700', display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <input type="text" placeholder="Preset Name (z.B. Aggro Deck)" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} style={{ flex: 1, padding: '12px', background: '#000', border: '1px solid #444', color: '#fff', fontFamily: "'Roboto Mono', monospace", outline: 'none' }} />
                    <button onClick={handleSavePreset} className="menu-btn" style={{ padding: '12px 24px', background: '#ffd700', color: '#000', border: 'none', fontWeight: 900, fontSize: '0.9rem' }}>SPEICHERN</button>
                 </div>
                 
                 {ghostPresets.length === 0 ? (
                    <div className="mono" style={{ textAlign: 'center', color: '#555', padding: '40px', fontSize: '0.9rem', letterSpacing: '2px' }}>KEINE PRESETS GESPEICHERT</div>
                 ) : (
                    ghostPresets.map(p => (
                       <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', borderRadius: '6px' }}>
                          <div>
                             <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#fff', letterSpacing: '1px' }}>{p.name}</div>
                             <div className="mono" style={{ fontSize: '0.7rem', color: '#888', marginTop: '4px' }}>{p.chars.length} AGENTEN // {p.effs.length} TAKTIKEN</div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                             <button onClick={() => handleDeletePreset(p.id)} className="menu-btn" style={{ padding: '8px 16px', background: 'transparent', borderColor: 'var(--lose)', color: 'var(--lose)', fontSize: '0.8rem' }}>LÖSCHEN</button>
                             <button onClick={() => handleLoadPreset(p)} className="menu-btn" style={{ padding: '8px 24px', background: 'rgba(0,229,255,0.1)', borderColor: 'var(--win)', color: 'var(--win)', fontSize: '0.8rem', fontWeight: 900 }}>LADEN</button>
                          </div>
                       </div>
                    ))
                 )}
              </div>
            ) : tab === 'chars' ? (
              invChars.length === 0
                ? <div className="mono" style={{ gridColumn: '1/-1', color: '#3a4a5a', padding: '40px', textAlign: 'center', fontSize: '0.9rem', letterSpacing: '2px' }}>KEINE AGENTEN GEFUNDEN</div>
                : (() => {
                    // FIX: Avatar muss für Hints mitzählen!
                    const allSelected = [...selChars, ...(avatarCard ? [avatarCard] : [])];
                    
                    const factionCounts = {};
                    allSelected.forEach(c => {
                      if (c && c.faction && c.type !== 'effect') {
                          const facs = Array.isArray(c.faction) ? c.faction : [c.faction];
                          facs.forEach(f => {
                              const fac = f.trim().toUpperCase();
                              factionCounts[fac] = (factionCounts[fac] || 0) + 1;
                          });
                      }
                    });
                    
                    // Welche Fraktionen haben 2 ODER MEHR Agenten im Deck?
                    const factionsWithHint = Object.keys(factionCounts).filter(f => factionCounts[f] >= 2);

                    return invChars.map((c, i) => {
                      const isSelected = selChars.some(s => s.name === c.name);
                      const wouldExceedGTI = totalGTI + (c.gti || 0) > GTI_CAP;
                      const isFull = charsDone;
                      
                      const isDisabled = !isSelected && (isFull || wouldExceedGTI);
                      
                      // NEU: Array-sicherer Hint-Check & Synergie-Übergabe
                      const cardFacs = Array.isArray(c.faction) ? c.faction : (c.faction ? [c.faction] : []);
                      const isHint = !isDisabled && cardFacs.some(f => factionsWithHint.includes(f.trim().toUpperCase()));
                      
                      return (
                        <DraftCard 
                          key={`char-${c.name}-${i}`} card={c}
                          selected={isSelected}
                          disabled={isDisabled}
                          onToggle={() => toggleChar(c)}
                          activeFactions={activeFactions}
                          isSynergyHint={isHint}
                        />
                      );
                    });
                  })()
            ) : (
              invEffs.length === 0
                ? <div className="mono" style={{ gridColumn: '1/-1', color: '#3a4a5a', padding: '40px', textAlign: 'center', fontSize: '0.9rem', letterSpacing: '2px' }}>KEINE TAKTIKEN GEFUNDEN</div>
                : (() => {
                    const activeKeywords = [...selChars, ...(avatarCard ? [avatarCard] : [])].flatMap(c => {
                      const facs = Array.isArray(c.faction) ? c.faction : (c.faction ? [c.faction] : []);
                      return [
                        (c.name || '').toLowerCase(),
                        ...facs.map(f => f.trim().toLowerCase()),
                        (c.type || '').toLowerCase()
                      ].filter(Boolean);
                    });

                    return invEffs.map((c, i) => {
                      const isSelected = selEffs.some(s => s.name === c.name);
                      const isFull = effsDone;
                      const isDisabled = !isSelected && isFull;

                      // Prüfen, ob eine Synergie besteht (Unterstützt Komma-Listen)
                      const rawSyn = Array.isArray(c.syn) ? c.syn.join(', ') : (c.syn || '');
                      const synParts = rawSyn.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                      const isEffectHint = !isDisabled && synParts.length > 0 && activeKeywords.some(kw => 
                        synParts.some(part => kw.includes(part) || part.includes(kw))
                      );

                      return (
                        <DraftCard 
                          key={`eff-${c.name}-${i}`} card={c}
                          selected={isSelected}
                          disabled={isDisabled}
                          onToggle={() => toggleEff(c)}
                          isEffectSynergyHint={isEffectHint}
                        />
                      );
                    });
                  })()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}