import React, { useState, useEffect } from 'react';
import Card from './Card';
import { playSound } from '../logic/audio';

// ── Helpers & Components ──────────────────────────────────────────────────
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

// ──STAGE 1: LOOT SUMMARY (based on image_15b91a.png) ─────────────────────
function LootSummaryStage({ matchData, roguelikeRun, onNext }) {
  const { node, sector } = roguelikeRun;
  const { hpUpdate, loot } = matchData;
  const hpPct = Math.max(0, (hpUpdate.next / hpUpdate.max) * 100);

  /* MOBILE OPTIMIZATION START */
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(
      window.matchMedia('(max-width: 768px)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    );
    check();
    const mq = window.matchMedia('(max-width: 768px)');
    if (mq.addEventListener) mq.addEventListener('change', check);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', check); };
  }, []);
  /* MOBILE OPTIMIZATION END */

  useEffect(() => {
    setTimeout(() => playSound('upgrade'), 300);
    setTimeout(() => playSound('upgrade'), 600);
    // Auto-advance nach 3.5 Sekunden
    const t = setTimeout(onNext, 3800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:'20px'}}>
      <CyberConfetti />
      
      <div className="glass-panel animate-panel-in" style={{ borderColor:'var(--win)', padding:'25px', textAlign:'center', width:'min(650px, 90vw)' }}>
        <Corners color="var(--win)"/>
        <div className="mono" style={{ fontSize:'0.7rem', color:'rgba(0,229,255,0.4)', letterSpacing:'4px', marginBottom:'5px' }}>▸ CONFLICT RESOLVED</div>
        <h1 style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:'2.5rem', fontWeight:900, color:'#fff', letterSpacing:'6px', margin:0, textShadow:'0 0 20px rgba(0,229,255,0.4)', textTransform: 'uppercase' }}>
           SEKTOR {sector} - NODE {node} CLEARED
        </h1>
        <div className="mono" style={{ fontSize:'0.8rem', color:'#fff', marginTop:'3px' }}>GHOST PROTOCOL STATUS: ONLINE</div>
      </div>

      <div style={{
        display:'grid',
        /* MOBILE OPTIMIZATION START */
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
        /* MOBILE OPTIMIZATION END */
        gap:'15px', width:'min(500px, 90vw)'
      }}>
        {/* Pods like image_15b91a.png */}
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

      <button className="menu-btn animate-panel-in" style={{ borderColor:'var(--win)', color:'var(--win)', marginTop:'20px', animationDelay:'0.5s' }} onClick={onNext}>
         NEXT: DEPLOY NEW ASSET ▸
      </button>
    </div>
  );
}

// ──STAGE 2: CARD DRAFT (REFUCTOR OF YOUR RoguelikeReward.jsx) ──────────
function CardDraftStage({ matchData, onDraftComplete, roguelikeRun }) {
  const { cardChoices, loot } = matchData;
  const actionLocked = React.useRef(false); // Verhindert Doppel-Klicks

  /* MOBILE OPTIMIZATION START */
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(
      window.matchMedia('(max-width: 768px)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    );
    check();
    const mq = window.matchMedia('(max-width: 768px)');
    if (mq.addEventListener) mq.addEventListener('change', check);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', check); };
  }, []);
  /* MOBILE OPTIMIZATION END */

  useEffect(() => {
    playSound('matchIntro');
  }, []);

  const handleCardSelect = (card) => {
    if (actionLocked.current) return;
    actionLocked.current = true;
    
    playSound('draft');
    
    // Prüfen, ob die Karte bereits im Deck ist (für Upgrade-Logik)
    const deck = roguelikeRun?.runDeck || { chars: [], effs: [] };
    const existing = [...deck.chars, ...deck.effs].find(c => c.name === card.name);
    
    if (existing) {
      // Wenn Upgrade: Direkt anwenden (isUpgrade=true, isLastAction=true)
      onDraftComplete(card, null, null, true, true);
    } else {
      // Wenn neu: Normaler Flow (isUpgrade=false, isLastAction=true)
      // Falls du ein "Ersetzen"-System in App.jsx hast, stelle sicher, 
      // dass onDraftComplete dort die entsprechenden Parameter (idx, target) verarbeitet.
      onDraftComplete(card, null, null, false, true);
    }
  };

  // YOUR CSS INTEGRATED
  const styles = `
    .rw-container { min-height:100vh; background:#04020a; color:#fff; font-family:'Roboto Mono',monospace; padding:30px; display:flex; flex-direction:column; align-items:center; position:relative; overflow:hidden; }
    .rw-bglayer1 { position:absolute; inset:0; background:radial-gradient(circle at 10% 90%,rgba(188,19,254,0.1),transparent 40%), radial-gradient(circle at 90% 10%,rgba(0,229,255,0.06),transparent 40%); opacity:0.6; z-index:0; }
    .rw-scoverlay { position:absolute; inset:0; background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,229,255,0.02) 2px,rgba(0,229,255,0.02) 4px); pointer-events:none; z-index:1; }
    .rw-content { position:relative; z-index:2; width:100%; max-width:1200px; display:flex; flex-direction:column; height:100%; flex:1; }
    .rw-header { text-align:center; margin-bottom:30px; margin-top:20px; }
    .rw-title { font-family:'Rajdhani',sans-serif; font-weight:900; fontSize:2.8rem; letterSpacing:6px; color:#fff; textShadow:0 0 20px rgba(0,229,255,0.4); margin:0; }
    .rw-card-grid { display:grid; gap:30px; margin-top:30px; flex:1; justify-content:center; align-items:start; padding-bottom:50px; }
    .rw-card-wrapper { position:relative; transition:all 0.3s; cursor:pointer; }
    .rw-card-wrapper:hover { transform:translateY(-10px); }
    .rw-card-wrapper::after { content:''; position:absolute; inset:-3px; border:2px solid transparent; border-radius:12px; transition:0.3s; z-index:10; pointer-events:none; }
    .rw-card-wrapper:hover::after { border-color:var(--win); box-shadow:0 0 20px var(--win); }
    /* MOBILE OPTIMIZATION START */
    @media (max-width: 768px) {
      .rw-container { padding: 16px !important; }
      .rw-card-grid { grid-template-columns: 1fr !important; max-width: 280px !important; margin: 0 auto !important; gap: 20px !important; align-items: center !important; }
      .rw-header { margin-bottom: 15px !important; }
      .rw-title { font-size: 1.8rem !important; letter-spacing: 3px !important; }
    }
    /* MOBILE OPTIMIZATION END */
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="rw-container">
        <div className="rw-bglayer1"/>
        <div className="rw-scoverlay"/>
        
        <div className="rw-content">
          <div className="rw-header">
             <div className="mono" style={{fontSize:'0.6rem', color:'rgba(0,229,255,0.3)', letterSpacing:'4px'}}>GHOST NODE // PHASE: ASSET DEPLOYMENT</div>
             <h1 className="rw-title">SELECT NEW UNIT</h1>
             <div className="mono" style={{fontSize:'0.75rem', color:'#888', marginTop:'5px'}}>Wähle eine der drei analysierten Signaturen zur Rekrutierung aus.</div>
             
             {/* Info Panel: Was wurde gerade geaddet */}
             <div style={{marginTop:'20px', display:'flex', gap:'15px', justifyContent:'center'}}>
               <div className="glass-panel" style={{padding:'10px 20px', borderColor:'#bc13fe44', background:'rgba(188,19,254,0.05)'}}>
                  <div className="mono" style={{color:'#bc13feaa', fontSize:'0.5rem'}}>SP ADDED</div>
                  <div className="mono" style={{color:'#bc13fe', fontWeight:900, fontSize:'1.1rem'}}>+ {loot.sp}</div>
               </div>
                <div className="glass-panel" style={{padding:'10px 20px', borderColor:'var(--ep)44', background:'rgba(255,215,0,0.05)'}}>
                  <div className="mono" style={{color:'var(--ep)aa', fontSize:'0.5rem'}}>CREDITS RECEIVED</div>
                  <div className="mono" style={{color:'var(--ep)', fontWeight:900, fontSize:'1.1rem'}}>+ {loot.credits} 💳</div>
               </div>
             </div>
          </div>

          {/* DRAFT GRID (YOUR CODE INTEGRATED) */}
          {/* MOBILE OPTIMIZATION START */}
          <div className="rw-card-grid" style={{
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(280px, 1fr))',
          }}>
            {cardChoices.map((card, i) => (
              <div 
                key={i} 
                className="rw-card-wrapper" 
                onClick={() => handleCardSelect(card)}
              >
                <div style={{pointerEvents:'none'}}> {/* Verhindert Klicks *innerhalb* der Card */}
                   <Card card={card} context="draft" />
                </div>
              </div>
            ))}
          </div>
          {/* MOBILE OPTIMIZATION END */}
        </div>
      </div>
    </>
  );
}

// ── MAIN COMPONENT (Flow Switcher) ──────────────────────────────────────────
export default function RoguelikeVictoryScreen({ matchData, roguelikeRun, onDraftComplete }) { 
  const [stage, setStage] = useState('summary'); // Stages: summary -> draft

  // Sicherheits-Check
  if (!matchData || !roguelikeRun) return null;

  return (
    <div className="screen active" style={{display:'block', padding:0, position:'fixed', inset:0, background:'#05020e', zIndex:10000, overflowY:'auto'}}>
       {stage === 'summary' && (
          <LootSummaryStage 
             matchData={matchData} 
             roguelikeRun={roguelikeRun} 
             onNext={() => setStage('draft')} 
          />
       )}
       
       {stage === 'draft' && (
          <CardDraftStage 
             matchData={matchData} 
             onDraftComplete={onDraftComplete}
             roguelikeRun={roguelikeRun} 
          />
       )}
    </div>
  );
}