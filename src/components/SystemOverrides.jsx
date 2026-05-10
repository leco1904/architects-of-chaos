import React from 'react';
import { playSound } from '../logic/audio';

// ── DIE ACHIEVEMENT DATENBANK (50+ Overrides) ───────────────────────────────────────────
export const ACHIEVEMENTS = [
  // COMBAT: WINS
  { id: 'win_1', title: 'FIRST BLOOD', desc: 'Gewinne dein erstes Match.', category: 'combat', reward: 100, target: 1, type: 'total_wins', icon: '⚔️' },
  { id: 'win_10', title: 'VETERAN AGENT', desc: 'Gewinne 10 Matches in beliebiger Schwierigkeit.', category: 'combat', reward: 500, target: 10, type: 'total_wins', icon: '🎖️' },
  { id: 'win_25', title: 'BLOODTHIRSTY', desc: 'Gewinne 25 Matches in beliebiger Schwierigkeit.', category: 'combat', reward: 1000, target: 25, type: 'total_wins', icon: '🩸' },
  { id: 'win_50', title: 'RUTHLESS', desc: 'Gewinne 50 Matches in beliebiger Schwierigkeit.', category: 'combat', reward: 2500, target: 50, type: 'total_wins', icon: '🔥' },
  { id: 'win_100', title: 'SYSTEM DOMINATOR', desc: 'Gewinne 100 Matches. Das System erzittert.', category: 'combat', reward: 5000, target: 100, type: 'total_wins', icon: '👑' },
  { id: 'win_250', title: 'APEX PREDATOR', desc: 'Gewinne 250 Matches.', category: 'combat', reward: 10000, target: 250, type: 'total_wins', icon: '🦖' },
  { id: 'win_500', title: 'GOD OF WAR', desc: 'Gewinne 500 Matches.', category: 'combat', reward: 25000, target: 500, type: 'total_wins', icon: '🏛️' },

  // COMBAT: LOSSES (Learning from Failure)
  { id: 'loss_1', title: 'SYSTEM SHOCK', desc: 'Erleide deine erste Niederlage.', category: 'combat', reward: 50, target: 1, type: 'total_losses', icon: '💀' },
  { id: 'loss_10', title: 'ADAPT & OVERCOME', desc: 'Verliere 10 Matches. Lerne aus deinen Fehlern.', category: 'combat', reward: 200, target: 10, type: 'total_losses', icon: '📉' },
  { id: 'loss_50', title: 'TRIAL BY FIRE', desc: 'Verliere 50 Matches.', category: 'combat', reward: 1000, target: 50, type: 'total_losses', icon: '🔥' },

  // COMBAT: CRIT & DAMAGE DEALT
  { id: 'crit_50', title: 'CRITICAL ERROR', desc: 'Füge dem System mit einem einzigen Hit mind. 50 DMG zu.', category: 'combat', reward: 300, target: 50, type: 'highest_crit', icon: '💥' },
  { id: 'crit_100', title: 'OVERKILL', desc: 'Füge mit einem Hit mind. 100 DMG zu.', category: 'combat', reward: 1000, target: 100, type: 'highest_crit', icon: '🧨' },
  { id: 'crit_200', title: 'SYSTEM WIPE', desc: 'Füge mit einem Hit mind. 200 DMG zu.', category: 'combat', reward: 2500, target: 200, type: 'highest_crit', icon: '☢️' },
  { id: 'crit_500', title: 'ONE PUNCH', desc: 'Füge mit einem Hit mind. 500 DMG zu.', category: 'combat', reward: 10000, target: 500, type: 'highest_crit', icon: '☄️' },
  { id: 'dmg_1k', title: 'FIGHTER', desc: 'Teile insgesamt 1.000 Schaden aus.', category: 'combat', reward: 250, target: 1000, type: 'total_damage_dealt', icon: '🗡️' },
  { id: 'dmg_10k', title: 'DESTROYER', desc: 'Teile insgesamt 10.000 Schaden aus.', category: 'combat', reward: 1000, target: 10000, type: 'total_damage_dealt', icon: '⚔️' },
  { id: 'dmg_50k', title: 'ANNIHILATOR', desc: 'Teile insgesamt 50.000 Schaden aus.', category: 'combat', reward: 3000, target: 50000, type: 'total_damage_dealt', icon: '💣' },
  { id: 'dmg_250k', title: 'WORLD ENDER', desc: 'Teile insgesamt 250.000 Schaden aus.', category: 'combat', reward: 10000, target: 250000, type: 'total_damage_dealt', icon: '🌋' },

  // COMBAT: DAMAGE TAKEN
  { id: 'dmgt_1k', title: 'FLESH WOUND', desc: 'Erleide insgesamt 1.000 Schaden.', category: 'combat', reward: 250, target: 1000, type: 'total_damage_taken', icon: '🩹' },
  { id: 'dmgt_10k', title: 'TANK', desc: 'Erleide insgesamt 10.000 Schaden.', category: 'combat', reward: 1000, target: 10000, type: 'total_damage_taken', icon: '🛡️' },
  { id: 'dmgt_50k', title: 'IMMORTAL', desc: 'Erleide insgesamt 50.000 Schaden.', category: 'combat', reward: 3000, target: 50000, type: 'total_damage_taken', icon: '🧟' },

  // COLLECTION: CARDS & PACKS
  { id: 'cards_10', title: 'RECRUITER', desc: 'Sammle 10 einzigartige Karten für dein Inventar.', category: 'collection', reward: 100, target: 10, type: 'cards_collected', icon: '📇' },
  { id: 'cards_30', title: 'DATA MINER', desc: 'Sammle 30 einzigartige Karten für dein Inventar.', category: 'collection', reward: 400, target: 30, type: 'cards_collected', icon: '🗄️' },
  { id: 'cards_60', title: 'ARCHIVIST', desc: 'Sammle 60 einzigartige Karten.', category: 'collection', reward: 1000, target: 60, type: 'cards_collected', icon: '📚' },
  { id: 'cards_100', title: 'LIBRARIAN', desc: 'Sammle 100 einzigartige Karten.', category: 'collection', reward: 2500, target: 100, type: 'cards_collected', icon: '🏛️' },
  { id: 'packs_10', title: 'DECRYPTER', desc: 'Öffne 10 Datacaches auf dem Schwarzmarkt.', category: 'collection', reward: 250, target: 10, type: 'packs_opened', icon: '🔓' },
  { id: 'packs_50', title: 'GAMBLER', desc: 'Öffne 50 Datacaches auf dem Schwarzmarkt.', category: 'collection', reward: 1000, target: 50, type: 'packs_opened', icon: '🎰' },
  { id: 'packs_100', title: 'WHALE', desc: 'Öffne 100 Datacaches auf dem Schwarzmarkt.', category: 'collection', reward: 2500, target: 100, type: 'packs_opened', icon: '🐳' },
  { id: 'packs_500', title: 'BLACK MARKET CEO', desc: 'Öffne 500 Datacaches.', category: 'collection', reward: 10000, target: 500, type: 'packs_opened', icon: '🎩' },

  // GHOST NODE: PROGRESS & NODES
  { id: 'nodes_10', title: 'PATHFINDER', desc: 'Schließe 10 Nodes im Ghost Protocol ab.', category: 'ghost', reward: 200, target: 10, type: 'nodes_cleared_total', icon: '🛤️' },
  { id: 'nodes_50', title: 'NODE RUNNER', desc: 'Schließe 50 Nodes im Ghost Protocol ab.', category: 'ghost', reward: 1000, target: 50, type: 'nodes_cleared_total', icon: '🏃' },
  { id: 'nodes_100', title: 'GRID WALKER', desc: 'Schließe 100 Nodes im Ghost Protocol ab.', category: 'ghost', reward: 2500, target: 100, type: 'nodes_cleared_total', icon: '🕸️' },
  { id: 'nodes_500', title: 'GHOST IN THE MACHINE', desc: 'Schließe 500 Nodes im Ghost Protocol ab.', category: 'ghost', reward: 10000, target: 500, type: 'nodes_cleared_total', icon: '👻' },
  { id: 'run_15', title: 'SURVIVOR', desc: 'Erreiche Sektor 1, Node 5 im Ghost Protocol.', category: 'ghost', reward: 300, target: 15, type: 'furthest_run_score', icon: '⛺' },
  { id: 'run_25', title: 'DEEP DIVE', desc: 'Erreiche Sektor 2, Node 5 im Ghost Protocol.', category: 'ghost', reward: 800, target: 25, type: 'furthest_run_score', icon: '🌌' },
  { id: 'run_35', title: 'ABYSS WALKER', desc: 'Erreiche Sektor 3, Node 5 im Ghost Protocol.', category: 'ghost', reward: 2000, target: 35, type: 'furthest_run_score', icon: '🌑' },
  { id: 'run_55', title: 'EDGE OF THE GRID', desc: 'Erreiche Sektor 5, Node 5 im Ghost Protocol.', category: 'ghost', reward: 5000, target: 55, type: 'furthest_run_score', icon: '🛑' },

  // GHOST NODE: BOSSES
  { id: 'boss_1', title: 'ARCHITECT FALLS', desc: 'Besiege deinen ersten Boss (Architect / Sektor Boss).', category: 'ghost', reward: 1000, target: 1, type: 'bosses_defeated', icon: '☠️' },
  { id: 'boss_5', title: 'SLAYER', desc: 'Besiege 5 Bosse im System.', category: 'ghost', reward: 2500, target: 5, type: 'bosses_defeated', icon: '🗡️' },
  { id: 'boss_10', title: 'KINGSLAYER', desc: 'Besiege 10 Bosse im System.', category: 'ghost', reward: 5000, target: 10, type: 'bosses_defeated', icon: '👑' },
  { id: 'boss_50', title: 'SYSTEM CLEANER', desc: 'Besiege 50 Bosse. Du bist die wahre Gefahr.', category: 'ghost', reward: 20000, target: 50, type: 'bosses_defeated', icon: '☣️' }
];

export default function SystemOverrides({ metaStats, credits, username, onOpenShop, onBack, onClaim }) {
  const claimed = metaStats?.claimed_achievements || [];

  const getCategoryColor = (cat) => {
    if (cat === 'combat') return 'var(--lose)'; // Rot
    if (cat === 'ghost') return '#bc13fe'; // Lila
    return 'var(--win)'; // Türkis für Collection
  };

  const getProgress = (ach) => {
    const current = metaStats?.[ach.type] || 0;
    return Math.min(current, ach.target);
  };

  return (
    <div className="screen active" style={{ display: 'block', padding: '60px 30px 30px 30px', overflowY: 'auto' }}>
      
      {/* HUD STATUS BAR (Standard) */}
      <div style={{ position: 'absolute', top: '15px', right: '35px', display: 'flex', filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))', zIndex: 1000 }}>
        <div className="hud-status-module funds" onClick={() => { playSound('click'); if(onOpenShop) onOpenShop(); }} title="Shop öffnen" style={{ cursor: 'pointer', transition: '0.3s' }}>
          <span className="hud-label">CREDITS</span>
          <span className="hud-value">{credits ?? 0}</span>
        </div>
        <div className="hud-status-module agent" style={{ borderColor: 'rgba(0, 229, 255, 0.2)', color: 'var(--win)', marginLeft: '-5px', clipPath: 'none' }}>
          <span className="hud-label" style={{ color: 'var(--win)' }}>SYS.ID</span>
          <span className="hud-value" style={{ fontSize: '1.1rem', textTransform: 'uppercase' }}>{username || 'UNKNOWN'}</span>
        </div>
        <div className="hud-status-module agent" onClick={() => { playSound('click'); onBack(); }} style={{ borderColor: 'var(--lose)', color: 'var(--lose)', borderRight: 'none', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', paddingRight: '20px', marginLeft: '-5px', cursor: 'pointer' }}>
          <span className="hud-label" style={{ color: 'var(--lose)' }}>STATUS</span>
          <span className="hud-value" style={{ fontSize: '0.9rem' }}>EXIT</span>
        </div>
      </div>

      <div className="top-bar" style={{ marginBottom: '30px', borderBottom: 'none' }}>
        <div>
          <div className="game-title-small" style={{ color: 'var(--ep)' }}>ACHIEVEMENTS // OVERRIDES</div>
          <div className="mono" style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '2px', marginTop: '4px' }}>
            PERMANENTE SYSTEM-HACKS: {claimed.length} / {ACHIEVEMENTS.length} ENTSPERRT
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {ACHIEVEMENTS.map(ach => {
          const isUnlocked = claimed.includes(ach.id);
          const progress = getProgress(ach);
          const canClaim = progress >= ach.target && !isUnlocked;
          const color = getCategoryColor(ach.category);
          
          return (
            <div key={ach.id} style={{
              display: 'flex', flexDirection: 'column',
              background: isUnlocked ? `${color}11` : 'rgba(10,10,15,0.6)',
              border: `1px solid ${isUnlocked ? color : canClaim ? 'var(--ep)' : '#333'}`,
              borderLeft: `4px solid ${isUnlocked ? color : canClaim ? 'var(--ep)' : '#444'}`,
              padding: '20px', borderRadius: '6px',
              boxShadow: isUnlocked ? `0 0 15px ${color}33` : canClaim ? '0 0 15px rgba(255,215,0,0.2)' : 'none',
              filter: isUnlocked || canClaim ? 'none' : 'grayscale(0.8)',
              transition: 'all 0.3s ease'
            }}>
              
              {/* TOP: Title & Icon */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.8rem', filter: isUnlocked || canClaim ? `drop-shadow(0 0 8px ${color})` : 'none' }}>{ach.icon}</span>
                  <div>
                    <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '1.2rem', fontWeight: 900, color: isUnlocked || canClaim ? '#fff' : '#888', letterSpacing: '1px' }}>{ach.title}</div>
                    <div className="mono" style={{ fontSize: '0.55rem', color: color, letterSpacing: '2px' }}>{ach.category.toUpperCase()} OVERRIDE</div>
                  </div>
                </div>
                {isUnlocked && (
                  <div className="mono" style={{ color: 'var(--ep)', fontSize: '0.7rem', fontWeight: 900 }}>✓ UNLOCKED</div>
                )}
                {!isUnlocked && !canClaim && (
                  <div className="mono" style={{ color: '#555', fontSize: '0.7rem' }}>🔒 LOCKED</div>
                )}
              </div>
              
              {/* MIDDLE: Description (Flex 1 schiebt die Progress-Bar immer ordentlich nach unten) */}
              <div style={{ flex: 1, fontSize: '0.85rem', color: isUnlocked || canClaim ? '#ddd' : '#666', marginBottom: '20px', lineHeight: '1.4' }}>
                {ach.desc}
              </div>

              {/* BOTTOM: Progress Bar & Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, marginRight: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span className="mono" style={{ fontSize: '0.6rem', color: '#888' }}>PROGRESS</span>
                    <span className="mono" style={{ fontSize: '0.6rem', color: isUnlocked || canClaim ? color : '#888' }}>{progress} / {ach.target}</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.5)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(progress / ach.target) * 100}%`, background: isUnlocked ? color : canClaim ? 'var(--ep)' : '#555' }} />
                  </div>
                </div>
                
                {/* CLAIM STATUS / BUTTON */}
                {isUnlocked ? (
                  <div className="mono" style={{ fontSize: '0.85rem', color: 'var(--ep)', fontWeight: 900 }}>+{ach.reward} 💳</div>
                ) : canClaim ? (
                  <button className="btn-info" style={{ borderColor: 'var(--ep)', color: 'var(--ep)', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 900 }} onClick={(e) => onClaim(ach, e)}>
                    CLAIM +{ach.reward}
                  </button>
                ) : (
                  <div className="mono" style={{ fontSize: '0.85rem', color: '#555', fontWeight: 900 }}>+{ach.reward} 💳</div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}