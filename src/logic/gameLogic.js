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
    if ((card?.type === 'apex' || card?.type === 'anomaly') && card.passiveBuff?.stat === category) {
      bonus += (card.passiveBuff.val || 0) + ((card.level || 1) - 1) * 2;
    }
  });
  return bonus;
}

// Hilfsfunktion zur Berechnung des Fraktions-Buffs (Fest definierte Archetypen!)
export function getFactionBuffs(faction) {
  if (!faction) return {};
  
  const facName = faction.trim().toLowerCase();
  
  // Bulletproof Matching
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

  // Fallback
  return { tech: 10, system: 10 };
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
  const diff = Math.max(0, atkVal - defVal);
  const recoilDiff = Math.max(0, defVal - atkVal);

  // ── SONDERFALL 1: Verteidiger wählt ERHOLEN ──
  // Wer sich erholt, kassiert massiven Schaden bei Angriffen, kontert aber EP-Kosten
  if (defAction === 'erholen') {
    if (atkAction === 'konter') return { dmgOnDef: 0, dmgOnAtk: 0, aEPGain: 6 };
    const mult = atkAction === 'allin' ? 3.0 : 2.0; // Bonus-Schaden gegen "Sitzende Enten"
    return { dmgOnDef: Math.floor(diff * mult), dmgOnAtk: 0, aEPGain: 0 };
  }

  // ── SONDERFALL 2: Angreifer wählt ERHOLEN ──
  if (atkAction === 'erholen') {
    const dmg = recoilDiff * 1.5;
    return { dmgOnDef: 0, dmgOnAtk: Math.floor(dmg), aEPGain: (defAction === 'konter' ? 6 : 0) };
  }

  // ── STANDARDSCHLACHT ──
  if (defAction === 'konter') {
    if (atkVal >= defVal) {
      // Angreifer bricht durch Konter
      const mult = atkAction === 'allin' ? 4.0 : 1.5;
      return { dmgOnDef: Math.floor(diff * mult), dmgOnAtk: 0, aEPGain: 0 };
    } else {
      // Verteidiger pariert (Recoil)
      const mult = atkAction === 'allin' ? 5.0 : 2.0;
      return { dmgOnDef: 0, dmgOnAtk: Math.floor(recoilDiff * mult), aEPGain: 0 };
    }
  }

  if (defAction === 'block') {
    if (atkVal > defVal) {
      // Angreifer überwindet Block (All-In vs Block ist hier x3.0)
      const mult = atkAction === 'allin' ? 3.0 : 1.5;
      return { dmgOnDef: Math.floor(diff * mult), dmgOnAtk: 0, aEPGain: 0 };
    }
  }

  return { dmgOnDef: 0, dmgOnAtk: 0, aEPGain: 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// KI-ENTSCHEIDUNGEN
// ─────────────────────────────────────────────────────────────────────────────

export function getAIDefenseAction({ aVal, pVal, aEP, difficulty = 1, pHP = 100, aHP = 100, aiMemory = { apexSeen: false } }) {
  if (aEP < 6) return 'block'; 
  if (difficulty >= 2) {
    if (pVal > aVal + 20) return 'block';
  }

  // LEVEL 4 PARANOIA: Wenn die Apex-Karte noch nicht kam, lieber Blocken um EP für Konter aufzuheben
  if (difficulty === 4 && !aiMemory.apexSeen && pVal < aVal + 10 && aEP < 12) {
      return 'block'; 
  }

  // DYNAMIC AGGRESSION (Level 3 & 4): Lethal Defense (Kontert garantiert, wenn der Recoil den Spieler tötet)
  if (difficulty >= 3 && aEP >= 6 && aVal >= pVal && (aVal - pVal) * 1.5 >= pHP) {
      return 'konter';
  }

  // DYNAMIC DEFENSE (Level 4): Suicide Prevention (Wenn der Konter fehlschlägt und der Recoil die KI tötet -> Block!)
  if (difficulty === 4 && aEP >= 6 && aVal < pVal && (pVal - aVal) * 2 >= aHP) {
      return 'block';
  }

  return aEP >= 6 && aVal >= pVal - 10 && Math.random() > 0.4 ? 'konter' : 'block';
}

export function getAIAttackAction({ aEP, difficulty = 1, pEP = 10, pHP = 100, aHP = 100, maxAHP = 100 }) {
  if (aEP < 2) return 'erholen'; 
  
  if (difficulty >= 3) {
    // DYNAMIC AGGRESSION: Finisher (Spieler ist am Ende)
    if (pHP <= 30 && aEP >= 8) {
       if (difficulty === 4) return 'allin'; // Lvl 4 zeigt keine Gnade
       if (Math.random() > 0.3) return 'allin'; // Lvl 3 zu 70%
    }
    
    // DYNAMIC AGGRESSION: Desperation (KI ist am Ende)
    if (aHP <= maxAHP * 0.25 && aEP >= 8) {
       if (difficulty === 4) return 'allin'; // Lvl 4 wirft alles nach vorne
       if (Math.random() > 0.5) return 'allin'; // Lvl 3 zu 50%
    }

    if (pEP < 2 && aEP >= 8) return 'allin'; 
    if (aEP < 10) return 'std';
  }
  return aEP >= 8 && Math.random() > 0.5 ? 'allin' : 'std';
}

export function getAIBestMove(aHand, aEffHand, activeCrisis = null, difficulty = 1, aiMemory = { factions: [], apexSeen: false, highestGTI: 0 }, aEP = 10, lastAIAttackStat = null, aActiveFactions = [], pHP = 100, aHP = 100, maxAHP = 100) {
  const cats = ['tech', 'finance', 'manipulation', 'erosion', 'kingmaking', 'system', 'arsenal', 'legitimacy'];

  const getStatWithSynergy = (card, stat) => {
    if (!card) return 0;
    let v = parseInt(card[stat] ?? card.stats?.[stat] ?? 0) + ((parseInt(card.level || 1) - 1) * 2);
    
    const normalizeStat = (s) => {
        const raw = (s || '').toLowerCase().trim();
        const map = { 'tech-hebel': 'tech', 'finanzmacht': 'finance', 'schattenmacht': 'kingmaking', 'schatten': 'kingmaking', 'systemrisiko': 'system', 'legitimität': 'legitimacy' };
        return map[raw] || raw;
    };

    const cardFacs = Array.isArray(card.faction) ? card.faction : (card.faction ? [card.faction] : []);
    cardFacs.forEach(fac => {
        const myFac = fac.trim().toUpperCase();
        if (aActiveFactions.includes(myFac)) {
            const buffs = getFactionBuffs(myFac) || getFactionBuffs(fac.trim()) || {};
            const key = Object.keys(buffs).find(k => normalizeStat(k) === normalizeStat(stat));
            if (key) v += parseInt(buffs[key] || 0);
        }
    });
    return v;
  };

  let bestScore = -9999;
  let bestMove = { cardIndex: 0, category: 'tech' };

  // THE ARCHITECT BAIT
  if (difficulty === 4 && activeCrisis && aEP < 6 && Math.random() < 0.7) {
    const baitCat = activeCrisis.id === 'HYPERINFLATION' ? 'finance' : (activeCrisis.id === 'BLACKOUT' ? 'tech' : null);
    if (baitCat && baitCat !== lastAIAttackStat) {
      let lowest = 999;
      let bIdx = 0;
      aHand.forEach((c, i) => {
         if(c && getStatWithSynergy(c, baitCat) < lowest) { lowest = getStatWithSynergy(c, baitCat); bIdx = i; }
      });
      return { cardIndex: bIdx, category: baitCat };
    }
  }

  aHand.forEach((card, cardIndex) => {
    if (!card) return;

    cats.forEach(cat => {
      if (cat === lastAIAttackStat) return;

      let rawStat = getStatWithSynergy(card, cat);

      // Krisen Filter & Risiko-Kalkulation
      if (activeCrisis) {
        if ((activeCrisis.id === 'HYPERINFLATION' && cat === 'finance') || (activeCrisis.id === 'BLACKOUT' && cat === 'tech')) {
          rawStat = -999; 
        } else if (difficulty >= 3) {
          const is15x = (activeCrisis.id === 'NUCLEAR_WAR' && cat === 'arsenal') ||
                        (activeCrisis.id === 'ANARCHY' && cat === 'erosion') ||
                        (activeCrisis.id === 'NWO' && cat === 'kingmaking');
          
          if (is15x && rawStat < 90) {
             rawStat -= 35; 
          }
        }
      }

      // Memory System (Level 3 & 4): Trackt Fraktionen und weicht Stärken aus
      if (difficulty >= 3 && aiMemory && aiMemory.factions.length > 0) {
          aiMemory.factions.forEach(playerFac => {
             const buffs = getFactionBuffs(playerFac) || {};
             const map = { 'tech-hebel': 'tech', 'finanzmacht': 'finance', 'schattenmacht': 'kingmaking', 'schatten': 'kingmaking', 'systemrisiko': 'system', 'legitimität': 'legitimacy' };
             const norm = s => map[(s || '').toLowerCase().trim()] || (s || '').toLowerCase().trim();
             const key = Object.keys(buffs).find(x => norm(x) === norm(cat));
             
             if (key) {
                 // Level 3 zieht sanft Punkte ab, Level 4 meidet die Kategorie massiv
                 rawStat -= difficulty === 4 ? 25 : 10; 
             }
          });
      }

      // Apex Paranoia (Level 4): Spielt defensiver (geringere Stat-Scores), wenn das Boss-Monster des Spielers noch fehlt
      if (difficulty === 4 && !aiMemory.apexSeen && aEP < 8) {
          rawStat -= 15; 
      }

      // Dynamic Aggression: Finisher / Desperation (Level 3 & 4)
      if (difficulty >= 3) {
          // Wenn das Spiel kurz vor dem Ende steht, werden Raw Stats (Schaden) wichtiger als Taktik-Synergien
          if (aHP <= maxAHP * 0.25 || pHP <= 30) {
              const intensity = difficulty === 4 ? 1.8 : 1.3;
              rawStat = Math.floor(rawStat * intensity);
          }
      }

      // Taktik Check für Priorisierung
      let tacticBonus = 0;
      if (difficulty >= 3 && aEffHand && aEffHand[0]) {
         const tactic = aEffHand[0];
         const map = { 'tech-hebel': 'tech', 'finanzmacht': 'finance', 'schattenmacht': 'kingmaking', 'schatten': 'kingmaking', 'systemrisiko': 'system', 'legitimität': 'legitimacy' };
         const norm = s => map[(s || '').toLowerCase().trim()] || (s || '').toLowerCase().trim();
         
         if (norm(tactic.stat) === cat && aEP >= (tactic.cost + 2)) {
            tacticBonus += parseInt(tactic.buff || 0);
            const hasSyn = Array.isArray(tactic.syn) ? tactic.syn.some(n => (card.name || '').includes(n)) : (card.name || '').includes(tactic.syn);
            if (hasSyn) tacticBonus += parseInt(tactic.synBuff || 0);
         }
      }

      const finalScore = rawStat + tacticBonus;
      if (finalScore > bestScore) {
         bestScore = finalScore;
         bestMove = { cardIndex, category: cat };
      }
    });
  });

  // Anti-Derp System (Level 3 & 4)
  if (difficulty >= 3 && bestScore < 60 && bestScore > -50) { 
     let max = -1;
     aHand.forEach((c, idx) => {
        if(!c) return;
        cats.forEach(cat => {
           if(cat === lastAIAttackStat) return;
           const v = getStatWithSynergy(c, cat);
           if(v > max) { max = v; bestMove = { cardIndex: idx, category: cat }; }
        });
     });
  }

  return bestMove;
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
      const eLvl = activeEffect.level || 1;
      let pct = (activeEffect.buffPercent || 0) + (eLvl - 1) * 2;
      
      const hasSyn = Array.isArray(activeEffect.syn) 
        ? activeEffect.syn.some(n => (playerCard.name || '').includes(n)) 
        : (playerCard.name || '').includes(activeEffect.syn);
        
      if (hasSyn) pct *= 2;
      pVal += Math.floor(pVal * (pct / 100));
    }
  }

  // ── 3. KI-Modifikatoren ───────────────────────────────────────────────────
  aVal += aLevelBonus;

  if (aiActiveEffect?.stat === category) {
    aEffCost = aiActiveEffect.cost ?? 0;
    const eLvl = aiActiveEffect.level || 1;
    let pct = (aiActiveEffect.buffPercent || 0) + (eLvl - 1) * 2;
    
    const hasSyn = Array.isArray(aiActiveEffect.syn) 
      ? aiActiveEffect.syn.some(n => (aiCard.name || '').includes(n)) 
      : (aiCard.name || '').includes(aiActiveEffect.syn);
      
    if (hasSyn) pct *= 2;
    aVal += Math.floor(aVal * (pct / 100));
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

  // ── 6. Energie-Validierung (Gleiche Regeln für beide) ──────────────────────
  const pBaseCost = isPlayerTurn ? (action === 'allin' ? 8 : action === 'std' ? 2 : 0) : (action === 'konter' ? 6 : 0);
  const aBaseCost = !isPlayerTurn ? (action === 'allin' ? 8 : action === 'std' ? 2 : 0) : (action === 'konter' ? 6 : 0);
  
  const pTotalCost = pBaseCost + pEffCost;
  const aTotalCost = aBaseCost + aEffCost;

  if (pEP < pTotalCost) return { valid: false, error: `Energie kritisch! (${pTotalCost}⚡ benötigt)` };
  if (aEP < aTotalCost) return { valid: false }; // KI-Validierung

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