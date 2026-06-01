import React, { useState, useEffect, useRef } from 'react';
import Card, { getFactionIcon } from './Card';
import { playSound } from '../logic/audio'; 

// ── Configuration & Metadata ──────────────────────────────────────────────
const NODE_TYPES = {
  standard:    { label:'NODE',         color:'var(--win)',        icon:'⬡', glow:'rgba(0,229,255,0.35)',  type: 'battle' },
  elite:       { label:'ELITE',        color:'var(--apex-pink)',  icon:'⚡', glow:'rgba(255,0,127,0.4)',   type: 'battle' },
  boss:        { label:'ARCHITECT',    color:'var(--lose)',       icon:'☠', glow:'rgba(255,0,50,0.5)',    type: 'battle' },
  safehouse:   { label:'SAFEHOUSE',    color:'#00ff44',           icon:'⛺', glow:'rgba(0,255,68,0.3)',   type: 'event' },
  dataleak:    { label:'DATA LEAK',    color:'#ff0055',           icon:'🔓', glow:'rgba(255,0,85,0.3)',   type: 'event' },
  blackmarket: { label:'BLACK MARKET', color:'var(--legacy-sepia)',icon:'🛒', glow:'rgba(210,180,140,0.3)',type: 'event' },
  neurallink:  { label:'NEURAL TUNING', color:'#bc13fe',           icon:'🔗', glow:'rgba(188,19,254,0.4)', type: 'event' },
  encrypted:   { label:'ENCRYPTED',    color:'#888888',           icon:'?',  glow:'rgba(255,255,255,0.2)',type: 'battle' }
};

const EVENT_DETAILS = {
  safehouse:   { title: 'SYSTEM RECOVERY', desc: 'Sichere Zone. Repariert beschädigten Code und stellt 20% deiner maximalen HP wieder her.', reward: 'HEILUNG +20% HP' },
  dataleak:    { title: 'RISKANTES PROTOKOLL', desc: 'Du entwendest wertvolle Skill Points, das System kontert jedoch mit permanentem Schaden.', reward: '+2 SP // -50 HP' },
  blackmarket: { title: 'SHADOW BROKER', desc: 'Schattensystem-Händler. Bietet dir an, eine Standardkarte gegen ein mächtiges Legacy-Asset zu tauschen.', reward: 'KARTE TAUSCHEN' },
  neurallink:  { title: 'NEURAL TUNING', desc: 'Modifiziert eure Kern-Signatur. Schaltet den Synergie-Bonus einer Fraktion für den gesamten restlichen Run dauerhaft frei.', reward: 'FRAKTIONS-SYNERGIE' }
};

// ── Sektor Mutationen & Regeln ───────────────────────────────────────────
const FACTIONS = [
  { id: 'TECH', name: 'TECH CARTEL', color: '#00e5ff', rule: 'Taktiken kosten -1⚡ / +20% Krisenrisiko' },
  { id: 'FINANCE', name: 'FINANCE ELITE', color: '#ffd700', rule: '+50% Credits / Heilung kostet 100💳' },
  { id: 'SHADOW', name: 'SHADOW POWER', color: '#00ff44', rule: 'Team startet mit +3 EP / Gegner kontern oft' },
  { id: 'HEGEMONY', name: 'HEGEMONY', color: '#ffffff', rule: 'Alle Agenten +10 Legitimität / All-In kostet 10⚡' }
];

const getSectorFaction = (sector, seed = 0) => {
   const r = Math.sin(sector * 13.37 + seed * 999) * 10000;
   const index = Math.floor((r - Math.floor(r)) * FACTIONS.length);
   return FACTIONS[index];
};

// ── Adjacency Helper ─────────────────────────────────────────────────────
const getNodeY = (rowIdx, colLen) => {
  if (colLen === 1) return 50;
  if (colLen === 2) return rowIdx === 0 ? 30 : 70;
  return rowIdx === 0 ? 20 : rowIdx === 1 ? 50 : 80;
};

const isAdjacentConnection = (iA, colALen, iB, colBLen) =>
  Math.abs(getNodeY(iA, colALen) - getNodeY(iB, colBLen)) <= 35;

// ── Map Layout Generator (Procedural per Sector) ─────────────────────────
const getMapLayout = (sector, seed = 0) => {
  const rand = (offset) => {
    let x = Math.sin(sector * 13.37 + offset * 42.1 + seed * 999) * 10000;
    return x - Math.floor(x);
  };

  const getThemeName = (type, offset) => {
      const r = rand(offset);
      if (type === 'boss') {
          const names = ['Zentralbank-Tower', 'Wall Street', 'KI-Rechenzentrum', 'Forschungs-Labor', 'Präsidenten-Palast', 'Botschaft', 'Syndikat-Slum', 'Hinterhof-Festung', 'Kult-Kathedrale', 'Tempel', 'Hauptbehörde'];
          return names[Math.floor(r * names.length)];
      }
      if (type === 'elite' || type === 'encrypted') {
          const names = ['Schatten-Börse', 'Investment-Bank', 'Server-Farm', 'Tech-Zentrum', 'Regierungs-Amt', 'Slum-Warlord', 'Geheime Gasse', 'Fanatiker-Kult', 'Untergrund-Tempel'];
          return names[Math.floor(r * names.length)];
      }
      const stdNames = ['Proxy Server', 'Firewall', 'Sicherheits-Gate', 'Mainframe Zugang', 'Sub-Routing', 'Daten-Knoten'];
      return stdNames[Math.floor(r * stdNames.length)];
  };

  const layout = [];

  const shuffleCol = (col, step) => {
    const shuffled = [...col];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand(step + i * 0.1) * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.map((node, idx) => ({
      ...node,
      id: `${sector}-${step}-${idx + 1}`
    }));
  };
  
  const n1Name = getThemeName('standard', 1);
  layout.push([ { id: `${sector}-1-1`, step: 1, type: 'standard', target: n1Name, name: n1Name } ]);
  
  const s2Type = rand(2) > 0.5 ? 'safehouse' : 'dataleak';
  const n2_1Name = getThemeName('standard', 2.1);
  layout.push(shuffleCol([ 
    { step: 2, type: 'standard', target: n2_1Name, name: n2_1Name }, 
    { step: 2, type: s2Type, target: s2Type === 'safehouse' ? 'System Backup' : 'Korrupter Code', name: s2Type } 
  ], 2));
  
  const n3_1Name = getThemeName('standard', 3.1);
  const n3_2Name = getThemeName('elite', 3.2);
  layout.push(shuffleCol([ 
    { step: 3, type: 'standard', target: n3_1Name, name: n3_1Name }, 
    { step: 3, type: 'elite', target: n3_2Name, name: n3_2Name }, 
    { step: 3, type: rand(3.3) > 0.85 ? 'neurallink' : 'blackmarket', target: 'Shadow Broker', name: 'Event' } 
  ], 3));

  const n4_1Name = getThemeName('elite', 4.1);
  const n4_2Name = getThemeName('standard', 4.2);
  layout.push(shuffleCol([ 
    { step: 4, type: 'encrypted', target: 'Verschlüsselte Signatur', name: 'Encrypted Node' }, 
    { step: 4, type: 'standard', target: n4_2Name, name: n4_2Name }, 
    { step: 4, type: rand(4.3) > 0.5 ? 'safehouse' : 'dataleak', target: 'Versteckter Cache', name: 'Event' } 
  ], 4));

  const n5_1Name = getThemeName('elite', 5.1);
  layout.push(shuffleCol([ 
    { step: 5, type: 'elite', target: n5_1Name, name: n5_1Name }, 
    { step: 5, type: rand(5.2) > 0.85 ? 'neurallink' : 'blackmarket', target: 'Schatten-Netzwerk', name: 'Event' } 
  ], 5));

  const n6_1Name = getThemeName('elite', 6.2);
  layout.push(shuffleCol([ 
    { step: 6, type: 'safehouse', target: 'System Recovery', name: 'Safehouse' }, 
    { step: 6, type: 'elite', target: n6_1Name, name: n6_1Name } 
  ], 6));

  const bossName = getThemeName('boss', 7);
  layout.push([ { id: `${sector}-7-1`, step: 7, type: 'boss', target: `[BOSS] ${bossName}`, name: bossName } ]);
  
  return layout;
};

function Corners({ color='var(--win)', size=8 }) {
  const b = { position:'absolute', width:size, height:size, borderColor:color, borderStyle:'solid', pointerEvents:'none' };
  return (<>
    <div style={{...b,top:-1,left:-1,borderWidth:'1px 0 0 1px'}}/><div style={{...b,top:-1,right:-1,borderWidth:'1px 1px 0 0'}}/>
    <div style={{...b,bottom:-1,left:-1,borderWidth:'0 0 1px 1px'}}/><div style={{...b,bottom:-1,right:-1,borderWidth:'0 1px 1px 0'}}/>
  </>);
}

// ── Node Preview Modal ────────────────────────────────────────────────────
function NodeModal({ nodeObj, sector, currentNode, onClose, onStartBattle, onStartEvent, isCoop, myNodeReady, partnerNodeReady, onReadyClick, runDeck, baseHp = 200, onInstantHeal, credits, onSpendCredits, partnerFunding, conn, sectorFaction }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [doneHeal, setDoneHeal] = useState(false);
  const actionLockedRef = React.useRef(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  if (!nodeObj) return null;
  const n = nodeObj.step;
  const chars = runDeck?.chars || [];
  const effs = runDeck?.effs || [];
  const info = NODE_TYPES[nodeObj.type];
  const done = n < currentNode;
  const isActive = isCoop ? true : (n === currentNode);
  const isEvent = info.type === 'event';
  const eventData = isEvent ? EVENT_DETAILS[nodeObj.type] : null;

  const isBoss = nodeObj.type === 'boss';
  const isElite = nodeObj.type === 'elite';
  const isPaidSafehouse = nodeObj.type === 'safehouse' && sectorFaction?.id === 'FINANCE';
  
  const [myFunding, setMyFunding] = useState(0);
  const totalFunding = myFunding + (partnerFunding || 0);
  const isFullyFunded = !isPaidSafehouse || totalFunding >= 100;

  useEffect(() => {
    if (isCoop && conn && isPaidSafehouse) conn.send({ type: 'SAFEHOUSE_FUNDING', amount: myFunding });
  }, [myFunding, isCoop, conn, isPaidSafehouse]);

  let actualDiff = 1;
  if (sector === 1)      actualDiff = isBoss ? 3 : (isElite ? 2 : 1);
  else if (sector === 2) actualDiff = isBoss ? 3 : (isElite ? 3 : 2);
  else if (sector === 3) actualDiff = isBoss ? 4 : (isElite ? 4 : 3);
  else actualDiff = 4;

  const diffNames = ['','TRAINEE','OPERATIVE','EXECUTIVE','ARCHITECT'];
  const diffColors = ['','var(--win)','var(--ep)','var(--r-epi)','var(--lose)'];
  
  const sIdx = Math.min(sector, 5) - 1; 
  let displayHp = 0;

  if (isCoop) {
      if (isBoss) displayHp = [850, 1050, 1350, 1700, 2200][sIdx];
      else if (isElite) displayHp = [750, 750, 1000, 750, 1000][sIdx];
      else displayHp = [500, 500, 700, 500, 700][sIdx];

      if (sector > 5) displayHp += (isBoss ? 250 : 125) * (sector - 5);
  } else {
      if (isBoss) displayHp = [500, 600, 780, 960, 1200][sIdx];
      else if (isElite) displayHp = [400, 450, 600, 450, 600][sIdx];
      else displayHp = [300, 300, 420, 300, 420][sIdx];

      if (sector > 5) displayHp += (isBoss ? 150 : 75) * (sector - 5);
  }

  const spGain = isBoss ? (3 + Math.floor(sector/3)) : (isElite ? (sector > 3 ? 2 : 1) : 1);
  const creditGain = Math.floor((isBoss ? 500 : (isElite ? 200 : 75)) * (1 + sector * 0.15));
  const packReward = isBoss ? '1x SEKTOR-KERN CACHE' : (isElite ? '1x GHOST DATA PACK' : null);

  const handleAction = () => {
    if (actionLockedRef.current || isProcessing) return;
    if (isPaidSafehouse && !isCoop && credits < 100) return; 
    if (isPaidSafehouse && isCoop && !isFullyFunded) return; 
    
    actionLockedRef.current = true;

    if (isCoop) {
      onReadyClick();
    } else {
      setIsProcessing(true);
      if (nodeObj.type === 'safehouse') {
        if (isPaidSafehouse) onSpendCredits(isCoop ? myFunding : 100); 
        setTimeout(() => {
          if (onInstantHeal) onInstantHeal(20); 
          setDoneHeal(true);
          setTimeout(() => onClose(), 1200); 
        }, 800);
      } else {
        onClose();
        if (isEvent) {
          onStartEvent(nodeObj);
        } else {
          const safeChars = Array.isArray(chars) && chars.length > 0 ? chars : [];
          const safeEffs  = Array.isArray(effs)  ? effs  : [];
          onStartBattle(nodeObj, { chars: safeChars, effs: safeEffs });
        }
      }
    }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:30000,background:'#05020e',display:'flex',alignItems:'center',justifyContent:'center',animation:'backdropFade 0.25s ease-out forwards'}} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${info.color}15 0%, transparent 60%)`, pointerEvents: 'none' }} />
      <div style={{position:'relative',width:'min(1120px,96vw)',maxHeight:'94vh',background:'rgba(6,4,12,0.96)',backdropFilter:'blur(25px)',border:`1px solid ${info.color}44`,borderTop:`4px solid ${info.color}`,padding:'40px',display:'flex',flexDirection:'column',boxShadow:`0 30px 90px rgba(0,0,0,1), 0 0 60px ${info.glow}`,animation:'modalScaleIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <Corners color={info.color} size={12}/>
        
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'18px'}}>
          <div>
            <div className="mono" style={{fontSize:'0.52rem',color:'rgba(255,255,255,0.3)',letterSpacing:'3px',marginBottom:'4px'}}>SEKTOR {sector} — NODE {n}/7</div>
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
               <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px'}}>
                 <div style={{padding:'15px',background:`${info.color}11`,border:`1px solid ${info.color}33`,borderLeft:`3px solid ${info.color}`}}>
                    <div className="mono" style={{fontSize:'0.8rem',color:info.color,fontWeight:700,letterSpacing:'2px',marginBottom:'8px'}}>{eventData.title}</div>
                    <div style={{fontSize:'0.9rem',color:'#ddd',lineHeight:'1.5',marginBottom:'15px'}}>{eventData.desc}</div>
                    <div className="mono" style={{padding:'8px',background:'rgba(0,0,0,0.5)',color:'#fff',fontSize:'0.75rem',borderLeft:`2px solid ${info.color}`}}>
                      <span style={{color:'rgba(255,255,255,0.4)'}}>EFFEKT: </span> {eventData.reward}
                    </div>
                 </div>

                 {isPaidSafehouse && (
                   <div style={{padding:'20px',background:'rgba(255,215,0,0.05)',border:'1px solid rgba(255,215,0,0.2)',borderRadius:'8px'}}>
                     <div className="mono" style={{fontSize:'0.8rem',color:'#ffd700',letterSpacing:'2px',marginBottom:'15px',textAlign:'center'}}>
                       💳 REPARATUR-KOSTEN: 100 CREDITS
                     </div>
                     
                     {isCoop ? (
                       <div style={{display:'flex',flexDirection:'column',gap:'15px'}}>
                         <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                           <span className="mono" style={{fontSize:'0.7rem',color:'#fff'}}>DEIN BEITRAG:</span>
                           <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                             <button disabled={myFunding<=0} onClick={() => setMyFunding(Math.max(0, myFunding-10))} style={{background:'#222',color:'#fff',border:'1px solid #444',padding:'4px 10px',cursor:myFunding<=0?'not-allowed':'pointer'}}>-</button>
                             <span className="mono" style={{fontSize:'1.2rem',color:'var(--win)',width:'40px',textAlign:'center'}}>{myFunding}</span>
                             <button disabled={myFunding>=100 || myFunding>=credits || totalFunding>=100} onClick={() => setMyFunding(Math.min(100, myFunding+10))} style={{background:'#222',color:'#fff',border:'1px solid #444',padding:'4px 10px',cursor:(myFunding>=100 || myFunding>=credits || totalFunding>=100)?'not-allowed':'pointer'}}>+</button>
                           </div>
                         </div>
                         <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                           <span className="mono" style={{fontSize:'0.7rem',color:'#fff'}}>PARTNER BEITRAG:</span>
                           <span className="mono" style={{fontSize:'1.2rem',color:'#bc13fe',width:'90px',textAlign:'right'}}>{partnerFunding} 💳</span>
                         </div>
                         <div style={{height:'8px',background:'#111',borderRadius:'4px',overflow:'hidden',display:'flex'}}>
                           <div style={{width:`${myFunding}%`,background:'var(--win)',transition:'width 0.2s'}}/>
                           <div style={{width:`${partnerFunding}%`,background:'#bc13fe',transition:'width 0.2s'}}/>
                         </div>
                         <div className="mono" style={{textAlign:'center',color:isFullyFunded?'#00ff44':'#ff0055',fontSize:'0.7rem',marginTop:'5px'}}>
                           {isFullyFunded ? '✓ FUNDS SECURED' : `FEHLT: ${100 - totalFunding} 💳`}
                         </div>
                       </div>
                     ) : (
                       <div style={{textAlign:'center'}}>
                         <div className="mono" style={{fontSize:'1.2rem',color:credits>=100?'#00ff44':'#ff0055',marginBottom:'10px'}}>
                           KONTO: {credits} 💳
                         </div>
                         <div className="mono" style={{fontSize:'0.7rem',color:'#888'}}>
                           {credits>=100 ? 'Ausreichend Credits vorhanden.' : 'Nicht genügend Credits für eine Reparatur.'}
                         </div>
                       </div>
                     )}
                   </div>
                 )}
               </div>
            ) : (
               <>
                 <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
                  <div style={{padding:'6px 14px',background:`${diffColors[actualDiff]}15`,border:`1px solid ${diffColors[actualDiff]}44`,borderLeft:`3px solid ${diffColors[actualDiff]}`}}>
                    <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.28)',letterSpacing:'2px'}}>THREAT LEVEL</div>
                    <div className="mono" style={{color:diffColors[actualDiff],fontWeight:700,fontSize:'0.85rem',letterSpacing:'3px'}}>{diffNames[actualDiff]}</div>
                  </div>
                 </div>
                 
                 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',gap:'25px',overflowY:'auto',flex:1,margin:'10px 0 25px',paddingRight:'10px',alignContent:'start'}}>
            {chars.map((c,i) => (
              <div key={i} style={{ width: '220px', height: '308px', position: 'relative', margin:'0 auto' }}>
                <div style={{ transform: 'scale(0.611)', transformOrigin: 'top left', width: '360px', height: '504px' }}>
                  <Card card={c} context="inventory" />
                </div>
              </div>
            ))}
            {effs.map((c,i) => (
              <div key={'e'+i} style={{ width: '220px', height: '308px', position: 'relative', margin:'0 auto' }}>
                <div style={{ transform: 'scale(0.611)', transformOrigin: 'top left', width: '360px', height: '504px' }}>
                  <Card card={c} context="inventory" />
                </div>
              </div>
            ))}
          </div>

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
            
            <div style={{display:'flex', gap:'20px', marginTop:'auto', paddingTop:'30px'}}>
              <button 
                onClick={onClose} 
                disabled={myNodeReady || isProcessing} 
                className="menu-btn"
                style={{
                  flex:1, padding:'20px', background:'rgba(255,255,255,0.03)', 
                  border:'1px solid #3a4a5a', color:'#889', 
                  fontFamily:"'Roboto Mono',monospace", fontSize:'0.9rem', fontWeight:600, 
                  letterSpacing:'3px', cursor: (myNodeReady || isProcessing) ? 'not-allowed' : 'pointer', 
                  opacity: (myNodeReady || isProcessing) ? 0.4 : 1, transition: 'all 0.2s'
                }}
              >
                ABBRECHEN
              </button>
              {isActive && (
                <button 
                  onClick={(!myNodeReady && !isProcessing && !doneHeal && (!isPaidSafehouse || isFullyFunded || (!isCoop && credits >= 100))) ? handleAction : undefined} 
                  className="menu-btn btn-primary"
                  style={{
                    flex:2, padding:'20px', 
                    background: myNodeReady ? 'transparent' : (doneHeal ? 'rgba(0,255,68,0.2)' : `${info.color}22`),
                    border:`2px solid ${myNodeReady ? '#555' : (doneHeal ? '#00ff44' : info.color)}`,
                    color: myNodeReady ? '#888' : '#fff',
                    fontFamily:"'Roboto Mono',monospace", fontSize:'1.2rem', fontWeight:900, 
                    letterSpacing:'6px', 
                    cursor: (myNodeReady || isProcessing || doneHeal || (isPaidSafehouse && !isFullyFunded && isCoop) || (isPaidSafehouse && !isCoop && credits < 100)) ? 'not-allowed' : 'pointer',
                    opacity: (isPaidSafehouse && !isFullyFunded && isCoop) || (isPaidSafehouse && !isCoop && credits < 100) ? 0.4 : 1,
                    boxShadow: myNodeReady ? 'none' : (doneHeal ? '0 0 40px rgba(0,255,68,0.4)' : `0 0 40px ${info.glow}, inset 0 0 15px ${info.color}33`), 
                    textShadow: myNodeReady ? 'none' : `0 0 12px #fff`,
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    position: 'relative', overflow: 'hidden'
                  }}
                >
                  <Corners color={doneHeal ? '#00ff44' : info.color} size={10} />
                  {myNodeReady ? 'SYNCING...' : 
                    (doneHeal ? 'RECOVERY COMPLETE' : 
                      (isProcessing ? 'REPAIRING...' : 
                        (nodeObj.type === 'safehouse' ? (isPaidSafehouse ? '⛺ FUNDS TRANSFERIEREN' : '⛺ SYSTEM RECOVERY [ +20% HP ]') : 
                          (isEvent ? `${info.icon} EINTRETEN` : `${info.icon} KAMPF STARTEN`)
                        )
                      )
                    )
                  }
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
function MapNode({ nodeObj, currentNode, sector, onSelect, myVote, partnerVotes, isCoop, pathHistory, reachableIds, isMobile, onShowBottomSheet }) {
  const [hovered, setHovered] = useState(false);
  const n       = nodeObj.step;
  const info    = NODE_TYPES[nodeObj.type];
  
  const isBoss = nodeObj.type === 'boss';
  const isElite = nodeObj.type === 'elite';
   
  let actualDiff = 1;
  if (sector === 1)      actualDiff = isBoss ? 3 : (isElite ? 2 : 1);
  else if (sector === 2) actualDiff = isBoss ? 3 : (isElite ? 3 : 2);
  else if (sector === 3) actualDiff = isBoss ? 4 : (isElite ? 4 : 3);
  else actualDiff = 4;

  const threatName = ['','TRAINEE','OPERATIVE','EXECUTIVE','ARCHITECT'][actualDiff];
  const done    = n < currentNode;
  const active  = n === currentNode;
  
  const isChosen = pathHistory && pathHistory.includes(nodeObj.id);
  const isBypassed = done && !isChosen;
  
  const isEvent = info.type === 'event';
  const evData  = isEvent ? EVENT_DETAILS[nodeObj.type] : null;
  
  const isLocked = n > currentNode;
  const isBlocked = active && reachableIds && !reachableIds.has(nodeObj.id);

  const outer = active ? 160 : done ? 80 : n === 7 ? 140 : 120;
  const inner = active ? 125 : done ? 65 : n === 7 ? 110 : 95;
  const color = isBypassed ? '#333' : done ? '#1a4a2a' : info.color;

  const ttPos = n === 7
    ? { right: 'calc(100% + 16px)', top: '50%', transform: 'translateY(-50%)' }
    : { bottom: 'calc(100% + 16px)', left: '50%', transform: 'translateX(-50%)' };

  return (
      <div
        style={{ display:'flex', flexDirection:'column', alignItems:'center',
          cursor: (active && !isBlocked) ? 'pointer' : 'default', flexShrink:0, userSelect:'none',
          opacity: isLocked ? 0.3 : isBlocked ? 0.2 : 1, position:'relative' }}
        onClick={() => {
          if (!active || isBlocked) return;
          /* MOBILE OPTIMIZATION START */
          if (isMobile) {
            // Auf Mobile: Bottom-Sheet öffnen statt Node-Select
            onShowBottomSheet && onShowBottomSheet(nodeObj);
          } else {
            onSelect(nodeObj);
          }
          /* MOBILE OPTIMIZATION END */
        }}
        onMouseEnter={() => !isMobile && active && !isBlocked && setHovered(true)}
        onMouseLeave={() => !isMobile && setHovered(false)}
      >
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
              from { opacity:0; transform: ${n===7?'translateY(-46%)':'translateX(-50%) translateY(5px)'}; }
              to   { opacity:1; transform: ${n===7?'translateY(-50%)':'translateX(-50%) translateY(0)'}; }
            }
          `}</style>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:900,fontSize:'1.4rem',color:info.color,letterSpacing:'2px',textShadow:`0 0 12px ${info.glow}`}}>
              {info.icon} {info.label}
            </div>
            <div className="mono" style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.28)',letterSpacing:'1px'}}>N{n}/7</div>
          </div>

          <div className="mono" style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.38)',marginBottom:'12px',letterSpacing:'1px',whiteSpace:'normal',lineHeight:1.5}}>
            {nodeObj.target}
          </div>

          {isEvent && evData ? (
            <>
              <div style={{fontSize:'0.9rem',color:'#ccc',lineHeight:1.45,marginBottom:'12px',whiteSpace:'normal'}}>
                {evData.desc}
              </div>
              <div style={{padding:'8px 12px',background:`${info.color}14`,borderLeft:`2px solid ${info.color}`,display:'flex',gap:'10px',alignItems:'center'}}>
                <span className="mono" style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.28)'}}>EFFEKT:</span>
                <span className="mono" style={{fontSize:'0.85rem',color:info.color,fontWeight:700}}>{evData.reward}</span>
              </div>
            </>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              {[
                ['THREAT', threatName],
                ['STATUS', active?'EINTRETEN':'VERFÜGBAR'],
              ].map(([l,v])=>(
                <div key={l} style={{padding:'8px 10px',background:'rgba(0,0,0,0.5)',border:'1px solid rgba(255,255,255,0.05)'}}>
                  <div className="mono" style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.22)',letterSpacing:'1px'}}>{l}</div>
                  <div className="mono" style={{fontSize:'0.85rem',color:info.color,fontWeight:700,marginTop:'4px'}}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{position:'relative',width:outer,height:outer,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {active && <>
          <div className="node-outer-ring"   style={{color:info.color}}/>
          <div className="node-outer-ring-r" style={{color:info.color}}/>
        </>}
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
            fontSize: done?'1.5rem':active?'2.2rem':n===5?'2rem':'1.8rem',
            color: isBypassed ? '#444' : done?'#2a6a3a':info.color, lineHeight:1,
            textShadow: active?`0 0 18px ${info.color}`:'none',
            transform: hovered && !done ? 'scale(1.1)' : 'scale(1)',
            transition:'transform 0.2s',
          }}>
            {isBypassed ? '✕' : done ? '✓' : info.icon}
          </div>

          {isCoop && myVote === nodeObj.id && (
            <div style={{position:'absolute',top:'-13px',left:'-13px',background:'var(--win)',color:'#000',fontSize:'0.55rem',fontWeight:900,padding:'2px 6px',borderRadius:'3px',zIndex:10,boxShadow:'0 0 8px var(--win)',letterSpacing:'1px'}}>DU</div>
          )}
          {isCoop && partnerVotes && partnerVotes.filter(v => v.nodeId === nodeObj.id).map((vote, idx) => {
             // Verteilt die Badges dynamisch auf die anderen Ecken (Oben rechts, unten rechts, unten links)
             const positions = [
                { top: '-13px', right: '-13px' },
                { bottom: '-13px', right: '-13px' },
                { bottom: '-13px', left: '-13px' }
             ];
             const pos = positions[idx % positions.length];
             return (
               <div key={vote.username} style={{position:'absolute', ...pos, background:'var(--ep)',color:'#000',fontSize:'0.55rem',fontWeight:900,padding:'2px 6px',borderRadius:'3px',zIndex:10,boxShadow:'0 0 8px var(--ep)',letterSpacing:'1px', whiteSpace: 'nowrap'}}>
                 {vote.username.substring(0,8).toUpperCase()}
               </div>
             );
          })}
        </div>
      </div>

      <div className="mono" style={{
        position:'absolute', top:'100%', left:'50%', transform:'translateX(-50%)',
        marginTop:'8px', whiteSpace:'nowrap',
        fontSize:'0.75rem', color:done?'#2a6a3a':active?'#fff':color,
        letterSpacing:'2px', fontWeight:active?700:400,
        textShadow:active?`0 0 10px ${info.color}`:'none',
        transition:'all 0.25s',
      }}>
        {done ? 'CLEARED' : info.label}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function RoguelikeMap({ roguelikeRun, onUpdateRun, onBack, onGoToLab, isCoop, isHost, conn, credits, onSpendCredits, onInstantHeal, baseHp = 200, avatarCard, onStartBattle, onStartEvent, squadSize = 2, broadcast, username = 'AGENT', inboxMessage = null }) {
  const [selectedNodeObj, setSelectedNodeObj] = useState(null);

  /* MOBILE OPTIMIZATION START */
  const [isMobile, setIsMobile] = useState(false);
  // Bottom-Sheet: zeigt Node-Info beim Tap auf Mobile
  const [bottomSheetNode, setBottomSheetNode] = useState(null);
  // Sidebar (Avatar & HP) auf Mobile einklappbar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
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

  // Bottom-Sheet: Öffnet Node-Info (nur auf Mobile, statt direktem Select)
  const handleShowBottomSheet = (nodeObj) => {
    setBottomSheetNode(nodeObj);
  };
  // Bottom-Sheet: Bestätigt den Node-Select aus dem Sheet heraus
  const handleBottomSheetConfirm = () => {
    if (bottomSheetNode) {
      setSelectedNodeObj(bottomSheetNode);
      setBottomSheetNode(null);
    }
  };
  /* MOBILE OPTIMIZATION END */
  
  // FIX: Multi-Client fähiges Funding. Addiert die Beiträge aller Spieler!
  const [partnerFundingData, setPartnerFundingData] = useState({}); 
  const partnerFunding = Object.values(partnerFundingData).reduce((sum, val) => sum + val, 0);
  
  const [swapSource, setSwapSource] = useState(null); 
  const [hoveredChipCard, setHoveredChipCard] = useState(null);
  const [glitchingSlots, setGlitchingSlots] = useState(new Set());

  const { currentHP, maxHP, sector, node, runDeck, bank = [] } = roguelikeRun;
  const hpPct   = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
  const hpColor = hpPct > 60 ? 'var(--win)' : hpPct > 25 ? 'var(--ep)' : 'var(--lose)';
  const chars   = runDeck.chars || [];
  const effs    = runDeck.effs || [];

  const handleSwapClick = React.useCallback((loc, type, idx, cardObj) => {
      if (!swapSource) {
          if (!cardObj) return;
          playSound('click');
          setSwapSource({ loc, type, idx, card: cardObj });
          return;
      }
      if (swapSource.loc === loc && swapSource.idx === idx && swapSource.type === type) return;

      const source = swapSource;
      const target = { loc, type, idx, card: cardObj };

      if (!cardObj || source.loc === target.loc) {
          if (cardObj) { playSound('click'); setSwapSource({ loc, type, idx, card: cardObj }); }
          else setSwapSource(null);
          return;
      }

      const sourceType = source.card.type === 'effect' || source.card.buff !== undefined ? 'effs' : 'chars';
      if (target.loc === 'deck' && target.type !== sourceType) {
          playSound('crisis'); setSwapSource(null); return; 
      }
      if (source.loc === 'deck' && target.loc === 'bank' && target.card) {
         const targetCardType = target.card.type === 'effect' || target.card.buff !== undefined ? 'effs' : 'chars';
         if (targetCardType !== source.type) {
             playSound('crisis'); setSwapSource(null); return; 
         }
      }

      const newDeck = { chars: [...chars], effs: [...effs] };
      const newBank = [...bank];
      if (source.loc === 'deck') newDeck[source.type][source.idx] = null;
      else newBank[source.idx] = null;

      if (target.card) {
          if (target.loc === 'deck') newDeck[target.type][target.idx] = source.card;
          else newBank[target.idx] = source.card;
          if (source.loc === 'deck') newDeck[source.type][source.idx] = target.card;
          else newBank[source.idx] = target.card;
      } else {
          if (target.loc === 'deck') newDeck[target.type][target.idx] = source.card;
          else newBank[target.idx] = source.card;
      }
      newDeck.chars = newDeck.chars.filter(Boolean);
      newDeck.effs = newDeck.effs.filter(Boolean);
      const cleanBank = newBank.filter(Boolean);
      const glitchKeys = new Set([
        `${source.loc}-${source.type}-${source.idx}`,
        `${target.loc}-${target.type}-${target.idx}`,
      ]);
      setSwapSource(null);
      setGlitchingSlots(glitchKeys);
      setTimeout(() => setGlitchingSlots(new Set()), 600);
      if (onUpdateRun) onUpdateRun({ ...roguelikeRun, runDeck: newDeck, bank: cleanBank });
  }, [swapSource, chars, effs, bank, roguelikeRun, onUpdateRun]);

  const renderMiniChip = React.useCallback((card, loc, type, idx, locked = false) => {
      const slotType = type || (card?.type === 'effect' || card?.buff !== undefined ? 'effs' : 'chars');
      const isSelected = swapSource?.loc === loc && swapSource?.idx === idx && swapSource?.type === slotType;
      const isGlitching = glitchingSlots.has(`${loc}-${slotType}-${idx}`);
      const isAv = locked || card?.id === 'avatar';
      let tc = '0, 229, 255'; 
      if (isAv) tc = '188, 19, 254'; 
      else if (card?.type === 'effect') tc = '0, 255, 204'; 
      else if (card?.type === 'apex') tc = '255, 0, 127'; 
      else if (card?.type === 'legacy') tc = '210, 180, 140';

    const isAnomaly = card?.type === 'anomaly';
    const factions = card && card.faction && slotType !== 'effs'
      ? (Array.isArray(card.faction) ? card.faction : [card.faction])
      : [];
    return (
      <div 
        key={`${loc}-${slotType}-${idx}`}
        onMouseEnter={() => card && setHoveredChipCard(card)}
        onMouseLeave={() => setHoveredChipCard(null)}
        onClick={(e) => { e.stopPropagation(); if (!locked) handleSwapClick(loc, slotType, idx, card); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
          background: isSelected ? `rgba(${tc}, 0.25)` : 'rgba(0,0,0,0.5)',
          border: `1px solid ${isSelected ? `rgba(${tc}, 1)` : 'rgba(255,255,255,0.08)'}`,
          borderLeft: `4px solid ${card ? `rgba(${tc}, 1)` : '#222'}`,
          cursor: locked ? 'default' : (card || swapSource ? 'pointer' : 'default'), 
          transition: 'all 0.1s ease-out', position: 'relative', marginBottom: '3px', overflow: 'hidden', pointerEvents: 'all',
          animation: isGlitching ? 'chipGlitch 0.55s steps(1) forwards' : 'none',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '22px', flexShrink: 0 }}>
          {card?.gti != null && card?.type !== 'effect' && card?.buff === undefined ? (
            <>
              <div className="mono" style={{ fontSize: '0.55rem', color: `rgba(${tc}, 0.5)`, letterSpacing: '1px', lineHeight: 1 }}>GTI</div>
              <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: `rgba(${tc}, 1)`, lineHeight: 1, textShadow: `0 0 6px rgba(${tc}, 0.6)` }}>{card.gti}</div>
            </>
          ) : (
            <div className="mono" style={{ fontSize: '0.9rem', color: `rgba(${tc}, ${card ? '1' : '0.3'})` }}>
              {card ? (card.type === 'effect' ? '◈' : '⬡') : '○'}
            </div>
          )}
        </div>
        {factions.length > 0 && (
          isAnomaly && factions.length > 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1px', width: '18px', flexShrink: 0 }}>
              <div className="mono" style={{ fontSize: '0.75rem', color: `rgba(${tc}, 1)`, textShadow: `0 0 6px rgba(${tc}, 0.6)`, lineHeight: 1 }}>{getFactionIcon(factions[0])}</div>
              <div className="mono" style={{ fontSize: '0.55rem', color: `rgba(${tc}, 0.45)`, lineHeight: 1 }}>×</div>
              <div className="mono" style={{ fontSize: '0.75rem', color: `rgba(${tc}, 1)`, textShadow: `0 0 6px rgba(${tc}, 0.6)`, lineHeight: 1 }}>{getFactionIcon(factions[1])}</div>
            </div>
          ) : (
            <div className="mono" style={{ fontSize: '1.1rem', color: `rgba(${tc}, 1)`, textShadow: `0 0 8px rgba(${tc}, 0.5)`, width: '20px', textAlign: 'center', flexShrink: 0, marginTop: '-2px' }}>{getFactionIcon(factions[0])}</div>
          )
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: card ? '#fff' : '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card ? card.name.toUpperCase() : '--- LEERER SLOT ---'}
          </div>
        </div>
        {card && <div className="mono" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>L{card.level || 1}</div>}
        {locked && <div className="mono" style={{ fontSize: '0.45rem', color: `rgba(${tc}, 1)`, letterSpacing: '1px', flexShrink: 0 }}>[KERNEL]</div>}
        {isSelected && <div style={{ position: 'absolute', inset: 0, border: `1px solid rgba(${tc}, 1)`, animation: 'pulse 1s infinite', pointerEvents: 'none' }} />}
        {isGlitching && (
          <>
            <style>{`
              @keyframes chipGlitch {
                0%   { transform: skewX(0deg);   opacity: 1;    filter: brightness(1)    saturate(1); }
                8%   { transform: skewX(-12deg);  opacity: 0.6;  filter: brightness(2.5)  saturate(3) hue-rotate(90deg); clip-path: inset(20% 0 30% 0); }
                16%  { transform: skewX(8deg);    opacity: 1;    filter: brightness(1)    saturate(1); clip-path: inset(0); }
                24%  { transform: skewX(0deg);    opacity: 0.2;  filter: brightness(3)    saturate(0); clip-path: inset(40% 0 10% 0); }
                32%  { transform: skewX(6deg);    opacity: 1;    filter: brightness(1)    saturate(1); clip-path: inset(0); }
                48%  { transform: skewX(-4deg);   opacity: 0.85; filter: brightness(1.8)  saturate(2) hue-rotate(-60deg); }
                60%  { transform: skewX(0deg);    opacity: 1;    filter: brightness(1)    saturate(1); }
                72%  { transform: translateX(4px) skewX(2deg); opacity: 0.7; filter: brightness(2) saturate(0); clip-path: inset(10% 0 50% 0); }
                80%  { transform: translateX(-2px); opacity: 1;  filter: brightness(1)    saturate(1); clip-path: inset(0); }
                100% { transform: skewX(0deg);    opacity: 1;    filter: brightness(1)    saturate(1); }
              }
            `}</style>
            <div style={{ position: 'absolute', inset: 0, background: `rgba(${tc}, 0.18)`, mixBlendMode: 'screen', pointerEvents: 'none', animation: 'chipGlitch 0.55s steps(1) forwards' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)', pointerEvents: 'none', opacity: 0.6 }} />
          </>
        )}
      </div>
    );
  }, [swapSource, handleSwapClick, glitchingSlots]);

  const [pathHistory, setPathHistory] = useState(() => {
    if (!roguelikeRun) return [];
    try {
      const saved = localStorage.getItem('aoc_path_' + roguelikeRun.seed);
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  const voteEpoch = `${sector}_${node}`; // Eindeutige ID für diese Map-Phase
  const [myVote, setMyVote] = useState(null);
  const [voteLedger, setVoteLedger] = useState({}); // NEU: Zentrales Register { username: nodeId }
  const [myNodeReady, setMyNodeReady] = useState(false);
  
  // FIX: Nutzt ein Set für Ready-States, damit Spam-Klicks oder parallele Netzwerksignale nicht fälschlicherweise triggern
  const [partnerReadiesData, setPartnerReadiesData] = useState(new Set());
  const partnerNodeReadies = partnerReadiesData.size;

  // ── STALE-CLOSURE-SCHUTZ: Refs für alle async Callbacks ──────────────────
  const myVoteRef = useRef(null);
  const voteLedgerRef = useRef({});
  const partnerNodeReadiesRef = useRef(0);
  const selectedNodeObjRef = useRef(null);
  const pathHistoryRef = useRef([]);
  const layoutRef = useRef(null);

  React.useEffect(() => { myVoteRef.current = myVote; }, [myVote]);
  React.useEffect(() => { voteLedgerRef.current = voteLedger; }, [voteLedger]);
  React.useEffect(() => { partnerNodeReadiesRef.current = partnerNodeReadies; }, [partnerNodeReadies]);
  React.useEffect(() => { selectedNodeObjRef.current = selectedNodeObj; }, [selectedNodeObj]);
  React.useEffect(() => { pathHistoryRef.current = pathHistory; }, [pathHistory]);

  const layout = React.useMemo(() => getMapLayout(sector, roguelikeRun.seed || 0), [sector, roguelikeRun.seed]);
  const sectorFaction = React.useMemo(() => getSectorFaction(sector, roguelikeRun.seed || 0), [sector, roguelikeRun.seed]);
  React.useEffect(() => { layoutRef.current = layout; }, [layout]);

  // ── BULLETPROOF MESSAGE HANDLER (INBOX & CONN) ──────────────────────────
  // Verarbeitet Nachrichten aus inboxMessage ODER direkt über conn, damit kein Vote verloren geht
  const handleMapNetworkData = React.useCallback((data) => {
    if (!data || !isCoop) return;
    
    if (['MAP_VOTE', 'MAP_VOTE_SYNC', 'MAP_VOTE_RESOLVE', 'NODE_READY'].includes(data.type) && data.epoch && data.epoch !== voteEpoch) return;

    if (data.type === 'MAP_VOTE') {
      if (data.username === username) return;
      setVoteLedger(prev => {
        const next = { ...prev, [data.username]: data.nodeId };
        if (isHost) {
            const syncMsg = { type: 'MAP_VOTE_SYNC', ledger: next, epoch: voteEpoch };
            if (broadcast) broadcast(syncMsg);
            else if (conn) conn.send(syncMsg);
        }
        return next;
      });
    } else if (data.type === 'MAP_VOTE_RESOLVE') {
      // Nur Clients reagieren hier; der Host setzt den State direkt im Resolver
      if (!isHost) {
        const chosenNode = layoutRef.current?.flat().find(n => n.id === data.nodeId);
        setSelectedNodeObj(chosenNode || null);
        setMyVote(null); 
        setVoteLedger({});
        setMyNodeReady(false); 
        setPartnerReadiesData(new Set());
        setPartnerFundingData({});
      }
    } else if (data.type === 'NODE_READY') {
      setPartnerReadiesData(prev => new Set(prev).add(data.username || Math.random()));
    } else if (data.type === 'SAFEHOUSE_FUNDING') {
      setPartnerFundingData(prev => ({ ...prev, [data.username || 'unknown']: data.amount }));
    } else if (data.type === 'PATH_SYNC') {
      setPathHistory(data.path);
      localStorage.setItem('aoc_path_' + roguelikeRun.seed, JSON.stringify(data.path));
    }
  }, [isCoop, isHost, voteEpoch, username, broadcast, conn, layoutRef]);

  React.useEffect(() => {
    if (inboxMessage) handleMapNetworkData(inboxMessage);
  }, [inboxMessage, handleMapNetworkData]);

  React.useEffect(() => {
    if (!conn) return;
    const onData = (data) => handleMapNetworkData(data);
    conn.on('data', onData);
    return () => conn.off('data', onData);
  }, [conn, handleMapNetworkData]);

  // ── FIX: NODE_READY Resolver mit Timeout-Fallback ────────────────────────
  // Startet einen Timer beim ersten eigenen Ready-Signal.
  // Löst sofort auf wenn alle Partner bereit sind, oder nach 20s als Fallback.
  React.useEffect(() => {
    if (!isCoop || !isHost || !myNodeReady || !selectedNodeObj) return;

    const allIn = partnerNodeReadies >= (squadSize - 1);
    const delay = allIn ? 600 : 20000; // Sofort oder 20s Fallback

    const timer = setTimeout(() => {
      const node = selectedNodeObjRef.current;
      if (!node) return; // Bereits aufgelöst

      setSelectedNodeObj(null);
      setMyNodeReady(false);
      setPartnerReadiesData(new Set());
      setPartnerFundingData({});

      const currentPath = pathHistoryRef.current;
      const newPath = [...new Set([...currentPath, node.id])];
      setPathHistory(newPath);
      localStorage.setItem('aoc_path_' + roguelikeRun.seed, JSON.stringify(newPath));
      if (broadcast) broadcast({ type: 'PATH_SYNC', path: newPath });
      else if (conn) conn.send({ type: 'PATH_SYNC', path: newPath });

      if (NODE_TYPES[node.type].type === 'event') {
        onStartEvent(node);
      } else {
        onStartBattle(node);
      }
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoop, isHost, myNodeReady, partnerNodeReadies, selectedNodeObj, squadSize]);

  // LIGHTHOUSE VOTE SYNC: Host sendet sein Register alle 3 Sekunden passiv
  React.useEffect(() => {
    if (!isCoop || !isHost || myVote) return; // Wenn der Host selbst gewählt hat, übernimmt der Resolver
    
    const syncTimer = setInterval(() => {
        if (Object.keys(voteLedgerRef.current).length > 0) {
            const syncMsg = { type: 'MAP_VOTE_SYNC', ledger: voteLedgerRef.current, epoch: voteEpoch };
            if (typeof broadcast === 'function') broadcast(syncMsg);
            else if (conn) conn.send(syncMsg);
        }
    }, 3000);
    return () => clearInterval(syncTimer);
  }, [isCoop, isHost, broadcast, conn, myVote, voteEpoch]);

  // ── SOUVERÄNER MAP_VOTE RESOLVER (Host) ───────────────────
  React.useEffect(() => {
    if (!isCoop || !isHost || !myVote) return;

    const ledgerKeys = Object.keys(voteLedger);
    const allIn = ledgerKeys.length >= (squadSize - 1);
    const delay = allIn ? 1200 : 15000; // 15s Timeout für späte Nachzügler

    const timer = setTimeout(() => {
      const currentMyVote = myVoteRef.current;
      const currentLedger = voteLedgerRef.current;
      if (!currentMyVote) return; 

      // Zähle eigene Stimme + alle Stimmen aus dem Ledger
      const allVotes = [currentMyVote, ...Object.values(currentLedger)];
      const voteCounts = {};
      allVotes.forEach(v => { voteCounts[v] = (voteCounts[v] || 0) + 1; });

      let maxVotes = 0; let winners = [];
      for (const [id, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) { maxVotes = count; winners = [id]; }
        else if (count === maxVotes) { winners.push(id); }
      }
      const chosenId = winners[Math.floor(Math.random() * winners.length)];

      // Sende das Resultat inkl. Epoch an alle Clients
      if (broadcast) broadcast({ type: 'MAP_VOTE_RESOLVE', nodeId: chosenId, epoch: voteEpoch });
      else if (conn) conn.send({ type: 'MAP_VOTE_RESOLVE', nodeId: chosenId, epoch: voteEpoch });

      const chosenNode = layoutRef.current?.flat().find(n => n.id === chosenId);
      setSelectedNodeObj(chosenNode || null);
      setMyVote(null);
      setVoteLedger({}); // Ledger nach Auflösung leeren
    }, delay);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myVote, voteLedger, isHost, isCoop, squadSize, voteEpoch]);

  const getReachableNodeIds = React.useCallback(() => {
    const currCol = layout[node - 1];
    if (!currCol) return new Set();
    if (node === 1) return new Set(currCol.map(n => n.id));
    const prevCol = layout[node - 2];
    if (!prevCol) return new Set(currCol.map(n => n.id));
    const lastVisited = prevCol.find(n => pathHistory.includes(n.id));
    if (!lastVisited) return new Set(currCol.map(n => n.id));
    const iA = prevCol.indexOf(lastVisited);
    const reachable = new Set();
    currCol.forEach((n, iB) => {
      if (isAdjacentConnection(iA, prevCol.length, iB, currCol.length)) reachable.add(n.id);
    });
    return reachable;
  }, [layout, node, pathHistory]);

  const handleNodeSelect = (nodeObj) => {
    if (nodeObj.step !== node) return;
    if (!getReachableNodeIds().has(nodeObj.id)) return; 
    
    if (!isCoop) {
      setSelectedNodeObj(nodeObj);
      return;
    }
    
    setMyVote(nodeObj.id);
    
    // BOMBENFEST: Eigener Vote wird SOFORT über alle Kanäle gefunkt
    // Fallback: Falls 'username' fehlt, Zufalls-ID vergeben um Überschreiben zu verhindern
    const safeUsername = username && username !== 'AGENT' ? username : `Player_${Math.floor(Math.random()*1000)}`;
    const votePayload = { type: 'MAP_VOTE', nodeId: nodeObj.id, username: safeUsername, epoch: voteEpoch };
    
    if (broadcast) broadcast(votePayload);
    else if (conn) conn.send(votePayload);
    
    // Host registriert sich zusätzlich direkt ins Ledger und synct
    if (isHost) {
        setVoteLedger(prev => {
            const next = { ...prev, [safeUsername]: nodeObj.id };
            const syncMsg = { type: 'MAP_VOTE_SYNC', ledger: next, epoch: voteEpoch };
            if (broadcast) broadcast(syncMsg);
            else if (conn) conn.send(syncMsg);
            return next;
        });
    }
  };

  const derivedPartnerVotes = Object.entries(voteLedger)
    .filter(([usr]) => usr !== username)
    .map(([usr, nId]) => ({ username: usr, nodeId: nId }));

  return (
    <div style={{position:'fixed',inset:0,overflow:'hidden',background:'#05020e',display:'flex',flexDirection:'column',fontFamily:"'Roboto Mono',monospace"}}>
      <div className="top-bar" style={{position:'relative',zIndex:2,padding:'15px 25px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:`1px solid ${sectorFaction.color}44`,background:'rgba(5,0,12,0.8)',backdropFilter:'blur(10px)',flexShrink:0,marginBottom:0}}>
        <div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:900,fontSize:'1.4rem',letterSpacing:'4px',color:sectorFaction.color,textShadow:`0 0 12px ${sectorFaction.color}66`}}>⬡ {sectorFaction.name} SEKTOR</div>
          <div className="mono" style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.5)',letterSpacing:'3px',marginTop:'4px', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
             <span>SEKTOR {sector} // RUN AKTIV</span>
             <span style={{background:'rgba(0,0,0,0.5)', padding:'2px 8px', borderRadius:'4px', border:`1px solid ${sectorFaction.color}44`, color:sectorFaction.color}}>
                REGEL: {sectorFaction.rule}
             </span>
          </div>
        </div>
        <div className="hud-status-container" style={{ position: 'relative', top: 0, right: 0, filter: 'none', display: 'flex' }}>
          {onGoToLab && (
            <div className="hud-status-module funds" onClick={onGoToLab} style={{ borderColor: '#bc13fe', color: '#bc13fe', paddingLeft: '35px', paddingRight: '25px', clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)', cursor: 'pointer', borderLeft: '2px solid #bc13fe' }}>
              <span className="hud-label" style={{ color: '#bc13fe' }}>AVATAR</span>
              <span className="hud-value">LABOR</span>
            </div>
          )}
          <div className="hud-status-module agent" onClick={onBack} style={{ borderColor: 'var(--lose)', color: 'var(--lose)', paddingLeft: '15px', paddingRight: '25px', marginLeft: '-5px', clipPath: 'polygon(0 0, 100% 0, calc(100% - 15px) 100%, 0 100%)', cursor: 'pointer', borderRight: '2px solid var(--lose)' }}>
            <span className="hud-label" style={{ color: 'var(--lose)' }}>STATUS</span>
            <span className="hud-value">ZURÜCK</span>
          </div>
        </div>
      </div>

      <div className="rl-map-layout" style={{position:'relative',zIndex:2,flex:1,display:'flex',overflow:'hidden'}}>
        {/* MOBILE OPTIMIZATION START: Sidebar Toggle Button (nur auf Mobile) */}
        {isMobile && (
          <button
            onClick={() => setMobileSidebarOpen(o => !o)}
            style={{
              position: 'fixed', left: 0, top: '50%', transform: 'translateY(-50%)',
              zIndex: 500, background: 'rgba(5,0,12,0.95)',
              border: '1px solid rgba(188,19,254,0.4)', borderLeft: 'none',
              borderRadius: '0 6px 6px 0',
              color: '#bc13fe', fontFamily: "'Roboto Mono',monospace",
              fontSize: '0.45rem', letterSpacing: '2px', cursor: 'pointer',
              padding: '12px 4px', writingMode: 'vertical-rl',
              textOrientation: 'mixed',
            }}
          >
            {mobileSidebarOpen ? '✕ SCHLIESSEN' : 'AGENT ▸'}
          </button>
        )}
        {/* Mobile Sidebar Backdrop */}
        {isMobile && mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400 }}
          />
        )}
        {/* MOBILE OPTIMIZATION END */}

        <div className="rl-map-sidebar" style={{
          width:'260px',flexShrink:0,borderRight:'1px solid rgba(188,19,254,0.12)',
          background:'rgba(5,0,12,0.85)',backdropFilter:'blur(15px)',
          display:'flex',flexDirection:'column',padding:'20px',overflow:'hidden',
          position: isMobile ? 'fixed' : 'relative',
          /* MOBILE OPTIMIZATION START */
          left: isMobile ? 0 : undefined,
          top: isMobile ? 0 : undefined,
          bottom: isMobile ? 0 : undefined,
          zIndex: isMobile ? 450 : 100,
          transform: isMobile ? (mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          transition: isMobile ? 'transform 0.25s ease' : 'none',
          /* MOBILE OPTIMIZATION END */
          pointerEvents: 'all'
        }}>
          {avatarCard && (
            <div style={{marginBottom:'15px',padding:'12px',background:'rgba(188,19,254,0.06)',border:'1px solid rgba(188,19,254,0.14)',borderLeft:'3px solid #bc13fe',flexShrink:0}}>
              <div className="mono" style={{fontSize:'0.6rem',color:'rgba(188,19,254,0.5)',letterSpacing:'2px',marginBottom:'4px'}}>▸ GHOST AGENT</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,color:'#bc13fe',fontSize:'1.2rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{avatarCard.name}</div>
              <div className="mono" style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.3)',marginTop:'4px'}}>GTI {avatarCard.gti} // SP {avatarCard.sp??0}</div>
            </div>
          )}
          <div style={{marginBottom:'15px',padding:'12px',background:'rgba(0,0,0,0.4)',border:`1px solid ${hpColor}18`,borderLeft:`2px solid ${hpColor}`,flexShrink:0}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
              <span className="mono" style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.3)',letterSpacing:'2px'}}>HP</span>
              <span className="mono" style={{color:hpColor,fontWeight:700,fontSize:'1rem'}}>{currentHP}/{maxHP}</span>
            </div>
            <div style={{height:'6px',background:'rgba(255,255,255,0.05)',borderRadius:'3px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${hpPct}%`,background:hpColor,boxShadow:`0 0 5px ${hpColor}`,transition:'width 0.5s'}}/>
            </div>
          </div>

          {(roguelikeRun.augments && roguelikeRun.augments.length > 0) && (
            <div style={{ marginBottom: '15px', flexShrink: 0 }}>
               <div className="mono" style={{fontSize:'0.55rem', color:'rgba(255,255,255,0.5)', letterSpacing:'2px', marginBottom: '6px'}}>▸ ACTIVE BOOSTS & UPLINKS</div>
               <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                 {roguelikeRun.augments.map(mod => {
                    const isSyn = mod.type === 'synergy';
                    const c = isSyn ? '#bc13fe' : '#00e5ff';
                    const cRgb = isSyn ? '188,19,254' : '0,229,255';
                    
                    return (
                    <div key={mod.id} title={`${mod.name}: ${mod.desc}`} style={{
                      width: '30px', height: '30px', background: `rgba(${cRgb},0.1)`, border: `1px solid rgba(${cRgb},0.4)`,
                      borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                      fontSize: '1.1rem', cursor: 'help', boxShadow: `0 0 10px rgba(${cRgb},0.2)`, transition: '0.2s'
                    }} onMouseEnter={e => e.currentTarget.style.background = `rgba(${cRgb},0.3)`} onMouseLeave={e => e.currentTarget.style.background = `rgba(${cRgb},0.1)`}>
                      {mod.icon || (isSyn ? (getFactionIcon(mod.faction) || '🔗') : '📦')}
                    </div>
                  );
                 })}
               </div>
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', paddingRight: '5px' }}>
             <div>
                <div className="mono" style={{fontSize:'0.55rem', color:'var(--win)', letterSpacing:'2px', marginBottom: '6px', opacity: 0.6}}>▸ ACTIVE_STACK // AGENTS</div>
                {renderMiniChip(chars[0], 'deck', 'chars', 0, true)} 
                {Array.from({ length: Math.max(5, chars.length - 1) }).map((_, i) => (
                  renderMiniChip(chars[i+1], 'deck', 'chars', i+1)
                ))}
             </div>

             <div>
                <div className="mono" style={{fontSize:'0.55rem', color:'var(--eff-col)', letterSpacing:'2px', marginBottom: '6px', opacity: 0.6}}>▸ ACTIVE_STACK // TAKTIKEN</div>
                {Array.from({ length: Math.max(2, effs.length) }).map((_, i) => (
                  renderMiniChip(effs[i], 'deck', 'effs', i)
                ))}
             </div>

             <div style={{ marginTop: 'auto', paddingBottom: '20px' }}>
                {(() => {
                   const vaultExpansions = (roguelikeRun.augments || []).filter(a => a.type === 'vault_expander').length;
                   const vaultSize = 2 + vaultExpansions;
                   return (
                     <>
                        <div className="mono" style={{fontSize:'0.55rem', color:'rgba(255,255,255,0.4)', letterSpacing:'2px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between'}}>
                          <span>▸ ENCRYPTION_VAULT</span>
                          <span>{bank.length}/{vaultSize}</span>
                        </div>
                        {Array.from({ length: vaultSize }).map((_, i) => {
                          const bCard = bank[i];
                          const bType = bCard ? (bCard.type === 'effect' || bCard.buff !== undefined ? 'effs' : 'chars') : 'chars';
                          return renderMiniChip(bCard, 'bank', bType, i);
                        })}
                     </>
                   )
                })()}
             </div>

             {hoveredChipCard && (
               <div style={{
                 position: 'fixed', left: '270px', top: '50%', transform: 'translateY(-50%)',
                 zIndex: 5000, width: '300px', height: '420px',
                 animation: 'modalScaleIn 0.2s ease-out forwards', pointerEvents: 'none'
               }}>
                 <div style={{ transform: 'scale(0.833)', transformOrigin: 'top left', width: '360px', height: '504px', boxShadow: '0 0 50px rgba(0,0,0,0.9)' }}>
                    <Card card={hoveredChipCard} context="lexicon" />
                 </div>
                 <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(circle, rgba(0,229,255,0.15) 0%, transparent 70%)', zIndex: -1 }} />
               </div>
             )}
          </div>
        </div>

        <div className="rl-map-content" style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',padding:'14px 18px 12px',gap:'10px'}}>
          <div style={{position:'relative',flex:1,background:`radial-gradient(circle at 50% 50%, ${sectorFaction.color}0a 0%, rgba(4,2,10,0.9) 70%)`,backdropFilter:'blur(8px)',border:`1px solid ${sectorFaction.color}33`,display:'flex',flexDirection:'column',overflow:'visible',minHeight:0}}>
            <Corners color={sectorFaction.color} size={8}/>
            <div className="mono" style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.4)',letterSpacing:'4px',padding:'15px 25px 0',flexShrink:0}}>
              ▸ SEKTOR {sector} // NODE {node}/7 // {sectorFaction.name} NETZWERK
            </div>

            <div style={{flex:1,position:'relative',display:'block',overflow: isMobile ? 'auto' : 'visible'}}>
              {/* MOBILE OPTIMIZATION START: Vertikales Layout auf Mobile, Horizontales auf Desktop */}
              {isMobile ? (
                /* ── MOBILE VERTICAL MAP ── */
                <div style={{
                  display: 'flex', flexDirection: 'column-reverse',
                  alignItems: 'center', gap: '20px',
                  padding: '20px 10px', minHeight: '100%',
                  width: '100%',
                }}>
                  {layout.map((column, colIdx) => (
                    <div key={colIdx} style={{
                      display: 'flex', flexDirection: 'row',
                      justifyContent: 'center', gap: '16px',
                      width: '100%', position: 'relative', zIndex: 10,
                    }}>
                      {/* Horizontale Verbindungslinie zwischen Spalten (vertikaler Connector) */}
                      {colIdx < layout.length - 1 && (
                        <div style={{
                          position: 'absolute', top: '-10px', left: '50%',
                          transform: 'translateX(-50%)',
                          width: '2px', height: '20px',
                          background: pathHistory.includes(column[0]?.id)
                            ? 'var(--win)'
                            : `rgba(${sectorFaction.color.replace('#','').match(/.{2}/g)?.map(h=>parseInt(h,16)).join(',') || '0,229,255'},0.25)`,
                          zIndex: 1,
                        }} />
                      )}
                      {column.map((nodeObj, rowIdx) => (
                        <div key={nodeObj.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MapNode
                            nodeObj={nodeObj}
                            currentNode={node}
                            sector={sector}
                            onSelect={handleNodeSelect}
                            myVote={myVote}
                            partnerVotes={derivedPartnerVotes}
                            isCoop={isCoop}
                            pathHistory={pathHistory}
                            reachableIds={getReachableNodeIds()}
                            isMobile={isMobile}
                            onShowBottomSheet={handleShowBottomSheet}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                /* ── DESKTOP HORIZONTAL MAP (unverändert) ── */
                <>
                  <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0,overflow:'visible'}}>
                    <defs>
                      <marker id="rlDot" viewBox="0 0 4 4" refX="2" refY="2" markerWidth="4" markerHeight="4">
                        <circle cx="2" cy="2" r="1.5" fill="rgba(0,229,255,0.45)"/>
                      </marker>
                    </defs>
                    {(() => {
                      const lines = [];
                      const getPos = (colIdx, rowIdx, colLen) => {
                        let y = 50;
                        if (colLen === 2) y = rowIdx === 0 ? 30 : 70;
                        if (colLen === 3) y = rowIdx === 0 ? 20 : (rowIdx === 1 ? 50 : 80);
                        return { x: 8 + colIdx * 14, y };
                      };

                      for (let c = 0; c < layout.length - 1; c++) {
                        const currentCol = layout[c];
                        const nextCol = layout[c+1];

                        currentCol.forEach((nodeA, iA) => {
                          nextCol.forEach((nodeB, iB) => {
                            if (!isAdjacentConnection(iA, currentCol.length, iB, nextCol.length)) return;
                            const posA = getPos(c, iA, currentCol.length);
                            const posB = getPos(c + 1, iB, nextCol.length);
                            
                            const isTaken = pathHistory.includes(nodeA.id) && pathHistory.includes(nodeB.id);
                            let isPossible = false;
                            if (!isTaken) {
                                isPossible = pathHistory.includes(nodeA.id) && nodeB.step === node;
                                if (node === 1 && nodeA.step === 1 && nodeB.step === 2) isPossible = true;
                            }

                            let stroke = isTaken ? 'var(--win)' : isPossible ? 'rgba(0,229,255,0.4)' : 'rgba(255,0,127,0.05)';
                            let dash = isTaken ? 'none' : '9,7';
                            let width = isTaken ? 3 : (isPossible ? 2 : 1.5);
                            
                            lines.push(
                              <line 
                                key={`${nodeA.id}-${nodeB.id}`}
                                x1={`${posA.x}%`} y1={`${posA.y}%`} 
                                x2={`${posB.x}%`} y2={`${posB.y}%`}
                                stroke={stroke} strokeWidth={width} strokeDasharray={dash}
                                markerEnd=""
                                style={{ transition: 'stroke 0.5s, stroke-width 0.5s' }}
                              />
                            );
                          });
                        });
                      }
                      return lines;
                    })()}
                  </svg>

                  {layout.map((column, colIdx) => (
                    <div key={colIdx} style={{position:'absolute',left:`${8 + colIdx * 14}%`,top:0,bottom:0,width:'140px',transform:'translateX(-50%)',zIndex:10}}>
                      {column.map((nodeObj, rowIdx) => {
                        let yPos = 50;
                        if (column.length === 2) yPos = rowIdx === 0 ? 30 : 70;
                        if (column.length === 3) yPos = rowIdx === 0 ? 20 : (rowIdx === 1 ? 50 : 80);
                        return (
                          <div key={nodeObj.id} style={{position:'absolute',top:`${yPos}%`,left:'50%',transform:'translate(-50%, -50%)'}}>
                            <MapNode
                              nodeObj={nodeObj}
                              currentNode={node}
                              sector={sector}
                              onSelect={handleNodeSelect}
                              myVote={myVote}
                              partnerVotes={derivedPartnerVotes}
                              isCoop={isCoop}
                              pathHistory={pathHistory}
                              reachableIds={getReachableNodeIds()}
                              isMobile={isMobile}
                              onShowBottomSheet={handleShowBottomSheet}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
              {/* MOBILE OPTIMIZATION END */}
            </div>
          </div>

          <div style={{
            flexShrink:0, padding:'15px 25px',
            background:'rgba(5,0,12,0.8)', backdropFilter:'blur(8px)',
            border:'1px solid rgba(255,255,255,0.05)',
            borderLeft:`4px solid ${isCoop ? 'var(--ep)' : 'var(--apex-pink)'}`,
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:'20px',
          }}>
            <div className="mono" style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.22)',letterSpacing:'2px',whiteSpace:'nowrap',flexShrink:0}}>
              ▸ {isCoop ? 'CO-OP ABSTIMMUNG' : 'PFAD WÄHLEN'}
            </div>

           {isCoop ? (
              <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
                {/* ICH VOTE STATUS */}
                <div style={{ display:'flex',alignItems:'center',gap:'10px',padding:'8px 16px', background: myVote ? `rgba(0,229,255,0.1)` : 'transparent', border:`1px solid ${myVote ? 'var(--win)' : 'rgba(255,255,255,0.09)'}`, borderRadius:'4px',transition:'all 0.35s' }}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:myVote?'var(--win)':'rgba(255,255,255,0.15)',boxShadow:myVote?`0 0 10px var(--win)`:'none',transition:'all 0.35s',flexShrink:0}}/>
                  <span className="mono" style={{fontSize:'0.65rem',color:myVote?'var(--win)':'rgba(255,255,255,0.28)',letterSpacing:'1px',whiteSpace:'nowrap'}}>
                    ICH — {myVote ? 'VOTE ✓' : 'WARTE...'}
                  </span>
                </div>
                
                {/* PARTNER VOTES STATUS - Flex-Layout für 3-Spieler-Support */}
                {Array.from({ length: Math.max(0, squadSize - 1) }).map((_, i) => {
                  // Finde den Vote für diesen spezifischen Slot aus dem Ledger
                  const pVote = derivedPartnerVotes[i];
                  const vActive = !!pVote;
                  return (
                    <div key={`p-slot-${i}`} style={{ 
                      display:'flex', alignItems:'center', gap:'10px', padding:'6px 14px', 
                      background: vActive ? `rgba(188,19,254,0.1)` : 'rgba(255,255,255,0.02)', 
                      border:`1px solid ${vActive ? 'var(--ep)' : 'rgba(255,255,255,0.05)'}`, 
                      borderRadius:'4px', transition:'all 0.35s', minWidth: '140px' 
                    }}>
                      <div style={{
                        width:'6px', height:'6px', borderRadius:'50%', 
                        background: vActive ? 'var(--ep)' : 'rgba(255,255,255,0.1)', 
                        boxShadow: vActive ? `0 0 10px var(--ep)` : 'none', 
                        flexShrink:0 
                      }}/>
                      <span className="mono" style={{ fontSize:'0.6rem', color: vActive ? '#fff' : 'rgba(255,255,255,0.2)', letterSpacing:'1px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {vActive ? pVote.username.toUpperCase() : `WARTE AUF P${i+2}...`}
                      </span>
                    </div>
                  );
                })}

                  {myVote && derivedPartnerVotes.length === (squadSize - 1) && (
                  <div className="mono" style={{fontSize:'0.65rem',color:'var(--apex-pink)',letterSpacing:'2px',animation:'pulse 0.8s infinite'}}>
                    ▸ RESOLVING...
                  </div>
                )}
              </div>
            ) : (
              <div className="mono" style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.18)',letterSpacing:'1px'}}>
                {/* MOBILE OPTIMIZATION START */}
                {isMobile ? 'Tap auf aktiven Node für Details' : 'Hover für Details · Klick zum Eintreten'}
                {/* MOBILE OPTIMIZATION END */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE OPTIMIZATION START: Node-Info Bottom-Sheet (Mobile-only, ersetzt Hover-Tooltip) */}
      {isMobile && bottomSheetNode && (() => {
        const bInfo = NODE_TYPES[bottomSheetNode.type];
        const bIsEvent = bInfo.type === 'event';
        const bEvData = bIsEvent ? EVENT_DETAILS[bottomSheetNode.type] : null;
        const n = bottomSheetNode.step;
        const isBoss = bottomSheetNode.type === 'boss';
        const isElite = bottomSheetNode.type === 'elite';
        let diff = 1;
        if (node === 1 || sector === 1) diff = isBoss ? 3 : isElite ? 2 : 1;
        else if (sector === 2) diff = isBoss ? 3 : isElite ? 3 : 2;
        else if (sector === 3) diff = isBoss ? 4 : isElite ? 4 : 3;
        else diff = 4;
        const threatName = ['','TRAINEE','OPERATIVE','EXECUTIVE','ARCHITECT'][diff];
        return (
          <>
            <div
              onClick={() => setBottomSheetNode(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9900 }}
            />
            <div style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9901,
              background: 'rgba(4,2,14,0.99)',
              borderTop: `2px solid ${bInfo.color}`,
              borderRadius: '16px 16px 0 0',
              padding: '20px 20px 32px',
              animation: 'mobileSheetIn 0.22s cubic-bezier(0.175,0.885,0.32,1.275)',
              maxHeight: '55vh', overflowY: 'auto',
            }}>
              {/* Handle Bar */}
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 16px' }} />
              {/* Node Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 900, fontSize: '1.5rem', color: bInfo.color, letterSpacing: '2px', textShadow: `0 0 12px ${bInfo.glow}` }}>
                  {bInfo.icon} {bInfo.label}
                </div>
                <div className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>N{n}/7</div>
              </div>
              <div className="mono" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '14px', letterSpacing: '1px', lineHeight: 1.5 }}>
                {bottomSheetNode.target}
              </div>
              {bIsEvent && bEvData ? (
                <>
                  <div style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: 1.45, marginBottom: '14px' }}>{bEvData.desc}</div>
                  <div style={{ padding: '10px 14px', background: `${bInfo.color}14`, borderLeft: `2px solid ${bInfo.color}`, display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                    <span className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>EFFEKT:</span>
                    <span className="mono" style={{ fontSize: '0.85rem', color: bInfo.color, fontWeight: 700 }}>{bEvData.reward}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                  {[['THREAT', threatName], ['NODE', `${n}/7`]].map(([l, v]) => (
                    <div key={l} style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="mono" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.22)', letterSpacing: '1px' }}>{l}</div>
                      <div className="mono" style={{ fontSize: '0.85rem', color: bInfo.color, fontWeight: 700, marginTop: '4px' }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* Confirm Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setBottomSheetNode(null)}
                  style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #444', color: '#888', fontFamily: "'Roboto Mono',monospace", fontSize: '0.8rem', cursor: 'pointer', borderRadius: '6px' }}
                >
                  ABBRECHEN
                </button>
                <button
                  onClick={handleBottomSheetConfirm}
                  style={{ flex: 2, padding: '14px', background: `${bInfo.color}22`, border: `2px solid ${bInfo.color}`, color: bInfo.color, fontFamily: "'Roboto Mono',monospace", fontSize: '0.85rem', fontWeight: 900, letterSpacing: '2px', cursor: 'pointer', borderRadius: '6px', textShadow: `0 0 10px ${bInfo.color}` }}
                >
                  EINTRETEN ▸
                </button>
              </div>
            </div>
          </>
        );
      })()}
      {/* MOBILE OPTIMIZATION END */}

      {selectedNodeObj !== null && (
        <NodeModal 
          baseHp={baseHp}
          nodeObj={selectedNodeObj} 
          sector={sector} 
          currentNode={node} 
          onClose={()=>{
             setSelectedNodeObj(null);
             setMyNodeReady(false);
          }} 
          onStartBattle={(nodeObj, deckData) => {
             if (!isCoop) {
                 const newPath = [...new Set([...pathHistory, nodeObj.id])];
                 setPathHistory(newPath);
                 localStorage.setItem('aoc_path_' + roguelikeRun.seed, JSON.stringify(newPath));
             }
             onStartBattle(nodeObj, deckData);
          }}
          onStartEvent={(nodeObj) => {
             if (!isCoop) {
                 const newPath = [...new Set([...pathHistory, nodeObj.id])];
                 setPathHistory(newPath);
                 localStorage.setItem('aoc_path_' + roguelikeRun.seed, JSON.stringify(newPath));
             }
             onStartEvent(nodeObj);
          }}
          onInstantHeal={(amount) => {
             if (!isCoop) {
                 const newPath = [...new Set([...pathHistory, selectedNodeObj.id])];
                 setPathHistory(newPath);
                 localStorage.setItem('aoc_path_' + roguelikeRun.seed, JSON.stringify(newPath));
             }
             if (onInstantHeal) onInstantHeal(amount);
          }}
          isCoop={isCoop} 
          myNodeReady={myNodeReady}
          partnerNodeReady={partnerNodeReadies === (squadSize - 1)}
          runDeck={runDeck}
          onReadyClick={() => {
             setMyNodeReady(true);
             if (isCoop) {
               const safeUsername = username && username !== 'AGENT' ? username : `Player_${Math.floor(Math.random()*1000)}`;
               const msg = { type: 'NODE_READY', username: safeUsername, epoch: voteEpoch };
               if (broadcast) broadcast(msg);
               else if (conn) conn.send(msg);
             }
          }}
          credits={credits}
          onSpendCredits={onSpendCredits}
          partnerFunding={partnerFunding}
          conn={conn}
          sectorFaction={sectorFaction}
        />
      )}
    </div>
  );
}
