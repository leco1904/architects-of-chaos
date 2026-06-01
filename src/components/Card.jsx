import React, { useRef, useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';

export const AVATAR_ARTS = [
  { id: 1, src: './photos/avatars/avatar1.jpeg', label: 'PHANTOM' },
  { id: 2, src: './photos/avatars/avatar2.jpeg', label: 'CIPHER' },
  { id: 3, src: './photos/avatars/avatar3.jpeg', label: 'SPECTER' },
  { id: 4, src: './photos/avatars/avatar4.jpeg', label: 'WRAITH' },
  { id: 5, src: './photos/avatars/avatar5.jpeg', label: 'ORACLE' },
];

export const CAT_CONFIG = {
  tech:         { name: 'Tech-Hebel',    short: 'TECH'     },
  finance:      { name: 'Finanzmacht',   short: 'FINANZ'   },
  manipulation: { name: 'Manipulation',  short: 'MANIP'    },
  erosion:      { name: 'Erosion',       short: 'EROSION'  },
  kingmaking:   { name: 'Schattenmacht', short: 'SCHATTEN' },
  system:       { name: 'Systemrisiko',  short: 'RISIKO'   },
  arsenal:      { name: 'Arsenal',       short: 'ARSENAL'  },
  legitimacy:   { name: 'Legitimität',   short: 'LEGIT'    },
};

export const STAT_ICONS = {
  tech: '⎈',         // Cyber-Hub / Netzwerk-Knoten
  finance: '⛃',      // Geldschein (Wirtschaft / Liquidität)
  manipulation: '⎇', // Alt/Weiche (Dinge in andere Bahnen lenken)
  erosion: '⏚',      // Erdung / Drain (Energie abziehen)
  kingmaking: '♚',   // Schachkönig (Schattenmacht / Einfluss)
  system: '⚠',       // Warnschild (Systemrisiko)
  arsenal: '☢',       // Nuklear-Zeichen (Militär / Arsenal)
  legitimacy: '⚖'    // Waage der Justiz (Wahrheit / Recht)
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

// Dynamische Fraktions-Icons
export function getFactionIcon(faction) {
  if (!faction) return '⬢';
  const f = (Array.isArray(faction) ? faction[0] : faction).toUpperCase();
  if (f.includes('HEGEMONY')) return '♕'; // Die weiße Krone
  if (f.includes('FINANCE')) return '⟠'; // Der Geldsack
  if (f.includes('TECH')) return '⌬'; // Molekularstruktur
  if (f.includes('NARRATIVE') || f.includes('MEDIA')) return '✧'; // Der Funke / Flash
  if (f.includes('ENERGY')) return '🛢'; // Ölfass
  if (f.includes('INTELLIGENCE')) return '◬'; // Das allsehende Auge
  if (f.includes('BUREAUCRACY')) return '🏛'; // Die Säulenhalle
  if (f.includes('SHADOW')) return '🕸'; // Spinnennetz
  if (f.includes('FANATICS')) return '✺'; // Fanatiker Funke/Sonne
  return '⬢'; // Cyberpunk Fallback Hexagon
}

// REPLACE
// Fraktions-Boost (Synchron mit gameLogic)
export function getFactionBuffs(faction) {
  if (!faction) return {};
  const facName = faction.trim().toLowerCase();
  if (facName === 'hegemony') return { legitimacy: 20, arsenal: 15 };
  if (facName === 'tech cartel') return { tech: 20, system: 15 };
  if (facName === 'finance elite') return { finance: 20, kingmaking: 15 };
  if (facName === 'narrative matrix') return { manipulation: 20, legitimacy: 15 };
  if (facName === 'fanatics') return { erosion: 20, manipulation: 15 };
  if (facName === 'shadow power') return { arsenal: 20, erosion: 15 };
  if (facName === 'intelligence syndicate') return { system: 20, tech: 15 };
  if (facName === 'bureaucracy apparatus') return { kingmaking: 20, finance: 15 };
  if (facName === 'energy oligarchs') return { finance: 20, tech: 15 };
  if (facName === 'megaminds') return { tech: 20, system: 15 };
  return { tech: 10, system: 10 };
}

// Globaler Bild-Cache
const globalImgExts  = {};
const globalImgFails = {};

// Extrahiert den Nachnamen, ignoriert ZusÃ¤tze wie I., II., Jr.
const getSmartFileName = (name) => {
  if (!name) return 'unknown';
  const ignoreList = ['i', 'ii', 'iii', 'iv', 'v', 'jr', 'sr'];
  const parts    = name.trim().split(/\s+/);
  let lastName   = parts[parts.length - 1];
  if (parts.length > 1 && ignoreList.includes(lastName.toLowerCase().replace(/[^a-z]/g, ''))) {
    lastName = parts[parts.length - 2];
  }
  return lastName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    || 'unknown';
};

// Wandelt den Kartennamen in einen sicheren Dateinamen um
const getSafeImageName = (name) => {
  if (!name) return 'default';
  return name.toLowerCase()
    .replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CARD COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const Card = memo(function Card({
  card,
  context             = 'deck',
  activeEffect        = null,
  apexBuffs           = {},
  activeCrisis        = null,
  curCategory         = '',
  isPlayerTurn        = true,
  onStatClick,
  isInspecting        = false,
  lightGyro           = false,
  highlightSynergyStat = null,
  lockedStat          = null,
  activeFactions      = [],
  isEffectSynergyHint = false,
  isSynergyHint       = false,  // NEU: Signal fÃ¼r Fraktions-Glow
  forceArtOnly        = false,  
  customColor         = null,   
  customArt           = null,   
}) {
  const wrapperRef = useRef(null);
  const cardRef    = useRef(null);

  const [, setRenderTrigger] = useState(0);
  const [hoveredStat, setHoveredStat] = useState(null);
  const [portalTooltip, setPortalTooltip] = useState(null);

  const showTooltip = (e, content) => {
    const ui = document.getElementById('game-ui');
    const zoom = ui ? (parseFloat(getComputedStyle(ui).zoom) || 1) : 1;
    setPortalTooltip({ x: e.clientX / zoom, y: e.clientY / zoom, content });
  };

  // â”€â”€ Flip-Feature (Lexikon & Pack-Opening) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isFlipContext = context === 'lexicon' || context === 'reveal';
  const [flipState,  setFlipState]  = useState(isFlipContext ? 0 : 1);
  const [isFlipping, setIsFlipping] = useState(false);

  const handleCardClick = (e) => {
    if (e) e.stopPropagation();
    if (!isFlipContext || isFlipping || !wrapperRef.current) return;
    const el = wrapperRef.current;

    if (flipState === 0) {
      setFlipState(1);
      return;
    }

    const targetState = flipState === 1 ? 2 : 0;
    setIsFlipping(true);

    el.style.transition = 'transform 0.22s ease-in';
    el.style.transform  = 'perspective(1500px) rotateY(90deg) scale(1)';

    setTimeout(() => {
      setFlipState(targetState);
      el.style.transition = 'none';
      el.style.transform  = 'perspective(1500px) rotateY(-90deg) scale(1)';
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

  // â”€â”€ Gyro-Effekt (Mobile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      const rotX = -(beta  / 3);
      const rotY =  (gamma / 3);

      const multiplier  = lightGyro ? 1.2 : 2;
      const scaleFactor = lightGyro ? 1   : 1.05;
      const glareMult   = lightGyro ? 0.5 : 1;

      wrapperRef.current.style.transform = `rotateX(${rotX * multiplier}deg) rotateY(${rotY * multiplier}deg) scale(${scaleFactor})`;
      cardRef.current.style.setProperty('--x',  `${50 + (gamma * glareMult)}%`);
      cardRef.current.style.setProperty('--y',  `${50 + (beta  * glareMult)}%`);
      cardRef.current.style.setProperty('--px', `${-rotY * multiplier}px`);
      cardRef.current.style.setProperty('--py', `${ rotX * multiplier}px`);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [isInspecting, lightGyro]);

  if (!card) return null;

  // â”€â”€ Maus-Hover (Desktop 3D-Tilt) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleMouseMove = (e) => {
    if (flipState === 0 || isFlipping) return;
    if (window.matchMedia('(hover: none)').matches || isInspecting || !wrapperRef.current || !cardRef.current) return;

    const wrapper   = wrapperRef.current;
    const innerCard = cardRef.current;
    const rect  = wrapper.getBoundingClientRect();
    const x     = e.clientX - rect.left;
    const y     = e.clientY - rect.top;
    const cx    = rect.width  / 2;
    const cy    = rect.height / 2;
    const rotX  = -((y - cy) / cy) * 4;
    const rotY  =  ((x - cx) / cx) * 4;

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

  // â”€â”€ Karten-Typ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isApex    = card.type === 'apex';
  const isLegacy  = card.type === 'legacy';
  const isAnomaly = card.type === 'anomaly';
  const isEffect  = card.type === 'effect' || card.buff !== undefined || card.cost !== undefined;
  const isAvatar  = card.id   === 'avatar';

  // Level & Dynamischer GTI
  const currentLevel = card.level || 1;
  const dynamicGti   = (card.gti || 0) + (currentLevel > 1 ? currentLevel - 1 : 0);

  // ── Rarity & Farben (Immer auf den reinen Basis-GTI anwenden!) ──
  const baseGti     = card.gti || 0;
  const rarityClass = getRarityClass(baseGti);

  // customColor Ã¼berschreibt die Avatar-Standardfarbe (lila) sowie alle anderen
  // Karten-Typen wenn explizit gesetzt — alle anderen Typen bleiben unberÃ¼hrt.
  const themeColor =
    (isAvatar && (customColor || card.customColor)) ? (customColor || card.customColor)
    : isAvatar   ? '#bc13fe'
    : isAnomaly  ? '#ff0000'
    : isApex     ? 'var(--apex-pink)'
    : isLegacy   ? 'var(--legacy-sepia)'
    : isEffect   ? 'var(--eff-col)'
    : rarityClass === 'rarity-legendary' ? 'var(--r-leg)'
    : rarityClass === 'rarity-epic'      ? 'var(--r-epi)'
    : rarityClass === 'rarity-rare'      ? 'var(--r-rar)'
    : 'var(--r-com)';

  const edgeClass =
    isAvatar  ? 'edge-avatar'
    : isAnomaly ? 'edge-anomaly'
    : isApex    ? 'edge-apex'
    : isLegacy  ? 'edge-legacy'
    : rarityClass === 'rarity-legendary' ? 'edge-legendary'
    : rarityClass === 'rarity-epic'      ? 'edge-epic'
    : rarityClass === 'rarity-rare'      ? 'edge-rare'
    : 'edge-common';

  const newClass   = card.isNew ? 'is-new-glow' : '';
  
  // Dynamische Level-Farben: 2=Blau, 3=Gelb, 4=Grün, 5+=Rot
  const gtiColor = currentLevel >= 5 ? '#ff0055' 
                 : currentLevel === 4 ? '#00ff44' 
                 : currentLevel === 3 ? 'var(--ep)' 
                 : currentLevel === 2 ? 'var(--win)' 
                 : themeColor;

  const levelBadge = currentLevel > 1
    ? <div className={`level-badge mono lvl-${Math.min(currentLevel, 5)}`}>LVL {currentLevel}</div>
    : null;

  // ── Foto-Quelle ──────────────────────────────────────────────────────────
  const fileName  = isEffect ? getSafeImageName(card.name) : getSmartFileName(card.name);
  
  // FIX: Wir erzwingen für Electron immer den relativen Pfad (.)
  const cleanBase = '.';

  // FIX: Wir beziehen jetzt card.photo mit ein, da die App.jsx Leon diesen Wert übergibt!
  const customAvatarArt = customArt || card.customArt || card.photo;

  let photoSrc = '';
  if (isAvatar && customAvatarArt) {
      // Wenn es ein Avatar ist, schneiden wir die starre Endung ab und nutzen
      // die intelligente Fallback-Endung (currentExt) von React!
      const pathWithoutExt = customAvatarArt.substring(0, customAvatarArt.lastIndexOf('.'));
      const finalPath = `${pathWithoutExt}${currentExt}`;
      
      // Falls der Pfad schon "photos/" enthält (wie im AVATAR_ARTS Array)
      photoSrc = finalPath.includes('photos/') 
          ? (finalPath.startsWith('.') ? finalPath : `.${finalPath}`) 
          : `${cleanBase}/photos/${finalPath}`;
  } else if (isEffect) {
      photoSrc = `${cleanBase}/photos/effects/${fileName}${currentExt}`;
  } else {
      photoSrc = `${cleanBase}/photos/${fileName}${currentExt}`;
  }

  const handleImgError = () => {
    if (currentExt === '.png')  { globalImgExts[card.name] = '.jpg';  }
    else if (currentExt === '.jpg') { globalImgExts[card.name] = '.jpeg'; }
    else { globalImgFails[card.name] = true; }
    setRenderTrigger(prev => prev + 1);
  };

  // â”€â”€ Titel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let displayTitle = card.title;
  if (isApex)        displayTitle = `${card.year || ''} // ${card.event || card.title || ''}`.toUpperCase();
  else if (isLegacy) displayTitle = card.year || card.date || card.title;

  // â”€â”€ RÃ¼ckseiten-Inhalt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const typeLabel  = isAnomaly ? '⚠  SYSTEM ANOMALY ⚠ '
    : isApex    ? '◈ˆ APEX UNIT ◈ˆ'
    : isLegacy  ? '✓¬ LEGACY ASSET ✓¬'
    : isEffect  ? '◈ˆ TAKTIK KARTE ◈ˆ'
    : '⬡ SYSTEM AGENT ⬡';
  const rarityLabel = (
    isApex ? 'APEX' : isLegacy ? 'LEGACY' : isAnomaly ? 'ANOMALY'
    : rarityClass.replace('rarity-', '')
  ).toUpperCase();

  const cardBack = (
    <div className={`card-back ${edgeClass} ${rarityClass}`} style={{ '--theme': themeColor }}>
      <div className="card-back-pattern"  aria-hidden="true"/>
      <div className="cb-scanlines"       aria-hidden="true"/>
      <div className="cb-corner cb-corner-tl" aria-hidden="true"/>
      <div className="cb-corner cb-corner-br" aria-hidden="true"/>

      <div className="card-back-content">
        <div className="cb-status-bar">
          <span className="cb-status-node mono">⬡ SECURED NODE</span>
          <span className="cb-status-enc  mono">ENC: 100%</span>
        </div>
        <div className="cb-classified mono">{typeLabel}</div>
        <div className="cb-name">{card.name}</div>
        <div className="cb-faction" style={{ color: themeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          {card.faction && <span style={{ fontSize: '1.2rem', textShadow: `0 0 10px ${themeColor}` }}>{getFactionIcon(card.faction)}</span>}
          {Array.isArray(card.faction) ? card.faction.join(' & ') : (card.faction || '—')}
        </div>
        <div className="cb-divider"/>
        <div className="cb-datapad">
          <div className="cb-datapad-header">
            <span className="cb-dp-dot"  aria-hidden="true"/>
            <span className="mono">CLASSIFIED DOSSIER</span>
            <span className="cb-dp-live mono">LIVE</span>
          </div>
          <div className="cb-datapad-text">
            {isEffect ? (
              <><span className="cb-hl">EFFEKT:</span>{' '}
              +{(Number(card.buffPercent) || 0) + ((card.level || 1) - 1) * 2}% {CAT_CONFIG[card.stat]?.name || "Unbekannt"} — Kosten: {card.cost}⚡
              {card.syn && <><br/><span className="cb-muted">SYNERGIE (x2): {Array.isArray(card.syn) ? card.syn.join(', ') : card.syn.toString()}</span></>}</>
            ) : (isApex || isAnomaly) && card.passiveBuff ? (
              <><span className="cb-hl-gold">{isAnomaly ? 'ANOMALY-KOMPETENZ:' : 'PASSIV-KOMPETENZ:'}</span>{' '}
              +{card.passiveBuff.val * (card.level || 1)} {CAT_CONFIG[card.passiveBuff.stat]?.name}{(card.level || 1) > 1 ? ` (LVL ${card.level})` : ''}
              {(card.backText || card.bio) && <><br/><br/>{card.backText || card.bio}</>}</>
            ) : (card.backText || card.bio || '— Keine weiteren Informationen verfügbar —')}
          </div>
          <div className="cb-datapad-footer mono">
            <span>NODE_SYS</span><span>▸¸▸¸▸¸</span><span>AUTH: GRANTED</span>
          </div>
        </div>
        <div className="cb-footer mono">
          <span>GTI <b style={{ color: gtiColor }}>{dynamicGti}</b></span>
          <span className="cb-footer-mid">// ARCHITECTS OF CHAOS //</span>
          <span style={{ color: themeColor }}>{rarityLabel}</span>
        </div>
      </div>
    </div>
  );

  // FIX: fBuffs nur für die Fraktionen berechnen, die auch WIRKLICH >=3x im Deck sind!
  const cardFactions = Array.isArray(card.faction) ? card.faction : (card.faction ? [card.faction] : []);
  const isFactionSynergyActive = cardFactions.some(f => activeFactions.includes(f.trim().toUpperCase()));
  const isFirstFacActive = cardFactions.length > 0 && activeFactions.includes(cardFactions[0].trim().toUpperCase());
  const isSecondFacActive = cardFactions.length > 1 && activeFactions.includes(cardFactions[1].trim().toUpperCase());

  const fBuffs = {};
  const fBuffSources = {}; // NEU: Merkt sich die exakte Herkunft pro Stat
  
  if (isFactionSynergyActive) {
    cardFactions.forEach(fac => {
      if (activeFactions.includes(fac.trim().toUpperCase())) {
        const b = getFactionBuffs(fac) || {};
        Object.keys(b).forEach(k => {
          fBuffs[k] = (fBuffs[k] || 0) + b[k];
          if (!fBuffSources[k]) fBuffSources[k] = [];
          fBuffSources[k].push({ val: b[k], name: fac.trim() });
        });
      }
    });
  }

  // â”€â”€ JSX 
  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="synergy-aura-host">
      <div className="card-drop-shadow magic-scaler-host">
        <div className="magic-scaler-inner">
          <div
            ref={wrapperRef}
            className={`card-3d-wrapper ${isFlipContext ? 'is-flip-context' : ''} ${flipState === 0 ? 'flip-art-only' : ''}`}
            onClick={isFlipContext ? handleCardClick : undefined}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: isFlipContext ? 'pointer' : 'default' }}
        >
          {/* RÃ¼ckseite */}
          {flipState === 2 ? (
            <>
              <div className={`card-edge ${edgeClass}`}/>
              {cardBack}
            </>
          ) : (
            <>
              <div className={`card-edge ${edgeClass}`}/>
              {/* INNERER EDGE FÜR SYNERGIE & HINTS */}
              {isFactionSynergyActive && <div className="card-edge syn-edge-active" />}
              {isSynergyHint && <div className="card-edge syn-edge-hint" />}
              
              <div
                ref={cardRef}
                className={[
                  'card-ui', rarityClass,
                  isAnomaly ? 'type-anomaly' : isApex ? 'type-apex' : isLegacy ? 'type-legacy' : '',
                  newClass,
                  currentLevel >= 5 ? 'lvl-5-shimmer' : '',
                  flipState === 0 ? 'card-art-only' : '',
                  flipState === 0 && isFailed ? 'card-art-no-photo' : '',
                  isAvatar ? 'is-avatar-card' : '',
                  isFactionSynergyActive ? 'faction-synergy-active' : '',
                  isSynergyHint ? 'faction-synergy-hint' : ''
                ].filter(Boolean).join(' ')}
              >
                {/* Karten-Foto MUSS zwingend das first-child bleiben wg. CSS Rules! */}
                {!isFailed && (
                  <div style={{
                    position:'absolute', top:0, left:0, right:0, height:'65%', zIndex:1,
                    pointerEvents:'none',
                    maskImage:'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)',
                    WebkitMaskImage:'linear-gradient(to bottom, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 100%)',
                  }}>
                    <img
                      src={photoSrc}
                      alt={card.name}
                      loading="lazy"
                      decoding="async"
                      onError={handleImgError}
                      style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 10%', filter:'saturate(0.65) contrast(1.1) brightness(0.95)' }}
                    />
                  </div>
                )}

                {/* Dynamische Animierte Scanlines für aktiven Boost nach unten verschoben */}
                {isFactionSynergyActive && <div className="syn-active-scanlines" />}

                <div className="card-foil"/>
                <div className="card-glare"/>
                <div className="card-scanlines"/>

                

                {/* Dunkler Hintergrund-Verlauf für die linke Kante (für perfekte Lesbarkeit) */}
                {card.faction && !forceArtOnly && (
                  <div style={{
                    position: 'absolute', left: 0, top: '20%', bottom: '15%', width: '35px',
                    background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                    zIndex: 14, pointerEvents: 'none'
                  }} />
                )}

                {/* Wuchtiges, klares Faction-Badge am linken Rand */}
                {card.faction && (
                  <div className={`faction-icon-badge ${isFirstFacActive ? 'syn-badge-active' : ''}`} style={{
                    position: 'absolute',
                    left: 0,
                    top: '28%',
                    width: '38px', height: '42px',
                    background: 'rgba(5, 5, 10, 0.95)',
                    borderStyle: 'solid',
                    borderWidth: '2px 2px 2px 0', 
                    borderColor: isFirstFacActive ? '#ffd700' : themeColor,
                    borderRadius: '0 6px 6px 0',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    fontSize: '1.6rem',
                    color: isFirstFacActive ? '#ffd700' : themeColor,
                    /* FIX: Dezenterer Glow (weniger flashig) */
                    boxShadow: isFirstFacActive ? '0 0 15px rgba(255,215,0,0.6), inset 0 0 5px rgba(255,215,0,0.2)' : `0 0 8px ${themeColor}44`,
                    zIndex: 25,
                    pointerEvents: 'none',
                    transition: '0.3s'
                  }}>
                    {getFactionIcon(card.faction)}
                  </div>
                )}

                {/* FIX: Tab nur rendern, wenn faction existiert, um .replace() Crash zu verhindern */}
                {card.faction && (
                  <div className="vertical-faction-tab" style={{ 
                    color: isFactionSynergyActive ? '#ffd700' : themeColor, 
                    zIndex: 15,
                    position: 'absolute',
                    left: 0,
                    width: '38px',
                    top: 'calc(28% + 46px)',
                    display: 'flex',
                    flexDirection: 'row', /* FIX: 'row' sorgt in vertical-lr für eine korrekte Untereinander-Stapelung! */
                    alignItems: 'center',
                    writingMode: 'vertical-lr',
                    textOrientation: 'upright',
                    fontFamily: '"JetBrains Mono", "Roboto Mono", monospace',
                    fontWeight: 900,
                    fontSize: '0.65rem',
                    letterSpacing: '-2px',
                    lineHeight: 1,
                    textTransform: 'uppercase',
                    pointerEvents: 'none',
                    transform: 'scaleX(1.4)',
                    height: 'max-content',
                    background: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(2px)',
                    borderRight: `1px solid ${isFactionSynergyActive ? '#ffd700' : themeColor}33`,
                    padding: '12px 0',
                    boxShadow: `inset -10px 0 20px rgba(0,0,0,0.5)`,
                    textShadow: isFactionSynergyActive ? '0 0 10px rgba(255,215,0,0.8)' : `0 0 8px ${themeColor}88`,
                    transition: '0.3s',
                    /* FIX: Smooth ausfaden am unteren Rand via Mask */
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)'
                  }}>
                    {isSynergyHint && (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffd700', boxShadow: '0 0 8px #ffd700', marginBottom: '8px', animation: 'pulse 1s infinite' }} />
                    )}
                    {/* Fix: Prüft, ob es wirklich zwei Fraktionen sind, statt nur auf Array zu testen */}
                    {Array.isArray(card.faction) && card.faction.length > 1 ? (
                      <>
                        <span style={{ color: isFirstFacActive ? '#ffd700' : themeColor }}>{(card.faction[0] || "").toString().replace(/\s+/g, ' • ')}</span>
                        <div style={{ 
                          margin: '10px 0', 
                          width: '38px', height: '42px',
                          fontSize: '1.6rem',
                          color: isSecondFacActive ? '#ffd700' : themeColor,
                          textShadow: isSecondFacActive ? '0 0 10px rgba(255,215,0,0.8)' : `0 0 8px ${themeColor}88`,
                          transform: 'scaleX(0.71) translateX(-4px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(5, 5, 10, 0.95)',
                          borderStyle: 'solid',
                          borderWidth: '2px 2px 2px 0', 
                          borderColor: isSecondFacActive ? '#ffd700' : themeColor,
                          borderRadius: '0 6px 6px 0',
                          boxShadow: isSecondFacActive ? '0 0 15px rgba(255,215,0,0.6), inset 0 0 5px rgba(255,215,0,0.2)' : `0 0 8px ${themeColor}44`,
                          zIndex: 2,
                        }}>
                          {getFactionIcon(card.faction[1])}
                        </div>
                        <span style={{ color: isSecondFacActive ? '#ffd700' : themeColor }}>{(card.faction[1] || "").toString().replace(/\s+/g, ' • ')}</span>
                      </>
                    ) : (
                      /* Single Faction Display: Nimmt entweder den ersten Wert aus dem Array oder den String */
                      <span style={{ color: isFirstFacActive ? '#ffd700' : themeColor }}>
                        {(Array.isArray(card.faction) ? card.faction[0] : (card.faction || "")).toString().replace(/\s+/g, ' • ')}
                      </span>
                    )}
                  </div>
                )}

                {levelBadge}

                <div className="card-tags-container parallax-layer">
                  {card.isNew           && <div className="new-tag">NEW</div>}
                  {card.isLevelUp       && <div className="levelup-tag">LEVEL UP!</div>}
                  {card.isMaxLevelRefund && <div className="refund-tag">MAX LVL (+{card.gti >= 90 ? 100 : 50}💳)</div>}
                </div>

                {/* Alles folgende wird im art-only Modus NICHT gerendert */}
                {!forceArtOnly && (<>

                  {/* GTI / Energie-Kosten */}
                  {!isEffect ? (
                    <div className="gti-core parallax-layer" style={{ '--gti-color': gtiColor }}>
                      <div className="gti-label">RATING</div>
                      <div className="gti-value mono" style={{ color: gtiColor }}>{dynamicGti}</div>
                      <div className="gti-bracket"/>
                    </div>
                  ) : (
                    <div className="gti-core parallax-layer" style={{ '--gti-color': 'var(--ep)' }}>
                      <div className="gti-label" style={{ letterSpacing:'1px' }}>KOSTEN</div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'4px' }}>
                        <div style={{ fontSize:'1.1rem', filter:'drop-shadow(0 0 5px var(--ep))', transform:'translateY(-1px)' }}>⚡</div>
                        <div className="gti-value mono" style={{ color:'var(--ep)' }}>{card.cost}</div>
                      </div>
                    </div>
                  )}

                  <div className="type-badge parallax-layer">
                    {isAvatar ? '⬡ GHOST AGENT' : isAnomaly ? 'SYSTEM ANOMALY' : isApex ? 'APEX UNIT' : isLegacy ? 'LEGACY ASSET' : isEffect ? 'TAKTIK KARTE' : 'SYSTEM AGENT'}
                  </div>

                  <div className="card-header parallax-layer">
                    {isFailed && <div className="card-avatar frame-break-avatar" />}
                    <div className="card-info" style={{ textAlign:'left' }}>
                      <div className="card-name"  style={!isFailed ? { textShadow:'0 2px 10px rgba(0,0,0,1), 0 0 15px rgba(0,0,0,0.8)' } : {}}>{card.name}</div>
                      <div className="card-title" style={!isFailed ? { textShadow:'0 2px 8px rgba(0,0,0,1)' } : {}}>{displayTitle}</div>
                    </div>
                  </div>

                  <div className="c-center-visual parallax-layer">
                    {isFailed && <div className="radar-wrapper"><NeuralCore color={themeColor}/></div>}
                    <div className="c-text-wrap">
                      {isAvatar && card.bio ? (
                        <div className="c-bio" style={{ color:'rgba(255,255,255,0.75)', fontStyle:'italic', textShadow:'0 1px 8px rgba(0,0,0,1)' }}>
                          "{card.bio}"
                        </div>
                      ) : (isApex || isAnomaly) && card.passiveBuff ? (
                        <div className="apex-passive-info">
                          <b style={{ color: isAnomaly ? '#ff4444' : 'var(--ep)' }}>
                            +{card.passiveBuff.val + (currentLevel - 1) * 2} {CAT_CONFIG[card.passiveBuff.stat]?.name}
                          </b>
                          <small>{isAnomaly ? 'PASSIV-KOMPETENZ' : 'PASSIV-KOMPETENZ'}</small>
                        </div>
                      ) : isEffect ? (
                        <div className="apex-passive-info" style={{ gap:'10px' }}>
                          <b style={{ color:'var(--eff-col)', fontSize:'1.3rem' }}>
                            +{(card.buffPercent || 0) + (currentLevel - 1) * 2}% {CAT_CONFIG[card.stat]?.name}
                          </b>
                          {card.syn && (
                            <small style={{ color:'#aaa', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'5px', width:'100%' }}>
                              SYNERGIE (x2): {Array.isArray(card.syn) ? card.syn.join(', ') : card.syn}
                            </small>
                          )}
                        </div>
                      ) : (
                        <div className="c-bio">"{card.bio}"</div>
                      )}
                    </div>
                  </div>

                  {/* Stats (nur fÃ¼r Nicht-Effekt-Karten) */}
                  {!isEffect && (
                    <div className="card-stats parallax-layer" style={{ zIndex: 40 }}>
                      {STAT_KEYS.map(k => {
                        let val = Math.floor(card[k] ?? card.stats?.[k] ?? 0);

                        // ANOMALY RULE: LegitimitÃ¤t ist absolut auf 0 fixiert â€“ kein Buff, kein Level, keine Krise
                        if (isAnomaly && k === 'legitimacy') {
                          const fillPct = 0;
                          return (
                            <div key={k} className="card-stat" style={{ background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.25)' }}>
                              <div className="stat-header">
                                <span style={{ display:'flex', alignItems:'center', gap:'4px' }}>{STAT_ICONS[k]} <span>{CAT_CONFIG[k].name}</span></span>
                                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'flex-end', gap:'3px', flexShrink:0, minWidth:'44px' }}>
                                  <b className="mono" style={{ color:'var(--lose)', minWidth:'1.8ch', textAlign:'right', display:'inline-block' }}>0</b>
                                </div>
                              </div>
                              <div className="stat-bar-bg"><div className="stat-bar-fill" style={{ width:'0%', background:'var(--lose)' }}/></div>
                            </div>
                          );
                        }

                        val += (currentLevel - 1) * 2;

                        const apexEntry = apexBuffs[k];
                        const apexVal   = apexEntry?.val ?? apexEntry ?? 0;
                        val += apexVal;
                        val += fBuffs[k] || 0;

                        let effBonus = 0;
                        let effPct = 0;
                        let hasSyn = false;
                        
                        // Fix: Synergie-Berechnung (x2) für die UI-Anzeige
                        if (activeEffect && activeEffect.stat === k) {
                          const eLvl = activeEffect.level || 1;
                          const basePct = (Number(activeEffect.buffPercent) || 0) + (eLvl - 1) * 2;
                          
                          const rawSyn = Array.isArray(activeEffect.syn) ? activeEffect.syn.join(', ') : (activeEffect.syn || '');
                          const synParts = rawSyn.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                          const cardNameLow = (card.name || '').toLowerCase();
                          
                          hasSyn = synParts.some(part => cardNameLow.includes(part));
                          
                          const finalPct = hasSyn ? (basePct * 2) : basePct;
                          effBonus = Math.floor(val * (finalPct / 100));
                          effPct = finalPct; // Für Tooltip-Anzeige speichern
                        }
                        val += effBonus;
                        let crisisMult       = 1;
                        let isCrisisAffected = false;

                        if (activeCrisis) {
                          if ((activeCrisis.id === 'HYPERINFLATION' && k === 'finance') ||
                              (activeCrisis.id === 'BLACKOUT'       && k === 'tech')) {
                            val = 0; isCrisisAffected = true;
                          } else if (activeCrisis.id === 'NUCLEAR_WAR' && k === 'arsenal')    { crisisMult = 1.5; isCrisisAffected = true; }
                          else if   (activeCrisis.id === 'ANARCHY'     && k === 'erosion')    { crisisMult = 1.5; isCrisisAffected = true; }
                          else if   (activeCrisis.id === 'NWO'         && k === 'kingmaking') { crisisMult = 1.5; isCrisisAffected = true; }
                        }
                        val = Math.floor(val * crisisMult);

                        const isSelected    = curCategory === k;
                        const isLocked      = lockedStat  === k;
                        const selectedClass = isSelected ? (isPlayerTurn ? 'selected-player' : 'selected-ai') : '';
                        const statStyle     = { color: isCrisisAffected ? 'var(--lose)' : '#fff' };

                        const fillPct  = Math.min(100, Math.max(0, val));
                        const barColor = val >= 100 ? 'var(--apex-pink)' : val >= 90 ? 'var(--ep)' : val >= 70 ? 'var(--win)' : '#444';
                        
                        const isLeftColumn = STAT_KEYS.indexOf(k) % 2 === 0;
                        const isSynergyActive = highlightSynergyStat === k;
                        
                        // FIX: Nutzt jetzt die neuen prozent-basierten Bonus-Werte!
                        const totalBoost  = apexVal + effBonus + (fBuffs[k] || 0);
                        const boostSources = [];
                        
                        if (apexVal > 0) {
                          const srcs = apexEntry?.sources;
                          if (srcs?.length) {
                            srcs.forEach(s => boostSources.push(`+${s.val} ${s.name}`));
                          } else {
                            // Fallback, wenn keine spezifischen Sources übergeben wurden (z.B. durch normale Apex-Passives)
                            boostSources.push(`+${apexVal} Apex Einheit`);
                          }
                        }
                        if (effBonus > 0 && activeEffect) {
                           // Clean Tooltip: Zeigt nur den finalen Prozentsatz und Namen
                           boostSources.push(`+${effPct}% ${activeEffect.name || 'Taktik'}`);
                        }
                        
                        // FIX: Exakte Fraktions-Zuweisung für Anomalien im Tooltip
                        if (fBuffs[k] > 0 && fBuffSources[k]) {
                          fBuffSources[k].forEach(src => {
                            boostSources.push(`+${src.val} ${src.name} (Fraktion)`);
                          });
                        }

                        return (
                          <div
                            key={k}
                            className={`card-stat ${selectedClass}`}
                            onClick={isLocked ? undefined : () => onStatClick?.(k)}
                            onMouseEnter={(e) => {
                              setHoveredStat(`${k}_locked`);
                              if (isLocked) {
                                showTooltip(e, (
                                  <div style={{ background:'rgba(10,10,15,0.98)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--lose)', padding:'6px 12px', borderRadius:'4px', boxShadow:'0 0 20px rgba(255,0,50,0.6)' }}>
                                    <div className="mono" style={{ fontSize:'0.65rem', color:'var(--lose)', letterSpacing:'1px', fontWeight:'bold' }}>STAT GESPERRT (COOLDOWN)</div>
                                  </div>
                                ));
                              }
                            }}
                            onMouseMove={(e) => { if (isLocked && portalTooltip) showTooltip(e, portalTooltip.content); }}
                            onMouseLeave={() => { setHoveredStat(null); setPortalTooltip(null); }}
                            style={{
                              cursor:     isLocked ? 'not-allowed' : (onStatClick ? 'pointer' : 'default'),
                              background: isLocked ? 'rgba(255,0,50,0.25)' : (isSelected ? 'rgba(255,255,255,0.05)' : ''),
                              border:     isLocked ? '2px solid var(--lose)' : (isSelected ? '' : '1px solid transparent'),
                              boxShadow:  isLocked ? 'inset 0 0 10px rgba(255,0,50,0.4)' : 'none',
                              position:   'relative',
                              zIndex:     (hoveredStat === k || hoveredStat === `${k}_locked`) ? 100 : 1,
                            }}
                          >
                            {isSynergyActive && (
                              <div style={{
                                position: 'absolute',
                                top: '10%', bottom: '10%', width: '3px',
                                background: 'var(--ep)',
                                boxShadow: '0 0 8px var(--ep)',
                                borderRadius: '2px',
                                left: isLeftColumn ? '-3px' : 'auto',
                                right: !isLeftColumn ? '-3px' : 'auto',
                                zIndex: 10,
                                pointerEvents: 'none'
                              }} />
                            )}
                            <div className="stat-header" style={{ opacity: isLocked ? 0.3 : 1 }}>
                              <span style={{ 
  display:'flex', alignItems:'center', gap:'4px', 
  overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' /* FIX: Text bricht sauber ab */
}}>
  {STAT_ICONS[k]}
  <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{CAT_CONFIG[k].name}</span> 
  {isLocked && '🔒'}
</span>
                              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'flex-end', gap:'3px', flexShrink:0, minWidth:'44px' }}>
                                {totalBoost > 0 && (
                                  <span
                                    className="mono"
                                    style={{ position:'relative', color:'var(--eff-col)', fontSize:'0.62rem', lineHeight:1, cursor:'help' }}
                                    onMouseEnter={(e) => {
                                      setHoveredStat(k);
                                      if (boostSources.length > 0) {
                                        showTooltip(e, (
                                          <div style={{ background:'rgba(10,10,15,0.95)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--win)', borderLeft:'2px solid var(--eff-col)', padding:'5px 10px', borderRadius:'4px', boxShadow:'0 0 15px rgba(0,229,255,0.15)' }}>
                                            {boostSources.map((s, i) => (
                                              <div key={i} className="mono" style={{ fontSize:'0.58rem', color:'var(--win)', letterSpacing:'1px', lineHeight:1.6 }}>{s}</div>
                                            ))}
                                          </div>
                                        ));
                                      }
                                    }}
                                    onMouseMove={(e) => { if (boostSources.length > 0 && portalTooltip) showTooltip(e, portalTooltip.content); }}
                                    onMouseLeave={(e) => { e.stopPropagation(); setHoveredStat(null); setPortalTooltip(null); }}
                                  >
                                    +{totalBoost}
                                  </span>
                                )}
                                <b className={`mono ${val >= 100 ? 'stat-val-max' : ''}`}
                                   style={{ ...statStyle, minWidth:'1.8ch', textAlign:'right', display:'inline-block' }}>
                                  {val}
                                </b>
                              </div>
                            </div>
                            <div className="stat-bar-bg" style={{ opacity: isLocked ? 0.3 : 1 }}>
                              <div className="stat-bar-fill"
                                style={{ width:`${fillPct}%`, background:barColor, boxShadow:val >= 70 ? `0 0 5px ${barColor}` : 'none' }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="card-micro-data mono parallax-layer">LOC: SYS_NODE // AUTH: GRANTED</div>

                </>)}
              </div>
            </>
          )}
            </div>
          </div>
        </div>
        {portalTooltip && typeof document !== 'undefined' && createPortal(
          <div style={{
            position: 'fixed',
            left: portalTooltip.x > (window.innerWidth / 2) ? portalTooltip.x - 220 : portalTooltip.x + 20,
            top: portalTooltip.y + 15,
            zIndex: 999999,
            pointerEvents: 'none'
          }}>
            {portalTooltip.content}
          </div>,
          document.getElementById('game-ui') || document.body
        )}
      </div>
    );
  });

// REPLACE
// --- LEVEL UP STYLES & SHIMMER EFFECT ---
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  .level-badge.lvl-4 { background: #00ff44 !important; color: #000 !important; box-shadow: 0 0 15px rgba(0,255,70,0.5); }
  .level-badge.lvl-5 { background: #ff0055 !important; color: #fff !important; box-shadow: 0 0 20px rgba(255,0,85,0.7); }
  
  .lvl-5-shimmer::after {
    content: "";
    position: absolute;
    inset: -50%;
    /* Weicherer Verlauf durch breitere Abstände und reduzierten Weiß-Wert */
    background: linear-gradient(100deg, transparent 70%, rgba(143, 76, 76, 0.93) 80%, transparent 80%);
    filter: blur(60px); /* Nimmt die restliche Härte aus den Kanten */
    animation: lvl5shimmer 6s infinite; /* Deine angepasste Zeit */
    z-index: 35;
    pointer-events: none;
  }

  @keyframes lvl5shimmer {
    0% { transform: translateX(-100%) translateY(-100%); }
    100% { transform: translateX(100%) translateY(100%); }
  }

  /* --- NEUES SYNERGY & HINT SYSTEM --- */
  /* FIX: Dezenterer Glow (weniger flashig) für das gesamte Synergy/Hint System */
  .syn-edge-active {
    background: #ffd700 !important;
    z-index: 0;
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
    animation: synBorderPulse 2s infinite;
  }

  .syn-edge-hint {
    background: repeating-linear-gradient(45deg, #ffd700, #ffd700 5px, transparent 5px, transparent 15px) !important;
    z-index: 0;
    opacity: 0.4;
    animation: synHintSlide 20s linear infinite;
  }

  .card-ui.faction-synergy-active {
    box-shadow: inset 0 0 35px rgba(255, 215, 0, 0.08) !important;
  }

  .card-ui.faction-synergy-hint {
    box-shadow: inset 0 0 20px rgba(255, 215, 0, 0.02) !important;
  }

  .syn-active-scanlines {
    position: absolute;
    inset: 0;
    /* FIX: Scanlines sind jetzt viel dezenter, sparsamer und weniger dominant */
    background: repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(255, 215, 0, 0.01) 4px, rgba(255, 215, 0, 0.01) 6px);
    pointer-events: none;
    z-index: 4;
    animation: synScanMove 10s linear infinite;
  }

  @keyframes synBorderPulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.4); }
  }

  @keyframes synHintSlide {
    0% { background-position: 0 0; }
    100% { background-position: 200px 200px; }
  }

  @keyframes synScanMove {
    0% { transform: translateY(0); }
    100% { transform: translateY(20px); }
  }
`;
document.head.appendChild(styleTag);

export default Card;