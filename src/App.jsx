import React, { useState, useEffect } from 'react';
import MatchEngine from './components/MatchEngine';
import Card from './components/Card';
import Market from './components/Market';
import Inventory from './components/Inventory';
import cardsData from './data/cards.json';
import { playSound } from './logic/audio';
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

export default function App() {
  const [currentView, setCurrentView] = useState('menu');
  const [difficulty, setDifficulty] = useState(1);
  const [showGlobalRules, setShowGlobalRules] = useState(false);
  const [floats, setFloats] = useState([]);
  
  const [credits, setCredits] = useState(() => parseInt(localStorage.getItem('aoc_credits') || '0'));
  const [inventory, setInventory] = useState(() => {
    const savedInv = localStorage.getItem('aoc_inventory');
    if (savedInv !== null) {
      const parsedInv = JSON.parse(savedInv);
      // Backfill: if any deck card is missing from inventory, add it.
      // This fixes existing saves where starter deck cards were never in inventory.
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
    // Fresh start: seed inventory with the starter deck cards so they can be returned when removed
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
  
  const [missions, setMissions] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('aoc_missions') || '[]');
    if (saved.length === 0 || !saved[0].baseId) return generateNewMissions();
    return saved;
  });

  const [lastMatch, setLastMatch] = useState(null);
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

  useEffect(() => {
    localStorage.setItem('aoc_credits', credits.toString());
    localStorage.setItem('aoc_inventory', JSON.stringify(inventory));
    localStorage.setItem('aoc_decks', JSON.stringify(decks));
    localStorage.setItem('aoc_stats', JSON.stringify(stats));
    localStorage.setItem('aoc_missions', JSON.stringify(missions));
  }, [credits, inventory, decks, stats, missions]);

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
    // Timeout auf 1500ms erhöht, damit die neue CSS Animation durchläuft
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1500); 
  };

  const handleStatUpdate = (key, amount = 1) => {
    setStats(prev => ({ ...prev, [key]: (prev[key] || 0) + amount }));
  };

  const hasNewCards = inventory.some(c => c.isNew);
  const hasClaimableMissions = missions.some(m => !m.claimed && m.progress >= m.target);
  // Mirror Inventory.jsx grouping logic to detect upgradeable cards for the menu button
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
    // Online matches are always treated as ARCHITECT (difficulty 4) for rewards & missions
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
      localStorage.clear();
      window.location.reload();
    }
  }

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
      {/* 🚀 NEU: Die System Boot Animation */}
      <div className="boot-sequence">
        <div className="boot-text">INITIALIZING ARCHITECTS_OF_CHAOS.EXE...</div>
      </div>

      {/* 💳 NEU: Die gefixte Money Animation */}
      {floats.map(ft => (
         <div key={ft.id} className="money-popup" style={{ left: ft.x, top: ft.y }}>{ft.text}</div>
      ))}

      {/* 📜 NEU: Das fehlende Rules Modal */}
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
              <button className="menu-btn btn-play" style={{ margin: '0' }} onClick={() => navTo('match')}>KAMPF STARTEN</button>
              <button className="menu-btn" style={{ margin: '0', borderColor: '#444', color: '#888' }} onClick={() => navTo('menu')}>ZURÜCK</button>
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
                        <button className="menu-btn btn-primary" onClick={() => navTo('match')}>ONLINE MATCH STARTEN</button>
                    </div>
                 )}

                 <button className="menu-btn" style={{ borderColor: 'var(--lose)', color: 'var(--lose)', marginTop: '20px' }} onClick={disconnectPeer}>VERBINDUNG TRENNEN</button>
              </div>
            )}
            {!conn && <button className="menu-btn" style={{ borderColor: '#444', color: '#888', marginTop: '40px' }} onClick={() => navTo('menu')}>ZURÜCK ZUR ZENTRALE</button>}
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
            <button className="menu-btn btn-play modern-btn" onClick={() => navTo('menu')}>ZURÜCK ZUR ZENTRALE</button>
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
                   <div style={{ opacity: m.claimed ? 0.5 : 1, textAlign: 'left' }}>
                      <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 'bold' }}>{m.desc}</div>
                      <div className="mono" style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '6px' }}>{m.progress} / {m.target}</div>
                   </div>
                   {!m.claimed && m.progress >= m.target ? (
                      <button className="btn-info" style={{ borderColor: 'var(--win)', color: 'var(--win)', padding: '8px 15px', fontSize: '0.8rem' }} onClick={(e) => claimMission(m.id, e)}>CLAIM +{m.reward}</button>
                   ) : (
                      <div className="mono" style={{ color: m.claimed ? '#555' : 'var(--ep)', fontSize: '1.1rem', fontWeight: 'bold' }}>{m.claimed ? 'CLAIMED' : `+${m.reward}💳`}</div>
                   )}
                </div>
              ))}
            </div>
            <button className="menu-btn" style={{ borderColor: '#444', color: '#888' }} onClick={() => navTo('menu')}>ZURÜCK ZUR ZENTRALE</button>
          </div>
        </div>
      )}

      {currentView === 'stats' && (
        <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="game-title-small" style={{ fontSize: '2rem', marginBottom: '30px' }}>SYSTEM STATISTIKEN</div>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '40px' }}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', textAlign: 'center' }}>
                <div className="log-box" style={{margin:0}}><span>WINS</span><b style={{color:'var(--win)', fontSize:'2.5rem'}}>{stats.wins}</b></div>
                <div className="log-box" style={{margin:0}}><span>LOSSES</span><b style={{color:'var(--lose)', fontSize:'2.5rem'}}>{stats.losses}</b></div>
                <div className="log-box" style={{margin:0}}><span>WIN RATE</span><b style={{color:'var(--ep)', fontSize:'2.5rem'}}>{stats.wins + stats.losses > 0 ? Math.round((stats.wins / (stats.wins + stats.losses))*100) : 0}%</b></div>
                <div className="log-box" style={{margin:0}}><span>ARCHITECT KILLS</span><b style={{color:'var(--apex-pink)', fontSize:'2.5rem'}}>{stats.bossDefeats || 0}</b></div>
                <div className="log-box" style={{margin:0}}><span>PACKS DECRYPTED</span><b style={{color:'#fff', fontSize:'2.5rem'}}>{stats.packsOpened || 0}</b></div>
                <div className="log-box" style={{margin:0}}><span>UPGRADES INSTALLED</span><b style={{color:'#fff', fontSize:'2.5rem'}}>{stats.upgradesDone || 0}</b></div>
             </div>
             <button className="menu-btn" style={{ borderColor: '#444', color: '#888' }} onClick={() => navTo('menu')}>ZURÜCK ZUR ZENTRALE</button>
          </div>
        </div>
      )}

      {currentView === 'lexicon' && (
        <div className="screen active" style={{ display: 'block', padding: '30px' }}>
          <div className="top-bar">
            <div className="game-title-small">ARCHIV: LEXIKON</div>
            <div style={{ display: 'flex', gap: '15px' }}>
              <input type="text" placeholder="Suche..." value={lexSearch} onChange={e => setLexSearch(e.target.value)} className="mono" style={{ padding: '8px', background: '#000', border: '1px solid #444', color: '#fff' }} />
              <select value={lexFaction} onChange={e => setLexFaction(e.target.value)} className="mono" style={{ padding: '8px', background: '#000', border: '1px solid #444', color: '#fff' }}>
                <option value="ALL">ALLE FRAKTIONEN</option>
                {allFactions.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button className="btn-info" onClick={() => { playSound('click'); setShowGlobalRules(true); }}>RULES</button>
              <button className="btn-back" onClick={() => navTo('menu')}>ZURÜCK</button>
            </div>
          </div>
          <div className="card-grid">
            {cardsData.characters
              .filter(c => (c.name || '').toLowerCase().includes(lexSearch.toLowerCase()) && (lexFaction === 'ALL' || c.faction === lexFaction))
              .sort((a,b) => (b.gti || 0) - (a.gti || 0))
              .map((c, i) => <Card key={i} card={c} context="lexicon" />)
            }
          </div>
        </div>
      )}

      {currentView === 'market' && ( <Market credits={credits} setCredits={setCredits} inventory={inventory} setInventory={setInventory} onBack={() => navTo('menu')} onShowRules={() => { playSound('click'); setShowGlobalRules(true); }} onPackBought={() => { handleMissionProgress('buy_pack', 1); handleStatUpdate('packsOpened', 1); }} onCreditGain={handleCreditGain} /> )}
      
      {currentView === 'inventory' && ( <Inventory inventory={inventory} setInventory={setInventory} decks={decks} setDecks={setDecks} allFactions={allFactions} onBack={() => navTo('menu')} onShowRules={() => { playSound('click'); setShowGlobalRules(true); }} onClearNew={clearNewStatus} onCreditGain={handleCreditGain} onMissionAction={(type, amount) => { handleMissionProgress(type, amount); if (type === 'upgrade') handleStatUpdate('upgradesDone', amount); }} /> )}

      {currentView === 'menu' && (
        <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '15px', alignItems: 'center', zIndex: 10 }}>
             <div className="mono" style={{ fontSize: '1.5rem', color: '#fff', marginRight: '15px', textShadow: '0 0 10px var(--ep)' }}><span style={{color: 'var(--ep)'}}>{credits}</span> 💳</div>
             <button className="btn-info" onClick={() => { playSound('click'); setShowGlobalRules(true); }}>RULES</button>
             <button className="btn-back" style={{borderColor: 'var(--lose)', color: 'var(--lose)'}} onClick={resetGame}>RESET DATA</button>
          </div>

          <div className="menu-title">ARCHITECTS<br/>OF CHAOS</div>
          <div className="menu-subtitle">TCG EDITION V1.0 &nbsp;//&nbsp; THE BOARD IS SET</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '400px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
            {/* 🤖 NEU: Button umbenannt */}
            <button className="menu-btn btn-primary" onClick={startMatchFlow}>GEGEN KI SPIELEN</button>
            
            <button className="menu-btn" style={{ borderColor: 'var(--ep)', color: 'var(--ep)', background: 'rgba(255,215,0,0.05)', boxShadow: '0 0 15px rgba(255,215,0,0.1)' }} onClick={() => navTo('multiplayer')}>
               ONLINE MULTIPLAYER <span style={{fontSize: '0.8rem', opacity: 0.7}}>(BETA)</span>
            </button>
            <button className="menu-btn btn-inventory" style={{ position: 'relative', marginTop: '10px' }} onClick={() => navTo('inventory')}>
              INVENTAR & DECK
              {hasNewCards && <div className="notif-badge" style={{ background: 'var(--win)', boxShadow: '0 0 12px var(--win)' }}></div>}
              {!hasNewCards && hasUpgrades && <div className="notif-badge" style={{ background: 'var(--ep)', boxShadow: '0 0 12px var(--ep)' }}></div>}
            </button>
            <button className="menu-btn btn-market" onClick={() => navTo('market')}>SCHWARZMARKT</button>
            <button className="menu-btn btn-missions" style={{ position: 'relative' }} onClick={() => navTo('missions')}>
              MISSIONEN
              {hasClaimableMissions && <div className="notif-badge" style={{ background: 'var(--win)', boxShadow: '0 0 15px var(--win)' }}></div>}
            </button>
            <button className="menu-btn btn-stats" onClick={() => navTo('stats')}>STATISTIKEN</button>
            <button className="menu-btn btn-lexicon" onClick={() => navTo('lexicon')}>LEXIKON</button>
          </div>
        </div>
      )}
    </>
  );
}