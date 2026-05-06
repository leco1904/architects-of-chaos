import React, { useState } from 'react';
import Card from './Card';
import { playSound } from '../logic/audio';

// ── Schritt-Anzeige ───────────────────────────────────────────────────────
function StepDot({ active, done, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        background: done ? 'var(--win)' : active ? 'rgba(0,229,255,0.15)' : 'rgba(0,0,0,0.5)',
        border: `2px solid ${done ? 'var(--win)' : active ? 'var(--win)' : '#2a3a4a'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: done ? '#000' : active ? 'var(--win)' : '#3a4a5a',
        fontSize: '0.7rem', fontWeight: 700,
      }}>
        {done ? '✓' : active ? '▸' : '○'}
      </div>
      <div className="mono" style={{ fontSize: '0.5rem', letterSpacing: '1px', color: active ? 'var(--win)' : '#3a4a5a' }}>{label}</div>
    </div>
  );
}

// ── Mini-Karten-Card für Deck-Auswahl ─────────────────────────────────────
function DeckSlot({ card, index, isAvatar, selected, onSelect }) {
  const typeColor = card.type === 'apex' ? 'var(--apex-pink)' : card.type === 'legacy' ? 'var(--legacy-sepia)' : card.type === 'effect' ? 'var(--eff-col)' : 'var(--win)';
  return (
    <div
      onClick={isAvatar ? undefined : onSelect}
      style={{
        padding: '12px 14px', cursor: isAvatar ? 'not-allowed' : 'pointer',
        background: selected ? 'rgba(255,0,50,0.08)' : isAvatar ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.45)',
        border: `1px solid ${selected ? 'var(--lose)' : isAvatar ? '#2a3a4a' : typeColor + '33'}`,
        borderLeft: `3px solid ${selected ? 'var(--lose)' : isAvatar ? '#2a3a4a' : typeColor}`,
        opacity: isAvatar ? 0.4 : 1,
        transition: 'all 0.18s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, color: selected ? 'var(--lose)' : '#fff', fontSize: '0.95rem' }}>
            {card.name}
          </div>
          <div className="mono" style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
            {card.type === 'effect' ? '◈ EFFEKT' : '⬡ CHARAKTER'} // LVL {card.level || 1} // GTI {card.gti || '—'}
          </div>
        </div>
        {isAvatar && <div className="mono" style={{ fontSize: '0.5rem', color: '#3a4a5a', letterSpacing: '2px' }}>AVATAR — GESCHÜTZT</div>}
        {selected && !isAvatar && <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--lose)' }}>✕ ERSETZEN</div>}
      </div>
    </div>
  );
}

export default function RoguelikeReward({ rewardData, roguelikeRun, onApplyDraft, onSkip }) {
  const [phase, setPhase] = useState(rewardData?.loot?.length > 0 || rewardData?.credits > 0 ? 'loot' : 'draft_1');
  const [packOpened, setPackOpened] = useState(false);
  
  const [step,         setStep]         = useState(1);  // 1=Karte wählen, 2=Ersetzen wählen
  const [chosenCard,   setChosenCard]   = useState(null);
  const [replaceIdx,   setReplaceIdx]   = useState(null);
  const [replaceIn,    setReplaceIn]    = useState(null); // 'chars' | 'effs'

  const deck = roguelikeRun?.runDeck || { chars: [], effs: [] };
  const draftCards = rewardData?.draft || [];

  const confirmDraft = () => {
    // Sicherstellen, dass alles definiert ist
    if (chosenCard && replaceIdx !== null && replaceIn !== null) {
        playSound('click');
        onApplyDraft(chosenCard, replaceIdx, replaceIn);
    } else {
        alert("Bitte wähle zuerst eine Karte zum Ersetzen aus.");
    }
  };

  const selectSlot = (idx, inList) => {
    playSound('click');
    setReplaceIdx(idx);
    setReplaceIn(inList);
  };

  const openPack = () => {
    playSound('clash');
    setPackOpened(true);
  };

  // ── PHASE 0: PERMANENT LOOT (Credits & Pack) ──────────────────────────
  if (phase === 'loot') {
    const hasPack = rewardData.packName && rewardData.loot?.length > 0;
    const canContinue = !hasPack || packOpened;

    return (
      <div className="screen active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 30px', minHeight: '100vh', background: 'rgba(5,2,12,0.95)' }}>
        <h1 style={{ color: 'var(--ep)', textShadow: '0 0 20px var(--ep)', letterSpacing: '6px', fontSize: '3rem', marginBottom: '20px' }}>NODE GECLEART</h1>
        <h2 className="mono" style={{ color: '#fff', fontSize: '1.5rem', background: 'rgba(255,215,0,0.1)', padding: '10px 30px', border: '1px solid var(--ep)', borderRadius: '8px' }}>
          +{rewardData.credits} 💳 SYSTEM CREDITS
        </h2>
        
        {hasPack && !packOpened && (
          <div 
            onClick={openPack}
            className="pack-item" 
            style={{ borderColor: rewardData.packColor, marginTop: '40px', cursor: 'pointer', boxShadow: `0 0 30px ${rewardData.packColor}44`, background: `${rewardData.packColor}11` }}
          >
            <div className="pack-icon" style={{ textShadow: `0 0 20px ${rewardData.packColor}` }}>📦</div>
            <h3 style={{ color: rewardData.packColor, fontSize: '1.5rem', letterSpacing: '2px', textShadow: `0 0 10px ${rewardData.packColor}` }}>{rewardData.packName}</h3>
            <p className="mono" style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '10px' }}>KLICKEN ZUM DECRYPTEN</p>
          </div>
        )}

        {packOpened && rewardData.loot && (
          <div style={{ marginTop: '40px', display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {rewardData.loot.map((c, i) => (
              <div key={i} className="pulled-card-wrapper" style={{ animationDelay: `${i * 0.15}s` }}>
                <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center', width: '360px', height: '504px', marginBottom: '-220px' }}>
                  <Card card={c} context="inventory" />
                </div>
              </div>
            ))}
          </div>
        )}

        {canContinue && (
          <button onClick={() => setPhase('draft_1')} className="menu-btn btn-play modern-btn" style={{ marginTop: '60px', width: 'auto', padding: '15px 40px', background: 'var(--win)', color: '#000', borderColor: 'var(--win)' }}>
            WEITER ZUM DECK DRAFT ▸
          </button>
        )}
      </div>
    );
  }

  // ── PHASE 1 & 2: RUN DECK DRAFT ───────────────────────────────────────
  return (
    <div className="screen active" style={{ display: 'block', padding: '28px 30px' }}>
      <div className="top-bar" style={{ marginBottom: '20px' }}>
        <div>
          <div className="game-title-small" style={{ color: 'var(--win)' }}>⬡ RUN UPGRADE</div>
          <div className="mono" style={{ fontSize: '0.62rem', color: 'rgba(0,229,255,0.5)', letterSpacing: '3px', marginTop: '2px' }}>
            DECK-DRAFT VERFÜGBAR
          </div>
        </div>
        <button onClick={onSkip} style={{ background: 'transparent', border: '1px solid #2a3a4a', color: '#3a4a5a', fontFamily: "'Roboto Mono',monospace", fontSize: '0.65rem', letterSpacing: '2px', padding: '6px 12px', cursor: 'pointer' }}>
          ÜBERSPRINGEN
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', maxWidth: '400px' }}>
        <StepDot active={step===1} done={step>1} label="WÄHLEN" />
        <div style={{ flex: 1, height: '1px', background: step > 1 ? 'var(--win)' : 'rgba(255,255,255,0.08)' }}/>
        <StepDot active={step===2} done={false} label="ERSETZEN" />
      </div>

      {step === 1 && (
        <div>
          <div className="mono" style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', marginBottom: '14px' }}>
            ▸ EINE KARTE IN DAS RUN-DECK AUFNEHMEN
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {draftCards.map((card, i) => (
              <div key={i} onClick={() => { playSound('click'); setChosenCard(card); }}
                style={{
                  cursor: 'pointer', transform: chosenCard?.name === card.name ? 'translateY(-8px)' : 'none',
                  transition: 'transform 0.2s ease',
                  outline: chosenCard?.name === card.name ? '3px solid var(--win)' : '3px solid transparent',
                  outlineOffset: '4px',
                  borderRadius: '2px',
                }}
              >
                <Card card={card} context="inventory" />
              </div>
            ))}
          </div>
          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => { playSound('click'); chosenCard && setStep(2); }}
              disabled={!chosenCard}
              style={{
                padding: '13px 40px',
                background: chosenCard ? 'rgba(0,229,255,0.08)' : 'transparent',
                border: `1px solid ${chosenCard ? 'var(--win)' : '#2a3a4a'}`,
                color: chosenCard ? 'var(--win)' : '#2a3a4a',
                fontFamily: "'Roboto Mono',monospace", fontSize: '0.85rem', fontWeight: 700,
                letterSpacing: '4px', cursor: chosenCard ? 'pointer' : 'not-allowed',
              }}
            >
              {chosenCard ? `▸ ${chosenCard.name} AUFNEHMEN` : 'KARTE AUSWÄHLEN'}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div className="mono" style={{ fontSize: '0.58rem', color: 'var(--win)', letterSpacing: '3px' }}>▸ NEUE KARTE</div>
              <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', width: '360px', height: '380px', marginBottom: '-100px' }}>
                <Card card={chosenCard} context="inventory" />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '280px' }}>
              <div className="mono" style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', marginBottom: '12px' }}>
                ▸ WELCHE KARTE ERSETZEN? (Avatar ist geschützt)
              </div>

              {/* Visual deck grid for step 2 (#012) */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                {(deck.chars || []).map((card, i) => {
                  const isAv = i === 0;
                  const isSelected = replaceIn==='chars' && replaceIdx===i;
                  const tc = card.type==='apex'?'var(--apex-pink)':card.type==='legacy'?'var(--legacy-sepia)':card.type==='effect'?'var(--eff-col)':'var(--win)';
                  return (
                    <div key={i} onClick={isAv?undefined:()=>selectSlot(i,'chars')}
                      style={{position:'relative',cursor:isAv?'not-allowed':'pointer',opacity:isAv?0.45:1,
                        transform:isSelected?'translateY(-6px)':'none',
                        outline:isSelected?`3px solid var(--lose)`:`3px solid ${isAv?'transparent':'transparent'}`,
                        outlineOffset:'4px',transition:'all 0.2s',
                        filter:isAv?'grayscale(40%)':'none',borderRadius:'4px',
                      }}>
                      <div style={{width:'180px',height:'252px',overflow:'hidden',borderRadius:'4px',border:`1px solid ${isSelected?'var(--lose)':tc+'33'}`}}>
                        <div style={{transform:'scale(0.5)',transformOrigin:'top left',width:'360px',height:'504px',pointerEvents:'none'}}>
                          <Card card={card} context="inventory"/>
                        </div>
                      </div>
                      {isAv && <div style={{position:'absolute',bottom:'6px',left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.9)',padding:'3px 8px',borderRadius:'2px'}}><span className="mono" style={{fontSize:'0.46rem',color:'#666',letterSpacing:'2px'}}>AVATAR — GESPERRT</span></div>}
                      {isSelected && !isAv && <div style={{position:'absolute',bottom:'6px',left:'50%',transform:'translateX(-50%)',background:'var(--lose)',padding:'4px 10px',borderRadius:'2px'}}><span className="mono" style={{fontSize:'0.52rem',color:'#000',fontWeight:700}}>✕ ERSETZEN</span></div>}
                    </div>
                  );
                })}
                {(deck.effs || []).map((card, i) => {
                  const isSelected = replaceIn==='effs' && replaceIdx===i;
                  const tc = 'var(--eff-col)';
                  return (
                    <div key={'e'+i} onClick={()=>selectSlot(i,'effs')}
                      style={{position:'relative',cursor:'pointer',
                        transform:isSelected?'translateY(-6px)':'none',
                        outline:isSelected?`3px solid var(--lose)`:'3px solid transparent',
                        outlineOffset:'4px',transition:'all 0.2s',borderRadius:'4px',
                      }}>
                      <div style={{width:'180px',height:'252px',overflow:'hidden',borderRadius:'4px',border:`1px solid ${isSelected?'var(--lose)':tc+'33'}`}}>
                        <div style={{transform:'scale(0.5)',transformOrigin:'top left',width:'360px',height:'504px',pointerEvents:'none'}}>
                          <Card card={card} context="inventory"/>
                        </div>
                      </div>
                      {isSelected && <div style={{position:'absolute',bottom:'6px',left:'50%',transform:'translateX(-50%)',background:'var(--lose)',padding:'4px 10px',borderRadius:'2px'}}><span className="mono" style={{fontSize:'0.52rem',color:'#000',fontWeight:700}}>✕ ERSETZEN</span></div>}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { playSound('click'); setStep(1); setReplaceIdx(null); setReplaceIn(null); }}
                  style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #2a3a4a', color: '#667', fontFamily: "'Roboto Mono',monospace", fontSize: '0.7rem', letterSpacing: '2px', cursor: 'pointer' }}>
                  ← ZURÜCK
                </button>
                <button
                  onClick={confirmDraft}
                  disabled={replaceIdx === null || replaceIn === null}
                  style={{
                    flex: 1, padding: '12px',
                    background: (replaceIdx !== null && replaceIn !== null) ? 'rgba(0,229,255,0.08)' : 'transparent',
                    border: `1px solid ${(replaceIdx !== null && replaceIn !== null) ? 'var(--win)' : '#2a3a4a'}`,
                    color: (replaceIdx !== null && replaceIn !== null) ? 'var(--win)' : '#2a3a4a',
                    fontFamily: "'Roboto Mono',monospace", fontSize: '0.8rem', fontWeight: 700,
                    letterSpacing: '3px', cursor: (replaceIdx !== null && replaceIn !== null) ? 'pointer' : 'not-allowed',
                  }}
                >
                  {(replaceIdx !== null && replaceIn !== null) ? '▸ DRAFT BESTÄTIGEN' : 'KARTE ZUM ERSETZEN WÄHLEN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}