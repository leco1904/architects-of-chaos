import React, { useRef, useEffect, useState, memo } from 'react';

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


export function getRarityClass(gti) {
  if (gti >= 95) return 'rarity-legendary';
  if (gti >= 88) return 'rarity-epic';
  if (gti >= 80) return 'rarity-rare';
  return 'rarity-common';
}

// NEU: Deterministischer Fraktions-Boost. Jede Fraktion bekommt automatisch 2 einzigartige Kern-Stats!
export function getFactionBuffs(faction) {
  if (!faction) return {};
  let h = 0;
  for (let i = 0; i < faction.length; i++) h = Math.imul(31, h) + faction.charCodeAt(i) | 0;
  h = Math.abs(h);
  const keys = ['tech','finance','manipulation','erosion','kingmaking','system','arsenal','legitimacy'];
  return {
    [keys[h % 8]]: 20,
    [keys[(h + 3) % 8]]: 15
  };
}

// Globaler Cache – vergisst nie, welche Bilder fehlen
const globalImgExts = {};
const globalImgFails = {};

// Extrahiert den Nachnamen (letztes Wort) und normalisiert ihn zum Dateinamen
// z.B. "Alex Jones" → "jones", "Vladimir Putin" → "putin", "Sun Tzu" → "tzu"
const getSmartFileName = (name) => {
  const parts = (name || '').trim().split(/\s+/);
  const lastName = parts[parts.length - 1];
  return lastName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Akzente entfernen
    .replace(/[^a-z0-9]/g, '')       // Alles außer Buchstaben/Zahlen raus
    || 'unknown';
};

// Wandelt den Kartennamen in deinen Dateinamen um (z.B. "Zero-Day Exploit" -> "zerodayexploit")
const getSafeImageName = (name) => {
  if (!name) return 'default';
  return name.toLowerCase()
    .replace(/ö/g, 'oe')
    .replace(/ä/g, 'ae')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, ''); // Entfernt Leerzeichen, Bindestriche etc.
};

const Card = memo(function Card({
  card, context = 'deck', activeEffect = null, apexBuffs = {}, activeCrisis = null,
  curCategory = '', isPlayerTurn = true, onStatClick, isInspecting = false,
  lightGyro = false,
  highlightSynergyStat = null,
  lockedStat = null,
  isFactionSynergyActive = false,
  forceArtOnly = false   /* NEU: überspringt Stats/Header im DOM komplett */
}) {
  const wrapperRef = useRef(null);
  const cardRef    = useRef(null);

  // FIX #1: renderTrigger wurde deklariert aber nie gelesen → ESLint no-unused-vars.
  // Destructure mit _ um klarzumachen dass der Wert absichtlich ignoriert wird.
  const [, setRenderTrigger] = useState(0);
  const [hoveredStat, setHoveredStat] = useState(null);

  // ── Flip-Feature (nur in Lexikon & Pack-Opening) ───────────────────────────
  // 0 = Art-Only, 1 = Full Card, 2 = Rückseite
  const isFlipContext = context === 'lexicon' || context === 'reveal';
  const [flipState, setFlipState] = useState(isFlipContext ? 0 : 1);
  const [isFlipping, setIsFlipping] = useState(false);

  const handleCardClick = () => {
    if (!isFlipContext || isFlipping || !wrapperRef.current) return;

    const el = wrapperRef.current;

    if (flipState === 0) {
      // Art → Full: simples Einblenden ohne Flip
      setFlipState(1);
      return;
    }

    // Full ↔ Back: Flip-Animation (JS-gesteuert, kein preserve-3d)
    const targetState = flipState === 1 ? 2 : 0;
    setIsFlipping(true);

    // Phase 1: zur Seite rotieren (einklappen)
    el.style.transition = 'transform 0.22s ease-in';
    el.style.transform  = 'perspective(1500px) rotateY(90deg) scale(1)';

    setTimeout(() => {
      // Inhalt tauschen wenn die Karte "auf der Kante" steht
      setFlipState(targetState);
      // Phase 2: von der anderen Seite aufklappen
      el.style.transition = 'none';
      el.style.transform  = 'perspective(1500px) rotateY(-90deg) scale(1)';
      // requestAnimationFrame nötig damit transition: none greift
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.22s ease-out';
          el.style.transform  = 'perspective(1500px) rotateY(0deg) scale(1)';
          setTimeout(() => {
            el.style.transition = '';
            setIsFlipping(false);
          }, 220);
        });
      });
    }, 220);
  };

  const currentExt = globalImgExts[card?.name] || '.png';
  const isFailed   = globalImgFails[card?.name] || false;

  // Gyro-Effekt (Mobile)
  useEffect(() => {
    if (!wrapperRef.current || !cardRef.current) return;
    if (!isInspecting && !lightGyro) {
      wrapperRef.current.style.transform = `rotateX(0deg) rotateY(0deg)`;
      return;
    }

    const handleOrientation = (e) => {
      let { beta, gamma } = e;
      if (beta === null || gamma === null) return;
      beta  = Math.max(-45, Math.min(45, beta - 45));
      gamma = Math.max(-45, Math.min(45, gamma));
      const rotX = -(beta / 3);
      const rotY = (gamma / 3);

      const multiplier  = lightGyro ? 1.2 : 2;
      const scaleFactor = lightGyro ? 1   : 1.05;
      const glareMult   = lightGyro ? 0.5 : 1;

      const innerCard = cardRef.current;
      wrapperRef.current.style.transform = `rotateX(${rotX * multiplier}deg) rotateY(${rotY * multiplier}deg) scale(${scaleFactor})`;
      innerCard.style.setProperty('--x',  `${50 + (gamma * glareMult)}%`);
      innerCard.style.setProperty('--y',  `${50 + (beta  * glareMult)}%`);
      innerCard.style.setProperty('--px', `${-rotY * multiplier}px`);
      innerCard.style.setProperty('--py', `${rotX  * multiplier}px`);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isInspecting, lightGyro]);

  if (!card) return null;

  // ── Maus-Hover (Desktop 3D-Tilt) ──────────────────────────────────────────
  const handleMouseMove = (e) => {
    // Kein Tilt im Art-Only-Modus oder beim Flippen
    if (flipState === 0 || isFlipping) return;
    if (window.matchMedia('(hover: none)').matches || isInspecting || !wrapperRef.current || !cardRef.current) return;

    const wrapper   = wrapperRef.current;
    const innerCard = cardRef.current;
    const rect      = wrapper.getBoundingClientRect();
    const x         = e.clientX - rect.left;
    const y         = e.clientY - rect.top;
    const cx        = rect.width  / 2;
    const cy        = rect.height / 2;
    const rotX      = -((y - cy) / cy) * 4;
    const rotY      = ((x - cx) / cx) * 4;

    wrapper.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.01)`;
    innerCard.style.setProperty('--x',  `${(x / rect.width)  * 100}%`);
    innerCard.style.setProperty('--y',  `${(y / rect.height) * 100}%`);
    innerCard.style.setProperty('--px', `${-rotY}px`);
    innerCard.style.setProperty('--py', `${rotX}px`);
  };

  const handleMouseLeave = () => {
    if (!wrapperRef.current) return;
    wrapperRef.current.style.transform = `rotateX(0deg) rotateY(0deg) scale(1)`;
  };

  // ── Karten-Typ ────────────────────────────────────────────────────────────
  const isApex    = card.type === 'apex';
  const isLegacy  = card.type === 'legacy';
  const isAnomaly = card.type === 'anomaly';
  const isEffect  = card.type === 'effect' || card.buff !== undefined || card.cost !== undefined;
  const isAvatar  = card.id === 'avatar'; 

  // NEU: Level & Dynamischer GTI (+1 pro Level-Up) zuerst berechnen!
  const currentLevel = card.level || 1;
  const dynamicGti = (card.gti || 0) + (currentLevel > 1 ? currentLevel - 1 : 0);

  // ── Rarity & Farben ───────────────────────────────────────────────────────
  const rarityClass = getRarityClass(dynamicGti);

  const themeColor = isAvatar   ? '#bc13fe'
    : isAnomaly  ? '#ff0000'
    : isApex     ? 'var(--apex-pink)'
    : isLegacy   ? 'var(--legacy-sepia)'
    : isEffect   ? 'var(--eff-col)'
    : rarityClass === 'rarity-legendary' ? 'var(--r-leg)'
    : rarityClass === 'rarity-epic'      ? 'var(--r-epi)'
    : rarityClass === 'rarity-rare'      ? 'var(--r-rar)'
    : 'var(--r-com)';

  const edgeClass = isAvatar  ? 'edge-avatar'
    : isAnomaly ? 'edge-anomaly'
    : isApex    ? 'edge-apex'
    : isLegacy  ? 'edge-legacy'
    : rarityClass === 'rarity-legendary' ? 'edge-legendary'
    : rarityClass === 'rarity-epic'      ? 'edge-epic'
    : rarityClass === 'rarity-rare'      ? 'edge-rare'
    : 'edge-common';

  // ── Hilfsvariablen ────────────────────────────────────────────────────────
  const newClass = card.isNew ? 'is-new-glow' : '';

  // GTI color shifts with level: default rarity color → cyan (lvl2) → gold (lvl3+)
  const gtiColor = currentLevel >= 3 ? 'var(--ep)' : currentLevel === 2 ? 'var(--win)' : themeColor;

  const levelBadge = currentLevel > 1 ? (
    <div className={`level-badge mono lvl-${Math.min(currentLevel, 3)}`}>LVL {currentLevel}</div>
  ) : null;

  // ── Foto ──────────────────────────────────────────────────────────────────
  // Effekte nutzen den kompletten Dateinamen (z.B. "boersencrash"), Agenten den Nachnamen
  const fileName  = isEffect ? getSafeImageName(card.name) : getSmartFileName(card.name);
  const base      = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) ? import.meta.env.BASE_URL : '/';
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  
  // Effekte werden in /photos/effects/ gesucht, Agenten im Hauptordner
  const photoSrc  = isEffect 
    ? `${cleanBase}/photos/effects/${fileName}${currentExt}`
    : `${cleanBase}/photos/${fileName}${currentExt}`;

  const handleImgError = () => {
    if (currentExt === '.png') {
      globalImgExts[card.name] = '.jpg';
    } else if (currentExt === '.jpg') {
      globalImgExts[card.name] = '.jpeg';
    } else {
      globalImgFails[card.name] = true;
    }
    setRenderTrigger(prev => prev + 1);
  };

  // ── Titel ─────────────────────────────────────────────────────────────────
  let displayTitle = card.title;
  if (isApex)        displayTitle = `${card.year || ''} // ${card.event || card.title || ''}`.toUpperCase();
  else if (isLegacy) displayTitle = card.year || card.date || card.title;

  // ── JSX ───────────────────────────────────────────────────────────────────
  // WICHTIG: filter darf NICHT auf card-3d-wrapper sein (bricht preserve-3d).
  // Daher äußerer div für den drop-shadow, innerer für die 3D-Transforms.

  // ── Rückseiten-Inhalt (flipState === 2) ───────────────────────────────────
  const typeLabel = isAnomaly ? '⚠ SYSTEM ANOMALY ⚠'
    : isApex ? '◈ APEX UNIT ◈' : isLegacy ? '⌬ LEGACY ASSET ⌬'
    : isEffect ? '◈ TAKTIK KARTE ◈' : '⬡ SYSTEM AGENT ⬡';
  const rarityLabel = (isApex ? 'APEX' : isLegacy ? 'LEGACY' : isAnomaly ? 'ANOMALY'
    : rarityClass.replace('rarity-', '')).toUpperCase();

  const cardBack = (
    <div className={`card-back ${edgeClass} ${rarityClass}`} style={{ '--theme': themeColor }}>
      {/* Layers */}
      <div className="card-back-pattern" aria-hidden="true"></div>
      <div className="cb-scanlines"      aria-hidden="true"></div>
      <div className="cb-corner cb-corner-tl" aria-hidden="true"></div>
      <div className="cb-corner cb-corner-br" aria-hidden="true"></div>

      <div className="card-back-content">
        {/* Status bar */}
        <div className="cb-status-bar">
          <span className="cb-status-node mono">⬡ SECURED NODE</span>
          <span className="cb-status-enc  mono">ENC: 100%</span>
        </div>

        {/* Identity */}
        <div className="cb-classified mono">{typeLabel}</div>
        <div className="cb-name">{card.name}</div>
        <div className="cb-faction" style={{ color: themeColor }}>{card.faction || '—'}</div>

        {/* Divider */}
        <div className="cb-divider"></div>

             {/* Active datapad */}
        <div className="cb-datapad">
          <div className="cb-datapad-header">
            <span className="cb-dp-dot"  aria-hidden="true"></span>
            <span className="mono">CLASSIFIED DOSSIER</span>
            <span className="cb-dp-live mono">LIVE</span>
          </div>
          <div className="cb-datapad-text">
            {isEffect ? (
              <><span className="cb-hl">EFFEKT:</span>{' '}
              +{card.buff} {CAT_CONFIG[card.stat]?.name} — Kosten: {card.cost}⚡
              {card.syn && <><br/><span className="cb-muted">SYN: {Array.isArray(card.syn) ? card.syn.join(', ') : card.syn}</span></>}</>
            ) : isApex && card.passiveBuff ? (
              <><span className="cb-hl-gold">PASSIV-KOMPETENZ:</span>{' '}
              +{card.passiveBuff.val} {CAT_CONFIG[card.passiveBuff.stat]?.name}
              {(card.backText || card.bio) && <><br/><br/>{card.backText || card.bio}</>}</>
            ) : (card.backText || card.bio || '— Keine weiteren Informationen verfügbar —')}
          </div>
          <div className="cb-datapad-footer mono">
            <span>NODE_SYS</span><span>▸▸▸</span><span>AUTH: GRANTED</span>
          </div>
        </div>

        {/* Footer */}
        <div className="cb-footer mono">
          <span>GTI <b style={{ color: gtiColor }}>{dynamicGti}</b></span>
          <span className="cb-footer-mid">// ARCHITECTS OF CHAOS //</span>
          <span style={{ color: themeColor }}>{rarityLabel}</span>
        </div>
      </div>
    </div>
  );

  // FIX #2: fBuffs wurde in JEDER der 8 stat-Iterationen neu berechnet
  // (getFactionBuffs lief 8× mit identischem Ergebnis). Einmal hier berechnen.
  const fBuffs = isFactionSynergyActive ? getFactionBuffs(card.faction) : {};

  return (
    <div className={`synergy-aura-host${isFactionSynergyActive ? ' synergy-aura-active' : ''}`}>
      {/* Golden aura sits behind the card in the DOM — painted beneath card-drop-shadow */}
      {isFactionSynergyActive && <div className="synergy-aura-glow" aria-hidden="true" />}
      <div className="card-drop-shadow">
    <div
      className={`card-3d-wrapper ${isFlipContext ? 'is-flip-context' : ''} ${flipState === 0 ? 'flip-art-only' : ''}`}
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
      style={{ cursor: isFlipContext ? 'pointer' : 'default' }}
    >
      {/* Rückseite */}
      {flipState === 2 ? (
        <>
          <div className={`card-edge ${edgeClass}`}></div>
          {cardBack}
        </>
      ) : (
        <>
      <div className={`card-edge ${edgeClass}`}></div>
      <div
        ref={cardRef}
        className={`card-ui ${rarityClass} ${isAnomaly ? 'type-anomaly' : isApex ? 'type-apex' : isLegacy ? 'type-legacy' : ''} ${newClass} ${flipState === 0 ? 'card-art-only' : ''} ${flipState === 0 && isFailed ? 'card-art-no-photo' : ''} ${isAvatar ? 'is-avatar-card' : ''}`}
      >
        {/* Karten-Foto */}
        {!isFailed && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '65%', zIndex: 1,
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)'
          }}>
            <img
              src={photoSrc}
              alt={card.name}
              loading="lazy"
              decoding="async"
              onError={handleImgError}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 10%', filter: 'saturate(0.65) contrast(1.1) brightness(0.95)' }}
            />
          </div>
        )}

        <div className="card-foil"></div>
        <div className="card-glare"></div>
        <div className="card-scanlines"></div>

        <div className="vertical-faction-tab" style={{ color: themeColor, zIndex: 15 }}>{card.faction}</div>

        {levelBadge}

        <div className="card-tags-container parallax-layer">
          {card.isNew           && <div className="new-tag">NEW</div>}
          {card.isLevelUp       && <div className="levelup-tag">LEVEL UP!</div>}
          {card.isMaxLevelRefund && <div className="refund-tag">MAX LVL (+{card.gti >= 90 ? 100 : 50}💳)</div>}
        </div>

        {/* Alles folgende wird im art-only Modus NICHT gerendert → kein DOM, kein Rechenaufwand */}
        {!forceArtOnly && (<>

        {/* GTI Rating (für Agenten) ODER Energie-Kosten (für Effekte) */}
        {!isEffect ? (
          <div className="gti-core parallax-layer" style={{ '--gti-color': gtiColor }}>
            <div className="gti-label">RATING</div>
            <div className="gti-value mono" style={{ color: gtiColor }}>{dynamicGti}</div>
            <div className="gti-bracket"></div>
          </div>
        ) : (
          <div className="gti-core parallax-layer" style={{ '--gti-color': 'var(--ep)' }}>
            <div className="gti-label" style={{ letterSpacing: '1px' }}>KOSTEN</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
              <div style={{ fontSize: '1.1rem', filter: 'drop-shadow(0 0 5px var(--ep))', transform: 'translateY(-1px)' }}>⚡</div>
              <div className="gti-value mono" style={{ color: 'var(--ep)' }}>{card.cost}</div>
            </div>
          </div>
        )}

        <div className="type-badge parallax-layer">
          {isAvatar ? '⬡ GHOST AGENT' : isAnomaly ? 'SYSTEM ANOMALY' : isApex ? 'APEX UNIT' : isLegacy ? 'LEGACY ASSET' : isEffect ? 'TAKTIK KARTE' : 'SYSTEM AGENT'}
        </div>

        <div className="card-header parallax-layer">
          {isFailed && <div className="card-avatar frame-break-avatar" />}
          <div className="card-info" style={{ textAlign: 'left' }}>
            <div className="card-name"  style={!isFailed ? { textShadow: '0 2px 10px rgba(0,0,0,1), 0 0 15px rgba(0,0,0,0.8)' } : {}}>{card.name}</div>
            <div className="card-title" style={!isFailed ? { textShadow: '0 2px 8px rgba(0,0,0,1)' } : {}}>{displayTitle}</div>
          </div>
        </div>

        <div className="c-center-visual parallax-layer">
          {isFailed && <div className="radar-wrapper"><NeuralCore color={themeColor} /></div>}
          <div className="c-text-wrap">
            {isAvatar && card.bio ? (
              <div className="c-bio" style={{ color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', textShadow: '0 1px 8px rgba(0,0,0,1)' }}>
                "{card.bio}"
              </div>
            ) : isApex && card.passiveBuff ? (
              <div className="apex-passive-info">
                <b style={{ color: 'var(--ep)' }}>+{card.passiveBuff.val} {CAT_CONFIG[card.passiveBuff.stat]?.name}</b>
                <small>PASSIV-KOMPETENZ</small>
              </div>
            ) : isEffect ? (
              <div className="apex-passive-info" style={{ gap: '10px' }}>
                <b style={{ color: 'var(--eff-col)', fontSize: '1.3rem' }}>
                  +{card.buff} {CAT_CONFIG[card.stat]?.name}
                </b>
                {card.syn && (
                  <small style={{ color: '#aaa', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '5px', width: '100%' }}>
                    SYN: {Array.isArray(card.syn) ? card.syn.join(', ') : card.syn}
                  </small>
                )}
              </div>
            ) : (
              <div className="c-bio">"{card.bio}"</div>
            )}
          </div>
        </div>

        {/* Stats nur für Nicht-Effekt-Karten */}
        {!isEffect && (
          <div className="card-stats parallax-layer">
          {STAT_KEYS.map(k => {
            let val = Math.floor(card[k] ?? card.stats?.[k] ?? 0);
            val += (currentLevel - 1) * 2;

            // apexBuffs unterstützt beide Formate: { val, sources } (MatchEngine) und Zahl (Legacy)
            const apexEntry = apexBuffs[k];
            const apexVal   = apexEntry?.val ?? apexEntry ?? 0;
            val += apexVal;

            // fBuffs ist einmal außerhalb des map() berechnet (FIX #2)
            val += fBuffs[k] || 0;

            let effBuff  = 0;
            let synBonus = 0;
            if (activeEffect && activeEffect.stat === k) {
              effBuff  = activeEffect.buff;
              if (activeEffect.syn?.includes(card.name)) synBonus = activeEffect.synBuff ?? 0;
            }
            val += effBuff + synBonus;

            let crisisMult      = 1;
            let isCrisisAffected = false;

            if (activeCrisis) {
              if ((activeCrisis.id === 'HYPERINFLATION' && k === 'finance') || (activeCrisis.id === 'BLACKOUT' && k === 'tech')) {
                val = 0; isCrisisAffected = true;
              } else if (activeCrisis.id === 'NUCLEAR_WAR' && k === 'arsenal')    { crisisMult = 1.5; isCrisisAffected = true; }
              else if   (activeCrisis.id === 'ANARCHY'     && k === 'erosion')    { crisisMult = 1.5; isCrisisAffected = true; }
              else if   (activeCrisis.id === 'NWO'         && k === 'kingmaking') { crisisMult = 1.5; isCrisisAffected = true; }
            }
            val = Math.floor(val * crisisMult);

            const isSelected    = curCategory === k;
            const isLocked      = lockedStat === k;
            const selectedClass = isSelected ? (isPlayerTurn ? 'selected-player' : 'selected-ai') : '';
            const statStyle     = { color: isCrisisAffected ? 'var(--lose)' : '#fff' };

            const fillPct  = Math.min(100, Math.max(0, val));
            const barColor = val >= 100 ? 'var(--apex-pink)' : val >= 90 ? 'var(--ep)' : val >= 70 ? 'var(--win)' : '#444';

            // ── Boost-Quellen für Tooltip ──────────────────────────────────
            const totalBoost = apexVal + effBuff + synBonus + (fBuffs[k] || 0);
            const boostSources = [];
            if (apexVal > 0) {
              const srcs = apexEntry?.sources;
              if (srcs?.length) srcs.forEach(s => boostSources.push(`${s} (Apex)`));
              else boostSources.push('Apex Einheit');
            }
            if (effBuff > 0 && activeEffect) boostSources.push(activeEffect.name || 'Taktik');
            if (synBonus > 0 && activeEffect) boostSources.push(`${activeEffect.name} Synergie`);
            if (fBuffs[k] > 0) boostSources.push(`${card.faction} Fraktion`);

            return (
              <div
                key={k}
                className={`card-stat ${selectedClass} ${highlightSynergyStat === k ? 'synergy-active-glow' : ''}`}
                onClick={isLocked ? undefined : () => onStatClick?.(k)}
                onMouseEnter={() => setHoveredStat(`${k}_locked`)}
                onMouseLeave={() => setHoveredStat(null)}
                style={{
                  /* FIX: Opacity hier entfernt, damit der Tooltip 100% sichtbar bleibt! */
                  cursor: isLocked ? 'not-allowed' : (onStatClick ? 'pointer' : 'default'),
                  background: isLocked ? 'rgba(255,0,50,0.15)' : '',
                  border: isLocked ? '1px solid rgba(255,0,50,0.3)' : '1px solid transparent',
                  position: 'relative'
                }}
              >
                {/* Tooltip für Cooldown / gelockte Stats */}
                {isLocked && hoveredStat === `${k}_locked` && (
                  <div style={{
                    position: 'absolute', bottom: '90%', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(10,10,15,0.98)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid var(--lose)', padding: '6px 12px', borderRadius: '4px',
                    zIndex: 99999, whiteSpace: 'nowrap', pointerEvents: 'none',
                    boxShadow: '0 0 20px rgba(255,0,50,0.6)'
                  }}>
                    <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--lose)', letterSpacing: '1px', fontWeight: 'bold' }}>
                      STAT GESPERRT (COOLDOWN)
                    </div>
                  </div>
                )}
                <div className="stat-header" style={{ opacity: isLocked ? 0.3 : 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {STAT_ICONS[k]}
                    {CAT_CONFIG[k].name} {isLocked && '🔒'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '3px', flexShrink: 0, minWidth: '44px' }}>
                    {totalBoost > 0 && (
                      <span
                        className="mono"
                        style={{ position: 'relative', color: 'var(--eff-col)', fontSize: '0.62rem', lineHeight: 1, cursor: 'help' }}
                        onMouseEnter={() => setHoveredStat(k)}
                        onMouseLeave={() => setHoveredStat(null)}
                      >
                        +{totalBoost}
                        {hoveredStat === k && boostSources.length > 0 && (
                          <div style={{
                            position: 'absolute', bottom: '140%', right: 0,
                            background: 'rgba(10,10,15,0.95)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            border: '1px solid var(--win)',
                            borderLeft: '2px solid var(--eff-col)',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            zIndex: 1000,
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            boxShadow: '0 0 15px rgba(0,229,255,0.15)',
                          }}>
                            {boostSources.map((s, i) => (
                              <div key={i} className="mono" style={{ fontSize: '0.58rem', color: 'var(--win)', letterSpacing: '1px', lineHeight: 1.6 }}>
                                {s}
                              </div>
                            ))}
                          </div>
                        )}
                      </span>
                    )}
                    <b className={`mono ${val >= 100 ? 'stat-val-max' : ''}`}
                       style={{ ...statStyle, minWidth: '1.8ch', textAlign: 'right', display: 'inline-block' }}>{val}</b>
                  </div>
                </div>
                <div className="stat-bar-bg" style={{ opacity: isLocked ? 0.3 : 1 }}>
                  <div
                    className="stat-bar-fill"
                    style={{ width: `${fillPct}%`, background: barColor, boxShadow: val >= 70 ? `0 0 5px ${barColor}` : 'none' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        )}

        <div className="card-micro-data mono parallax-layer">LOC: SYS_NODE // AUTH: GRANTED</div>

        </>)} {/* end !forceArtOnly */}
      </div>
        </>
      )}
    </div>
    </div>
    </div>
  );
});

export default Card;