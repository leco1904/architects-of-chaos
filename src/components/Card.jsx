import React, { useRef } from 'react';
import { Cpu, Coins, Eye, Waves, Crown, AlertTriangle, Crosshair, ShieldCheck } from 'lucide-react';

// ─── MAGIC VITE AUTO-LOADER FÜR FOTOS ──────────────────────────────────────
// Holt automatisch alle Bilder aus dem Ordner, egal ob png, jpg oder jpeg
const photoFiles = import.meta.glob('../data/photos/*.{jpg,jpeg,png}', { eager: true });

const PHOTO_MAP = {};
for (const path in photoFiles) {
  // Extrahiert den Dateinamen ohne Endung (z.B. "../data/photos/trump.jpg" -> "trump")
  const fileName = path.split('/').pop();
  const nameKey = fileName.split('.')[0].toLowerCase();
  
  // Speichert die fertige URL im Map
  PHOTO_MAP[nameKey] = photoFiles[path].default || photoFiles[path];
}

const getPhoto = (fullName) => {
  if (!fullName) return null;
  
  const cleanName = fullName.toLowerCase().trim();
  
  // Variante 1: Kompletter Name ohne Leerzeichen (z.B. "Von der Leyen" sucht nach "vonderleyen.png")
  const noSpaceName = cleanName.replace(/[^a-z0-9]/g, '');
  
  // Variante 2: Nur das letzte Wort / Nachname (z.B. "Donald Trump" sucht nach "trump.png")
  const lastName = cleanName.split(' ').pop().replace(/[^a-z0-9]/g, '');

  // Er checkt erst den kompletten Namen, dann den Nachnamen. Findet er nichts, gibt es kein Bild.
  return PHOTO_MAP[noSpaceName] || PHOTO_MAP[lastName] || null;
};

// ─── Config & Icons ───────────────────────────────────────────────────────
// (Ab hier bleibt alles wie bisher: export const CAT_CONFIG = ...)

// ─── Config & Icons ───────────────────────────────────────────────────────
export const CAT_CONFIG = {
  tech:         { name: 'Tech-Hebel' },
  finance:      { name: 'Finanzmacht' },
  manipulation: { name: 'Manipulation' },
  erosion:      { name: 'Erosion' },
  kingmaking:   { name: 'Schattenmacht' },
  system:       { name: 'Systemrisiko' },
  arsenal:      { name: 'Arsenal' },
  legitimacy:   { name: 'Legitimität' },
};
export const STAT_KEYS = Object.keys(CAT_CONFIG);

const ICON_PROPS = { size: 12, strokeWidth: 2.2, style: { flexShrink: 0, opacity: 0.8 } };
export const STAT_ICONS = {
  tech:         <Cpu         {...ICON_PROPS} />,
  finance:      <Coins       {...ICON_PROPS} />,
  manipulation: <Eye         {...ICON_PROPS} />,
  erosion:      <Waves       {...ICON_PROPS} />,
  kingmaking:   <Crown       {...ICON_PROPS} />,
  system:       <AlertTriangle {...ICON_PROPS} />,
  arsenal:      <Crosshair   {...ICON_PROPS} />,
  legitimacy:   <ShieldCheck {...ICON_PROPS} />,
};

export function getRarityClass(gti) {
  if (gti >= 96) return 'rarity-legendary';
  if (gti >= 90) return 'rarity-epic';
  if (gti >= 80) return 'rarity-rare';
  return 'rarity-common';
}

const NeuralCore = ({ color }) => (
  <svg width="150" height="150" viewBox="0 0 150 150" className="neural-core-svg">
    <circle cx="75" cy="75" r="65" fill="none" stroke={color} strokeWidth="1" opacity="0.3" strokeDasharray="4 6" className="spin-slow" />
    <circle cx="75" cy="75" r="50" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" opacity="0.2" strokeDasharray="30 10 5 10" className="spin-reverse" />
    <circle cx="75" cy="75" r="30" fill="none" stroke={color} strokeWidth="2" opacity="0.5" strokeDasharray="15 15" className="spin-slow" />
    <circle cx="75" cy="75" r="4" fill={color} opacity="0.8" />
  </svg>
);

const TacticCore = ({ color }) => (
  <svg width="150" height="150" viewBox="0 0 150 150" className="neural-core-svg">
    <circle cx="75" cy="75" r="50" fill="none" stroke={color} strokeWidth="1" opacity="0.3" strokeDasharray="30 15" className="spin-slow" />
    <line x1="75" y1="20" x2="75" y2="130" stroke={color} strokeWidth="1" opacity="0.5" className="spin-reverse" transform-origin="center" />
    <line x1="20" y1="75" x2="130" y2="75" stroke={color} strokeWidth="1" opacity="0.5" className="spin-reverse" transform-origin="center" />
    <circle cx="75" cy="75" r="25" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" opacity="0.2" strokeDasharray="10 5" className="spin-fast" />
    <circle cx="75" cy="75" r="4" fill={color} opacity="0.8" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────
export default function Card({
  card, context = 'deck', activeEffect = null, apexBuffs = {}, activeCrisis = null, curCategory = '', isPlayerTurn = true, onStatClick
}) {
  const wrapperRef = useRef(null);
  const cardRef    = useRef(null);

  if (!card) return null;

  const rarityClass = getRarityClass(card.gti);
  const isApex   = card.type === 'apex';
  const isLegacy = card.type === 'legacy';
  const isEffect = card.type === 'effect';
  const isAnomaly = card.type === 'anomaly';

  const handleMouseMove = (e) => {
    if (!wrapperRef.current || !cardRef.current) return;
    const canTilt = isApex || isLegacy || rarityClass === 'rarity-legendary' || rarityClass === 'rarity-epic';
    if (!canTilt && !isEffect) return;

    const innerCard = cardRef.current;
    const rect = wrapperRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = (x / rect.width)  * 100;
    const py = (y / rect.height) * 100;
    const rotX = ((y - rect.height / 2) / (rect.height / 2)) * -1;
    const rotY = ((x - rect.width  / 2) / (rect.width  / 2));

    let maxTilt = 5;
    if (isApex)                              maxTilt = 18;
    else if (isLegacy || rarityClass === 'rarity-legendary') maxTilt = 12;
    else if (rarityClass === 'rarity-epic')  maxTilt = 8;
    else if (isEffect)                       maxTilt = 8;

    wrapperRef.current.style.transition = 'none';
    wrapperRef.current.style.transform  = `rotateX(${rotX * maxTilt}deg) rotateY(${rotY * maxTilt}deg)`;
    innerCard.style.setProperty('--x',  `${px}%`);
    innerCard.style.setProperty('--y',  `${py}%`);
    innerCard.style.setProperty('--px', `${rotY * -15}px`);
    innerCard.style.setProperty('--py', `${rotX * 15}px`);
  };

  const handleMouseLeave = () => {
    if (!wrapperRef.current || !cardRef.current) return;
    wrapperRef.current.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    wrapperRef.current.style.transform  = 'rotateX(0deg) rotateY(0deg)';
    cardRef.current.style.setProperty('--px', '0px');
    cardRef.current.style.setProperty('--py', '0px');
  };
const themeColor =
    isAnomaly ? '#ff0000' : // Pures Rot für die Anomalie
    isApex   ? 'var(--apex-pink)'   :
    isLegacy ? 'var(--legacy-sepia)':
    rarityClass === 'rarity-legendary' ? 'var(--ep)'    :
    rarityClass === 'rarity-epic'      ? 'var(--r-epi)' :
    rarityClass === 'rarity-rare'      ? 'var(--r-rar)' : '#666';

  let edgeClass = 'edge-common';
  if      (isAnomaly)                                edgeClass = 'edge-anomaly';
  else if (isApex)                                   edgeClass = 'edge-apex';
  else if (isLegacy)                                 edgeClass = 'edge-legacy';
  else if (rarityClass === 'rarity-legendary')       edgeClass = 'edge-legendary';
  else if (rarityClass === 'rarity-epic')            edgeClass = 'edge-epic';
  else if (rarityClass === 'rarity-rare')            edgeClass = 'edge-rare';

  const nameParts = card.name ? card.name.split(' ') : ['?', '?'];
  const initials  = nameParts.length > 1
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : nameParts[0].slice(0, 2).toUpperCase();

  const newClass = (card.isNew && context === 'inventory') ? 'is-new-glow' : '';
  const currentLevel = card.level || 1;
  const levelBadge = (
    <div className={`level-badge lvl-${currentLevel}`}>
      LVL {currentLevel === 3 ? 'MAX' : `${currentLevel}/3`}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────
  // EFFECT CARD (Jetzt wieder inkl. Synergien!)
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
              
              {/* FIX: Die verlorenen Synergien sind zurück! */}
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
  const photoSrc = getPhoto(card.name);

  let displayTitle = card.title;
  if (isApex)   displayTitle = `${card.year || ''} // ${card.event || card.title || ''}`.toUpperCase();
  else if (isLegacy) displayTitle = card.year || card.date || card.title;

  return (
    <div className="card-3d-wrapper" ref={wrapperRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div className={`card-edge ${edgeClass}`}></div>

      <div ref={cardRef} className={`card-ui ${rarityClass} ${isAnomaly ? 'type-anomaly' : isApex ? 'type-apex' : isLegacy ? 'type-legacy' : ''} ${newClass}`}>

        {photoSrc && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '65%', zIndex: 1, pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)'
          }}>
            <img src={photoSrc} alt={card.name} style={{
              width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 10%',
              filter: 'saturate(0.65) contrast(1.1) brightness(0.95)'
            }} />
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
          {isAnomaly ? '⚠ SYSTEM ANOMALY ⚠' : isApex ? 'APEX UNIT' : isLegacy ? 'LEGACY ASSET' : 'SYSTEM AGENT'}
        </div>

        <div className="card-header parallax-layer">
          {!photoSrc && <div className="card-avatar frame-break-avatar">{initials}</div>}
          <div className="card-info" style={{ textAlign: 'left' }}>
            <div className="card-name" style={photoSrc ? { textShadow: '0 2px 10px rgba(0,0,0,1), 0 0 15px rgba(0,0,0,0.8)' } : {}}>
              {card.name}
            </div>
            <div className="card-title" style={photoSrc ? { textShadow: '0 2px 8px rgba(0,0,0,1)' } : {}}>
              {displayTitle}
            </div>
          </div>
        </div>

        <div className="c-center-visual parallax-layer">
          {!photoSrc && <div className="radar-wrapper"><NeuralCore color={themeColor} /></div>}
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