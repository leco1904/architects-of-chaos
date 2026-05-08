// src/components/GhostNetwork.jsx
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

// ── Generierter Cyber-Avatar (kein Emoji) ─────────────────────────────────
function CyberAvatar({ username = '', size = 44 }) {
  const seed = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const s = size;

  // Hexagon-Punkte
  const hex = [0, 1, 2, 3, 4, 5].map(i => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${s / 2 + (s / 2 - 5) * Math.cos(angle)},${s / 2 + (s / 2 - 5) * Math.sin(angle)}`;
  }).join(' ');

  // Deterministische Pixel-Punkte (4×4-Raster, gespiegelt)
  const pixels = Array.from({ length: 8 }, (_, i) => ({
    x: 4 + (i % 4) * Math.floor((s - 8) / 4),
    y: 4 + Math.floor(i / 4) * Math.floor((s - 8) / 4),
    on: ((seed ^ (seed >> (i + 1))) >> i) & 1,
  }));

  return (
    <div style={{
      width: s,
      height: s,
      background: 'rgba(0,0,0,0.9)',
      border: '1px solid rgba(0,229,255,0.5)',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
      boxShadow: '0 0 8px rgba(0,229,255,0.12) inset',
    }}>
      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.04) 2px, rgba(0,229,255,0.04) 4px)',
      }} />

      <svg
        width={s} height={s}
        viewBox={`0 0 ${s} ${s}`}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      >
        {/* Hintergrund-Hexagon (groß, transparent) */}
        <polygon points={hex} fill="rgba(0,229,255,0.05)" stroke="rgba(0,229,255,0.25)" strokeWidth="0.75" />

        {/* Pixel-Raster-Muster (deterministisch, gespiegelt) */}
        {pixels.map((p, i) => p.on ? (
          <rect key={i} x={p.x} y={p.y} width={2.5} height={2.5} fill="var(--ep)" opacity="0.2" />
        ) : null)}
        {pixels.map((p, i) => p.on ? (
          <rect key={`m${i}`} x={s - p.x - 2.5} y={p.y} width={2.5} height={2.5} fill="var(--ep)" opacity="0.2" />
        ) : null)}

        {/* Fadenkreuz */}
        <line x1={s / 2} y1={s * 0.22} x2={s / 2} y2={s * 0.78} stroke="var(--ep)" strokeWidth="0.6" opacity="0.55" />
        <line x1={s * 0.22} y1={s / 2} x2={s * 0.78} y2={s / 2} stroke="var(--ep)" strokeWidth="0.6" opacity="0.55" />

        {/* Mittelpunkt */}
        <circle cx={s / 2} cy={s / 2} r={s * 0.07} fill="none" stroke="var(--ep)" strokeWidth="0.8" opacity="0.9" />
        <circle cx={s / 2} cy={s / 2} r={s * 0.025} fill="var(--ep)" opacity="1" />
      </svg>
    </div>
  );
}

// ── Dekorative Trennlinie ─────────────────────────────────────────────────
const CyberDivider = ({ color = 'rgba(0,229,255,0.08)' }) => (
  <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${color} 20%, ${color} 80%, transparent)` }} />
);

// ── Status-Indikator (Seitenakzent) ──────────────────────────────────────
const StatusDot = ({ color = 'var(--ep)' }) => (
  <div style={{
    width: 4, height: '100%', minHeight: 52,
    background: `linear-gradient(to bottom, transparent, ${color} 30%, ${color} 70%, transparent)`,
    opacity: 0.6,
    flexShrink: 0,
  }} />
);

export default function GhostNetwork({ session, onBack, onInvite }) {
  // ── State (UNVERÄNDERT) ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends]     = useState([]);
  const [requests, setRequests]   = useState([]);

  const [searchName,   setSearchName]   = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchMsg,    setSearchMsg]    = useState('');

  const [inspectedUser, setInspectedUser] = useState(null);
  const [inviteSent,    setInviteSent]    = useState(null);

  // Hover-Tracking für Listenzeilen
  const [hoveredRow, setHoveredRow] = useState(null);

  const myId = session?.user?.id;

  useEffect(() => {
    if (myId) loadNetwork();
  }, [myId]);

  // ── Logik-Funktionen (UNVERÄNDERT) ────────────────────────────────────
  const loadNetwork = async () => {
    try {
      const { data: relData, error: relError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id_1.eq.${myId},user_id_2.eq.${myId}`);

      if (relError) throw relError;

      if (!relData || relData.length === 0) {
        setFriends([]);
        setRequests([]);
        return;
      }

      const userIds = new Set();
      relData.forEach(rel => {
        if (rel.user_id_1 !== myId) userIds.add(rel.user_id_1);
        if (rel.user_id_2 !== myId) userIds.add(rel.user_id_2);
      });

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
        const otherUser = profilesData.find(p => p.id === otherId) || { id: otherId, username: 'UNKNOWN AGENT' };

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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_card, inventory')
        .eq('id', userId)
        .single();
      if (error) throw error;
      setInspectedUser(data);
    } catch (e) { console.error(e); }
  };

  // ── PROFIL INSPEKTOR RENDER (Struktur UNVERÄNDERT, nur Styling verfeinert) ──
  if (inspectedUser) {
    return (
      <div className="screen active" style={{ display: 'block', padding: '30px', overflowY: 'auto' }}>
        {/* Top Bar */}
        <div className="top-bar" style={{ marginBottom: '30px', maxWidth: '1200px', margin: '0 auto 30px' }}>
          <div>
            <div className="game-title-small" style={{ color: 'var(--ep)' }}>
              DOSSIER: {inspectedUser.username}
            </div>
            <div className="mono" style={{ fontSize: '0.6rem', color: '#555', letterSpacing: '3px', marginTop: '2px' }}>
              GHOST NETWORK // INSPECT MODE // CLASSIFIED
            </div>
          </div>
          <button
            onClick={() => { playSound('click'); setInspectedUser(null); }}
            style={{
              background: 'transparent',
              border: '1px solid #333',
              color: '#666',
              fontFamily: "'Roboto Mono', monospace",
              fontSize: '0.65rem',
              letterSpacing: '2px',
              padding: '7px 18px',
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--ep)'; e.target.style.color = 'var(--ep)'; }}
            onMouseLeave={e => { e.target.style.borderColor = '#333'; e.target.style.color = '#666'; }}
          >
            ← ZURÜCK ZUR LISTE
          </button>
        </div>

        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', maxWidth: '1200px', margin: '0 auto' }}>
          {/* Linke Seite */}
          <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="mono" style={{ fontSize: '0.7rem', color: '#bc13fe', letterSpacing: '4px' }}>▸ GHOST AVATAR</div>

            {inspectedUser.avatar_card ? (
              <div style={{ pointerEvents: 'none', position: 'relative', width: '320px', height: '448px', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ transform: 'scale(0.88)', transformOrigin: 'top left' }}>
                  <Card card={inspectedUser.avatar_card} context="lexicon" />
                </div>
              </div>
            ) : (
              <div style={{ width: '320px', height: '448px', border: '1px dashed #222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontFamily: 'monospace', fontSize: '0.7rem', letterSpacing: '2px' }}>
                KEIN AVATAR GEWÄHLT
              </div>
            )}

            {/* Invite Buttons — Struktur UNVERÄNDERT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              <button
                className="dash-btn-hero"
                disabled={!!inviteSent}
                onClick={() => { onInvite(inspectedUser.id, 'pvp'); setInviteSent('pvp'); setTimeout(() => setInviteSent(null), 3000); }}
              >
                <span className="hero-bg" style={{ borderColor: inviteSent === 'pvp' ? '#00ff44' : 'var(--win)' }} />
                <span className="hero-text" style={{ color: inviteSent === 'pvp' ? '#00ff44' : 'var(--win)', fontSize: '0.9rem' }}>
                  {inviteSent === 'pvp' ? '✓ NEURAL LINK GESENDET' : '▶ [1V1] HERAUSFORDERN'}
                </span>
              </button>
              <button
                className="dash-btn-hero"
                disabled={!!inviteSent}
                onClick={() => { onInvite(inspectedUser.id, 'coop'); setInviteSent('coop'); setTimeout(() => setInviteSent(null), 3000); }}
              >
                <span className="hero-bg" style={{ borderColor: inviteSent === 'coop' ? '#00ff44' : 'var(--apex-pink)' }} />
                <span className="hero-text" style={{ color: inviteSent === 'coop' ? '#00ff44' : 'var(--apex-pink)', fontSize: '0.9rem' }}>
                  {inviteSent === 'coop' ? '✓ NEURAL LINK GESENDET' : '▶ [CO-OP] MISSION STARTEN'}
                </span>
              </button>
            </div>
          </div>

          {/* Rechte Seite: Inventar */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--ep)', letterSpacing: '4px', marginBottom: '20px' }}>
              ▸ INVENTAR KERN ({inspectedUser.inventory?.length || 0} KARTEN)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '15px' }}>
              {(inspectedUser.inventory || []).map((card, i) => (
                <div key={i} style={{ position: 'relative', overflow: 'hidden', borderRadius: '2px', border: '1px solid #1a1a2a', width: '100px', height: '140px', background: '#050508' }}>
                  <div className="mono" style={{ position: 'absolute', top: 2, right: 4, zIndex: 10, fontSize: '0.6rem', color: '#fff', textShadow: '0 0 5px #000' }}>
                    LVL {card.level || 1}
                  </div>
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

  // ── HAUPTANSICHT ─────────────────────────────────────────────────────────
  return (
    <div
      className="screen active"
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'Roboto Mono', monospace",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div
          className="game-title-small"
          style={{
            color: 'var(--ep)',
            fontSize: '2.2rem',
            letterSpacing: '10px',
            textShadow: '0 0 20px rgba(0,229,255,0.5), 0 0 60px rgba(0,229,255,0.15)',
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
          }}
        >
          GHOST NETWORK
        </div>
        <div
          className="mono"
          style={{ fontSize: '0.58rem', color: '#333', letterSpacing: '4px', marginTop: '6px' }}
        >
          ── CLASSIFIED AGENT DIRECTORY ──
        </div>
      </div>

      {/* Haupt-Panel */}
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '820px',
          padding: 0,
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(0,229,255,0.12)',
          boxShadow: '0 0 40px rgba(0,0,0,0.6), 0 0 80px rgba(0,229,255,0.04) inset',
        }}
      >
        {/* Eck-Dekorationen */}
        <Corners color="rgba(0,229,255,0.35)" size={14} offset={8} />

        {/* Horizontale Zier-Linie oben */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(0,229,255,0.2) 30%, rgba(0,229,255,0.2) 70%, transparent)',
          marginBottom: 0,
        }} />

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { key: 'friends',  label: `SQUAD LISTE`,  count: friends.length,  accent: 'var(--ep)' },
            { key: 'requests', label: `ANFRAGEN`,      count: requests.length, accent: 'var(--win)' },
            { key: 'add',      label: `AGENT SUCHEN`,  count: null,            accent: 'var(--apex-pink)' },
          ].map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { playSound('click'); setActiveTab(tab.key); }}
                style={{
                  flex: 1,
                  padding: '16px 8px',
                  background: isActive ? `rgba(${tab.key === 'friends' ? '0,229,255' : tab.key === 'requests' ? '0,255,136' : '255,0,127'},0.06)` : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${tab.accent}` : '2px solid transparent',
                  color: isActive ? tab.accent : '#3a3a4a',
                  fontFamily: "'Roboto Mono', monospace",
                  fontSize: '0.65rem',
                  letterSpacing: '2.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'uppercase',
                  position: 'relative',
                }}
              >
                {tab.label}
                {tab.count !== null && (
                  <span style={{
                    marginLeft: '6px',
                    fontSize: '0.55rem',
                    color: isActive ? tab.accent : '#2a2a3a',
                    background: isActive ? `rgba(${tab.key === 'friends' ? '0,229,255' : tab.key === 'requests' ? '0,255,136' : '255,0,127'},0.12)` : 'rgba(255,255,255,0.04)',
                    padding: '1px 5px',
                    borderRadius: '2px',
                    transition: 'all 0.2s',
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT */}
        <div style={{ padding: '28px 32px 36px', minHeight: '400px' }}>

          {/* ── TAB: FREUNDE ────────────────────────────────────────────── */}
          {activeTab === 'friends' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {friends.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '12px', marginTop: '60px', opacity: 0.4,
                }}>
                  {/* Leeres Netz SVG */}
                  <svg width="48" height="48" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="var(--ep)" strokeWidth="0.5" strokeDasharray="3 4" />
                    <circle cx="24" cy="24" r="4" fill="none" stroke="var(--ep)" strokeWidth="1" />
                    <line x1="24" y1="4"  x2="24" y2="44" stroke="var(--ep)" strokeWidth="0.3" opacity="0.4" />
                    <line x1="4"  y1="24" x2="44" y2="24" stroke="var(--ep)" strokeWidth="0.3" opacity="0.4" />
                  </svg>
                  <div className="mono" style={{ color: '#333', fontSize: '0.7rem', letterSpacing: '3px' }}>
                    KEINE AGENTEN IM SQUAD
                  </div>
                </div>
              ) : (
                friends.map((f, idx) => {
                  const isHov = hoveredRow === `f-${f.relId}`;
                  return (
                    <React.Fragment key={f.relId}>
                      {idx > 0 && <CyberDivider />}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 0',
                          background: isHov ? 'rgba(0,229,255,0.03)' : 'transparent',
                          transition: 'background 0.2s',
                          cursor: 'default',
                          position: 'relative',
                        }}
                        onMouseEnter={() => setHoveredRow(`f-${f.relId}`)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {/* Seitenakzent bei Hover */}
                        {isHov && (
                          <div style={{
                            position: 'absolute', left: -32, top: 0, bottom: 0,
                            width: 2,
                            background: 'linear-gradient(to bottom, transparent, var(--ep) 30%, var(--ep) 70%, transparent)',
                            opacity: 0.6,
                          }} />
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <CyberAvatar username={f.username} size={44} />
                          <div>
                            <div style={{
                              fontFamily: "'Rajdhani', sans-serif",
                              fontSize: '1.15rem',
                              color: isHov ? 'var(--ep)' : '#ccc',
                              fontWeight: 700,
                              letterSpacing: '1px',
                              transition: 'color 0.2s',
                            }}>
                              {f.username}
                            </div>
                            <div className="mono" style={{ fontSize: '0.55rem', color: '#333', letterSpacing: '2px', marginTop: '2px' }}>
                              {f.avatar_card?.name || '— NO AVATAR —'}
                            </div>
                          </div>
                        </div>

                        {/* Dossier Button — klein & dezent */}
                        <button
                          onClick={() => inspectProfile(f.id)}
                          style={{
                            background: 'transparent',
                            border: `1px solid ${isHov ? 'rgba(0,229,255,0.45)' : 'rgba(0,229,255,0.15)'}`,
                            color: isHov ? 'var(--ep)' : '#444',
                            fontFamily: "'Roboto Mono', monospace",
                            fontSize: '0.58rem',
                            letterSpacing: '1.5px',
                            padding: '5px 12px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.2s',
                            boxShadow: isHov ? '0 0 8px rgba(0,229,255,0.08)' : 'none',
                          }}
                        >
                          ▸ DOSSIER
                        </button>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          )}

          {/* ── TAB: ANFRAGEN ───────────────────────────────────────────── */}
          {activeTab === 'requests' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {requests.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '12px', marginTop: '60px', opacity: 0.4,
                }}>
                  <svg width="48" height="48" viewBox="0 0 48 48">
                    <rect x="8" y="12" width="32" height="24" rx="2" fill="none" stroke="var(--win)" strokeWidth="0.75" strokeDasharray="3 3" />
                    <line x1="8" y1="20" x2="40" y2="20" stroke="var(--win)" strokeWidth="0.4" opacity="0.5" />
                    <line x1="24" y1="12" x2="24" y2="36" stroke="var(--win)" strokeWidth="0.3" opacity="0.3" />
                  </svg>
                  <div className="mono" style={{ color: '#333', fontSize: '0.7rem', letterSpacing: '3px' }}>
                    KEINE OFFENEN ANFRAGEN
                  </div>
                </div>
              ) : (
                requests.map((r, idx) => {
                  const isHov = hoveredRow === `r-${r.relId}`;
                  return (
                    <React.Fragment key={r.relId}>
                      {idx > 0 && <CyberDivider color="rgba(0,255,136,0.08)" />}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 0',
                          background: isHov ? 'rgba(0,255,136,0.03)' : 'transparent',
                          transition: 'background 0.2s',
                          position: 'relative',
                        }}
                        onMouseEnter={() => setHoveredRow(`r-${r.relId}`)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {/* Seitenakzent */}
                        {isHov && (
                          <div style={{
                            position: 'absolute', left: -32, top: 0, bottom: 0,
                            width: 2,
                            background: 'linear-gradient(to bottom, transparent, var(--win) 30%, var(--win) 70%, transparent)',
                            opacity: 0.6,
                          }} />
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {/* Avatar mit grünem Akzent für eingehende Anfragen */}
                          <div style={{ position: 'relative' }}>
                            <CyberAvatar username={r.username} size={44} />
                            {/* Eingehend-Indikator */}
                            <div style={{
                              position: 'absolute', top: -3, right: -3,
                              width: 8, height: 8,
                              background: 'var(--win)',
                              borderRadius: '50%',
                              boxShadow: '0 0 6px var(--win)',
                              animation: 'pulse 1.5s ease-in-out infinite',
                            }} />
                          </div>
                          <div>
                            <div style={{
                              fontFamily: "'Rajdhani', sans-serif",
                              fontSize: '1.15rem',
                              color: '#fff',
                              fontWeight: 700,
                              letterSpacing: '1px',
                            }}>
                              {r.username}
                            </div>
                            <div className="mono" style={{ fontSize: '0.55rem', color: 'var(--win)', letterSpacing: '2px', marginTop: '2px', opacity: 0.7 }}>
                              INCOMING REQUEST
                            </div>
                          </div>
                        </div>

                        {/* Accept / Decline Buttons */}
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <button
                            onClick={() => acceptRequest(r.relId)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(0,255,136,0.4)',
                              color: 'var(--win)',
                              fontFamily: "'Roboto Mono', monospace",
                              fontSize: '0.58rem',
                              letterSpacing: '1.5px',
                              padding: '5px 12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.target.style.background = 'rgba(0,255,136,0.08)'; }}
                            onMouseLeave={e => { e.target.style.background = 'transparent'; }}
                          >
                            ✓ LINK
                          </button>
                          <button
                            onClick={() => declineRequest(r.relId)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(255,59,92,0.3)',
                              color: 'var(--lose)',
                              fontFamily: "'Roboto Mono', monospace",
                              fontSize: '0.58rem',
                              letterSpacing: '1px',
                              padding: '5px 10px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.target.style.background = 'rgba(255,59,92,0.06)'; }}
                            onMouseLeave={e => { e.target.style.background = 'transparent'; }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          )}

          {/* ── TAB: AGENT SUCHEN ───────────────────────────────────────── */}
          {activeTab === 'add' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px', paddingTop: '10px' }}>
              {/* Beschreibung */}
              <div className="mono" style={{ color: '#333', fontSize: '0.62rem', textAlign: 'center', letterSpacing: '2.5px', lineHeight: 1.8 }}>
                EXAKTEN GHOST-NAMEN EINGEBEN<br />UM VERBINDUNG AUFZUBAUEN
              </div>

              {/* Suchfeld */}
              <div style={{ display: 'flex', gap: '0', width: '100%', maxWidth: '440px', border: '1px solid rgba(255,0,127,0.25)' }}>
                <input
                  type="text"
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchAgent()}
                  placeholder="// agent_username..."
                  className="mono"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.8)',
                    border: 'none',
                    color: '#ccc',
                    fontSize: '0.75rem',
                    outline: 'none',
                    letterSpacing: '1px',
                    fontFamily: "'Roboto Mono', monospace",
                  }}
                />
                <button
                  onClick={searchAgent}
                  style={{
                    background: 'rgba(255,0,127,0.08)',
                    border: 'none',
                    borderLeft: '1px solid rgba(255,0,127,0.25)',
                    color: 'var(--apex-pink)',
                    fontFamily: "'Roboto Mono', monospace",
                    fontSize: '0.62rem',
                    letterSpacing: '2px',
                    padding: '12px 18px',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => { e.target.style.background = 'rgba(255,0,127,0.14)'; }}
                  onMouseLeave={e => { e.target.style.background = 'rgba(255,0,127,0.08)'; }}
                >
                  SCAN ▸
                </button>
              </div>

              {/* Status Meldung */}
              {searchMsg && (
                <div className="mono" style={{
                  color: searchMsg.includes('GEFUNDEN') ? 'var(--win)' : searchMsg.includes('FEHLER') ? 'var(--lose)' : 'var(--ep)',
                  fontSize: '0.65rem',
                  letterSpacing: '2px',
                  animation: 'pulse 1s infinite',
                }}>
                  {searchMsg}
                </div>
              )}

              {/* Suchergebnis */}
              {searchResult && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'rgba(255,0,127,0.04)',
                  border: '1px solid rgba(255,0,127,0.2)',
                  width: '100%',
                  maxWidth: '440px',
                  position: 'relative',
                }}>
                  <Corners color="rgba(255,0,127,0.3)" size={8} offset={6} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CyberAvatar username={searchResult.username} size={40} />
                    <div style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontSize: '1.1rem',
                      color: '#fff',
                      fontWeight: 700,
                      letterSpacing: '1px',
                    }}>
                      {searchResult.username}
                    </div>
                  </div>

                  <button
                    onClick={() => sendRequest(searchResult.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,0,127,0.45)',
                      color: 'var(--apex-pink)',
                      fontFamily: "'Roboto Mono', monospace",
                      fontSize: '0.6rem',
                      letterSpacing: '1.5px',
                      padding: '6px 14px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => { e.target.style.background = 'rgba(255,0,127,0.08)'; }}
                    onMouseLeave={e => { e.target.style.background = 'transparent'; }}
                  >
                    + ADD
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Boden-Linie */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(0,229,255,0.1) 30%, rgba(0,229,255,0.1) 70%, transparent)',
        }} />

        {/* Panel Footer */}
        <div style={{
          padding: '8px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <div className="mono" style={{ fontSize: '0.5rem', color: '#222', letterSpacing: '2px' }}>
            GHOST NETWORK v2.4 // ENCRYPTED
          </div>
          <div className="mono" style={{ fontSize: '0.5rem', color: '#222', letterSpacing: '2px' }}>
            AGENTS: {friends.length} // PENDING: {requests.length}
          </div>
        </div>
      </div>

      {/* Zurück-Button — kompakt, zentriert */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: '1px solid #282828',
            color: '#444',
            fontFamily: "'Roboto Mono', monospace",
            fontSize: '0.62rem',
            letterSpacing: '2.5px',
            padding: '9px 28px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            width: 'auto',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#888'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#282828'; e.currentTarget.style.color = '#444'; }}
        >
          ← ZURÜCK ZUR ZENTRALE
        </button>
      </div>
    </div>
  );
}