import React, { useState, useEffect } from 'react';
import { supabase } from '../logic/supabase';
import { playSound } from '../logic/audio';

const CATEGORIES = [
  { id: 'highest_crit', label: 'HÖCHSTER CRIT', suffix: ' DMG' },
  { id: 'total_damage_dealt', label: 'SCHADEN GESAMT', suffix: ' DMG' },
  { id: 'furthest_run_score', label: 'WEITESTER RUN', suffix: '', format: (val) => `SEKTOR ${Math.floor(val/10)} // NODE ${val%10}` },
  { id: 'total_wins', label: 'SIEGE', suffix: ' WINS' },
  { id: 'packs_opened', label: 'PACKS', suffix: ' GEÖFFNET' },
  { id: 'cards_collected', label: 'KARTEN', suffix: ' UNIQUE' }
];

export default function Leaderboard({ onBack }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('highest_crit');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Wir holen alle Profile, die das meta_stats JSONB Objekt besitzen
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('username, meta_stats, avatar_card')
        .not('meta_stats', 'is', null);

      if (error) throw error;
      setData(profiles || []);
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sortiert die Daten absteigend anhand des ausgewählten Tabs
  const getSortedData = () => {
    return [...data]
      .filter(p => p.meta_stats && p.meta_stats[category] !== undefined)
      .sort((a, b) => b.meta_stats[category] - a.meta_stats[category])
      .slice(0, 50); // Wir zeigen die Top 50
  };

  const sortedData = getSortedData();
  const activeCatObj = CATEGORIES.find(c => c.id === category);

  return (
    <div className="screen active" style={{ display: 'block', padding: '30px', overflowY: 'auto' }}>
      <div className="top-bar" style={{ marginBottom: '30px' }}>
        <div>
          <div className="game-title-small" style={{ color: 'var(--ep)', textShadow: '0 0 15px var(--ep)' }}>🏆 GLOBAL LEADERBOARD</div>
          <div className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,215,0,0.5)', letterSpacing: '3px', marginTop: '4px' }}>
            ARCHITECTS OF CHAOS // RANKING-SYSTEM
          </div>
        </div>
        <button className="btn-back" onClick={() => { playSound('click'); onBack(); }}>ZURÜCK</button>
      </div>

      <div className="glass-panel" style={{ maxWidth: '900px', margin: '0 auto', padding: '30px' }}>
        
        {/* Kategorie-Tabs */}
        <div className="leaderboard-tabs">
          {CATEGORIES.map(cat => {
            const isActive = category === cat.id;
            return (
              <button 
                key={cat.id} 
                onClick={() => { playSound('click'); setCategory(cat.id); }}
                style={{
                  flex: 1, padding: '12px', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, letterSpacing: '2px', transition: '0.2s',
                  background: isActive ? 'rgba(0,229,255,0.15)' : 'rgba(0,0,0,0.4)',
                  border: `1px solid ${isActive ? 'var(--win)' : '#333'}`,
                  color: isActive ? 'var(--win)' : '#888',
                  boxShadow: isActive ? '0 0 15px rgba(0,229,255,0.2)' : 'none'
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Tabelle */}
        {loading ? (
           <div className="mono" style={{ textAlign: 'center', padding: '50px', color: 'var(--ep)', animation: 'pulse 1s infinite' }}>LADE DATEN AUS DEM NETZWERK...</div>
        ) : sortedData.length === 0 ? (
           <div className="mono" style={{ textAlign: 'center', padding: '50px', color: '#555' }}>NOCH KEINE DATEN FÜR DIESE KATEGORIE VORHANDEN.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>RANG</th>
                  <th>AGENT</th>
                  <th>GHOST AVATAR</th>
                  <th style={{ textAlign: 'right' }}>SCORE</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((player, index) => {
                  const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-normal';
                  return (
                    <tr key={index}>
                      <td className={`mono ${rankClass}`}>#{index + 1}</td>
                      <td style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: index === 0 ? 'var(--ep)' : '#fff' }}>
                        {player.username}
                      </td>
                      <td>
                        {player.avatar_card ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#bc13fe', fontWeight: 700, fontSize: '0.9rem' }}>{player.avatar_card.name}</span>
                            <span className="mono" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>GTI {player.avatar_card.gti} // {player.avatar_card.archetype?.toUpperCase()}</span>
                          </div>
                        ) : (
                          <span className="mono" style={{ color: '#444', fontSize: '0.7rem' }}>KEIN AVATAR</span>
                        )}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 900, color: index === 0 ? 'var(--ep)' : 'var(--win)', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                        {activeCatObj.format ? activeCatObj.format(player.meta_stats[category]) : player.meta_stats[category].toLocaleString()} <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>{activeCatObj.suffix}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}