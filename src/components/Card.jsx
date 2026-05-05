import React, { useRef, useEffect, useState } from 'react';

export const CAT_CONFIG = {
  tech: { name: 'Tech-Hebel', short: 'TECH' },
  finance: { name: 'Finanzmacht', short: 'FINANZ' },
  manipulation: { name: 'Manipulation', short: 'MANIP' },
  erosion: { name: 'Erosion', short: 'EROSION' },
  kingmaking: { name: 'Schattenmacht', short: 'SCHATTEN' },
  system: { name: 'Systemrisiko', short: 'RISIKO' },
  arsenal: { name: 'Arsenal', short: 'ARSENAL' },
  legitimacy: { name: 'Legitimität', short: 'LEGIT' }
};

export const STAT_ICONS = {
  tech: '⎔', finance: '🔗', manipulation: '👁', erosion: '≈',
  kingmaking: '♔', system: '⚠', arsenal: '✇', legitimacy: '🛡'
};

const STAT_KEYS = ['tech', 'finance', 'manipulation', 'erosion', 'kingmaking', 'system', 'arsenal', 'legitimacy'];

const NeuralCore = ({ color }) => (
  <svg className="neural-core-svg spin-slow" width="120" height="120" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="1" opacity="0.3" strokeDasharray="4 8"/>
    <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth="2" opacity="0.5" strokeDasharray="10 5"/>
    <polygon points="50,15 85,50 50,85 15,50" fill="none" stroke={color} strokeWidth="1" opacity="0.4"/>
    <circle cx="50" cy="50" r="10" fill={color} opacity="0.8"/>
  </svg>
);

const TacticCore = ({ color }) => (
  <svg className="neural-core-svg spin-fast" width="120" height="120" viewBox="0 0 100 100">
    <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke={color} strokeWidth="2" opacity="0.6"/>
    <circle cx="50" cy="50" r="25" fill="none" stroke={color} strokeWidth="1" strokeDasharray="2 4"/>
    <path d="M50 20 L50 80 M20 50 L80 50" stroke={color} strokeWidth="1" opacity="0.5"/>
    <rect x="45" y="45" width="10" height="10" fill={color}/>
  </svg>
);

export function getRarityClass(gti) {
  if (gti >= 95) return 'rarity-legendary';
  if (gti >= 88) return 'rarity-epic';
  if (gti >= 80) return 'rarity-rare';
  return 'rarity-common';
}

export default function Card({
  card, context = 'deck', activeEffect = null, apexBuffs = {}, activeCrisis = null, curCategory = '', isPlayerTurn = true, onStatClick, isInspecting = false
}) {
  const wrapperRef = useRef(null);
  const cardRef    = useRef(null);

  // --- SMART IMAGE LOADER STATE ---
  const [imgExt, setImgExt] = useState('.png');
  const [imgFailed, setImgFailed] = useState(false);

  // Reset Image State if the card changes (important for re-rendering)
  useEffect(() => {
    setImgExt('.png');
    setImgFailed(false);
  }, [card?.name]);

  // --- GYRO SENSOR LOGIC ---
  useEffect(() => {
    if (!wrapperRef.current || !cardRef.current) return;
    
    if (!isInspecting) {
        wrapperRef.current.style.transform = `rotateX(0deg) rotateY(0deg)`;
        return;
    }

    const handleOrientation = (e) => {
      let { beta, gamma } = e; 
      if (beta === null || gamma === null) return;

      beta = Math.max(-45, Math.min(45, beta - 45)); 
      gamma = Math.max(-45, Math.min(45, gamma));

      const rotX = -(beta / 3); 
      const rotY = (gamma / 3);

      const innerCard = cardRef.current;
      wrapperRef.current.style.transform  = `rotateX(${rotX * 2}deg) rotateY(${rotY * 2}deg)`;
      
      innerCard.style.setProperty('--x',  `${50 + gamma}%`);
      innerCard.style.setProperty('--y',  `${50 + beta}%`);
      innerCard.style.setProperty('--px', `${-rotY * 2}px`);
      innerCard.style.setProperty('--py', `${rotX * 2}px`);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isInspecting]);

  if (!card) return null;

  const handleMouseMove = (e) => {
    if (isInspecting || !wrapperRef.current || !cardRef.current) return;

    const el = wrapperRef.current;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;

    el.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.05) translateZ(20px)`;
    
    const innerCard = cardRef.current;
    innerCard.style.setProperty('--x', `${(x / rect.width) * 100}%`);
    innerCard.style.setProperty('--y', `${(y / rect.height) * 100}%`);
    
    innerCard.style.setProperty('--px', `${(x - centerX) / 15}px`);
    innerCard.style.setProperty('--py', `${(y - centerY) / 15}px`);
  };

  const handleMouseLeave = () => {
    if (isInspecting || !wrapperRef.current || !cardRef.current) return;
    
    const el = wrapperRef.current;
    const innerCard = cardRef.current;
    
    el.style.transform = `rotateX(0deg) rotateY(0deg) scale(1) translateZ(0)`;
    innerCard.style.setProperty('--x', `50%`);
    innerCard.style.setProperty('--y', `50%`);
    innerCard.style.setProperty('--px', `0px`);
    innerCard.style.setProperty('--py', `0px`);
  };

  const isApex = card.type === 'apex';
  const isLegacy = card.type === 'legacy';
  const isEffect = card.type === 'effect';
  const isAnomaly = card.type === 'anomaly';
  const currentLevel = card.level || 1;

  const rarityClass = getRarityClass(card.gti);
  let themeColor = '#888';
  if (isApex) themeColor = 'var(--apex-pink)';
  else if (isLegacy) themeColor = 'var(--legacy-sepia)';
  else if (rarityClass === 'rarity-legendary') themeColor = 'var(--r-leg)';
  else if (rarityClass === 'rarity-epic') themeColor = 'var(--r-epi)';
  else if (rarityClass === 'rarity-rare') themeColor = 'var(--r-rar)';
  if (isAnomaly) themeColor = '#ff0000';

  let edgeClass = 'edge-common';
  if (isAnomaly) edgeClass = 'edge-anomaly';
  else if (isApex) edgeClass = 'edge-apex';
  else if (isLegacy) edgeClass = 'edge-legacy';
  else if (rarityClass === 'rarity-legendary') edgeClass = 'edge-legendary';
  else if (rarityClass === 'rarity-epic') edgeClass = 'edge-epic';
  else if (rarityClass === 'rarity-rare') edgeClass = 'edge-rare';

  const initials = card.name?.split(' ').map(n => n[0]).join('').substring(0,2) || 'XX';
  const newClass = card.isNew ? 'is-new-glow' : '';

  const levelBadge = (
    <div className={`level-badge lvl-${currentLevel} parallax-layer`}>
      LVL {currentLevel}/3
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────
  // EFFECT CARD
  // ─────────────────────────────────────────────────────────────────────
  if (isEffect) {
    return (
      <div className="card-3d-wrapper" ref={wrapperRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <div className={`card-edge ${edgeClass}`}></div>
        <div ref={cardRef} className={`card-ui type-effect ${activeEffect?.name === card.name ? 'active' : ''} ${newClass}`}>
          <div className="card-glare"></div>
          <div className="card-foil"></div>
          <div className="card-scanlines"></div>
          <div className="vertical-faction-tab" style={{ color: 'var(--eff-col)' }}>SYSTEM BYPASS</div>
          
          {levelBadge}
          
          <div className="card-tags-container parallax-layer">
            {card.isNew && <div className="new-tag">NEW</div>}
            {card.isLevelUp && <div className="levelup-tag">LEVEL UP!</div>}
            {card.isMaxLevelRefund && <div className="refund-tag">MAX LVL (+{card.cost >= 3 ? 100 : 50}💳)</div>}
          </div>
          
          <div className="gti-core parallax-layer">
            <div className="gti-label">COST</div>
            <div className="gti-value mono" style={{ color: 'var(--eff-col)' }}>{card.cost}⚡</div>
          </div>
          
          <div className="type-badge parallax-layer">TAKTIK</div>
          <div className="card-name parallax-layer" style={{ textAlign: 'center', marginTop: '40px' }}>{card.name}</div>
          
          <div className="c-center-visual parallax-layer">
            <div className="radar-wrapper"><TacticCore color="var(--eff-col)" /></div>
            <div className="c-text-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <b style={{ color: 'var(--ep)', fontSize: '1.2rem', lineHeight: 1 }}>+{card.buff} {CAT_CONFIG[card.stat]?.name}</b>
              
              {card.syn && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', background: 'rgba(0,229,255,0.05)', borderTop: '1px solid rgba(0,229,255,0.2)', paddingTop: '6px', marginTop: '5px' }}>
                  <small style={{ color: 'var(--win)', fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>Synergie-Ziel</small>
                  <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', textShadow: '0 0 5px rgba(255,255,255,0.3)' }}>
                    {Array.isArray(card.syn) ? card.syn.join(', ') : card.syn}
                  </span>
                  {card.synBuff && <small style={{ color: 'var(--eff-col)', fontSize: '0.75rem', fontWeight: 'bold' }}>Bonus: +{card.synBuff}</small>}
                </div>
              )}
            </div>
          </div>
          <div className="card-micro-data mono parallax-layer">ID: {card.name?.slice(0,3)}-{card.cost} // SECURE_CONN</div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // CHARACTER / APEX / LEGACY CARD
  // ─────────────────────────────────────────────────────────────────────

  // --- AUTOMATISCHER BILD-PFAD GENERATOR ---
  const getSmartFileName = (fullName) => {
    if (!fullName) return 'unknown';
    const n = fullName.toLowerCase();
    
    // 3 Ausnahmen, bei denen der Dateiname extrem vom Vor/Nachnamen abweicht
    if (n.includes('von der leyen')) return 'vonderleyen';
    if (n.includes('mohammed bin zayed')) return 'mbz'; 
    if (n.includes('xi jinping')) return 'xijinping'; 
    
    // Standard-Logik: Letztes Wort des Namens nehmen und Sonderzeichen entfernen
    const parts = n.split(' ');
    return parts[parts.length - 1].replace(/[^a-z0-9]/g, '');
  };

  const fileName = getSmartFileName(card.name);
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  
  // Der finale Pfad probiert automatisch die aktuelle Extension (Startet bei .png)
  const photoSrc = `${cleanBase}/photos/${fileName}${imgExt}`;

  // Wenn das Bild nicht existiert (404), probiert React automatisch das nächste Format
  const handleImgError = () => {
    if (imgExt === '.png') setImgExt('.jpg');
    else if (imgExt === '.jpg') setImgExt('.jpeg');
    else setImgFailed(true); // Wenn alle 3 fehlschlagen -> Avatar Initialen anzeigen
  };

  let displayTitle = card.title;
  if (isApex)   displayTitle = `${card.year || ''} // ${card.event || card.title || ''}`.toUpperCase();
  else if (isLegacy) displayTitle = card.year || card.date || card.title;

  return (
    <div className="card-3d-wrapper" ref={wrapperRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div className={`card-edge ${edgeClass}`}></div>

      <div ref={cardRef} className={`card-ui ${rarityClass} ${isAnomaly ? 'type-anomaly' : isApex ? 'type-apex' : isLegacy ? 'type-legacy' : ''} ${newClass}`}>

        {!imgFailed && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '65%', zIndex: 1, pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)'
          }}>
            <img 
               src={photoSrc} 
               alt={card.name} 
               onError={handleImgError}
               style={{
                 width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 10%',
                 filter: 'saturate(0.65) contrast(1.1) brightness(0.95)'
               }} 
            />
          </div>
        )}

        <div className="card-foil"></div>
        <div className="card-glare"></div>
        <div className="card-scanlines"></div>

        <div className="vertical-faction-tab" style={{ color: themeColor, zIndex: 15 }}>{card.faction}</div>
        
        {levelBadge}

        <div className="card-tags-container parallax-layer">
          {card.isNew && <div className="new-tag">NEW</div>}
          {card.isLevelUp && <div className="levelup-tag">LEVEL UP!</div>}
          {card.isMaxLevelRefund && <div className="refund-tag">MAX LVL (+{card.gti >= 90 ? 100 : 50}💳)</div>}
        </div>

        <div className="gti-core parallax-layer" style={{ '--gti-color': themeColor }}>
          <div className="gti-label">RATING</div>
          <div className="gti-value mono" style={{ color: themeColor }}>{card.gti}</div>
          <div className="gti-bracket"></div>
        </div>

       <div className="type-badge parallax-layer">
          {isAnomaly ? 'SYSTEM ANOMALY' : isApex ? 'APEX UNIT' : isLegacy ? 'LEGACY ASSET' : 'SYSTEM AGENT'}
        </div>

        <div className="card-header parallax-layer">
          {/* Zeigt die Buchstaben nur an, wenn ALLE Bildformate fehlgeschlagen sind */}
          {imgFailed && <div className="card-avatar frame-break-avatar">{initials}</div>}
          
          <div className="card-info" style={{ textAlign: 'left' }}>
            <div className="card-name" style={!imgFailed ? { textShadow: '0 2px 10px rgba(0,0,0,1), 0 0 15px rgba(0,0,0,0.8)' } : {}}>
              {card.name}
            </div>
            <div className="card-title" style={!imgFailed ? { textShadow: '0 2px 8px rgba(0,0,0,1)' } : {}}>
              {displayTitle}
            </div>
          </div>
        </div>

        <div className="c-center-visual parallax-layer">
          {imgFailed && <div className="radar-wrapper"><NeuralCore color={themeColor} /></div>}
          <div className="c-text-wrap">
            {isApex && card.passiveBuff ? (
              <div className="apex-passive-info">
                <b style={{ color: 'var(--ep)' }}>+{card.passiveBuff.val} {CAT_CONFIG[card.passiveBuff.stat]?.name}</b>
                <small>PASSIV-KOMPETENZ</small>
              </div>
            ) : (
              <div className="c-bio">"{card.bio}"</div>
            )}
          </div>
        </div>

        <div className="card-stats parallax-layer">
          {STAT_KEYS.map(k => {
            let val = Math.floor(card[k] ?? card.stats?.[k] ?? 0);
            val += (currentLevel - 1) * 2;
            val += apexBuffs[k] || 0;

            let effBuff  = 0;
            let synBonus = 0;
            if (activeEffect && activeEffect.stat === k) {
              effBuff = activeEffect.buff;
              if (activeEffect.syn?.includes(card.name)) synBonus = activeEffect.synBuff ?? 0;
            }
            val += effBuff + synBonus;

            let crisisMult = 1;
            if (activeCrisis) {
              if ((activeCrisis.id === 'HYPERINFLATION' && k === 'finance') || (activeCrisis.id === 'BLACKOUT' && k === 'tech')) val = 0;
              else if (activeCrisis.id === 'NUCLEAR_WAR' && k === 'arsenal')    crisisMult = 1.5;
              else if (activeCrisis.id === 'ANARCHY'     && k === 'erosion')    crisisMult = 1.5;
              else if (activeCrisis.id === 'NWO'         && k === 'kingmaking') crisisMult = 1.5;
            }
            val = Math.floor(val * crisisMult);

            const isSelected    = curCategory === k;
            const selectedClass = isSelected ? (isPlayerTurn ? 'selected-player' : 'selected-ai') : '';
            let   statStyle     = { color: '#fff' };
            if (activeCrisis && val === 0 && (k === 'finance' || k === 'tech')) statStyle = { color: 'var(--lose)' };

            const fillPct  = Math.min(100, Math.max(0, val));
            const barColor = val >= 100 ? 'var(--apex-pink)' : val >= 90 ? 'var(--ep)' : val >= 70 ? 'var(--win)' : '#444';

            return (
              <div key={k} className={`card-stat ${selectedClass}`} onClick={() => onStatClick?.(k)}>
                <div className="stat-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {STAT_ICONS[k]}
                    {CAT_CONFIG[k].name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {(apexBuffs[k] > 0 || effBuff > 0 || synBonus > 0) && (
                      <span className="mono" style={{ color: 'var(--eff-col)', fontSize: '0.72rem' }}>+{(apexBuffs[k] || 0) + effBuff + synBonus}</span>
                    )}
                    <b className={`mono ${val >= 100 ? 'stat-val-max' : ''}`} style={statStyle}>{val}</b>
                  </div>
                </div>
                <div className="stat-bar-bg">
                  <div className="stat-bar-fill" style={{ width: `${fillPct}%`, background: barColor, boxShadow: val >= 70 ? `0 0 5px ${barColor}` : 'none' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card-micro-data mono parallax-layer">LOC: {initials}_NODE // AUTH: GRANTED</div>
      </div>
    </div>
  );
}