import React, { useState, useMemo } from 'react';
import Card from './Card';

// â”€â”€ Type colour helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const typeColor = (card) => {
  if (!card) return '#2a3a4a';
  if (card.id === 'avatar' || card.sp !== undefined) return '#bc13fe';
  if (card.type === 'apex')    return 'var(--apex-pink)';
  if (card.type === 'legacy')  return 'var(--legacy-sepia)';
  if (card.type === 'effect')  return 'var(--eff-col)';
  return 'var(--win)';
};

const typeIcon = (card) => {
  if (!card)                   return 'â—‹';
  if (card.id === 'avatar' || card.sp !== undefined) return 'â˜…';
  if (card.type === 'effect')  return 'â—ˆ';
  return 'â¬¡';
};

// â”€â”€ Empty slot placeholder (BIG) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EmptySlot({ label, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '16px 14px', background: 'rgba(0,0,0,0.3)',
      border: '1px dashed #2a3a4a', borderLeft: '4px solid #2a3a4a',
      display: 'flex', alignItems: 'center', gap: '12px', minHeight: '60px',
      cursor: onClick ? 'pointer' : 'default', transition: '0.2s'
    }}>
      <div className="mono" style={{ fontSize: '0.75rem', color: onClick ? '#4a5a6a' : '#3a4a5a', letterSpacing: '3px', transition: '0.2s' }}>{label}</div>
    </div>
  );
}

// â”€â”€ Filled slot (BIG) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          GTI {card.gti || 'â€”'} // LVL {card.level || 1}
        </div>
      </div>
      {locked
        ? <div className="mono" style={{ fontSize: '0.6rem', color: 'rgba(188,19,254,0.6)', flexShrink: 0, letterSpacing: '2px' }}>GESPERRT</div>
        : <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--lose)', cursor: 'pointer', fontSize: '1.5rem', padding: '0 5px', lineHeight: 1, transition: '0.2s' }}>âœ•</button>
      }
    </div>
  );
}

// â”€â”€ New Visual Draft Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DraftCard({ card, selected, disabled, onToggle, isFactionSynergyActive = false, isSynergyHint = false, isEffectSynergyHint = false }) {
  const tc = typeColor(card);
  return (
    <div
      onClick={disabled ? undefined : onToggle}
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
      <Card card={card} context="inventory" isFactionSynergyActive={isFactionSynergyActive} isSynergyHint={isSynergyHint} isEffectSynergyHint={isEffectSynergyHint} />
      
      {selected && (
        <div style={{ position: 'absolute', inset: 0, border: `3px solid ${tc}`, borderRadius: '8px', pointerEvents: 'none', zIndex: 5 }} />
      )}
      
      {selected && (
        <div className="mono" style={{ 
          position: 'absolute', bottom: '15px', left: '50%', transform: 'translateX(-50%)', 
          background: tc, color: '#000', padding: '6px 16px', fontSize: '0.85rem', 
          fontWeight: 900, borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' 
        }}>
          âœ“ IM SQUAD
        </div>
      )}
    </div>
  );
}

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function RoguelikeSquad({ avatarCard, inventory = [], onConfirm, onBack, isCoop, isHost, partnerReady, mySquadReady }) {
  const [selChars, setSelChars] = useState([]);  // max 4 im Co-Op, 5 im Singleplayer
  const [teamChar, setTeamChar] = useState(null); // NEU: Der Team-Slot!
  const [selEffs,  setSelEffs]  = useState([]);  // max 2
  const [search,   setSearch]   = useState('');
  const [tab,      setTab]      = useState('chars'); // 'chars' | 'effs'

  // NEU: Duplikate filtern (behÃ¤lt immer die Karte mit dem hÃ¶chsten Level)
  const uniqueInventory = useMemo(() => {
    return Object.values((inventory || []).reduce((acc, card) => {
      if (!acc[card.name] || (card.level || 1) > (acc[card.name].level || 1)) {
        acc[card.name] = card;
      }
      return acc;
    }, {}));
  }, [inventory]);

  // Erweiterte Such-Logik
  const matchesSearch = (c, q) => {
    if (!q) return true;
    const n = (c.name || '').toLowerCase();
    const t = (c.type || '').toLowerCase();
    const f = (c.faction || '').toLowerCase();
    const synStr = Array.isArray(c.syn) ? c.syn.join(' ') : (c.syn || '');
    const s = synStr.toLowerCase();
    return n.includes(q) || t.includes(q) || f.includes(q) || s.includes(q);
  };

  // Filter inventory (nutzt jetzt uniqueInventory)
  const invChars = useMemo(() => {
    const q = search.toLowerCase();
    return uniqueInventory
      .filter(c => c.type !== 'effect' && c.id !== 'avatar' && c.name !== avatarCard?.name)
      .filter(c => matchesSearch(c, q))
      .sort((a,b) => (b.gti||0) - (a.gti||0));
  }, [uniqueInventory, avatarCard, search]);

  const invEffs = useMemo(() => {
    const q = search.toLowerCase();
    return uniqueInventory
      .filter(c => c.type === 'effect')
      .filter(c => matchesSearch(c, q));
  }, [uniqueInventory, search]);

  // Toggle selection helpers
  const toggleChar = (card) => {
    // Wenn die Karte schon im Team-Slot ist, dort entfernen
    if (teamChar && teamChar.name === card.name) {
        setTeamChar(null);
        return;
    }
    setSelChars(prev => {
      const already = prev.some(c => c.name === card.name);
      if (already) return prev.filter(c => c.name !== card.name);
      
      const maxChars = isCoop ? 4 : 5;
      // Wenn das normale Deck voll ist, aber der Team-Slot leer, wandert sie dorthin!
      if (prev.length >= maxChars) {
          if (!teamChar && isCoop) setTeamChar(card);
          return prev;
      }
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

  // NEU: Fraktions-Synergie Check fÃ¼r Squad Draft (inkl. Avatar)
  const activeFactions = useMemo(() => {
    const counts = {};
    const allSquadChars = [...selChars, ...(avatarCard ? [avatarCard] : [])];
    allSquadChars.forEach(c => {
      if (c && c.faction && c.type !== 'effect') counts[c.faction] = (counts[c.faction] || 0) + 1;
    });
    return Object.keys(counts).filter(f => counts[f] >= 3);
  }, [selChars, avatarCard]);

  const GTI_CAP  = 450; // max total GTI for 5 chars
  const charsDone = selChars.length === (isCoop ? 4 : 5);
  const teamDone  = isCoop ? !!teamChar : true;
  const effsDone  = selEffs.length  === 2;
  
  const totalGTI  = selChars.reduce((s,c) => s+(c.gti||0), 0) + (teamChar ? (teamChar.gti||0) : 0);
  const overCap   = charsDone && teamDone && totalGTI > GTI_CAP;
  const ready     = charsDone && teamDone && effsDone && !overCap;
  const progress  = Math.round((((selChars.length + (teamChar?1:0)) / 5) * 50) + ((selEffs.length / 2) * 50));

  const handleConfirm = () => {
    if (!ready) return;
    onConfirm(selChars, selEffs, teamChar); // NEU: teamChar wird an App.jsx Ã¼bergeben
  };

  return (
    <div className="screen active" style={{ display: 'block', padding: '22px 24px', overflow: 'hidden' }}>
      {/* Header */}
      <div className="top-bar" style={{ marginBottom: '14px' }}>
        <div>
          <div className="game-title-small" style={{ color: 'var(--apex-pink)' }}>â¬¡ SQUAD-REKRUTIERUNG</div>
          <div className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '3px', marginTop: '4px' }}>
            {selChars.length}/5 CHARS Â· {selEffs.length}/2 EFFEKTE
          </div>
        </div>
        <button className="btn-back" onClick={onBack}>ZURÃœCK</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', marginBottom: '20px', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: ready ? 'var(--win)' : '#bc13fe', borderRadius: '2px', transition: 'width 0.3s', boxShadow: `0 0 10px ${ready ? 'var(--win)' : '#bc13fe'}` }}/>
      </div>

      <div className="rl-squad-layout" style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 165px)', overflow: 'hidden' }}>

        {/* â”€â”€ Left: Squad preview (WIDER & BIGGER) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="rl-squad-sidebar" style={{ width: '340px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '10px' }}>
          
          {/* Avatar locked */}
          <div className="mono" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', padding: '4px 0' }}>â–¸ GHOST AGENT</div>
          {avatarCard
            ? <FilledSlot card={avatarCard} locked/>
            : <EmptySlot label="KEIN AVATAR"/>
          }

          {/* Char slots */}
          <div className="mono" style={{ fontSize: '0.6rem', color: charsDone ? 'var(--win)' : 'rgba(255,255,255,0.3)', letterSpacing: '2px', padding: '10px 0 2px' }}>
            â–¸ CHARS {selChars.length}/{isCoop ? 4 : 5} {charsDone ? 'âœ“' : ''}
          </div>
          {Array.from({ length: isCoop ? 4 : 5 }).map((_, i) => (
            selChars[i]
              ? <FilledSlot key={i} card={selChars[i]} locked={false} onRemove={() => setSelChars(p => p.filter((_, j) => j !== i))} />
              : <EmptySlot key={i} label={`CHAR SLOT ${i + 1}`} onClick={() => setTab('chars')} />
          ))}
          
          {/* NEU: TEAM SLOT (nur im Co-Op) */}
          {isCoop && (
            <>
              <div className="mono" style={{ fontSize: '0.6rem', color: teamDone ? '#bc13fe' : 'rgba(255,255,255,0.3)', letterSpacing: '2px', padding: '10px 0 2px', textShadow: teamDone ? '0 0 8px #bc13fe' : 'none' }}>
                â–¸ TEAM ASSET SLOT {teamDone ? 'âœ“' : ''}
              </div>
              {teamChar 
                ? <div style={{ border: '2px solid #bc13fe', borderRadius: '4px', boxShadow: '0 0 15px rgba(188,19,254,0.2)' }}><FilledSlot card={teamChar} locked={false} onRemove={() => setTeamChar(null)} /></div>
                : <EmptySlot label="TEAM KARTE WÃ„HLEN" onClick={() => setTab('chars')} />
              }
            </>
          )}

          {/* Effect slots */}
          <div className="mono" style={{ fontSize: '0.6rem', color: effsDone ? 'var(--win)' : 'rgba(255,255,255,0.3)', letterSpacing: '2px', padding: '10px 0 2px' }}>
            â–¸ EFFEKTE {selEffs.length}/2 {effsDone ? 'âœ“' : ''}
          </div>
          {Array.from({ length: 2 }).map((_, i) => (
            selEffs[i]
              ? <FilledSlot key={i} card={selEffs[i]} locked={false} onRemove={() => setSelEffs(p => p.filter((_, j) => j !== i))} />
              : <EmptySlot key={i} label={`EFFEKT SLOT ${i + 1}`} onClick={() => setTab('effs')} />
          ))}

          {/* GTI Cap indicator (#005) */}
          {selChars.length > 0 && (
            <div style={{padding:'7px 10px',background:overCap?'rgba(255,215,0,0.07)':'rgba(0,0,0,0.2)',border:`1px solid ${overCap?'var(--ep)':'rgba(255,255,255,0.05)'}`,borderLeft:`3px solid ${overCap?'var(--ep)':'transparent'}`}}>
              <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.22)',letterSpacing:'2px',marginBottom:'2px'}}>â–¸ GESAMT-GTI</div>
              <div className="mono" style={{fontSize:'0.8rem',fontWeight:700,color:overCap?'var(--ep)':'rgba(255,255,255,0.5)'}}>{totalGTI}/{GTI_CAP} {overCap?'âš  LIMIT':''}</div>
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
              ? 'âœ“ SQUAD BEREIT. WARTE AUF HOST...' 
              : (isCoop && !isHost 
                  ? (ready ? 'â–¸ SQUAD BEREIT MELDEN' : 'KARTEN FEHLEN') 
                  : (isCoop && isHost 
                      ? (!ready ? 'KARTEN FEHLEN' : (!partnerReady ? 'WARTE AUF PARTNER SQUAD...' : 'â–¸ RUN INITIALISIEREN')) 
                      : (ready ? 'â–¸ RUN INITIALISIEREN' : overCap ? `âš  GTI ${totalGTI}/${GTI_CAP}` : `${((isCoop ? 4 : 5) - selChars.length) + (2 - selEffs.length)} KARTEN FEHLEN`)))}
          </button>
        </div>

        {/* â”€â”€ Right: Inventory (GRID LAYOUT) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          
          {/* Search + Tab */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <input type="text" placeholder="Suche..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: '3px solid var(--win)', color: '#fff', fontFamily: "'Roboto Mono',monospace", fontSize: '0.9rem', outline: 'none' }} />
            
            <button onClick={() => setTab('chars')}
              style={{ padding: '12px 24px', background: tab === 'chars' ? 'rgba(0,229,255,0.12)' : 'transparent', border: `1px solid ${tab === 'chars' ? 'var(--win)' : '#333'}`, color: tab === 'chars' ? 'var(--win)' : '#555', fontFamily: "'Roboto Mono',monospace", fontSize: '0.85rem', letterSpacing: '3px', cursor: 'pointer', transition: 'all 0.2s' }}>
              â¬¡ CHARS
            </button>
            <button onClick={() => setTab('effs')}
              style={{ padding: '12px 24px', background: tab === 'effs' ? 'rgba(188,19,254,0.12)' : 'transparent', border: `1px solid ${tab === 'effs' ? 'var(--eff-col)' : '#333'}`, color: tab === 'effs' ? 'var(--eff-col)' : '#555', fontFamily: "'Roboto Mono',monospace", fontSize: '0.85rem', letterSpacing: '3px', cursor: 'pointer', transition: 'all 0.2s' }}>
              â—ˆ EFFEKTE
            </button>
          </div>

          {/* Cyberpunk Grid */}
          <div style={{ 
            flex: 1, overflowY: 'auto', paddingRight: '10px', minHeight: 0, 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(160px, 16vw, 260px), 1fr))', 
            gridAutoRows: 'auto', gap: '20px', justifyItems: 'center', alignContent: 'start'
          }}>
            {tab === 'chars' ? (
              invChars.length === 0
                ? <div className="mono" style={{ gridColumn: '1/-1', color: '#3a4a5a', padding: '40px', textAlign: 'center', fontSize: '0.9rem', letterSpacing: '2px' }}>KEINE CHARAKTERE GEFUNDEN</div>
                : (() => {
                    // NEU: Fraktionen zÃ¤hlen (inkl. Team Char)
                    const allSelected = [...selChars];
                    if (teamChar) allSelected.push(teamChar);
                    
                    const factionCounts = {};
                    allSelected.forEach(c => {
                      if (c.faction) factionCounts[c.faction] = (factionCounts[c.faction] || 0) + 1;
                    });
                    
                    // Welche Fraktionen haben 2 ODER MEHR Agenten im Deck?
                    const factionsWithHint = Object.keys(factionCounts).filter(f => factionCounts[f] >= 2);

                    return invChars.map((c, i) => {
                      const isSelected = selChars.some(s => s.name === c.name) || (teamChar && teamChar.name === c.name);
                      const wouldExceedGTI = totalGTI + (c.gti || 0) > GTI_CAP;
                      const isFull = charsDone && teamDone;
                      
                      const isDisabled = !isSelected && (isFull || wouldExceedGTI);
                      // NEU: isHint ist nun auch fÃ¼r bereits selektierte Karten aktiv
                      const isHint = !isDisabled && factionsWithHint.includes(c.faction);
                      
                      return (
                        <DraftCard 
                          key={`char-${c.name}-${i}`} card={c}
                          selected={isSelected}
                          disabled={isDisabled}
                          onToggle={() => toggleChar(c)}
                          isFactionSynergyActive={activeFactions.includes(c.faction)}
                          isSynergyHint={isHint}
                        />
                      );
                    });
                  })()
            ) : (
              invEffs.length === 0
                ? <div className="mono" style={{ gridColumn: '1/-1', color: '#3a4a5a', padding: '40px', textAlign: 'center', fontSize: '0.9rem', letterSpacing: '2px' }}>KEINE EFFEKTE GEFUNDEN</div>
                : (() => {
                    // Sammle alle Keywords (Name, Fraktion, Klasse) der Chars im Squad (inkl. Avatar)
                    const activeKeywords = [...selChars, ...(teamChar ? [teamChar] : []), ...(avatarCard ? [avatarCard] : [])].flatMap(c => [
                      (c.name || '').toLowerCase(),
                      (c.faction || '').toLowerCase(),
                      (c.type || '').toLowerCase()
                    ].filter(Boolean));

                    return invEffs.map((c, i) => {
                      const isSelected = selEffs.some(s => s.name === c.name);
                      const isFull = effsDone;
                      const isDisabled = !isSelected && isFull;

                      // PrÃ¼fen, ob eine Synergie besteht
                      const synStr = Array.isArray(c.syn) ? c.syn.join(' ') : (c.syn || '');
                      const hasSynergyData = synStr.trim().length > 0;
                      const isEffectHint = !isDisabled && hasSynergyData && activeKeywords.some(kw => synStr.toLowerCase().includes(kw));

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