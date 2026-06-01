import React, { useState } from 'react';
import { supabase } from '../logic/supabase';
import CyberCursor from './CyberCursor';

// ── Kleiner ASCII-Dekor-Block ─────────────────────────────────────────────────
const ScanBar = () => (
  <div style={{
    width: '100%', height: '2px', margin: '6px 0',
    background: 'linear-gradient(90deg, transparent, var(--win), transparent)',
    animation: 'authScan 2.5s ease-in-out infinite',
  }}/>
);

export default function Auth({ onGuestLogin }) {
  const [tab, setTab]           = useState('login');   // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [message, setMessage]   = useState('');

  const reset = () => { setError(''); setMessage(''); };

  // ── Supabase Auth calls (Mit Dummy-Email Hack) ──────────────────────────────

  const handleLogin = async () => {
    if (!username.trim() || !password) { setError('AGENT-ID UND CODE EINGEBEN.'); return; }
    reset(); 
    setLoading(true);

    // Dummy-Mail generieren für den internen Supabase-Login
    const dummyEmail = `${username.trim().toLowerCase()}@aoc.local`;

    const { error: err } = await supabase.auth.signInWithPassword({ 
        email: dummyEmail, 
        password 
    });

    if (err) {
        setError('ZUGANG VERWEIGERT: Falsche ID oder Code.');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!username.trim() || !password) { setError('AGENT-ID UND CODE EINGEBEN.'); return; }
    if (password.length < 6) { setError('CODE: MIND. 6 ZEICHEN ERFORDERLICH.'); return; }
    
    // Validierung: Nur Buchstaben und Zahlen für die Agent-ID
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) { 
        setError('AGENT-ID: NUR BUCHSTABEN UND ZAHLEN ERLAUBT.'); 
        return; 
    }

    reset(); 
    setLoading(true);

    // Dummy-Mail generieren. Da Supabase E-Mails einzigartig hält, 
    // ist der Username dadurch automatisch auch einzigartig!
    const dummyEmail = `${username.trim().toLowerCase()}@aoc.local`;

    const { error: err } = await supabase.auth.signUp({
      email: dummyEmail,
      password,
      options: { 
          data: { username: username.trim().toUpperCase() } 
      }
    });

    if (err) {
        if (err.message.toLowerCase().includes('already registered') || err.message.toLowerCase().includes('already exists')) {
            setError('AGENT-ID BEREITS VERGEBEN. WÄHLE EINE ANDERE.');
        } else {
            setError(err.message);
        }
        setLoading(false);
    } else {
        // Direkt nach Registrierung einloggen — kein separater Schritt nötig
        setMessage('⟩ ZUGANG GENERIERT — INITIALISIERE SYSTEM...');
        const { error: loginErr } = await supabase.auth.signInWithPassword({
            email: dummyEmail,
            password,
        });
        if (loginErr) {
            setMessage('');
            setError('REGISTRIERT — BITTE NUN EINLOGGEN.');
        }
        setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') tab === 'login' ? handleLogin() : handleRegister();
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(0,0,0,0.6)',
    border: '1px solid rgba(0,229,255,0.2)',
    borderLeft: '3px solid var(--win)',
    color: '#fff', fontSize: '0.95rem',
    fontFamily: "'Roboto Mono', monospace",
    letterSpacing: '1px', outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
    textTransform: 'uppercase'
  };

  return (
    <>
      <style>{`
        @keyframes authScan { 0%,100% { opacity: 0.3; transform: scaleX(0.3); } 50% { opacity: 1; transform: scaleX(1); } }
        @keyframes authFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes authGlitch { 0%,94% { transform: translate(0); } 95% { transform: translate(-2px, 0); } 97% { transform: translate(2px, 0); } 100% { transform: translate(0); } }
        .auth-input:focus { border-color: var(--win) !important; box-shadow: 0 0 8px rgba(0,229,255,0.25); }
        .auth-tab-btn { flex: 1; padding: 10px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #555; font-family: 'Roboto Mono',monospace; font-size: 0.8rem; letter-spacing: 3px; cursor: pointer; transition: color 0.2s, border-color 0.2s; text-transform: uppercase; }
        .auth-tab-btn.active { color: var(--win); border-bottom-color: var(--win); }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, background: '#05050a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Roboto Mono', monospace", overflow: 'hidden' }}>
        <CyberCursor />
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(0,229,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.025) 1px, transparent 1px)', backgroundSize: '40px 40px' }}/>
        
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px', padding: '0 16px', animation: 'authFadeIn 0.5s ease-out both' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontFamily: "'Rajdhani', sans-serif", fontWeight: 900, letterSpacing: '6px', color: '#fff', textShadow: '0 0 30px var(--win), 0 0 60px rgba(0,229,255,0.3)', animation: 'authGlitch 6s infinite' }}>
              ARCHITECTS
            </div>
            <div style={{ fontSize: '0.65rem', letterSpacing: '6px', color: 'rgba(0,229,255,0.5)', marginTop: '4px' }}>
              OF CHAOS // SECURE NODE
            </div>
            <ScanBar />
          </div>

          <div style={{ background: 'rgba(5,5,12,0.95)', border: '1px solid rgba(0,229,255,0.15)', borderTop: '2px solid var(--win)', boxShadow: '0 0 40px rgba(0,229,255,0.06), inset 0 0 30px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', padding: '28px 24px 24px' }}>
            <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); reset(); }}>LOGIN</button>
              <button className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); reset(); }}>SYSTEMZUGANG ANFORDERN</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* EINZIGES FELD FÜR DEN NAMEN */}
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', marginBottom: '5px' }}>▸ AGENT-ID</div>
                <input className="auth-input" style={inputStyle} type="text" placeholder="ID EINGEBEN" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={handleKeyDown} maxLength={24} autoComplete="off" spellCheck="false" />
              </div>

              {/* FELD FÜR DAS PASSWORT */}
              <div>
                <div style={{ fontSize: '0.58rem', letterSpacing: '3px', color: 'rgba(255,255,255,0.3)', marginBottom: '5px' }}>▸ VERSCHLÜSSELUNGSCODE</div>
                <input className="auth-input" style={{...inputStyle, textTransform: 'none'}} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} />
              </div>

              {error && <div style={{ padding: '10px 12px', fontSize: '0.78rem', background: 'rgba(255,0,50,0.08)', border: '1px solid rgba(255,0,50,0.3)', borderLeft: '3px solid var(--lose)', color: '#ff6680' }}>⚠ {error}</div>}
              {message && <div style={{ padding: '10px 12px', fontSize: '0.78rem', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderLeft: '3px solid var(--win)', color: 'var(--win)' }}>{message}</div>}

              <button onClick={tab === 'login' ? handleLogin : handleRegister} disabled={loading} style={{ marginTop: '8px', padding: '13px', background: 'rgba(0,229,255,0.08)', border: '1px solid var(--win)', color: 'var(--win)', fontFamily: "'Roboto Mono', monospace", fontSize: '0.85rem', fontWeight: 700, letterSpacing: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? '⌛ AUTHENTIFIZIERE...' : (tab === 'login' ? '▸ ZUGANG GEWÄHREN' : '▸ ACCOUNT ERSTELLEN')}
              </button>
            </div>
          </div>

          <button onClick={onGuestLogin} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', fontFamily: "'Roboto Mono', monospace", fontSize: '0.75rem', letterSpacing: '3px', cursor: 'pointer', marginTop: '20px' }}>
            OFFLINE SPIELEN (KEIN ACCOUNT)
          </button>
        </div>
      </div>
    </>
  );
}