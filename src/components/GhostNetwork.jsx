import React, { useState, useEffect } from 'react';
import Card from './Card';
import { supabase } from '../logic/supabase';
import { playSound } from '../logic/audio';

// ── Dekorative Eck-Klammern ───────────────────────────────────────────────
const Corners = ({ color = 'var(--ep)', size = 12, offset = 10 }) => {
  const base = {
    position: 'absolute',
    width: size,
    height: size,
    pointerEvents: 'none',
    zIndex: 2,
  };
  const style = (top, left, right, bottom, borderTop, borderLeft, borderRight, borderBottom) => ({
    ...base,
    top:    top    !== null ? offset : undefined,
    left:   left   !== null ? offset : undefined,
    right:  right  !== null ? offset : undefined,
    bottom: bottom !== null ? offset : undefined,
    borderTop:    borderTop    ? `1px solid ${color}` : undefined,
    borderLeft:   borderLeft   ? `1px solid ${color}` : undefined,
    borderRight:  borderRight  ? `1px solid ${color}` : undefined,
    borderBottom: borderBottom ? `1px solid ${color}` : undefined,
  });
  return (
    <>
      <div style={style(0, 0, null, null, true, true, false, false)} />
      <div style={style(0, null, 0, null, true, false, true, false)} />
      <div style={style(null, 0, null, 0, false, true, false, true)} />
      <div style={style(null, null, 0, 0, false, false, true, true)} />
    </>
  );
};

// ── Generierter Cyber-Avatar ─────────────────────────────────
export function CyberAvatar({ username = '', size = 44 }) {
  const seed = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const s = size;

  const hex = [0, 1, 2, 3, 4, 5].map(i => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${s / 2 + (s / 2 - 5) * Math.cos(angle)},${s / 2 + (s / 2 - 5) * Math.sin(angle)}`;
  }).join(' ');

  const pixels = Array.from({ length: 8 }, (_, i) => ({
    x: 4 + (i % 4) * Math.floor((s - 8) / 4),
    y: 4 + Math.floor(i / 4) * Math.floor((s - 8) / 4),
    on: ((seed ^ (seed >> (i + 1))) >> i) & 1,
  }));

  return (
    <div style={{
      width: s, height: s, background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(0,229,255,0.5)',
      position: 'relative', overflow: 'hidden', flexShrink: 0, boxShadow: '0 0 8px rgba(0,229,255,0.12) inset',
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.04) 2px, rgba(0,229,255,0.04) 4px)',
      }} />

      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <polygon points={hex} fill="rgba(0,229,255,0.05)" stroke="rgba(0,229,255,0.25)" strokeWidth="0.75" />
        {pixels.map((p, i) => p.on ? <rect key={i} x={p.x} y={p.y} width={2.5} height={2.5} fill="var(--ep)" opacity="0.2" /> : null)}
        {pixels.map((p, i) => p.on ? <rect key={`m${i}`} x={s - p.x - 2.5} y={p.y} width={2.5} height={2.5} fill="var(--ep)" opacity="0.2" /> : null)}
        <line x1={s / 2} y1={s * 0.22} x2={s / 2} y2={s * 0.78} stroke="var(--ep)" strokeWidth="0.6" opacity="0.55" />
        <line x1={s * 0.22} y1={s / 2} x2={s * 0.78} y2={s / 2} stroke="var(--ep)" strokeWidth="0.6" opacity="0.55" />
        <circle cx={s / 2} cy={s / 2} r={s * 0.07} fill="none" stroke="var(--ep)" strokeWidth="0.8" opacity="0.9" />
        <circle cx={s / 2} cy={s / 2} r={s * 0.025} fill="var(--ep)" opacity="1" />
      </svg>
    </div>
  );
}

const CyberDivider = ({ color = 'rgba(0,229,255,0.08)' }) => (
  <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${color} 20%, ${color} 80%, transparent)` }} />
);

export default function GhostNetwork({ session, isOpen, onClose, onInvite, onLogout, metaStats, conn, chatMessages, onSendMessage, onlineUsers = {}, onDisconnect }) {
  // ── State ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('friends');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = React.useRef(null);

  const [friends, setFriends]     = useState([]);
  const [requests, setRequests]   = useState([]);

  const [searchName,   setSearchName]   = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchMsg,    setSearchMsg]    = useState('');

  const [inspectedUser, setInspectedUser] = useState(null);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [dmHistory, setDmHistory] = useState([]);
  const [dmInput, setDmInput] = useState('');
  const dmEndRef = React.useRef(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  /* MOBILE OPTIMIZATION START */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(
      window.matchMedia('(max-width: 768px)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    );
    check();
    const mq = window.matchMedia('(max-width: 768px)');
    if (mq.addEventListener) mq.addEventListener('change', check);
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', check); };
  }, []);
  /* MOBILE OPTIMIZATION END */

  const myId = session?.user?.id;

  // Auto-Scroll im Terminal
  useEffect(() => {
    if (dmEndRef.current) dmEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [dmHistory, activeChatUser]);

  // Echtzeit-Updates für den aktuell geöffneten Chat
  useEffect(() => {
    if (!activeChatUser || !myId) return;
    const channel = supabase.channel('dm_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
         const newMsg = payload.new;
         if (
           (newMsg.sender_id === activeChatUser.id && newMsg.receiver_id === myId) ||
           (newMsg.sender_id === myId && newMsg.receiver_id === activeChatUser.id)
         ) {
            setDmHistory(prev => {
               if (prev.find(m => m.id === newMsg.id)) return prev;
               return [...prev, newMsg];
            });
         }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeChatUser, myId]);

  const openComms = async (friend) => {
    playSound('click');
    setInspectedUser(null);
    setActiveChatUser(friend);
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: true });
    if (data) setDmHistory(data);
  };

  const sendDM = async () => {
    if (!dmInput.trim() || !activeChatUser) return;
    playSound('click');
    const text = dmInput.trim();
    setDmInput('');
    
    // Optimistic UI Update (erscheint sofort)
    const tempMsg = { id: Date.now(), sender_id: myId, receiver_id: activeChatUser.id, text, created_at: new Date().toISOString() };
    setDmHistory(prev => [...prev, tempMsg]);

    await supabase.from('direct_messages').insert({
      sender_id: myId,
      receiver_id: activeChatUser.id,
      text
    });
  };

  // Auto-Scroll für Chat
  useEffect(() => {
    if (activeTab === 'link' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // Wechsel automatisch auf LINK, wenn eine Verbindung entsteht
  useEffect(() => {
    if (conn) setActiveTab('link');
  }, [conn]);

  useEffect(() => {
    if (!myId) return;
    
    // 1. Initiales Laden beim Öffnen
    loadNetwork();

    // 2. NEU: Realtime-Listener für das Ghost Network.
    // Lädt die Liste SOFORT neu, wenn Anfragen ankommen, gesendet oder akzeptiert werden.
    const networkSub = supabase.channel('network_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, (payload) => {
          const record = payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old;
          // Nur aktualisieren, wenn dieser Client auch Teil der Freundschaft ist
          if (record && (record.user_id_1 === myId || record.user_id_2 === myId)) {
              loadNetwork();
          }
      })
      .subscribe();

    return () => supabase.removeChannel(networkSub);
  }, [myId]);

  const loadNetwork = async () => {
    try {
      const { data: relData, error: relError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id_1.eq.${myId},user_id_2.eq.${myId}`);

      if (relError) throw relError;

      if (!relData || relData.length === 0) {
        setFriends([]); setRequests([]); return;
      }

      // IDs sammeln: Wir ermitteln explizit die "andere" Seite der Freundschaft
      // (Erlaubt auch das korrekte Laden, wenn man sich zu Testzwecken selbst geaddet hat)
      const userIds = new Set();
      relData.forEach(rel => {
        const isSender = rel.user_id_1 === myId;
        const otherId = isSender ? rel.user_id_2 : rel.user_id_1;
        userIds.add(otherId);
      });

      // Sicherheits-Abbruch, falls die Liste leer ist (verhindert Supabase-Fehler)
      if (userIds.size === 0) {
        setFriends([]); setRequests([]); return;
      }

      const { data: profilesData, error: profError } = await supabase
        .from('profiles')
        .select('id, username, avatar_card')
        .in('id', Array.from(userIds));

      if (profError) throw profError;

      const accepted = [];
      const pending  = [];

      relData.forEach(rel => {
        const isSender  = rel.user_id_1 === myId;
        const otherId   = isSender ? rel.user_id_2 : rel.user_id_1;
        // Optional Chaining (?.) hinzugefügt, falls profilesData mal leer sein sollte
        const otherUser = profilesData?.find(p => p.id === otherId) || { id: otherId, username: 'UNKNOWN AGENT' };

        if (rel.status === 'accepted') {
          accepted.push({ relId: rel.id, ...otherUser });
        } else if (rel.status === 'pending' && !isSender) {
          pending.push({ relId: rel.id, ...otherUser });
        }
      });

      setFriends(accepted);
      setRequests(pending);
    } catch (e) {
      console.error('Error loading network', e);
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
        .ilike('username', searchName.trim())
        .maybeSingle();

      if (error) throw error;
      if (data) {
        if (data.id === myId) setSearchMsg('DAS BIST DU SELBST.');
        else { setSearchResult(data); setSearchMsg('AGENT GEFUNDEN.'); }
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
      const { error } = await supabase.from('friendships').insert({ user_id_1: myId, user_id_2: targetId });
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
    try { await supabase.from('friendships').update({ status: 'accepted' }).eq('id', relId); loadNetwork(); } catch (e) { console.error(e); }
  };

  const declineRequest = async (relId) => {
    playSound('click');
    try { await supabase.from('friendships').delete().eq('id', relId); loadNetwork(); } catch (e) { console.error(e); }
  };

  const inspectProfile = async (userId) => {
    playSound('click');
    setActiveChatUser(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_card, inventory')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setInspectedUser(data);
    } catch (e) { console.error(e); }
  };

  // ── DYNAMISCHE TABS ──
  const tabs = [];
  if (conn) tabs.push({ key: 'link', label: 'UPLINK', count: null, accent: 'var(--win)' });
  tabs.push(
    { key: 'friends', label: 'SQUAD', count: friends.length, accent: 'var(--ep)' },
    { key: 'signals', label: 'SIGNALS', count: requests.length > 0 ? requests.length : null, accent: '#00ff88' },
    { key: 'records', label: 'RECORDS', count: null, accent: 'var(--apex-pink)' }
  );

  return (
    <>
      <div className={`gn-sidebar-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose} />
      
      {/* Sidebar Container */}
      <div className={`gn-sidebar ${isOpen ? 'open' : ''}`} style={{ fontFamily: "'Roboto Mono', monospace", overflow: 'visible', isolation: 'isolate' }}>
        
        {/* ── SIDE-OUT PANEL (Dossier & Global Comms) ── */}
        {/* MOBILE OPTIMIZATION START: Auf Mobile = Fullscreen-Overlay statt Side-Out */}
        <div style={{
           position: 'absolute',
           /* Desktop: fährt links aus der Sidebar heraus */
           ...(isMobile ? {
             top: 0, left: 0, right: 0, bottom: 0,
             width: '100%', height: '100%',
             zIndex: 10,
           } : {
             right: '100%', top: 0, bottom: 0, width: '450px',
             zIndex: -1,
           }),
           background: 'rgba(5,0,10,0.99)',
           borderRight: isMobile ? 'none' : '1px solid var(--ep)',
           borderLeft: isMobile ? 'none' : '1px solid var(--ep)',
           boxShadow: isMobile ? 'none' : '-20px 0 50px rgba(0,0,0,0.8)',
           padding: '25px',
           display: 'flex', flexDirection: 'column', gap: '20px',
           transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease-out',
           transform: (inspectedUser || activeChatUser) && isOpen
             ? 'translateX(0)'
             : (isMobile ? 'translateX(100%)' : 'translateX(105%)'),
           opacity: (inspectedUser || activeChatUser) && isOpen ? 1 : 0,
           overflowY: 'auto',
           pointerEvents: (inspectedUser || activeChatUser) ? 'auto' : 'none',
        }}>
        {/* MOBILE OPTIMIZATION END */}
           
           {/* 1. DOSSIER ANSICHT */}
           {inspectedUser && (
             <>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                   <div className="game-title-small" style={{ color: 'var(--ep)' }}>DOSSIER: {inspectedUser.username}</div>
                   <div className="mono" style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '2px' }}>GTI-SORTED INVENTORY</div>
                 </div>
                 <button onClick={() => setInspectedUser(null)} style={{ background: 'transparent', border: '1px solid #333', color: '#666', padding: '5px 10px', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='#666'}>✕</button>
               </div>
               
               {/* Avatar */}
               {inspectedUser.avatar_card ? (
                  <div style={{ height: '280px', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center' }}>
                      <Card card={inspectedUser.avatar_card} context="lexicon" />
                    </div>
                  </div>
               ) : (
                 <div style={{ height: '280px', border: '1px dashed #222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: '0.7rem' }}>KEIN AVATAR</div>
               )}

               {/* Sorted Inventory (GTI Descending) */}
               <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--ep)', letterSpacing: '2px', borderBottom: '1px solid #333', paddingBottom: '5px' }}>▸ KERN-INVENTAR</div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                 {(inspectedUser.inventory || []).sort((a,b) => (b.gti||0) - (a.gti||0)).map((card, i) => (
                    <div key={i} style={{ position: 'relative', overflow: 'hidden', border: '1px solid #222', background: '#050508', aspectRatio: '5/7' }}>
                      <div className="mono" style={{ position: 'absolute', top: 2, right: 4, zIndex: 10, fontSize: '0.6rem', color: '#fff', textShadow: '0 0 5px #000' }}>LVL {card.level || 1}</div>
                      <div style={{ transform: 'scale(0.33)', transformOrigin: 'top left', pointerEvents: 'none', width: '360px', height: '504px' }}>
                        <Card card={card} context="inventory" />
                      </div>
                    </div>
                 ))}
               </div>
             </>
           )}

           {/* 2. GLOBAL COMMS (CHAT TERMINAL) */}
           {activeChatUser && (
             <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <div>
                   <div className="game-title-small" style={{ color: 'var(--win)' }}>COMMS: {activeChatUser.username}</div>
                   <div className="mono" style={{ fontSize: '0.6rem', color: '#00ff44', letterSpacing: '2px', animation: 'pulse 1.5s infinite' }}>● SECURE DIRECT CHANNEL</div>
                 </div>
                 <button onClick={() => setActiveChatUser(null)} style={{ background: 'transparent', border: '1px solid #333', color: '#666', padding: '5px 10px', cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='#666'}>✕</button>
               </div>
               
               <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '10px' }}>
                 {dmHistory.length === 0 ? (
                   <div className="mono" style={{ color: '#555', fontSize: '0.7rem', textAlign: 'center', marginTop: '40px' }}>ENCRYPTED HANDSHAKE COMPLETE.<br/>START TRANSMISSION.</div>
                 ) : (
                   dmHistory.map((msg) => {
                     const isMe = msg.sender_id === myId;
                     return (
                       <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                         <div className="mono" style={{ fontSize: '0.55rem', color: isMe ? 'var(--win)' : '#888', marginBottom: '2px' }}>
                           {isMe ? session?.user?.user_metadata?.username : activeChatUser.username}
                         </div>
                         <div className="mono" style={{ background: isMe ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isMe ? 'rgba(0,229,255,0.3)' : '#333'}`, padding: '8px 12px', fontSize: '0.75rem', color: '#fff', maxWidth: '85%', wordBreak: 'break-word', borderRadius: isMe ? '4px 0 4px 4px' : '0 4px 4px 4px' }}>
                           {msg.text}
                         </div>
                       </div>
                     );
                   })
                 )}
                 <div ref={dmEndRef} />
               </div>
               
               <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #333', paddingTop: '15px', marginTop: '10px' }}>
                 <input 
                    type="text" 
                    value={dmInput} 
                    onChange={e => setDmInput(e.target.value)} 
                    onKeyDown={e => { if(e.key === 'Enter') sendDM(); }} 
                    placeholder="// text_eingeben..." 
                    style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid #444', color: '#fff', padding: '10px', fontFamily: "'Roboto Mono', monospace", fontSize: '0.75rem', outline: 'none' }} 
                 />
                 <button 
                    onClick={sendDM} 
                    style={{ background: 'var(--win)', border: 'none', color: '#000', padding: '0 15px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Roboto Mono', monospace" }}
                 >
                    SEND
                 </button>
               </div>
             </div>
           )}
        </div>
        {/* ── ENDE SIDE-OUT PANEL ── */}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
           <div className="game-title-small" style={{ color: conn ? 'var(--win)' : 'var(--ep)', fontSize: '1.4rem', letterSpacing: '5px', textShadow: `0 0 10px ${conn ? 'rgba(0,229,255,0.5)' : 'rgba(255,215,0,0.5)'}`, transition: 'color 0.5s, text-shadow 0.5s' }}>
             GHOST NETWORK
           </div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

        {/* LOBBY STATUS HEADER (Nur sichtbar bei aktiver Verbindung) */}
        {conn && (
          <div style={{ background: 'rgba(0, 229, 255, 0.1)', borderBottom: '1px solid var(--win)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--win)', animation: 'pulse 1.5s infinite' }} />
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--win)', letterSpacing: '2px' }}>NEURAL LINK: ACTIVE</div>
            </div>
            <button onClick={() => { onDisconnect(); setActiveTab('friends'); }} style={{ background: 'rgba(255,0,50,0.1)', border: '1px solid var(--lose)', color: 'var(--lose)', padding: '4px 10px', fontSize: '0.65rem', fontFamily: "'Roboto Mono', monospace", cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255,0,50,0.2)'} onMouseLeave={e => e.target.style.background = 'rgba(255,0,50,0.1)'}>
              TERMINATE LINK ✕
            </button>
          </div>
        )}

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { playSound('click'); setActiveTab(tab.key); }}
                style={{
                  flex: 1, padding: '16px 4px',
                  background: isActive ? `rgba(${tab.key === 'friends' ? '255,215,0' : tab.key === 'signals' ? '0,255,136' : tab.key === 'records' ? '255,0,127' : '0,229,255'},0.06)` : 'transparent',
                  border: 'none', borderBottom: isActive ? `2px solid ${tab.accent}` : '2px solid transparent',
                  color: isActive ? tab.accent : '#3a3a4a',
                  fontFamily: "'Roboto Mono', monospace", fontSize: '0.65rem', letterSpacing: '2px',
                  cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                }}
              >
                {tab.label}
                {tab.count !== null && (
                  <span style={{ marginLeft: '4px', fontSize: '0.55rem', color: isActive ? tab.accent : '#2a2a3a', background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: '2px' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* ── TAB: UPLINK (CHAT) ── */}
          {activeTab === 'link' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
               <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid rgba(0,229,255,0.2)' }}>
                 <span style={{ fontSize: '0.75rem', color: 'var(--win)', letterSpacing: '2px' }}>▸ ENCRYPTED COMMS</span>
                 <span style={{ fontSize: '0.6rem', color: '#00ff44', animation: 'pulse 1.5s infinite' }}>● LIVE</span>
               </div>
               
               <div style={{ flex: 1, overflowY: 'auto', padding: '15px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {chatMessages.length === 0 ? (
                   <div className="mono" style={{ color: '#555', fontSize: '0.7rem', textAlign: 'center', marginTop: '20px' }}>SECURE CHANNEL ESTABLISHED...</div>
                 ) : (
                   chatMessages.map((msg, i) => {
                     const isMe = msg.sender === session?.user?.user_metadata?.username;
                     return (
                       <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                         <div className="mono" style={{ fontSize: '0.55rem', color: isMe ? 'var(--win)' : '#888', marginBottom: '2px' }}>{msg.sender.toUpperCase()}</div>
                         <div className="mono" style={{ background: isMe ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isMe ? 'rgba(0,229,255,0.3)' : '#333'}`, padding: '8px 12px', fontSize: '0.75rem', color: '#fff', maxWidth: '85%', wordBreak: 'break-word', borderRadius: isMe ? '4px 0 4px 4px' : '0 4px 4px 4px' }}>
                           {msg.text}
                         </div>
                       </div>
                     );
                   })
                 )}
                 <div ref={chatEndRef} />
               </div>
               
               <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                 <input 
                    type="text" 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)} 
                    onKeyDown={e => { if(e.key === 'Enter' && chatInput.trim()) { playSound('click'); onSendMessage(chatInput.trim()); setChatInput(''); } }} 
                    placeholder="// text_eingeben..." 
                    style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid #444', color: '#fff', padding: '10px', fontFamily: "'Roboto Mono', monospace", fontSize: '0.75rem', outline: 'none' }} 
                 />
                 <button 
                    onClick={() => { if(chatInput.trim()) { playSound('click'); onSendMessage(chatInput.trim()); setChatInput(''); } }} 
                    style={{ background: 'var(--win)', border: 'none', color: '#000', padding: '0 15px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "'Roboto Mono', monospace" }}
                 >
                    SEND
                 </button>
               </div>
            </div>
          )}

          {/* ── TAB: SQUAD (FREUNDE) ── */}
          {activeTab === 'friends' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {friends.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '60px', opacity: 0.4 }}>
                  <div className="mono" style={{ color: '#333', fontSize: '0.7rem', letterSpacing: '3px' }}>KEINE AGENTEN IM SQUAD</div>
                </div>
              ) : (
                [...friends].sort((a, b) => {
                    const statusA = onlineUsers[a.id];
                    const statusB = onlineUsers[b.id];
                    if (statusA && !statusB) return -1;
                    if (!statusA && statusB) return 1;
                    return 0;
                }).map((f, idx) => {
                  const isHov = hoveredRow === `f-${f.relId}`;
                  const status = onlineUsers[f.id]; // 'menu', 'ingame' oder undefined
                  const statusColor = status === 'menu' ? '#00ff44' : (status === 'ingame' ? 'var(--apex-pink)' : '#444');
                  
                  return (
                    <React.Fragment key={f.relId}>
                      {idx > 0 && <CyberDivider />}
                      <div
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', background: isHov ? 'rgba(255,215,0,0.03)' : 'transparent', transition: '0.2s', position: 'relative' }}
                        onMouseEnter={() => setHoveredRow(`f-${f.relId}`)} onMouseLeave={() => setHoveredRow(null)}
                      >
                        {isHov && <div style={{ position: 'absolute', left: -20, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, transparent, var(--ep) 30%, var(--ep) 70%, transparent)', opacity: 0.6 }} />}
                        
                        {/* Klickbarer Avatar + Name öffnet Dossier */}
                        <div 
                          onClick={() => inspectProfile(f.id)}
                          title="Dossier öffnen"
                          style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                        >
                          <div style={{ position: 'relative' }}>
                             <CyberAvatar username={f.username} size={44} />
                             <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: statusColor, border: '2px solid #050508', boxShadow: status ? `0 0 8px ${statusColor}` : 'none' }} title={status === 'menu' ? 'Online' : (status === 'ingame' ? 'In einer Mission' : 'Offline')} />
                          </div>
                          <div>
                            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.15rem', color: isHov ? 'var(--ep)' : (status ? '#fff' : '#888'), fontWeight: 700, letterSpacing: '1px', transition: 'color 0.2s', textShadow: isHov ? '0 0 8px rgba(255,215,0,0.4)' : 'none' }}>{f.username}</div>
                            <div className="mono" style={{ fontSize: '0.55rem', color: '#555', letterSpacing: '2px', marginTop: '2px' }}>{f.avatar_card?.name || '— NO AVATAR —'}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', flexShrink: 0, alignItems: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); openComms(f); }}
                            title="Direct Comms"
                            style={{ background: 'transparent', border: 'none', color: isHov ? '#00ff88' : '#444', fontFamily: "'Roboto Mono', monospace", fontSize: '0.6rem', letterSpacing: '1px', cursor: 'pointer', transition: '0.2s', textDecoration: isHov ? 'underline' : 'none', textUnderlineOffset: '4px' }}
                            onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color=isHov ? '#00ff88' : '#444'}
                          >
                            COMMS
                          </button>
                          
                          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); onInvite(f.id, 'lobby'); }}
                            title="Lobby Einladung"
                            style={{ background: 'rgba(0,229,255,0.05)', border: `1px solid ${isHov ? 'rgba(0,229,255,0.6)' : 'rgba(0,229,255,0.15)'}`, color: 'var(--win)', fontFamily: "'Roboto Mono', monospace", fontSize: '0.58rem', padding: '6px 15px', cursor: 'pointer', transition: '0.2s', boxShadow: isHov ? '0 0 10px rgba(0,229,255,0.15)' : 'none', borderRadius: '4px', fontWeight: 'bold' }}
                            onMouseEnter={e=>{e.target.style.background='rgba(0,229,255,0.15)'; e.target.style.boxShadow='0 0 12px rgba(0,229,255,0.3)'}} onMouseLeave={e=>{e.target.style.background='rgba(0,229,255,0.05)'; e.target.style.boxShadow=isHov?'0 0 10px rgba(0,229,255,0.15)':'none'}}
                          >
                            📡 INVITE
                          </button>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          )}

          {/* ── TAB: SIGNALS (SUCHE & ANFRAGEN) ── */}
          {activeTab === 'signals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              
              {/* SUCHE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                 <div className="mono" style={{ fontSize: '0.7rem', color: '#00ff88', letterSpacing: '2px', borderBottom: '1px solid rgba(0,255,136,0.2)', paddingBottom: '5px' }}>▸ SCAN NETWORK</div>
                 <div style={{ display: 'flex', border: '1px solid rgba(0,255,136,0.3)' }}>
                   <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchAgent()} placeholder="// agent_name..." className="mono" style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.8)', border: 'none', color: '#fff', fontSize: '0.75rem', outline: 'none' }} />
                   <button onClick={searchAgent} style={{ background: 'rgba(0,255,136,0.1)', border: 'none', borderLeft: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', fontFamily: "'Roboto Mono', monospace", fontSize: '0.65rem', padding: '0 15px', cursor: 'pointer', fontWeight: 'bold' }}>SCAN</button>
                 </div>
                 {searchMsg && <div className="mono" style={{ color: searchMsg.includes('GEFUNDEN') ? 'var(--win)' : 'var(--ep)', fontSize: '0.65rem' }}>{searchMsg}</div>}
                 
                 {searchResult && (
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <CyberAvatar username={searchResult.username} size={36} />
                       <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem', color: '#fff', fontWeight: 700 }}>{searchResult.username}</div>
                     </div>
                     <button onClick={() => sendRequest(searchResult.id)} style={{ background: 'transparent', border: '1px solid #00ff88', color: '#00ff88', padding: '5px 10px', cursor: 'pointer', fontSize: '0.6rem', fontFamily: "'Roboto Mono', monospace" }}>+ ADD</button>
                   </div>
                 )}
              </div>

              {/* ANFRAGEN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 <div className="mono" style={{ fontSize: '0.7rem', color: '#00ff88', letterSpacing: '2px', borderBottom: '1px solid rgba(0,255,136,0.2)', paddingBottom: '5px' }}>▸ INCOMING REQUESTS</div>
                 {requests.length === 0 ? (
                    <div className="mono" style={{ color: '#444', fontSize: '0.65rem', marginTop: '10px' }}>KEINE OFFENEN ANFRAGEN</div>
                 ) : (
                    requests.map(r => (
                      <div key={r.relId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <CyberAvatar username={r.username} size={36} />
                           <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1rem', color: '#fff', fontWeight: 700 }}>{r.username}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => acceptRequest(r.relId)} style={{ background: 'transparent', border: '1px solid #00ff88', color: '#00ff88', padding: '5px 10px', cursor: 'pointer', fontSize: '0.6rem', fontFamily: "'Roboto Mono', monospace" }}>✓</button>
                          <button onClick={() => declineRequest(r.relId)} style={{ background: 'transparent', border: '1px solid var(--lose)', color: 'var(--lose)', padding: '5px 10px', cursor: 'pointer', fontSize: '0.6rem', fontFamily: "'Roboto Mono', monospace" }}>✕</button>
                        </div>
                      </div>
                    ))
                 )}
              </div>

            </div>
          )}

          {/* ── TAB: RECORDS (PROFIL & HISTORY) ── */}
          {activeTab === 'records' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', background: 'rgba(255,0,127,0.05)', border: '1px solid rgba(255,0,127,0.2)', borderRadius: '8px' }}>
                   <CyberAvatar username={session?.user?.user_metadata?.username || 'AGENT'} size={50} />
                   <div>
                      <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '1.4rem', color: 'var(--apex-pink)', fontWeight: 700, letterSpacing: '2px' }}>{session?.user?.user_metadata?.username || 'AGENT'}</div>
                      <div className="mono" style={{ fontSize: '0.6rem', color: '#888' }}>ID: {session?.user?.id.split('-')[0]}</div>
                   </div>
                </div>

                <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--apex-pink)', letterSpacing: '2px', borderBottom: '1px solid rgba(255,0,127,0.2)', paddingBottom: '5px' }}>▸ MATCH HISTORY</div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                   {!metaStats?.match_history || metaStats.match_history.length === 0 ? (
                      <div className="mono" style={{ color: '#555', fontSize: '0.7rem', textAlign: 'center', padding: '20px' }}>KEINE DATEN VERFÜGBAR</div>
                   ) : (
                      metaStats.match_history.map(match => (
                         <div key={match.id} className={`gn-match-history-item ${match.result.toLowerCase()}`} style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '10px', background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                               <div className="mono" style={{ fontSize: '0.6rem', color: '#888' }}>{new Date(match.date).toLocaleString()}</div>
                               <div className="mono" style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 'bold' }}>{match.mode}</div>
                               <div className="mono" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>vs {match.opponent}</div>
                            </div>
                            <div className="mono" style={{ fontSize: '1rem', fontWeight: 900, color: match.result === 'WIN' ? 'var(--win)' : (match.result === 'LOSS' ? 'var(--lose)' : '#888') }}>
                               {match.result}
                            </div>
                         </div>
                      ))
                   )}
                </div>

                <button className="menu-btn btn-danger" style={{ marginTop: '10px', padding: '15px', fontSize: '0.9rem' }} onClick={onLogout}>
                   SYSTEM LOGOUT ⏻
                </button>
             </div>
          )}

        </div>

        <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(0,229,255,0.1) 30%, rgba(0,229,255,0.1) 70%, transparent)' }} />
      </div>
      </div>
    </>
  );
}