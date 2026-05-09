import React, { useState } from 'react';

// ── Configuration & Metadata ──────────────────────────────────────────────
const NODE_TYPES = {
  standard:    { label:'NODE',         color:'var(--win)',        icon:'⬡', glow:'rgba(0,229,255,0.35)',  type: 'battle' },
  elite:       { label:'ELITE',        color:'var(--apex-pink)',  icon:'⚡', glow:'rgba(255,0,127,0.4)',   type: 'battle' },
  boss:        { label:'ARCHITECT',    color:'var(--lose)',       icon:'☠', glow:'rgba(255,0,50,0.5)',    type: 'battle' },
  safehouse:   { label:'SAFEHOUSE',    color:'#00ff44',           icon:'⛺', glow:'rgba(0,255,68,0.3)',   type: 'event' },
  dataleak:    { label:'DATA LEAK',    color:'#ff0055',           icon:'🔓', glow:'rgba(255,0,85,0.3)',   type: 'event' },
  blackmarket: { label:'BLACK MARKET', color:'var(--legacy-sepia)',icon:'🛒', glow:'rgba(210,180,140,0.3)',type: 'event' }
};

const EVENT_DETAILS = {
  safehouse:   { title: 'SYSTEM RECOVERY', desc: 'Sichere Zone. Repariert beschädigten Code und stellt 20% deiner maximalen HP wieder her.', reward: 'HEILUNG +20% HP' },
  dataleak:    { title: 'RISKANTES PROTOKOLL', desc: 'Du entwendest wertvolle Skill Points, das System kontert jedoch mit permanentem Schaden.', reward: '+2 SP // -50 HP' },
  blackmarket: { title: 'SHADOW BROKER', desc: 'Schattensystem-Händler. Bietet dir an, eine Standardkarte gegen ein mächtiges Legacy-Asset zu tauschen.', reward: 'KARTE TAUSCHEN' }
};

// ── Map Layout Generator (Procedural per Sector) ─────────────────────────
const getMapLayout = (sector) => {
  // Simpler deterministischer Zufall basierend auf dem Sektor
  const rand = (offset) => {
    let x = Math.sin(sector * 13.37 + offset * 42.1) * 10000;
    return x - Math.floor(x);
  };

  const layout = [];
  layout.push([ { id: `${sector}-1`, step: 1, type: 'standard', target: 'Entry Point' } ]);
  
  const s2Type = rand(2) > 0.5 ? 'safehouse' : 'dataleak';
  layout.push([ 
    { id: `${sector}-2-1`, step: 2, type: 'standard', target: 'Proxy Server' }, 
    { id: `${sector}-2-2`, step: 2, type: s2Type, target: s2Type === 'safehouse' ? 'Versteckter Cache' : 'Korrupter Code' } 
  ]);
  
  const s3Chance = rand(3);
  const s3Type = s3Chance > 0.7 ? 'blackmarket' : (s3Chance > 0.4 ? 'dataleak' : 'standard');
  layout.push([ 
    { id: `${sector}-3-1`, step: 3, type: 'elite', target: 'High-Sec Gateway' }, 
    { id: `${sector}-3-2`, step: 3, type: s3Type, target: s3Type === 'blackmarket' ? 'Unbekanntes Signal' : (s3Type === 'dataleak' ? 'System Fehler' : 'Mainframe Zugang') } 
  ]);
  
  // Ab Sektor 3 gibt es eine Chance auf brutale Doppel-Elite Nodes!
  const s4Elite = sector > 2 && rand(4.1) > 0.5;
  const s4Type1 = s4Elite ? 'elite' : 'standard';
  const s4Type2 = rand(4.2) > 0.5 ? 'safehouse' : 'blackmarket';
  layout.push([ 
    { id: `${sector}-4-1`, step: 4, type: s4Type1, target: s4Type1 === 'elite' ? 'Firewall' : 'Sub-Routing' }, 
    { id: `${sector}-4-2`, step: 4, type: s4Type2, target: s4Type2 === 'safehouse' ? 'Backup Cache' : 'Shadow Broker' } 
  ]);
  
  layout.push([ { id: `${sector}-5`, step: 5, type: 'boss', target: `Sector ${sector} Architect` } ]);
  return layout;
};

// ── Helpers ───────────────────────────────────────────────────────────────
function Corners({ color='var(--win)', size=8 }) {
  const b = { position:'absolute', width:size, height:size, borderColor:color, borderStyle:'solid', pointerEvents:'none' };
  return (<>
    <div style={{...b,top:-1,left:-1,borderWidth:'1px 0 0 1px'}}/><div style={{...b,top:-1,right:-1,borderWidth:'1px 1px 0 0'}}/>
    <div style={{...b,bottom:-1,left:-1,borderWidth:'0 0 1px 1px'}}/><div style={{...b,bottom:-1,right:-1,borderWidth:'0 1px 1px 0'}}/>
  </>);
}

// ── Node Preview Modal ────────────────────────────────────────────────────
function NodeModal({ nodeObj, sector, currentNode, onClose, onStartBattle, onStartEvent, isCoop, myNodeReady, partnerNodeReady, onReadyClick }) {
  if (!nodeObj) return null;
  const n = nodeObj.step;
  const info = NODE_TYPES[nodeObj.type];
  const done = n < currentNode;
  // FIX: Im Co-Op ist der Node "aktiv", sobald er durch das Voting ausgewählt wurde (auch wenn man noch davor steht)
  const isActive = isCoop ? true : (n === currentNode);
  
  const isEvent = info.type === 'event';
  const eventData = isEvent ? EVENT_DETAILS[nodeObj.type] : null;

  // Battle Specific Data
  const actualDiff = (isBoss || sector >= 4) ? 4 : 3;
  const diffNames = ['','TRAINEE','OPERATIVE','EXECUTIVE','ARCHITECT'];
  const diffColors = ['','var(--win)','var(--ep)','var(--r-epi)','var(--lose)'];

  // DYNAMISCHE SCALING BERECHNUNG (entspricht exakt App.jsx)
  const isBoss = nodeObj.type === 'boss';
  const isElite = nodeObj.type === 'elite';
  
  let displayHp = 500;
  if (isBoss) {
    if (sector > 5) displayHp = 2000 + (sector - 5) * 500;
    else displayHp = [0, 800, 1000, 1300, 1600, 2000][sector] || 2000;
  } else {
    if (sector > 5) displayHp = (isElite ? 1000 : 700) + (sector - 5) * 250;
    else if (sector <= 2) displayHp = isElite ? 750 : 500;
    else if (sector === 3) displayHp = isElite ? 1000 : 700;
    else if (sector === 4) displayHp = isElite ? 750 : 500;
    else displayHp = isElite ? 1000 : 700;
  }

  const spGain = isBoss ? (3 + Math.floor(sector/3)) : (isElite ? (sector > 3 ? 2 : 1) : 1);
  const creditGain = Math.floor((isBoss ? 500 : (isElite ? 200 : 75)) * (1 + sector * 0.15));
  const packReward = isBoss ? '1x SEKTOR-KERN CACHE' : (isElite ? '1x GHOST DATA PACK' : null);

  const handleAction = () => {
    if (isCoop) {
      onReadyClick();
    } else {
      onClose();
      if (isEvent) {
        onStartEvent(nodeObj);
      } else {
        onStartBattle(nodeObj);
      }
    }
  };

  return (
    /* GANZ WICHTIG: background: '#05020e' versteckt das globale Grid & Matrix-Zahlen jetzt komplett! */
    <div style={{position:'fixed',inset:0,zIndex:30000,background:'#05020e',display:'flex',alignItems:'center',justifyContent:'center',animation:'backdropFade 0.25s ease-out forwards'}} onClick={onClose}>
      
      {/* Sanfter, sphärischer Glow im Hintergrund des Bildschirms, passend zur Node-Farbe */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${info.color}15 0%, transparent 60%)`, pointerEvents: 'none' }} />

      {/* Das eigentliche Fenster mit smoother Bounce-Animation */}
      <div style={{position:'relative',width:'min(580px,92vw)',background:'rgba(10,5,20,0.85)',backdropFilter:'blur(12px)',border:`1px solid ${info.color}55`,borderTop:`4px solid ${info.color}`,padding:'32px',boxShadow:`0 20px 60px rgba(0,0,0,0.9), 0 0 50px ${info.glow}`,animation:'modalScaleIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'}} onClick={e=>e.stopPropagation()}>
        <Corners color={info.color} size={12}/>
        
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'18px'}}>
          <div>
            <div className="mono" style={{fontSize:'0.52rem',color:'rgba(255,255,255,0.3)',letterSpacing:'3px',marginBottom:'4px'}}>SEKTOR {sector} — NODE {n}/5</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:'1.7rem',fontWeight:900,letterSpacing:'4px',color:info.color,textShadow:`0 0 20px ${info.glow}`}}>
              {done ? '✓ CLEARED' : `${info.icon} ${info.label}`}
            </div>
            <div className="mono" style={{fontSize:'0.58rem',color:'rgba(255,255,255,0.4)',marginTop:'2px'}}>{nodeObj.target}</div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'1px solid #333',color:'#555',padding:'6px 10px',cursor:'pointer',fontFamily:"'Roboto Mono',monospace",fontSize:'0.6rem',letterSpacing:'2px'}}>✕</button>
        </div>

        {done ? (
          <div style={{padding:'20px',background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.1)',borderLeft:'3px solid var(--win)',textAlign:'center'}}>
            <div style={{fontSize:'2rem',marginBottom:'8px'}}>✓</div>
            <div className="mono" style={{color:'var(--win)',fontSize:'0.8rem',letterSpacing:'3px'}}>NODE BEREITS ABGESCHLOSSEN</div>
          </div>
        ) : (
          <>
            {isEvent ? (
               /* ── EVENT NODE INFO ── */
               <div style={{padding:'15px',background:`${info.color}11`,border:`1px solid ${info.color}33`,borderLeft:`3px solid ${info.color}`,marginBottom:'20px'}}>
                  <div className="mono" style={{fontSize:'0.8rem',color:info.color,fontWeight:700,letterSpacing:'2px',marginBottom:'8px'}}>{eventData.title}</div>
                  <div style={{fontSize:'0.9rem',color:'#ddd',lineHeight:'1.5',marginBottom:'15px'}}>{eventData.desc}</div>
                  <div className="mono" style={{padding:'8px',background:'rgba(0,0,0,0.5)',color:'#fff',fontSize:'0.75rem',borderLeft:`2px solid ${info.color}`}}>
                    <span style={{color:'rgba(255,255,255,0.4)'}}>EFFEKT: </span> {eventData.reward}
                  </div>
               </div>
            ) : (
               /* ── BATTLE NODE INFO ── */
               <>
                 <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
                  <div style={{padding:'6px 14px',background:`${diffColors[actualDiff]}15`,border:`1px solid ${diffColors[actualDiff]}44`,borderLeft:`3px solid ${diffColors[actualDiff]}`}}>
                    <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.28)',letterSpacing:'2px'}}>THREAT LEVEL</div>
                    <div className="mono" style={{color:diffColors[actualDiff],fontWeight:700,fontSize:'0.85rem',letterSpacing:'3px'}}>{diffNames[actualDiff]}</div>
                  </div>
                 </div>
                 
                 <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px',marginBottom:'16px'}}>
                  {[['GEGNER HP', displayHp, info.color],['SEKTOR / NODE',`S${sector}-N${n}`,info.color]].map(([l,v,c])=>(
                    <div key={l} style={{padding:'10px 12px',background:'rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.05)',textAlign:'center'}}>
                      <div className="mono" style={{fontSize:'0.44rem',color:'rgba(255,255,255,0.25)',letterSpacing:'2px',marginBottom:'3px'}}>{l}</div>
                      <div className="mono" style={{color:c,fontWeight:700,fontSize:'1.05rem'}}>{v}</div>
                    </div>
                  ))}
                 </div>

                 {/* NEU: REWARD INFO BOX */}
                 <div style={{padding:'12px 14px',background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.1)',borderLeft:'3px solid var(--win)',marginBottom:'16px'}}>
                    <div className="mono" style={{fontSize:'0.5rem',color:'rgba(0,229,255,0.6)',letterSpacing:'2px',marginBottom:'8px'}}>▸ ERWARTETE BELOHNUNG BEI SIEG</div>
                    <div style={{display:'flex', gap:'15px', flexWrap:'wrap', alignItems: 'center'}}>
                      <div style={{fontSize:'0.9rem', color:'#fff'}}><b>+{creditGain}</b> 💳</div>
                      <div style={{fontSize:'0.9rem', color:'#bc13fe'}}><b>+{spGain}</b> SP ⏫</div>
                      {packReward && (
                        <div style={{fontSize:'0.85rem', color:'var(--apex-pink)', padding: '2px 8px', background: 'rgba(255,0,127,0.1)', borderRadius: '4px', border: '1px solid rgba(255,0,127,0.3)'}}>
                          📦 <b>{packReward}</b>
                        </div>
                      )}
                    </div>
                 </div>
               </>
            )}
            
            {/* Actions */}
            <div style={{display:'flex',gap:'10px', marginTop:'20px'}}>
              <button onClick={onClose} disabled={myNodeReady} style={{flex:1,padding:'10px',background:'transparent',border:'1px solid #2a3a4a',color:'#667',fontFamily:"'Roboto Mono',monospace",fontSize:'0.68rem',letterSpacing:'2px',cursor: myNodeReady ? 'not-allowed' : 'pointer', opacity: myNodeReady ? 0.5 : 1}}>
                ABBRECHEN
              </button>
              {isActive && (
                <button onClick={!myNodeReady ? handleAction : undefined} style={{flex:2,padding:'12px',background: myNodeReady ? 'transparent' : `${info.color}15`,border:`2px solid ${myNodeReady ? '#555' : info.color}`,color: myNodeReady ? '#888' : info.color,fontFamily:"'Roboto Mono',monospace",fontSize:'0.75rem',fontWeight:700,letterSpacing:'3px',cursor: myNodeReady ? 'default' : 'pointer',boxShadow: myNodeReady ? 'none' : `0 0 20px ${info.glow}`, transition: 'all 0.3s'}}>
                  {myNodeReady ? 'SQUAD SYNC (1/2 BEREIT)...' : (isEvent ? `${info.icon} EINTRETEN` : `${info.icon} KAMPF STARTEN`)}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Big Map Node ──────────────────────────────────────────────────────────
function MapNode({ nodeObj, currentNode, onSelect, myVote, partnerVote, isCoop }) {
  const [hovered, setHovered] = useState(false);
  const n       = nodeObj.step;
  const info    = NODE_TYPES[nodeObj.type];
  const done    = n < currentNode;
  const active  = n === currentNode;
  const isEvent = info.type === 'event';
  const evData  = isEvent ? EVENT_DETAILS[nodeObj.type] : null;
  const isLocked = n > currentNode + 1;

  // Größere Nodes: active=130/100, boss=110/84, normal=90/68, done=56/44
  const outer = active ? 130 : done ? 56 : n === 5 ? 110 : 90;
  const inner = active ? 100 : done ? 44 : n === 5 ?  84 : 68;
  const color = done ? '#1a4a2a' : info.color;

  // Tooltip: Boss-Node zeigt links, alle anderen zeigen oben
  const ttPos = n === 5
    ? { right: 'calc(100% + 16px)', top: '50%', transform: 'translateY(-50%)' }
    : { bottom: 'calc(100% + 16px)', left: '50%', transform: 'translateX(-50%)' };

  return (
    <div
      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px',
        cursor: isLocked ? 'default' : 'pointer', flexShrink:0, userSelect:'none',
        opacity: isLocked ? 0.3 : 1, position:'relative' }}
      onClick={() => !isLocked && onSelect(nodeObj)}
      onMouseEnter={() => !isLocked && !done && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── HOVER TOOLTIP ── */}
      {hovered && (
        <div style={{
          position:'absolute', ...ttPos, zIndex:9999,
          width:'min(270px,82vw)',
          background:'rgba(4,2,14,0.97)', backdropFilter:'blur(18px)',
          border:`1px solid ${info.color}55`, borderLeft:`3px solid ${info.color}`,
          padding:'13px 15px',
          boxShadow:`0 12px 40px rgba(0,0,0,0.85), 0 0 25px ${info.glow}`,
          pointerEvents:'none',
          animation:'rlNodeTTIn 0.14s ease-out both',
        }}>
          <style>{`
            @keyframes rlNodeTTIn {
              from { opacity:0; transform: ${n===5?'translateY(-46%)':'translateX(-50%) translateY(5px)'}; }
              to   { opacity:1; transform: ${n===5?'translateY(-50%)':'translateX(-50%) translateY(0)'}; }
            }
          `}</style>

          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'9px'}}>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:900,fontSize:'1rem',color:info.color,letterSpacing:'2px',textShadow:`0 0 12px ${info.glow}`}}>
              {info.icon} {info.label}
            </div>
            <div className="mono" style={{fontSize:'0.42rem',color:'rgba(255,255,255,0.28)',letterSpacing:'1px'}}>N{n}/5</div>
          </div>

          <div className="mono" style={{fontSize:'0.5rem',color:'rgba(255,255,255,0.38)',marginBottom:'9px',letterSpacing:'1px',whiteSpace:'normal',lineHeight:1.5}}>
            {nodeObj.target}
          </div>

          {isEvent && evData ? (
            <>
              <div style={{fontSize:'0.7rem',color:'#ccc',lineHeight:1.45,marginBottom:'9px',whiteSpace:'normal'}}>
                {evData.desc}
              </div>
              <div style={{padding:'6px 10px',background:`${info.color}14`,borderLeft:`2px solid ${info.color}`,display:'flex',gap:'8px',alignItems:'center'}}>
                <span className="mono" style={{fontSize:'0.42rem',color:'rgba(255,255,255,0.28)'}}>EFFEKT:</span>
                <span className="mono" style={{fontSize:'0.6rem',color:info.color,fontWeight:700}}>{evData.reward}</span>
              </div>
            </>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
              {[
                ['THREAT', n===5?'ARCHITECT':nodeObj.type==='elite'?'EXECUTIVE':'OPERATIVE'],
                ['STATUS', active?'EINTRETEN':'VERFÜGBAR'],
              ].map(([l,v])=>(
                <div key={l} style={{padding:'6px 8px',background:'rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.05)'}}>
                  <div className="mono" style={{fontSize:'0.38rem',color:'rgba(255,255,255,0.22)',letterSpacing:'1px'}}>{l}</div>
                  <div className="mono" style={{fontSize:'0.58rem',color:info.color,fontWeight:700,marginTop:'2px'}}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NODE CIRCLE ── */}
      <div style={{position:'relative',width:outer,height:outer,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {active && <>
          <div className="node-outer-ring"   style={{color:info.color}}/>
          <div className="node-outer-ring-r" style={{color:info.color}}/>
        </>}
        {/* Pulsierender Glow für aktive Nodes */}
        {active && (
          <div style={{
            position:'absolute',inset:0,borderRadius:'50%',
            background:`radial-gradient(circle, ${info.color}28 0%, transparent 68%)`,
            animation:'rlNodePulse 2.2s ease-in-out infinite',
          }}/>
        )}
        <style>{`
          @keyframes rlNodePulse {
            0%,100%{ transform:scale(1);    opacity:0.55; }
            50%    { transform:scale(1.18); opacity:1;    }
          }
        `}</style>

        <div style={{
          width:inner, height:inner, borderRadius:'50%',
          border:`${active?3:done?1:2}px solid ${color}`,
          background: done?'rgba(0,20,10,0.6)':active?`${info.color}22`:`${info.color}0d`,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'2px',
          boxShadow: active
            ? `0 0 45px ${info.glow}, 0 0 90px ${info.glow}44, inset 0 0 20px ${info.color}18`
            : done ? 'none'
            : hovered ? `0 0 22px ${info.glow}88` : `0 0 8px ${info.glow}33`,
          transition:'all 0.25s cubic-bezier(0.175,0.885,0.32,1.275)',
          position:'relative', zIndex:1,
        }}>
          <div style={{
            fontSize: done?'1.1rem':active?'1.7rem':n===5?'1.5rem':'1.25rem',
            color: done?'#2a6a3a':info.color, lineHeight:1,
            textShadow: active?`0 0 18px ${info.color}`:'none',
            transform: hovered && !done ? 'scale(1.1)' : 'scale(1)',
            transition:'transform 0.2s',
          }}>
            {done ? '✓' : info.icon}
          </div>

          {/* Voting badges */}
          {isCoop && myVote === nodeObj.id && (
            <div style={{position:'absolute',top:'-13px',left:'-13px',background:'var(--win)',color:'#000',fontSize:'0.44rem',fontWeight:900,padding:'2px 6px',borderRadius:'3px',zIndex:10,boxShadow:'0 0 8px var(--win)',letterSpacing:'1px'}}>DU</div>
          )}
          {isCoop && partnerVote === nodeObj.id && (
            <div style={{position:'absolute',top:'-13px',right:'-13px',background:'var(--ep)',color:'#000',fontSize:'0.44rem',fontWeight:900,padding:'2px 6px',borderRadius:'3px',zIndex:10,boxShadow:'0 0 8px var(--ep)',letterSpacing:'1px'}}>MATE</div>
          )}
        </div>
      </div>

      {/* Label */}
      <div className="mono" style={{
        fontSize:'0.52rem', color:done?'#2a6a3a':active?'#fff':color,
        letterSpacing:'2px', fontWeight:active?700:400,
        textShadow:active?`0 0 10px ${info.color}`:'none',
        transition:'all 0.25s',
      }}>
        {done ? 'CLEARED' : info.label}
      </div>
    </div>
  );
}

// ── Mini deck card ────────────────────────────────────────────────────────
function MiniCard({ card }) {
  if (!card) return null;
  const isAv = card.id==='avatar';
  const tc   = isAv?'#bc13fe':card.type==='apex'?'var(--apex-pink)':card.type==='legacy'?'var(--legacy-sepia)':card.type==='effect'?'var(--eff-col)':'var(--win)';
  return (
    <div style={{padding:'3px 7px',background:'rgba(0,0,0,0.35)',border:`1px solid ${tc}18`,borderLeft:`2px solid ${tc}`,display:'flex',alignItems:'center',gap:'5px',minWidth:0}}>
      <div className="mono" style={{fontSize:'0.56rem',color:tc,flexShrink:0}}>{isAv?'★':card.type==='effect'?'◈':'⬡'}</div>
      <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'0.76rem',color:isAv?'#bc13fe':'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flex:1,minWidth:0}}>{card.name}</div>
      <div className="mono" style={{fontSize:'0.4rem',color:'rgba(255,255,255,0.18)',flexShrink:0}}>L{card.level||1}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function RoguelikeMap({ avatarCard, roguelikeRun, onStartRun, onStartBattle, onStartEvent, onBack, onGoToLab, isCoop = false, conn = null, isHost = false }) {
  const [selectedNodeObj, setSelectedNodeObj] = useState(null);
  
  // CO-OP VOTING STATES
  const [myVote, setMyVote] = useState(null);
  const [partnerVote, setPartnerVote] = useState(null);
  
  // NEU: CO-OP NODE READY STATES
  const [myNodeReady, setMyNodeReady] = useState(false);
  const [partnerNodeReady, setPartnerNodeReady] = useState(false);

  // START SCREEN WENN KEIN RUN AKTIV IST
  if (!roguelikeRun) return (
    <div className="screen active" style={{display:'block',padding:'26px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'relative',zIndex:2}}>
        <div className="top-bar">
          <div className="game-title-small" style={{color:'var(--apex-pink)'}}>⬡ OPERATION: GHOST NODE</div>
          <div style={{display:'flex',gap:'8px'}}>
            {onGoToLab && <button className="btn-back" style={{borderColor:'#bc13fe',color:'#bc13fe',fontSize:'0.58rem'}} onClick={onGoToLab}>ZUM LABOR</button>}
            <button className="btn-back" onClick={onBack}>ZURÜCK</button>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginTop:'60px',gap:'18px'}}>
          <div style={{fontSize:'3rem',animation:'gtiPulse 2s infinite alternate'}}>🕵️</div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:'2rem',fontWeight:900,letterSpacing:'5px',color:'var(--win)',textShadow:'0 0 20px rgba(0,229,255,0.4)'}}>RUN STARTEN</div>
          {avatarCard && (
            <div style={{position:'relative',padding:'10px 20px',background:'rgba(188,19,254,0.05)',border:'1px solid rgba(188,19,254,0.2)',borderLeft:'3px solid #bc13fe',textAlign:'center'}}>
              <Corners color="#bc13fe"/>
              <div className="mono" style={{fontSize:'0.5rem',color:'rgba(255,255,255,0.24)',letterSpacing:'2px',marginBottom:'3px'}}>DEIN AVATAR</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:'#bc13fe',fontSize:'1.1rem'}}>{avatarCard.name}</div>
            </div>
          )}
          <button onClick={onStartRun} style={{padding:'14px 40px',background:'rgba(255,0,127,0.07)',border:'2px solid var(--apex-pink)',color:'var(--apex-pink)',fontFamily:"'Roboto Mono',monospace",fontSize:'0.9rem',fontWeight:700,letterSpacing:'4px',cursor:'pointer',boxShadow:'0 0 20px rgba(255,0,127,0.12)'}}>
            ▸ NEUEN RUN INITIALISIEREN
          </button>
        </div>
      </div>
    </div>
  );

  const { currentHP, maxHP, sector, node, runDeck } = roguelikeRun;
  const hpPct   = Math.max(0,Math.min(100,(currentHP/maxHP)*100));
  const hpColor = hpPct>60?'var(--win)':hpPct>25?'var(--ep)':'var(--lose)';
  const chars   = runDeck.chars||[];
  const effs    = runDeck.effs||[];

  // Generiert das Layout basierend auf dem aktuellen Sektor UND dem einmaligen Run-Seed!
  const layout = React.useMemo(() => getMapLayout(sector, roguelikeRun.seed || 0), [sector, roguelikeRun.seed]);

  // ── CO-OP VOTING & READY LOGIC ──
  React.useEffect(() => {
    if (!conn || !isCoop) return;
    const handleData = (data) => {
      if (data.type === 'MAP_VOTE') {
         setPartnerVote(data.nodeId);
      } else if (data.type === 'MAP_VOTE_RESOLVE') {
         const chosenNode = layout.flat().find(n => n.id === data.nodeId);
         setSelectedNodeObj(chosenNode);
         setMyVote(null); setPartnerVote(null);
         setMyNodeReady(false); setPartnerNodeReady(false); // Reset für den neuen Node
      } else if (data.type === 'NODE_READY') {
         setPartnerNodeReady(true);
      }
    };
    conn.on('data', handleData);
    return () => conn.off('data', handleData);
  }, [conn, isCoop, layout]);

  // NEU: Sync Timer für den Node-Eintritt
  React.useEffect(() => {
    if (isCoop && myNodeReady && partnerNodeReady && selectedNodeObj) {
      const timer = setTimeout(() => {
          const node = selectedNodeObj;
          setSelectedNodeObj(null);
          setMyNodeReady(false);
          setPartnerNodeReady(false);
          
          if (NODE_TYPES[node.type].type === 'event') {
              onStartEvent(node);
          } else {
              onStartBattle(node);
          }
      }, 600); // Kurze Pause für das befriedigende "Beide Bereit!" Gefühl
      return () => clearTimeout(timer);
    }
  }, [isCoop, myNodeReady, partnerNodeReady, selectedNodeObj, onStartBattle, onStartEvent]);

  React.useEffect(() => {
    // Der Host sammelt beide Votes und löst auf
    if (isCoop && isHost && myVote && partnerVote) {
       const timer = setTimeout(() => {
         let chosenId = myVote;
         if (myVote !== partnerVote) {
           // 1:1 Gleichstand -> Zufall entscheidet!
           chosenId = Math.random() > 0.5 ? myVote : partnerVote;
         }
         conn.send({ type: 'MAP_VOTE_RESOLVE', nodeId: chosenId });
         const chosenNode = layout.flat().find(n => n.id === chosenId);
         setSelectedNodeObj(chosenNode);
         setMyVote(null); setPartnerVote(null);
       }, 1200); // 1.2 Sekunden dramatische Pause
       return () => clearTimeout(timer);
    }
  }, [myVote, partnerVote, isHost, isCoop, conn, layout]);

  const handleNodeSelect = (nodeObj) => {
    // FIX: Im Co-Op darf man nur auf Nodes der AKTUELLEN Stufe voten!
    if (isCoop && nodeObj.step !== node) return; 
    
    if (!isCoop) {
      setSelectedNodeObj(nodeObj);
      return;
    }
    
    setMyVote(nodeObj.id);
    if (conn) conn.send({ type: 'MAP_VOTE', nodeId: nodeObj.id });
  };

  return (
    <div style={{position:'fixed',inset:0,overflow:'hidden',background:'#05020e',display:'flex',flexDirection:'column',fontFamily:"'Roboto Mono',monospace"}}>
      

      <div style={{position:'relative',zIndex:2,padding:'10px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,0,1  27,0.15)',background:'rgba(5,0,12,0.8)',backdropFilter:'blur(10px)',flexShrink:0}}>
        <div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:900,fontSize:'1.05rem',letterSpacing:'4px',color:'var(--apex-pink)',textShadow:'0 0 12px rgba(255,0,127,0.4)'}}>⬡ GHOST NODE</div>
          <div className="mono" style={{fontSize:'0.52rem',color:'rgba(255,255,255,0.28)',letterSpacing:'3px',marginTop:'1px'}}>SEKTOR {sector} // RUN AKTIV</div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          {onGoToLab && <button className="btn-back" style={{borderColor:'#bc13fe',color:'#bc13fe',fontSize:'0.56rem'}} onClick={onGoToLab}>ZUM LABOR</button>}
          <button className="btn-back" style={{fontSize:'0.56rem'}} onClick={onBack}>ZURÜCK</button>
        </div>
      </div>

      {/* MOBILE LAYOUT CLASSES APPLIED HERE */}
      <div className="rl-map-layout" style={{position:'relative',zIndex:2,flex:1,display:'flex',overflow:'hidden'}}>

        <div className="rl-map-sidebar" style={{width:'200px',flexShrink:0,borderRight:'1px solid rgba(188,19,254,0.12)',background:'rgba(5,0,12,0.7)',backdropFilter:'blur(10px)',display:'flex',flexDirection:'column',padding:'12px',overflow:'hidden'}}>
          {avatarCard && (
            <div style={{marginBottom:'10px',padding:'8px',background:'rgba(188,19,254,0.06)',border:'1px solid rgba(188,19,254,0.14)',borderLeft:'3px solid #bc13fe',flexShrink:0}}>
              <div className="mono" style={{fontSize:'0.42rem',color:'rgba(188,19,254,0.5)',letterSpacing:'2px',marginBottom:'2px'}}>▸ GHOST AGENT</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:'#bc13fe',fontSize:'0.9rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{avatarCard.name}</div>
              <div className="mono" style={{fontSize:'0.45rem',color:'rgba(255,255,255,0.3)',marginTop:'2px'}}>GTI {avatarCard.gti} // SP {avatarCard.sp??0}</div>
            </div>
          )}
          <div style={{marginBottom:'10px',padding:'8px',background:'rgba(0,0,0,0.4)',border:`1px solid ${hpColor}18`,borderLeft:`2px solid ${hpColor}`,flexShrink:0}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
              <span className="mono" style={{fontSize:'0.55rem',color:'rgba(255,255,255,0.3)',letterSpacing:'2px'}}>HP</span>
              <span className="mono" style={{color:hpColor,fontWeight:700,fontSize:'0.85rem'}}>{currentHP}/{maxHP}</span>
            </div>
            <div style={{height:'4px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${hpPct}%`,background:hpColor,boxShadow:`0 0 5px ${hpColor}`,transition:'width 0.5s'}}/>
            </div>
          </div>
          <div className="mono" style={{fontSize:'0.45rem',color:'rgba(255,255,255,0.2)',letterSpacing:'2px',marginBottom:'5px',flexShrink:0}}>
            ▸ RUN-DECK ({chars.length+effs.length}/8)
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'3px',overflow:'hidden',flex:1}}>
            {chars.map((c,i) => <MiniCard key={i} card={c}/>)}
            {effs.map((c,i)  => <MiniCard key={'e'+i} card={c}/>)}
          </div>
        </div>

        <div className="rl-map-content" style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',padding:'14px 18px 12px',gap:'10px'}}>

          {/* ── MAP VISUALIZATION — füllt den gesamten verfügbaren Raum ── */}
          <div style={{position:'relative',flex:1,background:'rgba(4,2,10,0.72)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',overflow:'visible',minHeight:0}}>
            <Corners color="rgba(188,19,254,0.35)" size={8}/>

            {/* Sektor-Label */}
            <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.14)',letterSpacing:'4px',padding:'10px 16px 0',flexShrink:0}}>
              ▸ SEKTOR {sector} // NODE {node}/5 // NETZWERK-PFADE
            </div>

            {/* Node-Reihe + SVG Connectoren */}
            <div style={{flex:1,position:'relative',display:'flex',alignItems:'center',justifyContent:'space-around',padding:'16px 30px',overflow:'visible'}}>

              {/* SVG Connector Network */}
              <svg viewBox="0 0 1000 220" preserveAspectRatio="none"
                style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,overflow:'visible'}}>
                <defs>
                  <marker id="rlDot" viewBox="0 0 4 4" refX="2" refY="2" markerWidth="4" markerHeight="4">
                    <circle cx="2" cy="2" r="1.5" fill="rgba(0,229,255,0.45)"/>
                  </marker>
                  <marker id="rlDotRed" viewBox="0 0 4 4" refX="2" refY="2" markerWidth="4" markerHeight="4">
                    <circle cx="2" cy="2" r="1.5" fill="rgba(255,0,50,0.5)"/>
                  </marker>
                </defs>
                {/* Col 1 → Col 2 */}
                <line x1="128" y1="110" x2="290" y2="70"  stroke="rgba(0,229,255,0.14)" strokeWidth="1.5" strokeDasharray="9,7" markerEnd="url(#rlDot)"/>
                <line x1="128" y1="110" x2="290" y2="150" stroke="rgba(0,229,255,0.14)" strokeWidth="1.5" strokeDasharray="9,7" markerEnd="url(#rlDot)"/>
                {/* Col 2 → Col 3 (parallel + cross) */}
                <line x1="310" y1="70"  x2="480" y2="70"  stroke="rgba(0,229,255,0.11)" strokeWidth="1.5" strokeDasharray="9,7" markerEnd="url(#rlDot)"/>
                <line x1="310" y1="150" x2="480" y2="150" stroke="rgba(0,229,255,0.11)" strokeWidth="1.5" strokeDasharray="9,7" markerEnd="url(#rlDot)"/>
                <line x1="310" y1="70"  x2="480" y2="150" stroke="rgba(255,0,127,0.07)" strokeWidth="1"   strokeDasharray="5,9"/>
                <line x1="310" y1="150" x2="480" y2="70"  stroke="rgba(255,0,127,0.07)" strokeWidth="1"   strokeDasharray="5,9"/>
                {/* Col 3 → Col 4 */}
                <line x1="520" y1="70"  x2="690" y2="70"  stroke="rgba(0,229,255,0.11)" strokeWidth="1.5" strokeDasharray="9,7" markerEnd="url(#rlDot)"/>
                <line x1="520" y1="150" x2="690" y2="150" stroke="rgba(0,229,255,0.11)" strokeWidth="1.5" strokeDasharray="9,7" markerEnd="url(#rlDot)"/>
                <line x1="520" y1="70"  x2="690" y2="150" stroke="rgba(255,0,127,0.07)" strokeWidth="1"   strokeDasharray="5,9"/>
                <line x1="520" y1="150" x2="690" y2="70"  stroke="rgba(255,0,127,0.07)" strokeWidth="1"   strokeDasharray="5,9"/>
                {/* Col 4 → Boss */}
                <line x1="710" y1="70"  x2="872" y2="110" stroke="rgba(255,0,50,0.2)"   strokeWidth="1.5" strokeDasharray="9,7" markerEnd="url(#rlDotRed)"/>
                <line x1="710" y1="150" x2="872" y2="110" stroke="rgba(255,0,50,0.2)"   strokeWidth="1.5" strokeDasharray="9,7" markerEnd="url(#rlDotRed)"/>
              </svg>

              {/* Node-Spalten */}
              {layout.map((column, colIdx) => (
                <div key={colIdx} style={{display:'flex',flexDirection:'column',gap:'40px',zIndex:10,alignItems:'center'}}>
                  {column.map((nodeObj) => (
                    <MapNode
                      key={nodeObj.id}
                      nodeObj={nodeObj}
                      currentNode={node}
                      onSelect={handleNodeSelect}
                      myVote={myVote}
                      partnerVote={partnerVote}
                      isCoop={isCoop}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── SLIM STATUS BAR — ersetzt den großen Briefing-Block ── */}
          <div style={{
            flexShrink:0, padding:'9px 16px',
            background:'rgba(5,0,12,0.8)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.05)',
            borderLeft:`3px solid ${isCoop ? 'var(--ep)' : 'var(--apex-pink)'}`,
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px',
          }}>
            <div className="mono" style={{fontSize:'0.5rem',color:'rgba(255,255,255,0.22)',letterSpacing:'2px',whiteSpace:'nowrap',flexShrink:0}}>
              ▸ {isCoop ? 'CO-OP ABSTIMMUNG' : 'PFAD WÄHLEN'}
            </div>

            {isCoop ? (
              <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
                {[
                  { label:'ICH',     active: !!myVote,      color:'var(--win)', text: myVote ? 'VOTE ✓' : 'WARTE...' },
                  { label:'PARTNER', active: !!partnerVote,  color:'var(--ep)',  text: partnerVote ? 'VOTE ✓' : 'WARTE...' },
                ].map(({ label, active: vActive, color: vc, text }) => (
                  <div key={label} style={{
                    display:'flex',alignItems:'center',gap:'7px',padding:'4px 12px',
                    background: vActive ? `${vc}0e` : 'transparent',
                    border:`1px solid ${vActive ? vc : 'rgba(255,255,255,0.09)'}`,
                    borderRadius:'3px',transition:'all 0.35s',
                  }}>
                    <div style={{width:'6px',height:'6px',borderRadius:'50%',background:vActive?vc:'rgba(255,255,255,0.15)',boxShadow:vActive?`0 0 7px ${vc}`:'none',transition:'all 0.35s',flexShrink:0}}/>
                    <span className="mono" style={{fontSize:'0.48rem',color:vActive?vc:'rgba(255,255,255,0.28)',letterSpacing:'1px',whiteSpace:'nowrap'}}>
                      {label} — {text}
                    </span>
                  </div>
                ))}
                {myVote && partnerVote && (
                  <div className="mono" style={{fontSize:'0.46rem',color:'var(--apex-pink)',letterSpacing:'2px',animation:'pulse 0.8s infinite'}}>
                    ▸ RESOLVING...
                  </div>
                )}
              </div>
            ) : (
              <div className="mono" style={{fontSize:'0.5rem',color:'rgba(255,255,255,0.18)',letterSpacing:'1px'}}>
                Hover für Details · Klick zum Eintreten
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedNodeObj !== null && (
        <NodeModal 
          nodeObj={selectedNodeObj} 
          sector={sector} 
          currentNode={node} 
          onClose={()=>{
             setSelectedNodeObj(null);
             setMyNodeReady(false); // Falls man abbricht, Ready-State resetten
          }} 
          onStartBattle={onStartBattle} 
          onStartEvent={onStartEvent} 
          isCoop={isCoop} 
          myNodeReady={myNodeReady}
          partnerNodeReady={partnerNodeReady}
          onReadyClick={() => {
             setMyNodeReady(true);
             if (conn) conn.send({ type: 'NODE_READY' });
          }}
        />
      )}
    </div>
  );
}