// src/components/MatchEngine.jsx
import React, { useState, useEffect } from 'react';
import Card, { CAT_CONFIG, getRarityClass } from './Card';
import { getAIBestCategory, getPlayerRegen, getSarcasticNews } from '../logic/gameLogic';
import { playSound } from '../logic/audio';

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
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

export default function MatchEngine({ playerChars, playerEffs, aiChars, aiEffs, difficulty = 1, isOnline = false, isHost = false, conn = null, onEndGame, onShowRules }) {
  const [pHP, setPHP] = useState(1000);
  const [aHP, setAHP] = useState(1000);
  const [pEP, setPEP] = useState(10);
  const [aEP, setAEP] = useState(10);
  
  const [crisisRisk, setCrisisRisk] = useState(0);
  const [crisisLevel, setCrisisLevel] = useState(0);
  const [activeCrisis, setActiveCrisis] = useState(null);
  
  const [pTurn, setPTurn] = useState(isOnline ? isHost : true);
  
  const [pHand, setPHand] = useState([...playerChars].slice(0, 3));
  const [pDeck, setPDeck] = useState([...playerChars].slice(3));
  const [aDeck, setADeck] = useState([...aiChars]);
  
  const [pEffHand, setPEffHand] = useState([...playerEffs].slice(0, 1));
  const [pEffDeck, setPEffDeck] = useState([...playerEffs].slice(1));
  const [aEffHand, setAEffHand] = useState([...aiEffs].slice(0, 1));
  const [aEffDeck, setAEffDeck] = useState([...aiEffs].slice(1));
  
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeEffObj, setActiveEffObj] = useState(null);
  const [curK, setCurK] = useState('');
  
  const [clashData, setClashData] = useState(null);
  const [clashAnim, setClashAnim] = useState(false);
  const [showCrisisIntro, setShowCrisisIntro] = useState(null);

  // --- ONLINE / OFFLINE ACTION STATE ---
  const [waiting, setWaiting] = useState(false);
  const [myLockedAction, setMyLockedAction] = useState(null);
  const [remoteActionData, setRemoteActionData] = useState(null);
  const [myClashConfirmed, setMyClashConfirmed] = useState(false);
  const [remoteClashAck, setRemoteClashAck] = useState(null);

  const [showMatchIntro, setShowMatchIntro] = useState(true);
  const [introPhase, setIntroPhase] = useState(0); // 0=entering 1=hold 2=leaving

  const activeCard = pHand[activeIdx];
  const aiCard = (isOnline && !pTurn && remoteActionData) ? remoteActionData.card : aDeck[0];

  useEffect(() => {
    // FIX: Match-Intro Sound an den Load-Screen gekoppelt
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
          }
      };
      conn.on('data', handleData);
      return () => conn.off('data', handleData);
  }, [conn, pTurn, isOnline]);

  useEffect(() => {
      if (myLockedAction && remoteActionData) {
          resolveClash();
      }
  }, [myLockedAction, remoteActionData]);

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
    if (!isOnline && !pTurn && aiCard) setCurK(getAIBestCategory(aiCard, activeCrisis, difficulty, activeCard));
  }, [pTurn, aiCard, activeCrisis, difficulty, activeCard, isOnline]);

  // FIX: Hier triggern wir die Sounds synchron zur Aufprall-Animation!
  useEffect(() => {
    if (clashData && !showCrisisIntro) {
      const timer = setTimeout(() => {
        setClashAnim(true);
        // Sound-Evaluation basierend auf dem Schaden
        if (clashData.dmgP > clashData.dmgA) {
          playSound('roundLose'); // Runden-Niederlage (Thud Loss)
        } else if (clashData.dmgA > clashData.dmgP) {
          playSound('win');       // Runde gewonnen
        } else {
          playSound('patt');      // Unentschieden oder 0-Schaden-Block
        }
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setClashAnim(false);
    }
  }, [clashData, showCrisisIntro]);

  const handleStatClick = (statKey) => {
    if (!pTurn) return;
    playSound('click');
    setCurK(statKey);
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

  const resolveClash = () => {
      setWaiting(false);
      const isAttacker = pTurn;
      const atkAct = isAttacker ? myLockedAction : remoteActionData;
      const defAct = isAttacker ? remoteActionData : myLockedAction;
      const k = atkAct.category;

      const pCard = myLockedAction.card;
      const aCard = remoteActionData.card;

      const calcVal = (card, effObj, isRemote) => {
           let v = Math.floor(card[k] ?? card.stats?.[k] ?? 0) + ((card.level || 1) - 1) * 2;
           if (!isRemote) v += (currentApexBuffs[k] || 0); 
           
           if (effObj && effObj.stat === k) {
               v += effObj.buff;
               if (effObj.syn?.includes(card.name)) v += effObj.synBuff;
           }

           let mult = 1;
           if (activeCrisis) {
               if ((activeCrisis.id === 'HYPERINFLATION' && k === 'finance') || (activeCrisis.id === 'BLACKOUT' && k === 'tech')) v = 0;
               else if (['NUCLEAR_WAR','ANARCHY','NWO'].includes(activeCrisis.id)) {
                   if (activeCrisis.id === 'NUCLEAR_WAR' && k === 'arsenal') mult = 1.5;
                   if (activeCrisis.id === 'ANARCHY' && k === 'erosion') mult = 1.5;
                   if (activeCrisis.id === 'NWO' && k === 'kingmaking') mult = 1.5;
               }
           }
           return Math.floor(v * mult);
      };

      const pV = calcVal(pCard, myLockedAction.effObj, false);
      const aV = calcVal(aCard, remoteActionData.effObj, true);

      const atkVal = isAttacker ? pV : aV;
      const defVal = isAttacker ? aV : pV;

      let dmgP = 0, dmgA = 0, healP = 0, healA = 0, recoilP = 0, recoilA = 0;
      const diff = Math.max(0, atkVal - defVal);
      let dmg = Math.floor(diff * 1.5);
      let recoil = 0;

      if (atkAct.action === 'erholen') {
           dmg = Math.floor(defVal * 1.5);
           if (isAttacker) dmgP = dmg; else dmgA = dmg;
      } else if (defAct.action === 'erholen') {
           dmg = Math.floor(atkVal * 1.5);
           if (isAttacker) dmgA = dmg; else dmgP = dmg;
      } else {
           if (atkAct.action === 'allin') {
               if (atkVal > defVal) dmg = Math.floor((diff + 40) * 3);
               else recoil = 150;
           }
           if (defAct.action === 'konter') {
               if (defVal > atkVal) {
                   dmg = 0;
                   let counterDmg = Math.floor((defVal - atkVal + 30) * 2);
                   if (isAttacker) dmgP = counterDmg; else dmgA = counterDmg;
               } else {
                   let selfDmg = Math.floor((atkVal - defVal + 40) * 3);
                   if (isAttacker) dmgA = selfDmg; else dmgP = selfDmg;
                   dmg = 0;
               }
           }
           if (dmg > 0) { if (isAttacker) dmgA = dmg; else dmgP = dmg; }
           if (recoil > 0) { if (isAttacker) recoilP = recoil; else recoilA = recoil; }
      }

      if (k === 'finance') {
           if (dmgA > 0 && isAttacker) healP = Math.floor(dmgA * 0.5);
           if (dmgP > 0 && !isAttacker) healA = Math.floor(dmgP * 0.5);
      }

      const newPHP = Math.max(0, pHP - dmgP - recoilP + healP);
      const newAHP = Math.max(0, aHP - dmgA - recoilA + healA);

      const getCost = (act, effObj) => {
          let c = act === 'std' ? 2 : act === 'allin' ? 8 : act === 'konter' ? 6 : 0;
          if (effObj) c += effObj.cost;
          return c;
      };

      const newPEP = Math.min(15, pEP - getCost(myLockedAction.action, myLockedAction.effObj) + 2 + getPlayerRegen(pHand));
      const newAEP = Math.min(15, aEP - getCost(remoteActionData.action, remoteActionData.effObj) + 2); 

      setClashData({
          pc: pCard, ac: aCard, categoryKey: k,
          pV, pEffObj: myLockedAction.effObj, 
          aV, aEffObj: remoteActionData.effObj,
          pAct: formatActionName(myLockedAction.action), 
          aAct: formatActionName(remoteActionData.action),
          oldPHP: pHP, oldAHP: aHP, newPHP, newAHP, newPEP, newAEP, 
          dmgP: dmgP + recoilP, dmgA: dmgA + recoilA, healToPlayer: healP
      });

      setMyLockedAction(null);
      setRemoteActionData(null);

      // (Sounds wurden in den useEffect verschoben für bessere Synchronisation)

      if (myLockedAction.effObj) {
          setPEffDeck(pEffDeck.slice(1));
          setPEffHand(pEffDeck[0] ? [pEffDeck[0]] : []);
      }
      if (remoteActionData.effObj) {
          setAEffDeck(aEffDeck.slice(1));
          setAEffHand(aEffDeck[0] ? [aEffDeck[0]] : []);
      }
      setActiveEffObj(null);
  };

  const executeAction = (actionType) => {
    const k = actionType === 'erholen' ? (curK || 'tech') : curK;
    if (actionType !== 'erholen' && !curK) return;

    if (isOnline) {
        playSound('click');
        const actData = { action: actionType, category: k, effObj: activeEffObj, card: activeCard };
        setMyLockedAction(actData);
        setWaiting(true);
        conn.send({ type: 'ACTION', ...actData });
        return;
    }

    let aiActiveEffObj = null;
    if (aEffHand[0] && aEffHand[0].stat === k) {
        if (aEP >= (aEffHand[0].cost + 2) && Math.random() > 0.3) {
            aiActiveEffObj = aEffHand[0];
        }
    }
    
    setMyLockedAction({ action: actionType, category: k, effObj: activeEffObj, card: activeCard });
    setRemoteActionData({ 
        action: pTurn ? (Math.random()>0.5?'block':'konter') : 'std', 
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

              // FIX: Hier wird der Krisen-Alarm getriggert!
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
    let finalPHP = clashData.newPHP;
    let finalAHP = clashData.newAHP;

    setPHP(finalPHP); setAHP(finalAHP); setPEP(clashData.newPEP); setAEP(clashData.newAEP);

    if (finalPHP <= 0 || finalAHP <= 0) {
      const isWin = finalAHP <= 0 && finalPHP > 0;
      onEndGame({ isWin, sarcasmNews: getSarcasticNews(isWin) });
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
  
  const canDefend = !isOnline || remoteActionData !== null;

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

  return (
    <div id="game-ui" className="screen active">
      {/* ── MATCH INTRO ANIMATION ── */}
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
          {/* Scanline overlay */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,229,255,0.03) 3px, rgba(0,229,255,0.03) 4px)', pointerEvents: 'none' }} />

          <div style={{
            transform: introPhase >= 1 ? 'translateY(0) scale(1)' : 'translateY(-30px) scale(0.85)',
            opacity: introPhase >= 1 ? 1 : 0,
            transition: 'transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.4s',
            fontFamily: 'monospace', letterSpacing: '12px',
            fontSize: '0.9rem', color: 'var(--ep)', textTransform: 'uppercase',
          }}>
            {isOnline ? '// P2P NETWORK MATCH //' : `// THREAT LEVEL ${difficulty} — ${['','TRAINEE','OPERATIVE','EXECUTIVE','ARCHITECT'][difficulty]} //`}
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

          {/* Animated bar */}
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
        <div className="game-title-small">ARCHITECTS OF CHAOS {isOnline ? '[ONLINE]' : ''}</div>
        <div id="turn-ind" className={pTurn ? 'turn-player' : 'turn-ai'}>{pTurn ? "▶ DEIN ZUG" : "⚠ GEGNER GREIFT AN"}</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="mono" style={{ alignSelf: 'center', opacity: 0.6, fontSize: '0.8rem' }}>LVL {difficulty} Threat</div>
          <button className="btn-info" onClick={onShowRules}>RULES</button>
          <button className="btn-back" onClick={handleAbort}>ABORT</button>
        </div>
      </div>

      <div className="cockpit-layout">
       <div className="cockpit-layout">
  <div className="cockpit-center mobile-arena">
    {/* LINKE BALKEN: Stabilität & Energie */}
    <div className="arena-side-bars left-bars">
      <div className="vertical-bar-container">
        <div className="v-bar-fill win-bg" style={{ height: `${(pHP / 1000) * 100}%` }}></div>
        <span className="v-bar-text">STAB {Math.floor(pHP)}</span>
      </div>
      <div className="vertical-bar-container">
        <div className="v-bar-fill ep-bg" style={{ height: `${(pEP / 15) * 100}%` }}></div>
        <span className="v-bar-text">NRG {pEP}</span>
      </div>
    </div>

    {/* DIE KARTE */}
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
      />
    </div>

    {/* RECHTE BALKEN: Integrität & Krise */}
    <div className="arena-side-bars right-bars">
      <div className="vertical-bar-container">
        <div className="v-bar-fill lose-bg" style={{ height: `${(aHP / 1000) * 100}%` }}></div>
        <span className="v-bar-text">INT {Math.floor(aHP)}</span>
      </div>
      <div className="vertical-bar-container">
        <div className="v-bar-fill crisis-bg" style={{ height: `${crisisRisk}%` }}></div>
        <span className="v-bar-text">RISK {crisisRisk}%</span>
      </div>
    </div>
  </div>

  {/* DIE HANDKARTEN (Kommen direkt unter die Arena) */}
  <div className="hand-hub">
    <div className="hand-grid">
      {/* ... Dein bestehender hand-grid Code mit pHand.map ... */}
    </div>
    <div className="tactic-separator"></div>
    <div className="tactic-grid">
      {/* ... Dein bestehender tactic-grid Code ... */}
    </div>
  </div>

  <div className="cockpit-right">
    <div id="action-area">
      {/* HIER WURDE DER LOG-BOX ENTFERNT! */}
      
      <div className="action-container" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
        {/* Buttons nebeneinander statt untereinander */}
        {pTurn ? (
          <>
            <button className="btn-act" onClick={() => executeAction('erholen')}><span className="act-title">ERHOLEN</span></button>
            <button className="btn-act btn-primary" style={{ opacity: canStd ? 1 : 0.4 }} onClick={() => canStd && executeAction('std')}><span className="act-title">STD</span></button>
            <button className="btn-act btn-danger" style={{ opacity: canAllIn ? 1 : 0.4 }} onClick={() => canAllIn && executeAction('allin')}><span className="act-title">ALL-IN</span></button>
          </>
        ) : (
          <>
            <button className="btn-act btn-primary" style={{ opacity: canBlock && canDefend ? 1 : 0.4 }} onClick={() => canBlock && canDefend && executeAction('block')}><span className="act-title">BLOCK</span></button>
            <button className="btn-act btn-danger" style={{ opacity: canKonter && canDefend ? 1 : 0.4 }} onClick={() => canKonter && canDefend && executeAction('konter')}><span className="act-title">KONTER</span></button>
          </>
        )}
      </div>
    </div>
  </div>
</div>

        <div className="cockpit-right">
          <div id="action-area">
            <div className="log-box mono" style={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', height: '100px', overflow: 'hidden' }}>
              <div>{curK ? CAT_CONFIG[curK]?.short : (pTurn ? "WÄHLE STATS ODER ERHOLE DICH..." : "VERTEIDIGE DICH...")}</div>
              
              {activeEffObj && (
                <div style={{ marginTop: '5px', fontSize: '0.8rem', color: 'var(--eff-col)' }}>
                  ► EFFEKT: +{activeEffObj.buff} {CAT_CONFIG[activeEffObj.stat]?.name}<br/>
                  <span style={{ color: '#aaa' }}>SYN: {activeEffObj.syn.join(', ')} (+{activeEffObj.synBuff})</span>
                </div>
              )}
            </div>
            
            <div className="action-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {pTurn ? (
                <>
                  <button className="btn-act" onClick={() => executeAction('erholen')}><span className="act-title">ERHOLEN</span><span className="act-cost">+{getPlayerRegen(pHand)}⚡</span></button>
                  <button className="btn-act btn-primary" style={{ opacity: canStd ? 1 : 0.4 }} onClick={() => canStd && executeAction('std')}><span className="act-title">STANDARD</span><span className="act-cost">-{2 + dynEffCost}⚡</span></button>
                  <button className="btn-act btn-danger" style={{ opacity: canAllIn ? 1 : 0.4 }} onClick={() => canAllIn && executeAction('allin')}><span className="act-title">ALL-IN</span><span className="act-cost">-{8 + dynEffCost}⚡</span></button>
                </>
              ) : (
                <>
                  <button className="btn-act btn-primary" style={{ opacity: canBlock && canDefend ? 1 : 0.4 }} onClick={() => canBlock && canDefend && executeAction('block')}><span className="act-title">BLOCKEN</span><span className="act-cost">-{dynEffCost}⚡</span></button>
                  <button className="btn-act btn-danger" style={{ opacity: canKonter && canDefend ? 1 : 0.4 }} onClick={() => canKonter && canDefend && executeAction('konter')}><span className="act-title">KONTER</span><span className="act-cost">-{6 + dynEffCost}⚡</span></button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCrisisIntro && (
        <div className="glass-overlay active" style={{zIndex: 4000, background: 'rgba(25, 0, 5, 0.98)', justifyContent: 'center', overflow: 'hidden'}}>
          <div className="crisis-glitch-bg"></div>
          <div className="crisis-alert-title">⚠ SYSTEM COLLAPSE ⚠<br/>{showCrisisIntro.name}</div>
          <div className="crisis-alert-desc">{showCrisisIntro.desc}</div>
          <div className="mono" style={{ color: 'var(--lose)', marginTop: '40px', fontSize: '1.2rem', animation: 'crisisFlashFade 1s infinite alternate', fontWeight: 'bold', textAlign: 'center' }}>
            -- GLOBALE PARAMETER ÜBERSCHRIEBEN FÜR 3 RUNDEN --
          </div>
        </div>
      )}

      {clashData && !showCrisisIntro && (
        <div className="glass-overlay active" style={{zIndex: 25000}}>
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
                  />
                  <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', background: '#000', color: 'var(--ep)', padding: '8px 20px', border: '2px solid #555', fontWeight: '900', fontSize: '1.2rem', zIndex: 30, letterSpacing: '2px' }}>
                     {clashData.pAct}
                  </div>
               </div>
               {clashAnim && clashData.dmgP > 0 && <div className="dmg-popup dmg-neg show">-{clashData.dmgP}</div>}
               {clashAnim && clashData.healToPlayer > 0 && <div className="dmg-popup dmg-pos show">+{clashData.healToPlayer}</div>}
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
                  />
                  <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', background: '#000', color: 'var(--ep)', padding: '8px 20px', border: '2px solid #555', fontWeight: '900', fontSize: '1.2rem', zIndex: 30, letterSpacing: '2px' }}>
                     {clashData.aAct}
                  </div>
               </div>
               {clashAnim && clashData.dmgA > 0 && <div className="dmg-popup dmg-neg show">-{clashData.dmgA}</div>}
            </div>
          </div>

          <button className="menu-btn btn-play modern-btn" style={{marginTop: '40px'}} onClick={confirmClash}>WEITER &gt;</button>
        </div>
      )}
    </div>
  );
}