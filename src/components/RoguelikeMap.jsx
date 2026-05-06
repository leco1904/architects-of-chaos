import React, { useState } from 'react';

// ── Node metadata ─────────────────────────────────────────────────────────
const NODE_TYPE = (n) => {
  if (n===5) return { label:'BOSS',  color:'var(--lose)',      icon:'☠', glow:'rgba(255,0,50,0.5)',   sec:'CRITICAL', target:'Boss Control Node',  diff:4, diffName:'ARCHITECT', diffColor:'var(--lose)',     hp:800, sp:3, credits: 500, pack: 'ARCHITECT CORE', packColor: 'var(--lose)' };
  if (n===3) return { label:'ELITE', color:'var(--apex-pink)', icon:'⚡', glow:'rgba(255,0,127,0.4)', sec:'HIGH',     target:'Elite Proxy Server', diff:2, diffName:'OPERATIVE',  diffColor:'var(--ep)',       hp:500, sp:1, credits: 200, pack: 'GHOST CACHE', packColor: '#bc13fe' };
  if (n===4) return { label:'NODE',  color:'var(--ep)',        icon:'⬡', glow:'rgba(255,215,0,0.3)',  sec:'MEDIUM',   target:'Corporate Gateway',  diff:2, diffName:'OPERATIVE',  diffColor:'var(--ep)',       hp:500, sp:1, credits: 75, pack: null };
  if (n===2) return { label:'NODE',  color:'var(--win)',       icon:'⬡', glow:'rgba(0,229,255,0.35)', sec:'LOW',      target:'Local Proxy Node',   diff:1, diffName:'TRAINEE',    diffColor:'var(--win)',      hp:500, sp:1, credits: 75, pack: null };
  return            { label:'NODE',  color:'var(--win)',        icon:'⬡', glow:'rgba(0,229,255,0.35)', sec:'MINIMAL',  target:'Entry Point Alpha',  diff:1, diffName:'TRAINEE',    diffColor:'var(--win)',      hp:500, sp:1, credits: 75, pack: null };
};

function Corners({ color='var(--win)', size=8 }) {
  const b = { position:'absolute', width:size, height:size, borderColor:color, borderStyle:'solid', pointerEvents:'none' };
  return (<>
    <div style={{...b,top:-1,left:-1,borderWidth:'1px 0 0 1px'}}/><div style={{...b,top:-1,right:-1,borderWidth:'1px 1px 0 0'}}/>
    <div style={{...b,bottom:-1,left:-1,borderWidth:'0 0 1px 1px'}}/><div style={{...b,bottom:-1,right:-1,borderWidth:'0 1px 1px 0'}}/>
  </>);
}

// ── Node Preview Modal ────────────────────────────────────────────────────
function NodeModal({ n, sector, currentNode, onClose, onStartBattle }) {
  if (!n) return null;
  const info    = NODE_TYPE(n);
  const done    = n < currentNode;
  const isActive= n === currentNode;
  const actualDiff  = n===5 ? 4 : Math.min(3, sector);
  const diffNames   = ['','TRAINEE','OPERATIVE','EXECUTIVE','ARCHITECT'];
  const diffColors  = ['','var(--win)','var(--ep)','var(--r-epi)','var(--lose)'];

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
            <div className="mono" style={{fontSize:'0.58rem',color:'rgba(255,255,255,0.4)',marginTop:'2px'}}>{info.target}</div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'1px solid #333',color:'#555',padding:'6px 10px',cursor:'pointer',fontFamily:"'Roboto Mono',monospace",fontSize:'0.6rem',letterSpacing:'2px'}}>✕</button>
        </div>
        {done ? (
          <div style={{padding:'20px',background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.1)',borderLeft:'3px solid var(--win)',textAlign:'center'}}>
            <div style={{fontSize:'2rem',marginBottom:'8px'}}>✓</div>
            <div className="mono" style={{color:'var(--win)',fontSize:'0.8rem',letterSpacing:'3px'}}>NODE ERFOLGREICH GEHACKT</div>
          </div>
        ) : (<>
          {/* Threat badge only — Security removed (#015) */}
          <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
            <div style={{padding:'6px 14px',background:`${diffColors[actualDiff]}15`,border:`1px solid ${diffColors[actualDiff]}44`,borderLeft:`3px solid ${diffColors[actualDiff]}`}}>
              <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.28)',letterSpacing:'2px'}}>THREAT LEVEL</div>
              <div className="mono" style={{color:diffColors[actualDiff],fontWeight:700,fontSize:'0.85rem',letterSpacing:'3px'}}>{diffNames[actualDiff]}</div>
            </div>
          </div>
          {/* Stats grid — SP removed from here (#014), Schwierigkeit→Sektor (#016) */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px',marginBottom:'16px'}}>
            {[['GEGNER HP',info.hp,info.color],['SEKTOR / NODE',`S${sector}-N${n}`,info.color]].map(([l,v,c])=>(
              <div key={l} style={{padding:'10px 12px',background:'rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.05)',textAlign:'center'}}>
                <div className="mono" style={{fontSize:'0.44rem',color:'rgba(255,255,255,0.25)',letterSpacing:'2px',marginBottom:'3px'}}>{l}</div>
                <div className="mono" style={{color:c,fontWeight:700,fontSize:'1.05rem'}}>{v}</div>
              </div>
            ))}
          </div>
          
          {/* Rewards */}
          <div style={{padding:'10px 12px',background:'rgba(188,19,254,0.04)',border:'1px solid rgba(188,19,254,0.15)',borderLeft:'3px solid #bc13fe',marginBottom:'18px'}}>
            <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.22)',letterSpacing:'2px',marginBottom:'8px'}}>▸ BELOHNUNGEN BEI SIEG</div>
            <div style={{display:'flex',gap:'15px',flexWrap:'wrap', alignItems: 'center'}}>
              <div className="mono" style={{color:'#bc13fe',fontWeight:700,fontSize:'0.75rem'}}>⬡ +{info.sp} SP</div>
              <div className="mono" style={{color:'var(--ep)',fontWeight:700,fontSize:'0.75rem'}}>💳 +{info.credits} CR</div>
              {info.pack && <div className="mono" style={{color:info.packColor,fontWeight:700,fontSize:'0.75rem'}}>📦 {info.pack}</div>}
              <div className="mono" style={{color:'var(--win)',fontWeight:700,fontSize:'0.75rem'}}>🃏 DECK DRAFT</div>
            </div>
          </div>

          {/* Enemy deck */}
          <div style={{padding:'10px 12px',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.05)',borderLeft:'3px solid rgba(255,255,255,0.08)',marginBottom:'14px'}}>
            <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.22)',letterSpacing:'2px',marginBottom:'5px'}}>▸ GEGNER-DECK</div>
            <div style={{display:'flex',gap:'14px',flexWrap:'wrap'}}>
              <div className="mono" style={{fontSize:'0.62rem',color:'rgba(255,255,255,0.5)'}}>⬡ 4 CHARAKTERE</div>
              <div className="mono" style={{fontSize:'0.62rem',color:'var(--eff-col)'}}>◈ 1 EFFEKT</div>
              {n===5 && <div className="mono" style={{fontSize:'0.62rem',color:'var(--lose)'}}>+15 STAT BONUS</div>}
            </div>
          </div>
          
          {/* Actions */}
          <div style={{display:'flex',gap:'10px'}}>
            <button onClick={onClose} style={{flex:1,padding:'10px',background:'transparent',border:'1px solid #2a3a4a',color:'#667',fontFamily:"'Roboto Mono',monospace",fontSize:'0.68rem',letterSpacing:'2px',cursor:'pointer'}}>
              SCHLIESSEN
            </button>
            {isActive && (
              <button onClick={()=>{onClose();onStartBattle();}} style={{flex:2,padding:'12px',background:`${info.color}12`,border:`2px solid ${info.color}`,color:info.color,fontFamily:"'Roboto Mono',monospace",fontSize:'0.75rem',fontWeight:700,letterSpacing:'4px',cursor:'pointer',boxShadow:`0 0 18px ${info.glow}`}}>
                {info.icon} KAMPF STARTEN
              </button>
            )}
          </div>
        </>)}
      </div>
    </div>
  );
}

// ── Big Map Node ──────────────────────────────────────────────────────────
function MapNode({ n, currentNode, onSelect }) {
  const info   = NODE_TYPE(n);
  const done   = n < currentNode;
  const active = n === currentNode;
  const outer  = active ? 110 : done ? 58 : n===5 ? 88 : 76;
  const inner  = active ? 88  : done ? 46 : n===5 ? 70 : 58;
  const color  = done ? '#1a4a2a' : info.color;

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'7px',cursor:'pointer',flexShrink:0,userSelect:'none'}}
      onClick={()=>onSelect(n)}>
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
          boxShadow:active?`0 0 30px ${info.glow}, 0 0 60px ${info.glow}55, inset 0 0 20px ${info.color}14`:done?'none':`0 0 14px ${info.glow}44`,
          transition:'all 0.3s',
          animation:active?'gtiPulse 2s infinite alternate':'none',
        }}>
          <div style={{fontSize:done?'1rem':active?'1.8rem':n===5?'1.4rem':'1.1rem',color:done?'#2a6a3a':info.color,lineHeight:1}}>
            {done?'✓':info.icon}
          </div>
          {!done && <div className="mono" style={{fontSize:'0.4rem',color:info.color,letterSpacing:'1px'}}>{n}</div>}
        </div>
      </div>
      <div className="mono" style={{fontSize:'0.52rem',color:done?'#2a6a3a':active?'#fff':color,letterSpacing:'1px',fontWeight:active?700:400}}>
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
export default function RoguelikeMap({ avatarCard, roguelikeRun, onStartRun, onStartBattle, onBack, onGoToLab }) {
  const [selectedNode, setSelectedNode] = useState(null);

  if (!roguelikeRun) return (
    <div className="screen active" style={{display:'block',padding:'26px',position:'relative',overflow:'hidden'}}>
      <div className="rl-bg-layer-1"/><div className="rl-bg-layer-2"/><div className="rl-scanline-overlay"/>
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
  const isBoss  = node === 5;
  const nodeInfo= NODE_TYPE(node);
  const hpPct   = Math.max(0,Math.min(100,(currentHP/maxHP)*100));
  const hpColor = hpPct>60?'var(--win)':hpPct>25?'var(--ep)':'var(--lose)';
  const chars   = runDeck.chars||[];
  const effs    = runDeck.effs||[];

  return (
    <div style={{position:'fixed',inset:0,overflow:'hidden',background:'#05020e',display:'flex',flexDirection:'column',fontFamily:"'Roboto Mono',monospace"}}>
      <div className="rl-bg-layer-1" style={{position:'absolute',inset:0,zIndex:0}}/>
      <div className="rl-bg-layer-2" style={{position:'absolute',inset:0,zIndex:0}}/>
      <div className="rl-scanline-overlay" style={{position:'absolute',inset:0,zIndex:0}}/>

      <div style={{position:'relative',zIndex:2,padding:'10px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,0,127,0.15)',background:'rgba(5,0,12,0.8)',backdropFilter:'blur(10px)',flexShrink:0}}>
        <div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:900,fontSize:'1.05rem',letterSpacing:'4px',color:'var(--apex-pink)',textShadow:'0 0 12px rgba(255,0,127,0.4)'}}>⬡ GHOST NODE</div>
          <div className="mono" style={{fontSize:'0.52rem',color:'rgba(255,255,255,0.28)',letterSpacing:'3px',marginTop:'1px'}}>SEKTOR {sector} // NODE {node} — {nodeInfo.label}</div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          {onGoToLab && <button className="btn-back" style={{borderColor:'#bc13fe',color:'#bc13fe',fontSize:'0.56rem'}} onClick={onGoToLab}>ZUM LABOR</button>}
          <button className="btn-back" style={{fontSize:'0.56rem'}} onClick={onBack}>ZURÜCK</button>
        </div>
      </div>

      <div style={{position:'relative',zIndex:2,flex:1,display:'flex',overflow:'hidden'}}>

        <div style={{width:'186px',flexShrink:0,borderRight:'1px solid rgba(188,19,254,0.12)',background:'rgba(5,0,12,0.7)',backdropFilter:'blur(10px)',display:'flex',flexDirection:'column',padding:'8px',overflow:'hidden'}}>
          {avatarCard && (
            <div style={{marginBottom:'6px',padding:'6px 8px',background:'rgba(188,19,254,0.06)',border:'1px solid rgba(188,19,254,0.14)',borderLeft:'3px solid #bc13fe',flexShrink:0}}>
              <div className="mono" style={{fontSize:'0.42rem',color:'rgba(188,19,254,0.5)',letterSpacing:'2px',marginBottom:'1px'}}>▸ GHOST AGENT</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:'#bc13fe',fontSize:'0.85rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{avatarCard.name}</div>
              <div className="mono" style={{fontSize:'0.42rem',color:'rgba(255,255,255,0.22)',marginTop:'1px'}}>GTI {avatarCard.gti} // SP {avatarCard.sp??0}</div>
            </div>
          )}
          <div style={{marginBottom:'6px',padding:'5px 7px',background:'rgba(0,0,0,0.4)',border:`1px solid ${hpColor}18`,borderLeft:`2px solid ${hpColor}`,flexShrink:0}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
              <span className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.2)',letterSpacing:'2px'}}>HP</span>
              <span className="mono" style={{color:hpColor,fontWeight:700,fontSize:'0.76rem'}}>{currentHP}/{maxHP}</span>
            </div>
            <div style={{height:'3px',background:'rgba(255,255,255,0.05)',borderRadius:'2px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${hpPct}%`,background:hpColor,boxShadow:`0 0 5px ${hpColor}`,transition:'width 0.5s'}}/>
            </div>
          </div>
          <div className="mono" style={{fontSize:'0.42rem',color:'rgba(255,255,255,0.16)',letterSpacing:'2px',marginBottom:'3px',flexShrink:0}}>
            ▸ RUN-DECK ({chars.length+effs.length}/8)
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'2px',overflow:'hidden',flex:1}}>
            {chars.map((c,i) => <MiniCard key={i} card={c}/>)}
            {effs.map((c,i)  => <MiniCard key={'e'+i} card={c}/>)}
          </div>
        </div>

        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',padding:'14px 16px',gap:'12px'}}>

          <div style={{position:'relative',padding:'18px 12px 14px',background:'rgba(4,2,10,0.6)',backdropFilter:'blur(6px)',border:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
            <Corners color="var(--win)" size={7}/>
            <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.18)',letterSpacing:'3px',marginBottom:'16px'}}>
              ▸ SEKTOR {sector} — NETZWERK-TOPOLOGIE
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-evenly',padding:'8px 16px'}}>
              {[1,2,3,4,5].map(n => (
                <React.Fragment key={n}>
                  {n>1 && (
                    <div style={{flex:1,height:'3px',minWidth:'16px',background:n<=node?`linear-gradient(90deg,var(--win),${NODE_TYPE(n).color}66)`:'rgba(255,255,255,0.06)',boxShadow:n<node?'0 0 8px rgba(0,229,255,0.25)':'none',transition:'background 0.4s'}}/>
                  )}
                  <MapNode n={n} currentNode={node} onSelect={setSelectedNode}/>
                </React.Fragment>
              ))}
            </div>
            <div className="mono" style={{fontSize:'0.44rem',color:'rgba(255,255,255,0.14)',marginTop:'12px',letterSpacing:'1px',textAlign:'center'}}>
              NODE {node}/5 — {isBoss?'BOSS: +3 SP BEI SIEG':'+1 SP BEI SIEG'} &nbsp;|&nbsp; KLICK AUF NODE FÜR DETAILS
            </div>
          </div>

          <div style={{display:'flex',gap:'10px',flexShrink:0}}>
            <div style={{flex:1,padding:'10px 13px',background:`${nodeInfo.color}08`,border:`1px solid ${nodeInfo.color}20`,borderLeft:`3px solid ${nodeInfo.color}`,position:'relative'}}>
              <Corners color={nodeInfo.color} size={5}/>
              <div className="mono" style={{fontSize:'0.48rem',color:nodeInfo.color,letterSpacing:'3px',marginBottom:'3px'}}>▸ AKTUELLES ZIEL: NODE {sector}-{node}</div>
              <div style={{display:'flex',gap:'18px',alignItems:'center',flexWrap:'wrap'}}>
                <div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:'1.15rem',fontWeight:700,color:'#fff'}}>{nodeInfo.icon} {nodeInfo.label}{isBoss?' // BOSS':''}</div>
                  <div className="mono" style={{fontSize:'0.46rem',color:'rgba(255,255,255,0.32)',marginTop:'1px'}}>{nodeInfo.target}</div>
                </div>
                {[['GEGNER HP',isBoss?'800':'500',nodeInfo.color],['LOOT',nodeInfo.pack?'PACK+CR':`+${nodeInfo.credits} CR`,'var(--ep)'],['DIFF',isBoss?'BOSS':'LVL '+Math.min(3,sector),nodeInfo.color]].map(([l,v,c])=>(
                  <div key={l}>
                    <div className="mono" style={{fontSize:'0.42rem',color:'rgba(255,255,255,0.2)'}}>{l}</div>
                    <div className="mono" style={{color:c,fontWeight:700,fontSize:'0.82rem'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={onStartBattle} style={{padding:'10px 20px',flexShrink:0,background:`${nodeInfo.color}10`,border:`2px solid ${nodeInfo.color}`,color:nodeInfo.color,fontFamily:"'Roboto Mono',monospace",fontWeight:700,letterSpacing:'3px',cursor:'pointer',boxShadow:`0 0 20px ${nodeInfo.glow}`,animation:'gtiPulse 2s infinite alternate',position:'relative',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'3px',minWidth:'140px'}}>
              <Corners color={nodeInfo.color} size={4}/>
              <div style={{fontSize:'1.3rem',lineHeight:1}}>{nodeInfo.icon}</div>
              <div style={{fontSize:'0.66rem'}}>NODE HACKEN</div>
              <div style={{fontSize:'0.52rem',opacity:0.55,letterSpacing:'2px'}}>KAMPF STARTEN</div>
            </button>
          </div>

          <div style={{flex:1,padding:'12px 14px',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.04)',position:'relative',overflow:'hidden',minHeight:'60px'}}>
            <Corners color="rgba(255,255,255,0.06)" size={5}/>
            <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.2)',letterSpacing:'3px',marginBottom:'10px'}}>▸ MISSION BRIEFING</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px 12px',marginBottom:'10px'}}>
              {[['LOOT',nodeInfo.pack ? 'PACK + CREDITS' : `+${nodeInfo.credits} CR`,'var(--ep)'],['DECK DRAFT','3 Karten','var(--win)'],['DEINE HP',`${currentHP}/${maxHP}`,hpColor],['ENEMY HP',isBoss?'800':'500',nodeInfo.color]].map(([l,v,c])=>(
                <div key={l}>
                  <div className="mono" style={{fontSize:'0.42rem',color:'rgba(255,255,255,0.2)',letterSpacing:'1px'}}>{l}</div>
                  <div className="mono" style={{color:c,fontWeight:700,fontSize:'0.76rem',marginTop:'1px'}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:'7px'}}>
              <div className="mono" style={{fontSize:'0.44rem',color:'rgba(255,255,255,0.22)',lineHeight:'1.8'}}>
                {isBoss?'☠ BOSS: +15 Bonus auf alle Stats — Permadeath bei Niederlage — Exklusiver Architect Core bei Sieg':'⬡ HP bleiben zwischen Kämpfen erhalten — Bei Sieg: Permanente Credits, SP und Deck-Draft'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedNode !== null && (
        <NodeModal n={selectedNode} sector={sector} currentNode={node} onClose={()=>setSelectedNode(null)} onStartBattle={onStartBattle}/>
      )}
    </div>
  );
}