// src/logic/gameLogic.js

// ─────────────────────────────────────────────────────────────────────────────
// INTERNE HILFSFUNKTIONEN
// ─────────────────────────────────────────────────────────────────────────────

function hasPassive(pHandCards, nameFragment) {
  return pHandCards.some(c => c?.name?.includes(nameFragment));
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

// Hilfsfunktion zur Berechnung des deterministischen Fraktions-Buffs
export function getFactionBuffs(faction) {
  if (!faction) return {};
  let h = 0;
  for (let i = 0; i < faction.length; i++) h = Math.imul(31, h) + faction.charCodeAt(i) | 0;
  h = Math.abs(h);
  const keys = ['tech', 'finance', 'manipulation', 'erosion', 'kingmaking', 'system', 'arsenal', 'legitimacy'];
  return { [keys[h % 8]]: 20, [keys[(h + 3) % 8]]: 15 };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHADENS-KERN  (zentrale Wahrheit — wird von resolveRound UND resolveClash
//                in MatchEngine.jsx über dieselben Multiplikatoren benutzt)
//
// REGELN:
//   vs. BLOCK    → Angreifer gewinnt: diff × 1.5 (std)  /  diff × 3.0 (allin)
//   vs. KONTER   → Angreifer gewinnt: diff × 1.5 (std)  /  diff × 4.0 (allin)
//   vs. KONTER   → Verteidiger gewinnt (Recoil auf Angreifer):
//                                       diff × 2.0 (std)  /  diff × 5.0 (allin)
//   ERHOLEN vs. STANDARD: Schaden = voller gegnerischer Stat × 1.5  (keine Differenz!)
//   ERHOLEN vs. KONTER:   0 Schaden (Verteidiger erhält EP-Refund — siehe aEPGain)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Berechnet Schaden für EINEN Clash-Ausgang.
 *
 * @param {number}  atkVal    - Wert des Angreifers
 * @param {number}  defVal    - Wert des Verteidigers
 * @param {string}  atkAction - 'std' | 'allin' | 'erholen'
 * @param {string}  defAction - 'block' | 'konter' | 'erholen'
 * @returns {{ dmgOnDef: number, dmgOnAtk: number, aEPGain: number }}
 */
function calcClashDamage(atkVal, defVal, atkAction, defAction) {
  // ── SONDERFALL 1: Verteidiger wählt ERHOLEN ────────────────────────────
  if (defAction === 'erholen') {
    if (atkAction === 'konter') return { dmgOnDef: 0, dmgOnAtk: 0, aEPGain: 6 };
    return { dmgOnDef: Math.floor(atkVal * 1.5), dmgOnAtk: 0, aEPGain: 0 };
  }
  // ── SONDERFALL 2: Angreifer wählt ERHOLEN ────────────────────────────
  if (atkAction === 'erholen') {
    if (defAction === 'konter') return { dmgOnDef: 0, dmgOnAtk: 0, aEPGain: 6 };
    return { dmgOnDef: 0, dmgOnAtk: Math.floor(defVal * 1.5), aEPGain: 0 };
  }

  const diff = Math.max(0, atkVal - defVal); 
  const recoilDiff = Math.max(0, defVal - atkVal); 

  if (defAction === 'konter') {
    if (atkVal >= defVal) {
      const mult = atkAction === 'allin' ? 4.0 : 1.5;
      return { dmgOnDef: Math.floor(diff * mult), dmgOnAtk: 0, aEPGain: 0 };
    } else {
      const mult = atkAction === 'allin' ? 5.0 : 2.0;
      return { dmgOnDef: 0, dmgOnAtk: Math.floor(recoilDiff * mult), aEPGain: 0 };
    }
  }

  // Standard vs Block
  if (atkVal > defVal) {
    const mult = atkAction === 'allin' ? 3.0 : 1.5;
    return { dmgOnDef: Math.floor(diff * mult), dmgOnAtk: 0, aEPGain: 0 };
  }

  return { dmgOnDef: 0, dmgOnAtk: 0, aEPGain: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// KI-ENTSCHEIDUNGEN
// ─────────────────────────────────────────────────────────────────────────────

export function getAIDefenseAction({ aVal, pVal, aEP, difficulty = 1 }) {
  if (difficulty >= 2) {
    if (pVal > aVal + 20) return 'block';
  }
  return aEP >= 6 && aVal >= pVal - 10 && Math.random() > 0.4 ? 'konter' : 'block';
}

export function getAIAttackAction({ aEP, difficulty = 1, pEP = 10 }) {
  if (difficulty >= 3) {
    if (aEP < 10) return 'std';
    if (pEP < 2)  return 'allin';
  }
  return aEP >= 8 && Math.random() > 0.5 ? 'allin' : 'std';
}

export function getAIBestCategory(aiCard, activeCrisis = null, difficulty = 1, playerHand = [], aiDeckChars = [], aEP = 10) {
  const cats = ['tech', 'finance', 'manipulation', 'erosion', 'kingmaking', 'system', 'arsenal'];

  const factionCounts = {};
  (aiDeckChars || []).forEach(c => {
    if (c && c.faction) factionCounts[c.faction] = (factionCounts[c.faction] || 0) + 1;
  });
  const aActiveFactions = Object.keys(factionCounts).filter(f => factionCounts[f] >= 3);

  // THE ARCHITECT BAIT: Nutzt eine Krise gezielt aus, um sich mit 'erholen' zu erholen
  if (difficulty === 4 && activeCrisis && aEP < 6 && Math.random() < 0.7) {
    if (activeCrisis.id === 'HYPERINFLATION') return 'finance';
    if (activeCrisis.id === 'BLACKOUT')       return 'tech';
  }

  if (difficulty >= 3 && activeCrisis) {
    if (activeCrisis.id === 'NUCLEAR_WAR') return 'arsenal';
    if (activeCrisis.id === 'ANARCHY')     return 'erosion';
    if (activeCrisis.id === 'NWO')         return 'kingmaking';
  }

  const validCats = cats.filter(c => {
    if (!activeCrisis) return true;
    if (activeCrisis.id === 'HYPERINFLATION' && c === 'finance') return false;
    if (activeCrisis.id === 'BLACKOUT'       && c === 'tech')    return false;
    return true;
  });

  const targetPool = validCats.length > 0 ? validCats : cats;

  const getStatWithSynergy = (card, stat) => {
    let v = card[stat] ?? card.stats?.[stat] ?? 0;
    if (aActiveFactions.includes(card.faction)) v += getFactionBuffs(card.faction)[stat] || 0;
    return v;
  };

  if (difficulty === 4 && playerHand && playerHand.length > 0) {
    // Architekt scannt KOMPLETTE Hand und bezieht Synergien ein
    return [...targetPool].sort((a, b) => {
      const aiA    = getStatWithSynergy(aiCard, a);
      const aiB    = getStatWithSynergy(aiCard, b);
      const plBestA = Math.max(...playerHand.filter(c => c).map(c => c[a] ?? c.stats?.[a] ?? 0), 0);
      const plBestB = Math.max(...playerHand.filter(c => c).map(c => c[b] ?? c.stats?.[b] ?? 0), 0);
      return (aiB - plBestB) - (aiA - plBestA);
    })[0];
  }

  return [...targetPool].sort(
    (a, b) => getStatWithSynergy(aiCard, b) - getStatWithSynergy(aiCard, a)
  )[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY-EXPORTE
// ─────────────────────────────────────────────────────────────────────────────

export function getPlayerRegen(pHandCards) {
  return 2;
}

export function getSarcasticNews(isWin) {
  const pool = isWin ? NEWS_DATA.win : NEWS_DATA.lose;
  return pool[Math.floor(Math.random() * pool.length)];
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
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// HAUPT-RUNDENAUFLÖSUNG
// ─────────────────────────────────────────────────────────────────────────────

export function resolveRound({
  action,
  playerCard,
  aiCard,
  category,
  activeEffect    = null,
  aiActiveEffect  = null,
  pEP,
  aEP,
  isPlayerTurn,
  pHandCards      = [],
  activeCrisis    = null,
  difficulty      = 1,
}) {
  // ── 1. Basis-Stats ermitteln ───────────────────────────────────────────────
  let pVal = Math.floor(playerCard[category] ?? playerCard.stats?.[category] ?? 0);
  let aVal = Math.floor(aiCard[category]     ?? aiCard.stats?.[category]     ?? 0);

  const pLevelBonus = ((playerCard.level || 1) - 1) * 2;
  const aLevelBonus = ((aiCard.level    || 1) - 1) * 2;

  let pEffCost = 0;
  let aEffCost = 0;

  // ── 2. Spieler-Modifikatoren (nur wenn nicht ERHOLEN) ─────────────────────
  if (action !== 'erholen') {
    pVal += calculateHandBuffs(pHandCards, category) + pLevelBonus;

    if (activeEffect?.stat === category) {
      pEffCost = activeEffect.cost ?? 0;
      const synBonus = (activeEffect.syn ?? []).includes(playerCard.name)
        ? (activeEffect.synBuff ?? 0) : 0;
      pVal += (activeEffect.buff ?? 0) + synBonus;
    }
  }

  // ── 3. KI-Modifikatoren ───────────────────────────────────────────────────
  aVal += aLevelBonus;

  if (aiActiveEffect?.stat === category) {
    aEffCost = aiActiveEffect.cost ?? 0;
    const synBonus = (aiActiveEffect.syn ?? []).includes(aiCard.name)
      ? (aiActiveEffect.synBuff ?? 0) : 0;
    aVal += (aiActiveEffect.buff ?? 0) + synBonus;
  }

  // ── 4. Passive Spezialregeln ──────────────────────────────────────────────
  if (category === 'tech') {
    if (action !== 'erholen' && isPlayerTurn  && (aiCard.arsenal     ?? aiCard.stats?.arsenal     ?? 0) > 80) pVal += 20;
    if (!isPlayerTurn                         && (playerCard.arsenal ?? playerCard.stats?.arsenal ?? 0) > 80) aVal += 20;
  }

  if (!isPlayerTurn && category === 'manipulation' && hasPassive(pHandCards, 'Murdoch')) aVal = 0;

  // ── 5. Krisen-Modifikatoren ───────────────────────────────────────────────
  if (activeCrisis) {
    const notResting = action !== 'erholen';
    if (activeCrisis.id === 'HYPERINFLATION' && category === 'finance') {
      if (notResting) pVal = 0;
      aVal = 0;
    }
    if (activeCrisis.id === 'BLACKOUT' && category === 'tech') {
      if (notResting) pVal = 0;
      aVal = 0;
    }
    if (activeCrisis.id === 'NUCLEAR_WAR' && category === 'arsenal' && notResting) {
      pVal = Math.floor(pVal * 1.5);
      aVal = Math.floor(aVal * 1.5);
    }
    if (activeCrisis.id === 'ANARCHY' && category === 'erosion' && notResting) {
      pVal = Math.floor(pVal * 1.5);
      aVal = Math.floor(aVal * 1.5);
    }
    if (activeCrisis.id === 'NWO' && category === 'kingmaking' && notResting) {
      pVal = Math.floor(pVal * 1.5);
      aVal = Math.floor(aVal * 1.5);
    }
  }

  // ── 6. Energie-Validierung ────────────────────────────────────────────────
  const baseCost = isPlayerTurn
    ? (action === 'allin' ? 8 : action === 'std' ? 2 : 0)
    : (action === 'konter' ? 6 : 0);
  const totalCost = baseCost + pEffCost;

  if (pEP < totalCost) {
    return { valid: false, error: `Energie kritisch! (${totalCost}⚡ benötigt)` };
  }

  // ── 7. KI-Aktion bestimmen ────────────────────────────────────────────────
  const effectiveAEP = aEP - aEffCost;
  const aiAction = (isPlayerTurn && action !== 'erholen')
    ? getAIDefenseAction({ aVal, pVal, aEP: effectiveAEP, difficulty })
    : getAIAttackAction({ aEP: effectiveAEP, difficulty, pEP });

  // ── 8. Schaden berechnen (zentrale Formel) ────────────────────────────────
  //
  //  Perspektive: Immer aus Sicht des ANGREIFERS dieser Runde.
  //  isPlayerTurn = true  → Spieler greift an, KI verteidigt
  //  isPlayerTurn = false → KI greift an, Spieler verteidigt (action = 'block'/'konter')
  //
  let dmgToPlayer = 0;
  let dmgToAI     = 0;
  let aEPGain     = 0;

  if (isPlayerTurn) {
    // Spieler = Angreifer, KI = Verteidiger
    const { dmgOnDef, dmgOnAtk, aEPGain: gain } = calcClashDamage(pVal, aVal, action, aiAction);
    dmgToAI     = dmgOnDef;
    dmgToPlayer = dmgOnAtk;
    aEPGain     = gain;
  } else {
    // KI = Angreifer, Spieler = Verteidiger
    // 'action' ist hier die Verteidigungs-Aktion des Spielers ('block' oder 'konter')
    // aiAction ist 'std' oder 'allin'
    const { dmgOnDef, dmgOnAtk, aEPGain: gain } = calcClashDamage(aVal, pVal, aiAction, action);
    dmgToPlayer = dmgOnDef;
    dmgToAI     = dmgOnAtk;
    aEPGain     = gain;
  }

  // ── 9. Finanzmacht-Heilung (Kategorie-Bonus) ──────────────────────────────
  const healToPlayer = category === 'finance' && isPlayerTurn ? Math.floor(dmgToAI * 0.5) : 0;

  // ── 10. Ergebnis ──────────────────────────────────────────────────────────
  return {
    valid:        true,
    pVal,
    aVal,
    aiAction,
    dmgToPlayer:  Math.floor(dmgToPlayer),
    dmgToAI:      Math.floor(dmgToAI),
    healToPlayer,
    aEPGain,
    epCost:       totalCost,
    aEPCost:      aEffCost,
  };
}