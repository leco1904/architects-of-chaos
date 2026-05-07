import React, { useState, useEffect } from 'react';
import Card from './Card';
import { playSound } from '../logic/audio';

// ── Components ──────────────────────────────────────────────────
function Corners({ color='var(--win)', size=8 }) {
  const b = { position:'absolute', width:size, height:size, borderColor:color, borderStyle:'solid', pointerEvents:'none' };
  return (<>
    <div style={{...b,top:-1,left:-1,borderWidth:'1px 0 0 1px'}}/><div style={{...b,top:-1,right:-1,borderWidth:'1px 1px 0 0'}}/>
    <div style={{...b,bottom:-1,left:-1,borderWidth:'0 0 1px 1px'}}/><div style={{...b,bottom:-1,right:-1,borderWidth:'0 1px 1px 0'}}/>
  </>);
}

function CyberConfetti() {
  const colors = ['#00e5ff', '#ff007f', '#bc13fe', '#ffd700'];
  return (
    <div style={{position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none'}}>
      {[...Array(30)].map((_, i) => (
        <div key={i} className="cyber-confetti" style={{
          left: `${Math.random()*100}%`, top: `-10px`,
          background: colors[Math.floor(Math.random()*colors.length)],
          animationDelay: `${Math.random()*0.5}s`,
          animationDuration: `${1 + Math.random()*1}s`
        }}/>
      ))}
    </div>
  );
}

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

// ── STAGE 1: LOOT SUMMARY ─────────────────────
function LootSummaryStage({ rewardData, roguelikeRun, onNext }) {
  const { node, sector } = roguelikeRun;
  const { hpUpdate, loot } = rewardData;
  const hpPct = Math.max(0, (hpUpdate.next / hpUpdate.max) * 100);

  useEffect(() => {
    setTimeout(() => playSound('upgrade'), 300);
    setTimeout(() => playSound('upgrade'), 600);
    const t = setTimeout(onNext, 5000);
    return () => clearTimeout(t);
  }, []);

  const pods = [
    { label: 'AVATAR HP', value: `${hpUpdate.next} / ${hpUpdate.max}`, icon: '❤️', color: hpPct > 25 ? 'var(--win)' : 'var(--lose)', delay: 0.1 },
    { label: 'SKILL POINTS (SP)', value: `+${loot.sp}`, icon: '⏫', color: '#bc13fe', delay: 0.2 },
    { label: 'CREDITS OBTAINED', value: `+${loot.credits} 💳`, icon: '💳', color: 'var(--ep)', delay: 0.3 },
  ];
  if (loot.pack) pods.push({
    label: 'PACK REWARD', value: loot.pack.name || 'DATA CACHE', icon: '📦', color: 'var(--apex-pink)', delay: 0.4
  });

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '24px', padding: '20px' }}>
      <CyberConfetti />

      {/* Title panel */}
      <div className="glass-panel animate-panel-in" style={{ borderColor: 'var(--win)', padding: '30px 40px', textAlign: 'center', width: '100%', maxWidth: '640px', position: 'relative' }}>
        <Corners color="var(--win)" size={10}/>
        <div className="mono" style={{ fontSize: '0.7rem', color: 'rgba(0,229,255,0.4)', letterSpacing: '5px', marginBottom: '8px' }}>▸ CONFLICT RESOLVED</div>
        <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '8px', margin: '0 0 8px', textShadow: '0 0 30px rgba(0,229,255,0.5)' }}>
          NODE {node}/5 CLEARED
        </h1>
        <div className="mono" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>SEKTOR {sector} // GHOST PROTOCOL STATUS: ONLINE</div>
      </div>

      {/* Reward pods */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pods.length}, minmax(130px, 180px))`, gap: '14px', width: '100%', maxWidth: '800px', justifyContent: 'center' }}>
        {pods.map((pod, i) => (
          <div key={i} className="glass-panel animate-panel-in" style={{ borderColor: `${pod.color}55`, padding: '18px 14px', textAlign: 'center', animationDelay: `${pod.delay}s`, position: 'relative' }}>
            <Corners color={`${pod.color}66`} size={6}/>
            <div className="mono" style={{ fontSize: '0.48rem', color: `${pod.color}aa`, letterSpacing: '2px', marginBottom: '8px' }}>{pod.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>{pod.icon}</span>
              <span className="mono" style={{ fontWeight: 900, fontSize: '1.1rem', color: pod.color, letterSpacing: '1px' }}>{pod.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pack reward highlighted box if present */}
      {loot.pack && (
        <div className="glass-panel animate-panel-in" style={{ borderColor: 'var(--apex-pink)', borderLeft: '4px solid var(--apex-pink)', padding: '14px 24px', maxWidth: '500px', width: '100%', display: 'flex', alignItems: 'center', gap: '16px', animationDelay: '0.5s', background: 'rgba(255,0,127,0.06)' }}>
          <span style={{ fontSize: '2rem' }}>📦</span>
          <div>
            <div className="mono" style={{ fontSize: '0.55rem', color: 'var(--apex-pink)', letterSpacing: '3px', marginBottom: '3px' }}>PACK REWARD ERHALTEN</div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>{loot.pack.name || 'DATA CACHE'}</div>
            <div className="mono" style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Wird automatisch zu deinen Gratis-Packs hinzugefügt</div>
          </div>
        </div>
      )}

      <button className="menu-btn animate-panel-in" style={{ borderColor: 'var(--win)', color: 'var(--win)', maxWidth: '420px', animationDelay: '0.6s' }} onClick={onNext}>
        NEXT: DEPLOY NEW ASSET ▸
      </button>
    </div>
  );
}

// ── STAGE 2: CARD DRAFT ──────────────────────────
function CardDraftStage({ rewardData, roguelikeRun, onApplyDraft, onSkip }) {
  const [step, setStep] = useState(1);
  const [chosenCard, setChosenCard] = useState(null);
  const [replaceIdx, setReplaceIdx] = useState(null);
  const [replaceIn, setReplaceIn] = useState(null);

  const deck = roguelikeRun?.runDeck || { chars: [], effs: [] };
  const draftCards = rewardData?.draft || [];

  useEffect(() => { playSound('matchIntro'); }, []);

  const confirmDraft = () => {
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px auto' }}>
        <StepDot active={step===1} done={step>1} label="WÄHLEN" />
        <div style={{ flex: 1, height: '1px', background: step > 1 ? 'var(--win)' : 'rgba(255,255,255,0.08)' }}/>
        <StepDot active={step===2} done={false} label="ERSETZEN" />
      </div>

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div className="mono" style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', textAlign: 'center' }}>
            ▸ EINE KARTE IN DAS RUN-DECK AUFNEHMEN
          </div>

          {/* Big card grid — scale 0.78 with correct wrapper sizing */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {draftCards.map((card, i) => {
              const W = 360, H = 504, S = 0.78;
              const vw = Math.round(W * S), vh = Math.round(H * S);
              const selected = chosenCard?.name === card.name;
              return (
                <div key={i} onClick={() => { playSound('click'); setChosenCard(card); }}
                  style={{ cursor: 'pointer', position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s',
                    transform: selected ? 'translateY(-10px)' : 'none',
                    boxShadow: selected ? '0 0 30px rgba(0,229,255,0.5)' : 'none',
                  }}>
                  {/* Sized to visual dimensions so grid packs tight */}
                  <div style={{ width: vw, height: vh, overflow: 'hidden', borderRadius: '8px',
                    outline: selected ? '3px solid var(--win)' : '3px solid transparent', outlineOffset: '3px' }}>
                    <div style={{ width: W, height: H, transform: `scale(${S})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                      <Card card={card} context="inventory" />
                    </div>
                  </div>
                  {selected && (
                    <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--win)', color: '#000', padding: '5px 14px', borderRadius: '4px', zIndex: 5 }}>
                      <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 900 }}>✓ AUSGEWÄHLT</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => { playSound('click'); chosenCard && setStep(2); }} disabled={!chosenCard}
            style={{ padding: '14px 50px', background: chosenCard ? 'rgba(0,229,255,0.1)' : 'transparent',
              border: `1px solid ${chosenCard ? 'var(--win)' : '#2a3a4a'}`,
              color: chosenCard ? 'var(--win)' : '#2a3a4a',
              fontFamily: "'Roboto Mono',monospace", fontSize: '0.85rem', fontWeight: 700,
              letterSpacing: '4px', cursor: chosenCard ? 'pointer' : 'not-allowed',
            }}>
            {chosenCard ? `▸ ${chosenCard.name} AUFNEHMEN` : 'KARTE AUSWÄHLEN'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start', height: 'calc(100vh - 160px)', overflow: 'hidden' }}>

          {/* Left: chosen new card */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div className="mono" style={{ fontSize: '0.58rem', color: 'var(--win)', letterSpacing: '3px' }}>▸ NEUE KARTE</div>
            {(() => { const S=0.72, W=360, H=504; return (
              <div style={{ width: Math.round(W*S), height: Math.round(H*S), overflow:'hidden', borderRadius:'8px', border:'2px solid var(--win)', boxShadow:'0 0 20px rgba(0,229,255,0.3)' }}>
                <div style={{ width:W, height:H, transform:`scale(${S})`, transformOrigin:'top left', pointerEvents:'none' }}>
                  <Card card={chosenCard} context="inventory"/>
                </div>
              </div>
            ); })()}
          </div>

          {/* Right: replacement grid */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0, overflow: 'hidden' }}>
            <div className="mono" style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '3px' }}>
              ▸ WELCHE KARTE ERSETZEN? (Avatar ist geschützt)
            </div>

            {/* Cards in 4-col grid, bigger scale 0.5 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: '12px', overflow: 'auto' }}>
              {[...(deck.chars||[]), ...(deck.effs||[]).map(e=>({...e,_isEff:true}))].map((card, i) => {
                const isAv = i === 0 && !card._isEff;
                const inList = card._isEff ? 'effs' : 'chars';
                const idx    = card._isEff ? (deck.effs||[]).findIndex(e=>e.name===card.name) : i;
                const isSelected = replaceIn===inList && replaceIdx===idx;
                const tc = card.type==='apex'?'var(--apex-pink)':card.type==='legacy'?'#b8860b':card._isEff?'var(--eff-col)':'var(--win)';
                const S=0.5, W=360, H=504;
                return (
                  <div key={i} onClick={isAv?undefined:()=>selectSlot(idx,inList)}
                    style={{ position:'relative', cursor:isAv?'not-allowed':'pointer', opacity:isAv?0.4:1,
                      transform:isSelected?'translateY(-6px)':'none', transition:'all 0.18s',
                      borderRadius:'6px', flexShrink: 0,
                    }}>
                    <div style={{ width:Math.round(W*S), height:Math.round(H*S), overflow:'hidden', borderRadius:'6px',
                      border:`2px solid ${isSelected?'var(--lose)':isAv?'#222':tc+'44'}`,
                      boxShadow:isSelected?'0 0 16px rgba(255,0,50,0.4)':'none',
                    }}>
                      <div style={{width:W, height:H, transform:`scale(${S})`, transformOrigin:'top left', pointerEvents:'none'}}>
                        <Card card={card} context="inventory"/>
                      </div>
                    </div>
                    {isSelected && !isAv && (
                      <div style={{position:'absolute',bottom:6,left:'50%',transform:'translateX(-50%)',background:'var(--lose)',padding:'4px 10px',borderRadius:'3px',zIndex:5}}>
                        <span className="mono" style={{fontSize:'0.5rem',color:'#fff',fontWeight:700}}>✕ ERSETZEN</span>
                      </div>
                    )}
                    {isAv && (
                      <div style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.7)',padding:'2px 6px',borderRadius:'3px'}}>
                        <span className="mono" style={{fontSize:'0.45rem',color:'#555'}}>AVATAR</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display:'flex', gap:'10px', marginTop:'auto' }}>
              <button onClick={()=>{playSound('click');setStep(1);setReplaceIdx(null);setReplaceIn(null);}}
                style={{padding:'10px 20px',background:'transparent',border:'1px solid #2a3a4a',color:'#667',
                  fontFamily:"'Roboto Mono',monospace",fontSize:'0.7rem',letterSpacing:'2px',cursor:'pointer'}}>
                ← ZURÜCK
              </button>
              <button onClick={confirmDraft} disabled={replaceIdx===null||replaceIn===null}
                style={{flex:1,padding:'12px',
                  background:(replaceIdx!==null&&replaceIn!==null)?'rgba(0,229,255,0.08)':'transparent',
                  border:`1px solid ${(replaceIdx!==null&&replaceIn!==null)?'var(--win)':'#2a3a4a'}`,
                  color:(replaceIdx!==null&&replaceIn!==null)?'var(--win)':'#2a3a4a',
                  fontFamily:"'Roboto Mono',monospace",fontSize:'0.8rem',fontWeight:700,
                  letterSpacing:'3px',cursor:(replaceIdx!==null&&replaceIn!==null)?'pointer':'not-allowed'}}>
                {(replaceIdx!==null&&replaceIn!==null)?'▸ DRAFT BESTÄTIGEN':'KARTE ZUM ERSETZEN WÄHLEN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ──────────────────────────────────────────
export default function RoguelikeReward({ rewardData, roguelikeRun, onApplyDraft, onSkip }) {
  const [stage, setStage] = useState('summary'); 

  if (!rewardData || !roguelikeRun) return null;

  return (
    <div style={{position:'fixed', inset:0, background:'#05020e', zIndex:10000, overflowY:'auto'}}>
       {stage === 'summary' && rewardData.hpUpdate && (
          <LootSummaryStage 
             rewardData={rewardData} 
             roguelikeRun={roguelikeRun} 
             onNext={() => setStage('draft')} 
          />
       )}
       
       {(stage === 'draft' || !rewardData.hpUpdate) && (
          <CardDraftStage 
             rewardData={rewardData} 
             roguelikeRun={roguelikeRun}
             onApplyDraft={onApplyDraft} 
             onSkip={onSkip}
          />
       )}
    </div>
  );
}