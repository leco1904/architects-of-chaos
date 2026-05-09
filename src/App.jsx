import React, { useState, useEffect, useRef } from 'react';
import CyberBackground from './components/CyberBackground';
import MatchEngine from './components/MatchEngine';
import Card from './components/Card';
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
import GhostNetwork from './components/GhostNetwork'; // NEU
import cardsData from './data/cards.json';
import { playSound } from './logic/audio';
import { supabase } from './logic/supabase';
import { Peer } from 'peerjs';

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

const defaultStarterChars = [...cardsData.characters].sort((a, b) => (a.gti || 0) - (b.gti || 0)).slice(0, 12);
const defaultStarterEffs = [...cardsData.effects].slice(0, 3);
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
  { type: 'sell', target: 5, desc: 'Verkaufe 5 Max-Level Kopien / Effekte', reward: 400 }
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
  const [step, setStep] = useState('intro');
  const [selectedCard, setSelectedCard] = useState(null);
  const [resultMsg, setResultMsg] = useState('');
  const [resultColor, setResultColor] = useState('var(--win)');
  const [pendingUpdates, setPendingUpdates] = useState(null);
  const [rewardCard, setRewardCard] = useState(null); // NEU: Speichert die Legacy-Karte für die Anzeige

  const isSafehouse = nodeObj.type === 'safehouse';
  const isLeak = nodeObj.type === 'dataleak';
  const isMarket = nodeObj.type === 'blackmarket';

  const processEvent = () => {
    playSound('upgrade');
    let nextRun = { ...roguelikeRun };
    let nextAvatar = { ...avatarCard };
    let msg = '';
    let col = 'var(--win)';

    if (isSafehouse) {
      const heal = Math.floor(nextRun.maxHP * 0.20);
      nextRun.currentHP = Math.min(nextRun.maxHP, nextRun.currentHP + heal);
      msg = `SYSTEM RECOVERY: +${heal} HP WIEDERHERGESTELLT.`;
      col = '#00ff44';
    } else if (isLeak) {
      nextRun.currentHP = Math.max(1, nextRun.currentHP - 50);
      nextAvatar.sp = (nextAvatar.sp || 0) + 2;
      msg = `DATA LEAK: +2 SP EXTRAHIERT // -50 HP SCHADEN ERLITTEN.`;
      col = '#ff0055';
    } else if (isMarket) {
      if (!selectedCard) return;
      const cIdx = nextRun.runDeck.chars.findIndex(c => c.name === selectedCard.name);
      if (cIdx > -1) nextRun.runDeck.chars.splice(cIdx, 1);
      else {
        const eIdx = nextRun.runDeck.effs.findIndex(c => c.name === selectedCard.name);
        if (eIdx > -1) nextRun.runDeck.effs.splice(eIdx, 1);
      }
      const legacies = cardsData.characters.filter(c => c.type === 'legacy');
      const reward = legacies[Math.floor(Math.random() * legacies.length)];
      nextRun.runDeck.chars.push({ ...reward, level: 1, isNew: true });
      setRewardCard({ ...reward, level: 1 }); // NEU: Karte für UI speichern
      msg = `SHADOW BROKER: [${selectedCard.name}] GEOPFERT. LEGACY ASSET [${reward.name}] ERHALTEN.`;
      col = 'var(--legacy-sepia)';
    }

    let newNode = nextRun.node + 1;
    let newSec = nextRun.sector;
    if (newNode > 5) { newNode = 1; newSec++; }
    nextRun.node = newNode;
    nextRun.sector = newSec;

    setResultMsg(msg);
    setResultColor(col);
    setPendingUpdates({ nextRun, nextAvatar });
    setStep('result');
  };

  if (step === 'intro') {
    return (
      <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel animate-panel-in" style={{ width: '100%', maxWidth: '600px', padding: '40px', textAlign: 'center' }}>
           <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
             {isSafehouse ? '⛺' : isLeak ? '🔓' : '🛒'}
           </div>
           <h2 style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '2.5rem', color: isSafehouse ? '#00ff44' : isLeak ? '#ff0055' : 'var(--legacy-sepia)', letterSpacing: '4px', margin: '0 0 20px 0' }}>
             {isSafehouse ? 'SAFEHOUSE' : isLeak ? 'DATA LEAK' : 'BLACK MARKET'}
           </h2>
           <p className="mono" style={{ color: '#ccc', marginBottom: '30px', lineHeight: '1.6' }}>
             {isSafehouse ? 'Sichere Zone. Repariert beschädigten Code und stellt 20% deiner maximalen HP wieder her.' :
              isLeak ? 'Du entwendest wertvolle Skill Points, das System kontert jedoch mit permanentem Schaden (-50 HP).' :
              'Schattensystem-Händler. Opfere eine Karte aus deinem Deck für ein mächtiges Legacy-Asset.'}
           </p>
           {isMarket ? (
             <button className="menu-btn btn-play modern-btn" onClick={() => { playSound('click'); setStep('market_select'); }}>KARTEN TAUSCHEN ▸</button>
           ) : (
             <button className="menu-btn btn-play modern-btn" onClick={processEvent}>EVENT AUSFÜHREN ▸</button>
           )}
        </div>
      </div>
    );
  }

  if (step === 'market_select') {
     return (
       <div className="screen active" style={{ display: 'block', padding: '30px', overflowY: 'auto' }}>
         <div className="top-bar" style={{ marginBottom: '30px' }}>
           <div className="game-title-small" style={{ color: 'var(--legacy-sepia)' }}>🛒 SHADOW BROKER</div>
           <button className="btn-back" onClick={() => setStep('intro')}>ZURÜCK</button>
         </div>
         <div className="mono" style={{ textAlign: 'center', marginBottom: '30px', color: '#ccc', letterSpacing: '2px' }}>▸ WÄHLE EINE KARTE ZUM OPFERN (Avatar ist geschützt)</div>
         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            {[...roguelikeRun.runDeck.chars, ...roguelikeRun.runDeck.effs].map((c, i) => {
               const isAv = i === 0 && roguelikeRun.runDeck.chars.includes(c);
               if (isAv) return null;
               const isSelected = selectedCard?.name === c.name;
               return (
                 <div key={i} onClick={() => { playSound('click'); setSelectedCard(c); }} style={{ cursor: 'pointer', outline: isSelected ? '3px solid var(--lose)' : 'none', outlineOffset: '3px', transform: isSelected ? 'translateY(-10px)' : 'none', transition: '0.2s', borderRadius: '6px' }}>
                    <div style={{ width: '150px', height: '210px', overflow: 'hidden', borderRadius: '6px', border: '1px solid #333' }}>
                      <div style={{ transform: 'scale(0.416)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                         <Card card={c} context="inventory" />
                      </div>
                    </div>
                 </div>
               )
            })}
         </div>
         <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <button className="menu-btn" style={{ borderColor: selectedCard ? 'var(--lose)' : '#333', color: selectedCard ? 'var(--lose)' : '#555', maxWidth: '400px', margin: '0 auto' }} disabled={!selectedCard} onClick={processEvent}>
              {selectedCard ? `[${selectedCard.name}] OPFERN` : 'KARTE AUSWÄHLEN'}
            </button>
         </div>
       </div>
     )
  }

  if (step === 'result') {
    return (
      <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="glass-panel animate-panel-in" style={{ width: '100%', maxWidth: '600px', padding: '40px', textAlign: 'center', borderColor: resultColor }}>
           <div style={{ fontSize: '4rem', marginBottom: '10px' }}>✓</div>
           <h2 style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '2.5rem', color: resultColor, letterSpacing: '4px', margin: '0 0 20px 0' }}>EVENT ABGESCHLOSSEN</h2>
           <div className="mono" style={{ color: '#fff', fontSize: '1rem', marginBottom: '30px', lineHeight: '1.6', padding: '15px', background: 'rgba(0,0,0,0.5)', borderLeft: `3px solid ${resultColor}` }}>{resultMsg}</div>
           
           {rewardCard && (
             <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
               <div style={{ width: 'clamp(180px, 30vw, 240px)', aspectRatio: '5/7', height: 'auto', filter: 'drop-shadow(0 0 20px rgba(210,180,140,0.3))' }}>
                 <Card card={rewardCard} context="inventory" />
               </div>
             </div>
           )}

           <button className="menu-btn btn-play modern-btn" onClick={() => onComplete(pendingUpdates.nextRun, pendingUpdates.nextAvatar)}>
             WEITER ZUR MAP ▸
           </button>
        </div>
      </div>
    );
  }
  return null;
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
  // ── Auth / Cloud ──────────────────────────────────────────────────────────
  const [session,       setSession]       = useState(undefined);
  const [guestMode,     setGuestMode]     = useState(false);
  const cloudSyncReady                    = useRef(false);

  // ── Roguelike States ──────────────────────────────────────────────────────
  const [avatarCard, setAvatarCard] = useState(() => {
    const saved = localStorage.getItem('aoc_avatar');
    return saved ? JSON.parse(saved) : null;
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
  const [difficulty, setDifficulty] = useState(1);
  const [showGlobalRules, setShowGlobalRules] = useState(false);
  const [floats, setFloats] = useState([]);
  const [playMenuOpen, setPlayMenuOpen] = useState(false);

  // --- ADMIN BALANCING STATES (NORMAL GAMES) ---
  const [normalPlayerHp, setNormalPlayerHp] = useState(200);
  const [normalEnemyHp, setNormalEnemyHp] = useState(200);

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

  const [lastMatch, setLastMatch] = useState(null);
  const [lexiconInspectCard, setLexiconInspectCard] = useState(null);
  const [lexSearch, setLexSearch] = useState('');
  const [lexFaction, setLexFaction] = useState('ALL');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // NEU: Ghost Network Sidebar

  // ADMIN STATE: Dynamischer HP-Faktor
  const [baseHp, setBaseHp] = useState(() => {
    const saved = localStorage.getItem('aoc_base_hp');
    return saved ? parseInt(saved) : 200; // Standardwert 200
  });

  useEffect(() => {
    localStorage.setItem('aoc_base_hp', baseHp.toString());
  }, [baseHp]);

  // --- MULTIPLAYER STATE ---
  const [peer, setPeer] = useState(null);
  const [myPeerId, setMyPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [conn, setConn] = useState(null);
  const [lobbyMode, setLobbyMode] = useState('select'); 
  const [isCoopMode, setIsCoopMode] = useState(false); 
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [pendingOutgoingInvite, setPendingOutgoingInvite] = useState(null);
  const [myOnlineDeck, setMyOnlineDeck] = useState(null);
  
  // Reparierte fehlende States
  const [remoteDeck, setRemoteDeck] = useState(null);
  const [coopAIDecks, setCoopAIDecks] = useState(null);
  const [friends, setFriends] = useState([]); // NEU: Liste für Ghost Node Direct-Invites

  const [clientSquadReady, setClientSquadReady] = useState(null); 
  const [mySquadReady, setMySquadReady] = useState(false);
  const [roguelikeMatchData, setRoguelikeMatchData] = useState(null);
  const [roguelikeEventData, setRoguelikeEventData] = useState(null);
  const [rewardData, setRewardData] = useState(null);
  const activeDeck = decks.find(d => d.isActive) || decks[0];

  // NEU: Freunde für das Schnell-Invite-System im Ghost Node Hub laden
  useEffect(() => {
    if (!session?.user?.id) return;
    const loadFriends = async () => {
        const { data } = await supabase.from('profiles').select('id, username').neq('id', session.user.id).limit(10);
        if (data) setFriends(data);
    };
    loadFriends();
  }, [session]);

  // NEU: Supabase Realtime Listener für eingehende P2P-Spieleinladungen
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const inviteSub = supabase.channel('realtime_invites')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_invites', filter: `receiver_id=eq.${session.user.id}` }, (payload) => {
         if (payload.new.status === 'pending') {
             playSound('crisis'); 
             setIncomingInvite(payload.new);
         }
      })
      .subscribe();

    return () => { supabase.removeChannel(inviteSub); };
  }, [session]);
 
  // NEU: Synchronisiert das Roguelike-Deck und die Run-Parameter im Co-Op permanent
  useEffect(() => {
    if (conn && isCoopMode && roguelikeRun) {
       // Eigene Karten an den Neural Link des Partners senden
       conn.send({ type: 'DECK_SYNC', chars: roguelikeRun.runDeck.chars, effs: roguelikeRun.runDeck.effs });
       
       // FIX: Niemals das komplette "run" Objekt (inklusive Deck) permanent überschreiben!
       // Nur der Host darf die aktuellen Map-Werte (HP, Sector) diktieren.
       if (lobbyMode === 'host') {
           conn.send({ type: 'SYNC_RUN_PARAMS', hp: roguelikeRun.currentHP, sector: roguelikeRun.sector, node: roguelikeRun.node, seed: roguelikeRun.seed });
       }
    }
  }, [conn, isCoopMode, roguelikeRun, lobbyMode]);

  useEffect(()=>{
    localStorage.setItem('aoc_credits',   credits.toString());
    localStorage.setItem('aoc_inventory', JSON.stringify(inventory));
    localStorage.setItem('aoc_decks',     JSON.stringify(decks));
    localStorage.setItem('aoc_stats',     JSON.stringify(stats));
    localStorage.setItem('aoc_missions',  JSON.stringify(missions));
    localStorage.setItem('aoc_avatar',    JSON.stringify(avatarCard));
    localStorage.setItem('aoc_all_runs',  JSON.stringify(allRuns));
    localStorage.setItem('aoc_reward_packs', JSON.stringify(rewardPacks));
    localStorage.setItem('aoc_meta_stats', JSON.stringify(metaStats));
  },[credits,inventory,decks,stats,missions,avatarCard,allRuns,rewardPacks,metaStats]);

  // ── Supabase Auth ─────────────────────────────────────────────────────────
  useEffect(() => {
    let subRef;
    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s ?? null);
        if (s) await loadProfile(s.user);
      } catch (e) {
        console.error("Auth Init Error", e);
        setSession(null);
      }
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
        setSession(s ?? null);
        if (s) loadProfile(s.user);
        else cloudSyncReady.current = false;
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
          
          // NEU: Automatische Bildzuweisung basierend auf dem Usernamen
          const normalizedName = p.username?.toUpperCase();
          if (normalizedName === 'MANU') {
            avatarData.photo = 'avatars/manu.png';
          } else if (normalizedName === 'LEON') {
            avatarData.photo = 'avatars/leon.png';
          }
          
          setAvatarCard(avatarData);
        } else if (p.avatar_card === null) {
          setAvatarCard(null);
        }
        if (p.active_run !== undefined) {
           if (p.active_run && typeof p.active_run === 'object' && ('solo' in p.active_run || Object.keys(p.active_run).some(k => k.startsWith('coop_')))) {
               setAllRuns(p.active_run);
           } else {
               setAllRuns({ solo: p.active_run });
           }
        }
        if (p.meta_stats !== undefined) setMetaStats(p.meta_stats || {});

        localStorage.setItem('aoc_credits', (p.credits || 500).toString());
        localStorage.setItem('aoc_inventory', JSON.stringify(p.inventory || []));
        localStorage.setItem('aoc_decks', JSON.stringify(p.decks || []));
        localStorage.setItem('aoc_avatar', JSON.stringify(p.avatar_card || null));
        localStorage.setItem('aoc_all_runs', JSON.stringify(p.active_run ? (p.active_run.solo !== undefined ? p.active_run : { solo: p.active_run }) : { solo: null }));
        localStorage.setItem('aoc_meta_stats', JSON.stringify(p.meta_stats || {}));
        
      } else {
        const inv = makeStarterInventory();
        const d = makeStarterDecks();
        await supabase.from('profiles').insert({
          id: user.id, username: (user.user_metadata?.username || 'AGENT').toUpperCase(),
          credits: 500, inventory: inv, decks: d, avatar_card: null, active_run: null, meta_stats: {}
        });
        setCredits(500); setInventory(inv); setDecks(d);
      }
      cloudSyncReady.current = true;
    } catch (e) {
      console.error('[Profile Load Error]', e);
    }
  };

  const saveToCloud = async (updates) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update(updates).eq('id', user.id);
    } catch (e) { console.error('[Save]', e); }
  };

  useEffect(() => {
    if (guestMode || !cloudSyncReady.current) return;
    if (session && !avatarCard) return;

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
        active_run: allRuns,
        meta_stats: syncedMeta
      });
    }, 1500);

    return () => clearTimeout(t);
  }, [credits, inventory, decks, avatarCard, allRuns, metaStats, guestMode, session]);

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
        if (currentView === 'menu' && playMenuOpen) { playSound('click'); setPlayMenuOpen(false); return; }

        // 3. Priorität: Menüs, die ins Ghost Node Menu zurückgehen
        const backToGhostViews = ['avatarlab', 'roguelikesquad', 'roguelikemap', 'roguelikefailed'];
        if (backToGhostViews.includes(currentView)) {
          playSound('click');
          setCurrentView('ghostnodemenu');
          return;
        }

        // 4. Priorität: Menüs, die ins Hauptmenü zurückgehen
        const backToMenuViews = ['ghostnodemenu', 'inventory', 'market', 'missions', 'lexicon', 'overrides', 'leaderboard', 'stats', 'ghostnetwork', 'difficulty'];
        if (backToMenuViews.includes(currentView)) {
          playSound('click');
          setCurrentView('menu');
          return;
        }

        // Spezialfall: Multiplayer (Nur wenn noch NICHT verbunden)
        if (currentView === 'multiplayer' && !conn) {
          playSound('click');
          setCurrentView('menu');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [currentView, playMenuOpen, showGlobalRules, lexiconInspectCard, pendingOutgoingInvite, conn]);

  const updateAvatar = (newAvatar) => { setAvatarCard(newAvatar); };

  const generateAIDeck = (nodeObj, sector) => {
    const isBoss = nodeObj.type === 'boss';
    const isElite = nodeObj.type === 'elite';
    const BASE_HP = baseHp; // DYNAMISCHER BALANCING WERT
    let aHP = BASE_HP;
    let diff = (isBoss || sector >= 4) ? 4 : 3;

    if (isBoss) {
      // Bosse skalieren von 1.6x bis 4.0x BASE_HP
      const bossMultipliers = [0, 1.6, 2.0, 2.6, 3.2, 4.0];
      const baseBossHP = BASE_HP * (bossMultipliers[sector] || 4.0);
      aHP = sector > 5 ? baseBossHP + (sector - 5) * (BASE_HP * 0.5) : baseBossHP;
    } else {
      // Standard: 1.0x (S1-2, S4) oder 1.4x (S3, S5)
      // Elite: 1.5x (S1-2, S4) oder 2.0x (S3, S5)
      const isHighSecSector = (sector === 3 || sector === 5);
      const typeMult = isElite ? (isHighSecSector ? 2.0 : 1.5) : (isHighSecSector ? 1.4 : 1.0);
      
      const baseNodeHP = BASE_HP * typeMult;
      aHP = sector > 5 ? baseNodeHP + (sector - 5) * (BASE_HP * 0.25) : baseNodeHP;
    }
    aHP = Math.floor(aHP);

    // 3. KARTEN-LEVEL BERECHNEN (Maximal 3 für visuelles Cap)
    const finalLevel = nodeObj.type === 'boss' ? 3 : Math.min(3, Math.ceil(sector / 2));

    // 4. ENDLESS SCALING: Extra GTI-Buff auf alle Stats ab Sektor 6
    const extraGtiBuff = sector > 5 ? (sector - 5) * 5 : 0;

    // 5. DECK ZUSAMMENSTELLEN (Mit stufenabhängigen Fraktions-Synergien!)
    let charPool = [...cardsData.characters];
    let archetype = nodeObj.type;
    let pickedChars = [];

    if (diff === 1) {
        // Trainee: Keine Synergien, pures Chaos
        pickedChars = shuffle(charPool).slice(0, 4);
    } else if (diff === 2) {
        // Operative: Genau 1 Synergie (3 Karten einer Fraktion)
        const factions = shuffle(allFactions);
        const synFac = factions.find(f => charPool.filter(c => c.faction === f).length >= 3) || factions[0];
        const synCards = charPool.filter(c => c.faction === synFac).slice(0, 3);
        const other = shuffle(charPool.filter(c => c.faction !== synFac))[0] || charPool[0];
        pickedChars = [...synCards, other];
    } else if (diff >= 3) {
        // Executive / Architect: Perfekte 3er Synergie + stärkster Apex/Legacy
        const factions = shuffle(allFactions);
        const synFac = factions.find(f => charPool.filter(c => c.faction === f).length >= 3) || factions[0];
        const synCards = charPool.filter(c => c.faction === synFac).sort((a,b) => (b.gti||0)-(a.gti||0)).slice(0, 3);
        const topBoss = charPool.filter(c => c.type === 'apex' || c.type === 'legacy').sort((a,b) => (b.gti||0)-(a.gti||0))[0] || shuffle(charPool)[0];
        pickedChars = [...synCards, topBoss];
    }

    // Fallback, falls Duplicate entstehen
    pickedChars = [...new Set(pickedChars)];
    while (pickedChars.length < 4) { pickedChars.push(shuffle(charPool.filter(c => !pickedChars.includes(c)))[0]); }

    const shuffledChars = shuffle(pickedChars);
    const aiChars = shuffledChars.map(c => {
      // Deep-Copy der Stats, um Abstürze zu verhindern
      let card = { ...c, level: finalLevel, stats: c.stats ? { ...c.stats } : undefined };
      if (extraGtiBuff > 0) {
        ['tech','finance','manipulation','erosion','kingmaking','system','arsenal','legitimacy'].forEach(k => {
           if (card[k] !== undefined) card[k] += extraGtiBuff;
           else if (card.stats && card.stats[k] !== undefined) card.stats[k] += extraGtiBuff;
        });
      }
      return card;
    });
    
    const effs = cardsData.effects || [];
    const aiEffs = effs.length > 0 ? [{ ...effs[Math.floor(Math.random() * effs.length)], level: 1 }] : [];
    
    return { aiChars, aiEffs, difficulty: diff, initialAHP: aHP, archetype, node: nodeObj };
  };

  const startRoguelikeRunWithDeck = (selectedChars, selectedEffs, teamChar) => {
    if (!avatarCard) return;

    if (isCoopMode) {
        if (lobbyMode === 'join') {
            // Client sendet sein Deck an den Host und wartet
            conn.send({ type: 'CLIENT_SQUAD_READY', payload: { chars: selectedChars, effs: selectedEffs, teamChar, avatarCard } });
            setMySquadReady(true);
            return;
        }

        if (lobbyMode === 'host') {
            if (!clientSquadReady) {
                alert("Warte auf den Partner, bis er sein Squad bestätigt hat!");
                return;
            }
            
            // Mische die Team Assets!
            const hostTeamAsset = teamChar ? { ...teamChar, isTeamAsset: true } : null;
            const clientTeamAsset = clientSquadReady.teamChar ? { ...clientSquadReady.teamChar, isTeamAsset: true } : null;
            
            let assignedToHost = hostTeamAsset;
            let assignedToClient = clientTeamAsset;

            // 50/50 Chance zu tauschen, falls BEIDE eine Karte in den Slot gelegt haben
            if (hostTeamAsset && clientTeamAsset && Math.random() > 0.5) {
                assignedToHost = clientTeamAsset;
                assignedToClient = hostTeamAsset;
            }

            let hostChars = [{ ...avatarCard }, ...selectedChars];
            if (assignedToHost) hostChars.push(assignedToHost);

            let clientChars = [{ ...clientSquadReady.avatarCard }, ...clientSquadReady.chars];
            if (assignedToClient) clientChars.push(assignedToClient);

            // FIX: Co-Op Base (500 HP Team-Pool)
            const baseRunInfo = { currentHP: 1000, maxHP: 1000, sector: 1, node: 1, seed: Math.random(), isCoop: true };
            
            const hostRun = { ...baseRunInfo, runDeck: { chars: hostChars, effs: selectedEffs } };
            const clientRun = { ...baseRunInfo, runDeck: { chars: clientChars, effs: clientSquadReady.effs } };

            setRoguelikeRun(hostRun);
            setClientSquadReady(null); // Reset für nächsten Run
            setMySquadReady(false);
            
            // Sende dem Client exakt SEIN eigenes, zusammengemischtes Deck
            conn.send({ type: 'SYNC_RUN_STATE', run: clientRun });
            conn.send({ type: 'NAV_TO', view: 'roguelikemap' });
            setCurrentView('roguelikemap');
            return;
        }
    }

    // ── STRIKTER SINGLEPLAYER FALL ──
    let compiledChars = [{ ...avatarCard }, ...selectedChars];
    // Im Solo-Modus wird das eigene TeamAsset (sofern gewählt) einfach mit ins Deck gestopft
    if (teamChar) compiledChars.push({ ...teamChar, isTeamAsset: true });
    
    const newRun = {
      currentHP: 500, 
      maxHP: 500, 
      sector: 1, 
      node: 1, 
      seed: Math.random(),
      isCoop: false,
      runDeck: { chars: compiledChars, effs: selectedEffs },
    };
    
    // FIX: Explizit auf den Solo-Context umschalten, falls wir aus einer Co-Op Session kommen
    setRunContext('solo');
    setRoguelikeRun(newRun);
    setCurrentView('roguelikemap');
  };

  const startRoguelikeEvent = (nodeObj) => {
    setRoguelikeEventData(nodeObj);
    setCurrentView('roguelikeevent');
    if (conn && isCoopMode) {
      conn.send({ type: 'START_RL_EVENT', nodeObj });
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
    
    // FIX: Im Co-Op generiert NUR der Host die Gegner und schickt sie an den Client!
    if (isCoopMode) {
        if (lobbyMode === 'host') {
            const hostAIData = generateAIDeck(nodeObj, roguelikeRun.sector);
            const clientAIData = generateAIDeck(nodeObj, roguelikeRun.sector);

            setRoguelikeMatchData(hostAIData);
            setCurrentView('match');

            if (conn) conn.send({ type: 'START_RL_MATCH', aiData: clientAIData });
        }
        // Client macht hier gar nichts, sondern wartet einfach auf das Paket vom Host!
        return;
    }

    // Singleplayer Fall
    const myData = generateAIDeck(nodeObj, roguelikeRun.sector);
    setRoguelikeMatchData(myData);
    setCurrentView('match');
  };

  // --- DIE REPARIERTE LOOT & DRAFT LOGIK ---
  const handleEndGame = ({ isWin, sarcasmNews, isAbort = false }) => {
    const isOnlineMatch = !!conn;
    const effectiveDifficulty = isOnlineMatch ? 4 : difficulty;
    const conf = DIFFICULTY_CONFIG[effectiveDifficulty];
    const reward = isWin ? conf.reward : (isAbort ? 0 : conf.loseReward);
    
    setStats(prev => ({ ...prev, wins: prev.wins + (isWin ? 1 : 0), losses: prev.losses + (isWin ? 0 : 1), bossDefeats: (prev.bossDefeats || 0) + (isWin && effectiveDifficulty === 4 ? 1 : 0) }));
    
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
    
    if (isAbort && conn) disconnectPeer();

    setCurrentView('postmatch'); 
  };

  const handleRoguelikeEndGame = ({ isWin, sarcasmNews, remainingHP, isAbort = false }) => {
    if (!isWin || isAbort) {
      setRoguelikeMatchData(null);
      setRoguelikeRun(null);
      setCurrentView('roguelikefailed');
      return;
    }

    const node = roguelikeRun.node;
    // FIX: difficulty >= 4 ist in Sektoren >= 4 für ALLE Nodes gesetzt – daher nur node.type prüfen!
    const isBoss = node >= 5 || roguelikeMatchData?.node?.type === 'boss';
    const isElite = node === 3 || roguelikeMatchData?.node?.type === 'elite';
    const currentSector = roguelikeRun.sector;
    
    const isSector5Boss = isBoss && currentSector === 5; // Finalboss: Sektor 5 Architect
    const spGain = isBoss ? (3 + Math.floor(currentSector/3)) : (isElite ? (currentSector > 3 ? 2 : 1) : 1);
    const earnedCredits = Math.floor((isBoss ? 500 : (isElite ? 200 : 75)) * (1 + currentSector * 0.15));

    let newNode = node + 1;
    let newSector = currentSector;
    let newSeed = roguelikeRun.seed || Math.random();
    if (isBoss) { newNode = 1; newSector++; newSeed = Math.random(); } // NEU: Frischer Seed für neuen Sektor

    const updatedRun = { 
      ...roguelikeRun, 
      currentHP: Math.max(0, remainingHP), 
      node: newNode, 
      sector: newSector,
      seed: newSeed // NEU: Seed wird gespeichert
    };
    const updatedAvatar = { ...avatarCard, sp: (avatarCard.sp || 0) + spGain };

    // 1. DRAFT GENERIEREN (3 Karten für das Deck - Level 1, Duplikate erlaubt!)
    const allPool = [...cardsData.characters, ...(cardsData.effects || [])];
    const draftPool = [...allPool]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(c => ({ ...c, level: 1 }));

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

        let pool = allPool.filter(c => c.type === cType);
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

    // 4. ZUM DRAFT-SCREEN LEITEN (Inkl. Transcendence Flag)
    setRewardData({ 
      draft: draftPool,
      hpUpdate: { next: Math.max(0, remainingHP), max: roguelikeRun.maxHP },
      loot: { sp: spGain, credits: earnedCredits },
      isTranscendenceTrigger: isSector5Boss
    });
    setCurrentView('roguelikereward');
    
    // FIX: active_run muss das gesamte allRuns-Dict speichern, nicht nur den Raw-Run.
    const updatedAllRuns = { ...allRuns, [runContextRef.current]: updatedRun };
    saveToCloud({ 
      credits: credits + earnedCredits, 
      active_run: updatedAllRuns, 
      avatar_card: updatedAvatar
    });
  };

  const applyRoguelikeDraft = (newCard, replaceIndex, replaceIn, isUpgrade = false, sendToPartner = false) => {
    if (!roguelikeRun) return;

    // PARTNER TRANSFER: Karte schicken statt ins eigene Deck aufnehmen
    if (sendToPartner && conn && isCoopMode) {
      conn.send({ type: 'TEAM_DRAFT_TRANSFER', card: newCard });
      playSound('upgrade');
      setRewardData(null);
      setCurrentView('roguelikemap');
      return;
    }
    
    // FIX: Functional update statt direktem roguelikeRun-Spread – verhindert Stale-Closure-Bug,
    // der node/sector nach handleRoguelikeEndGame wieder auf den alten Wert zurücksetzen würde.
    setRoguelikeRun(prev => {
      if (!prev) return prev;
      const deck = { chars: [...prev.runDeck.chars], effs: [...prev.runDeck.effs] };

      if (isUpgrade) {
        // KARTE IM DECK FINDEN UND LEVEL ERHÖHEN
        if (newCard.type === 'effect' || newCard.buff !== undefined) {
          const idx = deck.effs.findIndex(c => c.name === newCard.name);
          if (idx > -1) deck.effs[idx].level = (deck.effs[idx].level || 1) + 1;
        } else {
          const idx = deck.chars.findIndex(c => c.name === newCard.name);
          if (idx > -1) deck.chars[idx].level = (deck.chars[idx].level || 1) + 1;
        }
      } else {
        // NORMALES ERSETZEN (Level 1)
        if (replaceIn === 'chars') {
          deck.chars.splice(replaceIndex, 1);
        } else {
          deck.effs.splice(replaceIndex, 1);
        }
        if (newCard.type === 'effect' || newCard.buff !== undefined) {
          deck.effs.push({ ...newCard, level: 1 });
        } else {
          deck.chars.push({ ...newCard, level: 1 });
        }
      }

      return { ...prev, runDeck: deck };
    });
    
    setRewardData(null); 
    setCurrentView('roguelikemap');
  };

  const handleMidMatchTrade = (receivedCard, givenCard) => {
      if (!roguelikeRun) return;
      
      const deck = { chars: [...roguelikeRun.runDeck.chars], effs: [...roguelikeRun.runDeck.effs] };
      const isEff = receivedCard.type === 'effect' || receivedCard.buff !== undefined;
      const givenIsEff = givenCard.type === 'effect' || givenCard.buff !== undefined;

      // 1. Gegebene Karte aus dem permanenten RunDeck entfernen
      if (givenIsEff) {
          const idx = deck.effs.findIndex(c => c.name === givenCard.name);
          if (idx > -1) deck.effs.splice(idx, 1);
      } else {
          const idx = deck.chars.findIndex(c => c.name === givenCard.name);
          if (idx > -1) deck.chars.splice(idx, 1);
      }

      // 2. Erhaltene Karte einfügen oder hochleveln
      if (isEff) {
          const existing = deck.effs.find(c => c.name === receivedCard.name);
          if (existing) existing.level = (existing.level || 1) + 1;
          else deck.effs.push({ ...receivedCard, level: receivedCard.level || 1 });
      } else {
          const existing = deck.chars.find(c => c.name === receivedCard.name);
          if (existing) existing.level = (existing.level || 1) + 1;
          else deck.chars.push({ ...receivedCard, level: receivedCard.level || 1 });
      }

      // FIX: Functional update statt Closure-Spread
      setRoguelikeRun(prev => prev ? { ...prev, runDeck: deck } : prev);
  };

  // NEU: Bulletproof Background Receiver (Stört keine aktiven Menüs!)
  const handleBackgroundCardReceive = (card) => {
    playSound('upgrade');
    setRoguelikeRun(prev => {
      if (!prev) return prev;
      const deck = { chars: [...prev.runDeck.chars], effs: [...prev.runDeck.effs] };
      const isEffCard = card.type === 'effect' || card.buff !== undefined;
      
      if (isEffCard) {
          const existing = deck.effs.find(c => c.name === card.name);
          if (existing) {
              existing.level = (existing.level || 1) + 1; // Upgrade!
          } else if (deck.effs.length > 0) {
              // Schwächsten Effekt ersetzen
              const replaceIdx = deck.effs.reduce((minI, c, i) => (c.gti || 0) < (deck.effs[minI]?.gti || 0) ? i : minI, 0);
              deck.effs.splice(replaceIdx, 1);
              deck.effs.push({ ...card, level: 1 });
          } else {
              deck.effs.push({ ...card, level: 1 });
          }
      } else {
          const existing = deck.chars.find(c => c.name === card.name);
          if (existing) {
              existing.level = (existing.level || 1) + 1; // Upgrade!
          } else if (deck.chars.length > 1) { // 0 ist der unantastbare Avatar!
              const charsOnly = deck.chars.slice(1);
              const lowestLocal = charsOnly.reduce((minI, c, i) => (c.gti || 0) < (charsOnly[minI]?.gti || 0) ? i : minI, 0);
              deck.chars.splice(lowestLocal + 1, 1);
              deck.chars.push({ ...card, level: 1 });
          } else {
              deck.chars.push({ ...card, level: 1 });
          }
      }
      return { ...prev, runDeck: deck };
    });
  };

  const disconnectPeer = () => {
    if (conn) conn.close();
    if (peer) peer.destroy();
    setPeer(null);
    setConn(null);
    setMyPeerId('');
    setRemotePeerId('');
    setLobbyMode('select');
    setMyOnlineDeck(null);
    setRemoteDeck(null);
    setCoopAIDecks(null);
    setClientSquadReady(null); // FIX: Verhindert "Warte auf Host" Bug im nächsten Run
    setMySquadReady(false);    // FIX: Verhindert "Warte auf Host" Bug im nächsten Run
    setPendingOutgoingInvite(null); 
  };

  const navTo = (view) => {
    playSound('click');
    if (currentView === 'multiplayer' && view !== 'multiplayer' && view !== 'match') {
      disconnectPeer();
    }
    if (currentView === 'postmatch' && view === 'menu' && conn) {
      disconnectPeer();
    }
    setCurrentView(view);
  };

  const prepareMyDeck = () => {
    const readyDeck = { chars: shuffle(activeDeck.chars), effs: shuffle(activeDeck.effs) };
    setMyOnlineDeck(readyDeck);
    return readyDeck;
  };

  const startHosting = (mode = 'pvp', inviteTargetId = null) => {
    if (activeDeck.chars.length !== 12 || activeDeck.effs.length !== 3) {
      alert("Dein aktives Deck ist unvollständig! (12 Chars, 3 Effekte benötigt)");
      return;
    }
    playSound('click');
    setIsCoopMode(mode === 'coop');
    setLobbyMode('host');
    const myDeck = prepareMyDeck();

    let hostAI, clientAI;
    if (mode === 'coop') {
        hostAI = getAIDeck();
        clientAI = getAIDeck();
        setCoopAIDecks({ myAI: hostAI, partnerAI: clientAI });
    }

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
      // PARTNER IST BEIGETRETEN — Pending State auflösen und automatisch navigieren
      setPendingOutgoingInvite(null);
      playSound('upgrade');

      setConn(connection);
      connection.on('open', () => {
        if (mode === 'coop') {
           const targetView = roguelikeRun ? 'roguelikemap' : 'roguelikesquad';
           connection.send({ type: 'COOP_INIT', hostDeck: myDeck, clientAI: clientAI, difficulty: difficulty });
           connection.send({ type: 'NAV_TO', view: targetView }); // Client mitziehen!
           setCurrentView(targetView);
        } else {
           connection.send({ type: 'PVP_INIT', chars: myDeck.chars, effs: myDeck.effs });
           setCurrentView('multiplayer');
        }
      });
      connection.on('data', (data) => {
        if (data.type === 'DECK_SYNC') {
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
            setRoguelikeRun(prev => prev ? { ...prev, currentHP: data.hp, sector: data.sector, node: data.node, seed: data.seed } : prev);
        } else if (data.type === 'NAV_TO') {
            setCurrentView(data.view);
        } else if (data.type === 'TEAM_DRAFT_TRANSFER' || data.type === 'TEAM_DRAFT_RECEIVE') {
            handleBackgroundCardReceive(data.card);
        } else if (data.type === 'CLIENT_SQUAD_READY') {
            setClientSquadReady(data.payload);
        }
      });
      connection.on('close', () => { 
        if (currentView !== 'postmatch') { alert("Netzwerkverbindung unterbrochen."); disconnectPeer(); setCurrentView('menu'); }
      });
    });
    setPeer(newPeer);
  };

  const startJoining = () => {
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
      connection.send({ type: 'DECK_SYNC', chars: myOnlineDeck.chars, effs: myOnlineDeck.effs });
    });
    connection.on('data', (data) => {
      if (data.type === 'COOP_INIT') {
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
      } else if (data.type === 'TEAM_DRAFT_RECEIVE') {
          applyRoguelikeDraft(data.card, null, null, false, true);
      }
    });
    connection.on('close', () => { 
        if (currentView !== 'postmatch') { alert("Host hat die Verbindung geschlossen."); disconnectPeer(); setCurrentView('menu'); }
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
    const counts = {}; const levels = {};
    inventory.forEach(c => {
      if (c.type === 'effect') return;
      counts[c.name] = (counts[c.name] || 0) + 1;
      levels[c.name] = Math.max(levels[c.name] || 1, c.level || 1);
    });
    return Object.keys(counts).some(n => counts[n] >= 3 && levels[n] < 3);
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

  const claimMission = (id, e) => {
    playSound('win');
    setMissions(prev => {
      const next = prev.map(m => {
        if (m.id === id && m.progress >= m.target && !m.claimed) { handleCreditGain(e.clientX, e.clientY, m.reward); return { ...m, claimed: true }; }
        return m;
      });
      if (next.every(m => m.claimed)) {
        setTimeout(() => { playSound('clash'); setMissions(curr => generateNewMissions(curr.map(m => m.baseId))); }, 1500);
      }
      return next;
    });
  };

  const resetGame = () => {
    playSound('click');
    if (window.confirm("ACHTUNG: Möchtest du wirklich alle Credits, Karten und Statistiken löschen? Dieser Vorgang kann nicht rückgängig gemacht werden!")) {
      localStorage.clear(); window.location.reload();
    }
  }

  // ── Auth Guard ────────────────────────────────────────────────────────────
  if (session === undefined) return (
    <div style={{position:'fixed',inset:0,background:'#05050a',display:'flex',alignItems:'center',justifyContent:'center'}}>
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
    // scaleStyle entfernt, da es Layout-Probleme auf verschiedenen Auflösungen verursacht
    const scaleStyle = {};
    
    if (currentView === 'ghostnodemenu') return (
      <div style={scaleStyle}>
        <GhostNodeMenu 
          session={session}
          baseHp={baseHp}
          setBaseHp={setBaseHp}
          avatarCard={avatarCard} 
          updateAvatar={updateAvatar} 
          roguelikeRun={roguelikeRun} 
          allRuns={allRuns}
          onGoToLab={() => setCurrentView('avatarlab')} 
          onGoToSquad={() => setCurrentView('roguelikesquad')} 
          onGoToMap={() => setCurrentView('roguelikemap')} 
          onBack={() => setCurrentView('menu')} 
          friends={friends} 
          onInviteDirect={(targetId) => startHosting('coop', targetId)} 
          onDeleteCoop={(targetId) => {
             if(window.confirm('Diesen Co-Op Run wirklich löschen? Beide Spieler starten beim nächsten Mal wieder von vorne!')) {
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
    if (currentView === 'avatarlab') return <div style={scaleStyle}><AvatarLab avatarCard={avatarCard} updateAvatar={updateAvatar} onBack={() => setCurrentView('ghostnodemenu')} onGoToMission={() => { if (roguelikeRun) setCurrentView('roguelikemap'); else setCurrentView('roguelikesquad'); }} allFactions={allFactions} /></div>;
    if (currentView === 'roguelikesquad') return <div style={scaleStyle}><RoguelikeSquad avatarCard={avatarCard} inventory={inventory} onConfirm={startRoguelikeRunWithDeck} onBack={() => setCurrentView('ghostnodemenu')} isCoop={isCoopMode} isHost={lobbyMode === 'host'} partnerReady={!!clientSquadReady} mySquadReady={mySquadReady} /></div>;
    if (currentView === 'roguelikemap') {
      if (!roguelikeRun) return <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}><div className="mono" style={{ color: 'var(--ep)', fontSize: '1.2rem', animation: 'pulse 1s infinite' }}>INITIALISIERE THE GRID...</div></div>;
      return <RoguelikeMap baseHp={baseHp} avatarCard={avatarCard} roguelikeRun={roguelikeRun} onStartRun={startRoguelikeRun} onStartBattle={startRoguelikeMatch} onStartEvent={startRoguelikeEvent} onBack={() => setCurrentView('ghostnodemenu')} onGoToLab={() => setCurrentView('avatarlab')} isCoop={isCoopMode} conn={conn} isHost={lobbyMode === 'host'} />;
    }
    if (currentView === 'roguelikeevent' && roguelikeEventData) return <RoguelikeEventScreen nodeObj={roguelikeEventData} roguelikeRun={roguelikeRun} avatarCard={avatarCard} cardsData={cardsData} onComplete={(nextRun, nextAvatar) => {
      playSound('click');
      setRoguelikeRun(nextRun);
      setAvatarCard(nextAvatar);
      setRoguelikeEventData(null);
      // FIX: Sofortiges Save – kein Fortschrittsverlust im 1500ms-Debounce-Fenster
      saveToCloud({ active_run: { ...allRuns, [runContextRef.current]: nextRun }, avatar_card: nextAvatar });
      setCurrentView('roguelikemap');
    }} />;
    if (currentView === 'roguelikereward') return (
      <RoguelikeReward 
        rewardData={rewardData} 
        roguelikeRun={roguelikeRun} 
        onApplyDraft={applyRoguelikeDraft} 
        onSkip={() => { setRewardData(null); setCurrentView('roguelikemap'); }} 
        onFinishRun={() => { setRoguelikeRun(null); setCurrentView('ghostnodemenu'); }}
        isCoop={isCoopMode} 
      />
    );
    if (currentView === 'roguelikefailed') return <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}><div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '50px 40px', textAlign: 'center', borderColor: 'var(--lose)' }}><div style={{ fontSize: '3rem', marginBottom: '16px' }}>💀</div><div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '2.5rem', fontWeight: 900, letterSpacing: '6px', color: 'var(--lose)', textShadow: '0 0 30px rgba(255,0,50,0.5)', marginBottom: '8px' }}>RUN FAILED</div><div className="mono" style={{ color: '#ff6680', fontSize: '0.72rem', letterSpacing: '3px', marginBottom: '26px' }}>AGENT KOMPROMITTIERT — SYSTEM COLLAPSED</div><div style={{ padding: '14px', background: 'rgba(255,0,50,0.05)', border: '1px solid rgba(255,0,50,0.15)', borderLeft: '3px solid var(--lose)', marginBottom: '26px' }}><div className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px' }}>AVATAR-KARTE BLEIBT ERHALTEN — UPGRADES PERSISTENT</div>{avatarCard && <div className="mono" style={{ color: 'var(--ep)', marginTop: '6px', fontWeight: 700 }}>{avatarCard.name} // SP: {avatarCard.sp ?? 0}</div>}</div><button className="menu-btn btn-play modern-btn" onClick={() => setCurrentView('ghostnodemenu')}>ZURÜCK ZUM HUB</button></div></div>;
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
      
      {/* GLOBALE SCANLINES (Mit neuem Z-Index 5!) */}
      <div className="rl-scanline-overlay" />

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
            isCoop={isCoopMode}
            conn={conn}
            isHost={lobbyMode === 'host'}

            difficulty={roguelikeMatchData.difficulty}
            isRoguelike={true}
            contextLabel={`SEKTOR ${roguelikeRun.sector} // NODE ${roguelikeRun.node}`}
            initialPHP={roguelikeRun.currentHP}
            initialAHP={roguelikeMatchData.initialAHP}
            onEndGame={handleRoguelikeEndGame}
            onShowRules={() => { playSound('click'); setShowGlobalRules(true); }}
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
            isCoop={isCoopMode}
            isHost={lobbyMode === 'host'}
            conn={conn}
            onEndGame={handleEndGame}
            onShowRules={() => { playSound('click'); setShowGlobalRules(true); }}
          />
        )
      )}

      {currentView === 'difficulty' && (
        <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="game-title-small" style={{ color: '#fff', fontSize: '2rem', marginBottom: '40px', letterSpacing: '8px' }}>THREAT LEVEL WÄHLEN</div>
          
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              {[1, 2, 3, 4].map(lvl => (
                <button key={lvl} className="btn-act" style={{ borderColor: difficulty === lvl ? DIFFICULTY_CONFIG[lvl].color : '#333', borderLeft: `4px solid ${DIFFICULTY_CONFIG[lvl].color}`, background: difficulty === lvl ? 'rgba(255,255,255,0.05)' : '#0c0c14' }} onClick={() => { playSound('click'); setDifficulty(lvl); }}>
                  <span className="act-title" style={{ color: difficulty === lvl ? '#fff' : '#888' }}>{DIFFICULTY_CONFIG[lvl].name}</span>
                  <span className="act-cost mono" style={{ color: DIFFICULTY_CONFIG[lvl].color }}>LVL {lvl}</span>
                </button>
              ))}
            </div>
            <div className="log-box" style={{ borderColor: DIFFICULTY_CONFIG[difficulty].color, minHeight: '80px', marginBottom: '30px' }}>
              <div style={{ color: DIFFICULTY_CONFIG[difficulty].color, fontWeight: 'bold', marginBottom: '5px' }}>SIEGBELOHNUNG: +{DIFFICULTY_CONFIG[difficulty].reward} 💳</div>
              <div style={{ color: '#ccc', fontSize: '0.95rem' }}>{DIFFICULTY_CONFIG[difficulty].desc}</div>
            </div>
            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
              <button className="menu-btn btn-play" style={{ margin: '0' }} onClick={() => setCurrentView('match')}>KAMPF STARTEN</button>
              <button className="menu-btn" style={{ margin: '0', borderColor: '#444', color: '#888' }} onClick={() => setCurrentView('menu')}>ZURÜCK</button>
            </div>
          </div>

          {/* --- SYSTEM ADMIN PANEL (NUR FÜR ARCHITECTS) --- */}
          {isAdmin && (
            <div style={{ 
              position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, 
              padding: '15px', background: 'rgba(255,215,0,0.05)', 
              border: '1px dashed rgba(255,215,0,0.4)', borderLeft: '3px solid #ffd700', 
              backdropFilter: 'blur(4px)' 
            }}>
               <div className="mono" style={{ fontSize: '0.65rem', color: '#ffd700', letterSpacing: '2px', marginBottom: '12px', fontWeight: 'bold' }}>▸ SYSTEM ADMIN: NORMAL GAMES</div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span className="mono" style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)' }}>PLAYER HP ({normalPlayerHp})</span>
                     <button onClick={() => setNormalPlayerHp(200)} style={{ background: 'transparent', border: '1px solid #555', color: '#888', fontSize: '0.45rem', padding: '2px 6px', cursor: 'pointer' }}>RESET</button>
                  </div>
                  <input type="range" min="50" max="1000" step="10" value={normalPlayerHp} onChange={(e) => setNormalPlayerHp(parseInt(e.target.value))} style={{ width: '200px', accentColor: '#ffd700' }} />
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <span className="mono" style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)' }}>ENEMY HP ({normalEnemyHp})</span>
                     <button onClick={() => setNormalEnemyHp(200)} style={{ background: 'transparent', border: '1px solid #555', color: '#888', fontSize: '0.45rem', padding: '2px 6px', cursor: 'pointer' }}>RESET</button>
                  </div>
                  <input type="range" min="50" max="1000" step="10" value={normalEnemyHp} onChange={(e) => setNormalEnemyHp(parseInt(e.target.value))} style={{ width: '200px', accentColor: '#ffd700' }} />
               </div>
            </div>
          )}

        </div>
      )}

      {currentView === 'multiplayer' && (
        <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="game-title-small" style={{ fontSize: '2rem', marginBottom: '30px', color: 'var(--ep)', textShadow: '0 0 15px var(--ep)' }}>P2P NETWORK LOBBY</div>
          
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '40px', textAlign: 'center' }}>
            
            {!conn ? (
              <>
                {lobbyMode === 'select' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="mono" style={{ color: '#888', marginBottom: '-10px' }}>HOST OPTIONS</div>
                    <button className="menu-btn btn-primary" onClick={() => startHosting('pvp')}>1v1 PVP DUELL HOSTEN</button>
                    
                    <div className="mono" style={{ color: '#888', marginTop: '10px', marginBottom: '-10px' }}>JOIN OPTIONS</div>
                    <button className="menu-btn" style={{ borderColor: 'var(--win)', color: 'var(--win)' }} onClick={startJoining}>ALS CLIENT BEITRETEN</button>
                  </div>
                )}
                {lobbyMode === 'host' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <h3 style={{ color: '#ccc', margin: 0 }}>GIB DEM GEGNER DIESE ID:</h3>
                    {myPeerId ? (
                        <div className="mono" style={{ fontSize: '2rem', color: 'var(--ep)', background: '#000', padding: '15px 30px', border: '1px solid var(--ep)', borderRadius: '8px', letterSpacing: '4px' }}>{myPeerId}</div>
                    ) : ( <div className="mono" style={{ fontSize: '1.5rem', color: '#888' }}>GENERIEREN...</div> )}
                    <p style={{ color: 'var(--win)', animation: 'pulse 1.5s infinite' }}>Warte auf eingehende Verbindung...</p>
                  </div>
                )}
                {lobbyMode === 'join' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
                    <h3 style={{ color: '#ccc', margin: 0 }}>GEGNER-ID EINGEBEN:</h3>
                    <input type="text" value={remotePeerId} onChange={e => setRemotePeerId(e.target.value)} className="mono" placeholder="z.B. a1b2c3d4" style={{ width: '100%', maxWidth: '400px', padding: '15px', fontSize: '1.5rem', textAlign: 'center', background: '#000', border: '1px solid var(--win)', color: 'var(--win)', borderRadius: '8px' }} />
                    <button className="menu-btn" style={{ background: 'var(--win)', color: '#000', fontWeight: '900' }} onClick={connectToHost}>VERBINDEN</button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                 <div className="pack-icon" style={{ fontSize: '4rem', color: 'var(--win)', animation: 'pulse 1.5s infinite' }}>📡</div>
                 <h2 style={{ color: 'var(--win)', margin: 0, letterSpacing: '2px' }}>VERBINDUNG HERGESTELLT</h2>
                 
                 {!remoteDeck ? (
                    <p style={{ color: '#aaa', animation: 'pulse 1.5s infinite' }}>Synchronisiere Decks...</p>
                 ) : (
                    <div style={{marginTop: '20px', width: '100%'}}>
                        <p style={{ color: 'var(--win)', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '20px' }}>✓ DECKS SYNCHRONISIERT</p>
                        <button className="menu-btn btn-primary" 
                          disabled={isCoopMode && lobbyMode !== 'host'}
                          onClick={() => {
                            playSound('click');
                            if (isCoopMode) {
                                if (lobbyMode === 'host') {
                                    // Prüfen: Haben wir einen echten Co-Op Run oder nur alten SP-Müll?
                                    const targetView = (!roguelikeRun || !roguelikeRun.isCoop) ? 'roguelikesquad' : 'roguelikemap';
                                    
                                    // Falls wir neu starten, SP-Run für diese Session ignorieren
                                    if (targetView === 'roguelikesquad') setRoguelikeRun(null);
                                    
                                    setCurrentView(targetView);
                                    conn.send({ type: 'NAV_TO', view: targetView });
                                }
                            } else {
                                setCurrentView('match');
                            }
                        }} style={ (isCoopMode && lobbyMode !== 'host') ? { opacity: 0.5, cursor: 'not-allowed' } : {} }>
                           {isCoopMode ? (lobbyMode === 'host' ? 'KOOP MISSION STARTEN' : 'WARTE AUF HOST...') : 'ONLINE MATCH STARTEN'}
                        </button>
                    </div>
                 )}

                 <button className="menu-btn" style={{ borderColor: 'var(--lose)', color: 'var(--lose)', marginTop: '20px' }} onClick={disconnectPeer}>VERBINDUNG TRENNEN</button>
              </div>
            )}
            {!conn && <button className="menu-btn" style={{ borderColor: '#444', color: '#888', marginTop: '40px' }} onClick={() => setCurrentView('menu')}>ZURÜCK ZUR ZENTRALE</button>}
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
            <button className="menu-btn btn-play modern-btn" onClick={() => setCurrentView('menu')}>ZURÜCK ZUR ZENTRALE</button>
          </div>
        </div>
      )}

      {currentView === 'missions' && (
        <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="game-title-small" style={{ fontSize: '2rem', marginBottom: '30px' }}>AKTUELLE MISSIONEN</div>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
              {missions.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '4px', borderLeft: m.claimed ? '3px solid #555' : (m.progress >= m.target ? '3px solid var(--win)' : '3px solid var(--r-epi)') }}>
                   <div style={{ opacity: m.claimed ? 0.5 : 1, textAlign: 'left', flex: 1, minWidth: 0, paddingRight: '10px' }}>
                      <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 'bold' }}>{m.desc}</div>
                      <div className="mono" style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '6px' }}>{m.progress} / {m.target}</div>
                   </div>
                   <div style={{ flexShrink: 0, whiteSpace: 'nowrap', textAlign: 'right' }}>
                     {!m.claimed && m.progress >= m.target ? (
                        <button className="btn-info" style={{ borderColor: 'var(--win)', color: 'var(--win)', padding: '8px 15px', fontSize: '0.8rem' }} onClick={(e) => claimMission(m.id, e)}>CLAIM +{m.reward}</button>
                     ) : (
                        <div className="mono" style={{ color: m.claimed ? '#555' : 'var(--ep)', fontSize: '1.1rem', fontWeight: 'bold' }}>{m.claimed ? 'CLAIMED' : `+${m.reward}💳`}</div>
                     )}
                   </div>
                </div>
              ))}
            </div>
            <button className="menu-btn" style={{ borderColor: '#444', color: '#888' }} onClick={() => setCurrentView('menu')}>ZURÜCK ZUR ZENTRALE</button>
          </div>
        </div>
      )}

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
           <Leaderboard onBack={() => setCurrentView('menu')} />
        </div>
      )}
      {currentView === 'lexicon' && (
        <div className="screen active lex-screen" style={{ display: 'block', padding: '0 30px 30px 30px', overflowY: 'auto' }}>
          {/* Sticky Top-Bar */}
          <div className="top-bar" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5, 5, 8, 0.95)', padding: '30px 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            
            {/* NEU: Anklickbare Tabs statt statischem Titel */}
            <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
              <div 
                className="game-title-small" 
                style={{ cursor: 'pointer', opacity: lexFaction !== 'EFFECTS' ? 1 : 0.4, transition: '0.2s' }}
                onClick={(e) => { e.nativeEvent.stopImmediatePropagation(); playSound('click'); setLexFaction('ALL'); }}
              >
                AGENTEN
              </div>
              <div 
                className="game-title-small" 
                style={{ cursor: 'pointer', opacity: lexFaction === 'EFFECTS' ? 1 : 0.4, transition: '0.2s', color: 'var(--eff-col)', textShadow: lexFaction === 'EFFECTS' ? '0 0 10px var(--eff-col)' : 'none' }}
                onClick={(e) => { e.nativeEvent.stopImmediatePropagation(); playSound('click'); setLexFaction('EFFECTS'); }}
              >
                TAKTIKEN
              </div>
            </div>
            
            <div className="lex-top-controls" style={{ display: 'flex', gap: '15px' }}>
              <input type="text" placeholder="Suche..." value={lexSearch} onChange={e => setLexSearch(e.target.value)} className="mono" style={{ padding: '8px', background: '#000', border: '1px solid #444', color: '#fff' }} />
              
              {/* Dropdown nur einblenden, wenn wir bei den Agenten sind */}
              {lexFaction !== 'EFFECTS' && (
                <select value={lexFaction} onChange={e => setLexFaction(e.target.value)} className="mono" style={{ padding: '8px', background: '#000', border: '1px solid #444', color: '#fff' }}>
                  <option value="ALL">ALLE</option>
                  <option value="OWNED">IN BESITZ</option>
                  <option value="UNOWNED">NICHT IN BESITZ</option>
                  <option disabled>──────────────</option>
                  {allFactions.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              )}
              
              <button className="btn-back" onClick={() => setCurrentView('menu')}>ZURÜCK</button>
            </div>
          </div>
          <div className="card-grid">
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
                 else matchFaction = c.faction === lexFaction && !isEffect;
                 
                 return matchSearch && matchFaction;
              })
              .sort((a,b) => (b.gti || 0) - (a.gti || 0))
              .map((c, i) => {
                const isOwned = inventory.some(inv => inv.name === c.name);
                return (
                  <div key={i} className={`card-grid-cell ${!isOwned ? 'card-unowned' : ''}`} onClick={() => { playSound('click'); setLexiconInspectCard(c); }}>
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
      
      {currentView === 'inventory' && ( <Inventory inventory={inventory} setInventory={setInventory} decks={decks} setDecks={setDecks} allFactions={allFactions} onBack={() => setCurrentView('menu')} onShowRules={() => { playSound('click'); setShowGlobalRules(true); }} onClearNew={clearNewStatus} onCreditGain={handleCreditGain} onMissionAction={(type, amount) => { handleMissionProgress(type, amount); if (type === 'upgrade') handleStatUpdate('upgradesDone', amount); }} /> )}

      {currentView === 'menu' && (
        <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center', position: 'relative', padding: '20px' }}>
          
          {/* Top Bar (Credits & Profil-Icon) */}
          <div className="main-menu-top" style={{ position: 'absolute', top: '20px', right: '30px', display: 'flex', gap: '15px', alignItems: 'center', zIndex: 100 }}>
             <div className="mono" style={{ fontSize: '1.2rem', color: '#fff', marginRight: '10px', textShadow: '0 0 10px var(--ep)' }}><span style={{color: 'var(--ep)'}}>{credits}</span> 💳</div>
             {session ? (
               <button className="btn-back" style={{borderColor:'var(--ep)', color:'var(--ep)', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px'}} onClick={() => { playSound('click'); setIsSidebarOpen(true); }}>
                 <span style={{ fontSize: '1.2rem' }}>👤</span> {session.user?.user_metadata?.username || 'AGENT'}
               </button>
             ) : (
               <button className="btn-back" style={{borderColor: 'var(--lose)', color: 'var(--lose)'}} onClick={resetGame}>RESET DATA</button>
             )}
          </div>

          {/* NEUES DASHBOARD LAYOUT */}
          <div className="dash-container" style={{ width: '100%', height: '100%', maxWidth: '1400px', maxHeight: '900px', margin: '0 auto', overflow: 'hidden' }}>
            
            {/* LINKE SEITE: Core Actions & Titel */}
            <div className="dash-left">
              <div className="dash-title">ARCHITECTS<br/>OF CHAOS</div>
              <div className="dash-subtitle">TCG EDITION V1.0 // THE BOARD IS SET</div>
              
              {!playMenuOpen ? (
                <div className="dash-main-actions">
                  <button className="dash-btn-hero" onClick={() => { playSound('click'); setPlayMenuOpen(true); }}>
                    <span className="hero-bg"></span>
                    <span className="hero-text">▶ MISSION STARTEN</span>
                  </button>

                  <button className="dash-btn-hero ghost-node-btn" onClick={() => { playSound('click'); setRunContext('solo'); setCurrentView('ghostnodemenu'); }}>
                    <span className="hero-bg"></span>
                    <span className="hero-text">⬡ OPERATION: GHOST NODE</span>
                    <div className="ghost-tags">
                      <span className="mono" style={{ opacity: 0.7 }}>[ROGUELIKE]</span>
                      {!avatarCard && <span className="mono tag-new">NEU</span>}
                      {allRuns.solo && <span className="mono tag-active">AKTIV</span>}
                    </div>
                  </button>
                </div>
              ) : (
                <div className="dash-play-menu">
                  <div className="mono" style={{ color: 'var(--win)', letterSpacing: '3px', marginBottom: '15px' }}>▸ MODUS WÄHLEN</div>
                  
                  <button className="dash-btn-hero" style={{ borderColor: 'var(--win)', '--theme': 'var(--win)' }} onClick={startMatchFlow}>
                    <span className="hero-bg"></span>
                    <span className="hero-text" style={{ color: 'var(--win)' }}>▶ GEGEN KI SPIELEN</span>
                  </button>
                  
                  <button className="dash-btn-hero" style={{ borderColor: 'var(--ep)', '--theme': 'var(--ep)' }} onClick={() => setCurrentView('multiplayer')}>
                    <span className="hero-bg"></span>
                    <span className="hero-text" style={{ color: 'var(--ep)' }}>📡 MULTIPLAYER (BETA)</span>
                  </button>
                  
                  <button className="dash-btn-module" style={{ borderColor: '#444', color: '#888', marginTop: '10px' }} onClick={() => { playSound('click'); setPlayMenuOpen(false); }}>
                    ← ABBRECHEN
                  </button>
                </div>
              )}
            </div>

            {/* RECHTE SEITE: System Module (Grid) */}
            <div className="dash-right" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
               <button className="dash-btn-module" onClick={() => { setPlayMenuOpen(false); setCurrentView('inventory'); }}>
                  <div className="mod-icon">🗄️</div>
                  <div className="mod-text">INVENTAR & DECK</div>
                  {(hasNewCards || hasUpgrades) && <div className="notif-dot" style={{ background: hasNewCards ? 'var(--win)' : 'var(--ep)' }}></div>}
               </button>
               
               <button className="dash-btn-module" onClick={() => { setPlayMenuOpen(false); setCurrentView('market'); }}>
                  <div className="mod-icon">🛒</div>
                  <div className="mod-text">SHOP</div>
                  {rewardPacks && rewardPacks.length > 0 && <div className="notif-dot" style={{ background: '#bc13fe', boxShadow: '0 0 10px #bc13fe' }}></div>}
               </button>
               
               <button className="dash-btn-module" onClick={() => { setPlayMenuOpen(false); setCurrentView('missions'); }}>
                  <div className="mod-icon">📜</div>
                  <div className="mod-text">MISSIONEN</div>
                  {hasClaimableMissions && <div className="notif-dot" style={{ background: 'var(--win)' }}></div>}
               </button>
               
               <button className="dash-btn-module" onClick={() => { setPlayMenuOpen(false); setCurrentView('lexicon'); }}>
                  <div className="mod-icon">📖</div>
                  <div className="mod-text">LEXIKON</div>
               </button>

               <button className="dash-btn-module" onClick={() => { playSound('click'); setPlayMenuOpen(false); setCurrentView('overrides'); }}>
                  <div className="mod-icon">⭐</div>
                  <div className="mod-text">OVERRIDES</div>
                  {hasClaimableOverrides && <div className="notif-dot" style={{ background: 'var(--ep)' }}></div>}
               </button>

               <button className="dash-btn-module highlight-module" onClick={() => { playSound('click'); setPlayMenuOpen(false); setCurrentView('leaderboard'); }}>
                  <div className="mod-icon">🏆</div>
                  <div className="mod-text">LEADERBOARD</div>
               </button>
               
               {/* GHOST NETWORK WIDE BANNER (Span 2) */}
               <button 
                  className="dash-btn-module" 
                  style={{ 
                     gridColumn: '1 / -1', 
                     borderColor: 'var(--ep)', 
                     background: 'linear-gradient(90deg, rgba(0,229,255,0.05) 0%, rgba(188,19,254,0.08) 100%)',
                     display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '15px'
                  }} 
                  onClick={() => { playSound('click'); setPlayMenuOpen(false); setIsSidebarOpen(true); }}
               >
                  <div className="mod-icon" style={{ fontSize: '2.2rem', margin: 0, animation: 'pulse 2s infinite', filter: 'drop-shadow(0 0 10px var(--ep))' }}>📡</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                     <div className="mod-text" style={{ color: 'var(--ep)', fontSize: '1.2rem', textShadow: '0 0 10px var(--ep)', margin: 0 }}>GHOST NETWORK</div>
                     <div className="mono" style={{ fontSize: '0.65rem', color: '#aaa', letterSpacing: '2px', marginTop: '4px' }}>SOCIAL HUB & CO-OP INVITES</div>
                  </div>
               </button>
            </div>
            
          </div>
        </div>
      )}

      {/* SYSTEM OVERRIDES SCREEN */}
      {currentView === 'overrides' && (
         <div style={{ width: '100%', height: '100%' }}>
            <SystemOverrides metaStats={metaStats} onBack={() => setCurrentView('menu')} onClaim={claimOverride} />
         </div>
      )}

      {/* GHOST NETWORK SIDEBAR (Phase 4) */}
      <GhostNetwork 
         session={session} 
         isOpen={isSidebarOpen}
         onClose={() => setIsSidebarOpen(false)}
         onInvite={(targetId, mode) => { setIsSidebarOpen(false); startHosting(mode, targetId); }}
         onLogout={handleLogout}
         metaStats={metaStats}
      />

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

      {/* INCOMING INVITE POPUP (Live WebSocket Receiver) */}
      {incomingInvite && (
          <div className="glass-overlay active" style={{ zIndex: 99999 }}>
              <div className="glass-panel" style={{ width: '400px', textAlign: 'center', borderColor: incomingInvite.mode === 'coop' ? 'var(--apex-pink)' : 'var(--win)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px', animation: 'pulse 1.5s infinite' }}>📡</div>
                  <h3 className="mono" style={{ color: incomingInvite.mode === 'coop' ? 'var(--apex-pink)' : 'var(--win)', letterSpacing: '2px' }}>
                      INCOMING NEURAL LINK
                  </h3>
                  <p style={{ color: '#ccc', margin: '20px 0', fontSize: '1.1rem' }}>
                      <b style={{ color: '#fff' }}>{incomingInvite.sender_name}</b> fordert dich zu<br/>einer <b style={{ color: incomingInvite.mode === 'coop' ? 'var(--apex-pink)' : 'var(--win)' }}>{incomingInvite.mode === 'coop' ? 'CO-OP MISSION' : '1v1 SCHLACHT'}</b> heraus!
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="menu-btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                          playSound('click');
                          const inv = incomingInvite;
                          setIncomingInvite(null);
                          await supabase.from('game_invites').update({ status: 'declined' }).eq('id', inv.id);
                      }}>ABLEHNEN</button>
                      
                      <button className="menu-btn btn-danger" style={{ flex: 1, background: 'rgba(0,255,100,0.1)', borderColor: '#00ff44', color: '#00ff44' }} onClick={async () => {
                          playSound('upgrade');
                          const inv = incomingInvite;
                          setIncomingInvite(null);
                          await supabase.from('game_invites').update({ status: 'accepted' }).eq('id', inv.id);
                          
                          // Automatischer Join-Prozess
                          if (inv.mode === 'coop') setRunContext('coop_' + inv.sender_id);
                          setIsCoopMode(inv.mode === 'coop');
                          setLobbyMode('join');
                          setRemotePeerId(inv.peer_id);
                          const readyDeck = prepareMyDeck();
                          setCurrentView('multiplayer');
                          
                          const newPeer = new Peer();
                          setPeer(newPeer);
                          newPeer.on('open', () => {
                              const connection = newPeer.connect(inv.peer_id);
                              connection.on('open', () => {
                                  setConn(connection);
                                  connection.send({ type: 'DECK_SYNC', chars: readyDeck.chars, effs: readyDeck.effs });
                              });
                              connection.on('data', (data) => {
                                  if (data.type === 'COOP_INIT') {
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
                                      setRoguelikeRun(prev => prev ? { ...prev, currentHP: data.hp, sector: data.sector, node: data.node, seed: data.seed } : prev);
                                  } else if (data.type === 'NAV_TO') {
                                      setCurrentView(data.view);
                                  } else if (data.type === 'TEAM_DRAFT_TRANSFER' || data.type === 'TEAM_DRAFT_RECEIVE') {
                                      handleBackgroundCardReceive(data.card);
                                  } else if (data.type === 'CLIENT_SQUAD_READY') {
                                      setClientSquadReady(data.payload);
                                  }
                              });
                              connection.on('close', () => { 
                                  if (currentView !== 'postmatch') { alert("Verbindung getrennt."); disconnectPeer(); setCurrentView('menu'); }
                              });
                          });
                      }}>AKZEPTIEREN</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
