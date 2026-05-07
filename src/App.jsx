import React, { useState, useEffect, useRef } from 'react';
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
  1: { name: 'TRAINEE', color: 'var(--win)', reward: 100, loseReward: 25, lvl: 1, desc: "Standard-Gegner. Karten auf Level 1. Ideal zum Testen von neuen Decks." },
  2: { name: 'OPERATIVE', color: 'var(--ep)', reward: 250, loseReward: 50, lvl: 2, desc: "Klügere KI. Erkennt schwache Konter. Gegnerische Karten auf Level 2." },
  3: { name: 'EXECUTIVE', color: 'var(--r-epi)', reward: 500, loseReward: 100, lvl: 3, desc: "Gnadenlos. Spart Energie für tödliche All-In Combos. Karten auf MAX Level." },
  4: { name: 'ARCHITECT', color: 'var(--lose)', reward: 1000, loseReward: 250, lvl: 3, desc: "Unfair. Boss-Buff (+15 Stats). Die KI liest deine Karten und wählt Hard-Counter aus dem ultimativen Meta-Deck." }
};

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
  const [roguelikeRun, setRoguelikeRun] = useState(() => {
    const saved = localStorage.getItem('aoc_run');
    return saved ? JSON.parse(saved) : null;
  });

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

  const [credits, setCredits] = useState(() => {
    const saved = localStorage.getItem('aoc_credits');
    return (saved !== null && !isNaN(parseInt(saved))) ? parseInt(saved) : 500;
  });
  const [inventory, setInventory] = useState(() => {
    const savedInv = localStorage.getItem('aoc_inventory');
    if (savedInv !== null) {
      const parsedInv = JSON.parse(savedInv);
      const savedDecks = localStorage.getItem('aoc_decks');
      if (savedDecks) {
        const parsedDecks = JSON.parse(savedDecks);
        const invNames = new Set(parsedInv.map(c => c.name));
        const missingCards = [];
        parsedDecks.forEach(d => {
          [...(d.chars || []), ...(d.effs || [])].forEach(c => {
            if (!invNames.has(c.name)) {
              missingCards.push({ ...c, isNew: false });
              invNames.add(c.name);
            }
          });
        });
        return [...parsedInv, ...missingCards];
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

  // --- MULTIPLAYER STATE ---
  const [peer, setPeer] = useState(null);
  const [myPeerId, setMyPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [conn, setConn] = useState(null);
  const [lobbyMode, setLobbyMode] = useState('select'); 
  
  const [myOnlineDeck, setMyOnlineDeck] = useState(null);
  const [remoteDeck, setRemoteDeck] = useState(null);
  const activeDeck = decks.find(d => d.isActive) || decks[0];

  useEffect(()=>{
    localStorage.setItem('aoc_credits',   credits.toString());
    localStorage.setItem('aoc_inventory', JSON.stringify(inventory));
    localStorage.setItem('aoc_decks',     JSON.stringify(decks));
    localStorage.setItem('aoc_stats',     JSON.stringify(stats));
    localStorage.setItem('aoc_missions',  JSON.stringify(missions));
    localStorage.setItem('aoc_avatar',    JSON.stringify(avatarCard));
    localStorage.setItem('aoc_run',       JSON.stringify(roguelikeRun));
    localStorage.setItem('aoc_reward_packs', JSON.stringify(rewardPacks));
    localStorage.setItem('aoc_meta_stats', JSON.stringify(metaStats));
  },[credits,inventory,decks,stats,missions,avatarCard,roguelikeRun,rewardPacks,metaStats]);

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
        if (p.inventory?.length) setInventory(p.inventory);
        if (p.decks?.length) setDecks(p.decks);
        
        if (p.avatar_card !== undefined) setAvatarCard(p.avatar_card);
        if (p.active_run !== undefined) setRoguelikeRun(p.active_run);
        if (p.meta_stats !== undefined) setMetaStats(p.meta_stats || {});

        localStorage.setItem('aoc_credits', (p.credits || 500).toString());
        localStorage.setItem('aoc_inventory', JSON.stringify(p.inventory || []));
        localStorage.setItem('aoc_decks', JSON.stringify(p.decks || []));
        localStorage.setItem('aoc_avatar', JSON.stringify(p.avatar_card || null));
        localStorage.setItem('aoc_run', JSON.stringify(p.active_run || null));
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
      saveToCloud({ 
        credits, 
        inventory, 
        decks, 
        avatar_card: avatarCard, 
        active_run: roguelikeRun,
        meta_stats: metaStats
      });
    }, 1500);

    return () => clearTimeout(t);
  }, [credits, inventory, decks, avatarCard, roguelikeRun, metaStats, guestMode, session]);

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
      saveToCloud({ active_run: null });
      setCurrentView('ghostnodemenu');
    };
    window.addEventListener('abortRun', handler);
    return () => window.removeEventListener('abortRun', handler);
  }, []);

// --- GLOBALES CLICK-AUDIO ---
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // Ignoriere Klicks auf Texteingabefelder (sonst piept es beim Tippen)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Prüfe, ob das geklickte Element ein Button ist oder "cursor: pointer" hat
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

  const updateAvatar = (newAvatar) => { setAvatarCard(newAvatar); };

  // ── PHASE 2: Roguelike Match-Logik ────────────────────────────────────────
  const [roguelikeMatchData, setRoguelikeMatchData] = useState(null); 
  const [rewardData,         setRewardData]         = useState(null);   

  const generateAIDeck = (node, sector) => {
    const isBoss = node === 5;
    const level  = isBoss ? 3 : Math.max(1, Math.min(2, sector));
    const diff   = isBoss ? 4 : Math.min(3, sector);
    
    // Archetypen Logik (Zufall, basierend auf Node)
    const rand = Math.random();
    let archetype = 'standard';
    let aHP = 500;
    let charPool = [...cardsData.characters];

    if (isBoss) {
      aHP = 1200; // Boss ist jetzt viel tankier!
      archetype = 'boss';
    } else if (rand > 0.6) {
      archetype = 'tank';
      aHP = 2500;
      charPool = charPool.filter(c => (c.gti || 0) < 80); // Tank nutzt nur schwächere Karten
    } else if (rand > 0.3) {
      archetype = 'assassin';
      aHP = 400;
      // Assassin bekommt garantiert eine sehr starke Karte an Pos 1
      const apexCards = charPool.filter(c => c.type === 'apex' || c.type === 'legacy');
      if (apexCards.length > 0) {
        charPool = [apexCards[Math.floor(Math.random() * apexCards.length)], ...charPool];
      }
    }

    const shuffledChars = shuffle(charPool);
    // Assassin bekommt Level 3 Karten, egal welcher Sektor!
    const finalLevel = archetype === 'assassin' ? 3 : level; 
    
    const aiChars = shuffledChars.slice(0, 4).map(c => ({ ...c, level: finalLevel }));
    const effs = cardsData.effects || [];
    const aiEffs = effs.length > 0 ? [{ ...effs[Math.floor(Math.random() * effs.length)], level: 1 }] : [];
    
    return { aiChars, aiEffs, difficulty: diff, initialAHP: aHP, archetype };
  };

  const startRoguelikeRunWithDeck = (selectedChars, selectedEffs) => {
    if (!avatarCard) return;
    const newRun = {
      currentHP: 500, maxHP: 500, sector: 1, node: 1,
      runDeck: {
        chars: [{ ...avatarCard }, ...selectedChars],
        effs:  selectedEffs,
      },
    };
    setRoguelikeRun(newRun);
    setCurrentView('roguelikemap');
  };

  const startRoguelikeRun = () => {
    if (!avatarCard) { setCurrentView('avatarlab'); return; }
    if (roguelikeRun) { setCurrentView('roguelikemap'); return; } 
    setCurrentView('roguelikesquad');
  };

  const startRoguelikeMatch = () => {
    if (!roguelikeRun) return;
    const data = generateAIDeck(roguelikeRun.node, roguelikeRun.sector);
    setRoguelikeMatchData(data);
    setCurrentView('match');
  };

  // --- DIE REPARIERTE LOOT & DRAFT LOGIK ---
  const handleRoguelikeEndGame = ({ isWin, remainingHP = 0, isAbort = false, matchData }) => {
    
    // 1. GLOBALE LEADERBOARD STATS TRACKEN
    setMetaStats(prev => {
      const next = { ...prev };
      // Schadens-Werte aufaddieren (wenn vorhanden)
      if (matchData) {
        next.total_damage_dealt = (next.total_damage_dealt || 0) + (matchData.dmgDealt || 0);
        next.total_damage_taken = (next.total_damage_taken || 0) + (matchData.dmgTaken || 0);
        if ((matchData.dmgDealt || 0) > (next.highest_crit || 0)) next.highest_crit = matchData.dmgDealt;
      }
      
      // Sieg/Niederlagen Zähler
      if (isWin) {
        next.total_wins = (next.total_wins || 0) + 1;
        next.nodes_cleared_total = (next.nodes_cleared_total || 0) + 1;
        if (roguelikeRun?.node >= 5 || roguelikeMatchData?.difficulty >= 4) {
          next.bosses_defeated = (next.bosses_defeated || 0) + 1;
        }
      } else if (!isAbort) {
        next.total_losses = (next.total_losses || 0) + 1;
      }
      return next;
    });

    if (!isWin || isAbort) {
      setRoguelikeMatchData(null);
      setRoguelikeRun(null);
      saveToCloud({ active_run: null });
      setCurrentView('roguelikefailed');
      return;
    }

    const node = roguelikeRun.node;
    const isBoss = node >= 5 || roguelikeMatchData?.difficulty >= 4; 
    const isElite = node === 3 || roguelikeMatchData?.node?.type === 'elite';
    
    const spGain = isBoss ? 3 : 1;
    const earnedCredits = isBoss ? 500 : (isElite ? 200 : 75);

    let newNode = node + 1;
    let newSector = roguelikeRun.sector;
    if (isBoss) { newNode = 1; newSector++; }

    const updatedRun = { 
      ...roguelikeRun, 
      currentHP: Math.max(0, remainingHP), 
      node: newNode, 
      sector: newSector 
    };
    const updatedAvatar = { ...avatarCard, sp: (avatarCard.sp || 0) + spGain };

    // 1. DRAFT GENERIEREN (3 Karten für das Deck)
    const allPool = [...cardsData.characters, ...(cardsData.effects || [])];
    const draftPool = [...allPool]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(c => ({ ...c, level: 1 }));

    // 2. LOOT FÜR DEN SCHWARZMARKT SAMMELN
    let lootedCards = [];
    if (isElite || isBoss) {
      const count = isBoss ? 5 : 3;
      for(let i=0; i < count; i++) {
        const picked = allPool[Math.floor(Math.random() * allPool.length)];
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
        name: isBoss ? 'SEKTOR-KERN CACHE' : 'GHOST DATA',
        cards: lootedCards,
        color: isBoss ? 'var(--lose)' : '#bc13fe'
      }]);
    }

    // 3. STATES AKTUALISIEREN
    setCredits(prev => prev + earnedCredits);
    setAvatarCard(updatedAvatar);
    setRoguelikeRun(updatedRun);
    setRoguelikeMatchData(null);

    // 4. ZUM DRAFT-SCREEN LEITEN
    setRewardData({ draft: draftPool });
    setCurrentView('roguelikereward');
    
    saveToCloud({ 
      credits: credits + earnedCredits, 
      active_run: updatedRun, 
      avatar_card: updatedAvatar
    });
  };

  // --- DIE FEHLENDE FUNKTION IST WIEDER DA ---
  const applyRoguelikeDraft = (newCard, replaceIndex, replaceIn) => {
    if (!roguelikeRun) return;
    const deck = { chars: [...roguelikeRun.runDeck.chars], effs: [...roguelikeRun.runDeck.effs] };

    if (replaceIn === 'chars') {
      deck.chars.splice(replaceIndex, 1);
    } else {
      deck.effs.splice(replaceIndex, 1);
    }

    if (newCard.type === 'effect') {
      deck.effs.push({ ...newCard, level: 1 });
    } else {
      deck.chars.push({ ...newCard, level: 1 });
    }

    const updated = { ...roguelikeRun, runDeck: deck };
    setRoguelikeRun(updated);
    
    setRewardData(null); 
    setCurrentView('roguelikemap');
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

  const startHosting = () => {
    if (activeDeck.chars.length !== 12 || activeDeck.effs.length !== 3) {
      alert("Dein aktives Deck ist unvollständig! (12 Chars, 3 Effekte benötigt)");
      return;
    }
    playSound('click');
    setLobbyMode('host');
    const myDeck = prepareMyDeck();

    const newPeer = new Peer();
    newPeer.on('open', (id) => setMyPeerId(id));

    newPeer.on('connection', (connection) => {
      setConn(connection);
      connection.on('open', () => {
        connection.send({ type: 'DECK_SYNC', chars: myDeck.chars, effs: myDeck.effs });
      });
      connection.on('data', (data) => {
        if (data.type === 'DECK_SYNC') setRemoteDeck({ chars: data.chars, effs: data.effs });
      });
      connection.on('close', () => { 
        if (currentView !== 'postmatch') {
           alert("Gegner hat die Verbindung getrennt."); 
           disconnectPeer(); 
           setCurrentView('menu');
        }
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
      if (data.type === 'DECK_SYNC') setRemoteDeck({ chars: data.chars, effs: data.effs });
    });
    connection.on('close', () => { 
        if (currentView !== 'postmatch') {
           alert("Host hat die Verbindung getrennt."); 
           disconnectPeer(); 
           setCurrentView('menu');
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
  // ── ROGUELIKE STRICT ROUTING ──
  // ════════════════════════════════════════════════════════════════════════════

  if (currentView === 'ghostnodemenu') return (
    <GhostNodeMenu
      avatarCard={avatarCard}
      updateAvatar={updateAvatar} /* <--- DAS HIER IST NEU */
      roguelikeRun={roguelikeRun}
      onGoToLab={() => setCurrentView('avatarlab')}
      onGoToSquad={() => setCurrentView('roguelikesquad')}
      onGoToMap={() => setCurrentView('roguelikemap')}
      onBack={() => setCurrentView('menu')}
    />
  );

  if (currentView === 'avatarlab') return (
    <AvatarLab
      avatarCard={avatarCard}
      updateAvatar={updateAvatar}
      onBack={() => setCurrentView('ghostnodemenu')}
      onGoToMission={() => {
        if (roguelikeRun) setCurrentView('roguelikemap');
        else setCurrentView('roguelikesquad');
      }}
      allFactions={allFactions}
    />
  );

  if (currentView === 'roguelikesquad') return (
    <RoguelikeSquad
      avatarCard={avatarCard}
      inventory={inventory}
      onConfirm={startRoguelikeRunWithDeck}
      onBack={() => setCurrentView('ghostnodemenu')}
    />
  );

  if (currentView === 'roguelikemap') {
    if (!roguelikeRun) {
      return (
        <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="mono" style={{ color: 'var(--ep)', fontSize: '1.2rem', animation: 'pulse 1s infinite' }}>INITIALISIERE THE GRID...</div>
        </div>
      );
    }
    return (
      <RoguelikeMap
        avatarCard={avatarCard}
        roguelikeRun={roguelikeRun}
        onStartRun={startRoguelikeRun}
        onStartBattle={startRoguelikeMatch}
        onBack={() => setCurrentView('ghostnodemenu')}
        onGoToLab={() => setCurrentView('avatarlab')}
      />
    );
  }

  if (currentView === 'roguelikereward') return (
    <RoguelikeReward
      rewardData={rewardData}
      roguelikeRun={roguelikeRun}
      onApplyDraft={applyRoguelikeDraft}
      onSkip={() => { setRewardData(null); setCurrentView('roguelikemap'); }}
    />
  );

  if (currentView === 'roguelikefailed') return (
    <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '50px 40px', textAlign: 'center', borderColor: 'var(--lose)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💀</div>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '2.5rem', fontWeight: 900, letterSpacing: '6px', color: 'var(--lose)', textShadow: '0 0 30px rgba(255,0,50,0.5)', marginBottom: '8px' }}>RUN FAILED</div>
        <div className="mono" style={{ color: '#ff6680', fontSize: '0.72rem', letterSpacing: '3px', marginBottom: '26px' }}>AGENT KOMPROMITTIERT — SYSTEM COLLAPSED</div>
        <div style={{ padding: '14px', background: 'rgba(255,0,50,0.05)', border: '1px solid rgba(255,0,50,0.15)', borderLeft: '3px solid var(--lose)', marginBottom: '26px' }}>
          <div className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px' }}>AVATAR-KARTE BLEIBT ERHALTEN — UPGRADES PERSISTENT</div>
          {avatarCard && <div className="mono" style={{ color: 'var(--ep)', marginTop: '6px', fontWeight: 700 }}>{avatarCard.name} // SP: {avatarCard.sp ?? 0}</div>}
        </div>
        <button className="menu-btn btn-play modern-btn" onClick={() => setCurrentView('ghostnodemenu')}>ZURÜCK ZUM HUB</button>
      </div>
    </div>
  );

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
    if (difficulty === 4) {
      baseChars = [...cardsData.characters].sort((a,b) => (b.gti||0) - (a.gti||0)).slice(0, 12).map(c => ({...c, level: lvl}));
      baseEffs = [...cardsData.effects].sort((a,b) => (b.buff||0) - (a.buff||0)).slice(0, 3).map(e => ({...e, level: lvl}));
    } else {
      baseChars = shuffle(cardsData.characters).slice(0, 12).map(c => ({...c, level: lvl}));
      baseEffs = shuffle(cardsData.effects).slice(0, 3).map(e => ({...e, level: lvl}));
    }
    return { chars: baseChars, effs: baseEffs };
  };

  const aiDeck = getAIDeck();

  return (
    <>
      {floats.map(ft => (
         <div key={ft.id} className="money-popup" style={{ left: ft.x, top: ft.y }}>{ft.text}</div>
      ))}

      {showGlobalRules && (
        <div className="glass-overlay" style={{ zIndex: 999999, pointerEvents: 'auto' }}>
          <div className="rules-box">
            <div className="rules-header">OFFIZIELLE REGELN</div>
            <div className="rules-content">
              <div className="rules-section">
                <h3>GRUNDLAGEN</h3>
                <ul>
                  <li>Dein Deck besteht aus 12 Charakter- und 3 Taktikkarten.</li>
                  <li>In jeder Runde ziehen beide Spieler 4 Charaktere und 1 Taktik.</li>
                  <li>Als Angreifer wählst du eine Stat-Kategorie (z.B. <i>Tech-Hebel</i>). Dein Wert wird mit dem des Gegners verglichen.</li>
                  <li>Der Verlierer der Runde kassiert Schaden gleich der Differenz der Werte.</li>
                </ul>
              </div>
              <div className="rules-section">
                <h3>TAKTIKKARTEN & SYNERGIEN</h3>
                <ul>
                  <li>Taktikkarten geben einmalige Buffs auf bestimmte Stats in der aktiven Runde.</li>
                  <li>Hat eine Taktikkarte ein <b>Synergie-Ziel</b> und du spielst sie zusammen mit genau diesem Charakter, gibt es mächtige Synergie-Boni!</li>
                </ul>
              </div>
              <div className="rules-section">
                <h3>KRISEN EVENTS</h3>
                <ul>
                  <li>Durch Angriffe mit der Kategorie <i>Systemrisiko</i> füllt sich die globale Krisenleiste.</li>
                  <li>Erreicht sie 100%, bricht eine zufällige Systemkrise aus, die das Board modifiziert (z.B. werden Finanzwerte auf 0 gesetzt).</li>
                </ul>
              </div>
            </div>
            <button className="menu-btn" style={{ borderColor: 'var(--lose)', color: 'var(--lose)', marginTop: '30px' }} onClick={() => setShowGlobalRules(false)}>
              SCHLIESSEN
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
            difficulty={roguelikeMatchData.difficulty}
            isRoguelike={true}
            contextLabel={`SEKTOR ${roguelikeRun.sector} // NODE ${roguelikeRun.node}`}
            initialPHP={roguelikeRun.currentHP}
            initialAHP={roguelikeMatchData.initialAHP}
            onEndGame={handleRoguelikeEndGame}
            onShowRules={() => { playSound('click'); setShowGlobalRules(true); }}
          />
        ) : (
          /* ── NORMALES MATCH ─── */
          <MatchEngine
            playerChars={conn ? myOnlineDeck.chars : shuffle(activeDeck.chars)}
            playerEffs={conn ? myOnlineDeck.effs : shuffle(activeDeck.effs)}
            aiChars={conn ? remoteDeck.chars : aiDeck.chars}
            aiEffs={conn ? remoteDeck.effs : aiDeck.effs}
            difficulty={difficulty}
            isOnline={!!conn}
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
                    <button className="menu-btn btn-primary" onClick={startHosting}>SPIEL HOSTEN</button>
                    <button className="menu-btn" style={{ borderColor: 'var(--win)', color: 'var(--win)' }} onClick={startJoining}>SPIEL BEITRETEN</button>
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
                        <button className="menu-btn btn-primary" onClick={() => setCurrentView('match')}>ONLINE MATCH STARTEN</button>
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
        <Leaderboard onBack={() => setCurrentView('menu')} />
      )}
      {currentView === 'lexicon' && (
        <div className="screen active lex-screen" style={{ display: 'block', padding: '30px' }}>
          <div className="top-bar">
            <div className="game-title-small">ARCHIV: LEXIKON</div>
            <div className="lex-top-controls" style={{ display: 'flex', gap: '15px' }}>
              <input type="text" placeholder="Suche..." value={lexSearch} onChange={e => setLexSearch(e.target.value)} className="mono" style={{ padding: '8px', background: '#000', border: '1px solid #444', color: '#fff' }} />
              <select value={lexFaction} onChange={e => setLexFaction(e.target.value)} className="mono" style={{ padding: '8px', background: '#000', border: '1px solid #444', color: '#fff' }}>
                <option value="ALL">ALLE FRAKTIONEN</option>
                {allFactions.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button className="btn-info" onClick={() => { playSound('click'); setShowGlobalRules(true); }}>RULES</button>
              <button className="btn-back" onClick={() => setCurrentView('menu')}>ZURÜCK</button>
            </div>
          </div>
          <div className="card-grid">
            {cardsData.characters
              .filter(c => (c.name || '').toLowerCase().includes(lexSearch.toLowerCase()) && (lexFaction === 'ALL' || c.faction === lexFaction))
              .sort((a,b) => (b.gti || 0) - (a.gti || 0))
              .map((c, i) => (
                <div key={i} className="card-grid-cell" onClick={() => { playSound('click'); setLexiconInspectCard(c); }}>
                  <Card card={c} context="lexicon" />
                </div>
              ))
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
          
          {/* Top Bar (Credits & Logout) bleibt erhalten */}
          <div style={{ position: 'absolute', top: '20px', right: '30px', display: 'flex', gap: '15px', alignItems: 'center', zIndex: 100 }}>
             <div className="mono" style={{ fontSize: '1.2rem', color: '#fff', marginRight: '10px', textShadow: '0 0 10px var(--ep)' }}><span style={{color: 'var(--ep)'}}>{credits}</span> 💳</div>
             <button className="btn-info" onClick={() => { playSound('click'); setShowGlobalRules(true); }}>RULES</button>
             {session ? (
               <button className="btn-back" style={{borderColor:'var(--win)',color:'var(--win)'}} onClick={handleLogout}>
                 {session.user?.user_metadata?.username || 'LOGOUT'} ⏻
               </button>
             ) : (
               <button className="btn-back" style={{borderColor: 'var(--lose)', color: 'var(--lose)'}} onClick={resetGame}>RESET DATA</button>
             )}
          </div>

          {/* NEUES DASHBOARD LAYOUT */}
          <div className="dash-container">
            
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

                  <button className="dash-btn-hero ghost-node-btn" onClick={() => { playSound('click'); setCurrentView('ghostnodemenu'); }}>
                    <span className="hero-bg"></span>
                    <span className="hero-text">⬡ OPERATION: GHOST NODE</span>
                    <div className="ghost-tags">
                      <span className="mono" style={{ opacity: 0.7 }}>[ROGUELIKE]</span>
                      {!avatarCard && <span className="mono tag-new">NEU</span>}
                      {roguelikeRun && <span className="mono tag-active">AKTIV</span>}
                    </div>
                  </button>
                </div>
              ) : (
                <div className="dash-play-menu">
                  <div className="mono" style={{ color: 'var(--win)', letterSpacing: '3px', marginBottom: '15px' }}>▸ MODUS WÄHLEN</div>
                  <button className="dash-btn-module" style={{ borderColor: 'var(--win)', color: 'var(--win)' }} onClick={startMatchFlow}>
                    GEGEN KI SPIELEN
                  </button>
                  <button className="dash-btn-module" style={{ borderColor: 'var(--ep)', color: 'var(--ep)' }} onClick={() => setCurrentView('multiplayer')}>
                     ONLINE MULTIPLAYER <span style={{fontSize: '0.7rem', opacity: 0.7}}>(BETA)</span>
                  </button>
                  <button className="dash-btn-module" style={{ borderColor: '#444', color: '#888', marginTop: '20px' }} onClick={() => { playSound('click'); setPlayMenuOpen(false); }}>
                    ← ABBRECHEN
                  </button>
                </div>
              )}
            </div>

            {/* RECHTE SEITE: System Module (Grid) */}
            <div className="dash-right">
               <button className="dash-btn-module" onClick={() => { setPlayMenuOpen(false); setCurrentView('inventory'); }}>
                  <div className="mod-icon">🗄️</div>
                  <div className="mod-text">INVENTAR & DECK</div>
                  {(hasNewCards || hasUpgrades) && <div className="notif-dot" style={{ background: hasNewCards ? 'var(--win)' : 'var(--ep)' }}></div>}
               </button>
               
               <button className="dash-btn-module" onClick={() => { setPlayMenuOpen(false); setCurrentView('market'); }}>
                  <div className="mod-icon">🛒</div>
                  <div className="mod-text">SCHWARZMARKT</div>
               </button>
               
               <button className="dash-btn-module" onClick={() => { setPlayMenuOpen(false); setCurrentView('missions'); }}>
                  <div className="mod-icon">📜</div>
                  <div className="mod-text">MISSIONEN</div>
                  {hasClaimableMissions && <div className="notif-dot" style={{ background: 'var(--win)' }}></div>}
               </button>
               
               <button className="dash-btn-module" onClick={() => { setPlayMenuOpen(false); setCurrentView('stats'); }}>
                  <div className="mod-icon">📊</div>
                  <div className="mod-text">STATISTIKEN</div>
               </button>

               <button className="dash-btn-module" onClick={() => { setPlayMenuOpen(false); setCurrentView('lexicon'); }}>
                  <div className="mod-icon">📖</div>
                  <div className="mod-text">LEXIKON</div>
               </button>

               <button className="dash-btn-module highlight-module" onClick={() => { playSound('click'); setPlayMenuOpen(false); setCurrentView('leaderboard'); }}>
                  <div className="mod-icon">🏆</div>
                  <div className="mod-text">LEADERBOARD</div>
               </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}