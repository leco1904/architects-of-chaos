// src/components/MatchEngine.jsx
import React, { useState, useEffect, useMemo } from 'react';
import Card, { CAT_CONFIG, getRarityClass, getFactionIcon } from './Card';
import cardsData from '../data/cards.json'; // NEU: Import für den Random-Pool
import { getAIBestMove, getSarcasticNews, getAIDefenseAction, getAIAttackAction, getFactionBuffs } from '../logic/gameLogic';
import { playSound } from '../logic/audio';
import { Settings } from 'lucide-react';


function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Maps a card to its thematic rarity color
function getRarityColor(card) {
  if (card?.type === 'apex')   return 'var(--apex-pink)';
  if (card?.type === 'legacy') return '#b8860b';
  const cls = getRarityClass(card?.gti ?? 0);
  if (cls === 'rarity-legendary') return 'var(--r-leg)';
  if (cls === 'rarity-epic')      return 'var(--r-epi)';
  if (cls === 'rarity-rare')      return 'var(--r-rar)';
  return '#2a2a3a';
}

const normalizeStat = (s) => {
  const raw = (s || '').toLowerCase().trim();
  const map = { 'tech-hebel': 'tech', 'finanzmacht': 'finance', 'schattenmacht': 'kingmaking', 'schatten': 'kingmaking', 'systemrisiko': 'system', 'legitimität': 'legitimacy' };
  return map[raw] || raw;
};

const CRISIS_EVENTS = [
  { id: 'HYPERINFLATION', name: 'HYPERINFLATION', desc: 'Finanzmacht fällt auf 0.' },
  { id: 'BLACKOUT', name: 'GLOBALER BLACKOUT', desc: 'Tech-Hebel fällt auf 0.' },
  { id: 'NUCLEAR_WAR', name: 'NUKLEARER SCHLAGABTAUSCH', desc: 'Arsenal verursacht 1.5x Schaden.' },
  { id: 'ANARCHY', name: 'GLOBALE ANARCHIE', desc: 'Erosion verursacht 1.5x Schaden.' },
  { id: 'NWO', name: 'NEUE WELTORDNUNG', desc: 'Schattenmacht verursacht 1.5x Schaden.' }
];

const formatActionName = (act) => {
  if (!act) return '';
  if (act === 'std') return 'STANDARD';
  if (act === 'allin') return 'ALL-IN';
  return act.toUpperCase();
};

// ── Nachziehstapel (Draw Pile) ────────────────────────────────────────────
function DrawPile({ charCount, effCount }) {
  const chars = Math.min(5, Math.max(1, charCount));
  const effs  = Math.min(3, effCount);
  return (
    <div className="draw-pile-panel">
      <div className="mono draw-pile-heading">▸ NACHZIEHSTAPEL</div>
      {/* Character deck */}
      <div className="draw-pile-group">
        <div className="draw-pile-stack" style={{height: 156 + chars*4}}>
          {Array.from({length: charCount > 0 ? chars : 1}).map((_, i) => (
            <div key={i} className={`dp-card dp-char ${charCount === 0 ? 'dp-empty' : ''}`}
              style={{bottom: i*4, left: i*3, zIndex: i,
                      opacity: charCount === 0 ? 0.2 : (0.5 + i*0.12)}}/>
          ))}
        </div>
        <div className="mono draw-pile-count" style={{color: charCount > 0 ? 'var(--win)' : '#444'}}>
          {charCount}
        </div>
        <div className="mono draw-pile-sub">CHARAKTERE</div>
      </div>
      {/* Effect deck */}
      <div className="draw-pile-group" style={{marginTop:20}}>
        <div className="draw-pile-stack" style={{height: 156 + Math.min(2,effs)*4}}>
          {Array.from({length: effCount > 0 ? Math.min(2,effs) : 1}).map((_, i) => (
            <div key={i} className={`dp-card dp-eff ${effCount === 0 ? 'dp-empty' : ''}`}
              style={{bottom: i*4, left: i*3, zIndex: i,
                      opacity: effCount === 0 ? 0.2 : (0.5 + i*0.25)}}/>
          ))}
        </div>
        <div className="mono draw-pile-count" style={{color: effCount > 0 ? 'var(--eff-col)' : '#444'}}>
          {effCount}
        </div>
        <div className="mono draw-pile-sub">TAKTIKEN</div>
      </div>
    </div>
  );
}

// ── Tooltip-Helper ────────────────────────────────────────────────────────
/* MOBILE OPTIMIZATION START */
// Auf Desktop: positionsgebundener Tooltip am Cursor
// Auf Mobile: fixiertes Bottom-Sheet-Overlay
function TT({ lines, mousePos, isMobile, onClose }) {
  if (isMobile) {
    // Mobile Bottom Sheet
    return (
      <>
        {/* Backdrop zum Schließen via Tap ins Leere */}
        <div
          className="mobile-tooltip-backdrop"
          onClick={onClose}
        />
        <div className="mobile-tooltip-sheet">
          <div className="tt-handle" />
          {lines.filter(Boolean).map((l, i) => (
            <div key={i} className="tt-line">{l}</div>
          ))}
        </div>
      </>
    );
  }

  // Desktop: original Tooltip-Verhalten
  if (!mousePos) return null;
  return (
    <div style={{
      position: 'fixed',
      left: mousePos.x > window.innerWidth / 2 ? mousePos.x - 260 : mousePos.x + 20,
      top: mousePos.y + 15,
      zIndex: 24999,
      background: 'rgba(10,10,15,0.95)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid var(--win)', borderLeft: '2px solid var(--eff-col)',
      padding: '8px 14px', borderRadius: '6px',
      whiteSpace: 'nowrap', pointerEvents: 'none',
      boxShadow: '0 5px 25px rgba(0,0,0,0.8), 0 0 15px rgba(0,229,255,0.2)',
    }}>
      {lines.map((l, i) => (
        <div key={i} className="mono" style={{ fontSize: '0.65rem', color: 'var(--win)', letterSpacing: '1px', lineHeight: 1.6 }}>{l}</div>
      ))}
    </div>
  );
}
/* MOBILE OPTIMIZATION END */

export default function MatchEngine({ playerChars = [], playerEffs = [], partnerChars = [], partnerEffs = [], aiChars = [], aiEffs = [], difficulty = 1, isOnline = false, isCoop = false, isHost = false, conn = null, onEndGame, onShowRules, onShowSettings, onConfirmAction, initialPHP = 100, initialAHP = 100, isRoguelike = false, contextLabel = '', onTrade, augments = [], sectorFaction = null, squadSize = 2, broadcast = null, inboxMessage = null, username = 'AGENT' }) {
  const netSend = (data) => {
      if (typeof broadcast === 'function') broadcast(data);
      else if (conn) conn.send(data);
  };

  // Shuffle ONCE, then split — avoids duplicates across hand/deck (Bug #011)
  const _sc = React.useRef(shuffle([...(Array.isArray(playerChars) ? playerChars : [])])).current;
  const _se = React.useRef(shuffle([...(Array.isArray(playerEffs) ? playerEffs : [])])).current;

  const [lastAttackStat, setLastAttackStat] = useState(null);
  const [lastAIAttackStat, setLastAIAttackStat] = useState(null);
  const [pHP, setPHP] = useState(initialPHP);
  // FIX: Im Co-Op skaliert die Boss-HP mit der Squad-Größe
  const [aHP, setAHP] = useState(isCoop ? initialAHP * squadSize : initialAHP);
  
  // FIX (Bug #2 & #3): "Latest Ref"-Pattern – verhindert TDZ durch Forward-Reference
  // UND Stale-Closure, wenn der Effect vor der Funktionsdefinition feuert.
  const resolveClashRef   = React.useRef(null);
  const applyClashAckRef  = React.useRef(null);

  // FIX: Verhindert Stale-Closures während der 500ms Pause
  const hpRefs = React.useRef({ p: initialPHP, a: isCoop ? initialAHP * squadSize : initialAHP });
  useEffect(() => { hpRefs.current = { p: pHP, a: aHP }; }, [pHP, aHP]);
  
  // FIX: Fängt Schaden auf, der über das Netzwerk ankommt, bevor der Screen offen ist
  const [coopDmgBuffer, setCoopDmgBuffer] = useState({ p: 0, a: 0 });
  
  // NEU: Lokale Kampf-Stats
  const [matchStats, setMatchStats] = useState({
    dmgDealt: 0,
    dmgTaken: 0,
    turns: 0,
    energySpent: 0,
    highestCrit: 0
  });
  const matchStatsRef = React.useRef(matchStats);
  useEffect(() => { matchStatsRef.current = matchStats; }, [matchStats]);

  const startEpBonus = augments.filter(a => a.type === 'ep_start').reduce((sum, a) => sum + a.val, 0);
  const sectorEpBonus = sectorFaction?.id === 'SHADOW' ? 3 : 0;
  const [pEP, setPEP] = useState(((isOnline && isCoop) ? 20 : 10) + startEpBonus + sectorEpBonus); 
  const [aEP, setAEP] = useState(10);
  
  const [crisisRisk, setCrisisRisk] = useState(0);
  const [crisisLevel, setCrisisLevel] = useState(0);

  // NEU: Garantiert synchrone Werte für den Host DESYNC_FIX (muss NACH pEP und crisisRisk stehen!)
  const syncRefs = React.useRef({ pEP, crisisRisk });
  useEffect(() => { syncRefs.current = { pEP, crisisRisk }; }, [pEP, crisisRisk]);

  const [hoveredEl, setHoveredEl] = useState(null);
  const [isSquadOpen, setIsSquadOpen] = useState(false); // NEU: Squad-Monitor ist standardmäßig eingeklappt für mehr Übersicht
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // NEU: Maus-Tracking

  /* MOBILE OPTIMIZATION START */
  // isMobile: true wenn Touchscreen oder Viewport <= 768px
  const [isMobile, setIsMobile] = useState(false);
  // Mobile Sidebar States
  const [isSquadMobileOpen, setIsSquadMobileOpen] = useState(false);
  const [isWarRoomMobileOpen, setIsWarRoomMobileOpen] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      const mobileQuery = window.matchMedia('(max-width: 768px)');
      const touchQuery  = window.matchMedia('(pointer: coarse)');
      setIsMobile(mobileQuery.matches || touchQuery.matches);
    };
    checkMobile();
    const mq1 = window.matchMedia('(max-width: 768px)');
    const mq2 = window.matchMedia('(pointer: coarse)');
    const handler = () => checkMobile();
    if (mq1.addEventListener) {
      mq1.addEventListener('change', handler);
      mq2.addEventListener('change', handler);
    }
    return () => {
      if (mq1.removeEventListener) {
        mq1.removeEventListener('change', handler);
        mq2.removeEventListener('change', handler);
      }
    };
  }, []);
  // Tooltip-Handler: Auf Mobile per onClick; auf Desktop via onMouseEnter/Leave
  const handleTTEnter = (elName) => { if (!isMobile) setHoveredEl(elName); };
  const handleTTLeave = ()        => { if (!isMobile) setHoveredEl(null); };
  const handleTTTap   = (elName) => {
    if (!isMobile) return;
    setHoveredEl(prev => prev === elName ? null : elName);
  };
  const closeMobileTooltip = () => { if (isMobile) setHoveredEl(null); };
  /* MOBILE OPTIMIZATION END */

  const [activeCrisis, setActiveCrisis] = useState(null);
  
  // FIX: Wenn es Co-Op ist, starten BEIDE Spieler in ihrem eigenen "Turn" gegen die KI!
  const [pTurn, setPTurn] = useState(() => {
    if (isOnline && isCoop) return true; // Im Co-Op starten immer beide im Angriff gegen die KI
    if (isOnline && !isCoop) return isHost; // Im PvP bestimmt der Host-Status den ersten Zug
    return true; // Solo-Standard
  });
  // FIX (Stale-Closure): pTurnRef spiegelt immer den aktuellen pTurn-Wert wider,
  // ohne dass der Online-Handler bei jedem Turn neu registriert werden muss.
  const pTurnRef = React.useRef((isOnline && !isCoop) ? isHost : true);
  useEffect(() => { pTurnRef.current = pTurn; }, [pTurn]);
    
  const [pHand, setPHand] = useState(_sc.slice(0, 3));
  const [pDeck, setPDeck] = useState(_sc.slice(3));
  const [aHand, setAHand] = useState([...(aiChars || [])].slice(0, 3));
  const [aDeck, setADeck] = useState([...(aiChars || [])].slice(3));
  
  const [aiMemory, setAiMemory] = useState({ factions: [], apexSeen: false, highestGTI: 0 }); // Level 3 & 4 KI Gedächtnis
  const [aActiveIdx, setAActiveIdx] = useState(0); // KI Auswahl-Index
  
  const [pEffHand, setPEffHand] = useState(_se.slice(0, 1));
  const [pEffDeck, setPEffDeck] = useState(_se.slice(1));
  const [aEffHand, setAEffHand] = useState([...(aiEffs || [])].slice(0, 1));
  const [aEffDeck, setAEffDeck] = useState([...(aiEffs || [])].slice(1));
  
  // NEU: Partner State für den War Room (Neural Link)
  const [partnerHand, setPartnerHand] = useState((partnerChars || []).slice(0, 3));
  const [partnerEffHand, setPartnerEffHand] = useState((partnerEffs || []).slice(0, 1));
  
  // NEU: Tausch-Feld (Trade System)
  const [myTradeOffer, setMyTradeOffer] = useState(null);
  const [remoteTradeOffer, setRemoteTradeOffer] = useState(null);
  const [myTradeReady, setMyTradeReady] = useState(false);
  const [remoteTradeReady, setRemoteTradeReady] = useState(false);
  const [tradeAnimPhase, setTradeAnimPhase] = useState(null); // NEU: Steuert die Flug-Animationen
  const [tradeCooldown, setTradeCooldown] = useState(0); // NEU: 5 Runden Cooldown
  const [tradeLevelUpData, setTradeLevelUpData] = useState(null); // NEU: Level-Up Animation
  const [tradeBonusCard, setTradeBonusCard] = useState(null);     // NEU: Bonus-Karte bei Merge
  const [hasTradedThisNode, setHasTradedThisNode] = useState(false); // NEU: 1 Tausch pro Node Limit
  
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeEffObj, setActiveEffObj] = useState(null);
  const [curK, setCurK] = useState('');
  
  const [clashData, setClashData] = useState(null);
  const clashDataOpenRef = React.useRef(false);
  useEffect(() => { clashDataOpenRef.current = !!clashData; }, [clashData]);
  // SYS_SCANNER: nur beim allerersten Clash pro Node anzeigen
  const isFirstClashRef = React.useRef(true);
  useEffect(() => { if (clashData) isFirstClashRef.current = false; }, [clashData]);
  const [clashAnim, setClashAnim] = useState(false);
  const [showCrisisIntro, setShowCrisisIntro] = useState(null);
  const [justDrawnIdx, setJustDrawnIdx] = useState(null);
  const [showEnemyDeck, setShowEnemyDeck] = useState(false); // NEU: Gegner Deck Modal

  // --- MISSING STATES RESTORED ---
  const [waiting, setWaiting] = useState(false);
  const [syncBarrier, setSyncBarrier] = useState(false); // NEU: Input Lock Barrier
  const [matchEpoch, setMatchEpoch] = useState(1); // NEU: Runden-ID zur Validierung
  const epochRef = React.useRef(1);
  useEffect(() => { epochRef.current = matchEpoch; }, [matchEpoch]);
  const [barrierReadies, setBarrierReadies] = useState(0);

  const [myLockedAction, setMyLockedAction] = useState(null);
  const myLockedActionRef = React.useRef(null);
  useEffect(() => { myLockedActionRef.current = myLockedAction; }, [myLockedAction]);
  const lockedRef = React.useRef(false);
  useEffect(() => { lockedRef.current = !!myLockedAction; }, [myLockedAction]);
  const [remoteActionData, setRemoteActionData] = useState(null); // Für 1v1 PvP
  const [partnerActions, setPartnerActions] = useState([]); // NEU: Array für alle Co-Op Partner!
  const [localAIActionData, setLocalAIActionData] = useState(null); // Speicher für Boss-Aktion im Co-Op
  
  const [myClashConfirmed, setMyClashConfirmed] = useState(false);
  const [remoteClashAck, setRemoteClashAck] = useState(null);
  const [clashReadyCount, setClashReadyCount] = useState(0); // NEU: Synced Ready-Counter
  const [showMatchIntro, setShowMatchIntro] = useState(true);
  const [introPhase, setIntroPhase] = useState(0); 
  const [cannonAnimData, setCannonAnimData] = useState(null);         // Sender: Karte fliegt raus
  const [incomingCannonData, setIncomingCannonData] = useState(null); // Empfänger: Karte fliegt rein
  const [inspectedPartnerCard, setInspectedPartnerCard] = useState(null); // War Room Inspektor

  // NEU: Fraktions-Synergien prüfen (Muss VOR den useEffects deklariert werden!)
  const getActiveFactions = (deck) => {
    const counts = {};
    (deck || []).forEach(c => {
       if (c && c.faction && c.type !== 'effect') {
           const facs = Array.isArray(c.faction) ? c.faction : (typeof c.faction === 'string' ? c.faction.split(',').map(s => s.trim()) : [c.faction]);
           facs.forEach(f => {
               const fac = f.trim().toUpperCase();
               counts[fac] = (counts[fac] || 0) + 1;
           });
       }
    });
    return Object.keys(counts).filter(f => counts[f] >= 3);
  };
  const pActiveFactions = getActiveFactions(playerChars);
  
  // NEU: Augment Synergy Overrides hinzufügen
  augments.forEach(a => {
      if (a.type === 'synergy' && !pActiveFactions.includes(a.faction.toUpperCase())) {
          pActiveFactions.push(a.faction.toUpperCase());
      }
  });
  
  const aActiveFactions = getActiveFactions(aiChars);

  // --- HOST DESYNC PROTECTION (SHARED POOL VERSION) ---
  // Sobald der Clash-Screen schließt (!clashData), sendet der Host die echten Werte.
  // Wir nutzen matchStats.turns als zusätzlichen Trigger für den Rundenstart.
  useEffect(() => {
    if (isOnline && isCoop && isHost && !clashData && !waiting) {
        if (conn || broadcast) netSend({
            type: 'DESYNC_FIX',
            pHP: hpRefs.current.p,
            aHP: hpRefs.current.a,
            pEP: syncRefs.current.pEP,
            crisisRisk: syncRefs.current.crisisRisk
        });
    }
  }, [clashData, waiting, matchStats.turns, isHost, isOnline, isCoop, conn, broadcast]);

  const activeCard = pHand[activeIdx];
  // Im Co-Op bekämpft jeder seine eigene KI-Instanz, im PvP ist der Gegner der Partner (remoteActionData)
  const isPvPDefense = isOnline && !isCoop && !pTurn;
  const aiCard = (isPvPDefense && remoteActionData) ? remoteActionData.card : aHand[aActiveIdx];

   useEffect(() => {
    playSound('matchIntro');
    const t1 = setTimeout(() => setIntroPhase(1), 400);
    const t2 = setTimeout(() => setIntroPhase(2), 1900);
    const t3 = setTimeout(() => setShowMatchIntro(false), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
      if (!isOnline || !inboxMessage) return;
      const handleData = (data) => {
          // EPOCH VALIDATION: Verhindert, dass alte Pakete den neuen Zug korrumpieren
          if (['ACTION', 'ACTION_CANCEL', 'EP_SPENT', 'EP_GAIN'].includes(data.type) && data.epoch && data.epoch !== epochRef.current) {
              console.warn(`[EPOCH MISMATCH] Ignoriere Paket ${data.type} (Local: ${epochRef.current}, Paket: ${data.epoch})`);
              return;
          }

          if (data.type === 'BARRIER_READY') {
              if (isHost && data.epoch === epochRef.current) {
                  setBarrierReadies(prev => {
                      const next = prev + 1;
                      if (next >= squadSize) {
                          setTimeout(() => {
                              if (broadcast) broadcast({ type: 'BARRIER_UNLOCK', epoch: data.epoch });
                              setSyncBarrier(false);
                          }, 50);
                          return 0;
                      }
                      return next;
                  });
              }
          } else if (data.type === 'BARRIER_UNLOCK') {
              if (!isHost && data.epoch === epochRef.current) setSyncBarrier(false);
          } else if (data.type === 'ACTION') {
              if (!pTurnRef.current && !isCoop) setCurK(data.category);
              
              if (isCoop) {
                  // Füge die Aktion zum Partner-Array hinzu (verhindert Duplikate und lässt Host beide Clients aufnehmen)
                  setPartnerActions(prev => {
                      const pId = data._peerId || data.username;
                      const existing = prev.findIndex(a => (a._peerId || a.username) === pId);
                      if (existing > -1) {
                          const next = [...prev];
                          next[existing] = data;
                          return next;
                      }
                      return [...prev, data];
                  });
              } else {
                  setRemoteActionData(data);
              }
          } else if (data.type === 'ACTION_CANCEL') {
              if (isCoop) {
                  setPartnerActions([]); // Quickfix: Wenn einer abbricht, leeren wir die Queue
              } else {
                  setRemoteActionData(null);
                  if (!pTurnRef.current) setCurK('');
              }
          } else if (data.type === 'CLASH_ACK') {
              // Client empfängt die echten Krisen-Daten vom Host
              setRemoteClashAck(data);
          } else if (data.type === 'CLASH_CONFIRM') {
              if (isHost) {
                  setClashReadyCount(prev => {
                      const next = prev + 1;
                      if (broadcast) broadcast({ type: 'CLASH_READY_SYNC', count: next });
                      return next;
                  });
              }
          } else if (data.type === 'CLASH_READY_SYNC') {
              setClashReadyCount(data.count);
          } else if (data.type === 'HAND_SYNC') {
              setPartnerHand(data.hand);
              setPartnerEffHand(data.effHand);
          } else if (data.type === 'EP_SPENT') {
              if (isCoop) setPEP(prev => Math.max(0, prev - data.amount));
              else setAEP(prev => Math.max(0, prev - data.amount));
          } else if (data.type === 'EP_GAIN') {
              if (isCoop) setPEP(prev => Math.min(25, prev + data.amount));
              else setAEP(prev => Math.min(18, prev + data.amount));
          } else if (data.type === 'HP_LOST') {
              setPHP(prev => {
                  const nextHP = Math.max(0, prev - data.amount);
                  hpRefs.current.p = nextHP; 
                  if (nextHP <= 0 && isCoop) {
                      setTimeout(() => onEndGame({ isWin: false, sarcasmNews: { text: "NEURAL LINK SEVERED: Dein Partner hat das System kollabieren lassen." }, remainingHP: 0, matchData: { ...matchStatsRef.current, finalPHP: 0, finalAHP: hpRefs.current.a, difficulty } }), 100);
                  }
                  return nextHP;
              });
          } else if (data.type === 'COOP_CLASH_DAMAGE') {
              setPHP(prev => {
                  const nextHP = Math.max(0, prev - data.amount);
                  hpRefs.current.p = nextHP; 
                  if (nextHP <= 0 && isCoop) {
                      setTimeout(() => onEndGame({ isWin: false, sarcasmNews: { text: "NEURAL LINK SEVERED: Dein Partner hat das System kollabieren lassen." }, remainingHP: 0, matchData: { ...matchStatsRef.current, finalPHP: 0, finalAHP: hpRefs.current.a, difficulty } }), 100);
                  }
                  return nextHP;
              });
              // Puffer füllen, solange das Fenster noch nicht offen ist
              if (!clashDataOpenRef.current) {
                  setCoopDmgBuffer(prev => ({ ...prev, p: prev.p + data.amount }));
              }
              setClashData(prev => prev ? { ...prev, newPHP: Math.max(0, prev.newPHP - data.amount), partnerDmgP: (prev.partnerDmgP || 0) + data.amount } : prev);
          } else if (data.type === 'COOP_AI_DAMAGE') {
              setAHP(prev => {
                  const nextHP = Math.max(0, prev - data.amount);
                  hpRefs.current.a = nextHP; 
                  return nextHP;
              });
              // Puffer füllen, solange das Fenster noch nicht offen ist
              if (!clashDataOpenRef.current) {
                  setCoopDmgBuffer(prev => ({ ...prev, a: prev.a + data.amount }));
              }
              setClashData(prev => prev ? { ...prev, newAHP: Math.max(0, prev.newAHP - data.amount), partnerDmgA: (prev.partnerDmgA || 0) + data.amount } : prev);
          } else if (data.type === 'TEAM_WIN') {
              // THE LIFE LINK: Partner hat seinen KI-Boss eliminiert!
              // FIX: hpRefs.current.p übergibt jetzt die korrekten verbleibenden HP an den Sieg-Screen!
              setTimeout(() => onEndGame({ isWin: true, sarcasmNews: { text: "CO-OP STRIKE: Dein Partner hat den gegnerischen Node gecrackt!" }, remainingHP: hpRefs.current.p, matchData: { ...matchStatsRef.current, finalPHP: hpRefs.current.p, finalAHP: 0, difficulty } }), 100);
          } else if (data.type === 'TRADE_OFFER') {
              setRemoteTradeOffer(data.card);
              setRemoteTradeReady(false);
              setMyTradeReady(false);
              setTradeAnimPhase('receiving_offer');
              setTimeout(() => setTradeAnimPhase(null), 400); // Kürzere In-Animation
          } else if (data.type === 'TRADE_CANCEL') {
              setRemoteTradeOffer(null);
              setRemoteTradeReady(false);
              setMyTradeReady(false);
          } else if (data.type === 'TRADE_ACCEPT') {
              setRemoteTradeReady(true);
          } else if (data.type === 'DESYNC_FIX') {
              // FIX: Client erzwingt die Werte des Hosts UND killt eventuelle Stale-Damage-Puffer
              setPHP(data.pHP);
              setAHP(data.aHP);
              setPEP(data.pEP);
              setCrisisRisk(data.crisisRisk);
              hpRefs.current = { p: data.pHP, a: data.aHP };
              setCoopDmgBuffer({ p: 0, a: 0 }); // Hard-Reset
          } else if (data.type === 'COOP_MASTER_SNAPSHOT') {
              } else if (data.type === 'COOP_MASTER_SNAPSHOT') {
          // CLIENT: Empfängt die absolute Wahrheit vom Host
          hpRefs.current.p = data.snapshot.newPHP;
          hpRefs.current.a = data.snapshot.newAHP;
          
          // Finde die Daten des lokalen Clients im partners-Array des Hosts (via Ref, um Stale Closures zu verhindern)
          const latestAction = myLockedActionRef.current;
          const myDataIdx = data.snapshot.partners.findIndex(p => p.card?.name === latestAction?.card?.name && p.act === formatActionName(latestAction?.action));
              
              let swappedSnapshot = { ...data.snapshot };
              
              if (myDataIdx > -1) {
                  const myData = data.snapshot.partners[myDataIdx];
                  // Alle ANDEREN Partner (inklusive dem Host) kommen ins neue partners-Array
                  const otherPartners = data.snapshot.partners.filter((_, i) => i !== myDataIdx);
                  
                  // Der Host selbst wird als erster Partner hinzugefügt
                  otherPartners.unshift({
                      card: data.snapshot.pc, effObj: data.snapshot.pEffObj, act: data.snapshot.pAct,
                      aiCard: data.snapshot.ac, aiEffObj: data.snapshot.aEffObj, aiAct: data.snapshot.aAct,
                      k: data.snapshot.categoryKey, v: data.snapshot.pV, aiV: data.snapshot.aV, 
                      dmgP: data.snapshot.dmgP, dmgA: data.snapshot.dmgA,
                      activeFactions: data.snapshot.pActiveFactions, apexBuffs: data.snapshot.pApexBuffs,
                      aiActiveFactions: data.snapshot.aActiveFactions, aiApexBuffs: data.snapshot.aApexBuffs,
                      username: data.snapshot.hostUsername || 'HOST'
                  });
                  
                  swappedSnapshot = {
                      ...data.snapshot,
                      // Ich bin jetzt links
                      pc: myData.card, ac: myData.aiCard, categoryKey: myData.k,
                      pV: myData.v, aV: myData.aiV, pEffObj: myData.effObj, aEffObj: myData.aiEffObj,
                      pActiveFactions: myData.activeFactions, pApexBuffs: myData.apexBuffs,
                      aActiveFactions: myData.aiActiveFactions, aApexBuffs: myData.aiApexBuffs,
                      pAct: myData.act, aAct: myData.aiAct,
                      dmgP: myData.dmgP, dmgA: myData.dmgA,
                      // Restliche Spieler rechts
                      partners: otherPartners
                  };
              }
              
              setClashData(swappedSnapshot);
              setMyLockedAction(null); setRemoteActionData(null); setPartnerActions([]); setLocalAIActionData(null); setActiveEffObj(null); setWaiting(false);
          } else if (data.type === 'PVP_MASTER_SNAPSHOT') {
              // CLIENT: Empfängt die absolute PvP-Wahrheit vom Host und spiegelt sie für das eigene UI
              hpRefs.current.p = data.snapshot.newAHP; 
              hpRefs.current.a = data.snapshot.newPHP; 
              
              const swappedSnapshot = {
                  ...data.snapshot,
                  pc: data.snapshot.ac,
                  ac: data.snapshot.pc,
                  pV: data.snapshot.aV,
                  aV: data.snapshot.pV,
                  pEffObj: data.snapshot.aEffObj,
                  aEffObj: data.snapshot.pEffObj,
                  pActiveFactions: data.snapshot.aActiveFactions,
                  aActiveFactions: data.snapshot.pActiveFactions,
                  pApexBuffs: data.snapshot.aApexBuffs,
                  aApexBuffs: data.snapshot.pApexBuffs,
                  pAct: data.snapshot.aAct,
                  aAct: data.snapshot.pAct,
                  dmgP: data.snapshot.dmgA,
                  dmgA: data.snapshot.dmgP,
                  oldPHP: data.snapshot.oldAHP,
                  oldAHP: data.snapshot.oldPHP,
                  newPHP: data.snapshot.newAHP,
                  newAHP: data.snapshot.newPHP,
                  newPEP: data.snapshot.newAEP,
                  newAEP: data.snapshot.newPEP
              };
              
              setClashData(swappedSnapshot);
              setMyLockedAction(null);
              setRemoteActionData(null);
              setLocalAIActionData(null);
              setActiveEffObj(null);
              setWaiting(false);
          }
      };
      handleData(inboxMessage);
  }, [inboxMessage, pTurn, isOnline, isCoop]);

  // NEU: Trade Execution Logik (Führt den Tausch lokal aus, wenn beide zugestimmt haben)
  useEffect(() => {
      if (myTradeReady && remoteTradeReady && myTradeOffer && remoteTradeOffer) {
          playSound('upgrade');
          const receivedCard = remoteTradeOffer;
          const givenCard = myTradeOffer;

          const isEff = receivedCard.type === 'effect' || receivedCard.buff !== undefined;
          let didMerge = false;
          let newLvl = 1;
          
          if (isEff) {
              const inHand = pEffHand.findIndex(c => c?.name === receivedCard.name);
              const inDeck = pEffDeck.findIndex(c => c?.name === receivedCard.name);
              if (inHand > -1) {
                  const newHand = [...pEffHand]; 
                  newLvl = parseInt(newHand[inHand].level || 1) + parseInt(receivedCard.level || 1);
                  newHand[inHand] = { ...newHand[inHand], level: newLvl }; 
                  setPEffHand(newHand);
                  didMerge = true;
              } else if (inDeck > -1) {
                  const newDeck = [...pEffDeck]; 
                  newLvl = parseInt(newDeck[inDeck].level || 1) + parseInt(receivedCard.level || 1);
                  newDeck[inDeck] = { ...newDeck[inDeck], level: newLvl }; 
                  setPEffDeck(newDeck);
                  didMerge = true;
              } else {
                  setPEffHand(prev => [...prev, receivedCard]); 
              }
          } else {
              const inHand = pHand.findIndex(c => c?.name === receivedCard.name);
              const inDeck = pDeck.findIndex(c => c?.name === receivedCard.name);
              if (inHand > -1) {
                  const newHand = [...pHand]; 
                  newLvl = parseInt(newHand[inHand].level || 1) + parseInt(receivedCard.level || 1);
                  newHand[inHand] = { ...newHand[inHand], level: newLvl }; 
                  setPHand(newHand);
                  didMerge = true;
              } else if (inDeck > -1) {
                  const newDeck = [...pDeck]; 
                  newLvl = parseInt(newDeck[inDeck].level || 1) + parseInt(receivedCard.level || 1);
                  newDeck[inDeck] = { ...newDeck[inDeck], level: newLvl }; 
                  setPDeck(newDeck);
                  didMerge = true;
              } else {
                  setPHand(prev => [...prev, receivedCard]); 
              }
          }

          let bonusCard = null;
          // Wenn die Karte gemerged wurde -> Level Up Animation + Random Bonus Karte (Max Epic)
          if (didMerge) {
              setTradeLevelUpData({ card: { ...receivedCard, level: newLvl } });
              setTimeout(() => setTradeLevelUpData(null), 2500);

              // Bonus-Karte generieren (Maximal Epic)
              const pool = cardsData.characters.filter(c => {
                  if (c.type === 'apex' || c.type === 'legacy') return false;
                  const rarity = getRarityClass(c.gti);
                  return rarity !== 'rarity-legendary'; 
              });
              bonusCard = { ...pool[Math.floor(Math.random() * pool.length)], level: 1 };
              
              // FIX: Erst 2.2s warten, damit die Level-Up Animation fast weg ist (keine Überlagerung)
              setTimeout(() => {
                  playSound('win');
                  setTradeBonusCard(bonusCard);
                  setPDeck(prev => shuffle([...prev, bonusCard])); 
                  setTimeout(() => setTradeBonusCard(null), 3500);
              }, 2200); 
          }

          // WICHTIG: bonusCard an App.jsx funken für permanentes Speichern im Run
          if (typeof onTrade === 'function') {
              onTrade({ ...receivedCard, level: didMerge ? newLvl : (receivedCard.level || 1) }, givenCard, bonusCard);
          }

          setMyTradeOffer(null);
          setRemoteTradeOffer(null);
          setMyTradeReady(false);
          setRemoteTradeReady(false);
          setHasTradedThisNode(true); // Sperrt den Tausch für den Rest dieses Kampfes
      }
  }, [myTradeReady, remoteTradeReady, myTradeOffer, remoteTradeOffer, pHand, pDeck, pEffHand, pEffDeck, onTrade]);
  useEffect(() => {
      if (isOnline && conn) {
          netSend({ type: 'HAND_SYNC', hand: pHand, effHand: pEffHand });
      }
  }, [pHand, pEffHand, isOnline, conn]);

  // FIX: Master-Timeout für den Clash. Zwingt das Spiel weiter, wenn ein Partner AFK geht.
  useEffect(() => {
      if (!isOnline) {
          if (myLockedAction && remoteActionData) {
              const t = setTimeout(() => resolveClashRef.current?.(), 400);
              return () => clearTimeout(t);
          }
          return;
      }

      if (!myLockedAction) return;

      const enemyReady = isCoop 
          ? (!!localAIActionData && partnerActions.length >= squadSize - 1) 
          : !!remoteActionData;

      // Wenn alle bereit sind, greift das 500ms Timeout für ALLE
      if (enemyReady) {
          const t = setTimeout(() => {
              if (resolveClashRef.current) resolveClashRef.current();
          }, 500);
          return () => clearTimeout(t);
      }
      
      // Fallback für den Host, falls ein Partner AFK ist (wartet strenge 15s)
      if (isCoop && isHost && !enemyReady) {
          const t = setTimeout(() => {
              if (resolveClashRef.current) resolveClashRef.current();
          }, 15000);
          return () => clearTimeout(t);
      }
  }, [myLockedAction, remoteActionData, partnerActions, localAIActionData, isCoop, squadSize, isOnline, isHost]);

  // FIX: Turn-Barrier mit Fallback-Timeout. Der Host zwingt den Phasenwechsel, wenn jemand feststeckt.
  useEffect(() => {
      if (!isOnline || !myClashConfirmed || !clashData) return;

      if (isHost) {
          const allReady = clashReadyCount >= squadSize;
          const delay = allReady ? 100 : 10000; // 10 Sekunden Gnadenfrist für Lagger

          const timer = setTimeout(() => {
              const riskHit = Math.random() * 100;
              const crisisEv = Math.floor(Math.random() * CRISIS_EVENTS.length);
              
              // SOUVERÄNER STATE: Host diktiert die nächste Runde und Epoch!
              const nextEpoch = epochRef.current + 1;
              const ackData = { 
                  type: 'CLASH_ACK', 
                  riskHit, 
                  crisisEv,
                  nextTurn: !pTurnRef.current,
                  epoch: nextEpoch
              };

              if (conn || broadcast) netSend(ackData);

              applyClashAckRef.current?.(ackData, clashData.ac.name);
              setClashData(null);
              setMyClashConfirmed(false);
              setRemoteClashAck(null);
              setClashReadyCount(0);
          }, delay);

          return () => clearTimeout(timer);
      } else if (remoteClashAck?.type === 'CLASH_ACK') {
          applyClashAckRef.current?.(remoteClashAck, clashData.ac.name);
          setClashData(null);
          setMyClashConfirmed(false);
          setRemoteClashAck(null);
          setClashReadyCount(0);
      }
  }, [myClashConfirmed, remoteClashAck, clashReadyCount, isOnline, clashData, isHost, conn, squadSize, broadcast]);

  useEffect(() => {
    // FIX: Im Co-Op Modus muss die KI ihren Zug lokal berechnen, da man gegen die KI spielt!
    if ((!isOnline || isCoop) && !pTurn && aHand.length > 0) {
      
      // PHASE 2: AI TACTICS BUYBACK LOGIC
      // BUYBACK: Wenn alles leer ist, kauft die KI den Pool für 10⚡ zurück
      if (aEffHand.length === 0 && aEffDeck.length === 0 && aEP >= 10) {
          setAEP(prev => prev - 10);
          const freshEffs = shuffle([...(Array.isArray(aiEffs) ? aiEffs : [])]);
          setAEffHand(freshEffs.slice(0, 1));
          setAEffDeck(freshEffs.slice(1));
          playSound('upgrade');
      }

      // KI bewertet ihre 3 Handkarten und wählt die beste Aktion
      const maxAHP = isCoop ? initialAHP * 2 : initialAHP;
      const move = getAIBestMove(aHand, aEffHand, activeCrisis, difficulty, aiMemory, aEP, lastAIAttackStat, aActiveFactions, pHP, aHP, maxAHP);
      
      setAActiveIdx(move.cardIndex);
      setCurK(move.category);
    }
  }, [pTurn, aHand, aEffHand, activeCrisis, difficulty, aiMemory, isOnline, aEP, lastAIAttackStat, aActiveFactions]);

  useEffect(() => {
    if (clashData && !showCrisisIntro) {
      const timer = setTimeout(() => {
        setClashAnim(true);
        
        // NEU: Max Damage berechnen für Sound
        const maxDmg = Math.max(clashData.dmgP, clashData.dmgA);
        
        if (clashData.dmgP > clashData.dmgA) {
          playSound(maxDmg > 100 ? 'heavy_impact' : 'roundLose'); 
        } else if (clashData.dmgA > clashData.dmgP) {
          playSound(maxDmg > 100 ? 'heavy_impact' : 'win');       
        } else {
          playSound('patt');      
        }
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setClashAnim(false);
    }
  }, [clashData, showCrisisIntro]);
  const handleStatClick = (statKey) => {
    if (!pTurn || waiting) return; // SPERRE: Nichts ändern, während man wartet!
    if (statKey === lastAttackStat) return; 
    
    playSound('click');
    setCurK(statKey);
  };

  const handleCancelAction = () => {
      if (!myLockedAction) return;
      playSound('click');
      
      // EP-Kosten berechnen und lokal erstatten
      const dynCost = (myLockedAction.effObj && normalizeStat(myLockedAction.effObj.stat) === normalizeStat(myLockedAction.category)) ? myLockedAction.effObj.cost : 0;
      const baseCost = myLockedAction.action === 'std' ? 2 : myLockedAction.action === 'allin' ? 8 : myLockedAction.action === 'konter' ? 6 : 0;
      const totalCost = baseCost + dynCost;
      
      setPEP(prev => Math.min((isOnline && isCoop) ? 25 : 18, prev + totalCost));
      
      // Rückerstattung & Storno ans Netzwerk funken
      if (isOnline && conn) {
          netSend({ type: 'EP_GAIN', amount: totalCost, epoch: epochRef.current });
          netSend({ type: 'ACTION_CANCEL', epoch: epochRef.current });
      }
      
      // UI wieder freigeben
      setMyLockedAction(null);
      setLocalAIActionData(null);
      setWaiting(false);
  };

  const handleOfferCard = () => {
    if (!activeCard || myTradeOffer || hasTradedThisNode || waiting) return; // SPERRE
    playSound('click');
    const offeredCard = { ...activeCard }; // FIX: Team Asset Badge wird nicht mehr erzwungen
    setMyTradeOffer(offeredCard);
    
    // Karte verlässt die Hand ins Tauschfeld
    const nextHand = [...pHand];
    nextHand.splice(activeIdx, 1);
    setPHand(nextHand);
    setActiveIdx(0);
    
    setTradeAnimPhase('offering');
    setTimeout(() => setTradeAnimPhase(null), 400);

    if (conn || broadcast) netSend({ type: 'TRADE_OFFER', card: offeredCard });
  };

  const handleCancelOffer = () => {
    if (!myTradeOffer || waiting) return; // SPERRE
    playSound('click');
    
    // Karte wandert zurück in die Hand
    setPHand(prev => [...prev, { ...myTradeOffer, isTeamAsset: false }]);
    setMyTradeOffer(null);
    setMyTradeReady(false);
    
    if (conn || broadcast) netSend({ type: 'TRADE_CANCEL' });
  };

  const handleAcceptTrade = () => {
    if (!myTradeOffer || !remoteTradeOffer || waiting) return; // SPERRE
    playSound('click');
    setMyTradeReady(true);
    if (conn || broadcast) netSend({ type: 'TRADE_ACCEPT' });
  };

  const handleToggleEffect = () => {
    if (!pEffHand[0] || waiting) return; // SPERRE
    playSound('click');
    setActiveEffObj(prev => prev ? null : pEffHand[0]);
  };

  const handleAbort = () => {
    playSound('click');
    onConfirmAction({
      message: "SPIELABBRUCH BESTÄTIGEN? DAS GILT ALS NIEDERLAGE!",
      onConfirm: () => {
        onEndGame({ 
          isWin: false, 
          sarcasmNews: { text: "FEIGER RÜCKZUG: Das System verzeiht keine Schwäche." }, 
          isAbort: true, 
          matchData: matchStatsRef.current 
        });
      }
    });
  };

  const getApexBuffs = (hand, isPlayer) => {
    const buffs = {};
    (hand || []).forEach(c => {
      if ((c?.type === 'apex' || c?.type === 'anomaly') && c.passiveBuff) {
        const scaledVal = parseInt(c.passiveBuff.val || 0) + (parseInt(c.level || 1) - 1) * 2;
        const stat = c.passiveBuff.stat;
        if (!buffs[stat]) buffs[stat] = { val: 0, sources: [] };
        if (!buffs[stat].sources) buffs[stat].sources = [];
        
        buffs[stat].val += scaledVal;
        // Unterscheidung zwischen Anomaly und Apex für den Tooltip!
        buffs[stat].sources.push({ val: scaledVal, name: c.type === 'anomaly' ? 'System Anomaly' : 'Apex Einheit' });
      }
    });
    // System-Augments nur auf Spieler-Seite anwenden
    if (isPlayer) {
      augments.filter(a => a.type === 'stat').forEach(a => {
        if (!buffs[a.stat]) buffs[a.stat] = { val: 0, sources: [] };
        if (!buffs[a.stat].sources) buffs[a.stat].sources = [];
        
        buffs[a.stat].val += a.val;
        buffs[a.stat].sources.push({ val: a.val, name: 'System-Augment' });
      });
    }
    // Sektor Mutation (Hegemony verleiht +10 Legitimität global an ALLE)
    if (sectorFaction?.id === 'HEGEMONY') {
      if (!buffs['legitimacy']) buffs['legitimacy'] = { val: 0, sources: [] };
      if (!buffs['legitimacy'].sources) buffs['legitimacy'].sources = [];
      
      buffs['legitimacy'].val += 10;
      buffs['legitimacy'].sources.push({ val: 10, name: 'Sektor-Regel' });
    }
    return buffs;
  };

  const pApexBuffs = getApexBuffs(pHand, true);
  // FIX: Im 1v1 PvP ist der lokale Gegner der echte Spieler (partnerHand via Sync).
  // Im Co-Op ist der direkte lokale Gegner die KI (aHand).
  const aApexBuffs = getApexBuffs((isOnline && !isCoop) ? partnerHand : aHand, false);

  const resolveClash = () => {
      setWaiting(false);
      const isAttacker = pTurn;
      
      // NEU: NEURAL RESONANCE CHECK
      // Wenn beide Spieler dieselbe Kategorie wählen, vibriert die Neural Bridge!
      const isResonance = isOnline && isCoop && remoteActionData && myLockedAction && (myLockedAction.category === remoteActionData.category);
      if (isResonance) playSound('upgrade');

      // STRENGER FIX: Im Offline-Modus (isOnline=false) nutzen wir IMMER remoteActionData,
      // da die lokale KI-Berechnung ihre Daten dort ablegt.
      const enemyAction = (isCoop && isOnline) ? localAIActionData : remoteActionData;
      
      if (!enemyAction || !myLockedAction) {
          console.warn("Clash aborted: Missing Action Data", { enemyAction, myLockedAction, isOnline, isCoop });
          return; 
      }

      const pCard = myLockedAction.card;
      const aCard = enemyAction.card;
      const k = isAttacker ? myLockedAction.category : enemyAction.category;

      // Stats für Cooldown speichern
      if (isAttacker) setLastAttackStat(k);
      else setLastAIAttackStat(k);

      const calcVal = (card, effObj, isRemote) => {
           if (!card) return 0;
           const statKey = k; 

           // REPLACE
           // 1. Basiswert (Direktes Objekt nutzen + Level-Bonus anwenden)
           let v = parseInt(card[statKey] ?? card.stats?.[statKey] ?? 0) + ((parseInt(card.level || 1) - 1) * 2);

           // 3. Apex / Anomaly Passiv-Buffs (Jetzt für beide Seiten!)
           // FIX: Im 1v1 PvP liest der Host die vom Client mitgeschickten Buffs aus!
           const sideApex = isRemote ? ((isOnline && !isCoop) ? (enemyAction.apexBuffs || {}) : aApexBuffs) : pApexBuffs;
           const apexKey = Object.keys(sideApex).find(key => normalizeStat(key) === normalizeStat(statKey));
           if (apexKey) v += parseInt(sideApex[apexKey].val || 0);
           
           // 4. Faction Synergie (Übersetzungs-sicher & Anomaly-kompatibel)
           // FIX: Fraktions-Buffs werden ebenfalls 1:1 vom Client übernommen.
           const activeFacs = isRemote ? ((isOnline && !isCoop) ? (enemyAction.activeFactions || []) : aActiveFactions) : pActiveFactions;
           const cardFacs = Array.isArray(card.faction) ? card.faction : (typeof card.faction === 'string' ? card.faction.split(',').map(s => s.trim()) : (card.faction ? [card.faction] : []));
           
           cardFacs.forEach(fac => {
               const myFac = fac.trim().toUpperCase();
               // WICHTIG: Karte bekommt den Buff nur, wenn sie selbst auch Teil der aktiven Fraktion ist!
               if (activeFacs.includes(myFac)) {
                   const allFacs = [...new Set(cardsData.characters.flatMap(c => Array.isArray(c.faction) ? c.faction : [c.faction]))];
                   const originalFac = allFacs.find(f => (f||'').trim().toUpperCase() === myFac) || fac.trim();
                   
                   const fBuffs = getFactionBuffs(originalFac) || {};
                   const fKey = Object.keys(fBuffs).find(key => normalizeStat(key) === normalizeStat(statKey));
                   if (fKey) v += parseInt(fBuffs[fKey] || 0);
               }
           });

           // 5. Taktik-Karten Buff (Prozentual skalierend!)
           // Taktik-Berechnung Fix: Level-Bonus VOR Synergie-Verdopplung
           if (effObj && normalizeStat(effObj.stat) === normalizeStat(statKey)) {
               const effLvl = parseInt(effObj.level || 1);
               // Basis-Prozent aus Sheet + Level-Bonus (z.B. 22% + 2% pro Level über 1)
               let basePct = (Number(effObj.buffPercent) || 0) + (effLvl - 1) * 2;
               
               // Fix: Absolut robuster Namens-Check für Synergie
               const safeCardName = (card.name || '').toLowerCase().trim();
               const synList = Array.isArray(effObj.syn) ? effObj.syn : (effObj.syn ? [effObj.syn] : []);
               const hasSyn = synList.some(name => {
                   const cleanName = name.toString().toLowerCase().trim();
                   return safeCardName.includes(cleanName) || cleanName.includes(safeCardName);
               });
               
               // Synergy: Der Prozentwert aus dem Sheet wird verdoppelt (z.B. 15% -> 30%)
               const finalPct = hasSyn ? (basePct * 2) : basePct;
               
               v += Math.floor(v * (finalPct / 100));
           }

           let mult = 1;
           if (activeCrisis) {
               if ((activeCrisis.id === 'HYPERINFLATION' && k === 'finance') || (activeCrisis.id === 'BLACKOUT' && k === 'tech')) v = 0;
               else {
                   if (activeCrisis.id === 'NUCLEAR_WAR' && k === 'arsenal') mult = 1.5;
                   if (activeCrisis.id === 'ANARCHY' && k === 'erosion') mult = 1.5;
                   if (activeCrisis.id === 'NWO' && k === 'kingmaking') mult = 1.5;
               }
           }
           return Math.floor(v * mult);
      };

      const pV = calcVal(pCard, myLockedAction.effObj, false);
      const aV = calcVal(aCard, enemyAction.effObj, true);

      const atkVal = isAttacker ? pV : aV;
      const defVal = isAttacker ? aV : pV;

      let dmgP = 0, dmgA = 0, recoilP = 0, recoilA = 0;

     // --- UNIFORM DAMAGE RESOLUTION ---
      const atkAct = isAttacker ? myLockedAction.action : enemyAction.action;
      const defAct = isAttacker ? enemyAction.action : myLockedAction.action;
      let dmgOnDef = 0, dmgOnAtk = 0, aEPRefund = 0;
      const diff = Math.max(0, atkVal - defVal);
      const recoilDiff = Math.max(0, defVal - atkVal);

      if (defAct === 'erholen') {
        if (atkAct === 'konter') aEPRefund = 6;
        else dmgOnDef = Math.floor(diff * (atkAct === 'allin' ? 3.0 : 2.0));
      } else if (atkAct === 'erholen') {
        dmgOnAtk = Math.floor(recoilDiff * 1.5);
        if (defAct === 'konter') aEPRefund = 6;
      } else if (defAct === 'konter') {
        if (atkVal >= defVal) dmgOnDef = Math.floor(diff * (atkAct === 'allin' ? 4.0 : 1.5));
        else dmgOnAtk = Math.floor(recoilDiff * (atkAct === 'allin' ? 5.0 : 2.0));
      } else if (defAct === 'block') {
        if (atkVal > defVal) dmgOnDef = Math.floor(diff * (atkAct === 'allin' ? 3.0 : 1.5));
      }

      // Rollen-Zuweisung: Wer ist P (Player) und wer ist A (AI/Partner)? 
      if (isAttacker) {
        dmgA = dmgOnDef; dmgP = dmgOnAtk;
      } else {
        dmgP = dmgOnDef; dmgA = dmgOnAtk;
      }

      // EP Refund Logik
      if (aEPRefund > 0) {
        if (isAttacker) {
          if (isOnline && isCoop) netSend({ type: 'EP_GAIN', amount: aEPRefund });
          else setAEP(prev => Math.min(18, prev + aEPRefund));
        } else {
          setPEP(prev => Math.min((isOnline && isCoop) ? 25 : 18, prev + aEPRefund));
        }
      }

      const totalMyDmg = dmgP + recoilP;
      const totalAiDmg = dmgA + recoilA;

      // Update Combat Stats
      setMatchStats(prev => ({
          ...prev,
          dmgDealt: prev.dmgDealt + totalAiDmg,
          dmgTaken: prev.dmgTaken + totalMyDmg,
          turns: prev.turns + 1,
          highestCrit: Math.max(prev.highestCrit || 0, totalAiDmg)
      }));

      // KI Gedächtnis Update (Level 3 & 4)
      if (difficulty >= 3 && pCard) {
          setAiMemory(prev => {
              const nextMem = { ...prev, factions: [...prev.factions] };
              if (pCard.faction) {
                  const facs = Array.isArray(pCard.faction) ? pCard.faction : (typeof pCard.faction === 'string' ? pCard.faction.split(',').map(s => s.trim()) : [pCard.faction]);
                  facs.forEach(f => {
                      const fac = f.trim().toUpperCase();
                      if (pActiveFactions.includes(fac) && !nextMem.factions.includes(fac)) nextMem.factions.push(fac);
                  });
              }
              if (pCard.type === 'apex' || pCard.type === 'anomaly') nextMem.apexSeen = true;
              if ((pCard.gti || 0) > nextMem.highestGTI) nextMem.highestGTI = pCard.gti || 0;
              return nextMem;
          });
      }

     

              // Helper, um Partner-Synergien mit dessen mitgelieferten Buffs zu berechnen
              const calcMateVal = (c, eff, isAI, statKey) => {
                  if (!c) return 0;
                  let v = parseInt(c[statKey] ?? c.stats?.[statKey] ?? 0) + ((parseInt(c.level || 1) - 1) * 2);
                  
                  const sideApex = isAI ? (mateAction.localAI?.apexBuffs || {}) : (mateAction.apexBuffs || {});
                  const apexKey = Object.keys(sideApex).find(key => normalizeStat(key) === normalizeStat(statKey));
                  if (apexKey) v += parseInt(sideApex[apexKey].val || 0);
                  
                  const activeFacs = isAI ? (mateAction.localAI?.activeFactions || []) : (mateAction.activeFactions || []);
                  const cardFacs = Array.isArray(c.faction) ? c.faction : (typeof c.faction === 'string' ? c.faction.split(',').map(s => s.trim()) : (c.faction ? [c.faction] : []));
                  
                  cardFacs.forEach(fac => {
                      const myFac = fac.trim().toUpperCase();
                      if (activeFacs.includes(myFac)) {
                          const allFacs = [...new Set(cardsData.characters.flatMap(fc => Array.isArray(fc.faction) ? fc.faction : [fc.faction]))];
                          const originalFac = allFacs.find(f => (f||'').trim().toUpperCase() === myFac) || fac.trim();
                          const fBuffs = getFactionBuffs(originalFac) || {};
                          const fKey = Object.keys(fBuffs).find(key => normalizeStat(key) === normalizeStat(statKey));
                          if (fKey) v += parseInt(fBuffs[fKey] || 0);
                      }
                  });

                  if (eff && normalizeStat(eff.stat) === normalizeStat(statKey)) {
                      const effLvl = parseInt(eff.level || 1);
                      let pct = parseInt(eff.buffPercent || 0) + (effLvl - 1) * 2;
                      
                      const safeCName = (c.name || '').toLowerCase();
                      const hasSyn = Array.isArray(eff.syn) 
                        ? eff.syn.some(n => safeCName.includes((n || '').toLowerCase())) 
                        : safeCName.includes((eff.syn || '').toLowerCase());
                        
                      if (hasSyn) pct *= 2;
                      v += Math.floor(v * (pct / 100));
                  }
                  
                  let mult = 1;
                  if (activeCrisis) {
                      if ((activeCrisis.id === 'HYPERINFLATION' && statKey === 'finance') || (activeCrisis.id === 'BLACKOUT' && statKey === 'tech')) v = 0;
                      else {
                          if (activeCrisis.id === 'NUCLEAR_WAR' && statKey === 'arsenal') mult = 1.5;
                          if (activeCrisis.id === 'ANARCHY' && statKey === 'erosion') mult = 1.5;
                          if (activeCrisis.id === 'NWO' && statKey === 'kingmaking') mult = 1.5;
                      }
                  }
                  return Math.floor(v * mult);
              };

             if (isOnline && isCoop) {
          if (!isHost) return; // CLIENT wartet ausschließlich auf den Master-Snapshot

          const oldP = pHP; 
          const oldA = aHP; 
          
          let totalMateDmgP = 0;
          let totalMateDmgA = 0;

          // Durchlaufe das Array aller Partner-Aktionen und berechne die Clashes
          const partnerResults = partnerActions.map(mateAction => {
              let mV = 0, mAIV = 0, mDmgP = 0, mDmgA = 0;
              const mk = mateAction.category || k;
              const mCard = mateAction.card;
              const mAICard = mateAction.localAI?.card;

              const calcMateVal = (c, eff, isAI, statKey) => {
                  if (!c) return 0;
                  let v = parseInt(c[statKey] ?? c.stats?.[statKey] ?? 0) + ((parseInt(c.level || 1) - 1) * 2);
                  
                  const sideApex = isAI ? (mateAction.localAI?.apexBuffs || {}) : (mateAction.apexBuffs || {});
                  const apexKey = Object.keys(sideApex).find(key => normalizeStat(key) === normalizeStat(statKey));
                  if (apexKey) v += parseInt(sideApex[apexKey].val || 0);
                  
                  const activeFacs = isAI ? (mateAction.localAI?.activeFactions || []) : (mateAction.activeFactions || []);
                  const cardFacs = Array.isArray(c.faction) ? c.faction : (typeof c.faction === 'string' ? c.faction.split(',').map(s => s.trim()) : (c.faction ? [c.faction] : []));
                  
                  cardFacs.forEach(fac => {
                      const myFac = fac.trim().toUpperCase();
                      if (activeFacs.includes(myFac)) {
                          const allFacs = [...new Set(cardsData.characters.flatMap(fc => Array.isArray(fc.faction) ? fc.faction : [fc.faction]))];
                          const originalFac = allFacs.find(f => (f||'').trim().toUpperCase() === myFac) || fac.trim();
                          const fBuffs = getFactionBuffs(originalFac) || {};
                          const fKey = Object.keys(fBuffs).find(key => normalizeStat(key) === normalizeStat(statKey));
                          if (fKey) v += parseInt(fBuffs[fKey] || 0);
                      }
                  });

                  if (eff && normalizeStat(eff.stat) === normalizeStat(statKey)) {
                      const effLvl = parseInt(eff.level || 1);
                      let pct = parseInt(eff.buffPercent || 0) + (effLvl - 1) * 2;
                      const safeCName = (c.name || '').toLowerCase().trim();
                      const synList = Array.isArray(eff.syn) ? eff.syn : (eff.syn ? [eff.syn] : []);
                      const hasSyn = synList.some(name => {
                          const cleanName = name.toString().toLowerCase().trim();
                          return safeCName.includes(cleanName) || cleanName.includes(safeCName);
                      });
                      
                      const finalPct = hasSyn ? (pct * 2) : pct;
                      v += Math.floor(v * (finalPct / 100));
                  }
                  
                  let mult = 1;
                  if (activeCrisis) {
                      if ((activeCrisis.id === 'HYPERINFLATION' && statKey === 'finance') || (activeCrisis.id === 'BLACKOUT' && statKey === 'tech')) v = 0;
                      else {
                          if (activeCrisis.id === 'NUCLEAR_WAR' && statKey === 'arsenal') mult = 1.5;
                          if (activeCrisis.id === 'ANARCHY' && statKey === 'erosion') mult = 1.5;
                          if (activeCrisis.id === 'NWO' && statKey === 'kingmaking') mult = 1.5;
                      }
                  }
                  return Math.floor(v * mult);
              };

              mV = calcMateVal(mCard, mateAction.effObj, false, mk);
              mAIV = calcMateVal(mAICard, mateAction.localAI?.effObj, true, mk);

              const atkVal = pTurn ? mV : mAIV;
              const defVal = pTurn ? mAIV : mV;
              const atkAct = pTurn ? mateAction.action : mateAction.localAI?.action;
              const defAct = pTurn ? mateAction.localAI?.action : mateAction.action;

              let dmgOnDef = 0, dmgOnAtk = 0;
              if (defAct === 'erholen') {
                  if (atkAct !== 'konter') dmgOnDef = Math.floor(Math.max(0, atkVal - defVal) * 1.5);
              } else if (atkAct === 'erholen') {
                  if (defAct !== 'konter') dmgOnAtk = Math.floor(Math.max(0, defVal - atkVal) * 1.5);
              } else {
                  const diff = Math.max(0, atkVal - defVal);
                  const recoilDiff = Math.max(0, defVal - atkVal);
                  if (defAct === 'konter') {
                      if (atkVal >= defVal) dmgOnDef = Math.floor(diff * (atkAct === 'allin' ? 4.0 : 1.5));
                      else dmgOnAtk = Math.floor(recoilDiff * (atkAct === 'allin' ? 5.0 : 2.0));
                  } else {
                      if (atkVal > defVal) dmgOnDef = Math.floor(diff * (atkAct === 'allin' ? 3.0 : 1.5));
                  }
              }

              if (pTurn) { mDmgA = dmgOnDef; mDmgP = dmgOnAtk; } 
              else       { mDmgP = dmgOnDef; mDmgA = dmgOnAtk; }
              
              totalMateDmgP += mDmgP;
              totalMateDmgA += mDmgA;
              
              return {
                  card: mCard, effObj: mateAction.effObj, act: formatActionName(mateAction.action),
                  aiCard: mAICard, aiEffObj: mateAction.localAI?.effObj, aiAct: formatActionName(mateAction.localAI?.action),
                  k: mk, v: mV, aiV: mAIV, dmgP: mDmgP, dmgA: mDmgA,
                  activeFactions: mateAction.activeFactions, apexBuffs: mateAction.apexBuffs,
                  aiActiveFactions: mateAction.localAI?.activeFactions, aiApexBuffs: mateAction.localAI?.apexBuffs,
                  username: mateAction.username || 'AGENT'
              };
          });

          const masterSnapshot = {
              pc: pCard, ac: aCard, categoryKey: k, pV, pEffObj: myLockedAction.effObj,
              pActiveFactions: [...pActiveFactions], pApexBuffs: { ...pApexBuffs },
              aV, aEffObj: enemyAction.effObj, aActiveFactions: [...aActiveFactions], aApexBuffs: { ...aApexBuffs },
              pAct: formatActionName(myLockedAction.action), aAct: formatActionName(enemyAction.action),
              
              partners: partnerResults, // Das gesamte Array aller Partner
              hostUsername: username, // Host Name für Client UI
              
              oldPHP: oldP, oldAHP: oldA,
              newPHP: Math.max(0, oldP - totalMyDmg - totalMateDmgP),
              newAHP: Math.max(0, oldA - totalAiDmg - totalMateDmgA),
              newPEP: Math.min((isOnline && isCoop) ? 25 : 18, pEP + 2), 
              newAEP: Math.max(0, Math.min(18, aEP - (enemyAction.action === 'allin' ? 8 : enemyAction.action === 'konter' ? 6 : enemyAction.action === 'std' ? 2 : 0) - (enemyAction.effObj ? enemyAction.effObj.cost : 0) + 2)),
              dmgP: totalMyDmg, dmgA: totalAiDmg,
              partnerDmgP: totalMateDmgP, partnerDmgA: totalMateDmgA,
          };

          setClashData(masterSnapshot);
          setMyLockedAction(null); setRemoteActionData(null); setPartnerActions([]); setLocalAIActionData(null); setActiveEffObj(null);
          
          if (conn || broadcast) netSend({ type: 'COOP_MASTER_SNAPSHOT', snapshot: masterSnapshot });
          return;
      }
      // FALLBACK FÜR SINGLEPLAYER ODER LOKAL-OFFLINE
      if (!isOnline) {
          setClashData({
              pc: pCard,
              ac: aCard,
              categoryKey: k,
              pV,
              pEffObj: myLockedAction.effObj,
              pActiveFactions: [...(pActiveFactions || [])],
              pApexBuffs: { ...(pApexBuffs || {}) },
              aV,
              aEffObj: enemyAction.effObj,
              aActiveFactions: [...(aActiveFactions || [])],
              aApexBuffs: { ...(aApexBuffs || {}) },
              pAct: formatActionName(myLockedAction.action),
              aAct: formatActionName(enemyAction.action),
              oldPHP: hpRefs.current.p, oldAHP: hpRefs.current.a,
              newPHP: Math.max(0, hpRefs.current.p - totalMyDmg),
              newAHP: Math.max(0, hpRefs.current.a - totalAiDmg),
              newPEP: Math.min(isOnline ? 25 : 18, pEP + 2),
              newAEP: Math.max(0, Math.min(18, aEP - (enemyAction.action === 'allin' ? 8 : enemyAction.action === 'konter' ? 6 : enemyAction.action === 'std' ? 2 : 0) - (enemyAction.effObj ? enemyAction.effObj.cost : 0) + 2)),
              dmgP: totalMyDmg, dmgA: totalAiDmg
          });
          setMyLockedAction(null); setRemoteActionData(null); setLocalAIActionData(null); setActiveEffObj(null);
          return;
      }

      setCoopDmgBuffer(prevBuffer => {
          setClashData({
              pc: pCard, 
              ac: aCard, 
              categoryKey: k,
              pV, 
              pEffObj: myLockedAction.effObj,
              pActiveFactions: [...(pActiveFactions || [])], 
              pApexBuffs: { ...(pApexBuffs || {}) },
              aV, 
              aEffObj: enemyAction.effObj,
              aActiveFactions: [...(aActiveFactions || [])], 
              aApexBuffs: { ...(aApexBuffs || {}) },
              pAct: formatActionName(myLockedAction.action),
              aAct: formatActionName(enemyAction.action),
              oldPHP: hpRefs.current.p, oldAHP: hpRefs.current.a,
              newPHP: Math.max(0, hpRefs.current.p - totalMyDmg),
              newAHP: Math.max(0, hpRefs.current.a - totalAiDmg),
              newPEP: Math.min((isOnline && isCoop) ? 25 : 18, pEP + 2), 
              newAEP: Math.max(0, Math.min(18, aEP - (enemyAction.action === 'allin' ? 8 : enemyAction.action === 'konter' ? 6 : enemyAction.action === 'std' ? 2 : 0) - (enemyAction.effObj ? enemyAction.effObj.cost : 0) + 2)),
              dmgP: totalMyDmg, dmgA: totalAiDmg
          });
          return { p: 0, a: 0 };
      });
      setMyLockedAction(null); setRemoteActionData(null); setLocalAIActionData(null); setActiveEffObj(null);
  };
  // FIX (Bug #2): Ref nach jeder Definition synchron aktualisieren (Latest-Ref-Pattern).
  // Refs sind von Reacts "No side effects during render"-Regel ausgenommen.
  resolveClashRef.current = resolveClash;

  const executeAction = (actionType) => {
    const k = actionType === 'erholen' ? (curK || 'tech') : curK;
    if (actionType !== 'erholen' && !curK) return;

    // FIX: Tooltip sofort beim Klick killen, damit er nicht im Clash-Screen hängen bleibt!
    setHoveredEl(null);

    // Sektor Mutation: Tech Cartel (Taktiken billiger), Hegemony (All-In teurer)
    let dynCost = (activeEffObj && (activeEffObj.stat || '').toLowerCase() === (k || '').toLowerCase()) ? activeEffObj.cost : 0;
    if (sectorFaction?.id === 'TECH' && dynCost > 0) dynCost = Math.max(0, dynCost - 1);
    
    let baseCost = actionType === 'std' ? 2 : actionType === 'allin' ? 8 : actionType === 'konter' ? 6 : 0;
    if (sectorFaction?.id === 'HEGEMONY' && actionType === 'allin') baseCost = 10;
    
    const totalCost = baseCost + dynCost;

    // ONLINE LOGIK (Nur für PvP oder echtes Co-Op)
    if (isOnline && (!isRoguelike || isCoop)) {
        playSound('click');
        setPEP(prev => Math.max(0, prev - totalCost));
        if (conn || broadcast) netSend({ type: 'EP_SPENT', amount: totalCost, epoch: epochRef.current });

        const actData = { 
            action: actionType, category: k, effObj: activeEffObj, card: activeCard,
            activeFactions: pActiveFactions || [], apexBuffs: pApexBuffs || {},
            username: username,
            epoch: epochRef.current
        };
        setMyLockedAction(actData);
        setWaiting(true);

        if (isCoop) {
          let aiActiveEffObj = null;
          if (aEffHand[0] && normalizeStat(aEffHand[0].stat) === normalizeStat(k) && aEP >= (aEffHand[0].cost + 2)) {
              const chance = difficulty === 1 ? 0.2 : (difficulty === 2 ? 0.4 : (difficulty === 3 ? 0.7 : 0.9));
              if (Math.random() <= chance) aiActiveEffObj = aEffHand[0];
          }
          let aiAction = pTurn 
              ? getAIDefenseAction({ aVal: (aiCard?.[k] ?? aiCard?.stats?.[k] ?? 0), pVal: (activeCard?.[k] ?? activeCard?.stats?.[k] ?? 0), aEP, difficulty, pHP, aHP, aiMemory })
              : getAIAttackAction({ aEP, difficulty, pEP, pHP, aHP, maxAHP: initialAHP * squadSize });
          
          if (!pTurn) {
              if (aiAction === 'allin' && aEP < 8) aiAction = 'std';
              if (aiAction === 'std' && aEP < 2) aiAction = 'erholen';
          } else {
              if (aiAction === 'konter' && aEP < 6) aiAction = 'block';
          }
          
          const aiDataToSync = { 
              action: aiAction, category: k, effObj: aiActiveEffObj, card: aiCard,
              activeFactions: aActiveFactions || [], apexBuffs: aApexBuffs || {}
          };
          setLocalAIActionData(aiDataToSync);
          netSend({ type: 'ACTION', ...actData, localAI: aiDataToSync });
          return;
        }

        netSend({ type: 'ACTION', ...actData });
        return;
    }
    // Auch offline sofort abziehen für ein noch direkteres UI-Feedback
    setPEP(prev => Math.max(0, prev - totalCost));

    // NEU: Echte KI Entscheidungen basierend auf gameLogic anstatt hardcoded "std"/"block"!
    let aiAction = 'std';
    if (pTurn) {
        // Player greift an, KI verteidigt (inkl. Synergien gestackt)
        const getBuff = (facs, card, key) => {
            let totalBuff = 0;
            const cardFacs = Array.isArray(card.faction) ? card.faction : (card.faction ? [card.faction] : []);
            cardFacs.forEach(fac => {
                const myFac = fac.trim().toUpperCase();
                if (facs.includes(myFac)) {
                    const allFacs = [...new Set(cardsData.characters.flatMap(c => Array.isArray(c.faction) ? c.faction : [c.faction]))];
                    const originalFac = allFacs.find(f => (f||'').trim().toUpperCase() === myFac) || fac.trim();
                    const b = getFactionBuffs(originalFac) || {};
                    const map = { 'tech-hebel': 'tech', 'finanzmacht': 'finance', 'schattenmacht': 'kingmaking', 'schatten': 'kingmaking', 'systemrisiko': 'system', 'legitimität': 'legitimacy' };
                    const norm = s => map[(s || '').toLowerCase().trim()] || (s || '').toLowerCase().trim();
                    const bk = Object.keys(b).find(x => norm(x) === norm(key));
                    if (bk) totalBuff += parseInt(b[bk] || 0);
                }
            });
            return totalBuff;
        };
        
        const aiDefenseVal = parseInt(aiCard[k] ?? aiCard.stats?.[k] ?? 0) + ((parseInt(aiCard.level || 1) - 1) * 2) + getBuff(aActiveFactions, aiCard, k);
        const pAtkVal = parseInt(activeCard[k] ?? activeCard.stats?.[k] ?? 0) + ((parseInt(activeCard.level || 1) - 1) * 2) + getBuff(pActiveFactions, activeCard, k);
        aiAction = getAIDefenseAction({ aVal: aiDefenseVal, pVal: pAtkVal, aEP: aEP, difficulty, pHP, aHP, aiMemory });
    } else {
        // KI greift an — The Architect Bait!
        if (difficulty === 4 && activeCrisis && aEP < 6 && ((activeCrisis.id === 'HYPERINFLATION' && k === 'finance') || (activeCrisis.id === 'BLACKOUT' && k === 'tech'))) {
            aiAction = 'erholen';
        } else {
            aiAction = getAIAttackAction({ aEP: aEP, difficulty, pEP, pHP, aHP, maxAHP: initialAHP });
        }
    }

    // ── KI ANTI-CHEAT SYSTEM (SOLO) ──
    if (!pTurn) {
        if (aiAction === 'allin' && aEP < 8) aiAction = 'std';
        if (aiAction === 'std' && aEP < 2) aiAction = 'erholen';
    } else {
        if (aiAction === 'konter' && aEP < 6) aiAction = 'block';
    }

    // FIX: Taktik-Karten Nutzung dynamisch an die Kosten der gewählten Aktion binden!
    let aiActiveEffObj = null;
    const aiBaseCost = aiAction === 'allin' ? 8 : (aiAction === 'konter' ? 6 : (aiAction === 'std' ? 2 : 0));
    
    if (aEffHand[0] && normalizeStat(aEffHand[0].stat) === normalizeStat(k) && aiAction !== 'erholen') {
        if (aEP >= (aEffHand[0].cost + aiBaseCost)) {
            // Level-basierte Taktik-Chance
            const chance = difficulty === 1 ? 0.2 : (difficulty === 2 ? 0.4 : (difficulty === 3 ? 0.7 : 0.9));
            if (Math.random() <= chance) {
                aiActiveEffObj = aEffHand[0];
            }
        }
    }
    
    setMyLockedAction({ action: actionType, category: k, effObj: activeEffObj, card: activeCard });
    setRemoteActionData({ 
        action: aiAction, 
        category: k, 
        effObj: aiActiveEffObj,
        card: aiCard 
    });
  };

  const applyClashAck = (data, remoteCardName) => {
      // FIX: Taktik-Karte nach Nutzung WIRKLICH verbrauchen
      if (clashData?.pEffObj) {
          let nextEffHand = [...pEffHand];
          let nextEffDeck = [...pEffDeck];
          const usedIdx = nextEffHand.findIndex(e => e && e.name === clashData.pEffObj.name);

          if (usedIdx !== -1) {
              nextEffHand.splice(usedIdx, 1); // Aus der Hand entfernen
              
              // Sofort die nächste Karte vom Anfang des Stapels ziehen (falls noch welche da sind)
              if (nextEffHand.length === 0 && nextEffDeck.length > 0) {
                  nextEffHand.push(nextEffDeck[0]);
                  nextEffDeck = nextEffDeck.slice(1);
              }

              setPEffHand(nextEffHand);
              setPEffDeck(nextEffDeck);
          }
      }

      const nextHand = [...pHand]; nextHand.splice(activeIdx, 1);
      let currentDeck = [...pDeck];
      if (currentDeck.length === 0) {
          currentDeck = playerChars.filter(c => !nextHand.some(h => h && h.name === c.name));
          if (!isOnline) currentDeck = shuffle(currentDeck);
      }

      // OVERDRAW-LOOP: Zieht Karten nach bis exakt 3 — nie mehr.
      // Sender (2 Karten): spielt 1 → hat 1 → zieht 2 → zurück auf 3.
      // Empfänger (4 Karten): spielt 1 → hat 3 → zieht 0 → bleibt auf 3.
      // Overflow (5+ Karten): spielt 1 → hat 4 → zieht 0 → nächste Runde normalisiert.
      let drawnAt = null;
      while (currentDeck.length > 0 && nextHand.length < 3) {
          nextHand.push(currentDeck[0]);
          currentDeck = currentDeck.slice(1);
          if (drawnAt === null) drawnAt = nextHand.length - 1; // Index der ersten gezogenen Karte
      }

      // FIX: Nur ein einziger setPHand/setPDeck-Call
      setPHand(nextHand);
      setPDeck(currentDeck);

      let nextAHand = [...aHand];
      const aIdx = nextAHand.findIndex(c => c && c.name === remoteCardName);
      if (aIdx !== -1) nextAHand.splice(aIdx, 1);
      
      let currentAiDeck = [...aDeck];
      
      // KI zieht Karte nach (3 Handkarten System)
      if (currentAiDeck.length === 0) {
          // Friedhof recyceln, falls Deck leer
          const availableAiChars = aiChars.filter(c => !nextAHand.some(h => h && h.name === c.name));
          currentAiDeck = isOnline ? [...availableAiChars] : shuffle(availableAiChars);
      }
      
      while (currentAiDeck.length > 0 && nextAHand.length < 3) {
          nextAHand.push(currentAiDeck[0]);
          currentAiDeck = currentAiDeck.slice(1);
      }

      setAHand(nextAHand);
      setADeck(currentAiDeck);
      setActiveIdx(0); 
      setAActiveIdx(0);
      
      // SOUVERÄNER STATE: Nimm den Turn vom Host, falls vorhanden
      setPTurn(data?.nextTurn !== undefined ? data.nextTurn : !pTurnRef.current); 
      setCurK('');

      // BARRIER PROTOCOL: UI sperren und Ready an Host melden
      if (isOnline && isCoop) {
          const newEpoch = data?.epoch || epochRef.current + 1;
          setMatchEpoch(newEpoch);
          setSyncBarrier(true);
          
          if (isHost) {
              setBarrierReadies(prev => {
                  const next = prev + 1; // Host meldet sich selbst sofort bereit
                  if (next >= squadSize) {
                      setTimeout(() => {
                          if (broadcast) broadcast({ type: 'BARRIER_UNLOCK', epoch: newEpoch });
                          setSyncBarrier(false);
                      }, 50);
                      return 0;
                  }
                  return next;
              });
          } else {
              setTimeout(() => netSend({ type: 'BARRIER_READY', epoch: newEpoch }), 50);
          }
      }

      if (drawnAt !== null) {
        setJustDrawnIdx(drawnAt);
        setTimeout(() => setJustDrawnIdx(null), 800);
      }
      
      setTradeCooldown(prev => Math.max(0, prev - 1)); // NEU: Cooldown reduzieren

      let nextActiveCrisis = activeCrisis ? { ...activeCrisis } : null;      if (nextActiveCrisis) {
          nextActiveCrisis.turnsLeft -= 1;
          if (nextActiveCrisis.turnsLeft <= 0) nextActiveCrisis = null;
          setActiveCrisis(nextActiveCrisis);
          const increment = crisisLevel === 0 ? 5 : (crisisLevel === 1 ? 10 : 20);
          setCrisisRisk(Math.min(100, crisisRisk + increment));
      } else {
          // FIX: KRISE DARF NUR BEIM HOST BERECHNET WERDEN
          // Wir erzwingen in Online-Matches den Wert vom Host (data.riskHit).
          const roll = (isOnline && data && data.riskHit !== undefined) ? data.riskHit : Math.random() * 100;
          
          if (roll < crisisRisk) {
              const evIdx = (isOnline && data && data.crisisEv !== undefined) ? data.crisisEv : Math.floor(Math.random() * CRISIS_EVENTS.length);
              const randomEvent = CRISIS_EVENTS[evIdx];
              
              // GHOST MODULE: CRISIS ANCHOR - Verkürzt Krisen um 1 Runde
              const hasAnchor = (augments || []).some(a => a.type === 'crisis_anchor');
              const maxT = hasAnchor ? 5 : 6;
              const newCrisis = { ...randomEvent, turnsLeft: maxT, maxTurns: maxT };
              setActiveCrisis(newCrisis); 
              setCrisisRisk(0); 
              setCrisisLevel(crisisLevel + 1);

              setShowCrisisIntro(newCrisis); 
              playSound('crisis');
              setTimeout(() => setShowCrisisIntro(null), 2500);
          } else {
              const increment = crisisLevel === 0 ? 5 : (crisisLevel === 1 ? 10 : 20);
              setCrisisRisk(Math.min(100, crisisRisk + increment));
          }
      }
  };
  // FIX (Bug #3): Ref nach Definition aktualisieren (Latest-Ref-Pattern).
  applyClashAckRef.current = applyClashAck;

  const confirmClash = () => {
    playSound('click');
    setHoveredEl(null); // Sicherstellen, dass Tooltips beim Klicken verschwinden
    setCoopDmgBuffer({ p: 0, a: 0 }); // Hard-Reset des Puffers beim Schließen

    let finalPHP = clashData.newPHP;
    let finalAHP = clashData.newAHP;

    const epLimit = (isOnline && isCoop) ? 25 : 18;
    setPHP(finalPHP); 
    setAHP(finalAHP); 
    
    // Symmetrische Regeneration für KI/Boss (Im PvP wird aEP bereits über das Netzwerk gepflegt)
    if (!isOnline || isCoop) {
        setAEP(prev => Math.min(epLimit, clashData.newAEP));
    }
    
    // --- BOMBENFESTES SYNCING FÜR EP ---
    // Anstatt dass jeder Client lokal +2 rechnet und das Netzwerk mit EP_GAIN zuspammt,
    // nehmen wir einfach die absolute Wahrheit aus dem vom Host berechneten Snapshot!
    if (isOnline) {
        setPEP(clashData.newPEP);
    } else {
        setPEP(prev => Math.min(epLimit, clashData.newPEP));
    }

    if (finalPHP <= 0 || finalAHP <= 0) {
      const isWin = finalAHP <= 0 && finalPHP > 0;
      
      // THE LIFE LINK: Wenn wir den Boss getötet haben, gewinnt das Team!
      if (isWin && isOnline && isCoop && conn) {
          netSend({ type: 'TEAM_WIN' });
      }

      // FIX: Im Co-Op kann clashData.newPHP durch stale Refs fälschlicherweise 0 sein.
      // Wir nehmen den höchsten bekannten Wert: Ref (immer aktuell nach Blocks 1-3) vs. Display.
      const safeRemainingHP = (isWin && isCoop)
          ? Math.max(hpRefs.current.p, finalPHP, 1)
          : finalPHP;

      // FIX: Das Modal MUSS sofort geschlossen werden, damit die UI nicht freezt!
      setClashData(null); 
      
      // FIX: Kurzes Timeout und Error-Handling garantieren, dass der Hook sauber feuert.
      setTimeout(() => {
          let safeNews = { text: isWin ? "SYSTEM GESÄUBERT." : "VERBINDUNG VERLOREN." };
          try {
              if (typeof getSarcasticNews === 'function') {
                  safeNews = getSarcasticNews(isWin) || safeNews;
              }
          } catch(e) { console.warn("News Fallback Triggered:", e); }

          onEndGame({ 
            isWin, 
            sarcasmNews: safeNews, 
            ...(isRoguelike ? { remainingHP: safeRemainingHP } : {}),
            matchData: {
              ...matchStatsRef.current, // FIX: Den Ref nutzen, um Stale Closures bei Stats zu verhindern
              finalPHP: finalPHP,
              finalAHP: finalAHP,
              difficulty
            }
          });
      }, 50);

      return; 
    }

    if (isOnline) {
        setMyClashConfirmed(true);
        if (!isHost && (conn || broadcast)) {
            netSend({ type: 'CLASH_CONFIRM' });
        } else if (isHost) {
            setClashReadyCount(prev => {
                const next = prev + 1;
                if (broadcast) broadcast({ type: 'CLASH_READY_SYNC', count: next });
                return next;
            });
        }
    } else {
        applyClashAck({}, clashData.ac.name);
        setClashData(null);
    }
  };

  let dynEffCost = (activeEffObj && normalizeStat(activeEffObj.stat) === normalizeStat(curK)) ? activeEffObj.cost : 0;
  if (sectorFaction?.id === 'TECH' && dynEffCost > 0) dynEffCost = Math.max(0, dynEffCost - 1);
  
  const allInBase = sectorFaction?.id === 'HEGEMONY' ? 10 : 8;

  const canStd = curK && pEP >= (2 + dynEffCost);
  const canAllIn = curK && pEP >= (allInBase + dynEffCost);
  const canBlock = curK && pEP >= dynEffCost;
  const canKonter = curK && pEP >= (6 + dynEffCost);
  
  // FIX: Im Co-Op Modus (gegen KI) darf man SOFORT blocken, man muss nicht auf Remote-Daten warten!
  const canDefend = (!isOnline || isCoop) ? true : (remoteActionData !== null);

  let localWins = false;
  let remoteWins = false;
  let localIsLoser = false;
  let remoteIsLoser = false;

  if (clashData) {
      localWins = clashData.dmgA > clashData.dmgP;
      remoteWins = clashData.dmgP > clashData.dmgA;
      
      localIsLoser = clashData.pAct === 'ERHOLEN' || remoteWins;
      remoteIsLoser = clashData.aAct === 'ERHOLEN' || localWins;
  }

// --- NEU: Prüfen, ob die aktuelle Taktik-Karte zur aktiven Karte passt (Fix für Sheet-Listen) ---
  const activeEffOnCard = pEffHand[0];
  const activeCardNameLow = (activeCard?.name || '').toLowerCase();
  const isSynergyAvailable = useMemo(() => {
    if (!activeEffOnCard || !activeCard) return false;
    const synList = Array.isArray(activeEffOnCard.syn) ? activeEffOnCard.syn : (activeEffOnCard.syn ? [activeEffOnCard.syn] : []);
    const safeCardName = activeCard.name.toLowerCase().trim();
    
    return synList.some(name => {
        const cleanName = name.toString().toLowerCase().trim();
        return safeCardName.includes(cleanName) || cleanName.includes(safeCardName);
    });
  }, [activeEffOnCard, activeCard]);

 const handleReloadTactics = () => {
    if (pEP < 8 || waiting) return; // SPERRE: Keine 8 Energie mehr abziehen im Wartezustand!
    playSound('upgrade');
    setPEP(prev => prev - 8);
    if (isOnline && conn) netSend({ type: 'EP_SPENT', amount: 8 });
    const freshEffs = shuffle([...(Array.isArray(playerEffs) ? playerEffs : [])]);
    setPEffHand(freshEffs.slice(0, 1));
    setPEffDeck(freshEffs.slice(1));
  };

 return (
    <div id="game-ui" className="screen active" onMouseMove={(e) => {
        // PERFORMANCE BOOST: requestAnimationFrame verhindert React Re-Render Überlastung
        window.requestAnimationFrame(() => {
            const uiElement = document.getElementById('game-ui');
            const uiZoom = uiElement ? (parseFloat(getComputedStyle(uiElement).zoom) || 1) : 1;
            setMousePos({ x: e.clientX / uiZoom, y: e.clientY / uiZoom });
        });
    }} style={{ position: 'relative', width: '100%', height: '100%' }}>
      
      {/* ── SEKTOR BINARY RAIN ── */}
      {isRoguelike && sectorFaction && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', opacity: 0.35 }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${sectorFaction.color}0a 0%, transparent 80%)` }} />
          {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(i=>(
            <div key={i} className="binary-rain-col" style={{
              left:`${2+i*7}%`,
              '--dur':`${8+Math.random()*5}s`,
              '--delay':`${Math.random()*2}s`,
              color: sectorFaction.color,
              textShadow: `0 0 8px ${sectorFaction.color}`
            }}>
              {Array.from({length:20},()=>Math.random()>.5?'1':'0').join('\n')}
            </div>
          ))}
        </div>
      )}

      {/* ── RESPONSIVE SCALING & MASSIVE UI FIX ── */}
      <style>{`
        /* ── TURN INDICATOR CYBER STYLING ── */
        #turn-ind { 
          position: fixed !important; 
          left: 50% !important; 
          top: 0 !important; 
          transform: translateX(-50%) !important; 
          font-size: 1.6rem !important; 
          font-weight: 900 !important; 
          letter-spacing: 12px !important; 
          padding: 18px 70px 22px 70px !important; 
          background: linear-gradient(180deg, rgba(10,5,20,0.98) 0%, rgba(5,2,10,0.8) 100%) !important; 
          border: 1px solid rgba(255,255,255,0.08) !important; 
          border-top: none !important; 
          border-bottom: 3px solid !important; 
          border-radius: 0 0 16px 16px !important; 
          box-shadow: 0 15px 35px rgba(0,0,0,0.8) !important; 
          backdrop-filter: blur(10px); 
          white-space: nowrap; 
          z-index: 9999; 
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #turn-ind.turn-player { 
          border-bottom-color: var(--win) !important; 
          color: var(--win) !important; 
          text-shadow: 0 0 15px var(--win) !important; 
        }
        #turn-ind.turn-ai { 
          border-bottom-color: var(--lose) !important; 
          color: var(--lose) !important; 
          text-shadow: 0 0 15px var(--lose) !important; 
          animation: turnAlert 1s infinite alternate;
        }
        @keyframes turnAlert {
          from { filter: brightness(1); }
          to { filter: brightness(1.5); transform: translateX(-50%) scale(1.02); }
        }

        /* ── KRISE GLITCH EFFECT ── */
        .crisis-glitch-bar {
          position: relative;
          animation: crisisGlitchAnim 0.2s linear infinite, pulse 1.5s infinite !important;
        }
        .crisis-glitch-bar::before, .crisis-glitch-bar::after {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--lose);
          opacity: 0.6;
          pointer-events: none;
        }
        .crisis-glitch-bar::before {
          left: 2px;
          animation: glitchTop 0.4s linear infinite;
          clip-path: polygon(0 0, 100% 0, 100% 33%, 0 33%);
        }
        .crisis-glitch-bar::after {
          left: -2px;
          animation: glitchBot 0.3s linear infinite;
          clip-path: polygon(0 66%, 100% 66%, 100% 100%, 0 100%);
        }
        @keyframes crisisGlitchAnim {
          0%   { transform: translate(0) }
          20%  { transform: translate(-2px, 1px) }
          40%  { transform: translate(-1px, -1px) }
          60%  { transform: translate(2px, 1px) }
          80%  { transform: translate(1px, -1px) }
          100% { transform: translate(0) }
        }
        @keyframes glitchTop {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(-3px); }
        }
        @keyframes glitchBot {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(3px); }
        }

        #game-ui { 
          padding: 0 !important; 
          width: 100vw !important; 
          height: 100vh !important; 
          display: flex !important; 
          flex-direction: column !important;
          overflow: hidden !important; 
          background: 
            radial-gradient(circle at 50% 50%, rgba(20, 10, 35, 0.4) 0%, rgba(5, 2, 10, 0.95) 100%), 
            linear-gradient(rgba(0, 229, 255, 0.02) 1px, transparent 1px), 
            linear-gradient(90deg, rgba(0, 229, 255, 0.02) 1px, transparent 1px) !important;
          background-size: cover, 40px 40px, 40px 40px !important;
        }

        .module-tray {
          display: flex; gap: 8px; padding: 5px 15px;
          background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 4px; margin-right: 15px; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
        }
        .module-icon-mini {
          font-size: 1rem; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
          background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.3); border-radius: 3px; cursor: help; transition: all 0.2s;
        }

        /* ── KORREKTES LAYOUT VERHALTEN (Volle Breite) ── */
        .cockpit-layout {
          flex: 1 !important;
          width: 100% !important; 
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          position: relative !important;
          padding: 20px !important;
          min-height: 0 !important;
        }

        /* Arena Anker */
        .cockpit-arena-column {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          position: relative !important; 
          z-index: 10 !important;
          width: 100% !important;
          max-width: 1000px !important; /* Erhöht für 25% mehr Platz */
        }

        /* +25% MASSIVE HAUPTKARTE */
        .arena-card-wrapper { 
          width: 550px !important; 
          height: 770px !important;
          flex-shrink: 0 !important;
          z-index: 10 !important;
          filter: drop-shadow(0 20px 60px rgba(0,0,0,0.9)) !important;
        }

        /* +25% MASSIVE HANDKARTEN */
        .hand-hub { 
          gap: 35px !important; 
          margin-top: 45px !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }

        .hand-card-wrapper { 
          width: 225px !important; 
          height: 315px !important; 
          flex-shrink: 0 !important;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
        }

        /* ── EXTREM DICKE HP LEISTEN (+25% & weiter außen) ── */
        .hp-row { width: 100% !important; max-width: 1250px !important; margin: 0 auto 35px auto !important; }
        .hp-bar-pod { flex: 1 !important; }
        .hp-label { margin-bottom: 12px !important; font-size: 1.4rem !important; font-weight: bold !important; letter-spacing: 2px !important; }
        .hp-val { font-size: 2.2rem !important; }
        .hp-bar-bg { 
          height: 36px !important; /* Deutlich dicker */
          border-radius: 12px !important; 
          background: rgba(0,0,0,0.8) !important; 
          border: 2px solid rgba(255,255,255,0.15) !important; 
          box-shadow: inset 0 0 20px rgba(0,0,0,0.9) !important; 
          overflow: hidden !important; 
        }

        /* DECK-SPALTE NACH LINKS VERBANNEN (Weiter an den Rand) */
        .cockpit-draw-column {
          position: absolute !important;
          left: 20px !important;
          top: 50% !important;
          transform: translateY(-50%) scale(1.25) !important;
          transform-origin: center left !important;
          width: 140px !important;
          z-index: 5 !important;
        }

        /* AKTIONEN-SPALTE NACH RECHTS VERBANNEN (Weiter an den Rand & Z-Index fix) */
        .cockpit-action-column {
          position: absolute !important;
          right: -150px !important;
          top: 50% !important;
          transform: translateY(-50%) scale(1.35) !important;
          transform-origin: center right !important;
          width: 280px !important;
          z-index: 100 !important;

        /* EP & KRISE SIDEBARS (Weiter von der Karte weg) */
        .arena-side-bars {
          transform: scale(1.25) !important;
        }
        .left-bars { transform-origin: center right !important; margin-right: 50px !important; }
        .right-bars { transform-origin: center left !important; margin-left: 50px !important; }

        /* SQUAD MONITOR ÜBERLAGERND */
        .squad-status-container { 
          width: 300px !important; /* Größer */
          position: absolute !important;
          top: 80px !important;
          left: 20px !important;
          z-index: 20 !important;
        }

        /* RESPONSIVE SCALING (Springt erst bei kleineren Bildschirmen ein) */
        @media (max-width: 1600px) {
          .cockpit-action-column { right: 20px !important; transform: translateY(-50%) scale(1.1) !important; }
          .cockpit-draw-column { left: 20px !important; transform: translateY(-50%) scale(1.1) !important; }
        }

        /* Fallback auf normale 100% Werte, wenn Monitor < 1050px Höhe */
        @media (max-height: 1050px) {
          .arena-card-wrapper { width: 440px !important; height: 616px !important; }
          .hand-card-wrapper { width: 180px !important; height: 252px !important; }
          .hp-bar-bg { height: 26px !important; }
          .cockpit-action-column { transform: translateY(-50%) scale(1) !important; }
          .cockpit-draw-column { transform: translateY(-50%) scale(1) !important; }
          .arena-side-bars { transform: scale(1) !important; }
        }

        @media (max-height: 850px) {
          .arena-card-wrapper { width: 360px !important; height: 504px !important; }
          .hand-card-wrapper { width: 140px !important; height: 196px !important; }
          .hp-bar-bg { height: 20px !important; }
          .cockpit-action-column { transform: translateY(-50%) scale(0.9) !important; }
          .cockpit-draw-column { transform: translateY(-50%) scale(0.9) !important; }
        }
      `}</style>

      {showMatchIntro && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#000',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          opacity: introPhase === 2 ? 0 : 1,
          transition: introPhase === 0 ? 'none' : 'opacity 0.5s ease',
          pointerEvents: 'none',
        }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,229,255,0.03) 3px, rgba(0,229,255,0.03) 4px)', pointerEvents: 'none' }} />

          <div className="match-intro-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
              <div style={{
                transform: introPhase >= 1 ? 'translateY(0) scale(1)' : 'translateY(-30px) scale(0.85)',
                opacity: introPhase >= 1 ? 1 : 0,
                transition: 'transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.4s',
                fontFamily: 'monospace', letterSpacing: '12px',
                fontSize: '0.9rem', color: 'var(--ep)', textTransform: 'uppercase',
              }}>
              {isOnline ? '// P2P NETWORK MATCH //' 
                : isRoguelike && contextLabel 
                  ? `// ${contextLabel} //`
                  : `// THREAT LEVEL ${difficulty} — ${['','TRAINEE','OPERATIVE','EXECUTIVE','ARCHITECT'][difficulty]} //`}
              </div>

              <div style={{
                fontFamily: 'monospace', fontWeight: '900', fontSize: 'clamp(2.8rem, 8vw, 5rem)',
                letterSpacing: '6px', textTransform: 'uppercase', textAlign: 'center',
                color: '#fff',
                textShadow: '0 0 30px var(--ep), 0 0 60px rgba(0,229,255,0.3)',
                transform: introPhase >= 1 ? 'scale(1)' : 'scale(1.25)',
                opacity: introPhase >= 1 ? 1 : 0,
                transition: 'transform 0.5s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.5s',
              }}>
                ARCHITECTS<br/>
                <span style={{ color: 'var(--lose)', textShadow: '0 0 20px var(--lose)' }}>OF CHAOS</span>
              </div>

              <div style={{
                fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '8px',
                color: isOnline ? 'var(--ep)' : ['','var(--win)','var(--ep)','var(--r-epi)','var(--lose)'][difficulty],
                textShadow: `0 0 15px currentColor`,
                transform: introPhase >= 1 ? 'translateY(0)' : 'translateY(20px)',
                opacity: introPhase >= 1 ? 1 : 0,
                transition: 'transform 0.5s 0.1s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.5s 0.1s',
              }}>
                {isOnline ? 'ONLINE DUEL — ARCHITECT REWARDS' : 'SYSTEM BOOT SEQUENCE INITIATED'}
              </div>

              <div style={{ width: '320px', height: '2px', background: '#111', marginTop: '8px', overflow: 'hidden', opacity: introPhase >= 1 ? 1 : 0, transition: 'opacity 0.3s 0.3s' }}>
                <div style={{ height: '100%', background: 'var(--ep)', boxShadow: '0 0 8px var(--ep)', width: introPhase >= 1 ? '100%' : '0%', transition: 'width 1.2s linear 0.2s' }} />
              </div>
          </div>
        </div>
      )}

      {/* Das alte, störende Vollbild-Overlay wurde entfernt! */}

      <div className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="game-title-small" style={{ marginRight: '20px' }}>ARCHITECTS OF CHAOS {isOnline ? (isCoop ? '[CO-OP]' : '[1v1 PVP]') : ''}</div>
          
          {/* GHOST MODULE HUD TRAY */}
          {(augments && augments.length > 0) && (
            <div className="module-tray">
              {augments.map(mod => (
                <div 
                  key={mod.id} 
                  className={`module-icon-mini ${mod.type === 'synergy' ? 'syn-mod' : ''}`} 
                  title={`${mod.name}: ${mod.desc}`}
                >
                  {mod.icon || (mod.type === 'synergy' ? (getFactionIcon(mod.faction) || '🔗') : '📦')}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div id="turn-ind" className={pTurn ? 'turn-player' : 'turn-ai'}>{pTurn ? "▶ DEIN ZUG" : "⚠ GEGNER GREIFT AN"}</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          
          {/* ── SEKTOR REGEL BANNER (Als Gegenstück zum Modul-Tray rechts) ── */}
          {sectorFaction && (
            <div style={{
              display: 'flex', gap: '10px', alignItems: 'center',
              padding: '5px 15px', background: 'rgba(0,0,0,0.6)',
              border: `1px solid ${sectorFaction.color}44`, borderRadius: '4px',
              boxShadow: `inset 0 0 10px rgba(0,0,0,0.5), 0 0 10px ${sectorFaction.color}15`,
              marginRight: '10px'
            }}>
              <div className="mono" style={{ fontSize: '0.65rem', color: sectorFaction.color, letterSpacing: '2px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                {sectorFaction.name}
              </div>
              <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }} />
              <div className="mono" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                {sectorFaction.rule}
              </div>
            </div>
          )}

          <div className="mono" style={{ alignSelf: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
            {isRoguelike && contextLabel ? contextLabel : `LVL ${difficulty} Threat`}
          </div>
          <button className="btn-info" onClick={onShowRules}>RULES</button>
          <button className="btn-info" onClick={onShowSettings} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px' }}><Settings size={14} /></button>
          <button className="btn-back" onClick={handleAbort}>ABORT</button>
        </div>
      </div>

      {/* ── HUD LINKS: War Room & Squad Monitor (Side-by-Side) ── */}
      {/* MOBILE OPTIMIZATION START: Mobile Sidebar Toggles (nur sichtbar auf Mobile) */}
      {isMobile && (
        <>
          {/* Squad Monitor Toggle Button (linke Seite) */}
          {isRoguelike && (
            <button
              className="mobile-squad-toggle"
              onClick={() => { setIsSquadMobileOpen(o => !o); setIsWarRoomMobileOpen(false); }}
            >
              SQUAD
            </button>
          )}
          {/* War Room Toggle Button (rechte Seite) */}
          {isOnline && isCoop && partnerHand.length > 0 && (
            <button
              className="mobile-warroom-toggle"
              onClick={() => { setIsWarRoomMobileOpen(o => !o); setIsSquadMobileOpen(false); }}
            >
              WAR ROOM
            </button>
          )}
          {/* Backdrop für Mobile Overlays */}
          <div
            className={`mobile-sidebar-backdrop ${(isSquadMobileOpen || isWarRoomMobileOpen) ? 'open' : ''}`}
            onClick={() => { setIsSquadMobileOpen(false); setIsWarRoomMobileOpen(false); }}
          />
        </>
      )}
      {/* MOBILE OPTIMIZATION END */}

      <div style={{ position: 'absolute', top: '70px', left: '20px', zIndex: 100, display: isMobile ? 'none' : 'flex', alignItems: 'flex-start', gap: '20px', pointerEvents: 'none' }}>
        
        {/* WAR ROOM (Neural Link) */}
        {isOnline && isCoop && partnerHand.length > 0 && (
          <div className="partner-war-room" style={{
            display: 'flex', flexDirection: 'column', padding: '12px',
            background: 'rgba(5, 5, 10, 0.92)', backdropFilter: 'blur(8px)',
            border: `1px solid ${inspectedPartnerCard ? 'rgba(0,229,255,0.6)' : 'rgba(0,229,255,0.3)'}`,
            borderRadius: '8px', boxShadow: '0 5px 25px rgba(0,0,0,0.8)',
            pointerEvents: 'auto', 
            transition: 'border-color 0.2s, box-shadow 0.2s',
            maxWidth: 'max-content',
          }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div className="mono" style={{ color: 'var(--ep)', letterSpacing: '2px', fontSize: '0.7rem', textShadow: '0 0 8px var(--ep)' }}>
              [NEURAL LINK: PARTNER]
            </div>
            {inspectedPartnerCard && (
              <button
                onClick={() => setInspectedPartnerCard(null)}
                style={{
                  background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontSize: '0.75rem', padding: '0 4px', lineHeight: 1,
                }}
              >✕</button>
            )}
          </div>

          {/* Mini-Karten Reihe (Partner Hand) */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {partnerHand.map((c, i) => {
              const isSelected = inspectedPartnerCard?.name === c.name;
              return (
                <div
                  key={`ph-inspect-${i}`}
                  onClick={() => setInspectedPartnerCard(isSelected ? null : c)}
                  className="mini-card-wrapper"
                  style={{
                    borderColor: isSelected ? getRarityColor(c) : getRarityColor(c) + '44',
                    boxShadow: isSelected ? `0 0 12px ${getRarityColor(c)}88` : 'none',
                    transform: isSelected ? 'translateY(-3px)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    opacity: inspectedPartnerCard && !isSelected ? 0.4 : 1,
                    cursor: 'pointer'
                  }}
                >
                  <div className="mini-card-scale" style={{ filter: isSelected ? 'none' : 'saturate(0.7)', pointerEvents: 'none' }}>
                    {/* forceArtOnly entfernt, damit die ganze Karte gezeigt wird! */}
                    <Card card={c} context="hand" />
                  </div>
                </div>
              );
            })}

            {/* Taktik-Karte */}
            {partnerEffHand[0] && (() => {
              const eff = partnerEffHand[0];
              const isSelected = inspectedPartnerCard?.name === eff.name;
              return (
                <>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
                  <div
                    onClick={() => setInspectedPartnerCard(isSelected ? null : eff)}
                    className="mini-card-wrapper"
                    style={{
                      borderColor: isSelected ? 'var(--eff-col)' : 'rgba(0,255,204,0.3)',
                      boxShadow: isSelected ? '0 0 12px rgba(0,255,204,0.5)' : 'none',
                      transform: isSelected ? 'translateY(-3px)' : 'none',
                      transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      opacity: inspectedPartnerCard && !isSelected ? 0.4 : 1,
                      cursor: 'pointer'
                    }}
                  >
                    <div className="mini-card-scale" style={{ filter: isSelected ? 'none' : 'saturate(0.7)', pointerEvents: 'none' }}>
                      <Card card={eff} context="hand" />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* ── Inspektor-Panel: fade-in unter der Reihe ── */}
          {inspectedPartnerCard && (
            <div style={{
              marginTop: '10px',
              borderTop: `1px solid ${getRarityColor(inspectedPartnerCard)}44`,
              paddingTop: '10px',
              animation: 'warRoomInspectorIn 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
            }}>
              <style>{`
                @keyframes warRoomInspectorIn {
                  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
                  to   { opacity: 1; transform: translateY(0)    scale(1);    }
                }
              `}</style>

              {/* Karten-Name + Typ Label */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div className="mono" style={{ fontSize: '0.58rem', color: getRarityColor(inspectedPartnerCard), letterSpacing: '2px', fontWeight: 700 }}>
                  {inspectedPartnerCard.name?.toUpperCase()}
                </div>
              </div>

              {/* Vollständige Karte — skaliert auf 0.58 mit scroll-proof overflow */}
              <div style={{ position: 'relative', width: '210px', height: '292px', overflow: 'hidden', borderRadius: '6px' }}>
                <div style={{ transform: 'scale(0.58)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                  <Card
                    card={inspectedPartnerCard}
                    context="lexicon"
                    curCategory={curK}
                    activeCrisis={activeCrisis}
                  />
                </div>
              </div>

              {/* Level + Fraktion Badge */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '7px', flexWrap: 'wrap' }}>
                <div className="mono" style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 7px', borderRadius: '3px' }}>
                  LVL {inspectedPartnerCard.level || 1}
                </div>
                {inspectedPartnerCard.faction && (
                  <div className="mono" style={{ fontSize: '0.52rem', color: getRarityColor(inspectedPartnerCard), background: `${getRarityColor(inspectedPartnerCard)}14`, border: `1px solid ${getRarityColor(inspectedPartnerCard)}44`, padding: '2px 7px', borderRadius: '3px' }}>
                    {inspectedPartnerCard.faction.toUpperCase()}
                  </div>
                )}
                {inspectedPartnerCard.type && inspectedPartnerCard.type !== 'std' && (
                  <div className="mono" style={{ fontSize: '0.52rem', color: '#bc13fe', background: 'rgba(188,19,254,0.08)', border: '1px solid rgba(188,19,254,0.3)', padding: '2px 7px', borderRadius: '3px' }}>
                    {inspectedPartnerCard.type.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NEU: HOLOGRAFISCHES TRADE FIELD UNTER DEM WAR ROOM */}
          <style>{`
            @keyframes flyInFromHand {
              0%   { transform: translate(35vw, 35vh) scale(0.8) rotate(-10deg); opacity: 0; }
              100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes flyInFromPartner {
              0%   { transform: translateY(-80px) scale(0.5); opacity: 0; }
              100% { transform: translateY(0) scale(1); opacity: 1; }
            }
            @keyframes flyOutToPartner {
              0%   { transform: translate(0, 0) scale(1); opacity: 1; z-index: 100; filter: brightness(1.5); }
              100% { transform: translateY(-20vh) scale(0.5); opacity: 0; z-index: 100; filter: brightness(1); }
            }
            @keyframes flyOutToHand {
              0%   { transform: translate(0, 0) scale(1); opacity: 1; z-index: 100; filter: brightness(1.5) drop-shadow(0 0 20px #bc13fe); }
              100% { transform: translate(35vw, 35vh) scale(0.8) rotate(10deg); opacity: 0; z-index: 100; filter: brightness(1) drop-shadow(none); }
            }
          `}</style>
          <div style={{
            marginTop: '15px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px',
            background: 'rgba(5,5,10,0.85)', padding: '15px', borderRadius: '8px',
            border: '1px solid rgba(0,229,255,0.3)', backdropFilter: 'blur(10px)',
            boxShadow: '0 0 25px rgba(0,0,0,0.7)',
            pointerEvents: 'auto'
          }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '-5px' }}>
               <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--ep)', letterSpacing: '2px' }}>▸ CO-OP TRANSFER</div>
               {hasTradedThisNode ? (
                 <div className="mono" style={{ fontSize: '0.6rem', color: '#888', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '3px', border: '1px solid #555' }}>
                   LIMIT ERREICHT
                 </div>
               ) : tradeCooldown > 0 ? (
                 <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--lose)', background: 'rgba(255,0,50,0.1)', padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--lose)' }}>
                   COOLDOWN: {tradeCooldown}
                 </div>
               ) : null}
             </div>
             
             {/* Mein Angebot */}
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
                <span className="mono" style={{ fontSize: '0.55rem', color: 'var(--win)' }}>DEIN ANGEBOT (AKTIVE KARTE)</span>
                <div style={{ 
                    width: '90px', height: '126px', border: '1px dashed var(--win)', borderRadius: '4px', position: 'relative',
                    animation: tradeAnimPhase === 'offering' ? 'flyInFromHand 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 
                               tradeAnimPhase === 'resolving' ? 'flyOutToPartner 0.8s cubic-bezier(0.5, 0, 0.2, 1) forwards' : 'none'
                }}>
                    {myTradeOffer ? (
                       <div onClick={handleCancelOffer} style={{ cursor: 'pointer', transform: 'scale(0.25)', transformOrigin: 'top left', width: '360px', height: '504px' }}>
                           <Card card={myTradeOffer} context="hand" forceArtOnly={true} />
                           <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,0,50,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', opacity: 0, transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                              <span style={{ fontSize: '10rem', color: '#fff' }}>✕</span>
                           </div>
                       </div>
                    ) : (
                       <button onClick={handleOfferCard} disabled={!activeCard || tradeAnimPhase === 'resolving' || tradeCooldown > 0 || hasTradedThisNode} className="menu-btn" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: 0, margin: 0, background: 'transparent', borderColor: 'transparent', color: 'var(--win)', fontSize: '3rem', cursor: (activeCard && tradeAnimPhase !== 'resolving' && tradeCooldown === 0 && !hasTradedThisNode) ? 'pointer' : 'default', opacity: (activeCard && tradeAnimPhase !== 'resolving' && tradeCooldown === 0 && !hasTradedThisNode) ? 1 : 0.2 }}>+</button>
                    )}
                </div>
             </div>.

             {/* Tausch-Action Center */}
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <span style={{ fontSize: '1.5rem', color: (myTradeReady && remoteTradeReady) ? 'var(--win)' : '#555', transition: '0.3s' }}>⇅</span>
                {myTradeOffer && remoteTradeOffer ? (
                   <button onClick={handleAcceptTrade} disabled={myTradeReady || tradeAnimPhase === 'resolving'} className="menu-btn btn-primary" style={{ padding: '8px', fontSize: '0.55rem', margin: '5px 0 0 0', opacity: (myTradeReady || tradeAnimPhase === 'resolving') ? 0.5 : 1, width: '100%' }}>
                      {(myTradeReady || tradeAnimPhase === 'resolving') ? 'WARTE AUF PARTNER' : 'TAUSCH AKZEPTIEREN'}
                   </button>
                ) : (
                   <span className="mono" style={{ fontSize: '0.5rem', color: '#888', textAlign: 'center', marginTop: '5px' }}>BEIDE AGENTEN<br/>MÜSSEN ANBIETEN</span>
                )}
             </div>

             {/* Partner Angebot */}
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%', marginTop: '5px' }}>
                <span className="mono" style={{ fontSize: '0.55rem', color: '#bc13fe' }}>PARTNER ANGEBOT</span>
                <div style={{ 
                    width: '90px', height: '126px', border: '1px dashed #bc13fe', borderRadius: '4px', position: 'relative', overflow: 'hidden',
                    animation: tradeAnimPhase === 'receiving_offer' ? 'flyInFromPartner 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 
                               tradeAnimPhase === 'resolving' ? 'flyOutToHand 0.8s cubic-bezier(0.5, 0, 0.2, 1) forwards' : 'none'
                }}>
                    {remoteTradeOffer ? (
                       <div style={{ transform: 'scale(0.25)', transformOrigin: 'top left', width: '360px', height: '504px', filter: remoteTradeReady ? 'drop-shadow(0 0 20px #bc13fe)' : 'none' }}>
                           <Card card={remoteTradeOffer} context="hand" forceArtOnly={true} />
                       </div>
                    ) : (
                       <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#555', fontSize: '1.5rem' }}>?</div>
                    )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* SQUAD MONITOR (Rechts neben dem War Room) */}
      {isRoguelike && (
        <div className="squad-status-container" style={{ pointerEvents: 'auto', width: '260px', background: 'rgba(5, 5, 10, 0.92)', backdropFilter: 'blur(8px)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 5px 25px rgba(0,0,0,0.8)' }}>
          
          {/* KLAPP-BUTTON FÜR DEN SQUAD */}
          <div 
            className="mono" 
            onClick={() => setIsSquadOpen(!isSquadOpen)}
            style={{ 
              fontSize: '0.65rem', color: isSquadOpen ? 'var(--win)' : 'rgba(255,255,255,0.6)', 
              letterSpacing: '2px', textAlign: 'center', 
              borderBottom: isSquadOpen ? '1px solid rgba(0,229,255,0.3)' : '1px solid rgba(255,255,255,0.1)', 
              cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: isSquadOpen ? 'rgba(0, 229, 255, 0.05)' : 'rgba(0,0,0,0.6)',
              borderRadius: '6px', padding: '8px 12px', marginBottom: '10px',
              transition: 'all 0.2s ease-in-out',
              boxShadow: isSquadOpen ? '0 0 10px rgba(0,229,255,0.1)' : 'none'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.15)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.background = isSquadOpen ? 'rgba(0, 229, 255, 0.05)' : 'rgba(0,0,0,0.6)'; 
              e.currentTarget.style.color = isSquadOpen ? 'var(--win)' : 'rgba(255,255,255,0.6)';
            }}
          >
            <span>▸ SQUAD ({playerChars.length}/6)</span>
            <span style={{ transform: isSquadOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
          </div>

          {/* SQUAD CHIP LIST */}
          {isSquadOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
              {Array.from({ length: 6 }).map((_, i) => {
                const c = playerChars[i];
                const factions = c && c.faction ? (Array.isArray(c.faction) ? c.faction : [c.faction]) : [];
                return (
                  <div key={`sq-slot-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderLeft: `4px solid ${c ? getRarityColor(c) : '#222'}`,
                    overflow: 'hidden', pointerEvents: 'auto'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '22px', flexShrink: 0 }}>
                      {c?.gti != null && c?.type !== 'effect' && c?.buff === undefined ? (
                        <>
                          <div className="mono" style={{ fontSize: '0.55rem', color: getRarityColor(c), letterSpacing: '1px', lineHeight: 1, opacity: 0.6 }}>GTI</div>
                          <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: getRarityColor(c), lineHeight: 1, textShadow: `0 0 6px ${getRarityColor(c)}` }}>{c.gti}</div>
                        </>
                      ) : (
                        <div className="mono" style={{ fontSize: '0.9rem', color: c ? getRarityColor(c) : 'rgba(255,255,255,0.3)' }}>
                          {c ? (c.type === 'effect' ? '◈' : '⬡') : '○'}
                        </div>
                      )}
                    </div>
                    {factions.length > 0 && (
                      <div className="mono" style={{ fontSize: '1.1rem', color: getRarityColor(c), textShadow: `0 0 8px ${getRarityColor(c)}`, width: '20px', textAlign: 'center', flexShrink: 0, marginTop: '-2px' }}>
                        {getFactionIcon(factions[0])}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: c ? '#fff' : '#444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c ? c.name.toUpperCase() : '--- LEERER SLOT ---'}
                      </div>
                    </div>
                    {c && <div className="mono" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>L{c.level || 1}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div> {/* ENDE DES LINKEN HUD WRAPPERS */}

      {/* MOBILE OPTIMIZATION START: Mobile Overlay Panels für Squad Monitor & War Room */}
      {isMobile && isRoguelike && (
        <div className={"mobile-squad-overlay " + (isSquadMobileOpen ? 'open' : '')}>
          <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--win)', letterSpacing: '2px', marginBottom: '15px', borderBottom: '1px solid rgba(0,229,255,0.3)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>SQUAD ({playerChars.length}/6)</span>
            <button onClick={() => setIsSquadMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1rem', cursor: 'pointer' }}>x</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Array.from({ length: 6 }).map((_, i) => {
              const c = playerChars[i];
              const factions = c && c.faction ? (Array.isArray(c.faction) ? c.faction : [c.faction]) : [];
              return (
                <div key={"msq-" + i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderLeft: "4px solid " + (c ? getRarityColor(c) : '#222') }}>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem', fontWeight: 700, color: c ? '#fff' : '#444', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c ? c.name.toUpperCase() : '--- LEERER SLOT ---'}
                  </div>
                  {c && <div className="mono" style={{ fontSize: '0.6rem', color: getRarityColor(c), flexShrink: 0 }}>GTI {c.gti}</div>}
                  {factions[0] && <div style={{ fontSize: '0.9rem' }}>{getFactionIcon(factions[0])}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isMobile && isOnline && isCoop && partnerHand.length > 0 && (
        <div className={"mobile-warroom-overlay " + (isWarRoomMobileOpen ? 'open' : '')}>
          <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--ep)', letterSpacing: '2px', marginBottom: '15px', borderBottom: '1px solid rgba(255,215,0,0.3)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textShadow: '0 0 8px var(--ep)' }}>
            <span>[NEURAL LINK: PARTNER]</span>
            <button onClick={() => setIsWarRoomMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1rem', cursor: 'pointer' }}>x</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {partnerHand.map((c, i) => (
              <div key={"mob-ph-" + i} className="mini-card-wrapper" style={{ borderColor: getRarityColor(c) + '44' }}>
                <div className="mini-card-scale" style={{ filter: 'saturate(0.7)' }}>
                  <Card card={c} context="hand" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* MOBILE OPTIMIZATION END */}

     <div className="cockpit-layout">
        {/* ── Draw pile ── */}
        <div className="cockpit-draw-column" style={isRoguelike ? { width: '0px', padding: 0, margin: 0, overflow: 'hidden' } : {}}>
          {!isRoguelike && <DrawPile charCount={pDeck.length} effCount={pEffDeck.length}/>}
        </div>
        <div className="cockpit-arena-column" style={{ gap: '15px' }}>

          {/* ── HP-Leisten oben (horizontal) ─────────────────────────── */}
          <div className="hp-row">
            <div className="hp-bar-pod">
              <div className="hp-label">
                <span style={{ color: isCoop ? 'var(--ep)' : 'inherit', textShadow: isCoop ? '0 0 8px var(--ep)' : 'none', fontWeight: isCoop ? '900' : 'normal', letterSpacing: isCoop ? '2px' : '0' }}>
                  {isCoop ? 'TEAM HP' : 'DU'}
                </span>
                <span className="mono hp-val" style={{ color: isCoop ? 'var(--ep)' : 'var(--win)' }}>{Math.floor(pHP)}</span>
              </div>
              <div className="hp-bar-bg">
                <div className={`hp-bar-fill ${isCoop ? 'ep-bg' : 'win-bg'}`} style={{ width: `${(pHP / initialPHP) * 100}%` }} />
              </div>
            </div>
            <div className="hp-divider" />
            <div className="hp-bar-pod">
              <div className="hp-label">
                <span className="mono hp-val" style={{ color: 'var(--lose)' }}>{Math.floor(aHP)}</span>
                <span>GEGNER</span>
              </div>
              <div className="hp-bar-bg">
                <div className="hp-bar-fill lose-bg" style={{ width: `${(aHP / (isCoop ? initialAHP * 2 : initialAHP)) * 100}%` }} />
              </div>
            </div>
          </div>
          
          {/* GHOST MODULE: SYS_SCANNER UI — nur beim ersten Clash pro Node */}
          {(augments || []).some(a => a.type === 'scanner') && isFirstClashRef.current && aHand.length > 0 && !clashData && (
            <div style={{
              position: 'absolute', top: '100px', left: '-260px', width: '250px', zIndex: 15,
              padding: '10px 16px',
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0,229,255,0.2)',
              borderLeft: '3px solid #00e5ff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
              overflow: 'hidden',
            }}>
              {/* Sweep-Animation */}
              <div style={{
                position: 'absolute', top: 0, left: '-60%', width: '60%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.07), transparent)',
                animation: 'scannerSweep 2.5s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
              <style>{`@keyframes scannerSweep { 0%{left:-60%} 100%{left:160%} }`}</style>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="mono" style={{ fontSize: '0.9rem', color: '#00e5ff', textShadow: '0 0 10px rgba(0,229,255,0.8)' }}>◬</div>
                  <div className="mono" style={{ fontSize: '0.5rem', color: 'rgba(0,229,255,0.55)', letterSpacing: '3px' }}>SYS_SCANNER // GEGNER-HAND ENTSCHLÜSSELT</div>
                </div>
                <div className="mono" style={{ fontSize: '0.48rem', color: '#000', background: '#00e5ff', padding: '2px 7px', letterSpacing: '1px', flexShrink: 0 }}>EINMALIG</div>
              </div>

              {/* 3 Karten */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {aHand.slice(0, 3).map((card, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 10px', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)' }}>
                    <div className="mono" style={{ fontSize: '0.55rem', color: 'rgba(0,229,255,0.4)', width: '14px', flexShrink: 0 }}>0{i + 1}</div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.9rem', fontWeight: 700, color: '#fff', letterSpacing: '1px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card?.name.toUpperCase()}
                    </div>
                    <div className="mono" style={{ fontSize: '0.48rem', color: 'rgba(0,229,255,0.35)', flexShrink: 0 }}>GTI {card?.gti ?? '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Aktive Krise Banner (Zentriert & Höher) ───────────────────────────────────── */}
          {activeCrisis && (
            <div style={{ position: 'absolute', top: '-15px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
              <div 
                className="active-crisis-banner"
                style={{ cursor: 'help', whiteSpace: 'nowrap' }}
                onMouseEnter={() => handleTTEnter('crisis-banner')}
                onMouseLeave={() => handleTTLeave()}
                onClick={() => handleTTTap('crisis-banner')}
              >
                {hoveredEl === 'crisis-banner' && !isMobile && (
                  <TT isMobile={false} mousePos={mousePos} lines={[
                    '⚠️ SYSTEMKRISE AKTIV',
                    activeCrisis.desc,
                    `Verbleibend: ${activeCrisis.turnsLeft} Runden`
                  ]} />
                )}
                <span className="cr-name" style={{ fontSize: '0.6rem', textAlign: 'center' }}>
                  ⚠️ {activeCrisis.name} ⚠️
                </span>
              </div>
            </div>
          )}
          {/* ── Arena: ⚡ links | Karte | KRISE rechts ───────────────── */}
          <div className="arena-row">
            <div className="arena-side-bars left-bars">
              {/* MOBILE OPTIMIZATION START: onClick für Mobile-Tooltips, onMouseEnter/Leave für Desktop */}
              <div className="bar-pod" style={{ '--accent': 'var(--ep)', position: 'relative', cursor: 'help' }}
                onMouseEnter={() => handleTTEnter('ep')}
                onMouseLeave={() => handleTTLeave()}
                onClick={() => handleTTTap('ep')}
              >
                <div className="v-bar-label">⚡</div>
                <div className="vertical-bar-container">
                  <div className="v-bar-fill ep-bg" style={{ height: `${(pEP / ((isOnline && isCoop) ? 25 : 18)) * 100}%` }}></div>
                </div>
                <div className="v-bar-val">{pEP}</div>
              </div>
            </div>

            <div className="arena-card-wrapper">
              <Card 
                card={activeCard} 
                context="game" 
                activeEffect={activeEffObj} 
                apexBuffs={pApexBuffs}
                activeCrisis={activeCrisis}
                curCategory={curK} 
                isPlayerTurn={pTurn} 
                onStatClick={handleStatClick} 
                highlightSynergyStat={isSynergyAvailable ? activeEffOnCard.stat : null}
                lightGyro={true}
                lockedStat={pTurn ? lastAttackStat : null}
                activeFactions={pActiveFactions}
              />
            </div>

            <div className="arena-side-bars right-bars">
              <div className="bar-pod" style={{ '--accent': activeCrisis ? 'var(--lose)' : 'var(--crisis)', position: 'relative', cursor: 'help' }}
                onMouseEnter={() => handleTTEnter('crisis')}
                onMouseLeave={() => handleTTLeave()}
                onClick={() => handleTTTap('crisis')}
              >
                <div className="v-bar-label" style={{ color: activeCrisis ? 'var(--lose)' : '', textShadow: activeCrisis ? '0 0 8px var(--lose)' : 'none' }}>KRISE</div>
                <div className="vertical-bar-container" style={{ borderColor: activeCrisis ? 'var(--lose)' : '', boxShadow: activeCrisis ? '0 0 10px rgba(255,0,50,0.2)' : 'none', overflow: 'hidden' }}>
                  <div className={`v-bar-fill crisis-bg ${activeCrisis ? 'crisis-glitch-bar' : ''}`} style={{ 
                    height: activeCrisis ? `${(activeCrisis.turnsLeft / (activeCrisis.maxTurns || 6)) * 100}%` : `${crisisRisk}%`, 
                    background: activeCrisis ? 'var(--lose)' : '', 
                    boxShadow: activeCrisis ? '0 0 15px var(--lose)' : '',
                    transition: 'height 0.4s ease-out'
                  }}></div>
                </div>
                <div className="v-bar-val" style={{ 
                  color: activeCrisis ? 'var(--lose)' : '', 
                  background: 'transparent',
                  fontSize: activeCrisis ? '0.65rem' : '',
                  fontWeight: activeCrisis ? 'bold' : '',
                  textShadow: activeCrisis ? '0 0 10px var(--lose)' : 'none',
                  boxShadow: 'none'
                }}>
                  {activeCrisis ? `${activeCrisis.turnsLeft} R` : `${crisisRisk}%`}
                </div>
              </div>
            </div>
          </div>

          {/* HANDKARTEN UNTER DER ARENA */}
          <div className="hand-hub" style={{ position: 'relative', marginTop: '5px' }}>
            
            <div className="hand-grid">
              {pHand.map((c, i) => {
                const isActive = i === activeIdx;
                return (
                  <div
                    key={i}
                    className={`hand-card-wrapper ${isActive ? 'active' : ''} ${justDrawnIdx === i ? 'card-just-drawn' : ''}`}
                    onClick={() => { playSound('click'); setActiveIdx(i); }}
                  >
                    <div style={{ width: '100%', height: '100%' }}>
                      <Card card={c} context="hand" activeFactions={pActiveFactions} />
                    </div>
                    {isActive && <div className="hand-card-glow-char" />}
                  </div>
                );
              })}
            </div>

            <div className="tactic-separator"></div>

            <div className="tactic-grid" style={{ display: 'flex', alignItems: 'center' }}>
              {pEffHand[0] ? (
                <div
                  className={`hand-card-wrapper ${activeEffObj ? 'active' : ''}`}
                  onClick={handleToggleEffect}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setHoveredEl('tactic')}
                  onMouseLeave={() => setHoveredEl(null)}
                >
                  <div style={{ width: '100%', height: '100%' }}>
                    <Card card={pEffHand[0]} context="hand" activeFactions={pActiveFactions} />
                  </div>
                  {activeEffObj && <div className="hand-card-glow-eff" />}
                </div>
              ) : (
                <div className="empty-tactic-slot" style={{ flexDirection: 'column', gap: '8px' }}>
                  <span className="mono">LEER</span>
                  {pEffDeck.length === 0 && (
                    <button 
                      onClick={handleReloadTactics}
                      disabled={pEP < 8}
                      style={{ background: 'transparent', border: '1px solid var(--eff-col)', color: 'var(--eff-col)', fontSize: '0.55rem', padding: '4px 6px', cursor: pEP >= 8 ? 'pointer' : 'not-allowed', opacity: pEP >= 8 ? 1 : 0.4, borderRadius: '4px', zIndex: 10, letterSpacing: '1px', fontWeight: 'bold' }}
                    >
                      RELOAD (-8⚡)
                    </button>
                  )}
                </div>
              )}

              {/* Micro Tactic Deck Display */}
              <div className="tactic-deck-display">
                {pEffDeck.slice(0, 4).map((eff, i) => (
                  <div key={`eff-deck-${i}`} className="micro-card-wrapper">
                    <div className="micro-card-scale">
                      <Card card={eff} context="hand" />
                    </div>
                  </div>
                ))}
                {pEffDeck.length > 4 && (
                  <div className="mono" style={{ fontSize: '0.45rem', color: 'var(--eff-col)', alignSelf: 'center' }}>
                    +{pEffDeck.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* #010 Deck counter */}
          <div className="mono" style={{textAlign:'center',padding:'4px 0',fontSize:'0.6rem',color:'rgba(255,255,255,0.28)',letterSpacing:'2px',borderTop:'1px solid rgba(255,255,255,0.04)',marginTop:'4px'}}>
            DECK: {pDeck.length} · TAKTIKEN: {pEffDeck.length}
          </div>
        </div>

        <div className="cockpit-action-column">
          <div className="action-container">
            {syncBarrier ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '15px', padding: '20px', textAlign: 'center', background: 'rgba(188, 19, 254, 0.05)', border: '1px solid rgba(188, 19, 254, 0.3)', borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#bc13fe', animation: 'pulse 1.5s infinite' }} />
                  <div className="mono" style={{ color: '#bc13fe', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '2px', animation: 'pulse 1s infinite', textShadow: '0 0 15px rgba(188,19,254,0.6)' }}>
                     [ SYNCING NEURAL BRIDGE ]
                  </div>
                  <div className="mono" style={{ color: '#aaa', fontSize: '0.75rem', letterSpacing: '2px' }}>
                     ALIGNING SQUAD STATE...
                  </div>
               </div>
            ) : myLockedAction ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '15px', padding: '20px', textAlign: 'center', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--win)', animation: 'pulse 1.5s infinite' }} />
                  
                  <div className="mono" style={{ color: 'var(--win)', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '2px' }}>
                     [ACTION LOCKED]
                  </div>
                  
                  <div className="mono" style={{ color: '#aaa', fontSize: '0.85rem', letterSpacing: '1px', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '4px', borderLeft: '2px solid var(--win)' }}>
                     {formatActionName(myLockedAction.action)} // {myLockedAction.category.toUpperCase()}
                  </div>

                  {(isOnline && (isCoop ? (partnerActions.length < squadSize - 1) : !remoteActionData)) ? (
                     <button 
                        onClick={handleCancelAction} 
                        className="menu-btn" 
                        style={{ marginTop: '10px', padding: '8px 24px', background: 'rgba(255,0,80,0.1)', borderColor: 'var(--lose)', color: 'var(--lose)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '2px', transition: 'all 0.2s', boxShadow: '0 0 10px rgba(255,0,80,0.2)' }}
                     >
                        ✕ ABBRECHEN
                     </button>
                  ) : (
                     <div className="mono" style={{ color: 'var(--ep)', fontSize: '0.8rem', marginTop: '10px', animation: 'pulse 1s infinite', textShadow: '0 0 10px var(--ep)' }}>
                        {isOnline ? 'SYNCING CLASH...' : 'SYSTEM CALCULATING...'}
                     </div>
                  )}
               </div>
            ) : pTurn ? (
              <>
                {/* MOBILE OPTIMIZATION START: Dual-Mode Tooltip (Hover Desktop, Tap Mobile) */}
                <div style={{ position: 'relative' }} onMouseEnter={() => handleTTEnter('erholen')} onMouseLeave={() => handleTTLeave()} onClick={() => handleTTTap('erholen')}>
                  <button className="btn-act" onClick={(e) => { e.stopPropagation(); executeAction('erholen'); }}>
                    <span className="act-title">ERHOLEN</span>
                    <span className="act-cost">+2⚡</span>
                  </button>
                </div>
                <div style={{ position: 'relative' }} onMouseEnter={() => handleTTEnter('std')} onMouseLeave={() => handleTTLeave()} onClick={() => handleTTTap('std')}>
                  <button className="btn-act btn-primary" style={{ opacity: canStd ? 1 : 0.4 }} onClick={(e) => { e.stopPropagation(); canStd && executeAction('std'); }}>
                    <span className="act-title">STANDARD</span>
                    <span className="act-cost">-{2 + dynEffCost}⚡</span>
                  </button>
                </div>
                <div style={{ position: 'relative' }} onMouseEnter={() => handleTTEnter('allin')} onMouseLeave={() => handleTTLeave()} onClick={() => handleTTTap('allin')}>
                  <button className="btn-act btn-danger" style={{ opacity: canAllIn ? 1 : 0.4 }} onClick={(e) => { e.stopPropagation(); canAllIn && executeAction('allin'); }}>
                    <span className="act-title">ALL-IN</span>
                    <span className="act-cost">-{allInBase + dynEffCost}⚡</span>
                  </button>
                </div>
                {/* MOBILE OPTIMIZATION END */}
              </>
            ) : (
              <>
                {/* MOBILE OPTIMIZATION START: Dual-Mode Tooltip für Verteidigung */}
                <div style={{ position: 'relative' }} onMouseEnter={() => handleTTEnter('block')} onMouseLeave={() => handleTTLeave()} onClick={() => handleTTTap('block')}>
                  <button className="btn-act btn-primary" style={{ opacity: canBlock && canDefend ? 1 : 0.4 }} onClick={(e) => { e.stopPropagation(); canBlock && canDefend && executeAction('block'); }}>
                    <span className="act-title">BLOCKEN</span>
                    <span className="act-cost">-{dynEffCost}⚡</span>
                  </button>
                </div>
                <div style={{ position: 'relative' }} onMouseEnter={() => handleTTEnter('konter')} onMouseLeave={() => handleTTLeave()} onClick={() => handleTTTap('konter')}>
                  <button className="btn-act btn-danger" style={{ opacity: canKonter && canDefend ? 1 : 0.4 }} onClick={(e) => { e.stopPropagation(); canKonter && canDefend && executeAction('konter'); }}>
                    <span className="act-title">KONTER</span>
                    <span className="act-cost">-{6 + dynEffCost}⚡</span>
                  </button>
                </div>
                {/* MOBILE OPTIMIZATION END */}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Empfänger-Animation: Karte fliegt vom War Room (oben links) zur Hand (unten mitte) */}
      {incomingCannonData && (
          <div style={{
              position: 'fixed',
              // Start: War Room oben links → Ende: Handbereich unten mitte
              left: incomingCannonData.active ? 'calc(50% - 75px)' : '5%',
              top:  incomingCannonData.active ? '60vh'             : '10vh',
              // Klein starten (wie eine War-Room-Miniaturkarte), Normalgröße beim Ankommen
              transform: incomingCannonData.active ? 'scale(1)' : 'scale(0.22)',
              // Halbtransparent beim Abflug, voll sichtbar beim Landen
              opacity: incomingCannonData.active ? 1 : 0.55,
              // Kurz warten, dann gleitend beschleunigen (ease-in → ease-out Kurve)
              transition: [
                'left    0.75s cubic-bezier(0.4, 0.0, 0.2, 1)',
                'top     0.75s cubic-bezier(0.4, 0.0, 0.2, 1)',
                'transform 0.75s cubic-bezier(0.4, 0.0, 0.2, 1)',
                'opacity 0.5s ease-out',
              ].join(', '),
              zIndex: 9999,
              pointerEvents: 'none',
              transformOrigin: 'top left',
          }}>
              {/* Karten-Preview mit Cyan-Glow (Neural Link Farbe) */}
              <div style={{
                  position: 'relative', width: '150px', height: '210px',
                  borderRadius: '8px', border: '2px solid #00e5ff',
                  boxShadow: '0 0 30px rgba(0,229,255,0.7), 0 0 60px rgba(0,229,255,0.3)',
                  overflow: 'hidden',
              }}>
                  <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(135deg, rgba(0,229,255,0.35), rgba(188,19,254,0.2))',
                      opacity: 0.85, mixBlendMode: 'screen', zIndex: 10,
                  }} />
                  <div style={{ transform: 'scale(0.41)', transformOrigin: 'top left', pointerEvents: 'none' }}>
                      <Card card={incomingCannonData.card} context="hand" />
                  </div>
              </div>

              {/* Label */}
              <div className="mono" style={{
                  position: 'absolute', top: '-28px', left: '50%',
                  transform: 'translateX(-50%)',
                  color: '#00e5ff', fontSize: '0.85rem', fontWeight: 700,
                  textShadow: '0 0 12px #00e5ff', whiteSpace: 'nowrap',
                  letterSpacing: '2px', opacity: incomingCannonData.active ? 1 : 0,
                  transition: 'opacity 0.4s ease-out 0.3s',
              }}>
                  ↓ NEURAL LINK TRANSFER
              </div>

              {/* Datenstrom-Trail: zieht eine Linie zurück Richtung War Room (oben links) */}
              {!incomingCannonData.active && (
                  <div style={{
                      position: 'absolute', top: '0', left: '0',
                      width: '3px', height: '80px',
                      background: 'linear-gradient(to top, #00e5ff, transparent)',
                      filter: 'blur(2px)', transform: 'translateX(72px)',
                  }} />
              )}
          </div>
      )}

      {cannonAnimData && (
          <div style={{
              position: 'fixed', left: '15%',
              bottom: cannonAnimData.active ? '70vh' : '20vh',
              transform: cannonAnimData.active ? 'scale(0.3)' : 'scale(1)',
              opacity: cannonAnimData.active ? 0 : 1,
              transition: 'all 0.6s cubic-bezier(0.5, 0, 0.2, 1)',
              zIndex: 9999, pointerEvents: 'none'
          }}>
              <div style={{ position: 'relative', width: '150px', height: '210px', borderRadius: '8px', border: '2px solid #bc13fe', boxShadow: '0 0 40px #bc13fe', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(188,19,254,0.4), #00e5ff)', opacity: 0.9, mixBlendMode: 'screen', zIndex: 10 }} />
                  <div style={{ transform: 'scale(0.41)', transformOrigin: 'top left' }}>
                       <Card card={cannonAnimData.card} context="hand" />
                  </div>
              </div>
              <div className="mono" style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', color: '#00e5ff', fontSize: '1.2rem', fontWeight: 'bold', textShadow: '0 0 15px #00e5ff', whiteSpace: 'nowrap' }}>
                  UPLOADING TO NEURAL LINK...
              </div>
              <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: '6px', height: '300px', background: 'linear-gradient(to bottom, #bc13fe, transparent)', filter: 'blur(3px)' }} />
          </div>
      )}

      {/* ── CO-OP TRADE ANIMATIONEN ── */}
      {tradeLevelUpData && (
        <div style={{
          position: 'fixed', top: '45%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 100000, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: 'tradeLevelUpIn 2.5s ease-out forwards'
        }}>
          <style>{`
            @keyframes tradeLevelUpIn {
              0% { opacity: 0; transform: translate(-50%, -40%) scale(0.8); }
              10% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); filter: drop-shadow(0 0 50px var(--win)); }
              20% { transform: translate(-50%, -50%) scale(1.1); filter: drop-shadow(0 0 30px var(--win)); }
              80% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
              100% { opacity: 0; transform: translate(-50%, -60%) scale(0.9); }
            }
          `}</style>
          <div className="mono" style={{ fontSize: '2.5rem', color: 'var(--win)', textShadow: '0 0 30px var(--win)', fontWeight: 900, letterSpacing: '4px', marginBottom: '15px' }}>
            MERGE SUCCESSFUL
          </div>
          {/* FIX: Container vergrößert auf 280x392, Scale auf 0.777 */}
          <div style={{ position: 'relative', width: '280px', height: '392px', borderRadius: '12px', border: '3px solid var(--win)', boxShadow: '0 0 60px rgba(0,229,255,0.7)', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,229,255,0.15)', zIndex: 10, mixBlendMode: 'screen', animation: 'pulse 0.5s infinite' }} />
            <div style={{ transform: 'scale(0.9)', transformOrigin: 'center center', width: '360px', height: '504px' }}>
              <Card card={tradeLevelUpData.card} context="hand" />
            </div>
          </div>
          <div className="mono" style={{ marginTop: '20px', padding: '10px 30px', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--win)', borderRadius: '6px', color: '#fff', fontSize: '1.4rem', fontWeight: 'bold', boxShadow: '0 0 20px var(--win)' }}>
            UPGRADED TO LVL {tradeLevelUpData.card.level}
          </div>
        </div>
      )}

      {tradeBonusCard && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 99999, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: 'tradeBonusIn 3.5s ease-out forwards'
        }}>
          <style>{`
            @keyframes tradeBonusIn {
              0% { opacity: 0; transform: translate(-50%, 50vh) scale(0.5); }
              12% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); filter: drop-shadow(0 0 60px #bc13fe); }
              20% { transform: translate(-50%, -50%) scale(1.1); filter: drop-shadow(0 0 40px #bc13fe); }
              85% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
              100% { opacity: 0; transform: translate(-20vw, 30vh) scale(0.3); }
            }
          `}</style>
          <div className="mono" style={{ fontSize: '1.6rem', color: '#bc13fe', textShadow: '0 0 20px #bc13fe', fontWeight: 900, letterSpacing: '2px', marginBottom: '15px', background: 'rgba(0,0,0,0.95)', padding: '10px 30px', borderRadius: '4px', border: '1px solid #bc13fe', boxShadow: '0 0 25px rgba(188,19,254,0.4)' }}>
            + SYSTEM COMPENSATOR
          </div>
          {/* FIX: Scale auf 0.95 erhöht für maximale Füllung des 300px Rahmens */}
          <div style={{ position: 'relative', width: '300px', height: '420px', borderRadius: '12px', border: '3px solid #bc13fe', boxShadow: '0 0 60px rgba(188,19,254,0.7)', overflow: 'hidden', background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
             <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(45deg, transparent, rgba(188,19,254,0.2), transparent)', zIndex: 10, animation: 'scanline 2s linear infinite' }} />
            <div style={{ transform: 'scale(0.95)', transformOrigin: 'center center', width: '360px', height: '504px' }}>
              <Card card={tradeBonusCard} context="hand" />
            </div>
          </div>
        </div>
      )}

      {showCrisisIntro && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          background: 'rgba(5, 0, 10, 0.95)', backdropFilter: 'blur(10px)'
        }}>
          {/* Glitch lines overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,85,0.05) 2px, rgba(255,0,85,0.05) 4px)', pointerEvents: 'none' }} />
          
          <div style={{
            position: 'relative', width: '90%', maxWidth: '700px',
            background: 'rgba(15, 0, 5, 0.8)', border: '2px solid var(--lose)',
            boxShadow: '0 0 50px rgba(255,0,85,0.4), inset 0 0 30px rgba(255,0,85,0.2)',
            padding: '50px', textAlign: 'center', borderRadius: '4px'
          }}>
            {/* Tech-Corners */}
            <div style={{ position:'absolute', top:-2, left:-2, width:20, height:20, borderTop:'4px solid var(--lose)', borderLeft:'4px solid var(--lose)' }} />
            <div style={{ position:'absolute', top:-2, right:-2, width:20, height:20, borderTop:'4px solid var(--lose)', borderRight:'4px solid var(--lose)' }} />
            <div style={{ position:'absolute', bottom:-2, left:-2, width:20, height:20, borderBottom:'4px solid var(--lose)', borderLeft:'4px solid var(--lose)' }} />
            <div style={{ position:'absolute', bottom:-2, right:-2, width:20, height:20, borderBottom:'4px solid var(--lose)', borderRight:'4px solid var(--lose)' }} />

            <div className="rajdhani" style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fff', letterSpacing: '8px', textShadow: '0 0 20px var(--lose), 0 0 40px var(--lose)', margin: '0 0 10px 0', lineHeight: 1.1 }}>
              ⚠ SYSTEM COLLAPSE ⚠
            </div>
            <div className="mono" style={{ fontSize: '1.5rem', color: 'var(--lose)', letterSpacing: '4px', marginBottom: '40px', fontWeight: 'bold' }}>
              {showCrisisIntro.name}
            </div>
            
            <div style={{ background: 'rgba(255,0,85,0.1)', borderLeft: '4px solid var(--lose)', padding: '25px', marginBottom: '40px', textAlign: 'left' }}>
              <div className="mono" style={{ color: 'var(--lose)', fontSize: '0.8rem', letterSpacing: '2px', marginBottom: '10px' }}>— AKTIVER EFFEKT —</div>
              <div className="mono" style={{ color: '#fff', fontSize: '1.2rem', lineHeight: 1.6 }}>
                {showCrisisIntro.desc}
              </div>
            </div>
            
            <div className="mono" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '3px', animation: 'pulse 2s infinite' }}>
              ▸ GLOBALE PARAMETER ÜBERSCHRIEBEN FÜR 3 RUNDEN
            </div>
          </div>
        </div>
      )}

      {clashData && !showCrisisIntro && (
        <div className="clash-resolution-screen" style={{
          position: 'fixed', inset: 0, zIndex: 25000,
          background: 'rgba(3,1,10,0.97)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Roboto Mono', monospace",
          overflow: 'hidden'
        }}>

          {/* ── RULES & SETTINGS — oben rechts ── */}
          <div style={{ position: 'absolute', top: '14px', right: '18px', zIndex: 200, display: 'flex', gap: '10px' }}>
            <button
              onClick={onShowRules}
              style={{
                background: 'rgba(0,0,0,0.8)', border: '1px solid #444',
                color: '#666', padding: '5px 14px',
                fontFamily: "'Roboto Mono', monospace",
                fontSize: '0.6rem', letterSpacing: '2px', cursor: 'pointer',
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color='#ccc'; e.currentTarget.style.borderColor='#888'; }}
              onMouseLeave={e => { e.currentTarget.style.color='#666'; e.currentTarget.style.borderColor='#444'; }}
            >RULES</button>
            <button
              onClick={onShowSettings}
              style={{
                background: 'rgba(0,0,0,0.8)', border: '1px solid #444',
                color: '#666', padding: '5px 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color='#ccc'; e.currentTarget.style.borderColor='#888'; }}
              onMouseLeave={e => { e.currentTarget.style.color='#666'; e.currentTarget.style.borderColor='#444'; }}
            ><Settings size={14} /></button>
          </div>

          {/* ── HEADER: Titel + breite HP-Leisten ── */}
          <div style={{
            flexShrink: 0, padding: '16px 5vw 12px',
            background: 'rgba(0,0,0,0.55)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{
              fontFamily: "'Rajdhani',sans-serif", fontWeight: 900,
              fontSize: '0.75rem', letterSpacing: '10px',
              color: 'rgba(255,255,255,0.25)', textAlign: 'center',
              marginBottom: '14px',
            }}>
              SYSTEM RESOLUTION
            </div>

            {/* HP-Balken nebeneinander, je ~45% Breite */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>

              {/* Spieler HP */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <span className="mono" style={{ fontSize: '0.8rem', color: isCoop ? 'var(--ep)' : 'var(--win)', letterSpacing: '3px', fontWeight: 900 }}>
                    {isCoop ? 'TEAM HP' : 'DU'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {clashAnim && (clashData.dmgP + (isCoop ? (clashData.partners?.reduce((sum, p) => sum + (p.dmgP || 0), 0) || 0) : 0)) > 0 && (
                      <span className="mono" style={{ fontSize: '1.4rem', color: 'var(--lose)', background: 'rgba(255,0,50,0.15)', padding: '2px 10px', borderRadius: '4px', border: '1px solid var(--lose)', fontWeight: 900, animation: 'pulse 0.5s infinite', textShadow: '0 0 15px rgba(255,0,50,0.8)' }}>
                        -{clashData.dmgP + (isCoop ? (clashData.partners?.reduce((sum, p) => sum + (p.dmgP || 0), 0) || 0) : 0)}
                      </span>
                    )}
                    <b className="mono" style={{
                      fontSize: '2rem', color: isCoop ? 'var(--ep)' : 'var(--win)',
                      textShadow: `0 0 20px ${isCoop ? 'var(--ep)' : 'var(--win)'}`,
                      letterSpacing: '2px', lineHeight: '1'
                    }}>
                      {Math.floor(clashAnim ? clashData.newPHP : clashData.oldPHP)}
                    </b>
                  </div>
                </div>
                <div style={{ height: '22px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)' }}>
                  <div style={{ display: 'flex', height: '100%', width: `${(clashData.oldPHP / initialPHP) * 100}%`, transition: 'width 0.25s linear' }}>
                    <div style={{
                      height: '100%',
                      width: `${(clashAnim ? clashData.newPHP : clashData.oldPHP) / Math.max(1, clashData.oldPHP) * 100}%`,
                      background: isCoop ? 'var(--ep)' : 'var(--win)',
                      boxShadow: `0 0 15px ${isCoop ? 'var(--ep)' : 'var(--win)'}, inset 0 0 10px rgba(255,255,255,0.5)`,
                      transition: 'width 0.25s linear',
                    }}/>
                    <div style={{
                      height: '100%',
                      width: `${(clashAnim ? clashData.dmgP : 0) / Math.max(1, clashData.oldPHP) * 100}%`,
                      background: 'var(--lose)',
                      transition: 'width 0.25s linear',
                    }}/>
                    {isCoop && clashData.partners?.map((p, idx) => (
                      <div key={`php-${idx}`} style={{
                        height: '100%',
                        width: `${(clashAnim ? (p.dmgP || 0) : 0) / Math.max(1, clashData.oldPHP) * 100}%`,
                        background: idx === 0 ? '#bc13fe' : '#ffd700',
                        transition: 'width 0.25s linear',
                      }}/>
                    ))}
                  </div>
                </div>
                {/* Co-Op Schadensaufschlüsselung (Multiplayer) */}
                {isCoop && clashAnim && (clashData.dmgP > 0 || clashData.partners?.some(p => p.dmgP > 0)) && (
                  <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                    {clashData.dmgP > 0 && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>YOU</span>
                        <span className="mono" style={{ fontSize: '1.2rem', color: 'var(--lose)', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,0,50,0.6)' }}>-{clashData.dmgP}</span>
                      </div>
                    )}
                    {clashData.partners?.map((p, idx) => p.dmgP > 0 && (
                      <React.Fragment key={`pdmg-${idx}`}>
                        <div style={{ width: '2px', background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>{p.username?.substring(0,6).toUpperCase() || `MATE ${idx+1}`}</span>
                          <span className="mono" style={{ fontSize: '1.2rem', color: idx === 0 ? '#bc13fe' : '#ffd700', fontWeight: 'bold', textShadow: `0 0 10px ${idx === 0 ? 'rgba(188,19,254,0.6)' : 'rgba(255,215,0,0.6)'}` }}>-{p.dmgP}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}/>

              {/* Gegner HP */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--lose)', letterSpacing: '3px', fontWeight: 900 }}>
                    {isCoop ? 'BOSS HP' : 'GEGNER'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {clashAnim && (clashData.dmgA + (isCoop ? (clashData.partners?.reduce((sum, p) => sum + (p.dmgA || 0), 0) || 0) : 0)) > 0 && (
                      <span className="mono" style={{ fontSize: '1.4rem', color: 'var(--win)', background: 'rgba(0,229,255,0.15)', padding: '2px 10px', borderRadius: '4px', border: '1px solid var(--win)', fontWeight: 900, animation: 'pulse 0.5s infinite', textShadow: '0 0 15px rgba(0,229,255,0.8)' }}>
                        -{clashData.dmgA + (isCoop ? (clashData.partners?.reduce((sum, p) => sum + (p.dmgA || 0), 0) || 0) : 0)}
                      </span>
                    )}
                    <b className="mono" style={{ fontSize: '2rem', color: 'var(--lose)', textShadow: '0 0 20px var(--lose)', letterSpacing: '2px', lineHeight: '1' }}>
                      {Math.floor(clashAnim ? clashData.newAHP : clashData.oldAHP)}
                    </b>
                  </div>
                </div>
                <div style={{ height: '22px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8)' }}>
                  <div style={{ display: 'flex', height: '100%', width: `${(clashData.oldAHP / (isCoop ? initialAHP * squadSize : initialAHP)) * 100}%`, transition: 'width 0.25s linear' }}>
                    <div style={{
                      height: '100%',
                      width: `${(clashAnim ? clashData.newAHP : clashData.oldAHP) / Math.max(1, clashData.oldAHP) * 100}%`,
                      background: 'var(--lose)',
                      boxShadow: '0 0 15px var(--lose), inset 0 0 10px rgba(255,255,255,0.5)',
                      transition: 'width 0.25s linear',
                    }}/>
                    <div style={{
                      height: '100%',
                      width: `${(clashAnim ? clashData.dmgA : 0) / Math.max(1, clashData.oldAHP) * 100}%`,
                      background: 'var(--win)',
                      transition: 'width 0.25s linear',
                    }}/>
                    {isCoop && clashData.partners?.map((p, idx) => (
                      <div key={`ahp-${idx}`} style={{
                        height: '100%',
                        width: `${(clashAnim ? (p.dmgA || 0) : 0) / Math.max(1, clashData.oldAHP) * 100}%`,
                        background: idx === 0 ? '#bc13fe' : '#ffd700',
                        transition: 'width 0.25s linear',
                      }}/>
                    ))}
                  </div>
                </div>
                {/* Co-Op Boss-Schadensaufschlüsselung (Multiplayer) */}
                {isCoop && clashAnim && (clashData.dmgA > 0 || clashData.partners?.some(p => p.dmgA > 0)) && (
                  <div style={{ display: 'flex', gap: '15px', marginTop: '10px', justifyContent: 'flex-end' }}>
                    {clashData.dmgA > 0 && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>YOU</span>
                        <span className="mono" style={{ fontSize: '1.2rem', color: 'var(--win)', fontWeight: 'bold', textShadow: '0 0 10px rgba(0,229,255,0.6)' }}>-{clashData.dmgA}</span>
                      </div>
                    )}
                    {clashData.partners?.map((p, idx) => p.dmgA > 0 && (
                      <React.Fragment key={`admg-${idx}`}>
                        <div style={{ width: '2px', background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>{p.username?.substring(0,6).toUpperCase() || `MATE ${idx+1}`}</span>
                          <span className="mono" style={{ fontSize: '1.2rem', color: idx === 0 ? '#bc13fe' : '#ffd700', fontWeight: 'bold', textShadow: `0 0 10px ${idx === 0 ? 'rgba(188,19,254,0.6)' : 'rgba(255,215,0,0.6)'}` }}>-{p.dmgA}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Kategorie — minimal, unter den Balken */}
            {!isCoop && (
              <div className="mono" style={{
                textAlign: 'center', marginTop: '9px',
                fontSize: '0.48rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '4px',
              }}>
                ▸ {CAT_CONFIG[clashData.categoryKey]?.name?.toUpperCase()}
              </div>
            )}
          </div>

          {/* ── KARTEN — DUAL CLASH ODER SINGLE CLASH ── */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            maxHeight: '75vh',
            justifyContent: 'center', gap: isCoop ? '0vw' : '8vw',
            padding: '40px 0', position: 'relative', minHeight: 0, width: '100%'
          }}>
            {isCoop && clashData.partners ? (
              // 3-PLAYER UNIFIED SPLIT SCREEN (CO-OP)
              <div style={{ display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', gap: '2vw', overflowX: 'auto', padding: '0 2vw' }}>
                
                {/* DEIN CLASH */}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2vh', alignItems: 'center', flexShrink: 0, paddingRight: '2vw', borderRight: '2px dashed rgba(255,255,255,0.1)' }}>
                  
                  {/* DU Header */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', zIndex: 50 }}>
                    <div className="mono" style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.3)', padding: '4px 24px', borderRadius: '4px', color: 'var(--win)', fontSize: '0.9rem', fontWeight: 900, letterSpacing: '4px', boxShadow: '0 0 20px rgba(0,229,255,0.1)', textShadow: '0 0 10px var(--win)', backdropFilter: 'blur(4px)' }}>
                      AGENT // DU
                    </div>
                    <div className="mono" style={{ fontSize: '0.55rem', color: '#888', letterSpacing: '3px', marginTop: '6px', background: 'rgba(0,0,0,0.6)', padding: '3px 12px', borderRadius: '12px', border: '1px solid #333' }}>
                      <span style={{ color: 'var(--win)' }}>{CAT_CONFIG[clashData.categoryKey]?.name?.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Cards Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
                    {/* Deine Karte */}
                    <div style={{ position: 'relative', flexShrink: 0, width: '360px', height: '504px', zIndex: localWins ? 10 : 1, transform: localIsLoser ? `scale(${clashData.partners.length > 1 ? 0.38 : 0.48})` : `scale(${clashData.partners.length > 1 ? 0.45 : 0.55})`, transformOrigin: 'center right', filter: localIsLoser ? 'grayscale(75%) opacity(0.5)' : 'none', transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                      <div style={{ position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: '#000', color: 'var(--ep)', padding: '5px 20px', border: `2px solid ${localWins ? 'var(--win)' : '#555'}`, fontWeight: 900, fontSize: '1rem', letterSpacing: '2px', boxShadow: localWins ? '0 0 14px rgba(0,229,255,0.4)' : 'none', whiteSpace: 'nowrap' }}>{clashData.pAct}</div>
                      <Card card={clashData.pc} context="game" isPlayerTurn={pTurn} activeFactions={clashData.pActiveFactions || pActiveFactions} apexBuffs={clashData.pApexBuffs || pApexBuffs} activeEffect={clashData.pEffObj} activeCrisis={activeCrisis} curCategory={clashData.categoryKey} />
                      {clashAnim && clashData.dmgP > 0 && <div className="dmg-popup show" style={{ fontSize: '8rem', color: 'var(--lose)', fontWeight: 900, textShadow: '0 0 40px rgba(255,0,50,0.8), 0 0 10px #000', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 40 }}>-{clashData.dmgP}</div>}
                    </div>

                    {/* VS Stats (Du) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5, padding: '0 10px', minWidth: '70px' }}>
                      <div className="mono" style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--win)', opacity: (localWins || clashData.pV === clashData.aV) ? 1 : 0.4 }}>{clashData.pV}</div>
                      <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#888', margin: '5px 0' }}>VS</div>
                      <div className="mono" style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--lose)', opacity: (remoteWins || clashData.pV === clashData.aV) ? 1 : 0.4 }}>{clashData.aV}</div>
                    </div>

                    {/* Gegner-Karte (Deine KI) */}
                    <div style={{ position: 'relative', flexShrink: 0, width: '360px', height: '504px', zIndex: remoteWins ? 10 : 1, transform: remoteIsLoser ? `scale(${clashData.partners.length > 1 ? 0.38 : 0.48})` : `scale(${clashData.partners.length > 1 ? 0.45 : 0.55})`, transformOrigin: 'center left', filter: remoteIsLoser ? 'grayscale(75%) opacity(0.5)' : 'none', transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                      <div style={{ position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: '#000', color: 'var(--ep)', padding: '5px 20px', border: `2px solid ${remoteWins ? 'var(--lose)' : '#555'}`, fontWeight: 900, fontSize: '1rem', letterSpacing: '2px', boxShadow: remoteWins ? '0 0 14px rgba(255,0,50,0.4)' : 'none', whiteSpace: 'nowrap' }}>{clashData.aAct}</div>
                      <Card card={clashData.ac} context="game" isPlayerTurn={!pTurn} activeFactions={clashData.aActiveFactions || aActiveFactions} apexBuffs={clashData.aApexBuffs || aApexBuffs} activeEffect={clashData.aEffObj} activeCrisis={activeCrisis} curCategory={clashData.categoryKey} />
                      {clashAnim && clashData.dmgA > 0 && <div className="dmg-popup show" style={{ fontSize: '8rem', color: 'var(--win)', fontWeight: 900, textShadow: '0 0 40px rgba(0,229,255,0.8), 0 0 10px #000', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 40 }}>-{clashData.dmgA}</div>}
                    </div>
                  </div>
                </div>

                {/* PARTNERS */}
                {clashData.partners.map((partner, idx) => {
                  const mateScale = clashData.partners.length > 1 ? 0.45 : 0.55;
                  const mateLoseScale = clashData.partners.length > 1 ? 0.38 : 0.48;
                  const pColor = idx === 0 ? '#bc13fe' : '#ffd700';
                  
                  return (
                  <div key={idx} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2vh', alignItems: 'center', flexShrink: 0, paddingRight: idx < clashData.partners.length - 1 ? '2vw' : '0', borderRight: idx < clashData.partners.length - 1 ? '2px dashed rgba(255,255,255,0.1)' : 'none' }}>
                    
                    {/* Partner Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', zIndex: 50 }}>
                        <div className="mono" style={{ background: `${pColor}14`, border: `1px solid ${pColor}44`, padding: '4px 24px', borderRadius: '4px', color: pColor, fontSize: '0.9rem', fontWeight: 900, letterSpacing: '4px', boxShadow: `0 0 20px ${pColor}33`, textShadow: `0 0 10px ${pColor}`, backdropFilter: 'blur(4px)' }}>
                          {partner.username?.toUpperCase() || `MATE ${idx + 1}`}
                        </div>
                        <div className="mono" style={{ fontSize: '0.55rem', color: '#888', letterSpacing: '3px', marginTop: '6px', background: 'rgba(0,0,0,0.6)', padding: '3px 12px', borderRadius: '12px', border: '1px solid #333' }}>
                          <span style={{ color: pColor }}>{CAT_CONFIG[partner.k]?.name?.toUpperCase() || '???'}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
                       {/* Partner KI */}
                       <div style={{ position: 'relative', flexShrink: 0, width: '360px', height: '504px', zIndex: 5, transform: (partner.aiV >= partner.v) ? `scale(${mateScale})` : `scale(${mateLoseScale})`, transformOrigin: 'center right', filter: (partner.v > partner.aiV) ? 'grayscale(75%) opacity(0.5)' : 'none', transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                         <div className="mono" style={{ position: 'absolute', top: '-55px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, color: 'var(--lose)', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '3px', background: 'rgba(255,0,50,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--lose)', whiteSpace: 'nowrap', boxShadow: '0 0 10px rgba(255,0,50,0.3)' }}>[ SYSTEM AI ]</div>
                         <div style={{ position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: '#000', color: 'var(--ep)', padding: '5px 20px', border: `2px solid ${(partner.aiV >= partner.v) ? 'var(--lose)' : '#555'}`, fontWeight: 900, fontSize: '1rem', letterSpacing: '2px', boxShadow: (partner.aiV >= partner.v) ? '0 0 14px rgba(255,0,50,0.4)' : 'none', whiteSpace: 'nowrap' }}>{partner.aiAct || '???'}</div>
                         {partner.aiCard ? (
                           <Card card={partner.aiCard} context="game" isPlayerTurn={false} activeFactions={partner.aiActiveFactions || []} apexBuffs={partner.aiApexBuffs || {}} activeEffect={partner.aiEffObj} activeCrisis={activeCrisis} curCategory={partner.k} />
                         ) : (
                           <div style={{ width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', border: '2px dashed #555', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><span style={{ color: '#555', fontSize: '4rem' }}>?</span></div>
                         )}
                         {clashAnim && (partner.dmgA > 0) && <div className="dmg-popup show" style={{ fontSize: '8rem', color: pColor, fontWeight: 900, textShadow: `0 0 40px ${pColor}, 0 0 10px #000`, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 40 }}>-{partner.dmgA}</div>}
                       </div>
                       
                       {/* VS */}
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 5, padding: '0 10px', minWidth: '70px' }}>
                         <div className="mono" style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--lose)', opacity: (partner.aiV >= partner.v || partner.v === partner.aiV) ? 1 : 0.4 }}>{partner.aiV}</div>
                         <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#888', margin: '5px 0' }}>VS</div>
                         <div className="mono" style={{ fontSize: '2.4rem', fontWeight: 900, color: pColor, opacity: (partner.v >= partner.aiV) ? 1 : 0.4, textShadow: `0 0 20px ${pColor}88` }}>{partner.v}</div>
                       </div>

                       {/* Partner Karte */}
                       <div style={{ position: 'relative', flexShrink: 0, width: '360px', height: '504px', zIndex: 10, transform: (partner.v >= partner.aiV) ? `scale(${mateScale})` : `scale(${mateLoseScale})`, transformOrigin: 'center left', filter: (partner.aiV > partner.v) ? 'grayscale(75%) opacity(0.5)' : 'none', transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                         <div className="mono" style={{ position: 'absolute', top: '-55px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, color: pColor, fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '3px', background: `${pColor}1A`, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${pColor}`, whiteSpace: 'nowrap', boxShadow: `0 0 10px ${pColor}44` }}>[ MATE ASSET ]</div>
                         <div style={{ position: 'absolute', top: '-28px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: '#000', color: 'var(--ep)', padding: '5px 20px', border: `2px solid ${(partner.v >= partner.aiV) ? pColor : '#555'}`, fontWeight: 900, fontSize: '1rem', letterSpacing: '2px', boxShadow: (partner.v >= partner.aiV) ? `0 0 14px ${pColor}88` : 'none', whiteSpace: 'nowrap' }}>{partner.act}</div>
                         <Card card={partner.card} context="game" isPlayerTurn={true} activeFactions={partner.activeFactions || []} apexBuffs={partner.apexBuffs || {}} activeEffect={partner.effObj} activeCrisis={activeCrisis} curCategory={partner.k} />
                         {clashAnim && (partner.dmgP > 0) && <div className="dmg-popup show" style={{ fontSize: '8rem', color: 'var(--lose)', fontWeight: 900, textShadow: '0 0 40px rgba(255,0,50,0.8), 0 0 10px #000', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 40 }}>-{partner.dmgP}</div>}
                       </div>
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              // ORIGINAL SINGLE PLAYER / PVP LAYOUT
              <>
                <div style={{ 
                    position: 'relative', flexShrink: 0, width: '440px', height: '616px',
                    zIndex: localWins ? 10 : 1,
                    transform: localIsLoser ? 'scale(0.8)' : (localWins ? 'scale(1.05)' : 'scale(1.0)'),
                    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    filter: localIsLoser ? 'grayscale(75%) opacity(0.5)' : 'none',
                    pointerEvents: 'auto', overflow: 'visible'
                }}>
                  <div style={{
                    position: 'absolute', top: '-28px', left: '50%',
                    transform: 'translateX(-50%)', zIndex: 30,
                    background: '#000', color: 'var(--ep)',
                    padding: '5px 20px',
                    border: `2px solid ${localWins ? 'var(--win)' : '#555'}`,
                    fontWeight: 900, fontSize: '1rem', letterSpacing: '2px',
                    boxShadow: localWins ? '0 0 14px rgba(0,229,255,0.4)' : 'none',
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                  }}>
                    {clashData.pAct}
                  </div>
                  <Card
                    card={clashData.pc}
                    context="game"
                    activeEffect={clashData.pEffObj}
                    apexBuffs={clashData.pApexBuffs || pApexBuffs}
                    activeCrisis={activeCrisis}
                    curCategory={clashData.categoryKey}
                    isPlayerTurn={pTurn}
                    lockedStat={null}
                    activeFactions={clashData.pActiveFactions || pActiveFactions}
                  />
                  {clashAnim && clashData.dmgP > 0 && <div className="dmg-popup dmg-neg show" style={{ fontSize: '6rem', color: 'var(--lose)', fontWeight: 900, textShadow: '0 0 40px rgba(255,0,50,0.8), 0 0 10px #000, 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 40 }}>-{clashData.dmgP}</div>}
                </div>

                {(() => {
                  const diff = Math.abs(clashData.pV - clashData.aV);
                  const maxDmg = Math.max(clashData.dmgP, clashData.dmgA);
                  const rawMult = (diff > 0 && maxDmg > 0) ? (maxDmg / diff) : 0;
                  const mult = rawMult > 0 ? (Math.round(rawMult * 2) / 2).toFixed(1) : 0;
                  
                  return (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                      flexShrink: 0, zIndex: 5, userSelect: 'none'
                    }}>
                      <div className="mono" style={{
                         fontSize: '3.5rem', fontWeight: 900, color: 'var(--win)',
                         textShadow: '0 0 20px rgba(0,229,255,0.4)', 
                         opacity: (localWins || diff === 0) ? 1 : 0.4, lineHeight: 1
                      }}>
                        {clashData.pV}
                      </div>

                      <div style={{
                        fontSize: '1.2rem', fontStyle: 'italic', fontWeight: 900,
                        color: 'rgba(120,120,160,0.4)', textShadow: '0 0 20px rgba(120,120,160,0.2)',
                        margin: '5px 0'
                      }}>VS</div>

                      <div className="mono" style={{
                         fontSize: '3.5rem', fontWeight: 900, color: 'var(--lose)',
                         textShadow: '0 0 20px rgba(255,0,50,0.4)', 
                         opacity: (remoteWins || diff === 0) ? 1 : 0.4, lineHeight: 1
                      }}>
                        {clashData.aV}
                      </div>
                      
                      <div style={{
                         display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                         marginTop: '15px', background: 'rgba(0,0,0,0.85)', padding: '12px 18px',
                         borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                         boxShadow: '0 0 25px rgba(0,0,0,0.9), inset 0 0 10px rgba(255,255,255,0.05)'
                      }}>
                        <div className="mono" style={{ fontSize: '0.85rem', color: '#aaa', letterSpacing: '2px' }}>
                          DIFF: <span style={{ color: '#fff', fontWeight: 'bold' }}>{diff}</span>
                        </div>
                        {mult > 0 && (
                          <>
                            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                            <div className="mono" style={{ fontSize: '0.85rem', color: '#bc13fe', letterSpacing: '2px', textShadow: '0 0 10px rgba(188,19,254,0.5)' }}>
                              MULT: <span style={{ color: '#fff', fontWeight: 'bold' }}>x{mult}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div style={{ 
                    position: 'relative', flexShrink: 0, width: '440px', height: '616px',
                    zIndex: remoteWins ? 10 : 1,
                    transform: remoteIsLoser ? 'scale(0.8)' : (remoteWins ? 'scale(1.05)' : 'scale(1.0)'),
                    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    filter: remoteIsLoser ? 'grayscale(75%) opacity(0.5)' : 'none',
                    pointerEvents: 'auto', overflow: 'visible'
                }}>
                  <div style={{
                    position: 'absolute', top: '-28px', left: '50%',
                    transform: 'translateX(-50%)', zIndex: 30,
                    background: '#000', color: 'var(--ep)',
                    padding: '5px 20px',
                    border: `2px solid ${remoteWins ? 'var(--lose)' : '#555'}`,
                    fontWeight: 900, fontSize: '1rem', letterSpacing: '2px',
                    boxShadow: remoteWins ? '0 0 14px rgba(255,0,50,0.4)' : 'none',
                    whiteSpace: 'nowrap', pointerEvents: 'none',
                  }}>
                    {clashData.aAct}
                  </div>
                  <Card
                    card={clashData.ac}
                    context="game"
                    activeEffect={clashData.aEffObj}
                    apexBuffs={aApexBuffs}
                    activeCrisis={activeCrisis}
                    curCategory={clashData.categoryKey}
                    isPlayerTurn={!pTurn}
                    lockedStat={null}
                    activeFactions={aActiveFactions}
                  />
                  {clashAnim && clashData.dmgA > 0 && <div className="dmg-popup dmg-neg show" style={{ fontSize: '6rem', color: 'var(--win)', fontWeight: 900, textShadow: '0 0 40px rgba(0,229,255,0.8), 0 0 10px #000, 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 40 }}>-{clashData.dmgA}</div>}
                </div>
              </>
            )}
          </div>

          {/* ── WEITER — unten zentriert, gepinnt ── */}
          <div style={{
            flexShrink: 0, padding: '20px 20px 28px',
            display: 'flex', justifyContent: 'center', gap: '20px',
            background: 'transparent',
            position: 'relative', zIndex: 1000, pointerEvents: 'auto'
          }}>
            {/* NEU: Gegner-Deck im einheitlichen Polygon-Stil */}
            {clashData && (clashData.newPHP <= 0 || clashData.newAHP <= 0) && (
              <button
                onClick={() => { playSound('click'); setShowEnemyDeck(true); }}
                style={{
                  position: 'relative', overflow: 'hidden',
                  width: '420px', padding: '22px 0',
                  background: 'linear-gradient(90deg, rgba(255,0,50,0.18) 0%, rgba(255,0,50,0.08) 100%)',
                  border: '2px solid var(--lose)',
                  color: '#fff',
                  fontFamily: "'Roboto Mono', monospace",
                  fontSize: '1.15rem', fontWeight: 900, letterSpacing: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 0 40px rgba(255,0,50,0.25), 0 0 80px rgba(255,0,50,0.1), inset 0 0 20px rgba(255,0,50,0.08)',
                  textShadow: '0 0 12px rgba(255,0,50,0.8)',
                  transition: 'all 0.2s ease-out',
                  clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)',
                }}
              >
                {/* Roter Scanline shimmer passend zum Stil */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,0,50,0.12) 50%, transparent 100%)',
                  animation: 'shimmer 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
                🔍 GEGNER DECK
              </button>
            )}
            {!isCoop && (
              <button
                onClick={!myClashConfirmed ? confirmClash : undefined}
                style={{
                  position: 'relative', overflow: 'hidden',
                  width: '420px', padding: '22px 0',
                  background: myClashConfirmed
                    ? 'rgba(0,229,255,0.08)'
                    : 'linear-gradient(90deg, rgba(0,229,255,0.18) 0%, rgba(0,229,255,0.08) 100%)',
                  border: `2px solid ${myClashConfirmed ? 'rgba(0,229,255,0.35)' : 'var(--win)'}`,
                  color: myClashConfirmed ? 'rgba(0,229,255,0.5)' : '#fff',
                  fontFamily: "'Roboto Mono', monospace",
                  fontSize: '1.15rem', fontWeight: 900, letterSpacing: '8px',
                  cursor: myClashConfirmed ? 'default' : 'pointer',
                  boxShadow: myClashConfirmed
                    ? 'none'
                    : '0 0 40px rgba(0,229,255,0.25), 0 0 80px rgba(0,229,255,0.1), inset 0 0 20px rgba(0,229,255,0.08)',
                  textShadow: myClashConfirmed ? 'none' : '0 0 12px rgba(0,229,255,0.8)',
                  transition: 'all 0.2s ease-out',
                  clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)',
                }}
              >
                {/* Scanline shimmer */}
                {!myClashConfirmed && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.12) 50%, transparent 100%)',
                    animation: 'shimmer 2s ease-in-out infinite',
                    pointerEvents: 'none',
                  }} />
                )}
                <style>{`
                  @keyframes shimmer {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                `}</style>
                {myClashConfirmed ? 'WARTE AUF GEGNER...' : 'WEITER ›'}
              </button>
            )}
            {isCoop && (
              <button
                className="menu-btn btn-play modern-btn"
                style={{
                  minWidth: '280px', padding: '14px 48px',
                  fontSize: '1rem', letterSpacing: '5px',
                  opacity: myClashConfirmed ? 0.6 : 1,
                  cursor: myClashConfirmed ? 'default' : 'pointer',
                  borderColor: myClashConfirmed ? 'var(--ep)' : '',
                  boxShadow: myClashConfirmed ? '0 0 15px rgba(0,229,255,0.2)' : '',
                }}
                onClick={!myClashConfirmed ? confirmClash : undefined}
              >
                {myClashConfirmed ? (isCoop ? `SQUAD SYNC (${Math.max(1, clashReadyCount)}/${squadSize} BEREIT)...` : 'WARTE AUF GEGNER...') : 'WEITER >'}
              </button>
            )}
          </div>

        </div>
      )}

      {/* ── GLOBALE HOVER/TAP TOOLTIPS (Desktop: Hover, Mobile: Bottom Sheet) ── */}
      {/* MOBILE OPTIMIZATION START */}
      {hoveredEl === 'crisis-banner' && activeCrisis && (
         <TT isMobile={isMobile} onClose={closeMobileTooltip} mousePos={mousePos} lines={[ '⚠️ SYSTEMKRISE AKTIV', activeCrisis.desc, `Verbleibend: ${activeCrisis.turnsLeft} Runden` ]} />
      )}
      {hoveredEl === 'ep' && (
         <TT isMobile={isMobile} onClose={closeMobileTooltip} mousePos={mousePos} lines={['+2⚡ Basisregeneration pro Runde', `Aktuell: ${pEP} / ${(isOnline && isCoop) ? 25 : 18}`]} />
      )}
      {hoveredEl === 'crisis' && (
         activeCrisis ? (
           <TT isMobile={isMobile} onClose={closeMobileTooltip} mousePos={mousePos} lines={[ `⚠️ ${activeCrisis.name}`, activeCrisis.desc, `Dauer: noch ${activeCrisis.turnsLeft} Runde(n)` ]} />
         ) : (
           <TT isMobile={isMobile} onClose={closeMobileTooltip} mousePos={mousePos} lines={[ `+${crisisLevel === 0 ? 5 : crisisLevel === 1 ? 10 : 20}% Risiko pro Runde`, `Stufe ${crisisLevel + 1} von 3`, 'Kein aktives Ereignis' ]} />
         )
      )}
      {hoveredEl === 'tactic' && pEffHand[0] && (
         <TT isMobile={isMobile} onClose={closeMobileTooltip} mousePos={mousePos} lines={[
           `+${(pEffHand[0].buffPercent || 0) + ((pEffHand[0].level || 1) - 1) * 2}% ${CAT_CONFIG[pEffHand[0].stat]?.name?.toUpperCase()}`,
           pEffHand[0].syn ? `SYN (x2): ${Array.isArray(pEffHand[0].syn) ? pEffHand[0].syn.join(', ') : pEffHand[0].syn}` : null
         ].filter(Boolean)} />
      )}
      {hoveredEl === 'erholen' && <TT isMobile={isMobile} onClose={closeMobileTooltip} mousePos={mousePos} lines={[ 'ERHOLEN (+2⚡)', 'Gefahr: Erleidet x2.0 (Std) oder x3.0 (All-In)' ]} />}
      {hoveredEl === 'std' && <TT isMobile={isMobile} onClose={closeMobileTooltip} mousePos={mousePos} lines={[ `STANDARD (-${2 + dynEffCost}⚡)`, 'Sieg: x1.5 | vs Erholen: x2.0', 'Gekontert: Erleidet x2.0' ]} />}
      {hoveredEl === 'allin' && <TT isMobile={isMobile} onClose={closeMobileTooltip} mousePos={mousePos} lines={[ `ALL-IN (-${allInBase + dynEffCost}⚡)`, 'Sieg: x3.0 (Block/Erh.) oder x4.0 (Konter)', 'Gekontert: Erleidet x5.0' ]} />}
      {hoveredEl === 'block' && <TT isMobile={isMobile} onClose={closeMobileTooltip} mousePos={mousePos} lines={[ `BLOCKEN (-${dynEffCost}⚡)`, 'Erleidet: x1.5 (Std) oder x3.0 (All-In)' ]} />}
      {hoveredEl === 'konter' && <TT isMobile={isMobile} onClose={closeMobileTooltip} mousePos={mousePos} lines={[ `KONTER (-${6 + dynEffCost}⚡)`, 'Erfolgreich: x2.0 (Std) oder x5.0 (All-In)', 'Durchbrochen: x1.5 (Std) oder x4.0 (All-In)', 'Gegen Erholen: 6⚡ Refund' ]} />}
      {/* MOBILE OPTIMIZATION END */}

      {/* ── GEGNER DECK MODAL ── */}
      {showEnemyDeck && (
        <div className="glass-overlay active" style={{ zIndex: 30000, flexDirection: 'column', padding: '20px', background: 'rgba(5, 5, 8, 0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowEnemyDeck(false)}>
          <div className="game-title-small" style={{ color: 'var(--lose)', fontSize: '2.5rem', marginBottom: '20px', textShadow: '0 0 20px var(--lose)' }}>
            {isOnline && !isCoop ? 'PARTNER DECK' : 'FEINDLICHES DECK'}
          </div>
          <div className="mono" style={{ color: '#ccc', marginBottom: '30px', letterSpacing: '2px' }}>
            INSPEKTION ABGESCHLOSSEN
          </div>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '1400px', overflowY: 'auto', paddingBottom: '20px' }} onClick={e => e.stopPropagation()}>
             {((isOnline && !isCoop) ? partnerChars : aiChars).map((c, i) => (
               <div key={`ed-c-${i}`} style={{ width: '180px', height: '252px', position: 'relative', border: '2px solid #333', borderRadius: '10px', overflow: 'hidden', background: '#000', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                 <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                   <Card card={{...c, level: c.level || (isOnline && !isCoop ? 1 : difficulty)}} context="hand" />
                 </div>
               </div>
             ))}
             {((isOnline && !isCoop) ? partnerEffs : aiEffs).map((c, i) => (
               <div key={`ed-e-${i}`} style={{ width: '180px', height: '252px', position: 'relative', border: '2px solid #333', borderRadius: '10px', overflow: 'hidden', background: '#000', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                 <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                   <Card card={{...c, level: c.level || (isOnline && !isCoop ? 1 : difficulty)}} context="hand" />
                 </div>
               </div>
             ))}
          </div>
          <button
            onClick={() => { playSound('click'); setShowEnemyDeck(false); }}
            style={{
              marginTop: '30px', position: 'relative', overflow: 'hidden',
              width: '420px', padding: '22px 0',
              background: 'linear-gradient(90deg, rgba(255,0,50,0.18) 0%, rgba(255,0,50,0.08) 100%)',
              border: '2px solid var(--lose)',
              color: '#fff',
              fontFamily: "'Roboto Mono', monospace",
              fontSize: '1.15rem', fontWeight: 900, letterSpacing: '8px',
              cursor: 'pointer',
              boxShadow: '0 0 40px rgba(255,0,50,0.25), 0 0 80px rgba(255,0,50,0.1), inset 0 0 20px rgba(255,0,50,0.08)',
              textShadow: '0 0 12px rgba(255,0,50,0.8)',
              transition: 'all 0.2s ease-out',
              clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)',
            }}
          >
            {/* Roter Shimmer passend zum feindlichen Deck */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,0,50,0.12) 50%, transparent 100%)',
              animation: 'shimmer 2s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
            SCHLIESSEN
          </button>
        </div>
      )}

    </div>
  );
}