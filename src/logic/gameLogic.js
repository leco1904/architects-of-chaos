// src/logic/gameLogic.js

function hasPassive(pHandCards, nameFragment) {
  return pHandCards.some(c => c?.name?.includes(nameFragment))
}

function calculateHandBuffs(pHandCards, category) {
  let bonus = 0;
  pHandCards.forEach(card => {
    if (card?.type === 'apex' && card.passiveBuff?.stat === category) {
      bonus += card.passiveBuff.val || 0;
    }
  });
  return bonus;
}

export function getAIDefenseAction({ aVal, pVal, aEP, difficulty = 1 }) {
  if (difficulty >= 2) {
    if (pVal > aVal + 20) return 'block'; 
  }
  return aEP >= 6 && aVal >= pVal - 10 && Math.random() > 0.4 ? 'konter' : 'block'
}

export function getAIAttackAction({ aEP, difficulty = 1, pEP = 10 }) {
  if (difficulty >= 3) {
    if (aEP < 10) return 'std';
    if (pEP < 2) return 'allin'; 
  }
  return aEP >= 8 && Math.random() > 0.5 ? 'allin' : 'std'
}

// Hilfsfunktion zur Berechnung des deterministischen Fraktions-Buffs
function getFactionBuffs(faction) {
  if (!faction) return {};
  let h = 0;
  for (let i = 0; i < faction.length; i++) h = Math.imul(31, h) + faction.charCodeAt(i) | 0;
  h = Math.abs(h);
  const keys = ['tech','finance','manipulation','erosion','kingmaking','system','arsenal','legitimacy'];
  return { [keys[h % 8]]: 20, [keys[(h + 3) % 8]]: 15 };
}

export function getAIBestCategory(aiCard, activeCrisis = null, difficulty = 1, playerHand = [], aiDeckChars = [], aEP = 10) {
  const cats = ['tech', 'finance', 'manipulation', 'erosion', 'kingmaking', 'system', 'arsenal'];
  
  const factionCounts = {};
  (aiDeckChars || []).forEach(c => { if (c && c.faction) factionCounts[c.faction] = (factionCounts[c.faction] || 0) + 1; });
  const aActiveFactions = Object.keys(factionCounts).filter(f => factionCounts[f] >= 3);
  
  // THE ARCHITECT BAIT: Nutzt eine Krise gezielt aus, um sich mit 'erholen' zu heilen!
  if (difficulty === 4 && activeCrisis && aEP < 6 && Math.random() < 0.7) {
      if (activeCrisis.id === 'HYPERINFLATION') return 'finance';
      if (activeCrisis.id === 'BLACKOUT') return 'tech';
  }

  if (difficulty >= 3 && activeCrisis) {
      if (activeCrisis.id === 'NUCLEAR_WAR') return 'arsenal';
      if (activeCrisis.id === 'ANARCHY') return 'erosion';
      if (activeCrisis.id === 'NWO') return 'kingmaking';
  }

  const validCats = cats.filter(c => {
    if (!activeCrisis) return true;
    if (activeCrisis.id === 'HYPERINFLATION' && c === 'finance') return false;
    if (activeCrisis.id === 'BLACKOUT' && c === 'tech') return false;
    return true;
  });

  const targetPool = validCats.length > 0 ? validCats : cats;

  const getStatWithSynergy = (card, stat) => {
      let v = card[stat] ?? card.stats?.[stat] ?? 0;
      if (aActiveFactions.includes(card.faction)) v += getFactionBuffs(card.faction)[stat] || 0;
      return v;
  };

  if (difficulty === 4 && playerHand && playerHand.length > 0) {
    // Architekt scannt KOMPLETTE Hand und bezieht Synergien ein!
    return [...targetPool].sort((a, b) => {
      const aiA = getStatWithSynergy(aiCard, a);
      const aiB = getStatWithSynergy(aiCard, b);
      
      const plBestA = Math.max(...playerHand.filter(c=>c).map(c => c[a] ?? c.stats?.[a] ?? 0), 0);
      const plBestB = Math.max(...playerHand.filter(c=>c).map(c => c[b] ?? c.stats?.[b] ?? 0), 0);
      
      return (aiB - plBestB) - (aiA - plBestA); // Absteigend sortieren
    })[0];
  }

  // Difficulty 1-3: Nimmt den besten Stat (inklusive Synergien)
  return [...targetPool].sort(
    (a, b) => getStatWithSynergy(aiCard, b) - getStatWithSynergy(aiCard, a)
  )[0];
}
export function getPlayerRegen(pHandCards) {
  return 2; 
}

export function getSarcasticNews(isWin) {
  const pool = isWin ? NEWS_DATA.win : NEWS_DATA.lose
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getSellValue(card) {
  if (!card) return 0;
  if (card.type === 'effect') {
      if (card.cost >= 3) return 100;
      if (card.cost === 2) return 50;
      return 25;
  }
  if (card.type === 'apex' || card.type === 'legacy') return 200;
  const gti = card.gti || 0;
  if (gti >= 96) return 200;
  if (gti >= 90) return 100;
  if (gti >= 80) return 50;
  return 25;
}

const NEWS_DATA = {
  win: [
    { text: 'WELTWIRTSCHAFT STABILISIERT: Experten warnen: "Nur temporär, totale Pleite folgt."' },
    { text: 'ALGORITHMEN GEZÄHMT: Neuer globaler Standard verbietet KI-Sarkasmus offiziell.' },
    { text: 'KARTENHAUS STEHT NOCH: Erosion gestoppt, Umweltkrise auf 2035 vertagt.' },
  ],
  lose: [
    { text: 'MARKTKOLLAPS: Finanzmacht-Stat explodiert, Brot kostet jetzt 1 Mio. Energie.' },
    { text: 'NETZABSTURZ: KI übernimmt Kontrolle, Menschen müssen wieder draußen spielen.' },
  ]
}

export function resolveRound({
  action, playerCard, aiCard, category, activeEffect = null, aiActiveEffect = null, pEP, aEP, isPlayerTurn, pHandCards = [], activeCrisis = null, difficulty = 1
}) {
  let pVal = Math.floor(playerCard[category] ?? playerCard.stats?.[category] ?? 0);
  let aVal = Math.floor(aiCard[category]     ?? aiCard.stats?.[category]     ?? 0);

  const pLevelBonus = ((playerCard.level || 1) - 1) * 2;
  const aLevelBonus = ((aiCard.level || 1) - 1) * 2;

  let pEffCost = 0;
  let aEffCost = 0;

  if (action === 'erholen') {
      pVal = 0;
  } else {
      pVal += calculateHandBuffs(pHandCards, category) + pLevelBonus;
      if (activeEffect?.stat === category) {
        pEffCost = activeEffect.cost ?? 0;
        const synBonus = (activeEffect.syn ?? []).includes(playerCard.name) ? (activeEffect.synBuff ?? 0) : 0;
        pVal += (activeEffect.buff ?? 0) + synBonus;
      }
  }

  aVal += aLevelBonus;

  if (aiActiveEffect?.stat === category) {
    aEffCost = aiActiveEffect.cost ?? 0;
    const synBonus = (aiActiveEffect.syn ?? []).includes(aiCard.name) ? (aiActiveEffect.synBuff ?? 0) : 0;
    aVal += (aiActiveEffect.buff ?? 0) + synBonus;
  }

  if (category === 'tech') {
    if (action !== 'erholen' && isPlayerTurn && (aiCard.arsenal ?? aiCard.stats?.arsenal ?? 0) > 80) pVal += 20;
    if (!isPlayerTurn && (playerCard.arsenal ?? playerCard.stats?.arsenal ?? 0) > 80) aVal += 20;
  }

  if (!isPlayerTurn && category === 'manipulation' && hasPassive(pHandCards, 'Murdoch')) aVal = 0;

  if (activeCrisis) {
      if (activeCrisis.id === 'HYPERINFLATION' && category === 'finance') { if (action !== 'erholen') pVal = 0; aVal = 0; }
      if (activeCrisis.id === 'BLACKOUT' && category === 'tech') { if (action !== 'erholen') pVal = 0; aVal = 0; }
      if (activeCrisis.id === 'NUCLEAR_WAR' && category === 'arsenal') { if (action !== 'erholen') pVal = Math.floor(pVal * 1.5); aVal = Math.floor(aVal * 1.5); }
      if (activeCrisis.id === 'ANARCHY' && category === 'erosion') { if (action !== 'erholen') pVal = Math.floor(pVal * 1.5); aVal = Math.floor(aVal * 1.5); }
      if (activeCrisis.id === 'NWO' && category === 'kingmaking') { if (action !== 'erholen') pVal = Math.floor(pVal * 1.5); aVal = Math.floor(aVal * 1.5); }
  }

  let baseCost = isPlayerTurn ? (action === 'allin' ? 8 : (action === 'std' ? 2 : 0)) : (action === 'konter' ? 6 : 0);
  let costEP = baseCost + pEffCost;

  if (pEP < costEP) return { valid: false, error: `Energie kritisch! (${costEP}⚡ benötigt)` };

  const effectiveAEP = aEP - aEffCost;
  let aiAction = (isPlayerTurn && action !== 'erholen') 
    ? getAIDefenseAction({ aVal, pVal, aEP: effectiveAEP, difficulty }) 
    : getAIAttackAction({ aEP: effectiveAEP, difficulty, pEP });

  let dmgToPlayer = 0, dmgToAI = 0, recoilToPlayer = 0, recoilToAI = 0, healToPlayer = 0, epGainToPlayer = 0;

  if (action === 'erholen') {
      const diff = aVal; 
      dmgToPlayer = aiAction === 'allin' ? (diff + 40) * 3 : diff * 1.5;
  } else if (pVal !== aVal) {
    if (isPlayerTurn) {
      if (aiAction === 'konter') {
        if (aVal > pVal) dmgToPlayer = (aVal - pVal + 30) * 2;
        else dmgToAI = (pVal - aVal + 40) * 3;
      } else {
        const diff = pVal - aVal;
        if (action === 'allin') {
          if (diff > 0) dmgToAI = (diff + 40) * 3;
          else recoilToPlayer = 150;
        } else { if (diff > 0) dmgToAI = diff * 1.5; }
      }
    } else {
      const diff = aVal - pVal;
      if (action === 'konter') {
        if (pVal > aVal) dmgToAI = (pVal - aVal + 30) * 2;
        else dmgToPlayer = (aVal - pVal + 40) * 3;
      } else {
        if (aiAction === 'allin') {
          if (diff > 0) dmgToPlayer = (diff + 40) * 3;
          else recoilToAI = 150;
        } else { if (diff > 0) dmgToPlayer = diff * 1.5; }
      }
    }
    if (category === 'finance') healToPlayer = (isPlayerTurn ? dmgToAI : 0) * 0.5;
  }

  return {
    valid: true, costEP, aEffCost, aiAction, pVal, aVal,
    dmgToPlayer: Math.floor(dmgToPlayer), dmgToAI: Math.floor(dmgToAI),
    recoilToPlayer: Math.floor(recoilToPlayer), recoilToAI: Math.floor(recoilToAI),
    healToPlayer: Math.floor(healToPlayer), epGainToPlayer: (category === 'kingmaking' && dmgToAI > 0) ? 2 : 0,
    passiveDrains: {
      putinDrain: hasPassive(pHandCards, 'Vladimir Putin') ? 25 : 0,
      merkelHeal: hasPassive(pHandCards, 'Angela Merkel')  ? 20 : 0,
    }
  }
}