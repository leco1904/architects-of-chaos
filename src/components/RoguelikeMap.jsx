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

// ── Map Layout Generator (Fixed Grid per Sector) ─────────────────────────
const getMapLayout = () => [
  [ { id: '1-1', step: 1, type: 'standard', target: 'Entry Point' } ],
  [ 
    { id: '2-1', step: 2, type: 'standard', target: 'Proxy Server' }, 
    { id: '2-2', step: 2, type: 'safehouse', target: 'Versteckter Cache' } 
  ],
  [ 
    { id: '3-1', step: 3, type: 'elite', target: 'High-Sec Gateway' }, 
    { id: '3-2', step: 3, type: 'dataleak', target: 'Korrupter Sektor' } 
  ],
  [ 
    { id: '4-1', step: 4, type: 'standard', target: 'Mainframe Zugang' }, 
    { id: '4-2', step: 4, type: 'blackmarket', target: 'Unbekanntes Signal' } 
  ],
  [ { id: '5-1', step: 5, type: 'boss', target: 'Boss Control Node' } ]
];

// ── Helpers ───────────────────────────────────────────────────────────────
function Corners({ color='var(--win)', size=8 }) {
  const b = { position:'absolute', width:size, height:size, borderColor:color, borderStyle:'solid', pointerEvents:'none' };
  return (<>
    <div style={{...b,top:-1,left:-1,borderWidth:'1px 0 0 1px'}}/><div style={{...b,top:-1,right:-1,borderWidth:'1px 1px 0 0'}}/>
    <div style={{...b,bottom:-1,left:-1,borderWidth:'0 0 1px 1px'}}/><div style={{...b,bottom:-1,right:-1,borderWidth:'0 1px 1px 0'}}/>
  </>);
}

// ── Node Preview Modal ────────────────────────────────────────────────────
function NodeModal({ nodeObj, sector, currentNode, onClose, onStartBattle, onStartEvent }) {
  if (!nodeObj) return null;
  const n = nodeObj.step;
  const info = NODE_TYPES[nodeObj.type];
  const done = n < currentNode;
  const isActive = n === currentNode;
  
  const isEvent = info.type === 'event';
  const eventData = isEvent ? EVENT_DETAILS[nodeObj.type] : null;

  // Battle Specific Data
  const actualDiff = n === 5 ? 4 : (nodeObj.type === 'elite' ? Math.min(4, sector + 1) : Math.min(3, sector));
  const diffNames = ['','TRAINEE','OPERATIVE','EXECUTIVE','ARCHITECT'];
  const diffColors = ['','var(--win)','var(--ep)','var(--r-epi)','var(--lose)'];

  const handleAction = () => {
    onClose();
    if (isEvent) {
      onStartEvent(nodeObj);
    } else {
      onStartBattle(nodeObj);
    }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)'}} onClick={onClose}>
      <div style={{position:'relative',width:'min(580px,92vw)',background:'rgba(5,2,12,0.98)',border:`1px solid ${info.color}44`,borderTop:`3px solid ${info.color}`,padding:'26px',boxShadow:`0 0 60px ${info.glow}`}} onClick={e=>e.stopPropagation()}>
        <Corners color={info.color}/>
        
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
                  {[['GEGNER HP', nodeObj.type==='boss'?'1200':nodeObj.type==='elite'?'700':'500', info.color],['SEKTOR / NODE',`S${sector}-N${n}`,info.color]].map(([l,v,c])=>(
                    <div key={l} style={{padding:'10px 12px',background:'rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.05)',textAlign:'center'}}>
                      <div className="mono" style={{fontSize:'0.44rem',color:'rgba(255,255,255,0.25)',letterSpacing:'2px',marginBottom:'3px'}}>{l}</div>
                      <div className="mono" style={{color:c,fontWeight:700,fontSize:'1.05rem'}}>{v}</div>
                    </div>
                  ))}
                 </div>
               </>
            )}
            
            {/* Actions */}
            <div style={{display:'flex',gap:'10px', marginTop:'20px'}}>
              <button onClick={onClose} style={{flex:1,padding:'10px',background:'transparent',border:'1px solid #2a3a4a',color:'#667',fontFamily:"'Roboto Mono',monospace",fontSize:'0.68rem',letterSpacing:'2px',cursor:'pointer'}}>
                ABBRECHEN
              </button>
              {isActive && (
                <button onClick={handleAction} style={{flex:2,padding:'12px',background:`${info.color}15`,border:`2px solid ${info.color}`,color:info.color,fontFamily:"'Roboto Mono',monospace",fontSize:'0.75rem',fontWeight:700,letterSpacing:'3px',cursor:'pointer',boxShadow:`0 0 20px ${info.glow}`}}>
                  {isEvent ? `${info.icon} EINTRETEN` : `${info.icon} KAMPF STARTEN`}
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
function MapNode({ nodeObj, currentNode, onSelect }) {
  const n      = nodeObj.step;
  const info   = NODE_TYPES[nodeObj.type];
  const done   = n < currentNode;
  const active = n === currentNode;
  
  const outer  = active ? 90 : done ? 50 : n===5 ? 80 : 66;
  const inner  = active ? 70 : done ? 40 : n===5 ? 60 : 48;
  const color  = done ? '#1a4a2a' : info.color;

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'7px',cursor:'pointer',flexShrink:0,userSelect:'none', opacity: (n > currentNode + 1) ? 0.4 : 1}}
      onClick={()=>onSelect(nodeObj)}>
      <div style={{position:'relative',width:outer,height:outer,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {active && <>
          <div className="node-outer-ring" style={{color:info.color}}/>
          <div className="node-outer-ring-r" style={{color:info.color}}/>
        </>}
        <div style={{
          width:inner,height:inner,borderRadius:'50%',
          border:`${active?3:2}px solid ${color}`,
          background:done?'rgba(0,30,15,0.5)':active?`${info.color}1e`:`${info.color}0a`,
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'2px',
          boxShadow:active?`0 0 25px ${info.glow}, inset 0 0 15px ${info.color}14`:done?'none':`0 0 10px ${info.glow}33`,
          transition:'all 0.3s',
        }}>
          <div style={{fontSize:done?'1rem':active?'1.5rem':'1.1rem',color:done?'#2a6a3a':info.color,lineHeight:1}}>
            {done?'✓':info.icon}
          </div>
        </div>
      </div>
      <div className="mono" style={{fontSize:'0.48rem',color:done?'#2a6a3a':active?'#fff':color,letterSpacing:'1px',fontWeight:active?700:400}}>
        {done?'CLEAR':info.label}
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
export default function RoguelikeMap({ avatarCard, roguelikeRun, onStartRun, onStartBattle, onStartEvent, onBack, onGoToLab }) {
  const [selectedNodeObj, setSelectedNodeObj] = useState(null);

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

  const layout = getMapLayout();

  return (
    <div style={{position:'fixed',inset:0,overflow:'hidden',background:'#05020e',display:'flex',flexDirection:'column',fontFamily:"'Roboto Mono',monospace"}}>
      

      <div style={{position:'relative',zIndex:2,padding:'10px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,0,127,0.15)',background:'rgba(5,0,12,0.8)',backdropFilter:'blur(10px)',flexShrink:0}}>
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

        <div className="rl-map-content" style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',padding:'20px',gap:'15px'}}>

          {/* MAP VISUALIZATION */}
          <div style={{position:'relative',padding:'25px 20px',background:'rgba(4,2,10,0.6)',backdropFilter:'blur(6px)',border:'1px solid rgba(255,255,255,0.05)',flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'center'}}>
            <Corners color="var(--win)" size={8}/>
            <div className="mono" style={{fontSize:'0.55rem',color:'rgba(255,255,255,0.18)',letterSpacing:'4px',position:'absolute', top:'15px', left:'20px'}}>
              ▸ SEKTOR {sector} // NETZWERK-PFADE
            </div>
            
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between', marginTop:'20px', position:'relative'}}>
              {/* Verbindungsline im Hintergrund */}
              <div style={{position:'absolute', top:'45%', left:'5%', right:'5%', height:'2px', background:'rgba(255,255,255,0.05)', zIndex: 0}} />
              
              {layout.map((column, colIdx) => (
                <div key={colIdx} style={{display:'flex', flexDirection:'column', gap:'25px', zIndex: 10}}>
                  {column.map((nodeObj) => (
                     <MapNode key={nodeObj.id} nodeObj={nodeObj} currentNode={node} onSelect={setSelectedNodeObj} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div style={{flex:1,padding:'15px',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.04)',position:'relative',overflow:'hidden'}}>
            <Corners color="rgba(255,255,255,0.06)" size={5}/>
            <div className="mono" style={{fontSize:'0.55rem',color:'rgba(255,255,255,0.2)',letterSpacing:'3px',marginBottom:'15px'}}>▸ MISSION BRIEFING</div>
            
            <div style={{fontSize:'0.85rem', color:'#ccc', lineHeight:'1.6', marginBottom:'15px', paddingLeft:'10px', borderLeft:'2px solid var(--win)'}}>
              Wähle deinen Pfad weise. <b>Sichere Nodes</b> bieten Standard-Belohnungen. <b>Elite Nodes</b> sind gefährlicher, aber sichern wertvollen Loot. <b>Event Nodes</b> wie Safehouses oder Black Markets erfordern keinen Kampf, sondern fordern taktische Entscheidungen.
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:'15px'}}>
               <div style={{padding:'10px', background:'rgba(0,255,68,0.05)', border:'1px solid rgba(0,255,68,0.1)'}}>
                  <div style={{color:'#00ff44', fontWeight:'bold', marginBottom:'5px'}}>⛺ SAFEHOUSE</div>
                  <div style={{fontSize:'0.7rem', color:'#aaa'}}>Kein Kampf. Heilt 20% deiner HP sofort.</div>
               </div>
               <div style={{padding:'10px', background:'rgba(255,0,85,0.05)', border:'1px solid rgba(255,0,85,0.1)'}}>
                  <div style={{color:'#ff0055', fontWeight:'bold', marginBottom:'5px'}}>🔓 DATA LEAK</div>
                  <div style={{fontSize:'0.7rem', color:'#aaa'}}>Kein Kampf. Du erhältst +2 SP, verlierst aber 50 HP.</div>
               </div>
               <div style={{padding:'10px', background:'rgba(210,180,140,0.05)', border:'1px solid rgba(210,180,140,0.1)'}}>
                  <div style={{color:'var(--legacy-sepia)', fontWeight:'bold', marginBottom:'5px'}}>🛒 BLACK MARKET</div>
                  <div style={{fontSize:'0.7rem', color:'#aaa'}}>Opfere eine Karte für ein garantiertes Legacy-Asset.</div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {selectedNodeObj !== null && (
                <NodeModal nodeObj={selectedNodeObj} sector={sector} currentNode={node} onClose={()=>setSelectedNodeObj(null)} onStartBattle={onStartBattle} onStartEvent={onStartEvent}/>
              )}
    </div>
  );
}