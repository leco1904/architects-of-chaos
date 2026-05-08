// src/components/GhostNetwork.jsx
import React, { useState, useEffect } from 'react';
import Card from './Card';
import { supabase } from '../logic/supabase';
import { playSound } from '../logic/audio';

export default function GhostNetwork({ session, onBack, onInvite }) {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'add'
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  
  const [searchName, setSearchName] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchMsg, setSearchMsg] = useState('');

  const [inspectedUser, setInspectedUser] = useState(null); // Das Profil, das wir gerade im Detail anschauen
  const [inviteSent, setInviteSent] = useState(null); // 'pvp' | 'coop' | null

  const myId = session?.user?.id;

  useEffect(() => {
    if (myId) loadNetwork();
  }, [myId]);

  const loadNetwork = async () => {
    try {
      // 1. Hole nur die rohen Freundschafts-Daten
      const { data: relData, error: relError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id_1.eq.${myId},user_id_2.eq.${myId}`);

      if (relError) throw relError;
      
      // Wenn es gar keine Verbindungen gibt, direkt abbrechen
      if (!relData || relData.length === 0) {
          setFriends([]);
          setRequests([]);
          return;
      }

      // 2. Sammle alle relevanten User-IDs (außer meiner eigenen)
      const userIds = new Set();
      relData.forEach(rel => {
          if (rel.user_id_1 !== myId) userIds.add(rel.user_id_1);
          if (rel.user_id_2 !== myId) userIds.add(rel.user_id_2);
      });

      // 3. Lade die Profile für diese IDs aus der korrekten Tabelle
      const { data: profilesData, error: profError } = await supabase
        .from('profiles')
        .select('id, username, avatar_card')
        .in('id', Array.from(userIds));

      if (profError) throw profError;

      // 4. Mappe alles sauber zusammen
      const accepted = [];
      const pending = [];

      relData.forEach(rel => {
        const isSender = rel.user_id_1 === myId;
        const otherId = isSender ? rel.user_id_2 : rel.user_id_1;
        const otherUser = profilesData.find(p => p.id === otherId) || { id: otherId, username: 'UNKNOWN AGENT' };

        if (rel.status === 'accepted') {
          accepted.push({ relId: rel.id, ...otherUser });
        } else if (rel.status === 'pending' && !isSender) {
          // Nur Anfragen anzeigen, die ICH erhalten habe
          pending.push({ relId: rel.id, ...otherUser });
        }
      });

      setFriends(accepted);
      setRequests(pending);
    } catch (e) {
      console.error("Error loading network", e);
    }
  };

  const searchAgent = async () => {
    playSound('click');
    setSearchMsg('SUCHE LÄUFT...');
    setSearchResult(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_card')
        .ilike('username', searchName.trim()) // ilike ignoriert Groß/Kleinschreibung
        .maybeSingle();

      if (error) throw error;
      if (data) {
        if (data.id === myId) setSearchMsg('DAS BIST DU SELBST.');
        else {
          setSearchResult(data);
          setSearchMsg('AGENT GEFUNDEN.');
        }
      } else {
        setSearchMsg('AGENT NICHT GEFUNDEN.');
      }
    } catch (e) {
      setSearchMsg('FEHLER BEI DER SUCHE.');
    }
  };

  const sendRequest = async (targetId) => {
    playSound('click');
    try {
      const { error } = await supabase.from('friendships').insert({
        user_id_1: myId,
        user_id_2: targetId
      });
      if (error) throw error;
      setSearchMsg('ANFRAGE GESENDET.');
      setSearchResult(null);
    } catch (e) {
      if (e.code === '23505') setSearchMsg('ANFRAGE EXISTIERT BEREITS.');
      else setSearchMsg('FEHLER BEIM SENDEN.');
    }
  };

  const acceptRequest = async (relId) => {
    playSound('upgrade');
    try {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', relId);
      loadNetwork();
    } catch (e) { console.error(e); }
  };

  const declineRequest = async (relId) => {
    playSound('click');
    try {
      await supabase.from('friendships').delete().eq('id', relId);
      loadNetwork();
    } catch (e) { console.error(e); }
  };

  const inspectProfile = async (userId) => {
    playSound('click');
    try {
      // FIX: 'id' mit abfragen, damit der Invite-Button weiß, an wen die Anfrage geht!
      const { data, error } = await supabase.from('profiles').select('id, username, avatar_card, inventory').eq('id', userId).single();
      if (error) throw error;
      setInspectedUser(data);
    } catch (e) { console.error(e); }
  };

  // --- PROFIL INSPEKTOR RENDER ---
  if (inspectedUser) {
    return (
      <div className="screen active" style={{ display: 'block', padding: '30px', overflowY: 'auto' }}>
        <div className="top-bar" style={{ marginBottom: '30px' }}>
          <div>
            <div className="game-title-small" style={{ color: 'var(--ep)' }}>DOSSIER: {inspectedUser.username}</div>
            <div className="mono" style={{ fontSize: '0.6rem', color: '#888', letterSpacing: '2px', marginTop: '2px' }}>GHOST NETWORK // INSPECT MODE</div>
          </div>
          <button className="btn-back" onClick={() => { playSound('click'); setInspectedUser(null); }}>ZURÜCK ZUR LISTE</button>
        </div>

        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', maxWidth: '1200px', margin: '0 auto' }}>
          {/* Linke Seite: Ghost Avatar & Action Buttons */}
          <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="mono" style={{ fontSize: '0.8rem', color: '#bc13fe', letterSpacing: '3px' }}>▸ GHOST AVATAR</div>
            {inspectedUser.avatar_card ? (
              <div style={{ pointerEvents: 'none', position: 'relative', width: '320px', height: '448px', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                 <div style={{ transform: 'scale(0.88)', transformOrigin: 'top left' }}>
                     <Card card={inspectedUser.avatar_card} context="lexicon" />
                 </div>
              </div>
            ) : (
              <div style={{ width: '320px', height: '448px', border: '1px dashed #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: 'monospace' }}>KEIN AVATAR GEWÄHLT</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
               <button
                 className="dash-btn-hero"
                 disabled={!!inviteSent}
                 onClick={() => {
                   onInvite(inspectedUser.id, 'pvp');
                   setInviteSent('pvp');
                   setTimeout(() => setInviteSent(null), 3000);
                 }}
               >
                 <span className="hero-bg" style={{ borderColor: inviteSent === 'pvp' ? '#00ff44' : 'var(--win)' }}></span>
                 <span className="hero-text" style={{ color: inviteSent === 'pvp' ? '#00ff44' : 'var(--win)', fontSize: '0.9rem' }}>
                   {inviteSent === 'pvp' ? '✓ NEURAL LINK GESENDET' : '▶ [1V1] HERAUSFORDERN'}
                 </span>
               </button>
               <button
                 className="dash-btn-hero"
                 disabled={!!inviteSent}
                 onClick={() => {
                   onInvite(inspectedUser.id, 'coop');
                   setInviteSent('coop');
                   setTimeout(() => setInviteSent(null), 3000);
                 }}
               >
                 <span className="hero-bg" style={{ borderColor: inviteSent === 'coop' ? '#00ff44' : 'var(--apex-pink)' }}></span>
                 <span className="hero-text" style={{ color: inviteSent === 'coop' ? '#00ff44' : 'var(--apex-pink)', fontSize: '0.9rem' }}>
                   {inviteSent === 'coop' ? '✓ NEURAL LINK GESENDET' : '▶ [CO-OP] MISSION STARTEN'}
                 </span>
               </button>
            </div>
          </div>

          {/* Rechte Seite: Inventar (Read Only) */}
          <div style={{ flex: 1, minWidth: 0 }}>
             <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--win)', letterSpacing: '3px', marginBottom: '20px' }}>▸ INVENTAR KERN ({inspectedUser.inventory?.length || 0} KARTEN)</div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '15px' }}>
                {(inspectedUser.inventory || []).map((card, i) => (
                   <div key={i} style={{ position: 'relative', overflow: 'hidden', borderRadius: '4px', border: '1px solid #333', width: '100px', height: '140px', background: '#050508' }}>
                      <div className="mono" style={{ position: 'absolute', top: 2, right: 4, zIndex: 10, fontSize: '0.6rem', color: '#fff', textShadow: '0 0 5px #000' }}>LVL {card.level || 1}</div>
                      <div style={{ transform: 'scale(0.277)', transformOrigin: 'top left', pointerEvents: 'none', width: '360px', height: '504px', filter: 'saturate(0.8)' }}>
                        <Card card={card} context="inventory" />
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- HAUPTANSICHT RENDER ---
  return (
    <div className="screen active" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="game-title-small" style={{ color: 'var(--ep)', fontSize: '2rem', marginBottom: '30px', letterSpacing: '8px', textShadow: '0 0 15px var(--ep)' }}>GHOST NETWORK</div>
      
      <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', padding: '0', overflow: 'hidden' }}>
        
        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #222' }}>
           <button onClick={() => { playSound('click'); setActiveTab('friends'); }} style={{ flex: 1, padding: '15px', background: activeTab === 'friends' ? 'rgba(0,229,255,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'friends' ? '2px solid var(--ep)' : '2px solid transparent', color: activeTab === 'friends' ? 'var(--ep)' : '#666', fontFamily: "'Roboto Mono',monospace", fontSize: '0.8rem', letterSpacing: '2px', cursor: 'pointer' }}>
             SQUAD LISTE ({friends.length})
           </button>
           <button onClick={() => { playSound('click'); setActiveTab('requests'); }} style={{ flex: 1, padding: '15px', background: activeTab === 'requests' ? 'rgba(0,229,255,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'requests' ? '2px solid var(--win)' : '2px solid transparent', color: activeTab === 'requests' ? 'var(--win)' : '#666', fontFamily: "'Roboto Mono',monospace", fontSize: '0.8rem', letterSpacing: '2px', cursor: 'pointer' }}>
             ANFRAGEN ({requests.length})
           </button>
           <button onClick={() => { playSound('click'); setActiveTab('add'); }} style={{ flex: 1, padding: '15px', background: activeTab === 'add' ? 'rgba(0,229,255,0.1)' : 'transparent', border: 'none', borderBottom: activeTab === 'add' ? '2px solid var(--apex-pink)' : '2px solid transparent', color: activeTab === 'add' ? 'var(--apex-pink)' : '#666', fontFamily: "'Roboto Mono',monospace", fontSize: '0.8rem', letterSpacing: '2px', cursor: 'pointer' }}>
             AGENT SUCHEN
           </button>
        </div>

        <div style={{ padding: '30px', minHeight: '400px' }}>
          
          {/* TAB: FREUNDE */}
          {activeTab === 'friends' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {friends.length === 0 ? <div className="mono" style={{ color: '#555', textAlign: 'center', marginTop: '50px' }}>KEINE AGENTEN IM SQUAD.</div> : null}
              {friends.map(f => (
                 <div key={f.relId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                       <div style={{ fontSize: '1.5rem' }}>🕵️</div>
                       <div>
                         <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '1.2rem', color: 'var(--ep)', fontWeight: 'bold' }}>{f.username}</div>
                         <div className="mono" style={{ fontSize: '0.6rem', color: '#888' }}>{f.avatar_card?.name || 'Kein Avatar'}</div>
                       </div>
                    </div>
                    <button className="menu-btn" style={{ margin: 0, padding: '8px 20px', borderColor: 'var(--ep)', color: 'var(--ep)', width: 'auto', flexShrink: 0 }} onClick={() => inspectProfile(f.id)}>DOSSIER ANSEHEN ▸</button>
                 </div>
              ))}
            </div>
          )}

          {/* TAB: ANFRAGEN */}
          {activeTab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {requests.length === 0 ? <div className="mono" style={{ color: '#555', textAlign: 'center', marginTop: '50px' }}>KEINE OFFENEN ANFRAGEN.</div> : null}
              {requests.map(r => (
                 <div key={r.relId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: 'rgba(0,229,255,0.05)', border: '1px solid var(--win)', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                       <div style={{ fontSize: '1.5rem', opacity: 0.5 }}>📡</div>
                       <div>
                         <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>{r.username}</div>
                         <div className="mono" style={{ fontSize: '0.6rem', color: 'var(--win)' }}>INCOMING REQUEST</div>
                       </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                       <button className="btn-info" style={{ borderColor: 'var(--win)', color: 'var(--win)', padding: '6px 12px' }} onClick={() => acceptRequest(r.relId)}>AKZEPTIEREN</button>
                       <button className="btn-info" style={{ borderColor: 'var(--lose)', color: 'var(--lose)', padding: '6px 12px' }} onClick={() => declineRequest(r.relId)}>✕</button>
                    </div>
                 </div>
              ))}
            </div>
          )}

          {/* TAB: SUCHEN */}
          {activeTab === 'add' && (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
                <div className="mono" style={{ color: '#aaa', fontSize: '0.8rem', textAlign: 'center' }}>EXAKTEN GHOST-NAMEN EINGEBEN UM VERBINDUNG AUFZUBAUEN</div>
                <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '400px' }}>
                  <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="Username..." className="mono" style={{ flex: 1, padding: '12px', background: '#000', border: '1px solid #444', color: '#fff', fontSize: '1rem', outline: 'none' }} />
                  <button className="menu-btn" style={{ margin: 0, borderColor: 'var(--apex-pink)', color: 'var(--apex-pink)', width: 'auto', flexShrink: 0 }} onClick={searchAgent}>SUCHEN</button>
                </div>
                
                {searchMsg && <div className="mono" style={{ color: 'var(--win)', fontSize: '0.8rem', animation: 'pulse 1s infinite' }}>{searchMsg}</div>}
                
                {searchResult && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: 'rgba(255,0,127,0.05)', border: '1px solid var(--apex-pink)', borderRadius: '4px', width: '100%', maxWidth: '400px', marginTop: '20px' }}>
                     <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>{searchResult.username}</div>
                     <button className="btn-info" style={{ borderColor: 'var(--apex-pink)', color: 'var(--apex-pink)', padding: '8px 15px', width: 'auto', flexShrink: 0 }} onClick={() => sendRequest(searchResult.id)}>ADDEN +</button>
                  </div>
                )}
             </div>
          )}
        </div>
      </div>
      
      <button className="menu-btn" style={{ borderColor: '#444', color: '#888', marginTop: '30px' }} onClick={onBack}>ZURÜCK ZUR ZENTRALE</button>
    </div>
  );
}