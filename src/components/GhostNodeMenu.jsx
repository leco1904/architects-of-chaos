import React, { useState, useRef, useEffect } from 'react';
import Card from './Card';

// ── Helpers ───────────────────────────────────────────────────────────────
const spCost  = v => v < 70 ? 1 : v < 85 ? 2 : 3;
const STAT_KEYS = ['tech','finance','manipulation','erosion','kingmaking','system','arsenal','legitimacy'];
const calcGTI = s => Math.round(STAT_KEYS.reduce((a,k) => a+(s[k]||0), 0) / STAT_KEYS.length) + ((s.level||1)-1)*5;

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

// ── Hub button ────────────────────────────────────────────────────────────
function HubButton({ icon, title, sub, color='var(--win)', locked, onClick, active }) {
  return (
    <button onClick={locked?undefined:onClick} disabled={locked}
      style={{width:'100%',padding:'14px 18px',background:active?`${color}12`:locked?'rgba(0,0,0,0.2)':`${color}08`,border:`1px solid ${locked?'#2a3a4a':active?color:`${color}55`}`,borderLeft:`3px solid ${locked?'#2a3a4a':color}`,color:locked?'#3a4a5a':color,textAlign:'left',cursor:locked?'not-allowed':'pointer',transition:'all 0.2s',boxShadow:active?`0 0 20px ${color}22`:'none'}}
      onMouseEnter={e=>{if(!locked)e.currentTarget.style.background=`${color}14`;}}
      onMouseLeave={e=>{if(!locked)e.currentTarget.style.background=active?`${color}12`:`${color}08`;}}>
      <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
        <div style={{fontSize:'1.1rem',flexShrink:0}}>{locked?'🔒':icon}</div>
        <div>
          <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'0.95rem',letterSpacing:'3px'}}>{title}</div>
          <div className="mono" style={{fontSize:'0.52rem',letterSpacing:'1px',color:locked?'#3a4a5a':`${color}99`,marginTop:'2px'}}>{sub}</div>
        </div>
        {!locked&&<div style={{marginLeft:'auto',fontSize:'0.8rem',opacity:0.5}}>▸</div>}
      </div>
    </button>
  );
}

// ── Upgrade controls (display only — state lives in parent) ───────────────
function UpgradeControls({ working, committedRef, onUpgrade, onSave, onReset }) {
  if (!working) return null;
  const hasPending = STAT_KEYS.some(k => working[k] !== committedRef.current?.[k]) || working.sp !== committedRef.current?.sp;
  const LABELS = {tech:'⎔ Tech',finance:'🔗 Finanz',manipulation:'👁 Manip',erosion:'≈ Erosion',kingmaking:'♔ Schatten',system:'⚠ System',arsenal:'✇ Arsenal',legitimacy:'🛡 Legit'};

  return (
    <div style={{padding:'12px 14px',background:'rgba(188,19,254,0.04)',border:'1px solid rgba(188,19,254,0.18)',borderLeft:'3px solid #bc13fe',marginTop:'8px'}}>
      {/* SP + actions */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.25)',letterSpacing:'2px'}}>SP</span>
          <span className="mono" style={{fontSize:'1.1rem',fontWeight:900,color:'#bc13fe',textShadow:'0 0 8px #bc13fe'}}>{working.sp??0}</span>
        </div>
        <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
          <span className="mono" style={{fontSize:'0.42rem',color:'rgba(255,255,255,0.14)',letterSpacing:'1px'}}>&lt;70=1SP · 70–84=2SP · 85+=3SP</span>
          {hasPending&&<>
            <button onClick={onReset} style={{padding:'3px 8px',background:'transparent',border:'1px solid var(--lose)',color:'var(--lose)',fontFamily:"'Roboto Mono',monospace",fontSize:'0.5rem',cursor:'pointer',letterSpacing:'2px'}}>↺</button>
            <button onClick={onSave} style={{padding:'3px 8px',background:'rgba(188,19,254,0.1)',border:'1px solid #bc13fe',color:'#bc13fe',fontFamily:"'Roboto Mono',monospace",fontSize:'0.5rem',cursor:'pointer',letterSpacing:'2px'}}>▸ SAVE</button>
          </>}
          {!hasPending&&<span className="mono" style={{fontSize:'0.44rem',color:'rgba(0,229,255,0.35)',letterSpacing:'2px'}}>✓ SYNC</span>}
        </div>
      </div>
      {/* Hint */}
      <div className="mono" style={{fontSize:'0.48rem',color:'rgba(188,19,254,0.45)',letterSpacing:'2px',marginBottom:'8px',textAlign:'center'}}>▸ STAT AUF DER KARTE ANKLICKEN ZUM UPGRADEN</div>
      {/* Stat grid for reference */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'3px'}}>
        {STAT_KEYS.map(k=>{
          const val  = working[k]||0;
          const cost = spCost(val);
          const can  = (working.sp||0) >= cost;
          const dirty= val !== (committedRef.current?.[k]||0);
          return (
            <div key={k} onClick={()=>onUpgrade(k)}
              style={{padding:'5px 3px',background:dirty?'rgba(188,19,254,0.06)':'rgba(0,0,0,0.3)',border:`1px solid ${dirty?'rgba(188,19,254,0.35)':can?'rgba(188,19,254,0.12)':'rgba(255,255,255,0.03)'}`,cursor:can?'pointer':'not-allowed',textAlign:'center',transition:'all 0.15s'}}>
              <div style={{fontSize:'0.44rem',color:'rgba(255,255,255,0.3)',marginBottom:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{LABELS[k]}</div>
              <div className="mono" style={{fontSize:'0.75rem',fontWeight:700,color:dirty?'#bc13fe':can?'rgba(188,19,254,0.6)':'#444'}}>{val}</div>
              {can&&<div className="mono" style={{fontSize:'0.38rem',color:'rgba(188,19,254,0.4)',marginTop:'1px'}}>{cost}SP</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function GhostNodeMenu({ avatarCard, roguelikeRun, updateAvatar, onGoToLab, onGoToSquad, onGoToMap, onBack }) {
  const hasRun = !!roguelikeRun;

  // --- Upgrade state lives HERE so Card can receive onStatClick ---
  const committedRef = useRef(null);
  const [working, setWorking] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (avatarCard && !committedRef.current) {
      committedRef.current = { ...avatarCard };
      setWorking({ ...avatarCard });
    }
  }, [avatarCard]);

  // Sync if avatarCard is externally updated (e.g. after a run reward)
  useEffect(() => {
    if (avatarCard && committedRef.current && avatarCard.sp !== committedRef.current.sp) {
      committedRef.current = { ...avatarCard };
      setWorking({ ...avatarCard });
    }
  }, [avatarCard?.sp]);

  // Bug 1 fix: handleUpgrade passed as onStatClick to <Card>
  const handleUpgrade = (stat) => {
    if (!working || !showUpgrade) return;
    const cost = spCost(working[stat]||0);
    if ((working.sp||0) < cost) return;
    const u = { ...working, [stat]:(working[stat]||0)+2, sp:(working.sp||0)-cost };
    u.gti = calcGTI(u);
    setWorking(u);
    
    // NEU: Automatischer Cloud-Sync bei jedem Klick
    if (updateAvatar) {
      updateAvatar(u);
      committedRef.current = { ...u };
    }
  };

  const handleSave = () => {
    if (!working || !updateAvatar) return;
    updateAvatar(working);
    committedRef.current = { ...working };
  };

  const handleReset = () => {
    if (committedRef.current) setWorking({ ...committedRef.current });
  };

  // Show `working` values on the card while upgrading
  const displayCard = (showUpgrade && working) ? working : avatarCard;

  return (
    <div className="screen active" style={{display:'block',padding:'0',position:'relative',overflow:'hidden'}}>
      <div className="rl-bg-layer-1"/><div className="rl-bg-layer-2"/><div className="rl-scanline-overlay"/>
      {[0,1,2,3,4,5,6,7].map(i=>(
        <div key={i} className="binary-rain-col" style={{left:`${5+i*12}%`,'--dur':`${9+i*1.3}s`,'--delay':`${i*0.7}s`}}>
          {Array.from({length:16},()=>Math.random()>.5?'1':'0').join('\n')}
        </div>
      ))}

      <div style={{position:'relative',zIndex:2,padding:'24px 28px',minHeight:'100vh'}}>
        {/* Header */}
        <div className="top-bar" style={{marginBottom:'28px'}}>
          <div>
            <GlitchTitle text="GHOST NODE"/>
            <div className="mono" style={{fontSize:'0.6rem',color:'rgba(188,19,254,0.5)',letterSpacing:'4px',marginTop:'4px'}}>
              OPERATION: GHOST NODE // MANAGEMENT TERMINAL
            </div>
          </div>
          <button className="btn-back" onClick={onBack}>ZURÜCK</button>
        </div>

        {/* Wir nutzen die CSS-Klasse aus der index.css für sauberes Mobile-Stacking */}
        <div className="gn-main-layout">

          {/* Left: Avatar card + upgrade controls */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px',flexShrink:0}}>
            {displayCard ? (
              <>
                {/* Bug 1 fix: onStatClick={handleUpgrade} only active when showUpgrade */}
                <div className="gn-card-wrapper" style={{
                  filter:'drop-shadow(0 0 24px rgba(188,19,254,0.45))',
                  position: 'relative', 
                  zIndex: 50, 
                  pointerEvents: 'auto'
                }}>
                  <Card
                    card={displayCard}
                    context="deck"
                    onStatClick={showUpgrade ? handleUpgrade : undefined}
                  />
                </div>

                {/* Stats / SP summary */}
                <div style={{padding:'10px 16px',width:'100%',boxSizing:'border-box',background:'rgba(5,0,12,0.8)',backdropFilter:'blur(8px)',border:'1px solid rgba(188,19,254,0.2)',borderLeft:'3px solid #bc13fe'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                    <div>
                      <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.28)'}}>SKILL POINTS</div>
                      <div className="mono" style={{color:'#bc13fe',fontWeight:900,fontSize:'1.2rem',textShadow:'0 0 12px #bc13fe'}}>{(working||avatarCard)?.sp ?? 0}</div>
                    </div>
                    <div>
                      <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.28)'}}>RATING (GTI)</div>
                      <div className="mono" style={{color:'var(--ep)',fontWeight:900,fontSize:'1.2rem'}}>{(working||avatarCard)?.gti ?? 50}</div>
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

                {/* Inline upgrade controls */}
                {showUpgrade && updateAvatar && (
                  <div style={{width:'100%'}}>
                    <UpgradeControls
                      working={working}
                      committedRef={committedRef}
                      onUpgrade={handleUpgrade}
                      onSave={handleSave}
                      onReset={handleReset}
                    />
                  </div>
                )}
              </>
            ) : (
              <div style={{width:'200px',height:'280px',background:'rgba(188,19,254,0.03)',border:'2px dashed rgba(188,19,254,0.2)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'12px'}}>
                <div style={{fontSize:'2.5rem',opacity:0.3}}>⬡</div>
                <div className="mono" style={{fontSize:'0.6rem',color:'rgba(188,19,254,0.4)',letterSpacing:'3px',textAlign:'center'}}>KEIN AGENT<br/>INITIALISIERT</div>
              </div>
            )}
          </div>

          {/* Right: Operations */}
          <div style={{flex:1,minWidth:'280px',maxWidth:'400px',display:'flex',flexDirection:'column',gap:'10px'}}>
            <div className="mono" style={{fontSize:'0.56rem',color:'rgba(255,255,255,0.22)',letterSpacing:'3px',marginBottom:'4px'}}>▸ OPERATIONS</div>

            {/* Upgrade toggle */}
            {avatarCard && updateAvatar && (
              <HubButton
                icon="⬡" color="#bc13fe"
                title="NEURAL NETWORK UPGRADEN"
                sub={showUpgrade ? 'Stats anklicken → SP investieren · Schließen zum Deaktivieren' : `SP: ${(working||avatarCard)?.sp??0} — Stat auf Karte anklicken`}
                active={showUpgrade}
                onClick={() => setShowUpgrade(p => !p)}
              />
            )}
            {!avatarCard && (
              <HubButton icon="⬡" color="#bc13fe" title="AVATAR LABOR" sub="Agent erstellen & konfigurieren" onClick={onGoToLab}/>
            )}

            <div style={{height:'1px',background:'rgba(255,255,255,0.06)',margin:'2px 0'}}/>

            {hasRun ? (
              <HubButton icon="▶" color="var(--apex-pink)" title="RUN FORTSETZEN"
                sub={`Sektor ${roguelikeRun.sector} // Node ${roguelikeRun.node} // HP ${roguelikeRun.currentHP}/${roguelikeRun.maxHP}`}
                active onClick={onGoToMap}/>
            ) : (
              <HubButton icon="⬡" color="var(--apex-pink)" title="RUN STARTEN"
                sub={avatarCard?'Squad wählen — Mission initialisieren':'AVATAR ERFORDERLICH'}
                locked={!avatarCard} onClick={onGoToSquad}/>
            )}
            {hasRun && (
              <HubButton icon="✕" color="var(--lose)" title="RUN ABBRECHEN" sub="Permadeath — Run löschen, Avatar bleibt"
                onClick={()=>{if(window.confirm('Run wirklich abbrechen? Permadeath.'))window.dispatchEvent(new CustomEvent('abortRun'));}}/>
            )}

            <div style={{marginTop:'8px',padding:'12px 14px',background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)',border:'1px solid rgba(255,255,255,0.04)',borderLeft:'3px solid rgba(188,19,254,0.2)'}}>
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