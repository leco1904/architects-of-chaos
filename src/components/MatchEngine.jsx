// src/components/MatchEngine.jsx
import React, { useState, useEffect } from 'react';
import Card, { CAT_CONFIG, getRarityClass } from './Card';
import { getAIBestCategory, getSarcasticNews, getAIDefenseAction, getAIAttackAction, getFactionBuffs } from '../logic/gameLogic';
import { playSound } from '../logic/audio';


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

export default function MatchEngine({ playerChars, playerEffs, partnerChars, partnerEffs, aiChars, aiEffs, difficulty = 1, isOnline = false, isCoop = false, isHost = false, conn = null, onEndGame, onShowRules, initialPHP = 100, initialAHP = 100, isRoguelike = false, contextLabel = '', onTrade }) {
  // Shuffle ONCE, then split — avoids duplicates across hand/deck (Bug #011)
  const _sc = React.useRef(shuffle([...playerChars])).current;
  const _se = React.useRef(shuffle([...playerEffs])).current;

  const [lastAttackStat, setLastAttackStat] = useState(null);
  const [lastAIAttackStat, setLastAIAttackStat] = useState(null);
  const [pHP, setPHP] = useState(initialPHP);
  // FIX: Im Co-Op teilen sich die KI-Gegner eine gigantische HP-Leiste (doppelte HP)
  const [aHP, setAHP] = useState(isCoop ? initialAHP * 2 : initialAHP);
  
  // FIX: Verhindert Stale-Closures während der 500ms Pause
  const hpRefs = React.useRef({ p: initialPHP, a: isCoop ? initialAHP * 2 : initialAHP });
  useEffect(() => { hpRefs.current = { p: pHP, a: aHP }; }, [pHP, aHP]);
  
  // FIX: Fängt Schaden auf, der über das Netzwerk ankommt, bevor der Screen offen ist
  const [coopDmgBuffer, setCoopDmgBuffer] = useState({ p: 0, a: 0 });
  
  // NEU: Lokale Kampf-Stats
  const [matchStats, setMatchStats] = useState({
    dmgDealt: 0,
    dmgTaken: 0,
    turns: 0,
    energySpent: 0
  });
  const [pEP, setPEP] = useState((isOnline && isCoop) ? 20 : 10); 
  const [aEP, setAEP] = useState(10);
  
  const [crisisRisk, setCrisisRisk] = useState(0);
  const [crisisLevel, setCrisisLevel] = useState(0);
  const [hoveredEl, setHoveredEl] = useState(null);

  // ── Tooltip-Helper ────────────────────────────────────────────────────────
  const TT = ({ lines, position = 'top' }) => (
    <div style={{
      position: 'absolute',
      ...(position === 'top'   ? { bottom: '110%', left: '50%', transform: 'translateX(-50%)' } : {}),
      ...(position === 'right' ? { left: '110%', top: '50%', transform: 'translateY(-50%)' }   : {}),
      ...(position === 'left'  ? { right: '110%', top: '50%', transform: 'translateY(-50%)' }  : {}),
      background: 'rgba(10,10,15,0.95)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid var(--win)', borderLeft: '2px solid var(--eff-col)',
      padding: '5px 10px', borderRadius: '4px',
      zIndex: 9999, whiteSpace: 'nowrap', pointerEvents: 'none',
      boxShadow: '0 0 15px rgba(0,229,255,0.15)',
    }}>
      {lines.map((l, i) => (
        <div key={i} className="mono" style={{ fontSize: '0.58rem', color: 'var(--win)', letterSpacing: '1px', lineHeight: 1.6 }}>{l}</div>
      ))}
    </div>
  );
  const [activeCrisis, setActiveCrisis] = useState(null);
  
  // FIX: Wenn es Co-Op ist, starten BEIDE Spieler in ihrem eigenen "Turn" gegen die KI!
  const [pTurn, setPTurn] = useState((isOnline && !isCoop) ? isHost : true);
  
  const [pHand, setPHand] = useState(_sc.slice(0, 3));
  const [pDeck, setPDeck] = useState(_sc.slice(3));
  const [aDeck, setADeck] = useState([...(aiChars || [])]);
  
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
  
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeEffObj, setActiveEffObj] = useState(null);
  const [curK, setCurK] = useState('');
  
  const [clashData, setClashData] = useState(null);
  const [clashAnim, setClashAnim] = useState(false);
  const [showCrisisIntro, setShowCrisisIntro] = useState(null);
  const [justDrawnIdx, setJustDrawnIdx] = useState(null);

  const activeCard = pHand[activeIdx];
  // FIX: Im Co-Op ist der Gegner IMMER die KI deines Nodes, im PvP der Partner
  const aiCard = (isOnline && !isCoop && !pTurn && remoteActionData) ? remoteActionData.card : aDeck[0];
  
  // --- MISSING STATES RESTORED ---
  const [waiting, setWaiting] = useState(false);
  const [myLockedAction, setMyLockedAction] = useState(null);
  const [remoteActionData, setRemoteActionData] = useState(null);
  const [localAIActionData, setLocalAIActionData] = useState(null); // Speicher für Boss-Aktion im Co-Op
  
  const [myClashConfirmed, setMyClashConfirmed] = useState(false);
  const [remoteClashAck, setRemoteClashAck] = useState(null);
  const [showMatchIntro, setShowMatchIntro] = useState(true);
  const [introPhase, setIntroPhase] = useState(0); 
  const [cannonAnimData, setCannonAnimData] = useState(null);         // Sender: Karte fliegt raus
  const [incomingCannonData, setIncomingCannonData] = useState(null); // Empfänger: Karte fliegt rein
  const [inspectedPartnerCard, setInspectedPartnerCard] = useState(null); // War Room Inspektor

   useEffect(() => {
    playSound('matchIntro');
    const t1 = setTimeout(() => setIntroPhase(1), 400);
    const t2 = setTimeout(() => setIntroPhase(2), 1900);
    const t3 = setTimeout(() => setShowMatchIntro(false), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
      if (!isOnline || !conn) return;
      const handleData = (data) => {
          if (data.type === 'ACTION') {
              if (!pTurn) setCurK(data.category); 
              setRemoteActionData(data);
          } else if (data.type === 'ACTION_CANCEL') {
              // NEU: Partner hat seine Aktion zurückgezogen
              setRemoteActionData(null);
              // FIX: Im Co-Op setzt die KI curK — das darf der Partner-Cancel nicht überschreiben
              if (!pTurn && !isCoop) setCurK('');
          } else if (data.type === 'CLASH_ACK') {
              // Client empfängt die echten Krisen-Daten vom Host
              setRemoteClashAck(data);
          } else if (data.type === 'CLASH_CONFIRM') {
              // Host merkt sich: Partner ist bereit, den Screen zu schließen
              if (isHost) setRemoteClashAck({ partnerReady: true });
          } else if (data.type === 'HAND_SYNC') {
              setPartnerHand(data.hand);
              setPartnerEffHand(data.effHand);
          } else if (data.type === 'EP_SPENT') {
              setPEP(prev => prev - data.amount);
          } else if (data.type === 'EP_GAIN') {
              setPEP(prev => Math.min(25, prev + data.amount));
          } else if (data.type === 'HP_LOST') {
              setPHP(prev => {
                  const nextHP = Math.max(0, prev - data.amount);
                  hpRefs.current.p = nextHP; // FIX: Ref sofort syncen, nicht auf useEffect warten
                  if (nextHP <= 0 && isCoop) {
                      setTimeout(() => onEndGame({ isWin: false, sarcasmNews: { text: "NEURAL LINK SEVERED: Dein Partner hat das System kollabieren lassen." }, matchData: { dmgDealt: 0, turns: 0 } }), 100);
                  }
                  return nextHP;
              });
          } else if (data.type === 'COOP_CLASH_DAMAGE') {
              setPHP(prev => {
                  const nextHP = Math.max(0, prev - data.amount);
                  hpRefs.current.p = nextHP; // FIX: Ref sofort syncen
                  if (nextHP <= 0 && isCoop) {
                      setTimeout(() => onEndGame({ isWin: false, sarcasmNews: { text: "NEURAL LINK SEVERED: Dein Partner hat das System kollabieren lassen." }, matchData: { dmgDealt: 0, turns: 0 } }), 100);
                  }
                  return nextHP;
              });
              setCoopDmgBuffer(prev => ({ ...prev, p: prev.p + data.amount }));
              setClashData(prev => prev ? { ...prev, newPHP: Math.max(0, prev.newPHP - data.amount), partnerDmgP: (prev.partnerDmgP || 0) + data.amount } : prev);
          } else if (data.type === 'COOP_AI_DAMAGE') {
              setAHP(prev => {
                  const nextHP = Math.max(0, prev - data.amount);
                  hpRefs.current.a = nextHP; // FIX: Ref sofort syncen
                  return nextHP;
              });
              setCoopDmgBuffer(prev => ({ ...prev, a: prev.a + data.amount }));
              setClashData(prev => prev ? { ...prev, newAHP: Math.max(0, prev.newAHP - data.amount), partnerDmgA: (prev.partnerDmgA || 0) + data.amount } : prev);
          } else if (data.type === 'TEAM_WIN') {
              // THE LIFE LINK: Partner hat seinen KI-Boss eliminiert!
              setTimeout(() => onEndGame({ isWin: true, sarcasmNews: { text: "CO-OP STRIKE: Dein Partner hat den gegnerischen Node gecrackt!" }, matchData: { dmgDealt: 0, turns: 0 } }), 100);
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
          }
      };
      conn.on('data', handleData);
      return () => conn.off('data', handleData);
  }, [conn, pTurn, isOnline, isCoop]);

  // NEU: Trade Execution Logik (Führt den Tausch lokal aus, wenn beide zugestimmt haben)
  useEffect(() => {
      if (myTradeReady && remoteTradeReady && myTradeOffer && remoteTradeOffer) {
          playSound('upgrade');
          const receivedCard = remoteTradeOffer;
          const givenCard = myTradeOffer;

          const isEff = receivedCard.type === 'effect' || receivedCard.buff !== undefined;
          
          // Eigene Karte (Angebot) ist bereits aus der Hand entfernt worden.
          // Jetzt die erhaltene Karte einsortieren / leveln.
          if (isEff) {
              const inHand = pEffHand.findIndex(c => c?.name === receivedCard.name);
              const inDeck = pEffDeck.findIndex(c => c?.name === receivedCard.name);
              if (inHand > -1) {
                  const newHand = [...pEffHand]; newHand[inHand].level = (newHand[inHand].level || 1) + 1; setPEffHand(newHand);
              } else if (inDeck > -1) {
                  const newDeck = [...pEffDeck]; newDeck[inDeck].level = (newDeck[inDeck].level || 1) + 1; setPEffDeck(newDeck);
              } else {
                  setPEffHand(prev => [...prev, receivedCard]); 
              }
          } else {
              const inHand = pHand.findIndex(c => c?.name === receivedCard.name);
              const inDeck = pDeck.findIndex(c => c?.name === receivedCard.name);
              if (inHand > -1) {
                  const newHand = [...pHand]; newHand[inHand].level = (newHand[inHand].level || 1) + 1; setPHand(newHand);
              } else if (inDeck > -1) {
                  const newDeck = [...pDeck]; newDeck[inDeck].level = (newDeck[inDeck].level || 1) + 1; setPDeck(newDeck);
              } else {
                  setPHand(prev => [...prev, { ...receivedCard, level: 1 }]); // FIX: Reset auf Level 1
              }
          }

          // Callback an App.jsx funken, um das persistente Deck zu verändern
          if (typeof onTrade === 'function') onTrade({ ...receivedCard, level: 1 }, givenCard);
          if (typeof onTrade === 'function') onTrade(receivedCard, givenCard);

          // Tausch-Feld säubern
          setMyTradeOffer(null);
          setRemoteTradeOffer(null);
          setMyTradeReady(false);
          setRemoteTradeReady(false);
      }
  }, [myTradeReady, remoteTradeReady, myTradeOffer, remoteTradeOffer, pHand, pDeck, pEffHand, pEffDeck, onTrade]);
  useEffect(() => {
      if (isOnline && conn) {
          conn.send({ type: 'HAND_SYNC', hand: pHand, effHand: pEffHand });
      }
  }, [pHand, pEffHand, isOnline, conn]);

  useEffect(() => {
      // FIX: Im Co-Op warten wir jetzt auf BEIDES: Den lokalen Boss UND die Bestätigung, dass der Partner auch gelockt ist!
      const enemyReady = isCoop ? (!!localAIActionData && !!remoteActionData) : !!remoteActionData;
      if (myLockedAction && enemyReady) {
          setTimeout(resolveClash, 500); // Kurze Pause für mehr "Wumms" beim synchronen Start
      }
  }, [myLockedAction, remoteActionData, localAIActionData, isCoop]);

  useEffect(() => {
      if (isOnline && myClashConfirmed && clashData) {
          if (isHost && remoteClashAck?.partnerReady) {
              // Host ist bereit UND Client ist bereit: Host würfelt Krisen aus und beendet für BEIDE!
              const riskHit = Math.random() * 100;
              const crisisEv = Math.floor(Math.random() * CRISIS_EVENTS.length);
              const ackData = { type: 'CLASH_ACK', riskHit, crisisEv };
              
              conn.send(ackData); // Schickt dem Client das GO zum Schließen
              
              applyClashAck(ackData, clashData.ac.name);
              setClashData(null);
              setMyClashConfirmed(false);
              setRemoteClashAck(null);
          } else if (!isHost && remoteClashAck?.type === 'CLASH_ACK') {
              // Client hat das GO (inkl. Krisen-Rolls) vom Host erhalten
              applyClashAck(remoteClashAck, clashData.ac.name);
              setClashData(null);
              setMyClashConfirmed(false);
              setRemoteClashAck(null);
          }
      }
  }, [myClashConfirmed, remoteClashAck, isOnline, clashData, isHost, conn]);

  useEffect(() => {
    // FIX: Im Co-Op Modus muss die KI ihren Zug lokal berechnen, da man gegen die KI spielt!
    if ((!isOnline || isCoop) && !pTurn && aiCard) {
      let bestK = getAIBestCategory(aiCard, activeCrisis, difficulty, pHand, aiChars, aEP);
      
      // NEU: KI darf ihren letzten Angriffs-Stat nicht spammen!
      if (bestK === lastAIAttackStat) {
        const STAT_KEYS = ['tech','finance','manipulation','erosion','kingmaking','system','arsenal','legitimacy'];
        const available = STAT_KEYS.filter(k => k !== lastAIAttackStat);
        bestK = available.reduce((a, b) => ((aiCard[a] ?? aiCard.stats?.[a] ?? 0) > (aiCard[b] ?? aiCard.stats?.[b] ?? 0) ? a : b));
      }
      
      setCurK(bestK);
    }
  // WICHTIG: activeCard ist hier aus den Dependencies verschwunden!
  }, [pTurn, aiCard, activeCrisis, difficulty, pHand, isOnline, lastAIAttackStat]);

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
    if (!pTurn) return;
    if (statKey === lastAttackStat) return; 
    
    playSound('click');
    setCurK(statKey);
  };

  const handleCancelAction = () => {
      if (!myLockedAction) return;
      playSound('click');
      
      // EP-Kosten berechnen und lokal erstatten
      const dynCost = (myLockedAction.effObj && myLockedAction.effObj.stat === myLockedAction.category) ? myLockedAction.effObj.cost : 0;
      const baseCost = myLockedAction.action === 'std' ? 2 : myLockedAction.action === 'allin' ? 8 : myLockedAction.action === 'konter' ? 6 : 0;
      const totalCost = baseCost + dynCost;
      
      setPEP(prev => Math.min(isOnline ? 25 : 15, prev + totalCost));
      
      // Rückerstattung & Storno ans Netzwerk funken
      if (isOnline && conn) {
          conn.send({ type: 'EP_GAIN', amount: totalCost });
          conn.send({ type: 'ACTION_CANCEL' });
      }
      
      // UI wieder freigeben
      setMyLockedAction(null);
      setLocalAIActionData(null);
      setWaiting(false);
  };

  const handleOfferCard = () => {
    if (!activeCard || myTradeOffer) return;
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

    if (conn) conn.send({ type: 'TRADE_OFFER', card: offeredCard });
  };

  const handleCancelOffer = () => {
    if (!myTradeOffer) return;
    playSound('click');
    
    // Karte wandert zurück in die Hand
    setPHand(prev => [...prev, { ...myTradeOffer, isTeamAsset: false }]);
    setMyTradeOffer(null);
    setMyTradeReady(false);
    
    if (conn) conn.send({ type: 'TRADE_CANCEL' });
  };

  const handleAcceptTrade = () => {
    if (!myTradeOffer || !remoteTradeOffer) return;
    playSound('click');
    setMyTradeReady(true);
    if (conn) conn.send({ type: 'TRADE_ACCEPT' });
  };

  const handleToggleEffect = () => {
    if (!pEffHand[0]) return;
    playSound('click');
    setActiveEffObj(prev => prev ? null : pEffHand[0]);
  };

  const handleAbort = () => {
    playSound('click');
    if (window.confirm("Bist du sicher? Ein Spielabbruch zählt sofort als Niederlage!")) {
      onEndGame({ isWin: false, sarcasmNews: { text: "FEIGER RÜCKZUG: Das System verzeiht keine Schwäche." }, isAbort: true });
    }
  };

  const currentApexBuffs = {};
  pHand.forEach(c => {
     if (c?.type === 'apex' && c.passiveBuff) {
         currentApexBuffs[c.passiveBuff.stat] = (currentApexBuffs[c.passiveBuff.stat] || 0) + c.passiveBuff.val;
     }
  });

  // NEU: Fraktions-Synergien prüfen (3 Karten derselben Fraktion im Basis-Deck = Buff für alle Karten dieser Fraktion)
  const getActiveFactions = (deck) => {
    const counts = {};
    (deck || []).forEach(c => {
       if (c && c.faction && c.type !== 'effect') counts[c.faction] = (counts[c.faction] || 0) + 1;
    });
    return Object.keys(counts).filter(f => counts[f] >= 3);
  };
  const pActiveFactions = getActiveFactions(playerChars);
  const aActiveFactions = getActiveFactions(aiChars);

  const resolveClash = () => {
      setWaiting(false);
      const isAttacker = pTurn;
      
      // NEU: NEURAL RESONANCE CHECK
      // Wenn beide Spieler dieselbe Kategorie wählen, vibriert die Neural Bridge!
      const isResonance = isOnline && isCoop && remoteActionData && myLockedAction && (myLockedAction.category === remoteActionData.category);
      if (isResonance) playSound('upgrade');

      const enemyAction = isCoop ? localAIActionData : remoteActionData;
      if (!enemyAction || !myLockedAction) return;

      const pCard = myLockedAction.card;
      const aCard = enemyAction.card;
      const k = isAttacker ? myLockedAction.category : enemyAction.category;

      // Stats für Cooldown speichern
      if (isAttacker) setLastAttackStat(k);
      else setLastAIAttackStat(k);

      const calcVal = (card, effObj, isRemote) => {
           let v = Math.floor(card[k] ?? card.stats?.[k] ?? 0) + ((card.level || 1) - 1) * 2;
           if (!isRemote) v += (currentApexBuffs[k] || 0); 
           
           const activeFacs = isRemote ? aActiveFactions : pActiveFactions;
           if (activeFacs.includes(card.faction)) {
               const fBuffs = getFactionBuffs(card.faction);
               v += (fBuffs[k] || 0);
           }

           if (effObj && effObj.stat === k) {
               v += effObj.buff;
               if (effObj.syn?.includes(card.name)) v += (effObj.synBuff || 0);
           }

           // NEU: NEURAL RESONANCE BONUS (+20 auf den Wert für beide Partner)
           if (isResonance) v += 20;

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

     // --- NEUES SCHADENS-PROTOKOLL ---
      const atkAct = isAttacker ? myLockedAction.action : enemyAction.action;
      const defAct = isAttacker ? enemyAction.action : myLockedAction.action;

      // Logik aus gameLogic.js importieren/nutzen
      let dmgOnDef = 0, dmgOnAtk = 0, aEPRefund = 0;

      // SONDERFALL: ERHOLEN
      if (defAct === 'erholen') {
        if (atkAct === 'konter') aEPRefund = 6;
        else dmgOnDef = Math.floor(atkVal * 1.5);
      } else if (atkAct === 'erholen') {
        if (defAct === 'konter') aEPRefund = 6;
        else dmgOnAtk = Math.floor(defVal * 1.5);
      } else {
        const diff = Math.max(0, atkVal - defVal);
        const recoilDiff = Math.max(0, defVal - atkVal);

        if (defAct === 'konter') {
          if (atkVal >= defVal) {
            dmgOnDef = Math.floor(diff * (atkAct === 'allin' ? 4.0 : 1.5));
          } else {
            dmgOnAtk = Math.floor(recoilDiff * (atkAct === 'allin' ? 5.0 : 2.0));
          }
        } else {
          // Normaler Block
          if (atkVal > defVal) dmgOnDef = Math.floor(diff * (atkAct === 'allin' ? 3.0 : 1.5));
        }
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
          if (isOnline && isCoop) conn.send({ type: 'EP_GAIN', amount: aEPRefund });
          else setAEP(prev => Math.min(15, prev + aEPRefund));
        } else {
          setPEP(prev => Math.min(isOnline ? 25 : 15, prev + aEPRefund));
        }
      }

      const totalMyDmg = dmgP + recoilP;
      const totalAiDmg = dmgA + recoilA;

      if (isOnline && isCoop && conn) {
          if (totalMyDmg > 0) conn.send({ type: 'COOP_CLASH_DAMAGE', amount: totalMyDmg });
          if (totalAiDmg > 0) conn.send({ type: 'COOP_AI_DAMAGE', amount: totalAiDmg });
      }

      // Buffer auslesen, HP exakt rekonstruieren und alles ans UI weitergeben
      setCoopDmgBuffer(prevBuffer => {
          const oldP = hpRefs.current.p + prevBuffer.p;
          const oldA = hpRefs.current.a + prevBuffer.a;

          setClashData({
              pc: pCard, ac: aCard, categoryKey: k,
              pV, pEffObj: myLockedAction.effObj,
              aV, aEffObj: enemyAction.effObj,
              pAct: formatActionName(myLockedAction.action),
              aAct: formatActionName(enemyAction.action),
              oldPHP: oldP,
              oldAHP: oldA,
              newPHP: Math.max(0, oldP - totalMyDmg - prevBuffer.p),
              newAHP: Math.max(0, oldA - totalAiDmg - prevBuffer.a),
              newPEP: Math.min(25, pEP + 2), newAEP: Math.min(15, aEP + 2),
              dmgP: totalMyDmg, dmgA: totalAiDmg,
              // FIX Ghost Damage: Immer explizit auf den aktuellen Buffer-Stand setzen,
              // nie auf kumulierte Werte aus einem alten clashData-Spread vertrauen.
              partnerDmgP: prevBuffer.p > 0 ? prevBuffer.p : 0,
              partnerDmgA: prevBuffer.a > 0 ? prevBuffer.a : 0,
          });
          return { p: 0, a: 0 }; // Buffer für die nächste Runde leeren
      });

      setMyLockedAction(null);
      setRemoteActionData(null);
      setLocalAIActionData(null); 
      setActiveEffObj(null);
  };

  const executeAction = (actionType) => {
    const k = actionType === 'erholen' ? (curK || 'tech') : curK;
    if (actionType !== 'erholen' && !curK) return;

    // NEU: Energie-Kosten sofort berechnen
    const dynCost = (activeEffObj && activeEffObj.stat === k) ? activeEffObj.cost : 0;
    const baseCost = actionType === 'std' ? 2 : actionType === 'allin' ? 8 : actionType === 'konter' ? 6 : 0;
    const totalCost = baseCost + dynCost;

    if (isOnline) {
        playSound('click');
        setPEP(prev => prev - totalCost);
        conn.send({ type: 'EP_SPENT', amount: totalCost });

        const actData = { action: actionType, category: k, effObj: activeEffObj, card: activeCard };
        setMyLockedAction(actData);
        setWaiting(true);

        // FIX: Im Co-Op wird die KI-Antwort des Bosses sofort lokal hier berechnet
        if (isCoop) {
          let aiActiveEffObj = null;
          if (aEffHand[0] && aEffHand[0].stat === k && aEP >= (aEffHand[0].cost + 2) && Math.random() > 0.3) {
              aiActiveEffObj = aEffHand[0];
          }
          let aiAction = pTurn 
              ? getAIDefenseAction({ aVal: (aiCard[k] ?? aiCard.stats?.[k] ?? 0), pVal: (activeCard[k] ?? activeCard.stats?.[k] ?? 0), aEP, difficulty })
              : getAIAttackAction({ aEP, difficulty, pEP });
          
          setLocalAIActionData({ action: aiAction, category: k, effObj: aiActiveEffObj, card: aiCard });
        }

        conn.send({ type: 'ACTION', ...actData });
        return;
    }
    // Auch offline sofort abziehen für ein noch direkteres UI-Feedback
    setPEP(prev => prev - totalCost);

    let aiActiveEffObj = null;
    if (aEffHand[0] && aEffHand[0].stat === k) {
        if (aEP >= (aEffHand[0].cost + 2) && Math.random() > 0.3) {
            aiActiveEffObj = aEffHand[0];
        }
    }
    
    // NEU: Echte KI Entscheidungen basierend auf gameLogic anstatt hardcoded "std"/"block"!
    let aiAction = 'std';
    if (pTurn) {
        // Player greift an, KI verteidigt (inkl. Synergien)
        const aiDefenseVal = (aiCard[k] ?? aiCard.stats?.[k] ?? 0) + (aActiveFactions.includes(aiCard.faction) ? getFactionBuffs(aiCard.faction)[k] || 0 : 0);
        const pAtkVal = (activeCard[k] ?? activeCard.stats?.[k] ?? 0) + (pActiveFactions.includes(activeCard.faction) ? getFactionBuffs(activeCard.faction)[k] || 0 : 0);
        aiAction = getAIDefenseAction({ aVal: aiDefenseVal, pVal: pAtkVal, aEP: aEP, difficulty });
    } else {
        // KI greift an — The Architect Bait!
        if (difficulty === 4 && activeCrisis && aEP < 6 && ((activeCrisis.id === 'HYPERINFLATION' && k === 'finance') || (activeCrisis.id === 'BLACKOUT' && k === 'tech'))) {
            aiAction = 'erholen';
            aiActiveEffObj = null; // Taktikkarte wird für den Bait gespart!
        } else {
            aiAction = getAIAttackAction({ aEP: aEP, difficulty, pEP });
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
      // FIX: Taktik-Karte nach Nutzung verbrauchen
      // FIX: Taktik-Karten Zyklus (Hand -> Stapel-Ende -> Nachziehen)
      if (clashData?.pEffObj) {
          let nextEffHand = [...pEffHand];
          let nextEffDeck = [...pEffDeck];
          const usedIdx = nextEffHand.findIndex(e => e && e.name === clashData.pEffObj.name);

          if (usedIdx !== -1) {
              const usedCard = { ...nextEffHand[usedIdx] };
              nextEffHand.splice(usedIdx, 1); // Aus der Hand entfernen
              
              // Verbrauchte Karte ans Ende des Stapels schieben (wandert zurück)
              nextEffDeck.push(usedCard); 
              
              // Sofort die nächste Karte vom Anfang des Stapels ziehen
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

      let currentAiDeck = [...aDeck];
      const idx = currentAiDeck.findIndex(c => c.name === remoteCardName);
      if (idx !== -1) currentAiDeck.splice(idx, 1);
      else currentAiDeck = currentAiDeck.slice(1);

      if (currentAiDeck.length === 0) {
          const availableAiChars = aiChars.filter(c => c.name !== remoteCardName);
          currentAiDeck = [...availableAiChars];
          if (!isOnline) currentAiDeck = shuffle(currentAiDeck);
      }

      setADeck(currentAiDeck); setActiveIdx(0); setPTurn(!pTurn); setCurK('');
      if (drawnAt !== null) {
        setJustDrawnIdx(drawnAt);
        setTimeout(() => setJustDrawnIdx(null), 800);
      }
      
      setTradeCooldown(prev => Math.max(0, prev - 1)); // NEU: Cooldown reduzieren

      let nextActiveCrisis = activeCrisis ? { ...activeCrisis } : null;
      if (nextActiveCrisis) {
          nextActiveCrisis.turnsLeft -= 1;
          if (nextActiveCrisis.turnsLeft <= 0) nextActiveCrisis = null;
          setActiveCrisis(nextActiveCrisis);
          const increment = crisisLevel === 0 ? 5 : (crisisLevel === 1 ? 10 : 20);
          setCrisisRisk(Math.min(100, crisisRisk + increment));
      } else {
          const roll = isOnline ? data.riskHit : Math.random() * 100;
          if (roll < crisisRisk) {
              const evIdx = isOnline ? data.crisisEv : Math.floor(Math.random() * CRISIS_EVENTS.length);
              const randomEvent = CRISIS_EVENTS[evIdx];
              const newCrisis = { ...randomEvent, turnsLeft: 6 };
              setActiveCrisis(newCrisis); setCrisisRisk(0); setCrisisLevel(crisisLevel + 1);

              setShowCrisisIntro(newCrisis); 
              playSound('crisis');
              
              setTimeout(() => setShowCrisisIntro(null), 2500);
          } else {
              const increment = crisisLevel === 0 ? 5 : (crisisLevel === 1 ? 10 : 20);
              setCrisisRisk(Math.min(100, crisisRisk + increment));
          }
      }
  };

  const confirmClash = () => {
    playSound('click');
    
    // FIX: Dynamische Berechnung des Schadens (NaN Bug behoben, da recoilP bereits in dmgP steckt!)
    const myDmg = clashData.dmgP || 0; 
    
    // ClashData hat durch unseren neuen Buffer immer den 100% akkuraten HP Stand!
    let finalPHP = clashData.newPHP;
    let finalAHP = clashData.newAHP;

    setPHP(finalPHP); setAHP(finalAHP); setAEP(clashData.newAEP);
    
    // Team-Regeneration im Koop synchronisieren (+2 pro durchlaufener Kampfrunde)
    if (isOnline && conn) {
        setPEP(prev => Math.min(25, prev + 2));
        conn.send({ type: 'EP_GAIN', amount: 2 });
    } else {
        setPEP(clashData.newPEP);
    }

    if (finalPHP <= 0 || finalAHP <= 0) {
      const isWin = finalAHP <= 0 && finalPHP > 0;
      
      // THE LIFE LINK: Wenn wir den Boss getötet haben, gewinnt das Team!
      if (isWin && isOnline && isCoop && conn) {
          conn.send({ type: 'TEAM_WIN' });
      }

      // FIX: Im Co-Op kann clashData.newPHP durch stale Refs fälschlicherweise 0 sein.
      // Wir nehmen den höchsten bekannten Wert: Ref (immer aktuell nach Blocks 1-3) vs. Display.
      const safeRemainingHP = (isWin && isCoop)
          ? Math.max(hpRefs.current.p, finalPHP, 1)
          : finalPHP;

      onEndGame({ 
        isWin, 
        sarcasmNews: getSarcasticNews(isWin), 
        ...(isRoguelike ? { remainingHP: safeRemainingHP } : {}),
        matchData: {
          ...matchStats,
          finalPHP: finalPHP,
          finalAHP: finalAHP,
          difficulty
        }
      });
      return; 
    }

    if (isOnline) {
        setMyClashConfirmed(true);
        if (!isHost && conn) {
            // Client meldet dem Host sofort: Ich habe den Screen gelesen!
            conn.send({ type: 'CLASH_CONFIRM' });
        }
    } else {
        applyClashAck({}, clashData.ac.name);
        setClashData(null);
    }
  };

  const dynEffCost = (activeEffObj && activeEffObj.stat === curK) ? activeEffObj.cost : 0;
  const canStd = curK && pEP >= (2 + dynEffCost);
  const canAllIn = curK && pEP >= (8 + dynEffCost);
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

// --- NEU: Prüfen, ob die aktuelle Taktik-Karte zur aktiven Karte passt ---
  const activeEffOnCard = pEffHand[0];
  const isSynergyAvailable = activeEffOnCard && (
    Array.isArray(activeEffOnCard.syn) 
      ? activeEffOnCard.syn.some(name => (activeCard?.name || '').includes(name))
      : (activeCard?.name || '').includes(activeEffOnCard.syn)
  );

 return (
    <div id="game-ui" className="screen active" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {showMatchIntro && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 9999,
          background: '#000',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          gap: '24px',
          opacity: introPhase === 2 ? 0 : 1,
          transition: introPhase === 0 ? 'none' : 'opacity 0.5s ease',
          pointerEvents: 'none',
        }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,229,255,0.03) 3px, rgba(0,229,255,0.03) 4px)', pointerEvents: 'none' }} />

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
      )}

      {/* Das alte, störende Vollbild-Overlay wurde entfernt! */}

      <div className="top-bar">
        <div className="game-title-small">ARCHITECTS OF CHAOS {isOnline ? (isCoop ? '[CO-OP]' : '[1v1 PVP]') : ''}</div>
        <div id="turn-ind" className={pTurn ? 'turn-player' : 'turn-ai'}>{pTurn ? "▶ DEIN ZUG" : "⚠ GEGNER GREIFT AN"}</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="mono" style={{ alignSelf: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
            {isRoguelike && contextLabel ? contextLabel : `LVL ${difficulty} Threat`}
          </div>
          <button className="btn-info" onClick={onShowRules}>RULES</button>
          <button className="btn-back" onClick={handleAbort}>ABORT</button>
        </div>
      </div>

      {/* FIX: War Room absolut positioniert, schützt das CSS Grid! */}
      {isOnline && isCoop && partnerHand.length > 0 && (
        <div className="partner-war-room" style={{
          position: 'absolute', top: '70px', left: '20px', zIndex: 100,
          display: 'flex', flexDirection: 'column', padding: '12px',
          background: 'rgba(5, 5, 10, 0.92)', backdropFilter: 'blur(8px)',
          border: `1px solid ${inspectedPartnerCard ? 'rgba(0,229,255,0.6)' : 'rgba(0,229,255,0.3)'}`,
          borderRadius: '8px', boxShadow: '0 5px 25px rgba(0,0,0,0.8)',
          pointerEvents: 'auto', // Klicks aktivieren
          transition: 'border-color 0.2s, box-shadow 0.2s',
          maxWidth: '300px', // FIX: Ein Tick größer
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

          {/* Mini-Karten Reihe */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {partnerHand.map((c, i) => {
              const isSelected = inspectedPartnerCard?.name === c.name;
              return (
                <div
                  key={i}
                  onClick={() => setInspectedPartnerCard(isSelected ? null : c)}
                style={{
                  position: 'relative', width: '64px', height: '90px', // FIX: Größer
                  borderRadius: '4px', background: '#000', overflow: 'hidden',
                  cursor: 'pointer',
                    border: isSelected
                      ? `2px solid ${getRarityColor(c)}`
                      : `1px solid ${getRarityColor(c)}44`,
                    boxShadow: isSelected ? `0 0 12px ${getRarityColor(c)}88` : 'none',
                    transform: isSelected ? 'translateY(-3px)' : 'none',
                    transition: 'all 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    opacity: inspectedPartnerCard && !isSelected ? 0.5 : 0.95,
                  }}
                >
                  <div className="mono" style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '0.55rem', color: '#fff', zIndex: 5, textShadow: '0 0 5px #000' }}>
                    {c.gti || c.cost}
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: getRarityColor(c), zIndex: 5 }} />
                  {isSelected && (
                    <div style={{ position: 'absolute', inset: 0, background: `${getRarityColor(c)}18`, zIndex: 4 }} />
                  )}
                  <div style={{ transform: 'scale(0.18)', transformOrigin: 'top left', pointerEvents: 'none', filter: isSelected ? 'none' : 'saturate(0.5)' }}>
                    <Card card={c} context="hand" forceArtOnly={true} />
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
                    style={{
                      position: 'relative', width: '64px', height: '90px', // FIX: Größer
                      borderRadius: '4px', background: '#000', overflow: 'hidden',
                      cursor: 'pointer',
                      border: isSelected ? `2px solid var(--eff-col)` : `1px solid rgba(0,255,204,0.3)`,
                      boxShadow: isSelected ? '0 0 12px rgba(0,255,204,0.5)' : 'none',
                      transform: isSelected ? 'translateY(-3px)' : 'none',
                      transition: 'all 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      opacity: inspectedPartnerCard && !isSelected ? 0.5 : 0.95,
                    }}
                  >
                    <div className="mono" style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '0.55rem', color: 'var(--eff-col)', zIndex: 5, textShadow: '0 0 5px #000' }}>
                      {eff.cost}⚡
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'var(--eff-col)', zIndex: 5 }} />
                    <div style={{ transform: 'scale(0.18)', transformOrigin: 'top left', pointerEvents: 'none', filter: isSelected ? 'none' : 'saturate(0.5)' }}>
                      <Card card={eff} context="hand" forceArtOnly={true} />
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
                {inspectedPartnerCard.isTeamAsset && (
                  <div className="mono" style={{ fontSize: '0.48rem', color: 'var(--apex-pink)', border: '1px solid var(--apex-pink)', padding: '1px 5px', borderRadius: '2px', letterSpacing: '1px' }}>
                    TEAM ASSET
                  </div>
                )}
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
               {tradeCooldown > 0 && (
                 <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--lose)', background: 'rgba(255,0,50,0.1)', padding: '2px 6px', borderRadius: '3px', border: '1px solid var(--lose)' }}>
                   COOLDOWN: {tradeCooldown}
                 </div>
               )}
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
                       <button onClick={handleOfferCard} disabled={!activeCard || tradeAnimPhase === 'resolving' || tradeCooldown > 0} className="menu-btn" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: 0, margin: 0, background: 'transparent', borderColor: 'transparent', color: 'var(--win)', fontSize: '3rem', cursor: (activeCard && tradeAnimPhase !== 'resolving' && tradeCooldown === 0) ? 'pointer' : 'default', opacity: (activeCard && tradeAnimPhase !== 'resolving' && tradeCooldown === 0) ? 1 : 0.2 }}>+</button>
                    )}
                </div>
             </div>

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

      <div className="cockpit-layout">
        {/* ── Draw pile — gleiche Breite wie Action-Column → zentriert Karte ── */}
        <div className="cockpit-draw-column">
          <DrawPile charCount={pDeck.length} effCount={pEffDeck.length}/>
        </div>
        <div className="cockpit-arena-column">

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

          {/* ── Aktive Krise Banner (Zentriert & Höher) ───────────────────────────────────── */}
          {activeCrisis && (
            <div style={{ position: 'absolute', top: '-15px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
              <div 
                className="active-crisis-banner"
                style={{ cursor: 'help', whiteSpace: 'nowrap' }}
                onMouseEnter={() => setHoveredEl('crisis-banner')}
                onMouseLeave={() => setHoveredEl(null)}
              >
                {hoveredEl === 'crisis-banner' && (
                  <TT position="top" lines={[
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
              <div className="bar-pod" style={{ '--accent': 'var(--ep)', position: 'relative', cursor: 'help' }}
                onMouseEnter={() => setHoveredEl('ep')}
                onMouseLeave={() => setHoveredEl(null)}
              >
                {hoveredEl === 'ep' && <TT position="right" lines={['+2⚡ Basisregeneration pro Runde', `Aktuell: ${pEP} / ${isOnline ? 25 : 15}`]} />}
                <div className="v-bar-label">⚡</div>
                <div className="vertical-bar-container">
                  <div className="v-bar-fill ep-bg" style={{ height: `${(pEP / (isOnline ? 25 : 15)) * 100}%` }}></div>
                </div>
                <div className="v-bar-val">{pEP}</div>
              </div>
            </div>

            <div className="arena-card-wrapper">
              <Card 
                card={activeCard} 
                context="game" 
                activeEffect={activeEffObj} 
                apexBuffs={currentApexBuffs}
                activeCrisis={activeCrisis}
                curCategory={curK} 
                isPlayerTurn={pTurn} 
                onStatClick={handleStatClick} 
                highlightSynergyStat={isSynergyAvailable ? activeEffOnCard.stat : null}
                lightGyro={true}
                lockedStat={pTurn ? lastAttackStat : null}
                isFactionSynergyActive={pActiveFactions.includes(activeCard?.faction)}
              />
            </div>

            <div className="arena-side-bars right-bars">
              <div className="bar-pod" style={{ '--accent': 'var(--crisis)', position: 'relative', cursor: 'help' }}
                onMouseEnter={() => setHoveredEl('crisis')}
                onMouseLeave={() => setHoveredEl(null)}
              >
                {hoveredEl === 'crisis' && <TT position="left" lines={[
                  `+${crisisLevel === 0 ? 5 : crisisLevel === 1 ? 10 : 20}% pro Runde`,
                  `Stufe ${crisisLevel + 1} von 3`,
                  activeCrisis ? `Aktiv: ${activeCrisis.name}` : 'Kein aktives Ereignis'
                ]} />}
                <div className="v-bar-label">KRISE</div>
                <div className="vertical-bar-container">
                  <div className="v-bar-fill crisis-bg" style={{ height: `${crisisRisk}%` }}></div>
                </div>
                <div className="v-bar-val">{crisisRisk}%</div>
              </div>
            </div>
          </div>

          {/* HANDKARTEN UNTER DER ARENA */}
          <div className="hand-hub" style={{ position: 'relative' }}>
            
            <div className="hand-grid">
              {pHand.map((c, i) => {
                const isActive = i === activeIdx;
                return (
                  <div
                    key={i}
                    className={`hand-card-wrapper ${isActive ? 'active' : ''} ${justDrawnIdx === i ? 'card-just-drawn' : ''}`}
                    onClick={() => { playSound('click'); setActiveIdx(i); }}
                  >
                    <div className="hand-card-inner">
                      <Card card={c} context="hand" />
                    </div>
                    {isActive && <div className="hand-card-glow-char" />}
                    
                    {/* TEAM ASSET BADGE */}
                    {c && c.isTeamAsset && (
                      <div className="mono" style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#bc13fe', color: '#000', padding: '2px 8px', fontSize: '0.45rem', fontWeight: 900, borderRadius: '4px', letterSpacing: '1px', zIndex: 10, boxShadow: '0 0 10px #bc13fe', whiteSpace: 'nowrap', textShadow: 'none' }}>
                        TEAM ASSET
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="tactic-separator"></div>

            <div className="tactic-grid">
              {pEffHand[0] ? (
                <div
                  className={`hand-card-wrapper ${activeEffObj ? 'active' : ''}`}
                  onClick={handleToggleEffect}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => setHoveredEl('tactic')}
                  onMouseLeave={() => setHoveredEl(null)}
                >
                  {hoveredEl === 'tactic' && (
                    <TT position="top" lines={[
                      `${pEffHand[0].name} — +${pEffHand[0].buff} ${pEffHand[0].stat?.toUpperCase()}`,
                      '── Synergien ──',
                      ...(pEffHand[0].syn
                        ? (Array.isArray(pEffHand[0].syn) ? pEffHand[0].syn : [pEffHand[0].syn])
                        : ['Keine Synergie'])
                    ]} />
                  )}
                  <div className="hand-card-inner">
                    <Card card={pEffHand[0]} context="hand" />
                  </div>
                  {activeEffObj && <div className="hand-card-glow-eff" />}
                </div>
              ) : (
                <div className="empty-tactic-slot">
                  <span className="mono">LEER</span>
                </div>
              )}
            </div>
          </div>
          {/* #010 Deck counter */}
          <div className="mono" style={{textAlign:'center',padding:'4px 0',fontSize:'0.6rem',color:'rgba(255,255,255,0.28)',letterSpacing:'2px',borderTop:'1px solid rgba(255,255,255,0.04)',marginTop:'4px'}}>
            DECK: {pDeck.length} · TAKTIKEN: {pEffDeck.length}
          </div>
        </div>

        <div className="cockpit-action-column">
          <div className="action-container">
            {myLockedAction ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '15px', padding: '20px', textAlign: 'center', background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--win)', animation: 'pulse 1.5s infinite' }} />
                  
                  <div className="mono" style={{ color: 'var(--win)', fontSize: '1rem', fontWeight: 'bold', letterSpacing: '2px' }}>
                     [ ACTION LOCKED ]
                  </div>
                  
                  <div className="mono" style={{ color: '#aaa', fontSize: '0.85rem', letterSpacing: '1px', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '4px', borderLeft: '2px solid var(--win)' }}>
                     {formatActionName(myLockedAction.action)} // {myLockedAction.category.toUpperCase()}
                  </div>

                  {!remoteActionData ? (
                     <button 
                        onClick={handleCancelAction} 
                        className="menu-btn" 
                        style={{ marginTop: '10px', padding: '8px 24px', background: 'rgba(255,0,80,0.1)', borderColor: 'var(--lose)', color: 'var(--lose)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '2px', transition: 'all 0.2s', boxShadow: '0 0 10px rgba(255,0,80,0.2)' }}
                     >
                        ✕ ABBRECHEN
                     </button>
                  ) : (
                     <div className="mono" style={{ color: 'var(--ep)', fontSize: '0.8rem', marginTop: '10px', animation: 'pulse 1s infinite', textShadow: '0 0 10px var(--ep)' }}>
                        SYNCING CLASH...
                     </div>
                  )}
               </div>
            ) : pTurn ? (
              <>
                <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredEl('erholen')} onMouseLeave={() => setHoveredEl(null)}>
                  {hoveredEl === 'erholen' && <TT position="top" lines={[
                    'REGENERIEREN (+2⚡)',
                    'vs STANDARD: Gegner-Stat x 1.5 Schaden',
                    'vs KONTER: 0 Schaden & EP-Refund'
                  ]} />}
                  <button className="btn-act" onClick={() => executeAction('erholen')}>
                    <span className="act-title">ERHOLEN</span>
                    <span className="act-cost">+2⚡</span>
                  </button>
                </div>
                <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredEl('std')} onMouseLeave={() => setHoveredEl(null)}>
                  {hoveredEl === 'std' && <TT position="top" lines={[
                    `STANDARDANGRIFF (Kosten: ${2 + dynEffCost}⚡)`,
                    'vs BLOCKEN / KONTER (Sieg): Diff x 1.5',
                    'vs KONTER (Loss): Recoil x 2.0'
                  ]} />}
                  <button className="btn-act btn-primary" style={{ opacity: canStd ? 1 : 0.4 }} onClick={() => canStd && executeAction('std')}>
                    <span className="act-title">STANDARD</span>
                    <span className="act-cost">-{2 + dynEffCost}⚡</span>
                  </button>
                </div>
                <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredEl('allin')} onMouseLeave={() => setHoveredEl(null)}>
                  {hoveredEl === 'allin' && <TT position="top" lines={[
                    `ALL-IN ANGRIFF (Kosten: ${8 + dynEffCost}⚡)`,
                    'vs BLOCKEN: Diff x 3.0',
                    'vs KONTER (Sieg): Diff x 4.0',
                    'vs KONTER (Loss): Recoil x 5.0'
                  ]} />}
                  <button className="btn-act btn-danger" style={{ opacity: canAllIn ? 1 : 0.4 }} onClick={() => canAllIn && executeAction('allin')}>
                    <span className="act-title">ALL-IN</span>
                    <span className="act-cost">-{8 + dynEffCost}⚡</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredEl('block')} onMouseLeave={() => setHoveredEl(null)}>
                  {hoveredEl === 'block' && <TT position="top" lines={[
                    `STANDARD-BLOCK (Kosten: ${dynEffCost}⚡)`,
                    'vs STANDARD: Schaden = Diff x 1.5',
                    'vs ALL-IN: Schaden = Diff x 3.0'
                  ]} />}
                  <button className="btn-act btn-primary" style={{ opacity: canBlock && canDefend ? 1 : 0.4 }} onClick={() => canBlock && canDefend && executeAction('block')}>
                    <span className="act-title">BLOCKEN</span>
                    <span className="act-cost">-{dynEffCost}⚡</span>
                  </button>
                </div>
                <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredEl('konter')} onMouseLeave={() => setHoveredEl(null)}>
                  {hoveredEl === 'konter' && <TT position="top" lines={[
                    `KONTER-PARADE (Kosten: ${6 + dynEffCost}⚡)`,
                    'SIEG: Diff x 1.5 (Std) / 4.0 (All-In)',
                    'LOSS: Recoil x 2.0 (Std) / 5.0 (All-In)'
                  ]} />}
                  <button className="btn-act btn-danger" style={{ opacity: canKonter && canDefend ? 1 : 0.4 }} onClick={() => canKonter && canDefend && executeAction('konter')}>
                    <span className="act-title">KONTER</span>
                    <span className="act-cost">-{6 + dynEffCost}⚡</span>
                  </button>
                </div>
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

      {showCrisisIntro && (
        <div className="glass-overlay active" style={{zIndex: 4000, background: 'rgba(8, 0, 2, 0.98)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexDirection: 'column', gap: 0}}>
          <div className="crisis-glitch-bg"></div>
          <div className="crisis-alert-title">⚠ SYSTEM COLLAPSE ⚠<br/>{showCrisisIntro.name}</div>
          <div className="crisis-effect-box">
            <div className="eff-label">— AKTIVER EFFEKT —</div>
            <div className="eff-value">{showCrisisIntro.desc}</div>
          </div>
          <div className="crisis-duration-line">— GLOBALE PARAMETER ÜBERSCHRIEBEN FÜR 3 RUNDEN —</div>
        </div>
      )}

      {clashData && !showCrisisIntro && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 25000,
          background: 'rgba(3,1,10,0.97)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Roboto Mono', monospace",
          overflow: 'hidden'
        }}>

          {/* ── RULES — oben rechts, immer sichtbar ── */}
          <button
            onClick={onShowRules}
            style={{
              position: 'absolute', top: '14px', right: '18px', zIndex: 200,
              background: 'rgba(0,0,0,0.8)', border: '1px solid #444',
              color: '#666', padding: '5px 14px',
              fontFamily: "'Roboto Mono', monospace",
              fontSize: '0.6rem', letterSpacing: '2px', cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color='#ccc'; e.currentTarget.style.borderColor='#888'; }}
            onMouseLeave={e => { e.currentTarget.style.color='#666'; e.currentTarget.style.borderColor='#444'; }}
          >RULES</button>

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                  <span className="mono" style={{ fontSize: '0.58rem', color: isCoop ? 'var(--ep)' : 'var(--win)', letterSpacing: '2px', fontWeight: 700 }}>
                    {isCoop ? 'TEAM HP' : 'DU'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {clashAnim && clashData.dmgP > 0 && (
                      <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--lose)', fontWeight: 700, animation: 'pulse 0.5s infinite' }}>
                        -{clashData.dmgP}
                      </span>
                    )}
                    <b className="mono" style={{
                      fontSize: '1.15rem', color: isCoop ? 'var(--ep)' : 'var(--win)',
                      textShadow: `0 0 12px ${isCoop ? 'var(--ep)' : 'var(--win)'}`,
                      letterSpacing: '2px',
                    }}>
                      {Math.floor(clashAnim ? clashData.newPHP : clashData.oldPHP)}
                    </b>
                  </div>
                </div>
                <div style={{ height: '9px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px',
                    width: `${((clashAnim ? clashData.newPHP : clashData.oldPHP) / initialPHP) * 100}%`,
                    background: isCoop ? 'var(--ep)' : 'var(--win)',
                    boxShadow: `0 0 6px ${isCoop ? 'var(--ep)' : 'var(--win)'}`,
                    transition: 'width 0.45s ease-out',
                  }}/>
                </div>
                {/* Co-Op Schadensaufschlüsselung (clean) */}
                {isCoop && clashAnim && (clashData.dmgP > 0 || clashData.partnerDmgP > 0) && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    {clashData.dmgP > 0 && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>YOU</span>
                        <span className="mono" style={{ fontSize: '1rem', color: 'var(--lose)', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,0,50,0.3)' }}>-{clashData.dmgP}</span>
                      </div>
                    )}
                    {clashData.dmgP > 0 && clashData.partnerDmgP > 0 && (
                      <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    )}
                    {clashData.partnerDmgP > 0 && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>MATE</span>
                        <span className="mono" style={{ fontSize: '1rem', color: '#bc13fe', fontWeight: 'bold', textShadow: '0 0 10px rgba(188,19,254,0.3)' }}>-{clashData.partnerDmgP}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}/>

              {/* Gegner HP */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                  <span className="mono" style={{ fontSize: '0.58rem', color: 'var(--lose)', letterSpacing: '2px', fontWeight: 700 }}>
                    {isCoop ? 'BOSS HP' : 'GEGNER'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {clashAnim && clashData.dmgA > 0 && (
                      <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--win)', fontWeight: 700, animation: 'pulse 0.5s infinite' }}>
                        -{clashData.dmgA}
                      </span>
                    )}
                    <b className="mono" style={{ fontSize: '1.15rem', color: 'var(--lose)', textShadow: '0 0 12px var(--lose)', letterSpacing: '2px' }}>
                      {Math.floor(clashAnim ? clashData.newAHP : clashData.oldAHP)}
                    </b>
                  </div>
                </div>
                <div style={{ height: '9px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px',
                    width: `${((clashAnim ? clashData.newAHP : clashData.oldAHP) / (isCoop ? initialAHP * 2 : initialAHP)) * 100}%`,
                    background: 'var(--lose)',
                    boxShadow: '0 0 6px var(--lose)',
                    transition: 'width 0.45s ease-out',
                  }}/>
                </div>
                {/* Co-Op Boss-Schadensaufschlüsselung (clean) */}
                {isCoop && clashAnim && (clashData.dmgA > 0 || clashData.partnerDmgA > 0) && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px', justifyContent: 'flex-end' }}>
                    {clashData.dmgA > 0 && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>YOU</span>
                        <span className="mono" style={{ fontSize: '1rem', color: 'var(--win)', fontWeight: 'bold', textShadow: '0 0 10px rgba(0,229,255,0.3)' }}>-{clashData.dmgA}</span>
                      </div>
                    )}
                    {clashData.dmgA > 0 && clashData.partnerDmgA > 0 && (
                      <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    )}
                    {clashData.partnerDmgA > 0 && (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>MATE</span>
                        <span className="mono" style={{ fontSize: '1rem', color: '#bc13fe', fontWeight: 'bold', textShadow: '0 0 10px rgba(188,19,254,0.3)' }}>-{clashData.partnerDmgA}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Kategorie — minimal, unter den Balken */}
            <div className="mono" style={{
              textAlign: 'center', marginTop: '9px',
              fontSize: '0.48rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '4px',
            }}>
              ▸ {CAT_CONFIG[clashData.categoryKey]?.name?.toUpperCase()}
            </div>
          </div>

          {/* ── KARTEN — Skalierungsschutz für 1440p ── */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            maxHeight: '60vh', // FIX: Begrenzt die Kartenhöhe, um Platz für den Button zu lassen
            justifyContent: 'center', gap: '5vw',
            padding: '20px 0', position: 'relative', minHeight: 0,
          }}>

            {/* Spieler-Karte (Fix: Hard Width verhindert Clipping) */}
            <div style={{ 
                position: 'relative', flexShrink: 0, width: '360px', height: '504px',
                zIndex: localWins ? 10 : 1,
                transform: localIsLoser ? 'scale(0.7)' : (localWins ? 'scale(0.95)' : 'scale(0.85)'),
                transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                filter: localIsLoser ? 'grayscale(75%) opacity(0.5)' : 'none',
                pointerEvents: 'auto', overflow: 'visible'
            }}>
              {/* Aktions-Badge */}
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
              {/* Taktik-Boost entfernt (jetzt via Tooltip) */}
              <Card
                card={clashData.pc}
                context="game"
                activeEffect={clashData.pEffObj}
                apexBuffs={currentApexBuffs}
                activeCrisis={activeCrisis}
                curCategory={clashData.categoryKey}
                isPlayerTurn={true}
                isFactionSynergyActive={pActiveFactions.includes(clashData.pc?.faction)}
              />
              {clashAnim && clashData.dmgP > 0 && <div className="dmg-popup dmg-neg show" style={{ fontSize: '3.5rem', textShadow: '0 0 20px #000', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 40 }}>-{clashData.dmgP}</div>}
            </div>

            {/* VS */}
            <div style={{
              fontSize: '3rem', fontStyle: 'italic', fontWeight: 900,
              color: 'rgba(120,120,160,0.4)', flexShrink: 0,
              textShadow: '0 0 20px rgba(120,120,160,0.2)',
              userSelect: 'none', zIndex: 5
            }}>VS</div>

            {/* Gegner-Karte (Fix: Hard Width verhindert Clipping) */}
            <div style={{ 
                position: 'relative', flexShrink: 0, width: '360px', height: '504px',
                zIndex: remoteWins ? 10 : 1,
                transform: remoteIsLoser ? 'scale(0.7)' : (remoteWins ? 'scale(0.95)' : 'scale(0.85)'),
                transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                filter: remoteIsLoser ? 'grayscale(75%) opacity(0.5)' : 'none',
                pointerEvents: 'auto', overflow: 'visible'
            }}>
              {/* Aktions-Badge */}
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
              {/* Taktik-Boost entfernt (jetzt via Tooltip) */}
              <Card
                card={clashData.ac}
                context="game"
                activeEffect={clashData.aEffObj}
                apexBuffs={{}}
                activeCrisis={activeCrisis}
                curCategory={clashData.categoryKey}
                isPlayerTurn={false}
                isFactionSynergyActive={aActiveFactions.includes(clashData.ac?.faction)}
              />
              {clashAnim && clashData.dmgA > 0 && <div className="dmg-popup dmg-neg show" style={{ fontSize: '3.5rem', textShadow: '0 0 20px #000', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 40 }}>-{clashData.dmgA}</div>}
            </div>
          </div>

          {/* ── WEITER — unten zentriert, gepinnt ── */}
          <div style={{
            flexShrink: 0, padding: '18px 20px 24px',
            display: 'flex', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            borderTop: '1px solid rgba(255,255,255,0.04)',
          }}>
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
              {myClashConfirmed ? (isCoop ? 'SQUAD SYNC (1/2 BEREIT)...' : 'WARTE AUF GEGNER...') : 'WEITER >'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}