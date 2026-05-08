import React from 'react';
import Card from './Card';

// ── Helpers ───────────────────────────────────────────────────────────────
const STAT_KEYS = ['tech','finance','manipulation','erosion','kingmaking','system','arsenal','legitimacy'];

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

// ── Main Component ────────────────────────────────────────────────────────
export default function GhostNodeMenu({ avatarCard, roguelikeRun, allRuns = {}, onGoToLab, onGoToSquad, onGoToMap, onBack, friends = [], onInviteDirect, onDeleteCoop }) {
  const hasRun = !!roguelikeRun;
  const [showInviteList, setShowInviteList] = React.useState(false); // NEU: Toggle für die Liste

  return (
    <div className="screen active" style={{display:'block',padding:'0',position:'relative',overflow:'hidden'}}>
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

        <div className="gn-main-layout">
          {/* Left: Avatar card (Display Only) */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px',flexShrink:0}}>
            {avatarCard ? (
              <>
                <div className="gn-card-wrapper" style={{
                  filter:'drop-shadow(0 0 24px rgba(188,19,254,0.45))',
                  position: 'relative', 
                  zIndex: 50
                }}>
                  <Card card={avatarCard} context="deck" />
                </div>

                {/* Stats / SP summary */}
                <div style={{padding:'10px 16px',width:'100%',boxSizing:'border-box',background:'rgba(5,0,12,0.8)',backdropFilter:'blur(8px)',border:'1px solid rgba(188,19,254,0.2)',borderLeft:'3px solid #bc13fe'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                    <div>
                      <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.28)'}}>SKILL POINTS</div>
                      <div className="mono" style={{color:'#bc13fe',fontWeight:900,fontSize:'1.2rem',textShadow:'0 0 12px #bc13fe'}}>{avatarCard.sp ?? 0}</div>
                    </div>
                    <div>
                      <div className="mono" style={{fontSize:'0.48rem',color:'rgba(255,255,255,0.28)'}}>RATING (GTI)</div>
                      <div className="mono" style={{color:'var(--ep)',fontWeight:900,fontSize:'1.2rem'}}>{avatarCard.gti ?? 50}</div>
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
          <div style={{flex:1,minWidth:'280px',maxWidth:'400px',display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'4px' }}>
                <div className="mono" style={{fontSize:'0.56rem',color:'rgba(255,255,255,0.22)',letterSpacing:'3px'}}>
                    {showInviteList ? '▸ NEURAL CONTACTS' : '▸ OPERATIONS'}
                </div>
                {showInviteList && (
                    <button onClick={() => setShowInviteList(false)} className="mono" style={{ background: 'transparent', border: 'none', color: '#bc13fe', fontSize: '0.55rem', cursor: 'pointer', letterSpacing: '1px' }}>[ ZURÜCK ]</button>
                )}
            </div>

            {showInviteList ? (
              /* --- 1-CLICK INVITE LISTE --- */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                {friends.length === 0 ? (
                    <div className="mono" style={{ color: '#444', fontSize: '0.6rem', padding: '20px', textAlign: 'center', border: '1px dashed #222' }}>KEINE AKTIVEN AGENTEN GEFUNDEN</div>
                ) : (
                    friends.map(f => {
                        const hasCoopRun = allRuns && allRuns['coop_' + f.id];
                        return (
                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(188,19,254,0.05)', border: '1px solid rgba(188,19,254,0.15)', borderLeft: '3px solid #bc13fe' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#bc13fe', boxShadow: '0 0 8px #bc13fe' }} />
                                <div>
                                    <div className="mono" style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>{f.username}</div>
                                    {hasCoopRun && <div className="mono" style={{ fontSize: '0.45rem', color: 'var(--win)', marginTop: '2px' }}>AKTIVER RUN GESPEICHERT</div>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {hasCoopRun && (
                                    <button 
                                        onClick={() => onDeleteCoop(f.id)} 
                                        title="Co-Op Run löschen"
                                        style={{ background: 'rgba(255,0,50,0.2)', border: '1px solid var(--lose)', color: 'var(--lose)', padding: '4px 8px', fontSize: '0.55rem', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 900 }}
                                    >✕</button>
                                )}
                                <button 
                                    onClick={() => onInviteDirect(f.id)} 
                                    style={{ background: 'rgba(188,19,254,0.2)', border: '1px solid #bc13fe', color: '#bc13fe', padding: '4px 10px', fontSize: '0.55rem', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 900 }}
                                >
                                    {hasCoopRun ? 'FORTSETZEN' : 'INVITE'}
                                </button>
                            </div>
                        </div>
                    )})
                )}
              </div>
            ) : (
              /* --- NORMALE OPERATIONS --- */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <HubButton 
                  icon="⬡" color="#bc13fe" 
                  title={avatarCard ? "AVATAR LABOR" : "AGENT ERSTELLEN"} 
                  sub={avatarCard ? `Agent modifizieren · Stats upgraden · Bio anpassen` : `Neuen Ghost Agent konfigurieren`} 
                  onClick={onGoToLab}
                />

                <div style={{height:'1px',background:'rgba(255,255,255,0.06)',margin:'2px 0'}}/>

                {/* SOLO BEREICH */}
                {hasRun ? (
                  <>
                    <HubButton icon="▶" color="var(--win)" title="SOLO RUN FORTSETZEN"
                      sub={`Sektor ${roguelikeRun.sector} // Node ${roguelikeRun.node} // HP ${roguelikeRun.currentHP}/${roguelikeRun.maxHP}`}
                      active onClick={onGoToMap}/>
                    <HubButton icon="✕" color="var(--lose)" title="SOLO RUN ABBRECHEN" sub="Permadeath — Run löschen, Avatar bleibt"
                      onClick={()=>{if(window.confirm('Solo Run wirklich abbrechen? Permadeath.'))window.dispatchEvent(new CustomEvent('abortRun'));}}/>
                  </>
                ) : (
                  <HubButton icon="⬡" color="var(--win)" title="SOLO RUN STARTEN"
                    sub={avatarCard?'Squad wählen — Mission initialisieren':'AVATAR ERFORDERLICH'}
                    locked={!avatarCard} onClick={onGoToSquad}/>
                )}
                
                <div style={{height:'1px',background:'rgba(255,255,255,0.06)',margin:'2px 0'}}/>
                
                {/* CO-OP BEREICH (IMMER SICHTBAR) */}
                <HubButton icon="📡" color="var(--apex-pink)" title="CO-OP MISSIONEN"
                  sub={avatarCard?'Neural Link zu Partner herstellen':'AVATAR ERFORDERLICH'}
                  locked={!avatarCard} onClick={() => setShowInviteList(true)}/>
              </div>
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