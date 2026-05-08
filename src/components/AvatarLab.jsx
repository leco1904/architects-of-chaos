import React, { useState, useEffect, useRef } from 'react';
import Card, { AVATAR_ARTS } from './Card';
import { playSound } from '../logic/audio';

// ── Config ─────────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'cyan',   color: '#00e5ff', name: 'CYBER CYAN' },
  { id: 'green',  color: '#00ff44', name: 'TOXIC GREEN' },
  { id: 'red',    color: '#ff0055', name: 'MATRIX RED' },
  { id: 'purple', color: '#bc13fe', name: 'GHOST PURPLE' },
  { id: 'amber',  color: '#ffb300', name: 'AMBER SEPIA' },
];
const ARCHETYPES = {
  hacker:    { name:'HACKER',    icon:'⎔', desc:'Cyber-Spezialist. Dominiert digitale Systeme.',     buffs:{tech:20,system:20}       },
  banker:    { name:'BANKER',    icon:'🔗', desc:'Finanzhai. Kontrolliert Märkte und Mächtige.',       buffs:{finance:20,kingmaking:20} },
  demagogue: { name:'DEMAGOGE', icon:'👁', desc:'Meister der Massen. Manipulation als Waffe.',        buffs:{manipulation:20,erosion:20}},
  warlord:   { name:'WARLORD',   icon:'✇', desc:'Militärstratege. Arsenal und Legitimität.',          buffs:{arsenal:20,legitimacy:20} },
};
const BASE      = { tech:50, finance:50, manipulation:50, erosion:50, kingmaking:50, system:50, arsenal:50, legitimacy:50 };
const STAT_KEYS = Object.keys(BASE);
const STAT_LABELS = {
  tech:'⎔ Tech-Hebel', finance:'🔗 Finanzmacht', manipulation:'👁 Manipulation',
  erosion:'≈ Erosion', kingmaking:'♔ Schattenmacht', system:'⚠ Systemrisiko',
  arsenal:'✇ Arsenal', legitimacy:'🛡 Legitimität',
};

const calcGTI = s => Math.round(STAT_KEYS.reduce((a,k) => a+(s[k]||0), 0) / STAT_KEYS.length) + ((s.level||1)-1)*5;
const spCost  = v => v < 70 ? 1 : v < 85 ? 2 : 3;

// ── Upgrade Toast ─────────────────────────────────────────────────────────
function UpgradeToast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position:'fixed', bottom:'30px', right:'30px', zIndex:9999,
      padding:'10px 18px', background:'rgba(188,19,254,0.15)',
      border:'1px solid #bc13fe', borderLeft:'3px solid #bc13fe',
      backdropFilter:'blur(8px)', animation:'tooltipIn 0.2s ease-out',
      pointerEvents:'none',
    }}>
      <div className="mono" style={{color:'#bc13fe', fontSize:'0.7rem', fontWeight:700, letterSpacing:'2px'}}>
        +2 {STAT_LABELS[toast.stat]}
      </div>
      <div className="mono" style={{color:'rgba(255,255,255,0.4)', fontSize:'0.55rem', marginTop:'2px'}}>
        {toast.sp} SP verbleibend
      </div>
    </div>
  );
}

// ── Compact stat cost reference ────────────────────────────────────────────
function StatCostRef({ working }) {
  return (
    <div style={{
      padding:'10px 12px', background:'rgba(0,0,0,0.5)',
      border:'1px solid rgba(188,19,254,0.1)', borderLeft:'3px solid rgba(188,19,254,0.3)',
    }}>
      <div className="mono" style={{fontSize:'0.48rem', color:'rgba(255,255,255,0.2)', letterSpacing:'2px', marginBottom:'6px'}}>▸ UPGRADE-KOSTEN</div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px 8px'}}>
        {STAT_KEYS.map(k => {
          const val   = working[k] || 0;
          const cost  = spCost(val);
          const can   = (working.sp||0) >= cost;
          return (
            <div key={k} style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{fontSize:'0.5rem', color: can ? 'rgba(255,255,255,0.4)' : '#2a3a4a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'90px'}}>
                {STAT_LABELS[k].split(' ')[1] || STAT_LABELS[k]}
              </div>
              <div className="mono" style={{fontSize:'0.5rem', color: can ? '#bc13fe' : '#3a4a5a', flexShrink:0}}>
                {val} → {cost}SP
              </div>
            </div>
          );
        })}
      </div>
      <div className="mono" style={{fontSize:'0.44rem', color:'rgba(255,255,255,0.15)', marginTop:'6px', letterSpacing:'1px'}}>
        &lt;70=1SP · 70–84=2SP · 85+=3SP
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AvatarLab({ avatarCard, updateAvatar, onBack, onGoToMission, allFactions=[] }) {
  // Session tracking: committedRef = last saved snapshot, working = pending edits
  const committedRef = useRef(null);
  const [working,    setWorking]    = useState(null);
  const [toast,      setToast]      = useState(null);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText,    setBioText]    = useState('');

  // Creation form
  const [name,      setName]      = useState('');
  const [faction,   setFaction]   = useState(allFactions[0] || 'SHADOW POWER');
  const [archetype, setArchetype] = useState('hacker');
  const [selectedArt, setSelectedArt] = useState(AVATAR_ARTS[0].src);
  const [selectedColor, setSelectedColor] = useState(THEMES[3].color); // Default Purple
  const [error,     setError]     = useState('');

  // Initialize working state when avatarCard loads
  useEffect(() => {
    if (avatarCard && !working) {
      committedRef.current = { ...avatarCard };
      setWorking({ ...avatarCard });
    }
  }, [avatarCard]); // eslint-disable-line

  const hasPending = !!(working && committedRef.current &&
    (STAT_KEYS.some(k => working[k] !== committedRef.current[k]) || working.sp !== committedRef.current.sp || working.customColor !== committedRef.current.customColor || working.customArt !== committedRef.current.customArt || working.bio !== committedRef.current.bio));

  // ── Upgrade stat (called both by card click and the side list) ────────────
  const handleUpgrade = (stat) => {
    if (!working) return;
    if (!STAT_KEYS.includes(stat)) return; // guard: only known stats
    const cost = spCost(working[stat] || 0);
    if ((working.sp || 0) < cost) return;
    const u = { ...working, [stat]:(working[stat]||0)+2, sp:(working.sp||0)-cost };
    u.gti = calcGTI(u);
    setWorking(u);

    // Show toast
    setToast({ stat, sp: u.sp });
    if (toast?.timer) clearTimeout(toast.timer);
    const timer = setTimeout(() => setToast(null), 1400);
    setToast({ stat, sp: u.sp, timer });

    try { playSound('win'); } catch {}
  };

  // ── Smart Reset ────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (!committedRef.current || !hasPending) return;
    setWorking({ ...committedRef.current });
    try { playSound('click'); } catch {}
  };

  // ── Save to cloud ──────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!working) return;
    updateAvatar(working);
    committedRef.current = { ...working };
    try { playSound('win'); } catch {}
  };

  // ── Bio ────────────────────────────────────────────────────────────────────
  const saveBio = () => {
    if (!working) return;
    const u = { ...working, bio: bioText.slice(0, 150) };
    setWorking(u);
    setEditingBio(false);
  };

  // ── Create avatar ──────────────────────────────────────────────────────────
  const handleCreate = () => {
    const n = name.trim();
    if (!n) { setError('AGENT-BEZEICHNUNG ERFORDERLICH.'); return; }
    const arch  = ARCHETYPES[archetype];
    const stats = { ...BASE };
    Object.entries(arch.buffs).forEach(([k,v]) => { stats[k] += v; });
    
    // Farbwahl beeinflusst den Hauptstat minimal (+5 auf den wichtigsten Stat der Farbe)
    if (selectedColor === '#00e5ff') stats.tech += 5; // Cyan
    if (selectedColor === '#00ff44') stats.erosion += 5; // Green
    if (selectedColor === '#ff0055') stats.arsenal += 5; // Red
    if (selectedColor === '#bc13fe') stats.manipulation += 5; // Purple
    if (selectedColor === '#ffb300') stats.finance += 5; // Amber

    const newAvatar = {
      id:'avatar', name:n.toUpperCase(), title:`${arch.name} // ${faction}`,
      faction, type:'std', gti:calcGTI(stats), level:1, sp:3,
      archetype, bio:'', backText:arch.desc, ...stats,
      customColor: selectedColor, customArt: selectedArt
    };
    updateAvatar(newAvatar);
    committedRef.current = { ...newAvatar };
    setWorking({ ...newAvatar });
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STATE B — Avatar exists: card-click upgrade interface
  // ════════════════════════════════════════════════════════════════════════════
  if (avatarCard && working) {
    return (
      <>
        {/* Inline CSS for card stat hover in lab */}
        <style>{`
          .lab-card-wrapper .card-stat {
            cursor: pointer !important;
            transition: background 0.12s ease !important;
          }
          .lab-card-wrapper .card-stat:hover {
            background: rgba(188,19,254,0.1) !important;
          }
          .lab-card-wrapper .card-stat:active {
            background: rgba(188,19,254,0.18) !important;
          }
        `}</style>

        <div className="screen active" style={{display:'block', padding:'20px 24px', overflowX:'hidden'}}>
          {/* Top bar */}
          <div className="top-bar" style={{marginBottom:'14px'}}>
            <div className="game-title-small" style={{color:'#bc13fe', textShadow:'0 0 14px rgba(188,19,254,0.5)'}}>⬡ AVATAR LAB</div>
            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
              {/* SP pill */}
              <div style={{background:'rgba(188,19,254,0.1)', border:'1px solid rgba(188,19,254,0.3)', padding:'4px 12px', display:'flex', gap:'6px', alignItems:'center'}}>
                <span className="mono" style={{fontSize:'0.55rem', color:'rgba(255,255,255,0.35)'}}>SP</span>
                <span className="mono" style={{fontSize:'1.1rem', fontWeight:900, color:'#bc13fe', textShadow:'0 0 10px #bc13fe'}}>{working.sp ?? 0}</span>
              </div>
              {/* Smart Reset — only when pending */}
              <button onClick={handleReset} disabled={!hasPending}
                style={{padding:'6px 10px', background:'transparent', border:`1px solid ${hasPending?'var(--lose)':'#2a3a4a'}`, color:hasPending?'var(--lose)':'#3a4a5a', fontFamily:"'Roboto Mono',monospace", fontSize:'0.55rem', letterSpacing:'2px', cursor:hasPending?'pointer':'not-allowed', transition:'all 0.2s'}}>
                ↺ RESET
              </button>
              <button className="btn-back" style={{borderColor:'#333', color:'#555', fontSize:'0.55rem'}}
                onClick={() => window.confirm('Avatar löschen?') && updateAvatar(null)}>DEL</button>
              <button className="btn-back" onClick={onBack}>ZURÜCK</button>
            </div>
          </div>

          <div style={{display:'flex', gap:'20px', justifyContent:'center', alignItems:'flex-start', flexWrap:'wrap'}}>

            {/* ── Center: Card with clickable stats ─────────────────────── */}
            <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px'}}>
              <div className="mono" style={{fontSize:'0.52rem', color:'rgba(188,19,254,0.5)', letterSpacing:'3px', marginBottom:'2px'}}>
                ▸ KLICKE AUF EINEN STAT ZUM UPGRADEN
              </div>
              <div className="lab-card-wrapper" style={{filter:'drop-shadow(0 0 18px rgba(188,19,254,0.4))'}}>
                <Card card={working} context="inventory" onStatClick={handleUpgrade}/>
              </div>
            </div>

            {/* ── Right: Controls panel ─────────────────────────────────── */}
            <div style={{display:'flex', flexDirection:'column', gap:'10px', width:'220px', flexShrink:0}}>

              {/* Pending changes indicator */}
              {hasPending && (
                <div style={{padding:'7px 10px', background:'rgba(188,19,254,0.06)', border:'1px solid rgba(188,19,254,0.3)', borderLeft:'3px solid #bc13fe', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span className="mono" style={{fontSize:'0.5rem', color:'rgba(188,19,254,0.7)', letterSpacing:'1px'}}>UNGESPEICHERT</span>
                  <div style={{width:'6px', height:'6px', borderRadius:'50%', background:'#bc13fe', boxShadow:'0 0 8px #bc13fe', animation:'gtiPulse 1s infinite'}}/>
                </div>
              )}

              {/* Save button */}
              <button onClick={handleSave}
                style={{padding:'11px', background:hasPending?'rgba(188,19,254,0.1)':'rgba(0,0,0,0.3)', border:`1px solid ${hasPending?'#bc13fe':'#2a3a4a'}`, color:hasPending?'#bc13fe':'#3a4a5a', fontFamily:"'Roboto Mono',monospace", fontSize:'0.7rem', fontWeight:700, letterSpacing:'3px', cursor:hasPending?'pointer':'default', transition:'all 0.2s', width:'100%'}}>
                {hasPending ? '▸ ÄNDERUNGEN SPEICHERN' : '✓ GESPEICHERT'}
              </button>

              {/* Upgrade cost reference */}
              <StatCostRef working={working}/>

              {/* Bio edit */}
              <div style={{padding:'10px', background:'rgba(0,0,0,0.5)', border:'1px solid rgba(188,19,254,0.1)', borderLeft:'3px solid rgba(188,19,254,0.3)'}}>
                <div className="mono" style={{fontSize:'0.48rem', color:'rgba(255,255,255,0.2)', letterSpacing:'2px', marginBottom:'5px'}}>▸ BIO-TEXT</div>
                {editingBio ? (
                  <>
                    <textarea maxLength={150} value={bioText} onChange={e=>setBioText(e.target.value)} rows={3} autoFocus
                      style={{width:'100%', background:'rgba(0,0,0,0.7)', border:'1px solid rgba(188,19,254,0.4)', color:'#fff', fontFamily:"'Rajdhani',sans-serif", fontSize:'0.8rem', padding:'6px', resize:'none', outline:'none', boxSizing:'border-box'}}
                      placeholder="Max. 150 Zeichen..."/>
                    <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
                      <button onClick={saveBio} style={{flex:1, padding:'4px', background:'rgba(188,19,254,0.1)', border:'1px solid #bc13fe', color:'#bc13fe', fontFamily:"'Roboto Mono',monospace", fontSize:'0.54rem', letterSpacing:'2px', cursor:'pointer'}}>✓</button>
                      <button onClick={()=>setEditingBio(false)} style={{padding:'4px 7px', background:'transparent', border:'1px solid #333', color:'#555', fontFamily:"'Roboto Mono',monospace", fontSize:'0.54rem', cursor:'pointer'}}>✕</button>
                    </div>
                    <div className="mono" style={{fontSize:'0.44rem', color:'rgba(255,255,255,0.16)', marginTop:'3px', textAlign:'right'}}>{bioText.length}/150</div>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', fontStyle:'italic', minHeight:'28px', marginBottom:'6px', lineHeight:'1.5'}}>
                      {working.bio ? `"${working.bio}"` : '— Kein Bio —'}
                    </div>
                    <button onClick={()=>{setBioText(working.bio||''); setEditingBio(true);}}
                      style={{width:'100%', padding:'4px', background:'transparent', border:'1px solid rgba(188,19,254,0.26)', color:'rgba(188,19,254,0.62)', fontFamily:"'Roboto Mono',monospace", fontSize:'0.54rem', letterSpacing:'2px', cursor:'pointer'}}>
                      ✏ EDIT BIO
                    </button>
                  </>
                )}
              </div>

              {/* Mission button */}
              {onGoToMission && (
                <button onClick={onGoToMission}
                  style={{padding:'13px', background:'rgba(255,0,127,0.08)', border:'2px solid var(--apex-pink)', color:'var(--apex-pink)', fontFamily:"'Roboto Mono',monospace", fontSize:'0.72rem', fontWeight:700, letterSpacing:'3px', cursor:'pointer', boxShadow:'0 0 14px rgba(255,0,127,0.08)', width:'100%'}}>
                  ⬡ MISSION STARTEN
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Upgrade toast notification */}
        <UpgradeToast toast={toast}/>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STATE A — Create avatar
  // ════════════════════════════════════════════════════════════════════════════
  const previewStats = { ...BASE };
  Object.entries(ARCHETYPES[archetype]?.buffs||{}).forEach(([k,v]) => { previewStats[k] += v; });
  if (selectedColor === '#00e5ff') previewStats.tech += 5;
  if (selectedColor === '#00ff44') previewStats.erosion += 5;
  if (selectedColor === '#ff0055') previewStats.arsenal += 5;
  if (selectedColor === '#bc13fe') previewStats.manipulation += 5;
  if (selectedColor === '#ffb300') previewStats.finance += 5;

  const previewCard = {
    id: 'avatar',
    name: name.trim() ? name.toUpperCase() : 'CODENAME',
    title: `${ARCHETYPES[archetype]?.name} // ${faction}`,
    faction: faction,
    type: 'std',
    level: 1,
    bio: '',
    backText: ARCHETYPES[archetype]?.desc,
    ...previewStats,
    gti: calcGTI(previewStats)
  };

  return (
    <div className="screen active" style={{display:'block', padding:'15px 26px', overflowY:'auto'}}>
      <div className="top-bar" style={{marginBottom:'10px'}}>
        <div className="game-title-small" style={{color: selectedColor, transition:'color 0.3s'}}>⬡ AVATAR LAB</div>
        <button className="btn-back" onClick={onBack}>ZURÜCK</button>
      </div>
      
      <div style={{textAlign:'center', marginBottom:'25px', marginTop:'10px'}}>
        <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:'1.7rem', fontWeight:900, letterSpacing:'4px', color:'#fff', textShadow:`0 0 20px ${selectedColor}`, transition:'text-shadow 0.3s'}}>AGENT INITIALISIEREN</div>
        <div className="mono" style={{fontSize:'0.5rem', color: selectedColor, opacity: 0.7, letterSpacing:'3px', marginTop:'2px', transition:'color 0.3s'}}>UPGRADES BLEIBEN DAUERHAFT ERHALTEN</div>
      </div>

      <div style={{ display:'flex', gap:'40px', justifyContent:'center', alignItems:'flex-start', flexWrap:'wrap', maxWidth:'1000px', margin:'0 auto' }}>
        
        {/* LINKE SEITE: LIVE PREVIEW KARTE */}
        <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:'10px' }}>
          <div className="mono" style={{fontSize:'0.5rem', color:selectedColor, letterSpacing:'3px', opacity:0.8, transition:'color 0.3s'}}>▸ LIVE VORSCHAU</div>
          <div className="lab-card-wrapper" style={{ filter:`drop-shadow(0 0 20px ${selectedColor}44)`, transition:'filter 0.3s' }}>
            <Card card={previewCard} context="inventory" customColor={selectedColor} customArt={selectedArt} />
          </div>
        </div>

        {/* RECHTE SEITE: EINSTELLUNGEN */}
        <div className="glass-panel" style={{ flex:1, minWidth:'300px', maxWidth:'500px', padding:'15px', borderColor:`${selectedColor}44`, transition:'border-color 0.3s' }}>
          <div style={{marginBottom:'10px'}}>
            <div className="mono" style={{fontSize:'0.5rem', letterSpacing:'3px', color:'rgba(255,255,255,0.22)', marginBottom:'4px'}}>▸ AGENT-BEZEICHNUNG</div>
            <input type="text" maxLength={20} autoComplete="off" value={name}
              onChange={e => setName(e.target.value.toUpperCase())} placeholder="CODENAME EINGEBEN"
              style={{width:'100%', padding:'8px 10px', background:'rgba(0,0,0,0.6)', border:`1px solid ${selectedColor}44`, borderLeft:`3px solid ${selectedColor}`, color:'#fff', fontFamily:"'Roboto Mono',monospace", letterSpacing:'2px', fontSize:'0.9rem', boxSizing:'border-box', outline:'none', transition:'0.3s'}}/>
          </div>
          <div style={{marginBottom:'10px'}}>
            <div className="mono" style={{fontSize:'0.5rem', letterSpacing:'3px', color:'rgba(255,255,255,0.22)', marginBottom:'4px'}}>▸ FRAKTION</div>
            <select value={faction} onChange={e => setFaction(e.target.value)}
              style={{width:'100%', padding:'8px 10px', background:'#000', border:`1px solid ${selectedColor}44`, borderLeft:`3px solid ${selectedColor}`, color:'#fff', fontFamily:"'Roboto Mono',monospace", fontSize:'0.8rem', outline:'none', transition:'0.3s'}}>
              {allFactions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{marginBottom:'12px'}}>
            <div className="mono" style={{fontSize:'0.5rem', letterSpacing:'3px', color:'rgba(255,255,255,0.22)', marginBottom:'6px'}}>▸ ARCHETYP</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'6px'}}>
              {Object.entries(ARCHETYPES).map(([key,arch]) => {
                const active = archetype === key;
                return (
                  <div key={key} onClick={() => setArchetype(key)}
                    style={{padding:'8px', cursor:'pointer', background:active?`${selectedColor}11`:'rgba(0,0,0,0.4)', border:`1px solid ${active?selectedColor:'rgba(255,255,255,0.06)'}`, borderLeft:`3px solid ${active?selectedColor:'#2a3a4a'}`, transition:'all 0.18s'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px'}}>
                      <div style={{fontSize:'1rem'}}>{arch.icon}</div>
                      <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:'1px', color:active?selectedColor:'#ddd', fontSize:'0.85rem', transition:'color 0.3s'}}>{arch.name}</div>
                    </div>
                    <div style={{fontSize:'0.55rem', color:'#778', lineHeight:'1.2'}}>{arch.desc}</div>
                    <div className="mono" style={{fontSize:'0.45rem', color:active?selectedColor:'rgba(255,255,255,0.4)', marginTop:'4px', transition:'color 0.3s'}}>+20 {Object.keys(arch.buffs).join(' & ')}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Artwork Auswahl */}
          <div style={{marginBottom:'12px'}}>
            <div className="mono" style={{fontSize:'0.5rem', letterSpacing:'3px', color:'rgba(255,255,255,0.22)', marginBottom:'6px'}}>▸ GHOST-ARTWORK</div>
            <div style={{display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'2px'}}>
              {AVATAR_ARTS.map(art => {
                const active = selectedArt === art.src;
                const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) ? import.meta.env.BASE_URL : '/';
                const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
                const imgSrc = `${cleanBase}${art.src}`;

                return (
                  <div key={art.id} onClick={() => setSelectedArt(art.src)} style={{ flexShrink:0, width:'50px', height:'70px', border:`2px solid ${active ? selectedColor : '#222'}`, borderRadius:'4px', cursor:'pointer', overflow:'hidden', opacity: active ? 1 : 0.4, transition:'0.3s', boxShadow: active ? `0 0 8px ${selectedColor}44` : 'none', display:'flex', alignItems:'center', justifyContent:'center', background:'#111' }}>
                    <img src={imgSrc} alt={art.label} onError={(e) => { e.target.style.display='none'; e.target.parentNode.innerHTML=`<span style="font-size:0.4rem;color:#555">${art.label}</span>`; }} style={{width:'100%', height:'100%', objectFit:'cover', filter: active ? 'none' : 'grayscale(1)', transition:'0.3s'}} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Theme/Color Auswahl */}
          <div style={{marginBottom:'12px'}}>
            <div className="mono" style={{fontSize:'0.5rem', letterSpacing:'3px', color:'rgba(255,255,255,0.22)', marginBottom:'6px'}}>▸ NEON-THEMA</div>
            <div style={{display:'flex', gap:'6px'}}>
              {THEMES.map(theme => {
                const active = selectedColor === theme.color;
                return (
                  <div key={theme.id} onClick={() => setSelectedColor(theme.color)} style={{ flex:1, height:'38px', border:`1px solid ${active ? theme.color : '#222'}`, background: active ? `${theme.color}11` : '#000', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', transition:'0.3s', borderRadius:'3px' }}>
                    <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:theme.color, boxShadow: active ? `0 0 8px ${theme.color}` : 'none', marginBottom:'2px' }} />
                    <div className="mono" style={{ fontSize:'0.38rem', color: active ? theme.color : '#555', transition:'color 0.3s' }}>{theme.name.split(' ')[1]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && <div style={{padding:'8px 12px', marginBottom:'12px', background:'rgba(255,0,50,0.07)', borderLeft:'3px solid var(--lose)', color:'#ff6680', fontSize:'0.73rem'}}>⚠ {error}</div>}
          
          <button onClick={handleCreate}
            style={{width:'100%', padding:'13px', background:`${selectedColor}11`, border:`1px solid ${selectedColor}`, color:selectedColor, fontFamily:"'Roboto Mono',monospace", fontSize:'0.88rem', fontWeight:700, letterSpacing:'4px', cursor:'pointer', boxShadow:`0 0 14px ${selectedColor}22`, transition:'all 0.3s', marginTop:'10px'}}>
            ▸ AGENT INITIALISIEREN — 3 START-SP
          </button>
        </div>
      </div>
    </div>
  );
}