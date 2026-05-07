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
    // Auto-advance
    const t = setTimeout(onNext, 4500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:'20px', padding: '20px'}}>
      <CyberConfetti />
      
      <div className="glass-panel animate-panel-in" style={{ borderColor:'var(--win)', padding:'25px', textAlign:'center', width:'100%', maxWidth:'600px' }}>
        <Corners color="var(--win)"/>
        <div className="mono" style={{ fontSize:'0.7rem', color:'rgba(0,229,255,0.4)', letterSpacing:'4px', marginBottom:'5px' }}>▸ CONFLICT RESOLVED</div>
        <h1 style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:'clamp(1.8rem, 5vw, 2.5rem)', fontWeight:900, color:'#fff', letterSpacing:'6px', margin:0, textShadow:'0 0 20px rgba(0,229,255,0.4)' }}>
           NODE CLEARED
        </h1>
        <div className="mono" style={{ fontSize:'0.8rem', color:'#fff', marginTop:'3px' }}>SEKTOR {sector} // GHOST PROTOCOL STATUS: ONLINE</div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:'15px', width:'100%', maxWidth:'600px'}}>
        {[
          { label: 'AVATAR HP', value: `${hpUpdate.next} / ${hpUpdate.max}`, icon:'❤️', color: hpPct>25?'var(--win)':'var(--lose)', delay: 0.1 },
          { label: 'SKILL POINTS (SP)', value: `+${loot.sp}`, icon:'⏫', color:'#bc13fe', delay: 0.2 },
          { label: 'CREDITS OBTAINED', value: `+${loot.credits} 💳`, icon:'💳', color:'var(--ep)', delay: 0.3 }
        ].map((pod, i) => (
          <div key={i} className="glass-panel animate-panel-in" style={{ borderColor:`${pod.color}44`, padding:'15px', textAlign:'center', animationDelay:`${pod.delay}s` }}>
            <div className="mono" style={{fontSize:'0.5rem', color:`${pod.color}aa`, letterSpacing:'2px', marginBottom:'5px'}}>{pod.label}</div>
            <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
               <span style={{fontSize:'1.3rem'}}>{pod.icon}</span>
               <span className="mono" style={{fontWeight:900, fontSize:'1.2rem', color:pod.color}}>{pod.value}</span>
            </div>
          </div>
        ))}
      </div>

      <button className="menu-btn animate-panel-in" style={{ borderColor:'var(--win)', color:'var(--win)', marginTop:'20px', animationDelay:'0.5s', maxWidth: '400px' }} onClick={onNext}>
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
        <div>
          <div className="mono" style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', marginBottom: '14px', textAlign: 'center' }}>
            ▸ EINE KARTE IN DAS RUN-DECK AUFNEHMEN
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', justifyItems: 'center' }}>
            {draftCards.map((card, i) => (
              <div key={i} onClick={() => { playSound('click'); setChosenCard(card); }}
                style={{
                  cursor: 'pointer', transform: chosenCard?.name === card.name ? 'translateY(-8px) scale(1.05)' : 'none',
                  transition: 'transform 0.2s ease',
                  outline: chosenCard?.name === card.name ? '3px solid var(--win)' : '3px solid transparent',
                  outlineOffset: '4px',
                  borderRadius: '2px',
                }}
              >
                <div style={{ transform: 'scale(0.6)', transformOrigin: 'top center', width: '360px', height: '504px', marginBottom: '-200px', pointerEvents: 'none' }}>
                   <Card card={card} context="inventory" />
                </div>
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
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div className="mono" style={{ fontSize: '0.58rem', color: 'var(--win)', letterSpacing: '3px' }}>▸ NEUE KARTE</div>
              <div style={{ transform: 'scale(0.65)', transformOrigin: 'top center', width: '360px', height: '504px', marginBottom: '-170px' }}>
                <Card card={chosenCard} context="inventory" />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '280px', maxWidth: '600px' }}>
              <div className="mono" style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px', marginBottom: '12px' }}>
                ▸ WELCHE KARTE ERSETZEN? (Avatar ist geschützt)
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', justifyContent: 'center' }}>
                {(deck.chars || []).map((card, i) => {
                  const isAv = i === 0;
                  const isSelected = replaceIn==='chars' && replaceIdx===i;
                  const tc = card.type==='apex'?'var(--apex-pink)':card.type==='legacy'?'var(--legacy-sepia)':card.type==='effect'?'var(--eff-col)':'var(--win)';
                  return (
                    <div key={i} onClick={isAv?undefined:()=>selectSlot(i,'chars')}
                      style={{position:'relative',cursor:isAv?'not-allowed':'pointer',opacity:isAv?0.45:1,
                        transform:isSelected?'translateY(-6px)':'none',
                        outline:isSelected?`2px solid var(--lose)`:`2px solid ${isAv?'transparent':'transparent'}`,
                        outlineOffset:'2px',transition:'all 0.2s',
                        filter:isAv?'grayscale(40%)':'none',borderRadius:'4px',
                      }}>
                      <div style={{width:'126px',height:'176px',overflow:'hidden',borderRadius:'4px',border:`1px solid ${isSelected?'var(--lose)':tc+'33'}`}}>
                        <div style={{transform:'scale(0.35)',transformOrigin:'top left',width:'360px',height:'504px',pointerEvents:'none'}}>
                          <Card card={card} context="inventory"/>
                        </div>
                      </div>
                      {isSelected && !isAv && <div style={{position:'absolute',bottom:'6px',left:'50%',transform:'translateX(-50%)',background:'var(--lose)',padding:'4px 10px',borderRadius:'2px'}}><span className="mono" style={{fontSize:'0.45rem',color:'#000',fontWeight:700}}>✕ ERSETZEN</span></div>}
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
                        outline:isSelected?`2px solid var(--lose)`:'2px solid transparent',
                        outlineOffset:'2px',transition:'all 0.2s',borderRadius:'4px',
                      }}>
                      <div style={{width:'126px',height:'176px',overflow:'hidden',borderRadius:'4px',border:`1px solid ${isSelected?'var(--lose)':tc+'33'}`}}>
                        <div style={{transform:'scale(0.35)',transformOrigin:'top left',width:'360px',height:'504px',pointerEvents:'none'}}>
                          <Card card={card} context="inventory"/>
                        </div>
                      </div>
                      {isSelected && <div style={{position:'absolute',bottom:'6px',left:'50%',transform:'translateX(-50%)',background:'var(--lose)',padding:'4px 10px',borderRadius:'2px'}}><span className="mono" style={{fontSize:'0.45rem',color:'#000',fontWeight:700}}>✕ ERSETZEN</span></div>}
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