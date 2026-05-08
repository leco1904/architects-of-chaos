import React, { useState, useMemo } from 'react';
import Card from './Card';

// ── Type colour helper ─────────────────────────────────────────────────────
const typeColor = (card) => {
  if (!card) return '#2a3a4a';
  if (card.id === 'avatar' || card.sp !== undefined) return '#bc13fe';
  if (card.type === 'apex')    return 'var(--apex-pink)';
  if (card.type === 'legacy')  return 'var(--legacy-sepia)';
  if (card.type === 'effect')  return 'var(--eff-col)';
  return 'var(--win)';
};

const typeIcon = (card) => {
  if (!card)                   return '○';
  if (card.id === 'avatar' || card.sp !== undefined) return '★';
  if (card.type === 'effect')  return '◈';
  return '⬡';
};

// ── Empty slot placeholder (BIG) ──────────────────────────────────────────
function EmptySlot({ label }) {
  return (
    <div style={{
      padding: '16px 14px', background: 'rgba(0,0,0,0.3)',
      border: '1px dashed #2a3a4a', borderLeft: '4px solid #2a3a4a',
      display: 'flex', alignItems: 'center', gap: '12px', minHeight: '60px',
    }}>
      <div className="mono" style={{ fontSize: '0.75rem', color: '#3a4a5a', letterSpacing: '3px' }}>{label}</div>
    </div>
  );
}

// ── Filled slot (BIG) ─────────────────────────────────────────────────────
function FilledSlot({ card, locked, onRemove }) {
  const tc = typeColor(card);
  return (
    <div style={{
      padding: '12px 14px', background: locked ? 'rgba(188,19,254,0.08)' : 'rgba(0,229,255,0.06)',
      border: `1px solid ${tc}44`, borderLeft: `4px solid ${tc}`,
      display: 'flex', alignItems: 'center', gap: '12px',
    }}>
      <div className="mono" style={{ fontSize: '1.4rem', color: tc, textAlign: 'center', flexShrink: 0 }}>
        {typeIcon(card)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '1.2rem', color: locked ? '#bc13fe' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {card.name}
        </div>
        <div className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', marginTop: '2px' }}>
          GTI {card.gti || '—'} // LVL {card.level || 1}
        </div>
      </div>
      {locked
        ? <div className="mono" style={{ fontSize: '0.6rem', color: 'rgba(188,19,254,0.6)', flexShrink: 0, letterSpacing: '2px' }}>GESPERRT</div>
        : <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--lose)', cursor: 'pointer', fontSize: '1.5rem', padding: '0 5px', lineHeight: 1, transition: '0.2s' }}>✕</button>
      }
    </div>
  );
}

// ── New Visual Draft Card ─────────────────────────────────────────────────
function DraftCard({ card, selected, disabled, onToggle, isFactionSynergyActive = false }) {
  const tc = typeColor(card);
  return (
    <div
      onClick={disabled ? undefined : onToggle}
      style={{
        width: '216px', height: '302px', position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transform: selected ? 'translateY(-8px) scale(1.02)' : 'none',
        boxShadow: selected ? `0 0 30px ${tc}66` : 'none',
        borderRadius: '8px', overflow: 'hidden',
        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}
    >
      <div style={{ width: '360px', height: '504px', transform: 'scale(0.6)', transformOrigin: 'top left', pointerEvents: 'none' }}>
        <Card card={card} context="inventory" isFactionSynergyActive={isFactionSynergyActive} />
      </div>
      
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
}

// ── Main Component ────────────────────────────────────────────────────────
export default function RoguelikeSquad({ avatarCard, inventory = [], onConfirm, onBack }) {
  const [selChars, setSelChars] = useState([]);  // max 5
  const [selEffs,  setSelEffs]  = useState([]);  // max 2
  const [search,   setSearch]   = useState('');
  const [tab,      setTab]      = useState('chars'); // 'chars' | 'effs'

  // NEU: Duplikate filtern (behält immer die Karte mit dem höchsten Level)
  const uniqueInventory = useMemo(() => {
    return Object.values((inventory || []).reduce((acc, card) => {
      if (!acc[card.name] || (card.level || 1) > (acc[card.name].level || 1)) {
        acc[card.name] = card;
      }
      return acc;
    }, {}));
  }, [inventory]);

  // Filter inventory (nutzt jetzt uniqueInventory)
  const invChars = useMemo(() => {
    const q = search.toLowerCase();
    return uniqueInventory
      .filter(c => c.type !== 'effect' && c.id !== 'avatar' && c.name !== avatarCard?.name)
      .filter(c => !search || (c.name||'').toLowerCase().includes(q))
      .sort((a,b) => (b.gti||0) - (a.gti||0));
  }, [uniqueInventory, avatarCard, search]);

  const invEffs = useMemo(() => {
    const q = search.toLowerCase();
    return uniqueInventory
      .filter(c => c.type === 'effect')
      .filter(c => !search || (c.name||'').toLowerCase().includes(q));
  }, [uniqueInventory, search]);

  // Toggle selection helpers
  const toggleChar = (card) => {
    setSelChars(prev => {
      const already = prev.some(c => c.name === card.name);
      if (already) return prev.filter(c => c.name !== card.name);
      if (prev.length >= 5) return prev;
      return [...prev, card];
    });
  };
  const toggleEff = (card) => {
    setSelEffs(prev => {
      const already = prev.some(c => c.name === card.name);
      if (already) return prev.filter(c => c.name !== card.name);
      if (prev.length >= 2) return prev;
      return [...prev, card];
    });
  };

  // NEU: Fraktions-Synergie Check für Squad Draft (inkl. Avatar)
  const activeFactions = useMemo(() => {
    const counts = {};
    const allSquadChars = [...selChars, ...(avatarCard ? [avatarCard] : [])];
    allSquadChars.forEach(c => {
      if (c && c.faction && c.type !== 'effect') counts[c.faction] = (counts[c.faction] || 0) + 1;
    });
    return Object.keys(counts).filter(f => counts[f] >= 3);
  }, [selChars, avatarCard]);

  const GTI_CAP  = 450; // max total GTI for 5 chars
  const charsDone = selChars.length === 5;
  const effsDone  = selEffs.length  === 2;
  const totalGTI  = selChars.reduce((s,c) => s+(c.gti||0), 0);
  const overCap   = charsDone && totalGTI > GTI_CAP;
  const ready     = charsDone && effsDone && !overCap;
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
            {selChars.length}/5 CHARS · {selEffs.length}/2 EFFEKTE
          </div>
        </div>
        <button className="btn-back" onClick={onBack}>ZURÜCK</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', marginBottom: '20px', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: ready ? 'var(--win)' : '#bc13fe', borderRadius: '2px', transition: 'width 0.3s', boxShadow: `0 0 10px ${ready ? 'var(--win)' : '#bc13fe'}` }}/>
      </div>

      <div className="rl-squad-layout" style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 165px)', overflow: 'hidden' }}>

        {/* ── Left: Squad preview (WIDER & BIGGER) ──────────────────── */}
        <div className="rl-squad-sidebar" style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '10px' }}>
          
          {/* Avatar locked */}
          <div className="mono" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', padding: '4px 0' }}>▸ GHOST AGENT</div>
          {avatarCard
            ? <FilledSlot card={avatarCard} locked/>
            : <EmptySlot label="KEIN AVATAR"/>
          }

          {/* Char slots */}
          <div className="mono" style={{ fontSize: '0.6rem', color: charsDone ? 'var(--win)' : 'rgba(255,255,255,0.3)', letterSpacing: '2px', padding: '10px 0 2px' }}>
            ▸ CHARS {selChars.length}/5 {charsDone ? '✓' : ''}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            selChars[i]
              ? <FilledSlot key={i} card={selChars[i]} locked={false} onRemove={() => setSelChars(p => p.filter((_, j) => j !== i))} />
              : <EmptySlot key={i} label={`CHAR SLOT ${i + 1}`} />
          ))}

          {/* Effect slots */}
          <div className="mono" style={{ fontSize: '0.6rem', color: effsDone ? 'var(--win)' : 'rgba(255,255,255,0.3)', letterSpacing: '2px', padding: '10px 0 2px' }}>
            ▸ EFFEKTE {selEffs.length}/2 {effsDone ? '✓' : ''}
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            selEffs[i]
              ? <FilledSlot key={i} card={selEffs[i]} locked={false} onRemove={() => setSelEffs(p => p.filter((_, j) => j !== i))} />
              : <EmptySlot key={i} label={`EFFEKT SLOT ${i + 1}`} />
          ))}

          {/* GTI Cap indicator (#005) */}
          {selChars.length > 0 && (
            <div style={{padding:'7px 10px',background:overCap?'rgba(255,215,0,0.07)':'rgba(0,0,0,0.2)',border:`1px solid ${overCap?'var(--ep)':'rgba(255,255,255,0.05)'}`,borderLeft:`3px solid ${overCap?'var(--ep)':'transparent'}`}}>
              <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.22)',letterSpacing:'2px',marginBottom:'2px'}}>▸ GESAMT-GTI</div>
              <div className="mono" style={{fontSize:'0.8rem',fontWeight:700,color:overCap?'var(--ep)':'rgba(255,255,255,0.5)'}}>{totalGTI}/{GTI_CAP} {overCap?'⚠ LIMIT':''}</div>
              {overCap && <div className="mono" style={{fontSize:'0.46rem',color:'var(--ep)',marginTop:'2px',letterSpacing:'1px'}}>Squad zu stark — BALANCING</div>}
            </div>
          )}

          {/* Confirm */}
          <button onClick={handleConfirm} disabled={!ready}
            style={{
              marginTop: '16px', padding: '18px 10px',
              background: ready ? 'rgba(255,0,127,0.15)' : 'transparent',
              border: `2px solid ${ready ? 'var(--apex-pink)' : '#2a3a4a'}`,
              color: ready ? 'var(--apex-pink)' : '#3a4a5a',
              fontFamily: "'Roboto Mono',monospace", fontSize: '0.9rem', fontWeight: 700, letterSpacing: '4px',
              cursor: ready ? 'pointer' : 'not-allowed',
              boxShadow: ready ? '0 0 20px rgba(255,0,127,0.2)' : 'none',
              transition: 'all 0.2s',
            }}>
            {ready ? '▸ RUN INITIALISIEREN' : overCap ? `⚠ GTI ${totalGTI}/${GTI_CAP}` : `${(5 - selChars.length) + (2 - selEffs.length)} KARTEN FEHLEN`}
          </button>
        </div>

        {/* ── Right: Inventory (GRID LAYOUT) ────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          
          {/* Search + Tab */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="text" placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: '3px solid var(--win)', color: '#fff', fontFamily: "'Roboto Mono',monospace", fontSize: '0.9rem', outline: 'none' }} />
            
            <button onClick={() => setTab('chars')}
              style={{ padding: '12px 24px', background: tab === 'chars' ? 'rgba(0,229,255,0.12)' : 'transparent', border: `1px solid ${tab === 'chars' ? 'var(--win)' : '#333'}`, color: tab === 'chars' ? 'var(--win)' : '#555', fontFamily: "'Roboto Mono',monospace", fontSize: '0.85rem', letterSpacing: '3px', cursor: 'pointer', transition: 'all 0.2s' }}>
              ⬡ CHARS
            </button>
            <button onClick={() => setTab('effs')}
              style={{ padding: '12px 24px', background: tab === 'effs' ? 'rgba(188,19,254,0.12)' : 'transparent', border: `1px solid ${tab === 'effs' ? 'var(--eff-col)' : '#333'}`, color: tab === 'effs' ? 'var(--eff-col)' : '#555', fontFamily: "'Roboto Mono',monospace", fontSize: '0.85rem', letterSpacing: '3px', cursor: 'pointer', transition: 'all 0.2s' }}>
              ◈ EFFEKTE
            </button>
          </div>

          {/* Cyberpunk Grid */}
          <div style={{ 
            flex: 1, overflowY: 'auto', paddingRight: '10px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(216px, 1fr))', 
            gap: '20px', justifyItems: 'center', alignContent: 'start'
          }}>
            {tab === 'chars' ? (
              invChars.length === 0
                ? <div className="mono" style={{ gridColumn: '1/-1', color: '#3a4a5a', padding: '40px', textAlign: 'center', fontSize: '0.9rem', letterSpacing: '2px' }}>KEINE CHARAKTERE GEFUNDEN</div>
                : invChars.map((c, i) => (
                    <DraftCard 
                      key={`char-${c.name}-${i}`} card={c}
                      selected={selChars.some(s => s.name === c.name)}
                      disabled={!selChars.some(s => s.name === c.name) && selChars.length >= 5}
                      onToggle={() => toggleChar(c)}
                      isFactionSynergyActive={activeFactions.includes(c.faction)}
                    />
                  ))
            ) : (
              invEffs.length === 0
                ? <div className="mono" style={{ gridColumn: '1/-1', color: '#3a4a5a', padding: '40px', textAlign: 'center', fontSize: '0.9rem', letterSpacing: '2px' }}>KEINE EFFEKTE GEFUNDEN</div>
                : invEffs.map((c, i) => (
                    <DraftCard 
                      key={`eff-${c.name}-${i}`} card={c}
                      selected={selEffs.some(s => s.name === c.name)}
                      disabled={!selEffs.some(s => s.name === c.name) && selEffs.length >= 2}
                      onToggle={() => toggleEff(c)}
                    />
                  ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}