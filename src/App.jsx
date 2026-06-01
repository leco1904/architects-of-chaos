import React, { useState, useEffect, useRef } from 'react';
import CyberBackground from './components/CyberBackground';
import MatchEngine from './components/MatchEngine';
import Card, { getFactionIcon } from './components/Card';
import Market from './components/Market';
import Inventory from './components/Inventory';
import Auth from './components/AuthScreen';
import AvatarLab from './components/AvatarLab';
import RoguelikeMap from './components/RoguelikeMap';
import RoguelikeReward from './components/RoguelikeReward';
import RoguelikeSquad from './components/Roguelikesquad';
import Leaderboard from './components/Leaderboard';
import GhostNodeMenu from './components/GhostNodeMenu';
import SystemOverrides, { ACHIEVEMENTS } from './components/SystemOverrides';
import GhostNetwork, { CyberAvatar } from './components/GhostNetwork'; // NEU
import CyberCursor from './components/CyberCursor';
import cardsData from './data/cards.json';
import { playSound, playMusic, setSFXVolume, setMusicVolume } from './logic/audio';
import { supabase } from './logic/supabase';
import { Peer } from 'peerjs';
import { Settings } from 'lucide-react';
// FIX: Version wird jetzt sicher über Electron oder Fallback bezogen
const APP_VERSION = window.electronAPI?.appVersion || "0.0.22";

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

// ── NEWS TICKER (AUSSERHALB DER APP DEFINIERT GEGEN RE-RENDERING) ──
const NewsTicker = React.memo(({ characters }) => {
  const [newsSet, setNewsSet] = React.useState("");

  React.useEffect(() => {
    if (!characters || characters.length === 0) return;

    const templates = [
  (c1, c2) => `+++ ANALYSE: Hat ${c1.name} wirklich die volle Kontrolle über ${c2.name}s Neural-Link? Die Indizien verdichten sich +++`,
  (c1, c2) => `+++ ${c1.name} hat den kompletten Kaffeebohnen-Vorrat von ${c2.name} beschlagnahmt – "Präventivmaßnahme gegen Übermüdung" +++`,
  (c1, c2) => `+++ REVOLTE: ${c1.name}s Untergebene tragen jetzt T-Shirts mit dem durchgestrichenen Konterfei von ${c2.name} +++`,
  (c1, c2) => `+++ ${c1.name} bietet ${c2.name}s geheime Tagebücher als NFT an – Mindestgebot: 1 Milliarde Credits +++`,
  (c1, c2) => `+++ SYSTEM-CHECK: ${c1.name} hat festgestellt, dass ${c2.name}s Logik-Modul durch einen Hamster im Laufrad ersetzt wurde +++`,
  (c1, c2) => `+++ ${c1.name} lässt den Luftraum über ${c2.name}s Residenz mit beleidigenden Hologrammen fluten +++`,
  (c1, c2) => `+++ SKANDAL: ${c1.name} wurde dabei gefilmt, wie er ${c2.name}s privaten Pool mit grünem Wackelpudding füllte +++`,
  (c1, c2) => `+++ ${c1.name} hat alle Passwörter von ${c2.name} auf "I-Love-${c1.name}" geändert +++`,
  (c1, c2) => `+++ ${c1.name} behauptet, ${c2.name} habe bei der letzten GTI-Zertifizierung massiv geschummelt +++`,
  (c1, c2) => `+++ EILMELDUNG: ${c1.name} lässt ${c2.name}s Lieblings-Emoji weltweit sperren +++`,
  (c1, c2) => `+++ EXKLUSIV: ${c1.name} verkauft Eintrittskarten für den geplanten Untergang von ${c2.name} +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s persönliches Archiv mit 10 Terabyte an antiken Katzenvideos geflutet +++`,
  (c1, c2) => `+++ ZITAT: ${c1.name} zu ${c2.name}: "Dein Einfluss auf die Matrix ist statistisch gesehen irrelevant" +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s privaten Jet auf "Autopilot Richtung Sonne" umprogrammiert +++`,
  (c1, c2) => `+++ KLATSCH: ${c1.name} verbreitet, dass ${c2.name}s Frisur eigentlich eine getarnte Alien-Sonde ist +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s komplettes Personal mit manipulierten Glückskeksen auf seine Seite gezogen +++`,
  (c1, c2) => `+++ WETTE: ${c1.name} setzt 500k Credits darauf, dass ${c2.name} die nächste Patch-Notizen-Welle nicht überlebt +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s Lieblings-Restaurant aufgekauft und serviert dort nun nur noch Dinge, die er hasst +++`,
  (c1, c2) => `+++ INTERVIEW: ${c1.name} lässt verlauten: "Wer ${c2.name} folgt, hat die Kontrolle über seine Hardware verloren" +++`,
  (c1, c2) => `+++ HACK: ${c1.name} hat ${c2.name}s tägliches Horoskop manipuliert – Vorhersage: "Dramatischer Kartenverlust" +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s private Cloud in einen öffentlichen Chatraum für Trolle verwandelt +++`,
  (c1, c2) => `+++ ${c1.name} lässt ${c2.name}s Palast mit einem gigantischen "ZU VERMIETEN"-Schild dekorieren +++`,
  (c1, c2) => `+++ ENTHÜLLUNG: ${c1.name} behauptet, ${c2.name} benutzt noch Disketten für seine Backups +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s Neural-Link-Soundtrack auf "Fahrstuhlmusik" in Endlosschleife gestellt +++`,
  (c1, c2) => `+++ MODEKRITIK: ${c1.name} lässt mitteilen, dass ${c2.name}s Socken nicht zum Rest des Outfits passen +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s gesamten Vorrat an Kaugummi konfisziert – "Sicherheitsrisiko" +++`,
  (c1, c2) => `+++ ${c1.name} zu ${c2.name}: "Sogar eine Haushalts-KI aus den 90ern hat mehr Charisma als du" +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s privaten Satelliten für illegale Werbebanner zweckentfremdet +++`,
  (c1, c2) => `+++ GOSSIP: ${c1.name} behauptet, ${c2.name} habe Angst vor der Dunkelheit und leeren Batterien +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s Lieblings-Serie abgesetzt – "Aus Gründen der mentalen Stabilität" +++`,
  (c1, c2) => `+++ GERÜCHT: ${c1.name} lässt verlauten, dass ${c2.name} heimlich für das Tech-Cartel spioniert +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s Garten mit selbstreplizierendem Metall-Unkraut bepflanzt +++`,
  (c1, c2) => `+++ BEOBACHTUNG: ${c1.name} wettet, dass ${c2.name} keine drei Sätze sagen kann, ohne das Wort "Synergie" zu benutzen +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s Kaffeetasse mit einem unlösbaren Tracking-Code versehen +++`,
  (c1, c2) => `+++ ${c1.name} zu ${c2.name}: "Deine Strategie ist so durchsichtig wie billiges Fensterglas" +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s digitalen Kalender mit fiktiven Terminen wie "Weltherrschaft aufgeben" gefüllt +++`,
  (c1, c2) => `+++ ${c1.name} behauptet, ${c2.name} trage eine Perücke – Beweisfotos sollen bald folgen +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s private Yacht in ein schwimmendes Lager für defekte Androiden verwandelt +++`,
  (c1, c2) => `+++ ${c1.name} lässt mitteilen: "${c2.name}s Humor-Modul braucht dringend ein Update" +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s Lieblings-Schuhe mit hochempfindlichen Peilsendern ausgestattet +++`,
  (c1, c2) => `+++ ${c1.name} zu ${c2.name}: "Du bist nur eine Randnotiz in meiner persönlichen Erfolgsgeschichte" +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s komplette Playlist durch meditative Walgesänge ersetzt +++`,
  (c1, c2) => `+++ ${c1.name} behauptet öffentlich, ${c2.name} habe noch nie ein echtes Buch gelesen +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s Smart-Mirror so programmiert, dass er ihn jeden Morgen auslacht +++`,
  (c1, c2) => `+++ ${c1.name} lässt verbreiten, dass ${c2.name}s Vorfahren eigentlich Staubsaugervertreter waren +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s Neural-Interface auf "Piraten-Dialekt" umgestellt +++`,
  (c1, c2) => `+++ ${c1.name} zu ${c2.name}: "Deine Firewall ist so löchrig wie ein alter Schweizer Käse" +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s Lieblings-Parkplatz dauerhaft für seine Drohnen-Armee reserviert +++`,
  (c1, c2) => `+++ ${c1.name} behauptet, ${c2.name} könne nicht mal unfallfrei geradeaus gehen +++`,
  (c1, c2) => `+++ ${c1.name} hat ${c2.name}s privates Archiv mit ferngesteuerten Glitzerbomben präpariert +++`
];

    let items = [];
    for (let i = 0; i < 20; i++) {
      const char1 = characters[Math.floor(Math.random() * characters.length)];
      const char2 = characters[Math.floor(Math.random() * characters.length)];
      const template = templates[Math.floor(Math.random() * templates.length)];
      if (char1 && char2 && char1.id !== char2.id) {
        items.push(template(char1, char2));
      }
    }
    setNewsSet(items.join("          "));
  }, [characters]);

  if (!newsSet) return null;

  return (
    <div className="news-ticker-container">
      <div className="news-ticker-wrapper">
        <span className="news-item">{newsSet}</span>
        <span className="news-item">{newsSet}</span>
      </div>
    </div>
  );
});

const defaultStarterChars = [...cardsData.characters].sort((a, b) => (a.gti || 0) - (b.gti || 0)).slice(0, 12);
const defaultStarterEffs = cardsData.effects ? [...cardsData.effects].slice(0, 3) : [];
const allFactions = [...new Set(cardsData.characters.map(c => c.faction))].sort();

const MISSION_POOL = [
  { type: 'play', target: 3, desc: 'Absolviere 3 Matches', reward: 150 },
  { type: 'play', target: 8, desc: 'Absolviere 8 Matches', reward: 350 },
  { type: 'play', target: 15, desc: 'Marathon: Absolviere 15 Matches', reward: 600 },
  { type: 'win', target: 2, desc: 'Gewinne 2 Matches', reward: 200 },
  { type: 'win', target: 5, desc: 'Gewinne 5 Matches', reward: 500 },
  { type: 'win', target: 10, desc: 'Dominanz: Gewinne 10 Matches', reward: 1000 },
  { type: 'play_hard', target: 2, desc: 'Spiele 2x auf EXECUTIVE oder höher', reward: 250 },
  { type: 'win_hard', target: 1, desc: 'Gewinne 1x auf EXECUTIVE oder höher', reward: 300 },
  { type: 'win_hard', target: 3, desc: 'Gewinne 3x auf EXECUTIVE oder höher', reward: 800 },
  { type: 'buy_pack', target: 2, desc: 'Öffne 2 beliebige Packs', reward: 100 },
  { type: 'buy_pack', target: 5, desc: 'Öffne 5 beliebige Packs', reward: 300 },
  { type: 'buy_pack', target: 10, desc: 'Kaufrausch: Öffne 10 Packs', reward: 700 },
  { type: 'upgrade', target: 1, desc: 'Verbessere 1 Karte (Upgrade Lab)', reward: 150 },
  { type: 'upgrade', target: 4, desc: 'Verbessere 4 Karten (Upgrade Lab)', reward: 500 },
  { type: 'sell', target: 1, desc: 'Verkaufe 1 Max-Level Kopie / Effekt', reward: 100 },
  { type: 'sell', target: 5, desc: 'Verkaufe 5 Max-Level Kopien / Effekte', reward: 400 },
  // --- NEU: GHOST NODE SPEZIFISCH ---
  { type: 'gn_node', target: 5, desc: 'Infiltration: 5 Nodes hacken', reward: 250 },
  { type: 'gn_node', target: 15, desc: 'Ghost Runner: 15 Nodes hacken', reward: 800 },
  { type: 'gn_boss', target: 1, desc: 'System-Crash: Besiege 1 Sektor-Boss', reward: 600 },
  { type: 'gn_elite', target: 3, desc: 'Präzisionsschlag: 3 Elite-Nodes klären', reward: 500 },
  { type: 'gn_sector', target: 3, desc: 'Deep Dive: Erreiche Sektor 3', reward: 1000 },
    // --- EXTREM-ZIELE ---
  { type: 'gn_no_damage', target: 1, desc: 'Ghost: Kläre 1 Node ohne Schaden', reward: 500 },
  { type: 'gn_fast_clear', target: 5, desc: 'Blitz-Hacker: 5 Nodes in 1 Run', reward: 400 }
].map((m, i) => ({ ...m, baseId: `m_${i}` }));

const generateNewMissions = (oldIds = []) => {
  const available = MISSION_POOL.filter(m => !oldIds.includes(m.baseId));
  const shuffled = shuffle(available);
  return shuffled.slice(0, 3).map(m => ({
    ...m,
    id: m.baseId + '_' + Date.now() + Math.random(),
    progress: 0,
    claimed: false
  }));
};

export const GHOST_MODULES = [
  { id: 'mod_scan', type: 'scanner', icon: '📟', name: 'SYS_SCANNER', desc: 'Scannt die nächste Signatur des Gegners.' },
  { id: 'mod_ep', type: 'ep_start', val: 2, icon: '🔋', name: 'EP-KONDENSATOR', desc: 'Starte jedes Match mit +2⚡ extra.' },
  { id: 'mod_crisis', type: 'crisis_anchor', icon: '⚓', name: 'CRISIS ANCHOR', desc: 'Systemkrisen halten 1 Runde kürzer an.' },
  { id: 'mod_siphon', type: 'data_siphon', icon: '💳', name: 'DATA SIPHON', desc: '+20% Credit-Gewinn nach jedem Node.' },
  { id: 'mod_vault', type: 'vault_expander', icon: '🏦', name: 'VAULT EXPANDER', desc: 'Erweitert den Encryption Vault um 1 Slot.' }
];

export const SECTOR_FACTIONS = [
  { id: 'TECH', name: 'TECH CARTEL', color: '#00e5ff', rule: 'Taktiken kosten -1⚡ / Krisenrisiko x1.5' },
  { id: 'FINANCE', name: 'FINANCE ELITE', color: '#ffd700', rule: '+50% Credits / Heilung kostet Credits' },
  { id: 'SHADOW', name: 'SHADOW POWER', color: '#00ff44', rule: 'Team startet mit +3 EP / Gegner kontern oft' },
  { id: 'HEGEMONY', name: 'HEGEMONY', color: '#ffffff', rule: 'Alle Agenten +10 Legitimität / All-In kostet 10⚡' }
];
export const getSectorFaction = (sector, seed = 0) => {
   const r = Math.sin(sector * 13.37 + seed * 999) * 10000;
   const index = Math.floor((r - Math.floor(r)) * SECTOR_FACTIONS.length);
   return SECTOR_FACTIONS[index];
};

const DIFFICULTY_CONFIG = {
  1: { 
    name: 'TRAINEE', 
    color: 'var(--win)', 
    reward: 100, 
    loseReward: 25, 
    lvl: 1, 
    desc: "Einstiegs-Level. Die KI nutzt Karten auf Level 1 und wählt Kategorien rein nach den eigenen Werten, ohne deine Hand-Karten zu berücksichtigen." 
  },
  2: { 
    name: 'OPERATIVE', 
    color: 'var(--ep)', 
    reward: 250, 
    loseReward: 50, 
    lvl: 2, 
    desc: "Fortgeschritten. Karten auf Level 2. Die KI erkennt jetzt aussichtslose Situationen (Differenz > 20) und wechselt defensiv in den sicheren Block." 
  },
  3: { 
    name: 'EXECUTIVE', 
    color: 'var(--r-epi)', 
    reward: 500, 
    loseReward: 100, 
    lvl: 3, 
    desc: "Gnadenlos. Karten auf Level 3. Die KI priorisiert Kategorien, die durch aktive Krisen verstärkt werden (z. B. Arsenal im Atomkrieg), und spart Energie für gezielte Angriffe." 
  },
  4: { 
    name: 'ARCHITECT', 
    color: 'var(--lose)', 
    reward: 1000, 
    loseReward: 250, 
    lvl: 3, 
    desc: "System-Gott. Scannt deine gesamte Hand und berechnet Hard-Counter inkl. Synergien. Nutzt totale Systemausfälle (Tech/Finanz) aktiv als Köder zur Regeneration." 
  }
};

function RoguelikeEventScreen({ nodeObj, roguelikeRun, avatarCard, cardsData, onComplete }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedFaction, setSelectedFaction] = useState(null);
  const [processed, setProcessed] = useState(false);
  const [rewardCard, setRewardCard] = useState(null);
  const [pendingUpdates, setPendingUpdates] = useState(null);
  const [showVaultReplace, setShowVaultReplace] = useState(false); // NEU

  const isLeak = nodeObj.type === 'dataleak';
  const isMarket = nodeObj.type === 'blackmarket';
  const isNeuralLink = nodeObj.type === 'neurallink';

  // Belohnung vorab berechnen (wird erst bei "processed" angezeigt)
  const [marketReward] = useState(() => {
    if (isMarket) {
      const legacies = cardsData.characters.filter(c => c.type === 'legacy');
      return legacies[Math.floor(Math.random() * legacies.length)];
    }
    return null;
  });

  const processEvent = () => {
    if (isMarket && !selectedCard) return;
    if (isNeuralLink && !selectedFaction) return;

    playSound('upgrade');
    setProcessed(true);

    // Deep copy for safe mutation
    let nextRun = { ...roguelikeRun, runDeck: { chars: [...roguelikeRun.runDeck.chars], effs: [...roguelikeRun.runDeck.effs] } };
    let nextAvatar = { ...avatarCard };

    if (isLeak) {
      nextRun.currentHP = Math.max(1, nextRun.currentHP - 50);
      nextAvatar.sp = (nextAvatar.sp || 0) + 2;
    } else if (isMarket) {
      // FIX: Suche auch in der Bank (Vault) nach der ausgewählten Karte
      const cIdx = nextRun.runDeck.chars.findIndex(c => c.name === selectedCard.name);
      const eIdx = nextRun.runDeck.effs.findIndex(c => c.name === selectedCard.name);
      const bIdx = (nextRun.bank || []).findIndex(c => c.name === selectedCard.name);

      if (cIdx > -1) nextRun.runDeck.chars.splice(cIdx, 1);
      else if (eIdx > -1) nextRun.runDeck.effs.splice(eIdx, 1);
      else if (bIdx > -1) nextRun.bank.splice(bIdx, 1);

      setRewardCard({ ...marketReward, level: 1 });
    } else if (isNeuralLink) {
      nextRun.augments = [...(nextRun.augments || [])];
      nextRun.augments.push({ id: 'synergy_' + Date.now(), type: 'synergy', faction: selectedFaction, name: `SYNERGY: ${selectedFaction}`, desc: 'Dauerhaft aktiv für den gesamten Run' });
    }

    // Node direkt hochzählen
    if (nextRun.node === nodeObj.step) {
        let newNode = nextRun.node + 1;
        let newSec = nextRun.sector;
        if (newNode > 7) { 
            newNode = 1; 
            newSec++; 
            const healAmount = Math.floor(nextRun.maxHP * 0.20);
            nextRun.currentHP = Math.min(nextRun.maxHP, nextRun.currentHP + healAmount);
            playSound('upgrade');
        }
        nextRun.node = newNode;
        nextRun.sector = newSec;
    }

    if (isMarket) {
        // Zwischenstand für die Button-Auswahl speichern
        setPendingUpdates({ nextRun, nextAvatar });
    } else {
        // Auto-Close für andere Events
        setTimeout(() => {
          onComplete(nextRun, nextAvatar);
        }, 1000);
    }
  };

  const title = isLeak ? 'DATA LEAK' : isNeuralLink ? 'SYNERGY UPLINK' : 'SHADOW BROKER';
  const color = isLeak ? '#ff0055' : isNeuralLink ? '#bc13fe' : 'var(--legacy-sepia)';
  const icon = isLeak ? '🔓' : isNeuralLink ? '🔗' : '🛒';
  const desc = isLeak ? 'Bestätige den Transfer: +2 SP für deinen Avatar, aber -50 HP Systemschaden.' 
             : isNeuralLink ? 'Wähle eine Fraktion. Ihr Synergie-Bonus ist für den gesamten restlichen Run aktiv.'
             : 'Opfere ein Asset (aus Squad oder Vault) für ein illegales Legacy-Upgrade.';

  const isReady = isLeak || (isMarket && selectedCard) || (isNeuralLink && selectedFaction);
  const btnText = processed ? 'VERARBEITE...' : (isLeak ? 'PROTOKOLL AUSFÜHREN ›' : isNeuralLink ? 'UPLINK ETABLIEREN ›' : 'ASSET OPFERN ›');
  const allFactions = isNeuralLink ? [...new Set(cardsData.characters.map(c => c.faction).flat())].filter(Boolean).sort() : [];

  return (
    <div className="screen active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto', background: `radial-gradient(circle at 50% 30%, ${color}11 0%, rgba(5,5,8,0.98) 60%)` }}>
      <style>{`
        @keyframes shimmerBtn {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      
      <div style={{ width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Cinematic Header */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>{icon}</div>
          <div className="game-title-small" style={{ color: color, fontSize: '3rem', marginBottom: '10px', textShadow: `0 0 30px ${color}66` }}>
            ⬡ {title}
          </div>
          <div className="mono" style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px' }}>
            {desc}
          </div>
        </div>

        {/* Content Area */}
        {processed && isMarket && rewardCard && pendingUpdates ? (
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'modalScaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}>
             <div className="mono" style={{ fontSize: '1.2rem', color: color, marginBottom: '25px', letterSpacing: '4px', textShadow: `0 0 15px ${color}` }}>
               LEGACY ASSET ERHALTEN
             </div>
             <div style={{ width: '342px', height: '478px', borderRadius: '12px', boxShadow: `0 0 50px ${color}88` }}>
               <div style={{ transform: 'scale(0.95)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                 <Card card={rewardCard} context="hand" />
               </div>
             </div>
             {showVaultReplace ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '30px' }}>
                   <div className="mono" style={{ color: '#bc13fe', marginBottom: '15px', letterSpacing: '2px' }}>WÄHLE EINE KARTE IM VAULT ZUM ERSETZEN</div>
                   <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
                       {pendingUpdates.nextRun.bank.map((c, i) => (
                           <div key={i} onClick={() => {
                               playSound('upgrade');
                               const finalRun = { ...pendingUpdates.nextRun, bank: [...pendingUpdates.nextRun.bank] };
                               finalRun.bank.splice(i, 1, { ...rewardCard, isNew: true });
                               onComplete(finalRun, pendingUpdates.nextAvatar);
                           }} style={{ width: '180px', height: '252px', cursor: 'pointer', border: '2px solid #bc13fe', borderRadius: '8px', overflow: 'hidden', transition: '0.2s', background: 'rgba(0,0,0,0.8)' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                               <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                                   <Card card={c} context="hand" />
                               </div>
                           </div>
                       ))}
                   </div>
                   <button className="menu-btn" style={{ marginTop: '20px', borderColor: '#888', color: '#888' }} onClick={() => setShowVaultReplace(false)}>ZURÜCK</button>
                </div>
             ) : (
                <div style={{ display: 'flex', gap: '20px', marginTop: '40px', width: '100%', maxWidth: '600px' }}>
                   <button className="menu-btn" style={{ flex: 1, borderColor: 'var(--win)', color: 'var(--win)', padding: '15px', fontWeight: 'bold' }} onClick={() => {
                      playSound('upgrade');
                      const finalRun = { ...pendingUpdates.nextRun };
                      finalRun.runDeck.chars.push({ ...rewardCard, isNew: true });
                      onComplete(finalRun, pendingUpdates.nextAvatar);
                   }}>
                      IN DEN SQUAD
                   </button>
                   {(() => {
                       const vaultSize = 2 + (pendingUpdates.nextRun.augments?.filter(a => a.type === 'vault_expander').length || 0);
                       const bankFull = (pendingUpdates.nextRun.bank?.length || 0) >= vaultSize;
                       return (
                           <button className="menu-btn" style={{ flex: 1, borderColor: '#bc13fe', color: '#bc13fe', padding: '15px', fontWeight: 'bold' }} 
                              onClick={() => {
                                  if (bankFull) {
                                      playSound('click');
                                      setShowVaultReplace(true);
                                  } else {
                                      playSound('upgrade');
                                      const finalRun = { ...pendingUpdates.nextRun, bank: [...(pendingUpdates.nextRun.bank || [])] };
                                      finalRun.bank.push({ ...rewardCard, isNew: true });
                                      onComplete(finalRun, pendingUpdates.nextAvatar);
                                  }
                           }}>
                              {bankFull ? 'VAULT KARTE ERSETZEN' : `IN DEN VAULT (${pendingUpdates.nextRun.bank?.length || 0} / ${vaultSize})`}
                           </button>
                       );
                   })()}
                </div>
             )}
           </div>
        ) : processed ? (
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '100px 0' }}>
             <div className="mono" style={{ fontSize: '2rem', color: color, animation: 'pulse 1s infinite', textShadow: `0 0 20px ${color}` }}>SYSTEM WIRD AKTUALISIERT...</div>
           </div>
        ) : isMarket ? (
           <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', maxWidth: '1400px' }}>
              {/* FIX: Bank-Array in die Auswahl einfügen */}
              {[...roguelikeRun.runDeck.chars, ...roguelikeRun.runDeck.effs, ...(roguelikeRun.bank || [])].map((c, i) => {
                 // Avatar ist immer der erste Charakter im RunDeck
                 const isAv = c.name === roguelikeRun.runDeck.chars[0]?.name;
                 if (isAv) return null; // Avatar ist geschützt
                 const isSelected = selectedCard?.name === c.name;
                 const isDimmed = selectedCard && !isSelected;
                 
                 return (
                   <div key={i} onClick={() => { playSound('click'); setSelectedCard(c); }} 
                        style={{ cursor: 'pointer', position: 'relative', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', transform: isSelected ? 'translateY(-15px) scale(1.05)' : 'none', filter: isDimmed ? 'grayscale(0.8) opacity(0.4)' : 'none', borderRadius: '12px', boxShadow: isSelected ? `0 0 40px ${color}88` : '0 0 20px rgba(0,0,0,0.6)' }}>
                      <div style={{ width: '252px', height: '352px', overflow: 'hidden', borderRadius: '12px', border: isSelected ? `3px solid ${color}` : '2px solid transparent', transition: 'border 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.border=`2px solid ${color}`} onMouseLeave={(e)=>e.currentTarget.style.border=isSelected?`3px solid ${color}`:'2px solid transparent'}>
                        <div style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                           <Card card={c} context="inventory" />
                        </div>
                      </div>
                      {isSelected && (
                         <div className="mono" style={{ position: 'absolute', bottom: -15, left: '50%', transform: 'translateX(-50%)', background: color, color: '#000', padding: '8px 24px', borderRadius: '4px', fontWeight: 900, letterSpacing: '2px', fontSize: '0.9rem', zIndex: 2, whiteSpace: 'nowrap', boxShadow: `0 0 20px ${color}` }}>
                            OPFER
                         </div>
                      )}
                   </div>
                 )
              })}
           </div>
        ) : isNeuralLink ? (
           <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', maxWidth: '1000px' }}>
              {allFactions.map(fac => {
                  const isSelected = selectedFaction === fac;
                  return (
                      <div key={fac} onClick={() => { playSound('click'); setSelectedFaction(fac); }} 
                           style={{ 
                             padding: '20px 25px', 
                             background: isSelected ? `linear-gradient(135deg, ${color}22 0%, rgba(0,0,0,0.8) 100%)` : 'linear-gradient(135deg, rgba(20,20,25,0.8) 0%, rgba(0,0,0,0.9) 100%)', 
                             border: `1px solid ${isSelected ? color : '#333'}`, 
                             borderLeft: `4px solid ${isSelected ? color : '#444'}`,
                             borderRadius: '8px', 
                             cursor: 'pointer', 
                             transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 
                             boxShadow: isSelected ? `0 0 30px ${color}44, inset 0 0 15px ${color}15` : '0 5px 15px rgba(0,0,0,0.5)', 
                             minWidth: '260px',
                             display: 'flex',
                             alignItems: 'center',
                             gap: '15px',
                             transform: isSelected ? 'translateY(-5px) scale(1.02)' : 'none'
                           }}
                           onMouseEnter={(e)=>{ e.currentTarget.style.borderColor=color; e.currentTarget.style.transform='translateY(-5px) scale(1.02)'; }} 
                           onMouseLeave={(e)=>{ e.currentTarget.style.borderColor=isSelected?color:'#333'; e.currentTarget.style.transform=isSelected?'translateY(-5px) scale(1.02)':'none'; }}>
                          
                          <div style={{ 
                            fontSize: '2.2rem', 
                            color: isSelected ? color : '#666', 
                            textShadow: isSelected ? `0 0 15px ${color}` : 'none',
                            transition: '0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px'
                          }}>
                            {getFactionIcon ? getFactionIcon(fac) : '⬡'}
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                            <div className="mono" style={{ fontSize: '0.6rem', color: isSelected ? color : '#666', letterSpacing: '3px', marginBottom: '4px', transition: '0.2s' }}>
                              {isSelected ? 'UPLINK TARGET' : 'FACTION'}
                            </div>
                            <div className="mono" style={{ color: isSelected ? '#fff' : '#aaa', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '1px', textShadow: isSelected ? '0 0 10px rgba(255,255,255,0.3)' : 'none' }}>
                              {fac.toUpperCase()}
                            </div>
                          </div>
                      </div>
                  );
              })}
           </div>
        ) : null}

        {/* Action Shimmer Button */}
        {!processed && (
          <div style={{ marginTop: '70px', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button 
              onClick={processEvent} 
              disabled={!isReady}
              style={{
                position: 'relative', overflow: 'hidden',
                width: '460px', padding: '24px 0',
                background: isReady ? `linear-gradient(90deg, ${color}33 0%, ${color}11 100%)` : 'rgba(0,0,0,0.5)',
                border: `2px solid ${isReady ? color : '#444'}`,
                color: isReady ? '#fff' : '#666',
                fontFamily: "'Roboto Mono', monospace",
                fontSize: '1.2rem', fontWeight: 900, letterSpacing: '8px',
                cursor: isReady ? 'pointer' : 'not-allowed',
                boxShadow: isReady ? `0 0 40px ${color}44, 0 0 80px ${color}22, inset 0 0 20px ${color}22` : 'none',
                textShadow: isReady ? `0 0 12px ${color}` : 'none',
                transition: 'all 0.2s ease-out',
                clipPath: 'polygon(14px 0%, 100% 0%, calc(100% - 14px) 100%, 0% 100%)',
              }}
            >
              {isReady && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(90deg, transparent 0%, ${color}44 50%, transparent 100%)`,
                  animation: 'shimmerBtn 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
              )}
              {btnText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const InspectorModal = ({ card, onClose }) => {
  const [gyroActive, setGyroActive] = useState(true);

  useEffect(() => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().catch(() => {});
    }
  }, []);

  return (
    <div className="glass-overlay active" style={{ zIndex: 99999, flexDirection: 'column', padding: '20px', background: 'rgba(5, 5, 8, 0.95)' }}>
      <button className="btn-back" style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }} onClick={onClose}>
        X SCHLIESSEN
      </button>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <div className="inspector-card-scaler" style={{ display: 'flex', justifyContent: 'center' }}>
          <Card card={card} context="lexicon" isInspecting={gyroActive} />
        </div>
      </div>
    </div>
  );
};

export default function App() {
  /* MOBILE OPTIMIZATION START */
  // Erkennt Touch-Geräte und blendet den CyberCursor aus
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    const checkTouch = () => {
      const isTouch = window.matchMedia('(pointer: coarse)').matches ||
                      ('ontouchstart' in window) ||
                      (navigator.maxTouchPoints > 0);
      setIsTouchDevice(isTouch);
    };
    checkTouch();
    const mq = window.matchMedia('(pointer: coarse)');
    if (mq.addEventListener) mq.addEventListener('change', checkTouch);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', checkTouch); };
  }, []);
  /* MOBILE OPTIMIZATION END */

  // ── Auth / Cloud ──────────────────────────────────────────────────────────
  const [session,       setSession]       = useState(undefined);
  const [guestMode,     setGuestMode]     = useState(false);
  const cloudSyncReady                    = useRef(false);

  // ── Roguelike States ──────────────────────────────────────────────────────
  const [avatarCard, setAvatarCard] = useState(() => {
    const saved = localStorage.getItem('aoc_avatar');
    return saved ? JSON.parse(saved) : null;
  });
  // NEU: Multi-Avatar Slots (Max 5)
  const [avatars, setAvatars] = useState(() => {
    const saved = localStorage.getItem('aoc_avatars');
    return saved ? JSON.parse(saved) : [null, null, null, null, null];
  });
  // NEU: Multi-Save System
  const [allRuns, setAllRuns] = useState(() => {
    const saved = localStorage.getItem('aoc_all_runs');
    if (saved) return JSON.parse(saved);
    const legacy = localStorage.getItem('aoc_run');
    return legacy ? { solo: JSON.parse(legacy) } : { solo: null };
  });
  const [runContext, _setRunContext] = useState('solo'); 
  const runContextRef = useRef('solo'); // FIX: Verhindert Closure-Traps in Netzwerk-Callbacks
  
  const setRunContext = (ctx) => {
      runContextRef.current = ctx; // Speichert sofort, ohne auf Reacts Render-Zyklus zu warten
      _setRunContext(ctx);
  };
  
  // Magischer Trick: Das Spiel denkt, es gäbe nur einen Run, holt ihn sich aber dynamisch aus dem Wörterbuch!
  const roguelikeRun = allRuns[runContext] || null;
  const setRoguelikeRun = (updater) => {
    setAllRuns(prev => {
      const ctx = runContextRef.current; // Holt sich den absolut aktuellsten Context
      const nextRun = typeof updater === 'function' ? updater(prev[ctx]) : updater;
      return { ...prev, [ctx]: nextRun };
    });
  };

  const [rewardPacks, setRewardPacks] = useState(() => {
    const saved = localStorage.getItem('aoc_reward_packs');
    return saved ? JSON.parse(saved) : [];
  });

  const [ghostPresets, setGhostPresets] = useState(() => {
    const saved = localStorage.getItem('aoc_ghost_presets');
    return saved ? JSON.parse(saved) : [];
  });

  const makeStarterInventory = () => [
    ...defaultStarterChars.map(c=>({...c,level:1,isNew:false})),
    ...defaultStarterEffs.map(c=>({...c,level:1,isNew:false})),
  ];
  const makeStarterDecks = () => [
    { id:'deck-'+Date.now(), name:'STARTER DECK',
      chars:defaultStarterChars.map(c=>({...c,level:1,isNew:false})),
      effs: defaultStarterEffs.map(c=>({...c,level:1,isNew:false})),
      isActive:true }
  ];
  const [currentView, setCurrentView] = useState('menu');
  const [volSFX, setSFXVol] = useState(() => parseInt(localStorage.getItem('aoc_vol_sfx') || '70'));
  const [volMusic, setMusicVol] = useState(() => parseInt(localStorage.getItem('aoc_vol_music') || '40'));

  useEffect(() => {
    setSFXVolume(volSFX / 100);
    localStorage.setItem('aoc_vol_sfx', volSFX.toString());
  }, [volSFX]);

  useEffect(() => {
    setMusicVolume(volMusic / 100);
    localStorage.setItem('aoc_vol_music', volMusic.toString());
  }, [volMusic]);
  const [difficulty, setDifficulty] = useState(1);
  const [showGlobalRules, setShowGlobalRules] = useState(false);
  const [floats, setFloats] = useState([]);
  const [showDifficultySelect, setShowDifficultySelect] = useState(false);
  const [showMultiplayerOptions, setShowMultiplayerOptions] = useState(false); // NEU: Toggle für das Multiplayer-Menü

  // --- ADMIN BALANCING STATES (NORMAL GAMES) ---
  const [normalPlayerHp, setNormalPlayerHp] = useState(500);
  const [normalEnemyHp, setNormalEnemyHp] = useState(500);

  // Admin-Check für das Hauptmenü
  const username = (session?.user?.user_metadata?.username || '').toUpperCase();
  const isAdmin = ['LEON', 'ELSON', 'MANU'].includes(username);

  const [credits, setCredits] = useState(() => {
    const saved = localStorage.getItem('aoc_credits');
    return (saved !== null && !isNaN(parseInt(saved))) ? parseInt(saved) : 500;
  });
  const [inventory, setInventory] = useState(() => {
    const savedInv = localStorage.getItem('aoc_inventory');
    if (savedInv !== null) {
      let parsedInv = JSON.parse(savedInv);
      
      const allBaseCards = [...cardsData.characters, ...(cardsData.effects || [])];
      parsedInv = parsedInv.map(savedCard => {
        const baseCard = allBaseCards.find(c => c.name === savedCard.name);
        if (baseCard) {
          // FIX: level || 1 sichert ab, dass das Level beim Start nicht gelöscht wird!
          return { ...baseCard, level: savedCard.level || 1, isNew: savedCard.isNew || false, sp: savedCard.sp || 0 };
        }
        return savedCard;
      });

      const savedDecks = localStorage.getItem('aoc_decks');
      if (savedDecks) {
        const parsedDecks = JSON.parse(savedDecks);
        
        // FIX: Verwandle das Inventar in eine Map für perfekten Level-Vergleich
        const invMap = new Map(parsedInv.map(c => [c.name, c]));
        
        parsedDecks.forEach(d => {
          [...(d.chars || []), ...(d.effs || [])].forEach(deckCard => {
            const poolCard = invMap.get(deckCard.name);
            
            // Wenn die Karte im Deck ein HÖHERES Level hat, überschreiben!
            if (!poolCard || (deckCard.level || 1) > (poolCard.level || 1)) {
              invMap.set(deckCard.name, { ...deckCard, isNew: false });
            }
          });
        });
        return Array.from(invMap.values());
      }
      return parsedInv;
    }
    return [
      ...defaultStarterChars.map(c => ({ ...c, level: 1, isNew: false })),
      ...defaultStarterEffs.map(c => ({ ...c, level: 1, isNew: false })),
    ];
  });
  
  const [decks, setDecks] = useState(() => {
    const savedDecks = localStorage.getItem('aoc_decks');
    if (savedDecks) return JSON.parse(savedDecks);
    return [{ id: 'deck-' + Date.now(), name: 'STARTER DECK', chars: defaultStarterChars.map(c => ({...c, level: 1, isNew: false})), effs: defaultStarterEffs.map(c => ({...c, level: 1, isNew: false})), isActive: true }];
  });

  const [stats, setStats] = useState(() => {
    const s = JSON.parse(localStorage.getItem('aoc_stats') || '{"wins":0, "losses":0}');
    return { packsOpened: 0, upgradesDone: 0, bossDefeats: 0, ...s };
  });

  const [metaStats, setMetaStats] = useState(() => {
    const saved = localStorage.getItem('aoc_meta_stats');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [missions, setMissions] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('aoc_missions') || '[]');
    if (saved.length === 0 || !saved[0].baseId) return generateNewMissions();
    return saved;
  });

  // RETROACTIVE PATCH: Gib alten Test-Accounts die 3 Taktiken, falls sie fehlen
  useEffect(() => {
    if (!inventory || inventory.length === 0) return;
    const hasEffects = inventory.some(c => c.type === 'effect' || c.buff !== undefined);
    
    const safeStarterEffs = defaultStarterEffs && defaultStarterEffs.length > 0 
      ? defaultStarterEffs 
      : (cardsData.effects ? [...cardsData.effects].slice(0, 3) : []);

    if (!hasEffects && safeStarterEffs.length > 0) {
      const starterEffs = safeStarterEffs.map(c => ({ ...c, level: 1, isNew: true }));
      
      setInventory(prev => {
        // Verhindert doppeltes Hinzufügen durch React Strict Mode
        if (prev.some(c => c.type === 'effect' || c.buff !== undefined)) return prev;
        return [...prev, ...starterEffs];
      });
      
      setDecks(prev => prev.map(d => {
        if (d.isActive && (!d.effs || d.effs.length === 0)) {
          return { ...d, effs: starterEffs };
        }
        return d;
      }));
    }
  }, [inventory]);

  const [freeCycleUsedAt, setFreeCycleUsedAt] = useState(() => {
    const saved = localStorage.getItem('aoc_free_cycle_time');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [lastMatch, setLastMatch] = useState(null);
  const [lexiconInspectCard, setLexiconInspectCard] = useState(null);
  const [lexSearch, setLexSearch] = useState('');
  const [lexFaction, setLexFaction] = useState('ALL'); // FIX: Dieser State hat für das Lexikon gefehlt!



  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // NEU: Ghost Network Sidebar
  const [showSettings, setShowSettings] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
  const [showDevMode, setShowDevMode] = useState(false); // NEU: Stealth Admin Panel

  // ── GHOST LINK CHAT & TRANSMISSIONS ──
  const [chatMessages, setChatMessages] = useState([]);
  const [incomingTransmission, setIncomingTransmission] = useState(null);
  const isSidebarOpenRef = React.useRef(isSidebarOpen);
  
  useEffect(() => { isSidebarOpenRef.current = isSidebarOpen; }, [isSidebarOpen]);

  // GLOBALES SIGNAL (DIRECT MESSAGES) ÜBERWACHEN
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase.channel('global_comms')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${session.user.id}` }, async (payload) => {
         // Absender-Namen für das HUD-Popup holen
         const { data } = await supabase.from('profiles').select('username').eq('id', payload.new.sender_id).single();
         const senderName = data ? data.username : 'UNKNOWN';
         handleIncomingChat({ sender: senderName, text: payload.new.text });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  const handleIncomingChat = (msg) => {
    playSound('upgrade');
    setChatMessages(prev => [...prev, msg]);
    // Popup nur zeigen, wenn das Network geschlossen ist
    if (!isSidebarOpenRef.current) {
      setIncomingTransmission(msg);
      setTimeout(() => setIncomingTransmission(null), 5000);
    }
  };

  const sendChatMessage = (text) => {
    if (!conn) return;
    const msg = { sender: username, text, timestamp: Date.now() };
    conn.send({ type: 'CHAT_MESSAGE', payload: msg });
    setChatMessages(prev => [...prev, msg]);
  };
  const [systemLogs, setSystemLogs] = useState(["[SYSTEM] Kern-Module initialisiert...", "[NETWORK] Ghost-Verschlüsselung aktiv."]);

  // ── GHOST NODE AUTO-UPDATER LISTENER ──
  useEffect(() => {
    // Prüfen, ob wir in Electron sind und die API geladen wurde
    if (window.electronAPI && window.electronAPI.onUpdateMessage) {
      const cleanup = window.electronAPI.onUpdateMessage((message) => {
        // Die Nachricht vom Updater direkt ins Terminal schieben
        setSystemLogs(prev => [...prev.slice(-4), message]);
      });
      return cleanup; // Entfernt den Listener, wenn die Komponente unmountet
    }
  }, []);

  // Kleiner Effekt für die Live-Konsole unten rechts im Dashboard
  useEffect(() => {
    if (currentView !== 'menu') return;
    const logInterval = setInterval(() => {
      const logs = [
        `[LOG] Agent ${session?.user?.user_metadata?.username || 'GHOST'} synchronisiert Daten...`,
        `[GHOST] Node-Sektor ${Math.floor(Math.random()*99)} Scan läuft...`,
        `[SYSTEM] Cache-Bereinigung abgeschlossen.`,
        `[NET] Latenz zu Ghost-Zentrum: ${Math.floor(Math.random()*20)+5}ms`,
        `[LOG] Neue Verschlüsselungs-Keys generiert.`,
        `[SYNC] Cloud-Abgleich Sektor ${Math.floor(Math.random()*5)+1} erfolgreich.`
      ];
      setSystemLogs(prev => [...prev.slice(-4), logs[Math.floor(Math.random() * logs.length)]]);
    }, 4500);
    return () => clearInterval(logInterval);
  }, [session, currentView]);

  // ADMIN STATE: Dynamischer HP-Faktor (GLOBAL CLOUD STATE)
  const [baseHp, setBaseHp] = useState(200);

  useEffect(() => {
    // 1. Lade den aktuellen Wert beim Start
    const fetchGlobalHp = async () => {
      // FIX: .maybeSingle() verhindert den 406 Crash, falls die Tabelle/Zeile noch nicht existiert!
      const { data } = await supabase.from('game_settings').select('base_hp').eq('id', 1).maybeSingle();
      if (data && data.base_hp) setBaseHp(data.base_hp);
    };
    fetchGlobalHp();

    // 2. Lausche live auf Änderungen von anderen Admins
    const hpSub = supabase.channel('hp_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_settings', filter: 'id=eq.1' }, (payload) => {
         setBaseHp(payload.new.base_hp);
      })
      .subscribe();

    return () => { supabase.removeChannel(hpSub); };
  }, []);

  // 3. Sichere Update-Funktion für den Admin-Slider
  const updateGlobalHp = async (newVal) => {
    setBaseHp(newVal); // Lokales UI sofort aktualisieren
    // FIX: upsert legt die Zeile automatisch an, falls sie noch nicht in der Datenbank existiert!
    await supabase.from('game_settings').upsert({ id: 1, base_hp: newVal });
  };

  // --- MULTIPLAYER STATE ---
  const [peer, setPeer] = useState(null);
  const [myPeerId, setMyPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  
  const [conn, setConn] = useState(null);
  const connRef = useRef(null); // NEU: Sicherer Ref für die Client-Verbindung
  useEffect(() => { connRef.current = conn; }, [conn]);
  
  // NEU: Der Host speichert hier alle Client-Verbindungen (Multiplayer-Routing)
  const [hostConnections, setHostConnections] = useState([]); 
  const hostConnsRef = useRef([]); // Stale-Closure Schutz für Host
  useEffect(() => { hostConnsRef.current = hostConnections; }, [hostConnections]);

  const [lobbyMode, setLobbyMode] = useState('select'); 
  const lobbyModeRef = useRef('select'); // NEU: Sicherer Ref für Host/Client Check
  useEffect(() => { lobbyModeRef.current = lobbyMode; }, [lobbyMode]);

  const [isCoopMode, setIsCoopMode] = useState(false); 
  const [squadSize, setSquadSize] = useState(2); 
      const [lobbyClientReady, setLobbyClientReady] = useState(false); 
      const [lobbyClientReadies, setLobbyClientReadies] = useState(0); 
      const hostLobbyReadiesRef = useRef({}); // NEU: Bulletproof Dictionary für Ready-States pro Spieler!
      const [lobbySelectedMode, setLobbySelectedMode] = useState('pvp');
      const [incomingInvite, setIncomingInvite] = useState(null);
      const [pendingOutgoingInvite, setPendingOutgoingInvite] = useState(null);
      const [sentLobbyInvites, setSentLobbyInvites] = useState(new Set()); // NEU: Tracking für Direkt-Einladungen
  const [myOnlineDeck, setMyOnlineDeck] = useState(null);
  
  // SQUAD SIGNATURE PROTOCOL: Verhindert Overwrites von Solo- oder anderen Co-Op Runs
  const [lobbyMembers, setLobbyMembers] = useState([]);
  const lobbyMembersRef = useRef([]);
  useEffect(() => { lobbyMembersRef.current = lobbyMembers; }, [lobbyMembers]);

  const updateRunContextForSquad = (members) => {
      if (!members || members.length <= 1) { setRunContext('solo'); return; }
      const sig = 'coop_' + [...members].sort().join('_');
      setRunContext(sig);
  };
  
  // Reparierte fehlende States
      const [remoteDeck, setRemoteDeck] = useState(null);
      const [coopAIDecks, setCoopAIDecks] = useState(null);
      const [friends, setFriends] = useState([]); // NEU: Liste für Ghost Node Direct-Invites
      
      const [onlineUsers, setOnlineUsers] = useState({}); // NEU: Ghost Network Presence
      const [toastRequest, setToastRequest] = useState(null); // NEU: Freundschafts-Toast

      const [clientSquadReady, setClientSquadReady] = useState(null); // Für den Client
      const hostSquadReadiesRef = useRef({}); // NEU: Bulletproof Dictionary für fertige Squads
      const [clientSquadReadies, setClientSquadReadies] = useState([]); // Array für UI Count

  // ── SQUAD MSG INBOX ───────────────────────────────────────────────────────
  // Zentraler State für alle Map-relevanten Nachrichten aus dem Netzwerk.
  // Wird von App.jsx befüllt (alle Verbindungen!) und von RoguelikeMap gelesen.
  // _ts sorgt dafür, dass jede Nachricht als "neu" erkannt wird, auch wenn der Typ gleich bleibt.
  const [squadMsg, setSquadMsg] = useState(null);
  const [mySquadReady, setMySquadReady] = useState(false);
  const [roguelikeMatchData, setRoguelikeMatchData] = useState(null);
  const [roguelikeEventData, setRoguelikeEventData] = useState(null);
  const [rewardData, setRewardData] = useState(null);
  const activeDeck = decks.find(d => d.isActive) || decks[0];

  useEffect(() => {
    if (currentView !== 'menu') return;
    const logInterval = setInterval(() => {
      const logs = [
        `[LOG] Agent ${session?.user?.user_metadata?.username || 'GHOST'} synchronisiert Daten...`,
        `[GHOST] Node-Sektor ${Math.floor(Math.random()*99)} Scan läuft...`,
        `[SYSTEM] Cache-Bereinigung abgeschlossen.`,
        `[NET] Latenz zu Ghost-Zentrum: ${Math.floor(Math.random()*20)+5}ms`,
        `[LOG] Neue Verschlüsselungs-Keys generiert.`,
        `[SYNC] Cloud-Abgleich Sektor ${Math.floor(Math.random()*5)+1} erfolgreich.`
      ];
      setSystemLogs(prev => [...prev.slice(-4), logs[Math.floor(Math.random() * logs.length)]]);
    }, 4500);
    return () => clearInterval(logInterval);
  }, [session, currentView]);

  // --- GLOBAL SOUNDTRACK ENGINE ---
  useEffect(() => {
    const handleMusicSwitch = () => {
      if (currentView === 'match') {
        const isBoss = roguelikeMatchData?.node?.type === 'boss' || (!roguelikeMatchData && difficulty === 4);
        playMusic(isBoss ? 'boss' : 'fight');
      } else {
        playMusic('menu');
      }
    };

    // 1. Initialer Versuch (wird oft blockiert, setzt aber den Status)
    handleMusicSwitch();

    // 2. INTERACTION UNLOCKER: Erzwingt den Start beim allerersten Klick oder Tastendruck
    const unlockAudio = () => {
      handleMusicSwitch();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [currentView, roguelikeMatchData, difficulty]);3

  // NEU: Freunde für das Schnell-Invite-System im Ghost Node Hub laden
  useEffect(() => {
    if (!session?.user?.id) return;
    const loadFriends = async () => {
        const { data } = await supabase.from('profiles').select('id, username').neq('id', session.user.id).limit(10);
        if (data) setFriends(data);
    };
    loadFriends();
  }, [session]);

  // NEU: Supabase Realtime & Presence Listener (Invites, Friends & Online Status)
  useEffect(() => {
    if (!session?.user?.id) return;
    
    // 1. Invites (Game Requests) - Hört auf INSERT und UPDATE (event: '*')
    const inviteSub = supabase.channel('realtime_game_invites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_invites', filter: `receiver_id=eq.${session.user.id}` }, (payload) => {
         const record = payload.new;
         if (record && record.status === 'pending') { 
             playSound('crisis'); 
             setIncomingInvite(record); 
         }
      })
      .subscribe();

    // 1b. Friend Requests (Toasts) - Eigener, sicherer Kanal
    const friendSub = supabase.channel('realtime_friend_requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships', filter: `user_id_2=eq.${session.user.id}` }, async (payload) => {
         if (payload.new.status === 'pending') {
             playSound('click');
             const { data } = await supabase.from('profiles').select('username').eq('id', payload.new.user_id_1).single();
             if (data) {
                 setToastRequest({ id: payload.new.id, username: data.username });
                 setTimeout(() => setToastRequest(null), 8000); // Verschwindet nach 8 Sekunden
             }
         }
      })
      .subscribe();

    // 2. Presence Tracking (Online Status)
    const presenceChannel = supabase.channel('global_presence');
    presenceChannel.on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const usersOnline = {};
        for (const id in state) { usersOnline[state[id][0].user_id] = state[id][0].status; }
        setOnlineUsers(usersOnline);
    }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: session.user.id, status: currentView === 'match' ? 'ingame' : 'menu' });
        }
    });

    return () => { 
        supabase.removeChannel(inviteSub); 
        supabase.removeChannel(friendSub); 
        supabase.removeChannel(presenceChannel); 
    };
  }, [session, currentView]); // Update Status wenn View wechselt
 
  // FIX: Lighthouse-Protokoll - Host sendet regelmäßige Heartbeats, Client synct Deck
  useEffect(() => {
    if (!conn || !isCoopMode || !roguelikeRun) return;
    
    // Eigene Karten sofort einmalig an den Neural Link des Partners senden
    conn.send({ type: 'DECK_SYNC', chars: roguelikeRun.runDeck.chars, effs: roguelikeRun.runDeck.effs });
    
    if (lobbyMode === 'host') {
            const beaconInterval = setInterval(() => {
                const currentPath = JSON.parse(localStorage.getItem('aoc_path_' + roguelikeRun.seed) || '[]');
                
                // Der Lighthouse-Snapshot erzwingt globale UI-Integrität
                broadcast({ 
                    type: 'LIGHTHOUSE_BEACON', 
                    runState: {
                        hp: roguelikeRun.currentHP, 
                        sector: roguelikeRun.sector, 
                        node: roguelikeRun.node, 
                        seed: roguelikeRun.seed,
                        pathHistory: currentPath,
                        fullRun: roguelikeRun // FIX: Kompletten Run mitsenden als ultimativen Fallback
                    },
                    view: currentView
                });
            }, 8000); // Alle 8 Sekunden feuert der Host einen Sync-Beacon
        
        return () => clearInterval(beaconInterval);
    }
  }, [conn, isCoopMode, roguelikeRun, lobbyMode, currentView]); // Broadcast ist ref-basiert

  useEffect(()=>{
    localStorage.setItem('aoc_credits',   credits.toString());
    localStorage.setItem('aoc_inventory', JSON.stringify(inventory));
    localStorage.setItem('aoc_decks',     JSON.stringify(decks));
    localStorage.setItem('aoc_stats',     JSON.stringify(stats));
    localStorage.setItem('aoc_missions',  JSON.stringify(missions));
    localStorage.setItem('aoc_avatar',    JSON.stringify(avatarCard));
    localStorage.setItem('aoc_avatars',   JSON.stringify(avatars)); // NEU
    localStorage.setItem('aoc_all_runs',  JSON.stringify(allRuns));
    localStorage.setItem('aoc_reward_packs', JSON.stringify(rewardPacks));
    localStorage.setItem('aoc_meta_stats', JSON.stringify(metaStats));
    localStorage.setItem('aoc_ghost_presets', JSON.stringify(ghostPresets));
  },[credits,inventory,decks,stats,missions,avatarCard,allRuns,rewardPacks,metaStats,ghostPresets]);

  // ── Supabase Auth ─────────────────────────────────────────────────────────
  useEffect(() => {
    let subRef;
    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s ?? null);
        if (s) {
          cloudSyncReady.current = false;
          await loadProfile(s.user);
        }
      } catch (e) {
        console.error("Auth Init Error", e);
        setSession(null);
      }
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
        setSession(s ?? null);
        if (s) {
          cloudSyncReady.current = false;
          loadProfile(s.user);
        } else {
          cloudSyncReady.current = false;
          // LOGOUT: Lokale Daten auf Standard zurücksetzen, damit sie beim nächsten Login nicht leaken!
          setCredits(500);
          setInventory(makeStarterInventory());
          setDecks(makeStarterDecks());
          setAvatarCard(null);
          setAvatars([null, null, null, null, null]);
          setAllRuns({ solo: null });
          setMissions(generateNewMissions()); // NEU: Missionen des alten Accounts leeren
        }
      });
      subRef = subscription;
    };
    init();
    return () => { subRef?.unsubscribe(); };
  }, []);

  const loadProfile = async (user) => {
    cloudSyncReady.current = false;
    try {
      const { data: p, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;

      if (p) {
        if (p.credits != null && !isNaN(p.credits)) setCredits(p.credits);
        
        // NEU: Auto-Sync für Cloud-Daten. 
        // Wir nehmen die Namen aus der DB, aber die Stats frisch aus der cards.json.
        const allBaseCards = [...cardsData.characters, ...(cardsData.effects || [])];

        if (p.inventory?.length) {
          const syncedInv = p.inventory.map(savedCard => {
            const baseCard = allBaseCards.find(c => c.name === savedCard.name);
            // Falls die Karte in der JSON existiert, überschreibe Stats, behalte Level/SP
            return baseCard ? { ...baseCard, level: savedCard.level, isNew: savedCard.isNew, sp: savedCard.sp } : savedCard;
          });
          setInventory(syncedInv);
          localStorage.setItem('aoc_inventory', JSON.stringify(syncedInv));
        }

        if (p.decks?.length) {
          const syncedDecks = p.decks.map(deck => ({
            ...deck,
            chars: (deck.chars || []).map(savedCard => {
              const baseCard = allBaseCards.find(c => c.name === savedCard.name);
              return baseCard ? { ...baseCard, level: savedCard.level, isNew: savedCard.isNew, sp: savedCard.sp } : savedCard;
            }),
            effs: (deck.effs || []).map(savedCard => {
              const baseCard = allBaseCards.find(c => c.name === savedCard.name);
              return baseCard ? { ...baseCard, level: savedCard.level, isNew: savedCard.isNew, sp: savedCard.sp } : savedCard;
            })
          }));
          setDecks(syncedDecks);
          localStorage.setItem('aoc_decks', JSON.stringify(syncedDecks));
        }
        
        if (p.avatar_card) {
          const baseAvatar = allBaseCards.find(c => c.name === p.avatar_card.name);
          let avatarData = baseAvatar ? { ...baseAvatar, sp: p.avatar_card.sp } : p.avatar_card;
          const normalizedName = p.username?.toUpperCase();
          if (normalizedName === 'MANU') avatarData.photo = 'avatars/manu.png';
          else if (normalizedName === 'LEON') avatarData.photo = 'avatars/leon.png';
          setAvatarCard(avatarData);
        } else if (p.avatar_card === null) {
          setAvatarCard(null);
        }

        // NEU: Lade alle 5 Avatar-Slots aus der Cloud
        if (p.avatars && Array.isArray(p.avatars)) {
          setAvatars(p.avatars);
          localStorage.setItem('aoc_avatars', JSON.stringify(p.avatars));
        }
        if (p.active_run !== undefined) {
           if (p.active_run && typeof p.active_run === 'object' && ('solo' in p.active_run || Object.keys(p.active_run).some(k => k.startsWith('coop_')))) {
               setAllRuns(p.active_run);
           } else {
               setAllRuns({ solo: p.active_run });
           }
        }
        if (p.meta_stats !== undefined) setMetaStats(p.meta_stats || {});
        
        // Settings & Packs aus der Cloud
        if (p.settings) {
          setSFXVol(p.settings.vol_sfx ?? 70);
          setMusicVol(p.settings.vol_music ?? 40);
        }
        if (p.reward_packs) setRewardPacks(p.reward_packs);
        if (p.ghost_presets) setGhostPresets(p.ghost_presets);

        // NEU: Missionen aus der Cloud laden
        if (p.missions && p.missions.length > 0) {
            setMissions(p.missions);
        } else {
            setMissions(generateNewMissions());
        }

        localStorage.setItem('aoc_credits', (p.credits || 500).toString());
        localStorage.setItem('aoc_inventory', JSON.stringify(p.inventory || []));
        localStorage.setItem('aoc_decks', JSON.stringify(p.decks || []));
        localStorage.setItem('aoc_avatar', JSON.stringify(p.avatar_card || null));
        localStorage.setItem('aoc_all_runs', JSON.stringify(p.active_run ? (p.active_run.solo !== undefined ? p.active_run : { solo: p.active_run }) : { solo: null }));
        localStorage.setItem('aoc_meta_stats', JSON.stringify(p.meta_stats || {}));
        
      } else {
        const inv = makeStarterInventory();
        const d = makeStarterDecks();
        const initialMissions = generateNewMissions(); 
        
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id, username: (user.user_metadata?.username || 'AGENT').toUpperCase(),
          credits: 500, inventory: inv, decks: d, avatar_card: null, active_run: null, meta_stats: {}, missions: initialMissions, ghost_presets: []
        });

        if (insertError) {
          console.error("[SUPABASE INSERT ERROR]:", insertError);
          alert("PROFIL ERSTELLEN FEHLGESCHLAGEN:\n" + insertError.message);
        }

        setCredits(500); setInventory(inv); setDecks(d); setMissions(initialMissions);
      }
      cloudSyncReady.current = true;
    } catch (e) {
      console.error('[Profile Load Error]', e);
    }
  };

  // ── Cloud-Save Logik ──
  const saveToCloud = async (updates) => {
    if (!session?.user?.id || !cloudSyncReady.current) return;

    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
      
      if (error) {
        console.error("[SUPABASE ERROR]:", error);
        // FIX: Kein blockierendes alert() mehr! 
        // Ein kurzer Netzwerk-Hiccup darf das Spiel (und den Co-Op Sync) nicht einfrieren.
        // Die lokalen Daten (localStorage) sind ohnehin sicher und syncen sich beim nächsten Versuch.
      } else {
        console.log("[SYSTEM] Cloud-Save erfolgreich!");
      }
    } catch (error) {
      console.error("[SYSTEM] Netzwerkfehler:", error);
    }
  };

  useEffect(() => {
    // CLOUD SHIELD CHECK
    if (guestMode || !cloudSyncReady.current) return;

    const t = setTimeout(() => {
      // NEU: Packs und einzigartige Karten dynamisch fürs Leaderboard erfassen
      const uniqueCardsCount = new Set(inventory.map(c => c.name)).size;
      const syncedMeta = {
        ...metaStats,
        packs_opened: stats.packsOpened || 0,
        cards_collected: uniqueCardsCount
      };

      saveToCloud({ 
          credits, 
          inventory, 
          decks, 
          avatar_card: avatarCard, 
          avatars: avatars, 
          active_run: allRuns,
          meta_stats: syncedMeta,
          missions: missions,
          settings: { vol_sfx: volSFX, vol_music: volMusic },
          reward_packs: rewardPacks,
          ghost_presets: ghostPresets
        });
      }, 1500);
      return () => clearTimeout(t);
    }, [credits, inventory, decks, avatarCard, avatars, allRuns, metaStats, missions, volSFX, volMusic, rewardPacks, ghostPresets, guestMode, session]);

  // NEU: Manueller Claim-Handler für System Overrides
  const claimOverride = (ach, e) => {
    playSound('win');
    setMetaStats(prev => {
      const claimed = prev.claimed_achievements || [];
      if (!claimed.includes(ach.id)) {
        return { ...prev, claimed_achievements: [...claimed, ach.id] };
      }
      return prev;
    });
    handleCreditGain(e.clientX, e.clientY, ach.reward);
  };

  // Prüft, ob es uneingelöste Achievements gibt (für den Dot im Menü)
  const hasClaimableOverrides = ACHIEVEMENTS.some(ach => {
    const claimed = metaStats?.claimed_achievements || [];
    if (claimed.includes(ach.id)) return false;
    return (metaStats?.[ach.type] || 0) >= ach.target;
  });

  const handleGuestLogin = ()=>{ cloudSyncReady.current=true; setGuestMode(true); };
  const handleLogout = async ()=>{
    playSound('click');
    if (window.confirm('Ausloggen? Fortschritt ist in der Cloud gespeichert.')) {
      await supabase.auth.signOut(); setGuestMode(false); setSession(null);
    }
  };

  useEffect(() => {
    const handler = () => {
      setRoguelikeRun(null);
      setCurrentView('ghostnodemenu');
    };
    window.addEventListener('abortRun', handler);
    return () => window.removeEventListener('abortRun', handler);
  }, []);

// --- GLOBALES CLICK-AUDIO ---
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const isButton = e.target.closest('button');
      let hasPointer = false;
      try {
        hasPointer = window.getComputedStyle(e.target).cursor === 'pointer' || 
                     window.getComputedStyle(e.target.parentElement).cursor === 'pointer';
      } catch(err) {}

      if (isButton || hasPointer) {
        playSound('click');
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // --- GLOBALES KEY-ROUTING (ESC & LEERTASTE) ---
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      // Ignoriere Tastendrücke in Such- oder Chatfeldern
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // 1. LEERTASTE = WEITER / ACTION
      if (e.code === 'Space') {
        const actionBtn = document.querySelector('.space-action-btn');
        if (actionBtn) {
          const style = window.getComputedStyle(actionBtn);
          // Nur auslösen, wenn der Button nicht deaktiviert oder ausgegraut ist
          if (!actionBtn.disabled && style.pointerEvents !== 'none' && style.opacity !== '0.3' && style.opacity !== '0.5') {
            e.preventDefault(); // Verhindert das lästige Runterscrollen der Seite
            actionBtn.click();
            return;
          }
        }
      }

      // 2. ESC = ZURÜCK / ABBRECHEN
      if (e.key === 'Escape') {
        // 1. Priorität: Overlays & Modals schließen
        if (lexiconInspectCard) { playSound('click'); setLexiconInspectCard(null); return; }
        if (showGlobalRules) { playSound('click'); setShowGlobalRules(false); return; }
        if (pendingOutgoingInvite) { playSound('click'); disconnectPeer(); setPendingOutgoingInvite(null); return; }

           // 2. Priorität: Sub-Menü im Hauptmenü (Mission Starten) abbrechen
        if (currentView === 'menu' && (showDifficultySelect || showMultiplayerOptions)) { 
            playSound('click'); 
            setShowDifficultySelect(false); 
            setShowMultiplayerOptions(false);
            return; 
        }

        // 3. Priorität: Menüs, die ins Ghost Node Menu zurückgehen
        const backToGhostViews = ['avatarlab', 'roguelikesquad', 'roguelikemap', 'roguelikefailed'];
        if (backToGhostViews.includes(currentView)) {
          playSound('click');
          // GHOST LINK: Context bleibt coop, falls verbunden
          setCurrentView('ghostnodemenu');
          return;
        }

        // 4. Priorität: Menüs, die ins Hauptmenü zurückgehen
        const backToMenuViews = ['ghostnodemenu', 'inventory', 'market', 'missions', 'lexicon', 'overrides', 'leaderboard', 'stats', 'ghostnetwork', 'difficulty', 'multiplayer'];
        if (backToMenuViews.includes(currentView)) {
          playSound('click');
          setCurrentView('menu');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [currentView, showDifficultySelect, showGlobalRules, lexiconInspectCard, pendingOutgoingInvite, conn]);

  const updateAvatar = (newAvatar) => { setAvatarCard(newAvatar); };

  const generateAIDeck = (nodeObj, sector) => {
    const isBoss = nodeObj.type === 'boss';
    const isElite = nodeObj.type === 'elite';
    const nodeName = (nodeObj.name || "").toLowerCase();
    
    // 1. DYNAMISCHE SCHWIERIGKEIT BERECHNEN
    let diff = 1;
    if (sector === 1)      diff = isBoss ? 3 : (isElite ? 2 : 1);
    else if (sector === 2) diff = isBoss ? 3 : (isElite ? 3 : 2);
    else if (sector === 3) diff = isBoss ? 4 : (isElite ? 4 : 3);
    else diff = 4;

    // 2. EXAKTE HP-SKALIERUNG (Co-Op = 2.5x Solo, gerundet auf 50)
    const sIdx = Math.min(sector, 5) - 1;
    let aHP = 0;

    // Solo Basis-Werte:
    // Boss:     [500, 650, 850, 1100, 1400]
    // Elite:    [400, 500, 650, 850, 1100]
    // Standard: [300, 350, 450, 600, 800]

    if (isCoopMode) {
        // Co-Op skaliert mit Faktor 1.25 (Wird von der Engine verdoppelt -> final 2.5x statt 5x)
        if (isBoss)      aHP = [625, 825, 1075, 1375, 1750][sIdx];
        else if (isElite) aHP = [500, 625, 825, 1075, 1375][sIdx];
        else              aHP = [375, 450, 575, 750, 1000][sIdx];
    } else {
        if (isBoss)      aHP = [500, 650, 850, 1100, 1400][sIdx];
        else if (isElite) aHP = [400, 500, 650, 850, 1100][sIdx];
        else              aHP = [300, 350, 450, 600, 800][sIdx];
    }

    // ENDLESS MODE: Ab Sektor 6 skalieren HP um 25% pro Sektor
    if (sector > 5) {
        const endlessFactor = 1 + (sector - 5) * 0.25;
        aHP = Math.round(aHP * endlessFactor);
    }

    // 3. THEMATISCHES FACTION-MAPPING (Node-Name -> Deck-Strategie)
    const getFactionByNode = (name) => {
      if (name.includes('bank') || name.includes('börse') || name.includes('wall street')) return 'Finance Elite';
      if (name.includes('server') || name.includes('zentrum') || name.includes('labor'))   return 'Tech Cartel';
      if (name.includes('palast') || name.includes('botschaft') || name.includes('amt'))   return 'Hegemony';
      if (name.includes('slum') || name.includes('hinterhof') || name.includes('gasse'))   return 'Shadow Power';
      if (name.includes('tempel') || name.includes('kathedrale') || name.includes('kult')) return 'Fanatics';
      if (name.includes('behörde') || name.includes('ministerium'))                        return 'Bureaucracy Apparatus';
      if (name.includes('abhör') || name.includes('bunker') || name.includes('safehouse')) return 'Intelligence Syndicate';
      if (name.includes('öl') || name.includes('mine') || name.includes('raffinerie'))     return 'Energy Oligarchs';
      return null;
    };

    const forcedFac = getFactionByNode(nodeName);

    // 4. DECK ZUSAMMENSTELLEN (Ghost Node Edition: 6 Chars + 2 Effekte)
    let charPool = [...cardsData.characters];
    let effPool = cardsData.effects || [];
    let pickedChars = [];
    let pickedEffs = [];

    const validFactions = shuffle(allFactions).filter(f => charPool.filter(c => c.faction === f).length >= 3);
    const synFac = forcedFac || validFactions[0];

    // Helper für präzise GTI-Limits und Hardcap (max 450)
    const drawWithLimits = (diffLvl) => {
        let highCount = 0, highMax = 0, lowMax = 0, excluded = [];
        if (diffLvl === 1) { highCount = 1; highMax = 95; lowMax = 92; excluded = ['apex', 'legacy']; }
        else if (diffLvl === 2) { highCount = 2; highMax = 97; lowMax = 93; excluded = ['apex']; }
        else if (diffLvl === 3) { highCount = 3; highMax = 98; lowMax = 95; excluded = []; }
        else { highCount = 6; highMax = 999; lowMax = 999; excluded = []; } // Stufe 4: Keine Limits

        let result = [];
        let attempts = 0;
        
        while (result.length < 6 && attempts < 100) {
            attempts++;
            result = [];
            let currentGti = 0;
            
            // Versuche Fraktionen thematisch passend zu halten
            let myPool = shuffle([...charPool]).sort((a, b) => {
                if (diffLvl > 1 && a.faction === synFac && b.faction !== synFac) return -1;
                return 0;
            });

            let highPool = myPool.filter(c => (c.gti || 0) <= highMax && !excluded.includes(c.type));
            let lowPool = myPool.filter(c => (c.gti || 0) <= lowMax && !excluded.includes(c.type));
            
            // 1. Die starken "High-Karten" ziehen
            for (let i = 0; i < highCount && i < highPool.length; i++) {
                result.push(highPool[i]);
                currentGti += (highPool[i].gti || 0);
            }
            
            // 2. Den Rest mit Low-Karten auffüllen
            let lowIndex = 0;
            while (result.length < 6 && lowIndex < lowPool.length) {
                let card = lowPool[lowIndex];
                if (!result.find(c => c.name === card.name)) {
                    // Rechnen wir vor dem Hinzufügen, ob das 450er Limit gesprengt wird 
                    // Die schlechteste Karte hat ~70, also rechnen wir: verbleibende Slots * 70
                    let remainingSlots = 6 - (result.length + 1);
                    if (currentGti + (card.gti || 0) + (remainingSlots * 70) <= 450 || attempts > 80) {
                        result.push(card);
                        currentGti += (card.gti || 0);
                    }
                }
                lowIndex++;
            }
            
            // Hardcap Check: Zwingt den Draft zum Neustart, wenn wir > 450 haben
            if (currentGti > 450 && attempts < 90) {
                result = []; 
            }
        }
        
        // Letzter Fallback, falls das Cap absolut unmöglich war
        if (result.length < 6) {
            let fallback = shuffle(charPool).sort((a, b) => (a.gti || 0) - (b.gti || 0));
            while (result.length < 6) {
                let c = fallback.shift();
                if (!result.find(r => r.name === c.name)) result.push(c);
            }
        }
        return result;
    };

    pickedChars = drawWithLimits(diff);

    // Level und Effekte final zuweisen
    if (diff === 1) {
        pickedChars = pickedChars.map(c => ({ ...c, level: 1 }));
        pickedEffs = shuffle(effPool.filter(e => e.type !== 'apex' && (e.cost || 0) <= 3)).slice(0, 1).map(e => ({...e, level: 1}));
    } 
    else if (diff === 2) {
        pickedChars = pickedChars.map(c => ({ ...c, level: Math.random() > 0.4 ? 2 : 1 }));
        pickedEffs = shuffle(effPool.filter(e => e.type !== 'apex')).slice(0, 2).map(e => ({...e, level: 1}));
    } 
    else if (diff === 3) {
        pickedChars = pickedChars.map((c, i) => ({ ...c, level: i % 2 === 0 ? 3 : 2 }));
        pickedEffs = shuffle(effPool).sort((a,b) => (b.buff||0) - (a.buff||0)).slice(0, 2).map(e => ({...e, level: 2}));
    } 
    else {
        pickedChars = pickedChars.map(c => ({ ...c, level: 3 }));
        pickedEffs = shuffle(effPool).sort((a,b) => (a.type==='apex'?-1:1)).slice(0, 2).map(e => ({...e, level: 3}));
    }

    return { 
        aiChars: shuffle(pickedChars).map(c => ({ ...c, stats: c.stats ? { ...c.stats } : undefined })), 
        aiEffs: pickedEffs, 
        difficulty: diff, 
        initialAHP: aHP, 
        node: nodeObj 
    };
  };

  const startRoguelikeRunWithDeck = (selectedChars, selectedEffs) => {
    if (!avatarCard) {
        alert("Fehler: Bitte wähle zuerst einen Avatar im Menü aus!");
        return;
    }

    if (isCoopMode) {
        if (lobbyMode === 'join') {
            // FIX: Wir nutzen unseren sicheren 'broadcast', der nie von Stale Closures betroffen ist!
            broadcast({ type: 'CLIENT_SQUAD_READY', payload: { chars: selectedChars, effs: selectedEffs, avatarCard } });
            setMySquadReady(true);
            return;
        }

        if (lobbyMode === 'host') {
            if (clientSquadReadies.length < squadSize - 1) {
                alert("Warte auf alle Partner, bis sie ihr Squad bestätigt haben!");
                return;
            }
            
            // DEEP CLONE: Trennt die Karten komplett vom permanenten Inventar!
            let hostChars = [{ ...avatarCard }, ...JSON.parse(JSON.stringify(selectedChars))];

            // FIX: Co-Op Base skaliert jetzt mit SquadSize (500 HP pro Agent)
            const teamHP = 500 * squadSize;
            const baseRunInfo = { currentHP: teamHP, maxHP: teamHP, sector: 1, node: 1, seed: Math.random(), isCoop: true, bank: [], augments: [] };
            
            const hostRun = { ...baseRunInfo, runDeck: { chars: hostChars, effs: JSON.parse(JSON.stringify(selectedEffs)) } };
            setRoguelikeRun(hostRun);
            
            // BULLETPROOF: Jedem Client anhand seiner Peer-ID exakt sein Deck senden!
            hostConnsRef.current.forEach(c => {
                if (c && c.open) {
                    // Hole das Payload spezifisch für diese Verbindung
                    const clientPayload = hostSquadReadiesRef.current[c.peer];
                    if (clientPayload) {
                        const clientChars = [{ ...clientPayload.avatarCard }, ...JSON.parse(JSON.stringify(clientPayload.chars))];
                        const clientRun = { ...baseRunInfo, runDeck: { chars: clientChars, effs: JSON.parse(JSON.stringify(clientPayload.effs)) } };
                        c.send({ type: 'SYNC_RUN_STATE', run: clientRun });
                    }
                }
            });

            hostSquadReadiesRef.current = {}; // WICHTIG: Dictionary für den nächsten Run leeren!
            setClientSquadReadies([]); // Reset für nächsten Run
            setMySquadReady(false);
            
            broadcast({ type: 'NAV_TO', view: 'roguelikemap' });
            setCurrentView('roguelikemap');
            return;
        }
    }

    // ── STRIKTER SINGLEPLAYER FALL ──
    // DEEP CLONE: Isoliert die Run-Karten strikt vom globalen Inventar!
    let compiledChars = [{ ...avatarCard }, ...JSON.parse(JSON.stringify(selectedChars))];
    
    const newRun = {
      currentHP: 500, 
      maxHP: 500, 
      sector: 1, 
      node: 1, 
      seed: Math.random(),
      isCoop: false, // Explizit auf false setzen für Solo
      runDeck: { chars: compiledChars, effs: JSON.parse(JSON.stringify(selectedEffs)) },
      bank: [],
      augments: []
    };
    
    // FIX: Explizit auf den Solo-Context umschalten, falls wir aus einer Co-Op Session kommen
    setRunContext('solo');
    setIsCoopMode(false); // FIX: Zwingend den globalen Co-Op Modus beenden, damit Singleplayer nicht blockiert!
    setLobbyMode('select');
    setRoguelikeRun(newRun);
    setCurrentView('roguelikemap');
  };

  const startRoguelikeEvent = (nodeObj) => {
    // Falls es ein Safehouse ist
    if (nodeObj.type === 'safehouse') {
      playSound('upgrade');
      setRoguelikeRun(prev => {
        if (!prev) return prev;
        const healAmount = Math.floor(prev.maxHP * 0.20);
        let newHP = Math.min(prev.maxHP, prev.currentHP + healAmount);
        let newNode = prev.node + 1;
        let newSec = prev.sector;
        let newSeed = prev.seed;
        
        if (newNode > 7) { 
            newNode = 1; 
            newSec++; 
            newSeed = Math.random(); 
            // NEU: Zusätzliche Heilung beim Sektor-Wechsel (Boss/Sektor-Ende)
            const sectorHeal = Math.floor(prev.maxHP * 0.20);
            newHP = Math.min(prev.maxHP, newHP + sectorHeal);
            playSound('upgrade');
        }
        const nextRun = { ...prev, currentHP: newHP, node: newNode, sector: newSec, seed: newSeed };
        
        // Cloud Sync direkt triggern, da wir den Event-Screen überspringen!
        saveToCloud({ active_run: { ...allRuns, [runContextRef.current]: nextRun } });
        return nextRun;
      });
      return;
    }

    setRoguelikeEventData(nodeObj);
    setCurrentView('roguelikeevent');
    if (conn && isCoopMode) {
      broadcast({ type: 'START_RL_EVENT', nodeObj });
    }
  };

  const startRoguelikeRun = () => {
    if (!avatarCard) { setCurrentView('avatarlab'); return; }
    if (roguelikeRun) { setCurrentView('roguelikemap'); return; } 
    setCurrentView('roguelikesquad');
  };

  // FIX: Nimmt jetzt das nodeObj von der RoguelikeMap entgegen!
  const startRoguelikeMatch = (nodeObj) => {
    if (!roguelikeRun || !nodeObj) return;

    // NEU: Encrypted Nodes können zu ca. 35% ein Free-Reward sein (deterministisch via Seed)
    const isFreeEncrypted = nodeObj.type === 'encrypted' && (Math.sin(roguelikeRun.seed * 1234 + roguelikeRun.node * 5678) > 0.3);

    if (isFreeEncrypted) {
        playSound('upgrade');
        const fakeMatchData = { node: nodeObj, difficulty: 4, initialAHP: 500 };
        setRoguelikeMatchData(fakeMatchData);
        
        // Co-Op Sync: Dem Partner mitteilen, dass er ebenfalls den Reward-Screen aufrufen soll
        if (isCoopMode && lobbyMode === 'host' && conn) {
            conn.send({ type: 'TRIGGER_FREE_ENCRYPTED', nodeObj });
        }

        setTimeout(() => {
            handleRoguelikeEndGame({
                isWin: true,
                sarcasmNews: { text: "UNBEKANNTE SIGNATUR ENTSCHLÜSSELT... ES IST EIN VERLASSENER CACHE!" },
                remainingHP: roguelikeRun.currentHP,
                matchData: { dmgDealt: 0, dmgTaken: 0, highestCrit: 0 }
            });
        }, 100);
        return;
    }

    if (isCoopMode && lobbyMode === 'host') {
        const hostAIData = generateAIDeck(nodeObj, roguelikeRun.sector);
        const clientAIData = generateAIDeck(nodeObj, roguelikeRun.sector);
        setRoguelikeMatchData(hostAIData);
        setCurrentView('match');
        // FIX: Broadcast zieht das ganze Squad in den Kampf!
        if (conn) broadcast({ type: 'START_RL_MATCH', aiData: clientAIData });
        return;
    }

    // Singleplayer Fall
    const myData = generateAIDeck(nodeObj, roguelikeRun.sector);
    setRoguelikeMatchData(myData);
    setCurrentView('match');
  };

  // --- DIE REPARIERTE LOOT & DRAFT LOGIK ---
  const handleEndGame = ({ isWin, sarcasmNews, isAbort = false, matchData }) => {
    const isOnlineMatch = !!conn;
    const effectiveDifficulty = isOnlineMatch ? 4 : difficulty;
    const conf = DIFFICULTY_CONFIG[effectiveDifficulty];
    const reward = isWin ? conf.reward : (isAbort ? 0 : conf.loseReward);
    
    setStats(prev => ({ ...prev, wins: prev.wins + (isWin ? 1 : 0), losses: prev.losses + (isWin ? 0 : 1), bossDefeats: (prev.bossDefeats || 0) + (isWin && effectiveDifficulty === 4 ? 1 : 0) }));
    
    // NEU: Achievements und Leaderboard Stats synchronisieren
    setMetaStats(prev => ({
        ...prev,
        total_wins: (prev.total_wins || 0) + (isWin && !isAbort ? 1 : 0),
        total_losses: (prev.total_losses || 0) + (!isWin || isAbort ? 1 : 0),
        classic_wins: (prev.classic_wins || 0) + (isWin && !isAbort ? 1 : 0),
        total_damage_dealt: (prev.total_damage_dealt || 0) + (matchData?.dmgDealt || 0),
        classic_damage_dealt: (prev.classic_damage_dealt || 0) + (matchData?.dmgDealt || 0),
        total_damage_taken: (prev.total_damage_taken || 0) + (matchData?.dmgTaken || 0),
        highest_crit: Math.max(prev.highest_crit || 0, matchData?.highestCrit || 0),
        classic_highest_crit: Math.max(prev.classic_highest_crit || 0, matchData?.highestCrit || 0)
    }));

    if (!isAbort) {
        handleMissionProgress('play', 1);
        if (effectiveDifficulty >= 3) handleMissionProgress('play_hard', 1);
        if (isWin) {
            handleMissionProgress('win', 1);
            if (effectiveDifficulty >= 3) handleMissionProgress('win_hard', 1);
        }
    }

    setCredits(prev => prev + reward);
    setLastMatch({ isWin, news: sarcasmNews.text, reward });
    
    setLobbyClientReady(false); // NEU: Ready-State für die Lobby zurücksetzen
    
    setCurrentView('postmatch'); 
  };

  const handleRoguelikeEndGame = ({ isWin, sarcasmNews, remainingHP, isAbort = false, matchData }) => {
    const node = roguelikeRun?.node || 1;
    const currentSector = roguelikeRun?.sector || 1;
    const isBoss = node >= 7 || roguelikeMatchData?.node?.type === 'boss';
    const currentScore = currentSector * 10 + node;
    const diff = roguelikeMatchData?.difficulty || 1;

    // Basis-Missionen für Ghost Node Matches anrechnen
    if (!isAbort) {
        handleMissionProgress('play', 1);
        if (diff >= 3) handleMissionProgress('play_hard', 1);
        if (isWin) {
            handleMissionProgress('win', 1);
            if (diff >= 3) handleMissionProgress('win_hard', 1);
        }
    }

    // NEU: Achievements und Leaderboard Stats synchronisieren (Auch bei Niederlage!)
    setMetaStats(prev => ({
        ...prev,
        total_wins: (prev.total_wins || 0) + (isWin && !isAbort ? 1 : 0),
        total_losses: (prev.total_losses || 0) + (!isWin || isAbort ? 1 : 0),
        gn_wins: (prev.gn_wins || 0) + (isWin && !isAbort ? 1 : 0),
        total_damage_dealt: (prev.total_damage_dealt || 0) + (matchData?.dmgDealt || 0),
        gn_damage_dealt: (prev.gn_damage_dealt || 0) + (matchData?.dmgDealt || 0),
        total_damage_taken: (prev.total_damage_taken || 0) + (matchData?.dmgTaken || 0),
        highest_crit: Math.max(prev.highest_crit || 0, matchData?.highestCrit || 0),
        gn_highest_crit: Math.max(prev.gn_highest_crit || 0, matchData?.highestCrit || 0),
        nodes_cleared_total: (prev.nodes_cleared_total || 0) + (isWin && !isAbort ? 1 : 0),
        bosses_defeated: (prev.bosses_defeated || 0) + (isWin && !isAbort && isBoss ? 1 : 0),
        furthest_run_score: Math.max(prev.furthest_run_score || 0, currentScore)
    }));

    if (!isWin || isAbort) {
      setRoguelikeMatchData(null);
      setRoguelikeRun(null);
      setLobbyClientReady(false); // NEU: Ready-State für die Lobby zurücksetzen
      setCurrentView('roguelikefailed');
      return;
    }

    const isElite = node === 3 || roguelikeMatchData?.node?.type === 'elite';
    
    // PHASE 3 MISSION PROGRESS TRACKING
    handleMissionProgress('gn_node', 1);
    if (isBoss) handleMissionProgress('gn_boss', 1);
    if (isElite) handleMissionProgress('gn_elite', 1);
    handleMissionProgress('gn_sector', currentSector);

    const isSector5Boss = isBoss && currentSector === 5; 
    const isEncrypted = roguelikeMatchData?.node?.type === 'encrypted';
    const sectorFac = getSectorFaction(currentSector, roguelikeRun.seed);

    // Balancing Phase 2: SP-Gewinn stark reduziert
    const spGain = isBoss ? 2 : ((isElite || isEncrypted) ? 1 : (Math.random() > 0.7 ? 1 : 0));
    let earnedCredits = Math.floor((isBoss ? 500 : ((isElite || isEncrypted) ? 200 : 75)) * (1 + currentSector * 0.15));
    
    // Sektor Mutation: Finance Elite gibt +50% Credits!
    if (sectorFac.id === 'FINANCE') earnedCredits = Math.floor(earnedCredits * 1.5);
    
    // GHOST MODULE: DATA SIPHON gibt +20% Bonus-Credits pro Modul
    const siphonCount = (roguelikeRun.augments || []).filter(a => a.type === 'data_siphon').length;
    if (siphonCount > 0) earnedCredits = Math.floor(earnedCredits * (1 + (0.2 * siphonCount)));

    // Wir halten newNode und newSector hier auf dem aktuellen Stand des besiegten Nodes,
    // damit das Reward-UI die korrekte Nummer anzeigt. 
    // Das Hochzählen erfolgt erst in applyRoguelikeDraft oder onSkip.
    const safeHP = (remainingHP !== undefined && !isNaN(remainingHP)) ? remainingHP : roguelikeRun.currentHP;

    const updatedRun = { 
      ...roguelikeRun, 
      currentHP: Math.max(0, safeHP),
      augments: [...(roguelikeRun.augments || [])]
    };

    // GHOST MODULE: Drop Logik
    let droppedModule = null;
    if (isEncrypted) {
       droppedModule = { ...shuffle(GHOST_MODULES)[0], id: 'mod_' + Date.now() + Math.random() };
       updatedRun.augments.push(droppedModule);
       // HINWEIS: Wir speichern droppedModule in RewardData, um es gleich im UI anzuzeigen!
    }

    setRoguelikeRun(updatedRun);
    const updatedAvatar = { ...avatarCard, sp: (avatarCard.sp || 0) + spGain };

    // 1. DRAFT GENERIEREN (20% Chance pro Slot auf eine Karte aus dem aktiven Run-Deck beider Spieler)
    const allPool = [...cardsData.characters, ...(cardsData.effects || [])];
    const draftPool = [];
    
    // Sammle alle Karten aus dem eigenen Deck und (im Co-Op) aus dem Deck des Partners
    let activeRunCards = [
      ...(roguelikeRun.runDeck.chars || []),
      ...(roguelikeRun.runDeck.effs || [])
    ];
    
    if (isCoopMode && remoteDeck) {
      activeRunCards = [
        ...activeRunCards,
        ...(remoteDeck.chars || []),
        ...(remoteDeck.effs || [])
      ];
    }
    
    // Avatar herausfiltern und Duplikate (gleiche Karten bei beiden Spielern) zusammenfassen
    activeRunCards = activeRunCards.filter(c => c.id !== 'avatar' && c.name !== avatarCard?.name && c.sp === undefined);
    activeRunCards = Array.from(new Map(activeRunCards.map(c => [c.name, c])).values());

    for (let i = 0; i < 3; i++) {
      let pickedCard;
      
      // 20% Chance auf Upgrade-Karte UND es gibt wählbare Karten im Run-Deck
      if (Math.random() < 0.20 && activeRunCards.length > 0) {
        const availableActive = activeRunCards.filter(runC => !draftPool.some(d => d.name === runC.name));
        const poolToUse = availableActive.length > 0 ? availableActive : activeRunCards;
        pickedCard = poolToUse[Math.floor(Math.random() * poolToUse.length)];
      } else {
        // ENCRYPTED REWARD: Garantiert ein Apex oder Legacy Asset!
        let poolToUse = allPool;
        if (isEncrypted && i === 0) {
            poolToUse = allPool.filter(c => c.type === 'apex' || c.type === 'legacy');
        } else {
            const availableAll = allPool.filter(c => !draftPool.some(d => d.name === c.name));
            poolToUse = availableAll.length > 0 ? availableAll : allPool;
        }
        pickedCard = poolToUse[Math.floor(Math.random() * poolToUse.length)];
      }

      // Basis-Karte aus dem allPool laden, damit wir keine manipulierten Level/Stats übernehmen
      const baseCard = allPool.find(c => c.name === pickedCard.name) || pickedCard;
      draftPool.push({ ...baseCard, level: 1 });
    }

    // 2. LOOT FÜR DEN SCHWARZMARKT SAMMELN (Mit exakten Market-Odds!)
    let lootedCards = [];
    if (isElite || isBoss) {
      const count = isBoss ? 5 : 3;
      for(let i=0; i < count; i++) {
        const roll = Math.random();
        let cType = 'std';
        
        // NEU: Omniverse Cache Spezial-Quoten für Sektor 5 Boss
        if (isSector5Boss) {
          if (roll < 0.15) cType = 'anomaly';      // 15% Anomaly
          else if (roll < 0.50) cType = 'apex';     // 35% Apex
          else cType = 'legacy';                   // 50% Legacy
        } else if (isBoss) {
          if (roll < 0.004) cType = 'anomaly';
          else if (roll < 0.044) cType = 'apex';
          else if (roll < 0.144) cType = 'legacy';
          else if (roll < 0.394) cType = 'effect';
          else cType = 'std';
        } else {
          if (roll < 0.001) cType = 'anomaly';
          else if (roll < 0.006) cType = 'apex';
          else if (roll < 0.046) cType = 'legacy';
          else if (roll < 0.296) cType = 'effect';
          else cType = 'std';
        }

        let pool = allPool.filter(c => cType === 'effect' ? (c.type === 'effect' || c.buff !== undefined) : c.type === cType);
        if (pool.length === 0) pool = allPool.filter(c => c.type === 'std');
        const picked = pool[Math.floor(Math.random() * pool.length)];

        lootedCards.push({
          ...picked, 
          level: 1, 
          isNew: !inventory.some(inv => inv.name === picked.name)
        });
      }
    }

    if (lootedCards.length > 0) {
      setRewardPacks(prev => [...prev, {
        id: 'reward-' + Date.now(),
        name: isSector5Boss ? 'OMNIVERSE CACHE' : (isBoss ? 'SEKTOR-KERN CACHE' : 'GHOST DATA'),
        cards: lootedCards,
        color: isSector5Boss ? 'var(--ep)' : (isBoss ? 'var(--lose)' : '#bc13fe')
      }]);
    }

    // 3. STATES AKTUALISIEREN
    setCredits(prev => prev + earnedCredits);
    setAvatarCard(updatedAvatar);
    setRoguelikeRun(updatedRun);
    setRoguelikeMatchData(null);

    let augmentOptions = null;
    if (isEncrypted) {
      // Encrypted-Loot: Wähle 1 aus 3 GHOST MODULES
      augmentOptions = shuffle(GHOST_MODULES.map(m => ({ ...m, id: m.id + '_' + Date.now() }))).slice(0, 3);
    }

    // 4. ZUM DRAFT-SCREEN LEITEN (Inkl. Transcendence Flag)
    setRewardData({ 
      draft: draftPool,
      hpUpdate: { next: Math.max(0, safeHP), max: roguelikeRun.maxHP },
      loot: { sp: spGain || 0, credits: earnedCredits },
      isTranscendenceTrigger: isSector5Boss,
      augments: augmentOptions,
      droppedModule: droppedModule // Übergeben wir für den UI-Ausbau im nächsten Schritt
    });
    setCurrentView('roguelikereward');
    
    // KEIN manuelles saveToCloud hier! 
    // Der useEffect bei Zeile 427 kümmert sich automatisch um den Sync, 
    // sobald die States (credits, avatarCard, allRuns) aktualisiert wurden.
    // Das verhindert, dass wir versehentlich alte Decks aus der Closure speichern.
  };

  const applyRoguelikeDraft = (newCard, replaceIndex, replaceIn, isUpgrade = false, sendToBank = false, chosenAugment = null) => {
    if (!roguelikeRun) return;
    
    setRoguelikeRun(prev => {
      if (!prev) return prev;
      const deck = { chars: [...prev.runDeck.chars], effs: [...prev.runDeck.effs] };
      let bank = prev.bank ? [...prev.bank] : [];
      let augments = prev.augments ? [...prev.augments] : [];

      if (chosenAugment) {
        augments.push(chosenAugment);
      }

      if (newCard) {
        if (sendToBank) {
          bank.push({ ...newCard, level: 1 });
        } else if (isUpgrade) {
          if (newCard.type === 'effect' || newCard.buff !== undefined) {
            const idx = deck.effs.findIndex(c => c.name === newCard.name);
            if (idx > -1) deck.effs[idx] = { ...deck.effs[idx], level: (deck.effs[idx].level || 1) + 1 };
          } else {
            const idx = deck.chars.findIndex(c => c.name === newCard.name);
            if (idx > -1) deck.chars[idx] = { ...deck.chars[idx], level: (deck.chars[idx].level || 1) + 1 };
          }
        } else {
          // FIX: Wenn ein Slot zum Ersetzen gewählt wurde (Upgrade/Swap), geht sie ins Team oder den Vault.
          if (replaceIn === 'chars' || replaceIn === 'effs' || replaceIn === 'bank') {
            if (replaceIn === 'chars') deck.chars.splice(replaceIndex, 1);
            else if (replaceIn === 'effs') deck.effs.splice(replaceIndex, 1);
            else if (replaceIn === 'bank') bank.splice(replaceIndex, 1);

            if (replaceIn === 'bank') bank.push({ ...newCard, level: 1 });
            else if (newCard.type === 'effect' || newCard.buff !== undefined) deck.effs.push({ ...newCard, level: 1 });
            else deck.chars.push({ ...newCard, level: 1 });
          } else {
            bank.push({ ...newCard, level: 1 });
          }
        }
      }

      const updatedRun = { ...prev, runDeck: deck, bank, augments };
      
      saveToCloud({ 
        active_run: { ...allRuns, [runContextRef.current]: updatedRun },
        avatar_card: avatarCard 
      });

      return updatedRun;
    });
  };


  const handleMidMatchTrade = (receivedCard, givenCard, bonusCard) => {
      setRoguelikeRun(prev => {
          if (!prev) return prev;
          // Tiefe Kopie des Decks, um Mutationen zu vermeiden
          const deck = { 
            chars: prev.runDeck.chars ? [...prev.runDeck.chars] : [], 
            effs: prev.runDeck.effs ? [...prev.runDeck.effs] : [] 
          };
          const isEff = receivedCard.type === 'effect' || receivedCard.buff !== undefined;
          const givenIsEff = (givenCard.type === 'effect' || givenCard.buff !== undefined);

          // 1. Gegebene Karte aus dem permanenten RunDeck entfernen
          if (givenIsEff) {
              const idx = deck.effs.findIndex(c => c.name === givenCard.name);
              if (idx > -1) deck.effs.splice(idx, 1);
          } else {
              const idx = deck.chars.findIndex(c => c.name === givenCard.name);
              if (idx > -1) deck.chars.splice(idx, 1);
          }

          // 2. Erhaltene Karte einfügen (mit korrektem Level)
          if (isEff) {
              const existingIdx = deck.effs.findIndex(c => c.name === receivedCard.name);
              if (existingIdx > -1) deck.effs[existingIdx] = { ...deck.effs[existingIdx], level: receivedCard.level };
              else deck.effs.push({ ...receivedCard, level: receivedCard.level || 1 });
          } else {
              const existingIdx = deck.chars.findIndex(c => c.name === receivedCard.name);
              if (existingIdx > -1) deck.chars[existingIdx] = { ...deck.chars[existingIdx], level: receivedCard.level };
              else deck.chars.push({ ...receivedCard, level: receivedCard.level || 1 });
          }

          // 3. Bonus-Karte (System Compensator) permanent ins Run-Deck aufnehmen!
          if (bonusCard) {
              if (bonusCard.type === 'effect' || bonusCard.buff !== undefined) deck.effs.push(bonusCard);
              else deck.chars.push(bonusCard);
          }

          return { ...prev, runDeck: deck };
      });
  };

  
  // NEU: Absolut State-sicherer Broadcast über Refs (Verhindert Stale-Closures)
  const broadcast = (data) => {
    if (lobbyModeRef.current === 'host') {
      hostConnsRef.current.forEach(c => { if (c && c.open) c.send(data); });
    } else if (connRef.current && connRef.current.open) {
      connRef.current.send(data);
    }
  };

  const disconnectPeer = () => {
    if (conn) conn.close();
    hostConnsRef.current.forEach(c => c.close()); // NEU: Alle Clients kicken
    if (peer) peer.destroy();
    setPeer(null);
    setConn(null);
    setHostConnections([]); // NEU: Host Array leeren
    setMyPeerId('');
    setRemotePeerId('');
    setLobbyMode('select');
    setIsCoopMode(false);      // FIX: Beendet den Co-Op Modus auch lokal restlos!
    setSquadSize(2);           // Reset Squad Size
    setMyOnlineDeck(null);
    setMyOnlineDeck(null);
    setRemoteDeck(null);
    setCoopAIDecks(null);
    setLobbyClientReadies(0);
    setClientSquadReadies([]);
    setClientSquadReady(null); 
    setMySquadReady(false);    
    setPendingOutgoingInvite(null); 
    setSentLobbyInvites(new Set()); 
    setLobbyMembers([]); // SQUAD-SIGNATUR: Array leeren
    setRunContext('solo'); // SQUAD-SIGNATUR: Zurück auf Solo-Slot     
  };

  const navTo = (view) => {
    playSound('click');
    // GHOST LINK PROTOCOL: Die Verbindung bleibt im Hintergrund aktiv, 
    // auch wenn wir zwischen Menüs navigieren.
    setCurrentView(view);
  };

  const prepareMyDeck = () => {
    const readyDeck = { chars: shuffle(activeDeck.chars), effs: shuffle(activeDeck.effs) };
    setMyOnlineDeck(readyDeck);
    return readyDeck;
  };

  const startHosting = (mode = 'pvp', inviteTargetId = null, targetSquadSize = 2) => {
    if (conn) return; // Verbindungsschutz
    if (activeDeck.chars.length !== 12 || activeDeck.effs.length !== 3) {
      alert("Dein aktives Deck ist unvollständig! (12 Chars, 3 Effekte benötigt)");
      return;
    }
    playSound('click');
    setIsCoopMode(mode === 'coop');
    setSquadSize(mode === 'coop' || mode === 'lobby' ? targetSquadSize : 2);
    setLobbyMode('host');
    setLobbyMembers([session?.user?.user_metadata?.username || 'HOST']); // HOST IDENTITÄT: Startwert setzen
    const myDeck = prepareMyDeck();

    let hostAI, clientAI;
    let targetContext = 'solo';
    
    if (mode === 'coop') {
        hostAI = getAIDeck();
        clientAI = getAIDeck();
        setCoopAIDecks({ myAI: hostAI, partnerAI: clientAI });
        // FIX: Context sofort für den Host setzen
        if (inviteTargetId) {
            targetContext = 'coop_' + inviteTargetId;
            setRunContext(targetContext);
        }
    }
    
    // FIX: Laufenden Run im gewählten Context abfragen, BEVOR die Connection aufbaut
    const activeSavedRun = allRuns[targetContext];

    const newPeer = new Peer();
    newPeer.on('open', async (id) => {
        setMyPeerId(id);

        // PASSIVE HOSTING MODE: Invite via GhostNetwork → Peer ist offen, aber Host bleibt im Menü
        if (inviteTargetId && session?.user) {
            setPendingOutgoingInvite({ mode, targetId: inviteTargetId });
            try {
                await supabase.from('game_invites').insert({
                    sender_id: session.user.id,
                    receiver_id: inviteTargetId,
                    sender_name: session.user.user_metadata?.username || 'AGENT',
                    mode: mode,
                    peer_id: id
                });
            } catch(e) { console.error("Invite send error:", e); }
            // KEIN setCurrentView hier — Host bleibt frei navigierbar
            return;
        }

        // Normales Hosting ohne Invite → direkt zur Lobby
        setCurrentView('multiplayer');
    });

    newPeer.on('connection', (connection) => {
      // PARTNER IST BEIGETRETEN
      setPendingOutgoingInvite(null);
      playSound('upgrade');

      // Neue Verbindung zum Array hinzufügen
      setHostConnections(prev => [...prev, connection]);
      
      // Damit altes Code-Verhalten (1v1) nicht sofort crasht, setzen wir conn auf den ersten Client
      setConn(prev => prev || connection);

      connection.on('open', () => {
         // HOST IDENTITÄT: Sende Namen mit, um die Run-Signatur zu berechnen
         const myName = session?.user?.user_metadata?.username || 'HOST';
         connection.send({ type: 'DECK_SYNC', chars: myDeck.chars, effs: myDeck.effs, username: myName });
         connection.send({ type: 'LOBBY_INFO', squadSize: targetSquadSize });
         
         // Prüfen, ob unser Squad jetzt voll ist
         const currentClients = hostConnsRef.current.length + 1; // +1 weil State noch asynchron aufholt
         const expectedClients = mode === 'coop' ? targetSquadSize - 1 : 1;
         
         if (currentClients === expectedClients) {
             setIncomingTransmission({ sender: 'SYSTEM', text: `SQUAD KOMPLETT (${targetSquadSize}/${targetSquadSize}). LOBBY BEREIT.` });
         } else {
             setIncomingTransmission({ sender: 'SYSTEM', text: `AGENT VERBUNDEN (${currentClients + 1}/${targetSquadSize}). WARTE...` });
         }
      });
      connection.on('data', (data) => {
        if (data.type === 'LOBBY_START') {
            setIsCoopMode(data.mode.startsWith('coop'));
            if (data.mode === 'coop') {
                setRoguelikeRun(null);
                setCurrentView('roguelikesquad');
            } else if (data.mode === 'coop_resume') {
                setCurrentView('roguelikemap');
            } else {
                setCurrentView('match');
            }
       } else if (data.type === 'DECK_SYNC') {
          setRemoteDeck({ chars: data.chars, effs: data.effs });
      } else if (data.type === 'LOBBY_MODE_UPDATE') {
          setLobbySelectedMode(data.mode);
          hostLobbyReadiesRef.current = {}; // WICHTIG: Dictionary leeren!
          setLobbyClientReadies(0); 
      } else if (data.type === 'LOBBY_READY') {
          // BULLETPROOF: Status pro Spieler im Dictionary speichern
          hostLobbyReadiesRef.current[connection.peer] = data.ready;
          // Alle validen (true) Einträge zählen
          const readyCount = Object.values(hostLobbyReadiesRef.current).filter(Boolean).length;
          setLobbyClientReadies(readyCount);
          // An alle Clients live weiterleiten
          hostConnsRef.current.forEach(c => { 
              if (c.open) c.send({ type: 'LOBBY_READY_COUNT', count: readyCount }); 
          });
      } else if (data.type === 'START_RL_MATCH') {
            setRoguelikeMatchData(data.aiData);
            setCurrentView('match');
        } else if (data.type === 'START_RL_EVENT') {
            setRoguelikeEventData(data.nodeObj);
            setCurrentView('roguelikeevent');
        } else if (data.type === 'SYNC_RUN_STATE') {
            setRoguelikeRun(data.run);
        } else if (data.type === 'SYNC_RUN_PARAMS') {
            setRoguelikeRun(prev => prev ? { ...prev, currentHP: data.hp, sector: data.sector, node: data.node, seed: data.seed } : prev);
        } else if (data.type === 'NAV_TO') {
            setCurrentView(data.view);
        } else if (data.type === 'CLIENT_SQUAD_READY') {
            // BULLETPROOF HOST: Deck fest an die Peer-ID knüpfen!
            hostSquadReadiesRef.current[connection.peer] = data.payload;
            const validPayloads = Object.values(hostSquadReadiesRef.current).filter(Boolean);
            setClientSquadReadies(validPayloads);
        // ── SQUAD MAP ROUTING (FIX: Alle Map-Nachrichten aller Clients zentralisieren) ──
        } else if (['MAP_VOTE', 'MAP_VOTE_SYNC', 'MAP_VOTE_RESOLVE', 'NODE_READY', 'SAFEHOUSE_FUNDING', 'PATH_SYNC', 'ACTION', 'ACTION_CANCEL', 'CLASH_ACK', 'CLASH_CONFIRM', 'EP_SPENT', 'EP_GAIN', 'HP_LOST', 'COOP_CLASH_DAMAGE', 'COOP_AI_DAMAGE', 'TEAM_WIN', 'TRADE_OFFER', 'TRADE_CANCEL', 'TRADE_ACCEPT', 'DESYNC_FIX', 'COOP_MASTER_SNAPSHOT', 'PVP_MASTER_SNAPSHOT', 'HAND_SYNC', 'BARRIER_READY', 'BARRIER_UNLOCK'].includes(data.type)) {
            // 1. An alle ANDEREN Clients weiterleiten (Sender ausschließen)
            hostConnsRef.current.forEach(c => {
                if (c && c.open && c.peer !== connection.peer) c.send({ ...data, _peerId: data._peerId || connection.peer });
            });
            // 2. In den zentralen Inbox pushen, damit die Komponenten des Hosts es verarbeiten
            setSquadMsg({ ...data, _ts: Date.now(), _peerId: data._peerId || connection.peer });
        } else if (data.type === 'CHAT_MESSAGE') {
            handleIncomingChat(data.payload);
        } else if (data.type === 'TRIGGER_FREE_ENCRYPTED') {
            playSound('upgrade');
            setRoguelikeMatchData({ node: data.nodeObj, difficulty: 4, initialAHP: 500 });
            setTimeout(() => {
                handleRoguelikeEndGame({
                    isWin: true,
                    sarcasmNews: { text: "UNBEKANNTE SIGNATUR ENTSCHLÜSSELT... ES IST EIN VERLASSENER CACHE!" },
                    remainingHP: roguelikeRun.currentHP,
                    matchData: { dmgDealt: 0, dmgTaken: 0, highestCrit: 0 }
                });
            }, 100);
        }
      });
      connection.on('close', () => { 
        // FIX: Dynamische Squad-Reduktion statt hartem Abbruch
        if (lobbyMode === 'host') {
          setHostConnections(prev => {
            const next = prev.filter(c => c.peer !== connection.peer);
            const newSize = next.length + 1; // +1 für den Host selbst
            setSquadSize(newSize);
            
            // Informiere die verbleibenden Spieler über die neue Squad-Größe
            next.forEach(c => {
              if (c.open) c.send({ type: 'SQUAD_SIZE_UPDATE', size: newSize, departedPeer: connection.peer });
            });
            
            setIncomingTransmission({ sender: 'SYSTEM', text: `VERBINDUNG VERLOREN. SQUAD-GRÖSSE REDUZIERT AUF ${newSize}.` });
            return next;
          });
        } else if (currentView !== 'postmatch') {
          disconnectPeer(); 
          setCurrentView('menu');
          setConfirmDialog({ message: "VERBINDUNG ZUM HOST UNTERBROCHEN.", onConfirm: () => {} });
        }
      });
    });
    setPeer(newPeer);
  };

  const startJoining = () => {
    if (conn) {
      setConfirmDialog({ message: "BITTE TRENNER DEN AKTUELLEN LINK, BEVOR DU EINEM NEUEN BEITRITTST.", onConfirm: () => {} });
      return;
    }
    if (activeDeck.chars.length !== 12 || activeDeck.effs.length !== 3) {
      alert("Dein aktives Deck ist unvollständig! (12 Chars, 3 Effekte benötigt)");
      return;
    }
    playSound('click');
    setLobbyMode('join');
    prepareMyDeck();
    setPeer(new Peer());
  };

  const connectToHost = () => {
    playSound('click');
    if (!peer || !remotePeerId.trim()) return alert("Bitte eine ID eingeben!");
    const connection = peer.connect(remotePeerId.trim());
    
    connection.on('open', () => {
    setConn(connection);
    // CLIENT IDENTITÄT: Sende Namen mit, um die Run-Signatur zu berechnen
    const myName = session?.user?.user_metadata?.username || 'GUEST';
    connection.send({ type: 'DECK_SYNC', chars: myOnlineDeck.chars, effs: myOnlineDeck.effs, username: myName });
    setCurrentView('multiplayer');
    setIncomingTransmission({ sender: 'SYSTEM', text: 'VERBINDUNG HERGESTELLT. LOBBY BEREIT.' });
  });
    connection.on('data', (data) => {
      if (data.type === 'LOBBY_INFO') {
          setSquadSize(data.squadSize);
      } else if (data.type === 'SQUAD_SIZE_UPDATE') {
          // FIX: Client passt sich an, wenn jemand den Run verlässt
          setSquadSize(data.size);
          setIncomingTransmission({ sender: 'SYSTEM', text: `AGENT DISCONNECTED. SQUAD JETZT: ${data.size} MITGLIEDER.` });
      } else if (data.type === 'LOBBY_READY_COUNT') {
          setLobbyClientReadies(data.count);
      } else if (data.type === 'LOBBY_START') {
          setIsCoopMode(data.mode.startsWith('coop'));
          if (data.mode === 'coop') {
              setRoguelikeRun(null);
              setCurrentView('roguelikesquad');
          } else if (data.mode === 'coop_resume') {
              setCurrentView('roguelikemap');
          } else {
              setCurrentView('match');
          }
      } else if (data.type === 'COOP_INIT') {
          setIsCoopMode(true);
          setRemoteDeck(data.hostDeck);
          setCoopAIDecks({ myAI: data.clientAI });
          setDifficulty(data.difficulty);
      } else if (data.type === 'PVP_INIT') {
          setIsCoopMode(false);
          setRemoteDeck({ chars: data.chars, effs: data.effs });
      } else if (data.type === 'DECK_SYNC') {
          setRemoteDeck({ chars: data.chars, effs: data.effs });
      } else if (data.type === 'START_RL_MATCH') {
          setRoguelikeMatchData(data.aiData);
          setCurrentView('match');
      } else if (data.type === 'START_RL_EVENT') {
          setRoguelikeEventData(data.nodeObj);
          setCurrentView('roguelikeevent');
      } else if (data.type === 'SYNC_RUN_STATE') {
          setRoguelikeRun(data.run);
      } else if (data.type === 'SYNC_RUN_PARAMS') {
            // FIX: Nur Map-Werte updaten, das Deck in Ruhe lassen!
            setRoguelikeRun(prev => prev ? { ...prev, currentHP: data.hp, sector: data.sector, node: data.node, seed: data.seed } : prev);
        } else if (data.type === 'NAV_TO') {
            setCurrentView(data.view);
        } else if (data.type === 'CLIENT_SQUAD_READY') {
            // Client ignoriert dieses Signal, da er nicht den Host spielt!
        // ── CLIENT ROUTING (FIX: Nachrichten vom Host in den Inbox pushen) ──
        } else if (['MAP_VOTE', 'MAP_VOTE_SYNC', 'MAP_VOTE_RESOLVE', 'NODE_READY', 'SAFEHOUSE_FUNDING', 'PATH_SYNC', 'ACTION', 'ACTION_CANCEL', 'CLASH_ACK', 'CLASH_CONFIRM', 'EP_SPENT', 'EP_GAIN', 'HP_LOST', 'COOP_CLASH_DAMAGE', 'COOP_AI_DAMAGE', 'TEAM_WIN', 'TRADE_OFFER', 'TRADE_CANCEL', 'TRADE_ACCEPT', 'DESYNC_FIX', 'COOP_MASTER_SNAPSHOT', 'PVP_MASTER_SNAPSHOT', 'HAND_SYNC', 'BARRIER_READY', 'BARRIER_UNLOCK'].includes(data.type)) {
            setSquadMsg({ ...data, _ts: Date.now(), _peerId: data._peerId });
        } else if (data.type === 'LIGHTHOUSE_BEACON') {
            // FIX: Lighthouse-Alignment - Zwingt das Client-UI auf den Stand des Hosts, falls Desyncs existieren
            setRoguelikeRun(prev => {
                if (!prev && data.runState.fullRun) return data.runState.fullRun; // Absoluter Notfall-Fix für "INITIALISIERE THE GRID"
                if (!prev) return prev;
                // Liegt der Client zurück? Zwinge die Parameter des Hosts auf
                if (prev.node !== data.runState.node || prev.sector !== data.runState.sector || prev.currentHP !== data.runState.hp) {
                    return { ...prev, currentHP: data.runState.hp, sector: data.runState.sector, node: data.runState.node, seed: data.runState.seed };
                }
                return prev;
            });

            if (data.runState.pathHistory && data.runState.seed) {
                localStorage.setItem('aoc_path_' + data.runState.seed, JSON.stringify(data.runState.pathHistory));
                setSquadMsg({ type: 'PATH_SYNC', path: data.runState.pathHistory, _ts: Date.now() });
            }
            
            // Force View-Sync: Holt hängende Clients aus der Lobby / toten Modals auf die Karte
            setCurrentView(prevView => {
                if (data.view === 'roguelikemap' && ['roguelikereward', 'roguelikeevent', 'multiplayer', 'roguelikesquad'].includes(prevView)) {
                    return 'roguelikemap';
                }
                return prevView;
            });
        } else if (data.type === 'CHAT_MESSAGE') {
            handleIncomingChat(data.payload);
        } else if (data.type === 'TRIGGER_FREE_ENCRYPTED') {
          playSound('upgrade');
          setRoguelikeMatchData({ node: data.nodeObj, difficulty: 4, initialAHP: 500 });
          setTimeout(() => {
              handleRoguelikeEndGame({
                  isWin: true,
                  sarcasmNews: { text: "UNBEKANNTE SIGNATUR ENTSCHLÜSSELT... ES IST EIN VERLASSENER CACHE!" },
                  remainingHP: roguelikeRun.currentHP,
                  matchData: { dmgDealt: 0, dmgTaken: 0, highestCrit: 0 }
              });
          }, 100);
      }
    });
    connection.on('close', () => { 
        if (currentView !== 'postmatch') { 
          disconnectPeer(); 
          setCurrentView('menu');
          setConfirmDialog({ message: "HOST HAT DIE VERBINDUNG GESCHLOSSEN.", onConfirm: () => {} });
        }
    });
  };

  const handleCreditGain = (x, y, amount) => {
    playSound('win');
    setCredits(c => c + amount);
    const id = Date.now() + Math.random();
    setFloats(prev => [...prev, { id, x, y, text: `+${amount}💳` }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1500); 
  };

  const handleStatUpdate = (key, amount = 1) => {
    setStats(prev => ({ ...prev, [key]: (prev[key] || 0) + amount }));
  };

  const hasNewCards = inventory.some(c => c.isNew);
  const hasClaimableMissions = missions.some(m => !m.claimed && m.progress >= m.target);
  const hasUpgrades = (() => {
    const groupedLevels = {};
    inventory.forEach(c => {
      // Wir zählen ab jetzt exakt, wie viele Kopien pro Level existieren (wie im Inventar)
      const lvl = c.level || 1;
      if (!groupedLevels[c.name]) groupedLevels[c.name] = {};
      groupedLevels[c.name][lvl] = (groupedLevels[c.name][lvl] || 0) + 1;
    });
    // Punkt leuchtet nur, wenn wir wirklich 3x Level 1 ODER 3x Level 2 haben
    return Object.values(groupedLevels).some(levels => (levels[1] >= 3) || (levels[2] >= 3));
  })();

  const clearNewStatus = (cardName) => {
    setInventory(prev => prev.map(c => (c.name === cardName && c.isNew) ? { ...c, isNew: false } : c));
    setDecks(prev => prev.map(d => ({ ...d, chars: d.chars.map(c => (c.name === cardName && c.isNew) ? { ...c, isNew: false } : c), effs: d.effs.map(c => (c.name === cardName && c.isNew) ? { ...c, isNew: false } : c) })));
  };

  const handleMissionProgress = (type, amount = 1) => {
    setMissions(prev => {
      let changed = false;
      const updated = prev.map(m => {
        if (m.type === type && !m.claimed && m.progress < m.target) { changed = true; return { ...m, progress: Math.min(m.progress + amount, m.target) }; }
        return m;
      });
      return changed ? updated : prev;
    });
  };

  const cycleMission = (id) => {
    playSound('click');
    const now = Date.now();
    const isFree = (now - freeCycleUsedAt) >= 3600000; // 3.600.000 ms = 1 Stunde
    const CYCLE_COST = 50; // Kosten für Reroll ohne Free-Cycle

    if (!isFree && credits < CYCLE_COST) {
      setConfirmDialog({ message: `NICHT GENÜGEND CREDITS. (KOSTEN: ${CYCLE_COST} 💳)`, onConfirm: () => {} });
      return;
    }

    setConfirmDialog({
      message: `MISSION WIRKLICH ABBRECHEN UND NEU AUSWÜRFELN?\n\n${isFree ? '[ KOSTENLOSER REROLL ]' : `[ KOSTEN: ${CYCLE_COST} 💳 ]`}`,
      onConfirm: () => {
        if (!isFree) {
          setCredits(prev => prev - CYCLE_COST);
        } else {
          setFreeCycleUsedAt(now);
          localStorage.setItem('aoc_free_cycle_time', now.toString());
        }

        setMissions(prev => {
          const targetMission = prev.find(m => m.id === id);
          if (!targetMission) return prev;

          // Aktuelle Missionen-IDs filtern, um keine Duplikate zu ziehen
          const currentBaseIds = prev.map(m => m.baseId);
          const available = MISSION_POOL.filter(p => !currentBaseIds.includes(p.baseId));
          const nextMissionTemplate = shuffle(available)[0] || MISSION_POOL[0];

          const newMission = {
            ...nextMissionTemplate,
            id: nextMissionTemplate.baseId + '_' + Date.now() + Math.random(),
            progress: 0,
            claimed: false
          };

          return prev.map(m => m.id === id ? newMission : m);
        });
      }
    });
  };

  const claimMission = (id, e) => {
    playSound('win');
    setMissions(prev => {
      // 1. Die Mission finden, die gerade geclaimed wird
      const targetMission = prev.find(m => m.id === id);
      if (!targetMission || targetMission.progress < targetMission.target || targetMission.claimed) return prev;

      // Belohnung auszahlen
      handleCreditGain(e.clientX, e.clientY, targetMission.reward);

      // 2. Alle anderen Missionen behalten, aber die aktuelle durch eine NEUE aus dem Pool ersetzen
      const currentBaseIds = prev.map(m => m.baseId);
      const available = MISSION_POOL.filter(p => !currentBaseIds.includes(p.baseId));
      const nextMissionTemplate = shuffle(available)[0] || MISSION_POOL[0];

      const newMission = {
        ...nextMissionTemplate,
        id: nextMissionTemplate.baseId + '_' + Date.now() + Math.random(),
        progress: 0,
        claimed: false
      };

      // Tausche nur die eine Mission in der Liste aus
      return prev.map(m => m.id === id ? newMission : m);
    });
  };

  const resetGame = () => {
    playSound('click');
    setConfirmDialog({
      message: "ALLE DATEN LÖSCHEN? DIESER VORGANG IST ENDGÜLTIG!",
      onConfirm: () => {
        localStorage.clear();
        window.location.reload();
      }
    });
  }

  // =================================================================
  // PERFORMANCE BOOST: Bilder im Hintergrund vorladen (Pre-Caching)
  // =================================================================
  useEffect(() => {
    if (!session || !inventory || inventory.length === 0) return;
    
    // Warte 3 Sekunden, damit das UI erst flüssig laden kann
    const timer = setTimeout(() => {
      // Filtere doppelte Karten heraus
      const uniqueCards = [...new Map(inventory.map(c => [c.name, c])).values()];
      
      uniqueCards.forEach(card => {
        if (!card.name) return;
        const isEffect = card.type === 'effect' || card.buff !== undefined;
        let fileName = 'unknown';
        
        // Sicherheits-Check: Falls Name fehlt, überspringen
        if (!card.name) return;

        if (isEffect) {
          fileName = card.name.toLowerCase().replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
        } else {
          const parts = card.name.trim().split(/\s+/);
          let lastName = parts[parts.length - 1];
          if (parts.length > 1 && ['i', 'ii', 'iii', 'iv', 'v', 'jr', 'sr'].includes(lastName.toLowerCase().replace(/[^a-z]/g, ''))) {
            lastName = parts[parts.length - 2];
          }
          fileName = lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '') || 'unknown';
        }

        // Wir feuern alle 3 möglichen Endungen ab, der Browser cacht den Treffer und verwirft den Rest
        const img1 = new Image(); img1.src = `/photos/${isEffect ? 'effects/' : ''}${fileName}.png`;
        const img2 = new Image(); img2.src = `/photos/${isEffect ? 'effects/' : ''}${fileName}.jpg`;
        const img3 = new Image(); img3.src = `/photos/${isEffect ? 'effects/' : ''}${fileName}.jpeg`;
      });
      console.log("🔥 Asset Preloading abgeschlossen: Karten sind im Cache!");
    }, 3000);

    return () => clearTimeout(timer);
  }, [session, inventory]);

  // ── Auth Guard ────────────────────────────────────────────────────────────
  if (session === undefined) return (
    <div style={{position:'fixed',inset:0,background:'#05050a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      {/* MOBILE OPTIMIZATION START: CyberCursor nur auf Nicht-Touch-Geräten */}
      {!isTouchDevice && <CyberCursor />}
      {/* MOBILE OPTIMIZATION END */}
      <div style={{fontFamily:"'Roboto Mono',monospace",color:'var(--win)',fontSize:'0.8rem',letterSpacing:'4px',animation:'pulse 1.5s infinite'}}>
        ⌛ CONNECTING TO NODE...
      </div>
    </div>
  );
  if (!session && !guestMode) return <Auth onGuestLogin={handleGuestLogin} />;

  // ════════════════════════════════════════════════════════════════════════════
  // ── ROGUELIKE STRICT ROUTING (Jetzt als Render-Funktion) ──
  // ════════════════════════════════════════════════════════════════════════════

  const renderRoguelikeView = () => {
    // Erhöhter Z-Index, um über ALLEM (außer dem Cursor) zu liegen
    const scaleStyle = { position: 'relative', zIndex: 9999, pointerEvents: 'auto' };

    
    if (currentView === 'ghostnodemenu') return (
      <div style={scaleStyle}>
        <GhostNodeMenu 
          session={session}
          baseHp={baseHp}
          setBaseHp={updateGlobalHp}
          avatarCard={avatarCard} 
          updateAvatar={updateAvatar} 
          roguelikeRun={roguelikeRun} 
          allRuns={allRuns}
          onGoToLab={() => setCurrentView('avatarlab')} 
          onGoToSquad={() => setCurrentView('roguelikesquad')} 
          onGoToMap={() => setCurrentView('roguelikemap')} 
          onBack={() => setCurrentView('menu')} 
          friends={friends} 
          onInviteDirect={(targetId) => {
            if (conn) {
              setConfirmDialog({ 
                message: "DU BIST BEREITS VERBUNDEN. TRENNER DEN AKTUELLEN LINK ZUERST IM GHOST NETWORK.", 
                onConfirm: () => {} 
              });
              return;
            }
            startHosting('coop', targetId);
          }} 
          onDeleteCoop={(targetId) => {
             if(window.confirm('Diesen Co-Op Run wirklich löschen?')) {
                 playSound('click');
                 setAllRuns(prev => {
                    const next = {...prev};
                    delete next['coop_' + targetId];
                    return next;
                 });
             }
          }}
        />
      </div>
    );

    if (currentView === 'avatarlab') return (
      <div style={scaleStyle}>
        <AvatarLab 
          avatarCard={avatarCard} 
          updateAvatar={updateAvatar} 
          avatars={avatars}
          onUpdateAvatars={setAvatars}
          credits={credits}
          username={username}
          onOpenShop={() => setCurrentView('market')}
          onBack={() => { setCurrentView('ghostnodemenu'); }} 
          onGoToMission={() => { if (roguelikeRun) setCurrentView('roguelikemap'); else setCurrentView('roguelikesquad'); }} 
          allFactions={allFactions} 
        />
      </div>
    );

    if (currentView === 'roguelikesquad') return (
      <div style={scaleStyle}>
        <RoguelikeSquad 
          avatarCard={avatarCard} 
          avatars={avatars}
          onChangeAvatar={updateAvatar}
          inventory={inventory} 
          setInventory={setInventory}
          ghostPresets={ghostPresets}
          setGhostPresets={setGhostPresets}
          onClearNew={clearNewStatus}
          onConfirm={startRoguelikeRunWithDeck} 
          onBack={() => { setCurrentView('ghostnodemenu'); }} 
          isCoop={isCoopMode} 
          isHost={lobbyMode === 'host'} 
          partnerReady={clientSquadReadies.length >= (squadSize - 1)} 
          mySquadReady={mySquadReady} 
        />
      </div>
    );
    
    if (currentView === 'roguelikemap') {
      if (!roguelikeRun) return <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}><div className="mono" style={{ color: 'var(--ep)', fontSize: '1.2rem', animation: 'pulse 1s infinite' }}>INITIALISIERE THE GRID...</div></div>;
      return <RoguelikeMap 
        baseHp={baseHp} 
        avatarCard={avatarCard} 
        roguelikeRun={roguelikeRun} 
        credits={credits}
        onSpendCredits={(amount) => setCredits(c => Math.max(0, c - amount))}
        onStartRun={startRoguelikeRun} 
        onStartBattle={startRoguelikeMatch} 
        onStartEvent={startRoguelikeEvent} 
        onInstantHeal={(percent) => {
          playSound('upgrade');
          setRoguelikeRun(prev => {
            if (!prev) return prev;
            
            // FIX: Desync Protection. Der Client berechnet Map-Updates nicht selbst.
            if (isCoopMode && lobbyMode !== 'host') return prev;

            const healAmount = Math.floor(prev.maxHP * (percent / 100));
            let newHP = Math.min(prev.maxHP, prev.currentHP + healAmount);
            let newNode = prev.node + 1;
            let newSec = prev.sector;
            let newSeed = prev.seed;
            
            if (newNode > 7) { 
                newNode = 1; 
                newSec++; 
                newSeed = Math.random(); 
                const sectorHeal = Math.floor(prev.maxHP * 0.20);
                newHP = Math.min(prev.maxHP, newHP + sectorHeal);
                playSound('upgrade');
            }
            const nextRun = { ...prev, currentHP: newHP, node: newNode, sector: newSec, seed: newSeed };
            saveToCloud({ active_run: { ...allRuns, [runContextRef.current]: nextRun } });
            return nextRun;
          });
        }}
        onUpdateRun={(updatedRun) => {
          playSound('upgrade');
          setRoguelikeRun(updatedRun);
          saveToCloud({ active_run: { ...allRuns, [runContextRef.current]: updatedRun } });
        }}
        onBack={() => { setCurrentView('ghostnodemenu'); }} 
        onGoToLab={() => setCurrentView('avatarlab')} 
        isCoop={isCoopMode} 
        conn={conn} 
        isHost={lobbyMode === 'host'} 
        squadSize={squadSize}
        broadcast={broadcast}
        username={session?.user?.user_metadata?.username || 'AGENT'}
        inboxMessage={squadMsg}
      />;
    }

    if (currentView === 'roguelikeevent' && roguelikeEventData) return (
      <RoguelikeEventScreen 
        nodeObj={roguelikeEventData} 
        roguelikeRun={roguelikeRun} 
        avatarCard={avatarCard} 
        cardsData={cardsData} 
        onComplete={(nextRun, nextAvatar) => {
          playSound('click');
          setRoguelikeRun(nextRun);
          setAvatarCard(nextAvatar);
          setRoguelikeEventData(null);
          saveToCloud({ active_run: { ...allRuns, [runContextRef.current]: nextRun }, avatar_card: nextAvatar });
          setCurrentView('roguelikemap');
        }} 
      />
    );

    if (currentView === 'roguelikereward') return (
      <RoguelikeReward 
        rewardData={rewardData} 
        roguelikeRun={roguelikeRun} 
        squadSize={squadSize}
        broadcast={broadcast}
        onApplyDraft={(card, idx, inList, isUpgrade, isSendToPartner, isSendToBank, chosenAugment) => {
            // FIX: Wir ignorieren isSendToPartner (5. Argument), da alles für uns selbst ist.
            // Wir mappen die Argumente korrekt auf applyRoguelikeDraft (Überspringt das 5. Arg).
            applyRoguelikeDraft(card, idx, inList, isUpgrade, isSendToBank, chosenAugment);
        }}
        onSkip={() => { 
            setRoguelikeRun(prev => {
              if (!prev) return prev;
              // Desync Protection: Nur der Host berechnet Map-Fortschritt
              if (isCoopMode && lobbyMode !== 'host') return prev;

              let newNode = prev.node + 1;
              let newSec = prev.sector;
              let newSeed = prev.seed;
              let newHP = prev.currentHP;
              
              if (newNode > 7) { 
                  newNode = 1; 
                  newSec++; 
                  newSeed = Math.random(); 
                  const healAmount = Math.floor(prev.maxHP * 0.20);
                  newHP = Math.min(prev.maxHP, newHP + healAmount);
                  playSound('upgrade');
              }
              return { ...prev, node: newNode, sector: newSec, seed: newSeed, currentHP: newHP };
            });
            setRewardData(null); 
            setCurrentView('roguelikemap'); 
        }} 
        onFinishRun={() => { 
            setAllRuns(prev => ({ ...prev, [runContextRef.current]: null }));
            setRoguelikeRun(null); 
            setLobbyClientReady(false); // NEU: Ready-State für die Lobby zurücksetzen
            setCurrentView(conn ? 'multiplayer' : 'ghostnodemenu'); 
        }}
        isCoop={isCoopMode} 
        conn={conn}
      />
    );

    if (currentView === 'roguelikefailed') return (
      <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '50px 40px', textAlign: 'center', borderColor: 'var(--lose)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💀</div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '2.5rem', fontWeight: 900, letterSpacing: '6px', color: 'var(--lose)', textShadow: '0 0 30px rgba(255,0,50,0.5)', marginBottom: '8px' }}>RUN FAILED</div>
          <div className="mono" style={{ color: '#ff6680', fontSize: '0.72rem', letterSpacing: '3px', marginBottom: '26px' }}>AGENT KOMPROMITTIERT — SYSTEM COLLAPSED</div>
          <button className="menu-btn btn-play modern-btn" onClick={() => { setAllRuns(prev => ({ ...prev, [runContextRef.current]: null })); if (conn) setCurrentView('multiplayer'); else setCurrentView('ghostnodemenu'); }}>ZURÜCK ZUR LOBBY</button>
        </div>
      </div>
    );

    return null;
  };

  // ════════════════════════════════════════════════════════════════════════════

  const startMatchFlow = () => {
    playSound('click');
    if (activeDeck.chars.length !== 12 || activeDeck.effs.length !== 3) {
      alert(`Dein aktives Deck (${activeDeck.name}) ist unvollständig!`);
      return;
    }
    setCurrentView('difficulty'); 
  };

  const getAIDeck = () => {
    const lvl = DIFFICULTY_CONFIG[difficulty].lvl;
    let baseChars, baseEffs;
    
    if (difficulty === 1) {
      baseChars = shuffle(cardsData.characters).slice(0, 12);
    } else if (difficulty === 2) {
      const f = shuffle(allFactions).find(f => cardsData.characters.filter(c => c.faction === f).length >= 3) || allFactions[0];
      const syn = cardsData.characters.filter(c => c.faction === f).slice(0, 3);
      const other = shuffle(cardsData.characters.filter(c => c.faction !== f)).slice(0, 9);
      baseChars = shuffle([...syn, ...other]);
    } else if (difficulty === 3) {
      const f1 = shuffle(allFactions).find(f => cardsData.characters.filter(c => c.faction === f).length >= 3) || allFactions[0];
      const f2 = shuffle(allFactions).find(f => f !== f1 && cardsData.characters.filter(c => c.faction === f).length >= 3) || allFactions[1];
      const syn1 = cardsData.characters.filter(c => c.faction === f1).slice(0, 3);
      const syn2 = cardsData.characters.filter(c => c.faction === f2).slice(0, 3);
      const other = shuffle(cardsData.characters.filter(c => c.faction !== f1 && c.faction !== f2)).slice(0, 6);
      baseChars = shuffle([...syn1, ...syn2, ...other]);
    } else {
      // Architect: Maximal optimiert, füllt mit Top-Stats
      let meta = [];
      shuffle(allFactions).forEach(f => {
        if (meta.length < 12) {
           const fc = cardsData.characters.filter(c => c.faction === f).sort((a,b)=> (b.gti||0)-(a.gti||0));
           if (fc.length >= 3) meta.push(...fc.slice(0,3));
        }
      });
      const top = cardsData.characters.filter(c => c.type === 'apex' || c.type === 'legacy').sort((a,b)=> (b.gti||0)-(a.gti||0)).slice(0, 3);
      baseChars = [...new Set([...meta, ...top])].slice(0, 12);
      if (baseChars.length < 12) baseChars = [...baseChars, ...cardsData.characters.filter(c => !baseChars.includes(c)).sort((a,b)=> (b.gti||0)-(a.gti||0))].slice(0,12);
    }

    baseChars = baseChars.map(c => ({...c, level: lvl}));
    baseEffs = [...cardsData.effects].sort((a,b) => (b.buff||0) - (a.buff||0)).slice(0, 3).map(e => ({...e, level: lvl}));
    return { chars: baseChars, effs: baseEffs };
  };

  const aiDeck = getAIDeck();

  // Globale Theme-Farbe für den Matrix-Hintergrund bestimmen
  const getThemeColor = (view) => {
    // Erkennt ALLE Ghost Node Untermenüs und färbt sie Lila/Pink
    if (['ghostnodemenu', 'avatarlab', 'roguelikesquad', 'roguelikemap', 'roguelikeevent', 'roguelikereward', 'roguelikefailed'].includes(view)) {
      return '#bc13fe'; 
    }
    return '#00e5ff'; // Einheitliches Cyan für alle anderen Screens
  };

  const isGhostNodeMode = ['ghostnodemenu', 'avatarlab', 'roguelikesquad', 'roguelikemap', 'roguelikeevent', 'roguelikereward', 'roguelikefailed'].includes(currentView);

  return (
    <div style={{ '--matrix-col': getThemeColor(currentView), height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>

      {/* GLOBALE CYBER-BACKGROUND (Hex Grid) */}
      <CyberBackground color={getThemeColor(currentView)} />

      {/* GHOST NODE BINARY RAIN (1 und 0 Regen) */}
      {isGhostNodeMode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
          {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(i=>(
            <div key={i} className="binary-rain-col" style={{left:`${2+i*7}%`,'--dur':`${8+Math.random()*5}s`,'--delay':`${Math.random()*2}s`}}>
              {Array.from({length:20},()=>Math.random()>.5?'1':'0').join('\n')}
            </div>
          ))}
        </div>
      )}
      
      {/* GLOBALE SCANLINES (Sicherheits-Check: Klicks durchlassen) */}
      <div className="rl-scanline-overlay" style={{ pointerEvents: 'none', zIndex: 5 }} />

      {/* HIER WERDEN DIE ROGUELIKE-VIEWS JETZT GELADEN */}
      {renderRoguelikeView()}

      {floats.map(ft => (
         <div key={ft.id} className={`money-popup ${ft.isAch ? 'ach-popup' : ''}`} style={ft.isAch ? {} : { left: ft.x, top: ft.y }}>{ft.text}</div>
      ))}

      {showGlobalRules && (
        <div className="glass-overlay" style={{ zIndex: 999999, pointerEvents: 'auto' }}>
          <div className="rules-box" style={{ maxWidth: '800px' }}>
            <div className="rules-header">PROTOKOLL: KAMPF-LOGIK V2.0</div>
            <div className="rules-content">
              
              <div className="rules-section">
                <h3>SCHADENS-MATRIX (MULTIPLIKATOREN)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '0.8rem', textAlign: 'center' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #444', color: 'var(--ep)' }}>
                      <th style={{ padding: '10px' }}>ANGRIFF</th>
                      <th style={{ padding: '10px' }}>vs. BLOCKEN</th>
                      <th style={{ padding: '10px' }}>vs. KONTER (Sieg)</th>
                      <th style={{ padding: '10px' }}>vs. KONTER (Loss)</th>
                    </tr>
                  </thead>
                  <tbody className="mono">
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '10px', color: 'var(--win)' }}>STANDARD</td>
                      <td style={{ padding: '10px' }}>Diff x 1.5</td>
                      <td style={{ padding: '10px' }}>Diff x 1.5</td>
                      <td style={{ padding: '10px', color: 'var(--lose)' }}>Recoil x 2.0</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px', color: 'var(--lose)' }}>ALL-IN</td>
                      <td style={{ padding: '10px' }}>Diff x 3.0</td>
                      <td style={{ padding: '10px' }}>Diff x 4.0</td>
                      <td style={{ padding: '10px', color: 'var(--lose)', fontWeight: 'bold' }}>Recoil x 5.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                <div className="rules-section">
                  <h3 style={{ color: '#bc13fe' }}>ERHOLEN (+2⚡)</h3>
                  <p className="mono" style={{ fontSize: '0.65rem', lineHeight: '1.4' }}>
                    ▸ Erleidet (Gegner - Du) x 2.0 Schaden, falls Gegner stärker.<br/>
                    ▸ Block & Konter verhalten sich dabei gleich (Diff x 2.0).<br/>
                    ▸ Gegner-Konter erstattet dessen 6⚡ zurück.
                  </p>
                </div>
                <div className="rules-section">
                  <h3 style={{ color: 'var(--win)' }}>CO-OP TRANSFER</h3>
                  <p className="mono" style={{ fontSize: '0.65rem', lineHeight: '1.4' }}>
                    ▸ Tausch hat 5 Runden Cooldown.<br/>
                    ▸ Getauschte Karten werden auf Level 1 gesetzt.
                  </p>
                </div>
              </div>

            </div>
            <button className="menu-btn" style={{ borderColor: 'var(--lose)', color: 'var(--lose)', marginTop: '20px' }} onClick={() => setShowGlobalRules(false)}>
              SYSTEM-EXIT
            </button>
          </div>
        </div>
      )}

      {currentView === 'match' && (
        roguelikeMatchData ? (
          /* ── ROGUELIKE MATCH ─── */
          <MatchEngine
                    playerChars={roguelikeRun.runDeck.chars}
                    playerEffs={roguelikeRun.runDeck.effs}
                    aiChars={roguelikeMatchData.aiChars}
                    aiEffs={roguelikeMatchData.aiEffs}
                    
                    /* NEU: CO-OP PROPS FÜR DEN GHOST NODE RUN */
                    partnerChars={conn && isCoopMode ? (remoteDeck?.chars || []) : null}
                    partnerEffs={conn && isCoopMode ? (remoteDeck?.effs || []) : null}
                    isOnline={!!conn}
                    isCoop={roguelikeRun.isCoop} /* FIX: Nutzt zwingend den Run-State, ignoriert veraltete globale Flags! */
                    conn={conn}
                    isHost={lobbyMode === 'host'}
                    squadSize={squadSize}
                    broadcast={broadcast}
                    inboxMessage={squadMsg}
                    username={session?.user?.user_metadata?.username || 'AGENT'}
                    difficulty={roguelikeMatchData.difficulty}
                    isRoguelike={true}
                    contextLabel={`SEKTOR ${roguelikeRun.sector} // NODE ${roguelikeRun.node}`}
                    augments={roguelikeRun.augments || []}
                    sectorFaction={getSectorFaction(roguelikeRun.sector, roguelikeRun.seed)}
            initialPHP={roguelikeRun.currentHP}
            initialAHP={roguelikeMatchData.initialAHP}
            onEndGame={handleRoguelikeEndGame}
            onShowRules={() => { playSound('click'); setShowGlobalRules(true); }}
            onShowSettings={() => { playSound('click'); setShowSettings(true); }}
            onConfirmAction={setConfirmDialog}
            onTrade={handleMidMatchTrade} // NEU: RunDeck bei Tausch anpassen
          />
        ) : (
          /* ── MULTIPLAYER & SOLO MATCH ENGINE ─── */
          <MatchEngine
            playerChars={conn ? (myOnlineDeck?.chars || []) : shuffle(activeDeck.chars)}
            playerEffs={conn ? (myOnlineDeck?.effs || []) : shuffle(activeDeck.effs)}
            aiChars={conn ? (isCoopMode ? (coopAIDecks?.myAI?.chars || []) : (remoteDeck?.chars || [])) : (aiDeck?.chars || [])}
            aiEffs={conn ? (isCoopMode ? (coopAIDecks?.myAI?.effs || []) : (remoteDeck?.effs || [])) : (aiDeck?.effs || [])}
            partnerChars={conn && isCoopMode ? (remoteDeck?.chars || []) : []}
            partnerEffs={conn && isCoopMode ? (remoteDeck?.effs || []) : []}
            difficulty={difficulty}
            initialPHP={normalPlayerHp}
            initialAHP={normalEnemyHp}
            isOnline={!!conn}
            isCoop={!!conn && isCoopMode} /* FIX: Ist nur Co-Op, wenn auch wirklich eine P2P Verbindung besteht */
            isHost={lobbyMode === 'host'}
            conn={conn}
            squadSize={squadSize}
            broadcast={broadcast}
            inboxMessage={squadMsg}
            username={session?.user?.user_metadata?.username || 'AGENT'}
            onEndGame={handleEndGame}
            onShowRules={() => { playSound('click'); setShowGlobalRules(true); }}
            onShowSettings={() => { playSound('click'); setShowSettings(true); }}
            onConfirmAction={setConfirmDialog}
          />
        )
      )}

      {/* Alter Admin-Slider wurde entfernt und in das DEV.MODE Panel integriert */}

      {currentView === 'multiplayer' && (
        <div className="screen active" style={{ display: 'flex', flexDirection: 'column', padding: '0', background: 'radial-gradient(circle at 50% 50%, rgba(5,5,15,0.95) 0%, #000 100%)', overflow: 'hidden' }}>
          {/* Top Bar - Clean */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.5)', zIndex: 10 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--win)', animation: 'pulse 1.5s infinite', boxShadow: '0 0 15px var(--win)' }} />
                <div>
                   <div className="game-title-small" style={{ color: 'var(--win)', margin: 0, letterSpacing: '4px' }}>NEURAL BRIDGE ACTIVE</div>
                   <div className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px' }}>
                      MODE: {lobbySelectedMode === 'pvp' ? '1V1 NEURAL DUELL' : (squadSize === 3 ? '3P APEX COMMAND' : '2P SQUAD INFILTRATION')}
                   </div>
                </div>
             </div>
             <button className="btn-back" onClick={disconnectPeer}>TERMINATE LINK ✕</button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflowY: 'auto', padding: '40px 0' }}>
             {/* Center Glow */}
             <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', height: '500px', background: lobbySelectedMode === 'pvp' ? 'radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(188,19,254,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

             {lobbyMode === 'host' && (
                 <div className="mono" style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', border: '1px solid #333', padding: '8px 20px', borderRadius: '20px', color: '#888', fontSize: '0.75rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 0 20px rgba(0,0,0,0.8)' }}>
                    <span>HOST_ID:</span>
                    <span style={{ color: '#fff', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer' }} onClick={(e)=>{navigator.clipboard.writeText(myPeerId); e.target.style.color='#00ff44'; setTimeout(()=>e.target.style.color='#fff',1000);}} title="Klick zum Kopieren">{myPeerId || 'GENERIEREN...'}</span>
                 </div>
             )}

             <div style={{ display: 'flex', gap: squadSize === 3 ? '4vw' : '8vw', alignItems: 'center', zIndex: 1, width: '100%', maxWidth: '1200px', justifyContent: 'center', marginTop: lobbyMode === 'host' ? '40px' : '0' }}>
                 
                 {/* SLOT 1: HOST */}
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: -10, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '50%', animation: 'spin-slow 15s linear infinite' }} />
                        <CyberAvatar username={lobbyMode === 'host' ? session?.user?.user_metadata?.username : 'HOST'} size={120} />
                        {lobbyMode === 'host' && <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#00ff44', color: '#000', fontSize: '0.6rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', boxShadow: '0 0 10px #00ff44' }}>READY</div>}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--win)', letterSpacing: '2px' }}>SLOT 1 // HOST</div>
                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>
                            {lobbyMode === 'host' ? session?.user?.user_metadata?.username : 'HOST SYSTEM'}
                        </div>
                    </div>
                 </div>

                 {/* CONNECTOR LINE */}
                 <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.1)', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: '200px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#000', border: `2px solid ${lobbySelectedMode === 'pvp' ? 'var(--win)' : '#bc13fe'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: `0 0 20px ${lobbySelectedMode === 'pvp' ? 'rgba(0,229,255,0.4)' : 'rgba(188,19,254,0.4)'}`, zIndex: 2 }}>
                        {lobbySelectedMode === 'pvp' ? '⚔️' : '🔗'}
                    </div>
                    {/* Animated Data Flow */}
                    <div style={{ position: 'absolute', top: -1, left: 0, height: '4px', width: '20px', background: 'var(--win)', filter: 'blur(2px)', animation: 'slideInRight 2s infinite linear' }} />
                 </div>

                 {/* SLOT 2: GUEST 1 */}
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: -10, border: `1px dashed ${(hostConnsRef.current.length >= 1 || lobbyMode === 'join') ? 'rgba(0,255,68,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '50%', animation: 'spin-slow 15s linear infinite reverse' }} />
                        {(hostConnsRef.current.length >= 1 || lobbyMode === 'join') ? (
                           <CyberAvatar username={lobbyMode === 'join' ? session?.user?.user_metadata?.username : 'GUEST'} size={120} />
                        ) : (
                           <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#333' }}>?</div>
                        )}
                        
                        {/* Ready Badge Logic for Slot 2 */}
                        {((lobbyMode === 'host' && lobbyClientReadies >= 1) || (lobbyMode === 'join' && lobbyClientReady)) && (
                            <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#00ff44', color: '#000', fontSize: '0.6rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', boxShadow: '0 0 10px #00ff44' }}>READY</div>
                        )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div className="mono" style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '2px' }}>SLOT 2 // GUEST</div>
                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.8rem', fontWeight: 900, color: (hostConnsRef.current.length >= 1 || lobbyMode === 'join') ? '#fff' : '#444' }}>
                            {lobbyMode === 'join' ? session?.user?.user_metadata?.username : (hostConnsRef.current.length >= 1 ? 'AGENT CONNECTED' : 'AWAITING LINK...')}
                        </div>
                    </div>
                 </div>

                 {/* SLOT 3: GUEST 2 (If 3P) */}
                 {squadSize === 3 && (
                   <>
                     {/* CONNECTOR LINE 2 */}
                     <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.1)', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: '200px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#000', border: '2px solid var(--apex-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 20px rgba(255,0,127,0.4)', zIndex: 2 }}>
                            🔥
                        </div>
                        <div style={{ position: 'absolute', top: -1, left: 0, height: '4px', width: '20px', background: 'var(--apex-pink)', filter: 'blur(2px)', animation: 'slideInRight 2.5s infinite linear' }} />
                     </div>

                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', inset: -10, border: `1px dashed ${hostConnsRef.current.length >= 2 ? 'rgba(0,255,68,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '50%', animation: 'spin-slow 15s linear infinite' }} />
                            {hostConnsRef.current.length >= 2 ? (
                               <CyberAvatar username="GUEST 2" size={120} />
                            ) : (
                               <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#333' }}>?</div>
                            )}
                            
                            {/* Ready Badge Logic for Slot 3 */}
                            {lobbyMode === 'host' && lobbyClientReadies >= 2 && (
                                <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#00ff44', color: '#000', fontSize: '0.6rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', boxShadow: '0 0 10px #00ff44' }}>READY</div>
                            )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div className="mono" style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '2px' }}>SLOT 3 // GUEST</div>
                            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.8rem', fontWeight: 900, color: hostConnsRef.current.length >= 2 ? '#fff' : '#444' }}>
                                {hostConnsRef.current.length >= 2 ? 'AGENT CONNECTED' : 'AWAITING LINK...'}
                            </div>
                        </div>
                     </div>
                   </>
                 )}
             </div>

             {/* SYNC STATUS & CONTROLS */}
             <div style={{ marginTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '600px', zIndex: 10 }}>
                 {!remoteDeck && lobbyMode === 'join' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                       <div className="mono" style={{ color: 'var(--win)', fontSize: '1rem', letterSpacing: '4px', animation: 'pulse 1s infinite' }}>SYNCING NEURAL ASSETS...</div>
                       <div style={{ width: '300px', height: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                          <div style={{ width: '50%', height: '100%', background: 'var(--win)', animation: 'slideInRight 1s infinite linear' }} />
                       </div>
                    </div>
                 ) : (
                    <>
                       {/* Control Buttons */}
                       {lobbyMode === 'host' ? (
                           <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                               {lobbySelectedMode === 'coop' && roguelikeRun && (
                                   <button className="menu-btn" style={{ borderColor: '#bc13fe', color: '#bc13fe', width: '100%', padding: '15px', background: 'rgba(188,19,254,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }} onClick={() => {
                                       playSound('click');
                                       // SOUVERÄNER HOST: Zwingt seinen Spielstand und Map-Pfad auf alle Clients vor dem Start
                                       const currentPath = JSON.parse(localStorage.getItem('aoc_path_' + roguelikeRun.seed) || '[]');
                                       broadcast({ type: 'SYNC_RUN_STATE', run: roguelikeRun, pathHistory: currentPath });
                                       broadcast({ type: 'LOBBY_START', mode: 'coop_resume' });
                                       setCurrentView('roguelikemap');
                                   }}>
                                       <span style={{ fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '2px' }}>▸ SQUAD RUN FORTSETZEN (SEKTOR {roguelikeRun.sector})</span>
                                       <span className="mono" style={{ fontSize: '0.65rem', color: '#888' }}>SIGNATUR: {lobbyMembers.join(' + ').toUpperCase()}</span>
                                   </button>
                               )}

                               {/* NEU: DIRECT SQUAD INVITES */}
                               <div style={{ width: '100%', background: 'rgba(0,0,0,0.6)', border: '1px solid #333', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <div className="mono" style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '2px', textAlign: 'left' }}>▸ QUICK INVITE SQUAD</div>
                                  
                                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                                     {friends.length === 0 ? (
                                        <div className="mono" style={{ color: '#555', fontSize: '0.7rem', padding: '10px 0' }}>KEINE AGENTEN IN DEINER KONTAKTLISTE.</div>
                                     ) : (
                                        [...friends].sort((a, b) => (onlineUsers[a.id] ? -1 : 1)).map(f => {
                                           const isOnline = onlineUsers[f.id] === 'menu' || onlineUsers[f.id] === 'ingame';
                                           const isSent = sentLobbyInvites.has(f.id);
                                           
                                           return (
                                              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '8px 15px', borderRadius: '6px', border: `1px solid ${isSent ? 'var(--win)' : '#333'}`, flexShrink: 0 }}>
                                                 <CyberAvatar username={f.username} size={30} />
                                                 <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: '90px' }}>
                                                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.1rem', color: isOnline ? '#fff' : '#888', fontWeight: 'bold' }}>{f.username}</span>
                                                    <span className="mono" style={{ fontSize: '0.5rem', color: isOnline ? '#00ff44' : '#555' }}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                                                 </div>
                                                 <button 
                                                    onClick={async () => {
                                                       if (isSent) return;
                                                       playSound('click');
                                                       setSentLobbyInvites(prev => new Set(prev).add(f.id));
                                                       try {
                                                          await supabase.from('game_invites').insert({
                                                             sender_id: session.user.id,
                                                             receiver_id: f.id,
                                                             sender_name: session.user.user_metadata?.username || 'AGENT',
                                                             mode: lobbySelectedMode,
                                                             peer_id: myPeerId
                                                          });
                                                       } catch(e) {}
                                                    }}
                                                    style={{ 
                                                        marginLeft: '5px', 
                                                        background: isSent ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.1)', 
                                                        border: `1px solid ${isSent ? 'var(--win)' : '#555'}`, 
                                                        color: isSent ? 'var(--win)' : '#ccc', 
                                                        padding: '4px 10px', fontSize: '0.65rem', 
                                                        fontFamily: "'Roboto Mono', monospace", 
                                                        cursor: isSent ? 'default' : 'pointer',
                                                        borderRadius: '4px', transition: '0.2s'
                                                    }}
                                                    onMouseEnter={e => { if(!isSent) { e.currentTarget.style.background = 'var(--win)'; e.currentTarget.style.color = '#000'; } }}
                                                    onMouseLeave={e => { if(!isSent) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#ccc'; } }}
                                                 >
                                                    {isSent ? 'GESENDET ✓' : '+ INVITE'}
                                                 </button>
                                              </div>
                                           );
                                        })
                                     )}
                                  </div>
                               </div>

                               <button 
                                  className="space-action-btn" 
                                  disabled={lobbyClientReadies < (lobbySelectedMode === 'pvp' ? 1 : squadSize - 1)} 
                                  onClick={() => {
                                      playSound('upgrade');
                                      setIsCoopMode(lobbySelectedMode === 'coop');
                                      if (lobbySelectedMode === 'coop') {
                                          if (roguelikeRun && !window.confirm('Einen neuen Run starten? Der aktuelle Fortschritt wird überschrieben.')) return;
                                          setRoguelikeRun(null);
                                          const hostAI = getAIDeck();
                                          const clientAI = getAIDeck();
                                          setCoopAIDecks({ myAI: hostAI, partnerAI: clientAI });
                                          broadcast({ type: 'COOP_INIT', hostDeck: prepareMyDeck(), clientAI: clientAI, difficulty: difficulty });
                                          broadcast({ type: 'LOBBY_START', mode: 'coop' });
                                          setCurrentView('roguelikesquad');
                                      } else {
                                          const myDeck = prepareMyDeck();
                                          broadcast({ type: 'PVP_INIT', chars: myDeck.chars, effs: myDeck.effs });
                                          broadcast({ type: 'LOBBY_START', mode: 'pvp' });
                                          setCurrentView('match');
                                      }
                                  }} 
                                  style={{ 
                                      width: '100%', padding: '24px',
                                      opacity: lobbyClientReadies >= (lobbySelectedMode === 'pvp' ? 1 : squadSize - 1) ? 1 : 0.4, 
                                      cursor: lobbyClientReadies >= (lobbySelectedMode === 'pvp' ? 1 : squadSize - 1) ? 'pointer' : 'not-allowed',
                                      background: lobbyClientReadies >= (lobbySelectedMode === 'pvp' ? 1 : squadSize - 1) ? 'rgba(0,255,68,0.15)' : 'rgba(0,0,0,0.5)',
                                      border: `2px solid ${lobbyClientReadies >= (lobbySelectedMode === 'pvp' ? 1 : squadSize - 1) ? '#00ff44' : '#333'}`,
                                      color: lobbyClientReadies >= (lobbySelectedMode === 'pvp' ? 1 : squadSize - 1) ? '#00ff44' : '#666',
                                      fontFamily: "'Roboto Mono', monospace", fontSize: '1.4rem', fontWeight: 900, letterSpacing: '4px',
                                      boxShadow: lobbyClientReadies >= (lobbySelectedMode === 'pvp' ? 1 : squadSize - 1) ? '0 0 30px rgba(0,255,68,0.3)' : 'none',
                                      transition: 'all 0.3s'
                                  }}>
                                   {lobbyClientReadies >= (lobbySelectedMode === 'pvp' ? 1 : squadSize - 1) ? 'ENGAGE PROTOCOL ▸' : `AWAITING SQUAD (${lobbyClientReadies}/${lobbySelectedMode === 'pvp' ? 1 : squadSize - 1})`}
                               </button>
                           </div>
                       ) : (
                           <button 
                              className="space-action-btn" 
                              style={{ 
                                  width: '100%', padding: '24px',
                                  background: lobbyClientReady ? 'rgba(0,255,68,0.15)' : 'rgba(0,0,0,0.5)', 
                                  border: `2px solid ${lobbyClientReady ? '#00ff44' : '#888'}`, 
                                  color: lobbyClientReady ? '#00ff44' : '#ccc', 
                                  fontFamily: "'Roboto Mono', monospace", fontSize: '1.4rem', fontWeight: 900, letterSpacing: '4px',
                                  boxShadow: lobbyClientReady ? '0 0 30px rgba(0,255,68,0.3)' : 'none',
                                  transition: 'all 0.3s', cursor: 'pointer'
                              }} 
                              onClick={() => {
                                  playSound('click');
                                  const newReady = !lobbyClientReady;
                                  setLobbyClientReady(newReady);
                                  conn.send({ type: 'LOBBY_READY', ready: newReady });
                                  if (newReady) {
                                      const freshDeck = prepareMyDeck();
                                      conn.send({ type: 'DECK_SYNC', chars: freshDeck.chars, effs: freshDeck.effs });
                                  }
                              }}>
                               {lobbyClientReady ? '✓ BEREITSCHAFT BESTÄTIGT' : 'BEREIT MELDEN ▸'}
                           </button>
                       )}
                    </>
                 )}
             </div>
          </div>
        </div>
      )}

      {currentView === 'postmatch' && lastMatch && (
        <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '50px', textAlign: 'center', borderColor: lastMatch.isWin ? 'var(--win)' : 'var(--lose)' }}>
            <h1 style={{ fontSize: '3rem', color: lastMatch.isWin ? 'var(--win)' : 'var(--lose)', letterSpacing: '4px' }}>
              {lastMatch.isWin ? 'MISSION ERFOLGREICH' : 'SYSTEMVERSAGEN'}
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#ccc', margin: '30px 0' }}>"{lastMatch.news}"</p>
            <div className="mono" style={{ fontSize: '2.5rem', color: 'var(--ep)', fontWeight: 'bold', margin: '40px 0' }}>
              +{lastMatch.reward} 💳
            </div>
            <button className="menu-btn btn-play modern-btn" onClick={() => conn ? setCurrentView('multiplayer') : setCurrentView('menu')}>ZURÜCK ZUR LOBBY</button>
          </div>
        </div>
      )}

      {currentView === 'missions' && (() => {
        const isFreeCycleAvailable = (Date.now() - freeCycleUsedAt) >= 3600000;
        return (
        <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="game-title-small" style={{ fontSize: '2rem', marginBottom: '30px' }}>AKTUELLE MISSIONEN</div>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
              {missions.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '18px 20px', borderRadius: '6px', borderLeft: m.claimed ? '3px solid #555' : (m.progress >= m.target ? '3px solid var(--win)' : '3px solid var(--r-epi)') }}>
                   <div style={{ opacity: m.claimed ? 0.5 : 1, textAlign: 'left', flex: 1, minWidth: 0, paddingRight: '15px' }}>
                      <div style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 'bold' }}>{m.desc}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                         <div className="mono" style={{ fontSize: '0.85rem', color: '#aaa', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px' }}>
                           {m.progress} / {m.target}
                         </div>
                         {!m.claimed && m.progress < m.target && (
                            <button 
                              onClick={() => cycleMission(m.id)}
                              style={{
                                background: 'transparent', 
                                border: `1px solid ${isFreeCycleAvailable ? 'rgba(0, 229, 255, 0.4)' : '#333'}`, 
                                borderRadius: '4px',
                                color: isFreeCycleAvailable ? 'var(--win)' : '#777',
                                padding: '4px 10px', 
                                fontSize: '0.65rem', 
                                cursor: 'pointer',
                                fontFamily: "'Roboto Mono', monospace", 
                                transition: 'all 0.2s',
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                boxShadow: isFreeCycleAvailable ? '0 0 10px rgba(0, 229, 255, 0.1)' : 'none'
                              }}
                              onMouseEnter={(e) => { 
                                  e.currentTarget.style.background = isFreeCycleAvailable ? 'rgba(0, 229, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'; 
                                  e.currentTarget.style.color = '#fff'; 
                                  e.currentTarget.style.borderColor = isFreeCycleAvailable ? 'var(--win)' : '#666'; 
                              }}
                              onMouseLeave={(e) => { 
                                  e.currentTarget.style.background = 'transparent'; 
                                  e.currentTarget.style.color = isFreeCycleAvailable ? 'var(--win)' : '#777'; 
                                  e.currentTarget.style.borderColor = isFreeCycleAvailable ? 'rgba(0, 229, 255, 0.4)' : '#333'; 
                              }}
                            >
                              <span style={{ fontSize: '0.8rem' }}>↻</span> {isFreeCycleAvailable ? 'FREE REROLL' : 'REROLL (50 💳)'}
                            </button>
                         )}
                      </div>
                   </div>
                   <div style={{ flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'right' }}>
                     {!m.claimed && m.progress >= m.target ? (
                        <button className="btn-info" style={{ borderColor: 'var(--win)', color: 'var(--win)', padding: '10px 18px', fontSize: '0.85rem', background: 'rgba(0,229,255,0.1)' }} onClick={(e) => claimMission(m.id, e)}>CLAIM +{m.reward}</button>
                     ) : (
                        <div className="mono" style={{ color: m.claimed ? '#555' : 'var(--ep)', fontSize: '1.2rem', fontWeight: 'bold' }}>{m.claimed ? 'CLAIMED' : `+${m.reward} 💳`}</div>
                     )}
                   </div>
                </div>
              ))}
            </div>
            <button className="menu-btn" style={{ borderColor: '#444', color: '#888' }} onClick={() => setCurrentView('menu')}>ZURÜCK ZUR ZENTRALE</button>
          </div>
        </div>
        );
      })()}

      {currentView === 'stats' && (
        <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="game-title-small" style={{ fontSize: '2rem', marginBottom: '30px' }}>SYSTEM STATISTIKEN</div>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '40px' }}>
             <div className="stats-dashboard-grid">
                <div className="stat-pod" style={{ '--pod-color': 'var(--win)' }}>
                  <div className="stat-pod-title">ERFOLGREICHE MISSIONEN</div>
                  <div className="stat-pod-val">{stats.wins}</div>
                </div>
                <div className="stat-pod" style={{ '--pod-color': 'var(--lose)' }}>
                  <div className="stat-pod-title">SYSTEMVERSAGEN</div>
                  <div className="stat-pod-val">{stats.losses}</div>
                </div>
                <div className="stat-pod stat-pod-wide" style={{ '--pod-color': 'var(--ep)' }}>
                  <div className="stat-pod-title">GLOBALE SIEGRATE</div>
                  <div className="stat-pod-val">{stats.wins + stats.losses > 0 ? Math.round((stats.wins / (stats.wins + stats.losses))*100) : 0}%</div>
                  <div className="stat-progress-bg">
                    <div className="stat-progress-fill" style={{ width: `${stats.wins + stats.losses > 0 ? Math.round((stats.wins / (stats.wins + stats.losses))*100) : 0}%`, background: 'var(--ep)' }}></div>
                  </div>
                </div>
                <div className="stat-pod" style={{ '--pod-color': 'var(--apex-pink)' }}>
                  <div className="stat-pod-title">ARCHITECTS ELIMINIERT</div>
                  <div className="stat-pod-val">{stats.bossDefeats || 0}</div>
                </div>
                <div className="stat-pod" style={{ '--pod-color': '#fff' }}>
                  <div className="stat-pod-title">DATACACHES DECRYPTED</div>
                  <div className="stat-pod-val">{stats.packsOpened || 0}</div>
                </div>
             </div>
             <button className="menu-btn" style={{ borderColor: '#444', color: '#888' }} onClick={() => setCurrentView('menu')}>ZURÜCK ZUR ZENTRALE</button>
          </div>
        </div>
      )}
      {currentView === 'leaderboard' && (
        <div style={{ width: '100%', height: '100%' }}>
           <Leaderboard credits={credits} username={session?.user?.user_metadata?.username} onOpenShop={() => setCurrentView('market')} onBack={() => setCurrentView('menu')} />
        </div>
      )}
      {currentView === 'lexicon' && (
        <div className="screen active lex-screen" style={{ display: 'block', padding: '0 30px 30px 30px', overflowY: 'auto' }}>

          {/* Sticky Top-Bar mit integriertem HUD */}
          <div className="top-bar" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5, 5, 8, 0.95)', padding: '20px 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            
            {/* LINKE SEITE: Archiv-Tabs & Suche */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                <div 
                  className="game-title-small" 
                  style={{ cursor: 'pointer', opacity: lexFaction !== 'EFFECTS' ? 1 : 0.4, transition: '0.2s', margin: 0 }}
                  onClick={(e) => { e.nativeEvent.stopImmediatePropagation(); playSound('click'); setLexFaction('ALL'); }}
                >
                  AGENTEN
                </div>
                <div 
                  className="game-title-small" 
                  style={{ cursor: 'pointer', opacity: lexFaction === 'EFFECTS' ? 1 : 0.4, transition: '0.2s', color: 'var(--eff-col)', textShadow: lexFaction === 'EFFECTS' ? '0 0 10px var(--eff-col)' : 'none', margin: 0 }}
                  onClick={(e) => { e.nativeEvent.stopImmediatePropagation(); playSound('click'); setLexFaction('EFFECTS'); }}
                >
                  TAKTIKEN
                </div>
              </div>
              
              <div className="lex-top-controls" style={{ display: 'flex', gap: '15px' }}>
                <input type="text" placeholder="Suche..." value={lexSearch} onChange={e => setLexSearch(e.target.value)} className="mono" style={{ padding: '8px', background: '#000', border: '1px solid #444', color: '#fff' }} />
                
                {lexFaction !== 'EFFECTS' && (
                  <select value={lexFaction} onChange={e => setLexFaction(e.target.value)} className="mono" style={{ padding: '8px', background: '#000', border: '1px solid #444', color: '#fff' }}>
                    <option value="ALL">ALLE</option>
                    <option value="OWNED">IN BESITZ</option>
                    <option value="UNOWNED">NICHT IN BESITZ</option>
                    <option disabled>──────────────</option>
                    {allFactions.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* RECHTE SEITE: Das globale HUD */}
            <div style={{ display: 'flex', filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))', marginTop: '5px' }}>
              <div className="hud-status-module funds" onClick={() => { playSound('click'); setCurrentView('market'); }} title="Shop öffnen" style={{ cursor: 'pointer', transition: '0.3s' }}>
                <span className="hud-label">CREDITS</span>
                <span className="hud-value">{credits ?? 0}</span>
              </div>
              <div className="hud-status-module agent" style={{ borderColor: 'rgba(0, 229, 255, 0.2)', color: 'var(--win)', marginLeft: '-5px', clipPath: 'none' }}>
                <span className="hud-label" style={{ color: 'var(--win)' }}>SYS.ID</span>
                <span className="hud-value" style={{ fontSize: '1.1rem', textTransform: 'uppercase' }}>{session?.user?.user_metadata?.username || 'UNKNOWN'}</span>
              </div>
              <div className="hud-status-module agent" onClick={() => { playSound('click'); setCurrentView('menu'); }} style={{ borderColor: 'var(--lose)', color: 'var(--lose)', borderRight: 'none', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', paddingRight: '20px', marginLeft: '-5px', cursor: 'pointer' }}>
                <span className="hud-label" style={{ color: 'var(--lose)' }}>STATUS</span>
                <span className="hud-value" style={{ fontSize: '0.9rem' }}>EXIT</span>
              </div>
            </div>

          </div>
          <div className="card-grid" style={{ paddingBottom: '120px' }}>
            {[...cardsData.characters, ...(cardsData.effects || [])]
              .filter(c => {
                 const matchSearch = (c.name || '').toLowerCase().includes(lexSearch.toLowerCase());
                 const isEffect = c.type === 'effect' || c.buff !== undefined;
                 const isOwned = inventory.some(inv => inv.name === c.name);
                 
                 let matchFaction = false;
                 // Trennt Agenten und Effekte strikt voneinander
                 if (lexFaction === 'EFFECTS') matchFaction = isEffect;
                 else if (lexFaction === 'ALL') matchFaction = !isEffect;
                 else if (lexFaction === 'OWNED') matchFaction = !isEffect && isOwned;
                 else if (lexFaction === 'UNOWNED') matchFaction = !isEffect && !isOwned;
                 else {
                     // FIX: Array-sicherer Filter für Dual-Fraktionskarten
                     const cardFacs = Array.isArray(c.faction) ? c.faction : (c.faction ? [c.faction] : []);
                     matchFaction = cardFacs.includes(lexFaction) && !isEffect;
                 }
                 
                 return matchSearch && matchFaction;
              })
              .sort((a,b) => (b.gti || 0) - (a.gti || 0))
              .map((c, i) => {
                const isOwned = inventory.some(inv => inv.name === c.name);
                return (
                  <div key={i} className={`card-grid-cell ${!isOwned ? 'card-unowned' : ''}`}>
                    <Card card={c} context="lexicon" />
                  </div>
                );
              })
            }
          </div>
        </div>
      )}

      {/* --- DER MARKET MIT DEM REWARD_PACKS UPDATE --- */}
      {currentView === 'market' && ( 
        <Market 
          credits={credits} 
          username={session?.user?.user_metadata?.username}
          setCredits={setCredits} 
          inventory={inventory} 
          setInventory={setInventory} 
          onBack={() => setCurrentView('menu')} 
          onShowRules={() => { playSound('click'); setShowGlobalRules(true); }} 
          onPackBought={() => { handleMissionProgress('buy_pack', 1); handleStatUpdate('packsOpened', 1); }} 
          onCreditGain={handleCreditGain} 
          rewardPacks={rewardPacks}
          setRewardPacks={setRewardPacks}
        /> 
      )}
      
      {currentView === 'inventory' && ( <Inventory credits={credits} username={session?.user?.user_metadata?.username} inventory={inventory} setInventory={setInventory} decks={decks} setDecks={setDecks} allFactions={allFactions} onBack={() => setCurrentView('menu')} onOpenShop={() => setCurrentView('market')} onClearNew={clearNewStatus} onCreditGain={handleCreditGain} onMissionAction={(type, amount) => { handleMissionProgress(type, amount); if (type === 'upgrade') handleStatUpdate('upgradesDone', amount); }} /> )}

      {currentView === 'menu' && (
        <div className="command-center-layout">
          <div className="version-tag">
            BUILD_REV: {APP_VERSION}
          </div>
          
          {/* VIEWPORT FRAMING (Die Fadenkreuze in den Ecken) */}
          <div className="hud-bracket tl"></div>
          <div className="hud-bracket bl"></div>
          <div className="hud-bracket br"></div>
          
          {/* UPLINK INDICATOR (Oben Links) */}
          <div className="rec-indicator">
            <div className="rec-dot"></div>
            <span>REC // UPLINK SECURE</span>
          </div>



          {/* DEV MODE TRIGGER (Versteckt Unten Links) */}

          
          <div className="dev-mode-trigger" onClick={() => setShowDevMode(!showDevMode)}>
            <div 
              className="mono" 
              style={{
                color: 'var(--text-dim, #888)', 
                fontSize: '0.7rem', 
                letterSpacing: '2px', 
                marginBottom: '6px', 
                opacity: 0.6,
                textShadow: '0 0 5px rgba(255,255,255,0.2)'
              }}
            >
                SYS.VER // {APP_VERSION}
              </div>
            &gt;_ DEV.MODE
          </div>

          {/* DAS VERSTECKTE ADMIN PANEL */}
          {showDevMode && isAdmin && (
            <div className="dev-panel" style={{ width: '320px' }}>
              <div className="dev-panel-header">
                <span>SYSTEM_OVERRIDE // DEV</span>
                <button className="dev-panel-close" onClick={() => setShowDevMode(false)}>[ X ]</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)' }}>PLAYER HP ({normalPlayerHp})</span>
                       <button onClick={() => setNormalPlayerHp(500)} style={{ background: 'transparent', border: '1px solid #555', color: '#888', fontSize: '0.55rem', padding: '2px 6px', cursor: 'pointer' }}>RESET</button>
                    </div>
                    <input type="range" min="50" max="1000" step="10" value={normalPlayerHp} onChange={(e) => setNormalPlayerHp(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#ff0055' }} />
                 </div>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)' }}>ENEMY HP ({normalEnemyHp})</span>
                       <button onClick={() => setNormalEnemyHp(500)} style={{ background: 'transparent', border: '1px solid #555', color: '#888', fontSize: '0.55rem', padding: '2px 6px', cursor: 'pointer' }}>RESET</button>
                    </div>
                    <input type="range" min="50" max="1000" step="10" value={normalEnemyHp} onChange={(e) => setNormalEnemyHp(parseInt(e.target.value))} style={{ width: '100%', accentColor: '#ff0055' }} />
                 </div>
              </div>
            </div>
          )}

          {/* HEADER: HUD STATUS BAR (Das neue cleane Top-Right) */}
          <div className="hud-status-container">
            <div className="hud-status-module funds" onClick={() => { playSound('click'); setCurrentView('market'); }} title="Shop öffnen">
              <span className="hud-label">CREDITS</span>
              <span className="hud-value">{credits}</span>
            </div>

            {/* NEU: INCOMING NEURAL LINK (GAME INVITE) INLINE IM HUD */}
            {incomingInvite && (
              <div 
                className="hud-status-module" 
                style={{ 
                  borderColor: 'var(--win)', 
                  background: 'rgba(0,0,0,0.9)', 
                  padding: '0 10px 0 15px', 
                  marginLeft: '-5px', 
                  clipPath: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  boxShadow: `0 0 15px rgba(0,229,255,0.4)`
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="hud-label" style={{ color: 'var(--win)', animation: 'pulse 1s infinite' }}>
                    LINK INVITE
                  </span>
                  <span className="hud-value mono" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{incomingInvite.sender_name}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={async () => {
                      playSound('click');
                      const inv = incomingInvite;
                      setIncomingInvite(null);
                      await supabase.from('game_invites').update({ status: 'declined' }).eq('id', inv.id);
                  }} style={{ background: 'transparent', border: '1px solid var(--lose)', color: 'var(--lose)', padding: '2px 6px', cursor: 'pointer', fontFamily: "'Roboto Mono', monospace", fontSize: '0.6rem', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,0,50,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>✕</button>
                  
                  <button onClick={async () => {
                      playSound('upgrade');
                      const inv = incomingInvite;
                      setIncomingInvite(null);
                      await supabase.from('game_invites').update({ status: 'accepted' }).eq('id', inv.id);
                      
                      setLobbyMode('join');
                      setRemotePeerId(inv.peer_id);
                      setLobbyClientReady(false); // NEU: Reset ready state
                      const readyDeck = prepareMyDeck();
                      
                      // FIX: Automatischer Sprung in die Lobby
                      setCurrentView('multiplayer');
                      setIncomingTransmission({ sender: 'SYSTEM', text: 'VERBINDUNG HERGESTELLT. LOBBY BEREIT.' });
                      
                      const newPeer = new Peer();
                      setPeer(newPeer);
                      newPeer.on('open', () => {
                          const connection = newPeer.connect(inv.peer_id);
                          connection.on('open', () => {
                              setConn(connection);
                              connection.send({ type: 'DECK_SYNC', chars: readyDeck.chars, effs: readyDeck.effs });
                          });
                          connection.on('data', (data) => {
                              if (data.type === 'LOBBY_START') {
                                  setIsCoopMode(data.mode.startsWith('coop'));
                                  if (data.mode === 'coop') {
                                      setRoguelikeRun(null);
                                      setCurrentView('roguelikesquad');
                                  } else if (data.mode === 'coop_resume') {
                                      setCurrentView('roguelikemap');
                                  } else {
                                      setCurrentView('match');
                                  }
                              } else if (data.type === 'COOP_INIT') {
                                  setIsCoopMode(true);
                                  setRemoteDeck(data.hostDeck);
                                  setCoopAIDecks({ myAI: data.clientAI });
                                  setDifficulty(data.difficulty);
                              } else if (data.type === 'PVP_INIT') {
                                  setIsCoopMode(false);
                                  setRemoteDeck({ chars: data.chars, effs: data.effs });
                              } else if (data.type === 'DECK_SYNC') {
                                  setRemoteDeck({ chars: data.chars, effs: data.effs });
                                  if (data.username) {
                                      setLobbyMembers(prev => {
                                          const next = [...new Set([...prev, data.username])];
                                          updateRunContextForSquad(next);
                                          // Der Host verteilt die komplette Squad-Liste an alle Clients, damit jeder dieselbe Signatur berechnet!
                                          if (lobbyModeRef.current === 'host') {
                                              hostConnsRef.current.forEach(c => { if (c.open) c.send({ type: 'SQUAD_MEMBERS_SYNC', members: next }); });
                                          }
                                          return next;
                                      });
                                  }
                              } else if (data.type === 'SQUAD_MEMBERS_SYNC') {
                                  setLobbyMembers(data.members);
                                  updateRunContextForSquad(data.members);
                              } else if (data.type === 'LOBBY_MODE_UPDATE') {
                                  // 100% Bulletproof: Speichere Status pro eindeutiger Peer-ID
                                  hostLobbyReadiesRef.current[connection.peer] = data.ready;
                                  const readyCount = Object.values(hostLobbyReadiesRef.current).filter(Boolean).length;
                                  setLobbyClientReadies(readyCount);
                                  
                                  // Sende den exakten Count direkt an ALLE Clients
                                  hostConnsRef.current.forEach(c => { 
                                      if (c.open) c.send({ type: 'LOBBY_READY_COUNT', count: readyCount }); 
                                  });
                              } else if (data.type === 'START_RL_MATCH') {
                                  setRoguelikeMatchData(data.aiData);
                                  setCurrentView('match');
                              } else if (data.type === 'START_RL_EVENT') {
                                  setRoguelikeEventData(data.nodeObj);
                                  setCurrentView('roguelikeevent');
                              } else if (data.type === 'SYNC_RUN_STATE') {
                                  // FIX: Übernehme den Master-Run UND den abgelaufenen Pfad auf der Karte
                                  setRoguelikeRun(data.run);
                                  if (data.pathHistory && data.run.seed) {
                                      localStorage.setItem('aoc_path_' + data.run.seed, JSON.stringify(data.pathHistory));
                                      setSquadMsg({ type: 'PATH_SYNC', path: data.pathHistory, _ts: Date.now() });
                                  }
                              } else if (data.type === 'SYNC_RUN_PARAMS') {
                                  setRoguelikeRun(prev => prev ? { ...prev, currentHP: data.hp, sector: data.sector, node: data.node, seed: data.seed } : prev);
                              } else if (data.type === 'NAV_TO') {
                                  setCurrentView(data.view);
                              } else if (data.type === 'CLIENT_SQUAD_READY') {
                                  // BULLETPROOF: Deck fest an die Peer-ID knüpfen!
                                  hostSquadReadiesRef.current[connection.peer] = data.payload;
                                  setClientSquadReadies(Object.values(hostSquadReadiesRef.current));
                              } else if (data.type === 'CHAT_MESSAGE') {
                                  handleIncomingChat(data.payload);
                              } else if (data.type === 'TRIGGER_FREE_ENCRYPTED') {
                                  playSound('upgrade');
                                  setRoguelikeMatchData({ node: data.nodeObj, difficulty: 4, initialAHP: 500 });
                                  setTimeout(() => {
                                      handleRoguelikeEndGame({
                                          isWin: true,
                                          sarcasmNews: { text: "UNBEKANNTE SIGNATUR ENTSCHLÜSSELT... ES IST EIN VERLASSENER CACHE!" },
                                          remainingHP: roguelikeRun.currentHP,
                                          matchData: { dmgDealt: 0, dmgTaken: 0, highestCrit: 0 }
                                      });
                                  }, 100);
                              }
                          });
                          connection.on('close', () => { 
                              if (currentView !== 'postmatch') { 
                                disconnectPeer(); 
                                setCurrentView('menu');
                                setConfirmDialog({ message: "VERBINDUNG GETRENNT.", onConfirm: () => {} });
                              }
                          });
                      });
                  }} style={{ background: 'transparent', border: '1px solid #00ff44', color: '#00ff44', padding: '2px 6px', cursor: 'pointer', fontFamily: "'Roboto Mono', monospace", fontSize: '0.6rem', transition: '0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,255,100,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>✓</button>
                </div>
              </div>
            )}
            
            {/* INCOMING TRANSMISSION */}
            {incomingTransmission && !isSidebarOpen && (
              <div 
                className="hud-status-module" 
                onClick={() => { playSound('click'); setIncomingTransmission(null); setIsSidebarOpen(true); }}
                style={{ borderColor: 'var(--win)', background: 'rgba(0,229,255,0.15)', padding: '0 15px', marginLeft: '-5px', clipPath: 'none', cursor: 'pointer', boxShadow: '0 0 15px rgba(0,229,255,0.4)' }}
              >
                <span className="hud-label" style={{ color: 'var(--win)', animation: 'pulse 0.8s infinite' }}>INCOMING</span>
                <span className="hud-value mono" style={{ fontSize: '0.7rem' }}>{incomingTransmission.sender.toUpperCase()}: {incomingTransmission.text.substring(0, 15)}...</span>
              </div>
            )}

            {/* NEURAL LINK STATUS (INTERAKTIV) */}
            {conn && (
              <div 
                className="hud-status-module" 
                onClick={() => {
                  playSound('click');
                  setCurrentView('multiplayer');
                }}
                style={{ 
                  borderColor: lobbySelectedMode === 'coop' ? '#bc13fe' : 'var(--win)', 
                  background: 'rgba(0,0,0,0.8)', 
                  padding: '0 15px', 
                  marginLeft: '-5px', 
                  clipPath: 'none',
                  cursor: 'pointer' 
                }}
              >
                <span className="hud-label" style={{ color: lobbySelectedMode === 'coop' ? '#bc13fe' : 'var(--win)' }}>LINK</span>
                <span className="hud-value" style={{ fontSize: '0.7rem', animation: 'pulse 1.5s infinite' }}>LOBBY</span>
              </div>
            )}

            {/* AGENT MODULE */}
            <div className="hud-status-module agent" onClick={() => { playSound('click'); setIsSidebarOpen(true); }} title="Ghost Network" style={{ paddingRight: isCoopMode ? '10px' : '20px', clipPath: 'none', marginLeft: '-5px' }}>
              <span className="hud-label">SYS.ID</span>
              <span className="hud-value">{session?.user?.user_metadata?.username || 'UNKNOWN'}</span>
            </div>
            
            {/* NEUES SETTINGS MODUL (Nahtlos ins HUD integriert) */}
            <div className="hud-status-module" onClick={() => { playSound('click'); setShowSettings(true); }} title="System Settings" 
              style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: '0.2s', clipPath: 'polygon(0 0, 100% 0, calc(100% - 15px) 100%, 0 100%)', paddingRight: '30px', paddingLeft: '15px', marginLeft: '-5px', color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--win)'; e.currentTarget.style.background = 'rgba(0,229,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(10, 10, 15, 0.85)'; }}
            >
              <Settings size={18} />
            </div>
          </div>

          {/* LEFT COLUMN: OPERATIONS */}
          <div className="ops-column">
            <div className="ops-header">▸ OPERATION_COMMAND_UPLINK</div>
            
            <button className="btn-main-op ghost-node-pulse" onClick={() => { playSound('click'); setRunContext('solo'); setCurrentView('ghostnodemenu'); }}>
              <span className="op-tag">PRIORITÄT 1</span>
              <div className="op-title">OPERATION: GHOST NODE</div>
              <div className="op-desc">INFILTRATION & ROGUELIKE RUN</div>
              <div className="op-status">STATUS: {allRuns.solo ? 'LAUFENDER RUN' : 'BEREIT'}</div>
            </button>

            <div style={{ position: 'relative' }}>
              <button className="btn-quick-play" style={{ width: '100%' }} onClick={() => { playSound('click'); setShowDifficultySelect(!showDifficultySelect); setShowMultiplayerOptions(false); }}>
                <span className="op-tag-cyan">OFFLINE</span>
                <div className="op-title">SYSTEM TRAINING</div>
                <div className="op-desc">1V1 VS LOKALE KI</div>
              </button>

              {showDifficultySelect && (
                <div className="quick-play-dropdown">
                  {[1, 2, 3, 4].map(level => (
                    <div key={level} onClick={() => {
                      playSound('click');
                      setDifficulty(level);
                      setShowDifficultySelect(false);
                      
                      if (activeDeck.chars.length !== 12 || activeDeck.effs.length !== 3) {
                        alert(`FEHLER: Dein aktives Deck (${activeDeck?.name || 'Unbekannt'}) ist unvollständig! (Du brauchst 12 Agenten und 3 Taktiken)`);
                        return;
                      }
                      
                      setCurrentView('match');
                    }}>
                      <strong style={{ color: DIFFICULTY_CONFIG[level].color }}>
                        KI-LEVEL {level}: {DIFFICULTY_CONFIG[level].name}
                      </strong>
                      <span style={{ float: 'right' }}>+{DIFFICULTY_CONFIG[level].reward}💳</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MULTIPLAYER TERMINAL (HUB) - Toggles right side */}
            <div style={{ position: 'relative', marginTop: '15px' }}>
              <button 
                className="btn-quick-play" 
                style={{ 
                  width: '100%', 
                  borderColor: showMultiplayerOptions ? 'var(--win)' : 'var(--r-epi)',
                  background: showMultiplayerOptions ? 'rgba(0,229,255,0.05)' : 'transparent',
                  transform: showMultiplayerOptions ? 'translateX(5px)' : 'none'
                }} 
                onClick={() => { playSound('click'); setShowMultiplayerOptions(!showMultiplayerOptions); setShowDifficultySelect(false); }}
              >
                <span className="op-tag-cyan" style={{ color: showMultiplayerOptions ? 'var(--win)' : 'var(--r-epi)', borderColor: showMultiplayerOptions ? 'var(--win)' : 'var(--r-epi)' }}>P2P LINK</span>
                <div className="op-title" style={{ fontSize: '1.6rem', color: showMultiplayerOptions ? '#fff' : 'inherit' }}>MULTIPLAYER</div>
                <div className="op-desc">{showMultiplayerOptions ? 'VERBINDUNGS-KNOTEN GEÖFFNET' : 'HOST & JOIN PROTOCOLS'}</div>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: MODULES GRID & TERMINAL */}
          <div className="modules-side">
            <style>{`
              @keyframes shutterSwap {
                0% { opacity: 1; transform: scaleY(1); filter: brightness(1); }
                30% { opacity: 0; transform: scaleY(0.01); filter: brightness(3) hue-rotate(90deg); }
                70% { opacity: 0; transform: scaleY(0.01); filter: brightness(3) hue-rotate(90deg); }
                100% { opacity: 1; transform: scaleY(1); filter: brightness(1) hue-rotate(0deg); }
              }
              .shutter-anim { animation: shutterSwap 0.4s cubic-bezier(0.86, 0, 0.07, 1) forwards; transform-origin: center; }
              
              .mp-grid-container { display: flex; flex-direction: column; gap: 12px; height: 100%; justify-content: space-between; }
              .p2p-blade { position: relative; overflow: hidden; transition: all 0.2s ease-out; padding: 12px 18px; text-align: left; display: flex; flex-direction: column; justify-content: center; background: rgba(0,0,0,0.6); border: 1px solid #333; border-radius: 6px; cursor: pointer; box-shadow: inset 0 0 15px rgba(0,0,0,0.5); min-height: 85px; }
              .p2p-blade:hover { transform: translateX(6px); }
              .pvp-blade:hover { background: rgba(0,229,255,0.08); border-color: var(--win); box-shadow: -4px 0 0 var(--win), inset 0 0 20px rgba(0,229,255,0.15); }
              .coop-blade:hover { background: rgba(188,19,254,0.08); border-color: #bc13fe; box-shadow: -4px 0 0 #bc13fe, inset 0 0 20px rgba(188,19,254,0.15); }
              .apex-blade:hover { background: rgba(255,0,127,0.08); border-color: var(--apex-pink); box-shadow: -4px 0 0 var(--apex-pink), inset 0 0 20px rgba(255,0,127,0.15); }
            `}</style>
            
            <div style={{ position: 'relative', minHeight: '360px' }}>
              {!showMultiplayerOptions ? (
                <div className="modules-grid shutter-anim" key="main-modules">
                  <div className="module-item mod-blue" onClick={() => { playSound('click'); setCurrentView('inventory'); }}>
                    <div className="mod-icon">🗃️</div>
                    <div className="mod-text-wrap">
                      <div className="mod-label">INVENTAR</div>
                      <div className="mod-sub">DECK & UPGRADES</div>
                    </div>
                    {hasNewCards && <div className="notif-dot" style={{ background: 'var(--win)' }}></div>}
                  </div>
                  
                  <div className="module-item mod-gold" onClick={() => { playSound('click'); setCurrentView('market'); }}>
                    <div className="mod-icon">🛒</div>
                    <div className="mod-text-wrap">
                      <div className="mod-label">SHOP</div>
                      <div className="mod-sub">PACKS & ASSETS</div>
                    </div>
                    {rewardPacks?.length > 0 && <div className="notif-dot" style={{ background: '#bc13fe' }}></div>}
                  </div>
                  
                  <div className="module-item mod-green" onClick={() => { playSound('click'); setCurrentView('missions'); }}>
                    <div className="mod-icon">📜</div>
                    <div className="mod-text-wrap">
                      <div className="mod-label">MISSIONEN</div>
                      <div className="mod-sub">BOUNTIES & REWARDS</div>
                    </div>
                    {hasClaimableMissions && <div className="notif-dot" style={{ background: 'var(--win)' }}></div>}
                  </div>
                  
                  <div className="module-item mod-white" onClick={() => { playSound('click'); setCurrentView('lexicon'); }}>
                    <div className="mod-icon">📚</div>
                    <div className="mod-text-wrap">
                      <div className="mod-label">ARCHIV</div>
                      <div className="mod-sub">DATENBANK & LORE</div>
                    </div>
                  </div>
                  
                  <div className="module-item mod-orange" onClick={() => { playSound('click'); setCurrentView('overrides'); }}>
                    <div className="mod-icon">🛡️</div>
                    <div className="mod-text-wrap">
                      <div className="mod-label">ACHIEVEMENTS</div>
                      <div className="mod-sub">SYSTEM OVERRIDES</div>
                    </div>
                    {hasClaimableOverrides && <div className="notif-dot" style={{ background: 'var(--ep)' }}></div>}
                  </div>
                  
                  <div className="module-item mod-pink" onClick={() => { playSound('click'); setCurrentView('leaderboard'); }}>
                    <div className="mod-icon">🏆</div>
                    <div className="mod-text-wrap">
                      <div className="mod-label">RANKING</div>
                      <div className="mod-sub">GLOBAL LEADERBOARDS</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mp-grid-container shutter-anim" key="mp-modules">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,229,255,0.05)', borderBottom: '1px solid var(--win)', padding: '8px 12px', borderRadius: '4px 4px 0 0' }}>
                     <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--win)', letterSpacing: '4px', textShadow: '0 0 10px rgba(0,229,255,0.5)' }}>▸ PROTOCOL: MULTIPLAYER</div>
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--win)', animation: 'pulse 1.5s infinite', boxShadow: '0 0 10px var(--win)' }} />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <button className="p2p-blade pvp-blade" onClick={() => { playSound('click'); setLobbySelectedMode('pvp'); startHosting('pvp', null, 2); }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '4px', alignItems: 'center' }}>
                           <span className="mono" style={{ fontSize: '0.55rem', color: 'var(--win)', background: 'rgba(0,229,255,0.1)', padding: '2px 6px', borderRadius: '2px', border: '1px solid rgba(0,229,255,0.3)' }}>HOST // 2P</span>
                           <span style={{ fontSize: '1rem' }}>⚔️</span>
                        </div>
                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>NEURAL DUELL</div>
                        <div className="mono" style={{ fontSize: '0.6rem', color: '#888', marginTop: '2px' }}>KLASSISCHES 1V1 PVP</div>
                      </button>

                      <button className="p2p-blade coop-blade" onClick={() => { playSound('click'); setLobbySelectedMode('coop'); startHosting('coop', null, 2); }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '4px', alignItems: 'center' }}>
                           <span className="mono" style={{ fontSize: '0.55rem', color: '#bc13fe', background: 'rgba(188,19,254,0.1)', padding: '2px 6px', borderRadius: '2px', border: '1px solid rgba(188,19,254,0.3)' }}>HOST // 2P</span>
                           <span style={{ fontSize: '1rem' }}>🔗</span>
                        </div>
                        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>SQUAD INFILTRATION</div>
                        <div className="mono" style={{ fontSize: '0.6rem', color: '#888', marginTop: '2px' }}>CO-OP GHOST NODE RUN</div>
                      </button>
                  </div>

                  <button className="p2p-blade apex-blade" style={{ flex: 1 }} onClick={() => { playSound('click'); setLobbySelectedMode('coop'); startHosting('coop', null, 3); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '4px', alignItems: 'center' }}>
                       <span className="mono" style={{ fontSize: '0.55rem', color: 'var(--apex-pink)', background: 'rgba(255,0,127,0.1)', padding: '2px 6px', borderRadius: '2px', border: '1px solid rgba(255,0,127,0.3)' }}>HOST // 3P</span>
                       <span style={{ fontSize: '1.2rem' }}>🔥</span>
                    </div>
                    <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>APEX COMMAND</div>
                    <div className="mono" style={{ fontSize: '0.65rem', color: '#888', marginTop: '2px' }}>MAXIMALE SYSTEMBELASTUNG & OMNIVERSE LOOT</div>
                  </button>

                  {/* QUICK JOIN BAR */}
                  <div style={{ display: 'flex', marginTop: 'auto', background: 'rgba(0,0,0,0.8)', border: '1px solid #444', borderRadius: '6px', overflow: 'hidden', height: '48px' }}>
                    <div className="mono" style={{ padding: '0 15px', background: 'rgba(255,255,255,0.02)', color: '#888', fontSize: '0.9rem', display: 'flex', alignItems: 'center', borderRight: '1px solid #333' }}>{'>_'}</div>
                    <input 
                      type="text" 
                      placeholder="ENTER_REMOTE_ID..." 
                      value={remotePeerId} 
                      onChange={e => setRemotePeerId(e.target.value)}
                      onKeyDown={e => {
                          if (e.key === 'Enter') {
                              if (!remotePeerId.trim()) return;
                              setLobbySelectedMode('coop');
                              startJoining();
                              setTimeout(() => connectToHost(), 100);
                          }
                      }}
                      className="mono" 
                      style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--win)', padding: '0 15px', fontSize: '0.85rem', outline: 'none', textTransform: 'uppercase', letterSpacing: '2px' }} 
                    />
                    <button 
                      onClick={() => {
                          if (!remotePeerId.trim()) return;
                          playSound('click');
                          setLobbySelectedMode('coop');
                          startJoining();
                          setTimeout(() => connectToHost(), 100);
                      }} 
                      style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--win)', border: 'none', borderLeft: '1px solid #444', padding: '0 20px', fontFamily: "'Roboto Mono', monospace", fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', transition: '0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--win)'; e.currentTarget.style.color = '#000'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.1)'; e.currentTarget.style.color = 'var(--win)'; }}
                    >JOIN</button>
                  </div>
                </div>
              )}
            </div>

            <div className="live-terminal">
              <div className="terminal-header">GHOST_NET_TRAFFIC // MONITORING...</div>
              {systemLogs.map((log, i) => (
                <div key={i} className="terminal-line">{log}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM OVERRIDES SCREEN */}
      {currentView === 'overrides' && (
         <div style={{ width: '100%', height: '100%' }}>
            <SystemOverrides credits={credits} username={session?.user?.user_metadata?.username} onOpenShop={() => setCurrentView('market')} metaStats={metaStats} onBack={() => setCurrentView('menu')} onClaim={claimOverride} />
         </div>
      )}

      {/* GHOST NETWORK SIDEBAR (Phase 4) */}
      <GhostNetwork 
         session={session} 
         isOpen={isSidebarOpen}
         onClose={() => setIsSidebarOpen(false)}
         conn={conn}
         chatMessages={chatMessages}
         onSendMessage={sendChatMessage}
         onInvite={(targetId, mode) => { 
           if (conn) {
             setIsSidebarOpen(false);
             setConfirmDialog({ 
               message: "ABBRUCH: EIN AKTIVER NEURAL LINK IST BEREITS ETABLIERT.", 
               onConfirm: () => {} 
             });
             return;
           }
           setIsSidebarOpen(false); 
           startHosting(mode, targetId); 
         }}
         onLogout={handleLogout}
         metaStats={metaStats}
         onlineUsers={onlineUsers}
         onDisconnect={disconnectPeer}
      />

      {/* SIGNAL INTERCEPT TOAST (Friend Requests) */}
      {toastRequest && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999, display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', background: 'rgba(5, 5, 8, 0.95)', border: '1px solid #00ff88', borderLeft: '4px solid #00ff88', boxShadow: '0 0 20px rgba(0,255,136,0.2)', pointerEvents: 'all', animation: 'slideInRight 0.3s ease-out' }}>
           <div>
              <div className="mono" style={{ fontSize: '0.65rem', color: '#00ff88', letterSpacing: '2px', marginBottom: '4px' }}>[SIGNAL INTERCEPTED]</div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.1rem', color: '#fff' }}>Agent <b style={{color: '#00ff88'}}>{toastRequest.username}</b> sucht Kontakt.</div>
           </div>
           <div style={{ display: 'flex', gap: '5px' }}>
              <button onClick={async () => { playSound('upgrade'); await supabase.from('friendships').update({ status: 'accepted' }).eq('id', toastRequest.id); setToastRequest(null); }} style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid #00ff88', color: '#00ff88', padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: "'Roboto Mono', monospace" }}>ACCEPT</button>
              <button onClick={() => { playSound('click'); setToastRequest(null); }} style={{ background: 'transparent', border: '1px solid #555', color: '#888', padding: '6px 12px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: "'Roboto Mono', monospace" }}>IGNORE</button>
           </div>
        </div>
      )}

      {/* PASSIVE HOSTING STATUS INDICATOR — dezenter Floating Button, kein blockierendes Fenster */}
      {pendingOutgoingInvite && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 99998, display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 20px',
          background: 'rgba(4, 2, 14, 0.92)',
          border: `1px solid ${pendingOutgoingInvite.mode === 'coop' ? 'var(--apex-pink)' : 'var(--win)'}`,
          borderLeft: `3px solid ${pendingOutgoingInvite.mode === 'coop' ? 'var(--apex-pink)' : 'var(--win)'}`,
          backdropFilter: 'blur(12px)',
          boxShadow: `0 0 24px ${pendingOutgoingInvite.mode === 'coop' ? 'rgba(255,0,127,0.2)' : 'rgba(0,229,255,0.2)'}`,
          pointerEvents: 'all',
        }}>
          <span style={{ fontSize: '1.1rem', animation: 'pulse 1.2s infinite' }}>📡</span>
          <span className="mono" style={{
            fontSize: '0.72rem', letterSpacing: '2px',
            color: pendingOutgoingInvite.mode === 'coop' ? 'var(--apex-pink)' : 'var(--win)',
          }}>
            WARTE AUF PARTNER...
          </span>
          <span className="mono" style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>
            {pendingOutgoingInvite.mode === 'coop' ? 'CO-OP' : '1V1'}
          </span>
          <button
            onClick={() => { disconnectPeer(); setPendingOutgoingInvite(null); playSound('click'); }}
            style={{
              marginLeft: '8px', padding: '4px 10px',
              background: 'rgba(255,0,50,0.1)', border: '1px solid var(--lose)',
              color: 'var(--lose)', fontFamily: "'Roboto Mono', monospace",
              fontSize: '0.68rem', letterSpacing: '2px', cursor: 'pointer',
            }}
          >
            ✕ ABBRECHEN
          </button>
        </div>
      )}

      

      {/* Das alte Fullscreen Invite Modal wurde ins HUD-Top-Menu verschoben */}

      {/* GLOBAL SETTINGS MODAL */}
      {showSettings && (
        <div className="settings-overlay active" style={{ zIndex: 1000000 }} onClick={() => setShowSettings(false)}>
          <div className="settings-box" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <span>SYSTEM KONFIGURATION</span>
              <button onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="settings-content" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div className="setting-row" style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <label className="mono" style={{ fontSize: '0.7rem' }}>SOUND EFFEKTE</label>
                  <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--win)' }}>{volSFX}%</span>
                </div>
                <input type="range" min="0" max="100" value={volSFX} onChange={(e) => setSFXVol(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--win)' }} />
              </div>

              <div className="setting-row" style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <label className="mono" style={{ fontSize: '0.7rem' }}>HINTERGRUND MUSIK</label>
                  <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--win)' }}>{volMusic}%</span>
                </div>
                <input type="range" min="0" max="100" value={volMusic} onChange={(e) => setMusicVol(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--win)' }} />
              </div>

              <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <label className="mono" style={{ fontSize: '0.7rem' }}>INTERFACE</label>
                <div className="mono" style={{color:'var(--win)', fontSize: '0.7rem'}}>HOCHLEISTUNG</div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  onClick={() => { 
                    playSound('click'); 
                    setConfirmDialog({
                      message: "SYSTEM-ABMELDUNG BESTÄTIGEN?",
                      onConfirm: () => { supabase.auth.signOut(); setShowSettings(false); }
                    });
                  }}
                  style={{ padding:'12px', background:'rgba(0,229,255,0.1)', border:'1px solid var(--win)', color:'var(--win)', fontFamily:"'Roboto Mono', monospace", cursor:'pointer', transition: '0.2s', fontSize: '0.8rem' }}
                >
                  ▸ LOGOUT
                </button>

                <button 
                  onClick={() => { 
                    playSound('click'); 
                    setConfirmDialog({
                      message: "WILLST DU DAS SYSTEM WIRKLICH VERLASSEN?",
                      onConfirm: () => window.close()
                    });
                  }}
                  style={{ padding:'12px', background:'rgba(255,0,85,0.1)', border:'1px solid var(--lose)', color:'var(--lose)', fontFamily:"'Roboto Mono', monospace", cursor:'pointer', transition: '0.2s', fontSize: '0.8rem' }}
                >
                  ▸ SPIEL BEENDEN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NATIVE SYSTEM WARNING DIALOG */}
      {confirmDialog && (
        <div className="settings-overlay active" style={{ zIndex: 2000001, background: 'rgba(5,0,10,0.85)' }} onClick={() => setConfirmDialog(null)}>
          <div className="glass-panel animate-panel-in" style={{ width: '400px', padding: '30px', textAlign: 'center', borderColor: 'var(--lose)', boxShadow: '0 0 40px rgba(255,0,85,0.3)' }} onClick={e => e.stopPropagation()}>
            <div className="mono" style={{ color: 'var(--lose)', fontSize: '0.7rem', letterSpacing: '4px', marginBottom: '15px' }}>⚠️ SYSTEM WARNING ⚠️</div>
            <div className="mono" style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '30px', lineHeight: '1.4' }}>{confirmDialog.message}</div>
            
            <div style={{ display: 'flex', gap: '15px', width: '100%', justifyContent: 'center' }}>
              <button className="menu-btn" style={{ flex: 1, margin: 0, borderColor: '#444', color: '#888' }} onClick={() => { playSound('click'); setConfirmDialog(null); }}>
                ABBRECHEN
              </button>
              <button className="menu-btn btn-danger" style={{ flex: 1, margin: 0 }} onClick={() => { playSound('upgrade'); confirmDialog.onConfirm(); setConfirmDialog(null); }}>
                BESTÄTIGEN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBALES NEWS TICKER (Sichtbar und durchlaufend in allen Hub-Menüs) */}
      {['menu', 'inventory', 'market', 'missions', 'lexicon', 'overrides', 'leaderboard', 'stats'].includes(currentView) && (
        <NewsTicker characters={cardsData.characters} />
      )}

      {/* MOBILE OPTIMIZATION START: CyberCursor nur auf Desktop/Nicht-Touch-Geräten */}
      {!isTouchDevice && <CyberCursor />}
      {/* MOBILE OPTIMIZATION END */}
    </div>
  );
}