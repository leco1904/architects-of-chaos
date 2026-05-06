import React, { useState, useRef } from 'react';
import Card from './Card';

// ── SP cost helper ────────────────────────────────────────────────────────
const spCost  = v => v < 70 ? 1 : v < 85 ? 2 : 3;
const STAT_KEYS = ['tech','finance','manipulation','erosion','kingmaking','system','arsenal','legitimacy'];
const STAT_LABELS = {
  tech:'⎔ Tech',finance:'🔗 Finanz',manipulation:'👁 Manip',erosion:'≈ Erosion',
  kingmaking:'♔ Schatten',system:'⚠ System',arsenal:'✇ Arsenal',legitimacy:'🛡 Legit',
};
const calcGTI = s => Math.round(STAT_KEYS.reduce((a,k)=>a+(s[k]||0),0)/STAT_KEYS.length)+((s.level||1)-1)*5;

// ── Glitch title ──────────────────────────────────────────────────────────
function GlitchTitle({ text }) {
  return (
    <>
      <style>{`
        @keyframes gnGlitch {
          0%,92%{transform:translate(0);clip-path:none;}
          93%{transform:translate(-3px,0);clip-path:polygon(0 20%,100% 20%,100% 40%,0 40%);}
          95%{transform:translate(3px,0);clip-path:polygon(0 60%,100% 60%,100% 80%,0 80%);}
          97%{transform:translate(-2px,0);clip-path:polygon(0 10%,100% 10%,100% 30%,0 30%);}
          100%{transform:translate(0);clip-path:none;}
        }
        @keyframes gnScan{0%,100%{transform:translateY(-100%);opacity:0;}50%{opacity:0.6;}100%{transform:translateY(300%);opacity:0;}}
        .gn-scanbeam{position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,rgba(188,19,254,0.4),transparent);animation:gnScan 4s ease-in-out infinite;pointer-events:none;}
      `}</style>
      <div style={{position:'relative',overflow:'hidden',display:'inline-block'}}>
        <div className="gn-scanbeam"/>
        <div style={{fontFamily:"'Rajdhani',sans-serif",fontSize:'clamp(2rem,5vw,3.2rem)',fontWeight:900,letterSpacing:'8px',color:'#fff',textShadow:'0 0 30px #bc13fe, 0 0 60px rgba(188,19,254,0.3)',animation:'gnGlitch 7s infinite'}}>{text}</div>
      </div>
    </>
  );
}

// ── Hub action button ─────────────────────────────────────────────────────
function HubButton({ icon, title, sub, color='var(--win)', locked, onClick, active }) {
  return (
    <button onClick={locked?undefined:onClick} disabled={locked}
      style={{width:'100%',padding:'14px 18px',background:active?`${color}12`:locked?'rgba(0,0,0,0.2)':`${color}08`,border:`1px solid ${locked?'#2a3a4a':active?color:`${color}55`}`,borderLeft:`3px solid ${locked?'#2a3a4a':color}`,color:locked?'#3a4a5a':color,textAlign:'left',cursor:locked?'not-allowed':'pointer',transition:'all 0.2s',boxShadow:active?`0 0 20px ${color}22`:'none',position:'relative',overflow:'hidden'}}
      onMouseEnter={e=>{if(!locked)e.currentTarget.style.background=`${color}14`;}}
      onMouseLeave={e=>{if(!locked)e.currentTarget.style.background=active?`${color}12`:`${color}08`;}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <div style={{fontSize:'1.2rem',flexShrink:0}}>{locked?'🔒':icon}</div>
        <div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'1rem',letterSpacing:'3px'}}>{title}</div>
          <div className="mono" style={{fontSize:'0.55rem',letterSpacing:'1px',color:locked?'#3a4a5a':`${color}99`,marginTop:'2px'}}>{sub}</div>
        </div>
        {!locked && <div style={{marginLeft:'auto',fontSize:'0.8rem',opacity:0.5}}>▸</div>}
      </div>
    </button>
  );
}

// ── Inline stat upgrade panel (#013) ─────────────────────────────────────
function UpgradePanel({ avatarCard, updateAvatar }) {
  const committedRef = useRef({ ...avatarCard });
  const [working, setWorking]   = useState({ ...avatarCard });
  const [flash,   setFlash]     = useState(null);

  const hasPending = STAT_KEYS.some(k => working[k] !== committedRef.current[k]) || working.sp !== committedRef.current.sp;

  const handleUpgrade = (stat) => {
    const cost = spCost(working[stat]||0);
    if ((working.sp||0) < cost) return;
    const u = { ...working, [stat]:(working[stat]||0)+2, sp:(working.sp||0)-cost };
    u.gti = calcGTI(u);
    setWorking(u);
    setFlash(stat); setTimeout(()=>setFlash(null), 600);
  };

  const handleSave = () => {
    updateAvatar(working);
    committedRef.current = { ...working };
  };

  const handleReset = () => { setWorking({ ...committedRef.current }); };

  return (
    <div style={{padding:'12px 14px',background:'rgba(188,19,254,0.04)',border:'1px solid rgba(188,19,254,0.18)',borderLeft:'3px solid #bc13fe',marginTop:'8px'}}>
      {/* SP header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
        <div className="mono" style={{fontSize:'0.5rem',color:'rgba(255,255,255,0.25)',letterSpacing:'2px'}}>▸ NEURAL NETWORK UPGRADE</div>
        <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
          <div style={{background:'rgba(188,19,254,0.1)',border:'1px solid rgba(188,19,254,0.3)',padding:'3px 10px',display:'flex',gap:'5px',alignItems:'center'}}>
            <span className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.3)'}}>SP</span>
            <span className="mono" style={{fontSize:'0.95rem',fontWeight:900,color:'#bc13fe',textShadow:'0 0 8px #bc13fe'}}>{working.sp??0}</span>
          </div>
          {hasPending && (
            <>
              <button onClick={handleReset} style={{padding:'3px 8px',background:'transparent',border:'1px solid var(--lose)',color:'var(--lose)',fontFamily:"'Roboto Mono',monospace",fontSize:'0.5rem',cursor:'pointer',letterSpacing:'2px'}}>↺ RESET</button>
              <button onClick={handleSave} style={{padding:'3px 8px',background:'rgba(188,19,254,0.1)',border:'1px solid #bc13fe',color:'#bc13fe',fontFamily:"'Roboto Mono',monospace",fontSize:'0.5rem',cursor:'pointer',letterSpacing:'2px'}}>▸ SAVE</button>
            </>
          )}
          {!hasPending && <span className="mono" style={{fontSize:'0.46rem',color:'rgba(0,229,255,0.4)',letterSpacing:'2px'}}>✓ GESPEICHERT</span>}
        </div>
      </div>
      {/* Stat grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'4px'}}>
        {STAT_KEYS.map(k=>{
          const val  = working[k]||0;
          const cost = spCost(val);
          const can  = (working.sp||0) >= cost;
          const dirty= val !== (committedRef.current[k]||0);
          return (
            <button key={k} onClick={()=>handleUpgrade(k)} disabled={!can}
              style={{padding:'6px 4px',background:flash===k?`rgba(188,19,254,0.2)`:dirty?'rgba(188,19,254,0.06)':'rgba(0,0,0,0.3)',border:`1px solid ${dirty?'rgba(188,19,254,0.4)':can?'rgba(188,19,254,0.15)':'rgba(255,255,255,0.04)'}`,color:can?'#fff':'#444',cursor:can?'pointer':'not-allowed',transition:'all 0.15s',textAlign:'center'}}>
              <div style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.35)',marginBottom:'2px',letterSpacing:'1px',whiteSpace:'nowrap',overflow:'hidden'}}>{STAT_LABELS[k]}</div>
              <div className="mono" style={{fontSize:'0.82rem',fontWeight:700,color:dirty?'#bc13fe':can?'rgba(188,19,254,0.7)':'#555'}}>{val}</div>
              {can && <div className="mono" style={{fontSize:'0.4rem',color:'rgba(188,19,254,0.5)',marginTop:'1px'}}>{cost}SP</div>}
            </button>
          );
        })}
      </div>
      <div className="mono" style={{fontSize:'0.44rem',color:'rgba(255,255,255,0.15)',marginTop:'6px',textAlign:'right',letterSpacing:'1px'}}>GTI: {working.gti??0} · &lt;70=1SP · 70–84=2SP · 85+=3SP</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function GhostNodeMenu({ avatarCard, roguelikeRun, updateAvatar, onGoToLab, onGoToSquad, onGoToMap, onBack }) {
  const hasRun   = !!roguelikeRun;
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <div className="screen active" style={{display:'block',padding:'0',position:'relative',overflow:'hidden'}}>
      <div className="rl-bg-layer-1"/><div className="rl-bg-layer-2"/><div className="rl-scanline-overlay"/>
      {[0,1,2,3,4,5,6,7].map(i=>(
        <div key={i} className="binary-rain-col" style={{left:`${5+i*12}%`,'--dur':`${9+i*1.3}s`,'--delay':`${i*0.7}s`}}>
          {Array.from({length:16},()=>Math.random()>.5?'1':'0').join('\n')}
        </div>
      ))}
      <div style={{position:'relative',zIndex:2,padding:'24px 28px',minHeight:'100vh'}}>
        <div className="top-bar" style={{marginBottom:'28px'}}>
          <div>
            <GlitchTitle text="GHOST NODE"/>
            <div className="mono" style={{fontSize:'0.6rem',color:'rgba(188,19,254,0.5)',letterSpacing:'4px',marginTop:'4px'}}>OPERATION: GHOST NODE // MANAGEMENT TERMINAL</div>
          </div>
          <button className="btn-back" onClick={onBack}>ZURÜCK</button>
        </div>
        <div style={{display:'flex',gap:'32px',alignItems:'flex-start',flexWrap:'wrap',justifyContent:'center'}}>
          {/* Left: Avatar */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'14px',flexShrink:0}}>
            {avatarCard ? (
              <>
                <div style={{filter:'drop-shadow(0 0 24px rgba(188,19,254,0.45))'}}>
                  <Card card={avatarCard} context="deck"/>
                </div>
                <div style={{padding:'10px 16px',width:'100%',boxSizing:'border-box',background:'rgba(5,0,12,0.8)',backdropFilter:'blur(8px)',border:'1px solid rgba(188,19,254,0.2)',borderLeft:'3px solid #bc13fe'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                    <div>
                      <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.28)'}}>SKILL POINTS</div>
                      <div className="mono" style={{color:'#bc13fe',fontWeight:900,fontSize:'1.2rem',textShadow:'0 0 12px #bc13fe'}}>{avatarCard.sp??0}</div>
                    </div>
                    <div>
                      <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.28)'}}>RATING (GTI)</div>
                      <div className="mono" style={{color:'var(--ep)',fontWeight:900,fontSize:'1.2rem'}}>{avatarCard.gti??50}</div>
                    </div>
                  </div>
                  {hasRun && (
                    <div style={{marginTop:'8px',paddingTop:'8px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                      <div className="mono" style={{fontSize:'0.48rem',color:'var(--apex-pink)',letterSpacing:'2px',marginBottom:'3px'}}>▸ AKTIVER RUN</div>
                      <div className="mono" style={{fontSize:'0.62rem',color:'#fff'}}>SEKTOR {roguelikeRun.sector} // NODE {roguelikeRun.node}</div>
                      <div className="mono" style={{fontSize:'0.55rem',color:'var(--win)',marginTop:'2px'}}>HP: {roguelikeRun.currentHP} / {roguelikeRun.maxHP}</div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{width:'200px',height:'280px',background:'rgba(188,19,254,0.03)',border:'2px dashed rgba(188,19,254,0.2)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'12px'}}>
                <div style={{fontSize:'2.5rem',opacity:0.3}}>⬡</div>
                <div className="mono" style={{fontSize:'0.6rem',color:'rgba(188,19,254,0.4)',letterSpacing:'3px',textAlign:'center'}}>KEIN AGENT<br/>INITIALISIERT</div>
              </div>
            )}
          </div>

          {/* Right: Operations */}
          <div style={{flex:1,minWidth:'280px',maxWidth:'440px',display:'flex',flexDirection:'column',gap:'8px'}}>
            <div className="mono" style={{fontSize:'0.56rem',color:'rgba(255,255,255,0.22)',letterSpacing:'3px',marginBottom:'2px'}}>▸ OPERATIONS</div>

            {/* #013: Inline upgrade toggle button */}
            {avatarCard && updateAvatar && (
              <HubButton icon="⬡" color="#bc13fe"
                title="NEURAL NETWORK UPGRADEN"
                sub={showUpgrade ? 'Klicken zum Schließen' : `SP: ${avatarCard.sp??0} — Stats direkt upgraden`}
                active={showUpgrade}
                onClick={() => setShowUpgrade(p=>!p)}
              />
            )}
            {!avatarCard && (
              <HubButton icon="⬡" color="#bc13fe" title="AVATAR LABOR" sub="Agent erstellen & konfigurieren" onClick={onGoToLab}/>
            )}

            {/* Inline upgrade panel */}
            {showUpgrade && avatarCard && updateAvatar && (
              <UpgradePanel avatarCard={avatarCard} updateAvatar={updateAvatar}/>
            )}

            <div style={{height:'1px',background:'rgba(255,255,255,0.06)',margin:'2px 0'}}/>

            {hasRun ? (
              <HubButton icon="▶" color="var(--apex-pink)" title="RUN FORTSETZEN" sub={`Sektor ${roguelikeRun.sector} // Node ${roguelikeRun.node} // HP ${roguelikeRun.currentHP}/${roguelikeRun.maxHP}`} active onClick={onGoToMap}/>
            ) : (
              <HubButton icon="⬡" color="var(--apex-pink)" title="RUN STARTEN" sub={avatarCard?'Squad wählen — Mission initialisieren':'AVATAR ERFORDERLICH'} locked={!avatarCard} onClick={onGoToSquad}/>
            )}
            {hasRun && (
              <HubButton icon="✕" color="var(--lose)" title="RUN ABBRECHEN" sub="Permadeath — Run löschen, Avatar bleibt"
                onClick={()=>{ if(window.confirm('Run wirklich abbrechen? Permadeath.')) window.dispatchEvent(new CustomEvent('abortRun')); }}/>
            )}

            <div style={{marginTop:'6px',padding:'12px 14px',background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)',border:'1px solid rgba(255,255,255,0.04)',borderLeft:'3px solid rgba(188,19,254,0.2)'}}>
              <div className="mono" style={{fontSize:'0.52rem',color:'rgba(255,255,255,0.2)',letterSpacing:'2px',lineHeight:'1.9'}}>
                ▸ PERMADEATH: Run endet bei Niederlage<br/>
                ▸ Avatar bleibt erhalten — SP-Upgrades permanent<br/>
                ▸ Sieg: +1 SP (Boss: +3 SP)<br/>
                ▸ Deck: Avatar + 5 Chars + 2 Effekte
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}