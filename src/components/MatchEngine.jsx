// src/components/MatchEngine.jsx
import React, { useState, useEffect } from 'react';
import Card, { CAT_CONFIG, getRarityClass, getFactionBuffs } from './Card';
import { getAIBestCategory, getSarcasticNews, getAIDefenseAction, getAIAttackAction } from '../logic/gameLogic';
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

export default function MatchEngine({ playerChars, playerEffs, partnerChars, partnerEffs, aiChars, aiEffs, difficulty = 1, isOnline = false, isCoop = false, isHost = false, conn = null, onEndGame, onShowRules, initialPHP = 1000, initialAHP = 1000, isRoguelike = false, contextLabel = '' }) {
  // Shuffle ONCE, then split — avoids duplicates across hand/deck (Bug #011)
  const _sc = React.useRef(shuffle([...playerChars])).current;
  const _se = React.useRef(shuffle([...playerEffs])).current;

  const [lastAttackStat, setLastAttackStat] = useState(null);
  const [lastAIAttackStat, setLastAIAttackStat] = useState(null);
  const [pHP, setPHP] = useState(initialPHP);
  const [aHP, setAHP] = useState(initialAHP);
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
  
  // NEU: Data Cannon - Einmal pro Match nutzbar!
  const [cannonReady, setCannonReady] = useState(true);
  
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
          } else if (data.type === 'CLASH_ACK') {
              setRemoteClashAck(data);
          } else if (data.type === 'HAND_SYNC') {
              setPartnerHand(data.hand);
              setPartnerEffHand(data.effHand);
          } else if (data.type === 'EP_SPENT') {
              setPEP(prev => prev - data.amount);
          } else if (data.type === 'EP_GAIN') {
              setPEP(prev => Math.min(25, prev + data.amount));
          } else if (data.type === 'HP_LOST') {
              // THE LIFE LINK: Partner hat Schaden gefressen!
              setPHP(prev => {
                  const nextHP = Math.max(0, prev - data.amount);
                  if (nextHP <= 0 && isCoop) {
                      setTimeout(() => onEndGame({ isWin: false, sarcasmNews: { text: "NEURAL LINK SEVERED: Dein Partner hat das System kollabieren lassen." }, matchData: { dmgDealt: 0, turns: 0 } }), 100);
                  }
                  return nextHP;
              });
          } else if (data.type === 'TEAM_WIN') {
              // THE LIFE LINK: Partner hat seinen KI-Boss eliminiert!
              setTimeout(() => onEndGame({ isWin: true, sarcasmNews: { text: "CO-OP STRIKE: Dein Partner hat den gegnerischen Node gecrackt!" }, matchData: { dmgDealt: 0, turns: 0 } }), 100);
          } else if (data.type === 'CARD_TRANSFER') {
              // DATA CANNON: Partner hat dir eine Karte geschickt!
              playSound('upgrade'); 
              setPHand(prev => [...prev, data.card]); // Karte zur Hand hinzufügen
          }
      };
      conn.on('data', handleData);
      return () => conn.off('data', handleData);
  }, [conn, pTurn, isOnline, isCoop]);

  // NEU: Sende eigene Handkarten an den Partner, sobald sie sich ändern
  useEffect(() => {
      if (isOnline && conn) {
          conn.send({ type: 'HAND_SYNC', hand: pHand, effHand: pEffHand });
      }
  }, [pHand, pEffHand, isOnline, conn]);

  useEffect(() => {
      // Trigger: Wir brauchen meine Aktion UND die Aktion des Gegners (KI im Co-Op, Partner im PvP)
      const enemyReady = isCoop ? !!localAIActionData : !!remoteActionData;
      if (myLockedAction && enemyReady) {
          resolveClash();
      }
  }, [myLockedAction, remoteActionData, localAIActionData, isCoop]);

  useEffect(() => {
      if (isOnline && myClashConfirmed && remoteClashAck && clashData) {
          applyClashAck(remoteClashAck, clashData.ac.name);
          setClashData(null);
          setMyClashConfirmed(false);
          setRemoteClashAck(null);
          setWaiting(false);
      }
  }, [myClashConfirmed, remoteClashAck, isOnline, clashData]);

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

  // NEU: Data Cannon Abschuss-Sequenz
  const handleSendCard = () => {
    if (!isCoop || !conn || !cannonReady || !activeCard) return;
    playSound('click');
    
    // 1. Karte aus der eigenen Hand entfernen
    const sentCard = { ...activeCard };
    const nextHand = [...pHand];
    nextHand.splice(activeIdx, 1);
    
    // 2. Sofort eine neue Karte aus dem Deck nachziehen (falls vorhanden)
    let currentDeck = [...pDeck];
    if (currentDeck.length > 0) {
       nextHand.push(currentDeck[0]);
       currentDeck = currentDeck.slice(1);
    }
    
    setPHand(nextHand);
    setPDeck(currentDeck);
    setActiveIdx(0);
    setCannonReady(false); // Kanone ist jetzt leer!
    
    // 3. Über die Neural Bridge an Partner senden
    conn.send({ type: 'CARD_TRANSFER', card: sentCard });
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
      
      // FIX: Wähle den Boss im Co-Op, den Partner im PvP
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
      const diff = Math.max(0, atkVal - defVal);
      
      const effectiveAtkAct = isAttacker ? myLockedAction : enemyAction;
      const effectiveDefAct = isAttacker ? enemyAction : myLockedAction;

      if (effectiveAtkAct.action === 'erholen') {
           const d = Math.floor(defVal * 1.5);
           if (isAttacker) dmgP = d; else dmgA = d;
      } else if (effectiveDefAct.action === 'erholen') {
           const d = Math.floor(atkVal * 1.5);
           if (isAttacker) dmgA = d; else dmgP = d;
      } else {
           if (effectiveAtkAct.action === 'allin') {
               if (atkVal > defVal) dmgA = Math.floor((diff + 40) * 3);
               else if (atkVal < defVal) recoilP = 150;
           }
           if (effectiveDefAct.action === 'konter') {
               if (defVal > atkVal) {
                   let cDmg = Math.floor((defVal - atkVal + 30) * 2);
                   if (isAttacker) dmgP = cDmg; else dmgA = cDmg;
               } else if (atkVal > defVal) {
                   let sDmg = Math.floor((atkVal - defVal + 40) * 3);
                   if (isAttacker) dmgA = sDmg; else dmgP = sDmg;
               }
           }
           const stdDmg = Math.floor(diff * 1.5);
           if (stdDmg > 0 && !dmgA && !dmgP) {
               if (isAttacker) dmgA = stdDmg; else dmgP = stdDmg;
           }
      }

      setClashData({
          pc: pCard, ac: aCard, categoryKey: k,
          pV, pEffObj: myLockedAction.effObj, 
          aV, aEffObj: enemyAction.effObj,
          pAct: formatActionName(myLockedAction.action), 
          aAct: formatActionName(enemyAction.action),
          oldPHP: pHP, oldAHP: aHP, newPHP: Math.max(0, pHP - dmgP - recoilP), newAHP: Math.max(0, aHP - dmgA - recoilA), 
          newPEP: Math.min(25, pEP + 2), newAEP: Math.min(15, aEP + 2),
          dmgP: dmgP + recoilP, dmgA: dmgA + recoilA
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
      const nextHand = [...pHand]; nextHand.splice(activeIdx, 1);
      let currentDeck = [...pDeck];
      if (currentDeck.length === 0) {
          currentDeck = playerChars.filter(c => !nextHand.some(h => h && h.name === c.name));
          if (!isOnline) currentDeck = shuffle(currentDeck);
      }
      if (currentDeck.length > 0) nextHand.push(currentDeck[0]);
      const drawnAt = currentDeck.length > 0 ? nextHand.length - 1 : null;

      let currentAiDeck = [...aDeck];
      const idx = currentAiDeck.findIndex(c => c.name === remoteCardName);
      if (idx !== -1) currentAiDeck.splice(idx, 1);
      else currentAiDeck = currentAiDeck.slice(1);

      if (currentAiDeck.length === 0) {
          const availableAiChars = aiChars.filter(c => c.name !== remoteCardName);
          currentAiDeck = [...availableAiChars];
          if (!isOnline) currentAiDeck = shuffle(currentAiDeck);
      }

      setPHand(nextHand); setPDeck(currentDeck.slice(1));
      setADeck(currentAiDeck); setActiveIdx(0); setPTurn(!pTurn); setCurK('');
      if (drawnAt !== null) {
        setJustDrawnIdx(drawnAt);
        setTimeout(() => setJustDrawnIdx(null), 800);
      }

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
              
              setTimeout(() => setShowCrisisIntro(null), 4000);
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
    
    // Wir nehmen die tagesaktuelle pHP, falls der Partner uns gerade Schaden reingedrückt hat
    let finalPHP = isCoop ? Math.max(0, pHP - myDmg) : clashData.newPHP;
    let finalAHP = clashData.newAHP;

    // THE LIFE LINK: Schaden an Partner senden
    if (isOnline && isCoop && myDmg > 0 && conn) {
        conn.send({ type: 'HP_LOST', amount: myDmg });
    }

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

      onEndGame({ 
        isWin, 
        sarcasmNews: getSarcasticNews(isWin), 
        ...(isRoguelike ? { remainingHP: finalPHP } : {}),
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
        setWaiting(true);
        if (isHost) {
            const riskHit = Math.random() * 100;
            const crisisEv = Math.floor(Math.random() * CRISIS_EVENTS.length);
            const ackData = { type: 'CLASH_ACK', riskHit, crisisEv };
            conn.send(ackData);
            setRemoteClashAck(ackData); 
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
    <div id="game-ui" className="screen active">
      {showMatchIntro && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
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

      {waiting && (
        <div className="glass-overlay active" style={{zIndex: 5000}}>
           <h2 className="mono" style={{color: 'var(--win)', animation: 'pulse 1.5s infinite'}}>WARTE AUF GEGNER...</h2>
        </div>
      )}

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
        <div className="partner-war-room" style={{ position: 'absolute', top: '70px', left: '20px', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '12px', background: 'rgba(5, 5, 10, 0.85)', backdropFilter: 'blur(5px)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '8px', pointerEvents: 'none', boxShadow: '0 5px 25px rgba(0,0,0,0.8)' }}>
          <div className="mono" style={{ color: 'var(--ep)', letterSpacing: '2px', fontSize: '0.7rem', marginBottom: '10px', textShadow: '0 0 8px var(--ep)' }}>
            [NEURAL LINK: PARTNER]
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
             {partnerHand.map((c, i) => (
                <div key={i} style={{ position: 'relative', width: '56px', height: '80px', borderRadius: '4px', opacity: 0.9, border: `1px solid ${getRarityColor(c)}`, background: '#000', overflow: 'hidden' }}>
                   {/* Kleines Rating/Kosten Tag wie im Inventar */}
                   <div className="mono" style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '0.55rem', color: '#fff', zIndex: 5, textShadow: '0 0 5px #000' }}>
                     {c.gti || c.cost}
                   </div>
                   {/* Typ-Indikator Balken */}
                   <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: getRarityColor(c), zIndex: 5 }} />
                   
                   <div style={{ transform: 'scale(0.18)', transformOrigin: 'top left', pointerEvents: 'none', filter: 'saturate(0.6)' }}>
                     <Card card={c} context="hand" forceArtOnly={true} />
                   </div>
                </div>
             ))}
             {partnerEffHand[0] && (
                <>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
                  <div style={{ position: 'relative', width: '56px', height: '80px', borderRadius: '4px', opacity: 0.9, border: `1px solid var(--eff-col)`, background: '#000', overflow: 'hidden' }}>
                     <div className="mono" style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '0.55rem', color: 'var(--eff-col)', zIndex: 5, textShadow: '0 0 5px #000' }}>
                       {partnerEffHand[0].cost}⚡
                     </div>
                     <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'var(--eff-col)', zIndex: 5 }} />
                     
                     <div style={{ transform: 'scale(0.18)', transformOrigin: 'top left', pointerEvents: 'none', filter: 'saturate(0.6)' }}>
                       <Card card={partnerEffHand[0]} context="hand" forceArtOnly={true} />
                     </div>
                  </div>
                </>
             )}
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
                <div className="hp-bar-fill lose-bg" style={{ width: `${(aHP / initialAHP) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* ── Aktive Krise Banner (FIX: Absolut positioniert, schiebt UI nicht mehr) ───────────────────────────────────── */}
          {activeCrisis && (
            <div style={{ position: 'relative', width: '100%', height: 0, zIndex: 50 }}>
              <div 
                className="active-crisis-banner"
                style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', cursor: 'help', whiteSpace: 'nowrap' }}
                onMouseEnter={() => setHoveredEl('crisis-banner')}
                onMouseLeave={() => setHoveredEl(null)}
              >
                {hoveredEl === 'crisis-banner' && (
                  <TT position="top" lines={[
                    '⚠ SYSTEMKRISE AKTIV',
                    activeCrisis.desc,
                    `Dauer: Noch ${activeCrisis.turnsLeft} Runden`
                  ]} />
                )}
                <span className="cr-icon">⚠</span>
                <span className="cr-name">{activeCrisis.name}</span>
                <span className="cr-turns mono">{activeCrisis.turnsLeft} RND</span>
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
            
            {/* NEU: DATA CANNON BUTTON */}
            {isOnline && isCoop && cannonReady && pTurn && activeCard && (
               <button 
                 onClick={handleSendCard}
                 className="menu-btn" 
                 style={{ position: 'absolute', top: '-45px', left: '0', background: 'rgba(188,19,254,0.15)', borderColor: '#bc13fe', color: '#bc13fe', padding: '5px 15px', fontSize: '0.65rem', letterSpacing: '2px', zIndex: 50, boxShadow: '0 0 10px rgba(188,19,254,0.3)', margin: 0 }}
               >
                 ⇡ DATA CANNON: [{activeCard.name.toUpperCase()}] AN PARTNER SENDEN
               </button>
            )}

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
            {pTurn ? (
              <>
                <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredEl('erholen')} onMouseLeave={() => setHoveredEl(null)}>
                  {hoveredEl === 'erholen' && <TT position="top" lines={['Regeneriere +2⚡', 'Kein Angriff — du erleidest 1.5x Schaden']} />}
                  <button className="btn-act" onClick={() => executeAction('erholen')}>
                    <span className="act-title">ERHOLEN</span>
                    <span className="act-cost">+2⚡</span>
                  </button>
                </div>
                <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredEl('std')} onMouseLeave={() => setHoveredEl(null)}>
                  {hoveredEl === 'std' && <TT position="top" lines={['Standardangriff auf gewählten Stat', `Kosten: ${2 + dynEffCost}⚡`]} />}
                  <button className="btn-act btn-primary" style={{ opacity: canStd ? 1 : 0.4 }} onClick={() => canStd && executeAction('std')}>
                    <span className="act-title">STANDARD</span>
                    <span className="act-cost">-{2 + dynEffCost}⚡</span>
                  </button>
                </div>
                <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredEl('allin')} onMouseLeave={() => setHoveredEl(null)}>
                  {hoveredEl === 'allin' && <TT position="top" lines={['Angriff mit 1.5x Schaden', `Kosten: ${8 + dynEffCost}⚡`]} />}
                  <button className="btn-act btn-danger" style={{ opacity: canAllIn ? 1 : 0.4 }} onClick={() => canAllIn && executeAction('allin')}>
                    <span className="act-title">ALL-IN</span>
                    <span className="act-cost">-{8 + dynEffCost}⚡</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredEl('block')} onMouseLeave={() => setHoveredEl(null)}>
                  {hoveredEl === 'block' && <TT position="top" lines={['Reduziert erlittenen Schaden um 50%', `Kosten: ${dynEffCost}⚡`]} />}
                  <button className="btn-act btn-primary" style={{ opacity: canBlock && canDefend ? 1 : 0.4 }} onClick={() => canBlock && canDefend && executeAction('block')}>
                    <span className="act-title">BLOCKEN</span>
                    <span className="act-cost">-{dynEffCost}⚡</span>
                  </button>
                </div>
                <div style={{ position: 'relative' }} onMouseEnter={() => setHoveredEl('konter')} onMouseLeave={() => setHoveredEl(null)}>
                  {hoveredEl === 'konter' && <TT position="top" lines={['Bei Erfolg: Schaden zurückwerfen', `Kosten: ${6 + dynEffCost}⚡`]} />}
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
        <div className="glass-overlay active" style={{zIndex: 25000}}>
          <div className="clash-scale-wrapper" style={{zoom: 0.72, transformOrigin:'center center', display:'flex', flexDirection:'column', alignItems:'center', width:'100%'}}>
          <div className="clash-title">SYSTEM RESOLUTION</div>
          
          <div className="clash-hp-container">
             <div className="bar-box glass-panel">
                <div className="label"><span>DU</span><b className="mono">{Math.floor(clashAnim ? clashData.newPHP : clashData.oldPHP)}</b></div>
                <div className="bar-bg"><div className="bar-fill" style={{ width: `${((clashAnim ? clashData.newPHP : clashData.oldPHP) / 1000) * 100}%`, background: 'var(--win)' }}></div></div>
             </div>
             <div className="bar-box glass-panel">
                <div className="label"><span>GEGNER</span><b className="mono">{Math.floor(clashAnim ? clashData.newAHP : clashData.oldAHP)}</b></div>
                <div className="bar-bg"><div className="bar-fill" style={{ width: `${((clashAnim ? clashData.newAHP : clashData.oldAHP) / 1000) * 100}%`, background: 'var(--lose)' }}></div></div>
             </div>
          </div>

          <div className="clash-news glass-panel">
            {clashData.pAct === 'ERHOLEN' 
              ? ">> DECKUNG AUFGEGEBEN: KRITISCHER TREFFER!"
              : (clashData.dmgA === clashData.dmgP 
                 ? ">> SYSTEM PATT" 
                 : `>> ${(clashData.dmgA > clashData.dmgP ? clashData.pc.name : clashData.ac.name).toUpperCase()} DOMINIERT`)
            }
          </div>

          <div id="clash-category" style={{ marginBottom: '10px' }}>
            {`KATEGORIE: ${CAT_CONFIG[clashData.categoryKey]?.name.toUpperCase()}`}
          </div>

          <div className="clash-cards-wrapper" style={{ display: 'flex', gap: '40px', alignItems: 'center', marginTop: '20px' }}>
            
            <div className="c-card-container" style={{ position: 'relative' }}>
               <div style={{
                 transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                 transform: localIsLoser ? 'scale(0.75)' : (localWins ? 'scale(1)' : 'scale(0.85)'),
                 filter: localIsLoser ? 'grayscale(80%) opacity(0.6)' : 'none',
                 zIndex: localWins ? 10 : 1,
                 pointerEvents: 'none'
               }}>
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
                  <div className="clash-badge" style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', background: '#000', color: 'var(--ep)', padding: '8px 20px', border: '2px solid #555', fontWeight: '900', fontSize: '1.2rem', zIndex: 30, letterSpacing: '2px' }}>
   {clashData.pAct}
</div>
                  {/* NEU: Taktik-Boost Indikator für den Spieler */}
                  {clashData.pEffObj && clashData.pEffObj.stat === clashData.categoryKey && (
                     <div style={{ position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0, 255, 204, 0.15)', color: 'var(--eff-col)', border: '1px solid var(--eff-col)', padding: '6px 15px', borderRadius: '4px', fontWeight: '900', fontSize: '1rem', zIndex: 30, whiteSpace: 'nowrap', boxShadow: '0 0 15px rgba(0, 255, 204, 0.2)', letterSpacing: '1px', backdropFilter: 'blur(5px)' }}>
                       +{(clashData.pEffObj.buff || 0) + (clashData.pEffObj.syn?.includes(clashData.pc.name) ? (clashData.pEffObj.synBuff || 0) : 0)} // {clashData.pEffObj.name.toUpperCase()}
                     </div>
                  )}
               </div>
               {clashAnim && clashData.dmgP > 0 && <div className="dmg-popup dmg-neg show">-{clashData.dmgP}</div>}
            </div>

            <div className="vs-badge" style={{ fontSize: '4rem', color: '#555', fontStyle: 'italic', fontWeight: '900' }}>VS</div>

            <div className="c-card-container" style={{ position: 'relative' }}>
               <div style={{
                 transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                 transform: remoteIsLoser ? 'scale(0.75)' : (remoteWins ? 'scale(1)' : 'scale(0.85)'),
                 filter: remoteIsLoser ? 'grayscale(80%) opacity(0.6)' : 'none',
                 zIndex: remoteWins ? 10 : 1,
                 pointerEvents: 'none'
               }}>
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
                  <div className="clash-badge" style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', background: '#000', color: 'var(--ep)', padding: '8px 20px', border: '2px solid #555', fontWeight: '900', fontSize: '1.2rem', zIndex: 30, letterSpacing: '2px' }}>
   {clashData.aAct}
</div>
                  {/* NEU: Taktik-Boost Indikator für den Gegner */}
                  {clashData.aEffObj && clashData.aEffObj.stat === clashData.categoryKey && (
                     <div style={{ position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0, 255, 204, 0.15)', color: 'var(--eff-col)', border: '1px solid var(--eff-col)', padding: '6px 15px', borderRadius: '4px', fontWeight: '900', fontSize: '1rem', zIndex: 30, whiteSpace: 'nowrap', boxShadow: '0 0 15px rgba(0, 255, 204, 0.2)', letterSpacing: '1px', backdropFilter: 'blur(5px)' }}>
                       +{(clashData.aEffObj.buff || 0) + (clashData.aEffObj.syn?.includes(clashData.ac.name) ? (clashData.aEffObj.synBuff || 0) : 0)} // {clashData.aEffObj.name.toUpperCase()}
                     </div>
                  )}
               </div>
               {clashAnim && clashData.dmgA > 0 && <div className="dmg-popup dmg-neg show">-{clashData.dmgA}</div>}
            </div>
          </div>

          <button className="menu-btn btn-play modern-btn" style={{marginTop: '40px'}} onClick={confirmClash}>WEITER &gt;</button>
          </div>{/* end scale wrapper */}
        </div>
      )}
    </div>
  );
}