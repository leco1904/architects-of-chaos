import React, { useState, useEffect } from 'react';
import Card from './Card';
import { playSound } from '../logic/audio';
import cardsData from '../data/cards.json'; // NEU: Für Artwork-Lookup

// ── Components ──────────────────────────────────────────────────
function Corners({ color='var(--win)', size=8 }) {
  const b = { position:'absolute', width:size, height:size, borderColor:color, borderStyle:'solid', pointerEvents:'none' };
  return (<>
    <div style={{...b,top:-1,left:-1,borderWidth:'1px 0 0 1px'}}/><div style={{...b,top:-1,right:-1,borderWidth:'1px 1px 0 0'}}/>
    <div style={{...b,bottom:-1,left:-1,borderWidth:'0 0 1px 1px'}}/><div style={{...b,bottom:-1,right:-1,borderWidth:'0 1px 1px 0'}}/>
  </>);
}

function CyberConfetti() {
  const colors = ['#00e5ff', '#ff007f', '#bc13fe', '#ffd700'];
  return (
    <div style={{position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none'}}>
      {[...Array(30)].map((_, i) => (
        <div key={i} className="cyber-confetti" style={{
          left: `${Math.random()*100}%`, top: `-10px`,
          background: colors[Math.floor(Math.random()*colors.length)],
          animationDelay: `${Math.random()*0.5}s`,
          animationDuration: `${1 + Math.random()*1}s`
        }}/>
      ))}
    </div>
  );
}

function StepDot({ active, done, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%',
        background: done ? 'var(--win)' : active ? 'rgba(0,229,255,0.15)' : 'rgba(0,0,0,0.5)',
        border: `2px solid ${done ? 'var(--win)' : active ? 'var(--win)' : '#2a3a4a'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: done ? '#000' : active ? 'var(--win)' : '#3a4a5a',
        fontSize: '0.7rem', fontWeight: 700,
      }}>
        {done ? '✓' : active ? '▸' : '○'}
      </div>
      <div className="mono" style={{ fontSize: '0.5rem', letterSpacing: '1px', color: active ? 'var(--win)' : '#3a4a5a' }}>{label}</div>
    </div>
  );
}

// ── STAGE 1: LOOT SUMMARY ─────────────────────
function LootSummaryStage({ rewardData, roguelikeRun, onNext }) {
  const { node, sector } = roguelikeRun;
  const { hpUpdate, loot } = rewardData;
  const hpPct = Math.max(0, (hpUpdate.next / hpUpdate.max) * 100);

  useEffect(() => {
    setTimeout(() => playSound('upgrade'), 300);
    setTimeout(() => playSound('upgrade'), 600);
    const t = setTimeout(onNext, 5000);
    return () => clearTimeout(t);
  }, []);

  const pods = [
    { label: 'AVATAR HP', value: `${hpUpdate.next} / ${hpUpdate.max}`, icon: '❤️', color: hpPct > 25 ? 'var(--win)' : 'var(--lose)', delay: 0.1 },
    { label: 'SKILL POINTS (SP)', value: `+${loot.sp}`, icon: '⏫', color: '#bc13fe', delay: 0.2 },
    { label: 'CREDITS OBTAINED', value: `+${loot.credits} 💳`, icon: '💳', color: 'var(--ep)', delay: 0.3 },
  ];
  if (loot.pack) pods.push({
    label: 'PACK REWARD', value: loot.pack.name || 'DATA CACHE', icon: '📦', color: 'var(--apex-pink)', delay: 0.4
  });

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '24px', padding: '20px' }}>
      <CyberConfetti />

      {/* Title panel */}
      <div className="glass-panel animate-panel-in" style={{ borderColor: 'var(--win)', padding: '30px 40px', textAlign: 'center', width: '100%', maxWidth: '760px', position: 'relative' }}>
        <Corners color="var(--win)" size={10}/>
        <div className="mono" style={{ fontSize: '0.7rem', color: 'rgba(0,229,255,0.4)', letterSpacing: '5px', marginBottom: '8px' }}>▸ CONFLICT RESOLVED</div>
        <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '8px', margin: '0 0 8px', textShadow: '0 0 30px rgba(0,229,255,0.5)', textTransform: 'uppercase' }}>
          SEKTOR {sector} - NODE {node} CLEARED
        </h1>
        <div className="mono" style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>GHOST PROTOCOL STATUS: ONLINE</div>
      </div>

      {/* Reward pods */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${pods.length}, minmax(130px, 180px))`, gap: '14px', width: '100%', maxWidth: '800px', justifyContent: 'center' }}>
        {pods.map((pod, i) => (
          <div key={i} className="glass-panel animate-panel-in" style={{ borderColor: `${pod.color}55`, padding: '18px 14px', textAlign: 'center', animationDelay: `${pod.delay}s`, position: 'relative' }}>
            <Corners color={`${pod.color}66`} size={6}/>
            <div className="mono" style={{ fontSize: '0.48rem', color: `${pod.color}aa`, letterSpacing: '2px', marginBottom: '8px' }}>{pod.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem' }}>{pod.icon}</span>
              <span className="mono" style={{ fontWeight: 900, fontSize: '1.1rem', color: pod.color, letterSpacing: '1px' }}>{pod.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pack reward highlighted box if present */}
      {loot.pack && (
        <div className="glass-panel animate-panel-in" style={{ borderColor: 'var(--apex-pink)', borderLeft: '4px solid var(--apex-pink)', padding: '14px 24px', maxWidth: '500px', width: '100%', display: 'flex', alignItems: 'center', gap: '16px', animationDelay: '0.5s', background: 'rgba(255,0,127,0.06)' }}>
          <span style={{ fontSize: '2rem' }}>📦</span>
          <div>
            <div className="mono" style={{ fontSize: '0.55rem', color: 'var(--apex-pink)', letterSpacing: '3px', marginBottom: '3px' }}>PACK REWARD ERHALTEN</div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>{loot.pack.name || 'DATA CACHE'}</div>
            <div className="mono" style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Wird automatisch zu deinen Gratis-Packs hinzugefügt</div>
          </div>
        </div>
      )}

      <button className="menu-btn animate-panel-in" style={{ borderColor: 'var(--win)', color: 'var(--win)', maxWidth: '420px', animationDelay: '0.6s' }} onClick={onNext}>
        NEXT: DEPLOY NEW ASSET ▸
      </button>
    </div>
  );
}
// ── STAGE 2: CARD DRAFT ──────────────────────────
function CardDraftStage({ rewardData, roguelikeRun, onApplyDraft, onSkip: realOnSkip, isCoop = false, conn, squadSize = 2, broadcast }) {
  const [step, setStep] = useState(1); 
  
  const [phase1Readies, setPhase1Readies] = useState(0); 
  const [phase2Readies, setPhase2Readies] = useState(0); 
  const [sharedPool, setSharedPool] = useState([]); 
  const [collectedLeftovers, setCollectedLeftovers] = useState([]); 
  
  const deck = roguelikeRun?.runDeck || { chars: [], effs: [] };
  const draftCards = rewardData?.draft || [];
  const allPool = [...(cardsData.characters || []), ...(cardsData.effects || []), ...(cardsData.actions || []), ...(cardsData.items || [])];
  
  const getFullCardData = (c) => {
    if (!c) return null;
    const base = allPool.find(p => p.name === c.name);
    return base ? { ...base, ...c, level: c.level || 1 } : c;
  };

  const [pendingSelfCard, setPendingSelfCard] = useState(null);
  const [levelUpCard, setLevelUpCard] = useState(null);
  const [levelUpPhase, setLevelUpPhase] = useState(0);
  
  const [replaceIdx, setReplaceIdx] = useState(null);
  const [replaceIn, setReplaceIn] = useState(null);

  const finishPhase1 = (pickedCard) => {
      // Jede abgelegte Karte bekommt eine einzigartige ID, damit niemand beim First-Come-First-Serve die falsche Karte sniped
      const rem = draftCards.filter(c => c?.name !== pickedCard?.name).map(c => ({ ...c, instId: Math.random().toString(36).substring(2,9) }));
      if (isCoop) {
          if (broadcast) {
              setCollectedLeftovers(prev => [...prev, ...rem]);
              setPhase1Readies(prev => prev + 1);
          } else if (conn) {
              conn.send({ type: 'DRAFT_PHASE_1_DONE', remaining: rem });
          }
          setStep(3); // Waiting screen
      } else {
          realOnSkip(); // Solo-Runs haben keinen Shared Pool und gehen direkt weiter
      }
  };

  const finishPhase2 = React.useCallback(() => {
      if (isCoop) {
          if (broadcast) {
              setPhase2Readies(prev => prev + 1);
          } else if (conn) {
              conn.send({ type: 'DRAFT_PHASE_2_DONE' });
          }
          setStep(6); // Syncing screen
      }
  }, [conn, isCoop, broadcast]);

  // Network Listener
  useEffect(() => {
    if (!conn || !isCoop) return;
    const handleData = (data) => {
      if (data.type === 'DRAFT_PHASE_1_DONE') {
          if (broadcast) { 
              setCollectedLeftovers(prev => [...prev, ...data.remaining]);
              setPhase1Readies(prev => prev + 1);
          }
      } else if (data.type === 'SHARED_POOL') {
          setSharedPool(data.pool);
          setStep(4); // Switch to Shared Draft
      } else if (data.type === 'CLAIM_CARD') {
          if (broadcast) { 
              setSharedPool(prev => {
                  const exists = prev.find(c => c.instId === data.card.instId);
                  if (exists) {
                      const newPool = prev.filter(c => c.instId !== data.card.instId);
                      broadcast({ type: 'CARD_CLAIMED', card: data.card, claimer: data.claimer });
                      broadcast({ type: 'SHARED_POOL', pool: newPool });
                      return newPool;
                  }
                  return prev;
              });
          }
      } else if (data.type === 'CARD_CLAIMED') {
          if (data.claimer === (conn.peer || 'host')) {
              const existing = [...deck.chars, ...deck.effs].find(c => c.name === data.card.name);
              if (existing) {
                  onApplyDraft(data.card, null, null, true, false);
                  finishPhase2();
              } else {
                  setPendingSelfCard(data.card);
                  setStep(5);
              }
          }
      } else if (data.type === 'DRAFT_PHASE_2_DONE') {
          if (broadcast) setPhase2Readies(prev => prev + 1);
      } else if (data.type === 'REWARD_PHASE_COMPLETE') {
          realOnSkip(); 
      }
    };
    conn.on('data', handleData);
    return () => conn.off('data', handleData);
  }, [conn, isCoop, broadcast, deck, onApplyDraft, finishPhase2, realOnSkip]);

  // FIX: Host Proceed to Phase 2 mit 45s Auto-Proceed Timeout
  useEffect(() => {
      if (!broadcast) return;

      const allReady = phase1Readies >= squadSize;
      const delay = allReady ? 100 : 45000; // 45 Sekunden Timeout für AFK-Spieler

      const timer = setTimeout(() => {
          const combined = [...collectedLeftovers].sort(() => Math.random() - 0.5);
          broadcast({ type: 'SHARED_POOL', pool: combined });
          setSharedPool(combined);
          setStep(4);
      }, delay);

      return () => clearTimeout(timer);
  }, [phase1Readies, broadcast, squadSize, collectedLeftovers]);

  // FIX: Host Finish Reward Phase mit 30s Auto-Proceed Timeout
  useEffect(() => {
      if (!broadcast) return;

      const allReady = phase2Readies >= squadSize;
      const delay = allReady ? 100 : 30000; // 30 Sekunden Timeout für Trödler

      const timer = setTimeout(() => {
          broadcast({ type: 'REWARD_PHASE_COMPLETE' });
          realOnSkip();
      }, delay);

      return () => clearTimeout(timer);
  }, [phase2Readies, broadcast, squadSize, realOnSkip]);

  const handleSelectSelfCard = (card) => {
    playSound('click');
    const existing = [...deck.chars, ...deck.effs].find(c => c.name === card.name);
    if (existing) {
      const fromLevel = existing.level || 1;
      const toLevel = fromLevel + 1;
      setLevelUpCard({ card: getFullCardData(card), fromLevel, toLevel });
      setLevelUpPhase(1);
      playSound('upgrade');
      setTimeout(() => { setLevelUpPhase(2); playSound('upgrade'); }, 600);
      setTimeout(() => {
        onApplyDraft(card, null, null, true, false);
        finishPhase1(card);
        setLevelUpPhase(3);
      }, 1800);
      setTimeout(() => {
        setLevelUpCard(null);
        setLevelUpPhase(0);
      }, 2800);
    } else {
      setPendingSelfCard(card);
      setStep(2);
    }
  };

  const handleSkipSelfDraft = () => {
    playSound('click');
    finishPhase1(null);
  };

  const confirmSelfReplace = () => {
    if (replaceIdx === null || replaceIn === null) return;
    playSound('upgrade');
    onApplyDraft(pendingSelfCard, replaceIdx, replaceIn, false, false);
    finishPhase1(pendingSelfCard);
  };

  const cancelSelfReplace = () => {
    setPendingSelfCard(null);
    setReplaceIdx(null);
    setReplaceIn(null);
    setStep(1);
  };

  const pickResidual = (card) => {
    playSound('click');
    if (broadcast) {
        const exists = sharedPool.find(c => c.instId === card.instId);
        if (exists) {
            const newPool = sharedPool.filter(c => c.instId !== card.instId);
            setSharedPool(newPool);
            broadcast({ type: 'SHARED_POOL', pool: newPool });
            
            const existing = [...deck.chars, ...deck.effs].find(c => c.name === card.name);
            if (existing) {
                onApplyDraft(card, null, null, true, false);
                finishPhase2();
            } else {
                setPendingSelfCard(card);
                setStep(5);
            }
        }
    } else {
        conn.send({ type: 'CLAIM_CARD', card, claimer: conn.peer });
    }
  };

  const skipResidual = () => {
    playSound('click');
    finishPhase2();
  };

  const confirmResidualReplace = () => {
      if (replaceIdx === null || replaceIn === null) return;
      playSound('upgrade');
      onApplyDraft(pendingSelfCard, replaceIdx, replaceIn, false, false);
      finishPhase2(); 
  };

  useEffect(() => { playSound('matchIntro'); }, []);

  // --- RENDER HELPERS ---
  const renderReplaceScreen = (title, subtitle, cardToPlace, onConfirm, onCancel, cancelText) => {
      const isPlacingEff = cardToPlace?.type === 'effect' || cardToPlace?.buff !== undefined;
      return (
        <div className="screen active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', overflowY: 'auto' }}>
          <style>{`
            .squad-draft-grid { display: grid; grid-template-columns: repeat(6, 180px); gap: 15px; }
            .tactics-draft-grid { display: flex; flex-wrap: wrap; gap: 15px; }
            @media (max-width: 1650px) { .squad-draft-grid { grid-template-columns: repeat(3, 180px); } }
          `}</style>
          <div style={{ width: '100%', maxWidth: '1800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="game-title-small" style={{ color: step === 5 ? 'var(--ep)' : 'var(--win)', fontSize: '3rem', marginBottom: '15px' }}>⬡ {title}</div>
            <div className="mono" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', marginBottom: '50px', letterSpacing: '2px' }}>{subtitle}</div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>
                {/* LINKE SPALTE (Neue Karte) */}
                <div style={{ width: '380px', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '360px', height: '504px', overflow: 'hidden', borderRadius: '16px', boxShadow: `0 0 50px ${step === 5 ? 'rgba(255,0,127,0.3)' : 'rgba(0,229,255,0.3)'}` }}>
                        <div style={{ transform: 'scale(1)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                            <Card card={cardToPlace} context="hand" />
                        </div>
                    </div>
                    <button onClick={onCancel} className="menu-btn" style={{ width: '100%', marginTop: '30px', padding: '18px', borderColor: 'var(--lose)', color: 'var(--lose)', fontSize: '1rem', fontWeight: 'bold' }}>
                        {cancelText}
                    </button>
                </div>

                {/* RECHTE SPALTE (Squad Grid) */}
                <div style={{ flex: 1, maxWidth: '1200px' }}>
                    <div className="mono" style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>DEIN AKTUELLER SQUAD (SLOT WÄHLEN)</div>
                    <div className="squad-draft-grid">
                        {deck.chars.map((c, i) => {
                            const isAvatar = i === 0;
                            const isDisabled = isAvatar || isPlacingEff;
                            const fullData = getFullCardData(c);
                            const isSelected = replaceIdx===i && replaceIn==='chars';
                            return (
                            <div key={i} onClick={isDisabled ? undefined : () => { 
                                setReplaceIdx(i); setReplaceIn('chars'); 
                            }} 
                                 style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', border: isSelected ? `4px solid ${step===5 ? 'var(--ep)' : 'var(--win)'}` : '2px solid #2a3a4a', borderRadius: '10px', background: isSelected ? (step===5 ? 'rgba(255,0,127,0.1)' : 'rgba(0,229,255,0.1)') : 'rgba(0,0,0,0.5)', position: 'relative', width: '180px', height: '252px', overflow: 'hidden', transition: 'all 0.2s', boxShadow: isSelected ? `0 0 30px ${step===5 ? 'rgba(255,0,127,0.5)' : 'rgba(0,229,255,0.5)'}` : 'none' }}
                                 onMouseEnter={isDisabled ? undefined : (e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                 onMouseLeave={isDisabled ? undefined : (e) => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none', filter: isDisabled ? 'grayscale(0.8) brightness(0.5)' : 'none' }}>
                                    <Card card={fullData} context="hand" />
                                </div>
                                {isDisabled && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10, background: 'rgba(0,0,0,0.4)' }}>
                                        <div className="mono" style={{ background: 'rgba(0,0,0,0.8)', padding: '6px 12px', border: '1px solid #555', borderRadius: '4px', color: isAvatar ? '#bc13fe' : '#888', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '2px', boxShadow: isAvatar ? '0 0 10px rgba(188,19,254,0.3)' : 'none' }}>
                                            {isAvatar ? 'AVATAR' : 'LOCKED'}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
                    <div className="mono" style={{ fontSize: '1.1rem', margin: '40px 0 20px', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>DEINE TAKTIKEN</div>
                    <div className="tactics-draft-grid">
                        {deck.effs.map((c, i) => {
                            const isDisabled = !isPlacingEff;
                            const fullData = getFullCardData(c);
                            const isSelected = replaceIdx===i && replaceIn==='effs';
                            return (
                            <div key={i} onClick={isDisabled ? undefined : () => { setReplaceIdx(i); setReplaceIn('effs'); }} 
                                 style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', border: isSelected ? `4px solid ${step===5 ? 'var(--ep)' : 'var(--eff-col)'}` : '2px solid #2a3a4a', borderRadius: '10px', background: isSelected ? (step===5 ? 'rgba(255,0,127,0.1)' : 'rgba(0,255,204,0.1)') : 'rgba(0,0,0,0.5)', position: 'relative', width: '180px', height: '252px', overflow: 'hidden', transition: 'all 0.2s', boxShadow: isSelected ? `0 0 30px ${step===5 ? 'rgba(255,0,127,0.5)' : 'rgba(0,255,204,0.5)'}` : 'none' }}
                                 onMouseEnter={isDisabled ? undefined : (e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                 onMouseLeave={isDisabled ? undefined : (e) => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none', filter: isDisabled ? 'grayscale(0.8) brightness(0.5)' : 'none' }}>
                                    <Card card={fullData} context="hand" />
                                </div>
                                {isDisabled && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10, background: 'rgba(0,0,0,0.4)' }}>
                                        <div className="mono" style={{ background: 'rgba(0,0,0,0.8)', padding: '6px 12px', border: '1px solid #555', borderRadius: '4px', color: '#888', fontWeight: 'bold', fontSize: '0.8rem', letterSpacing: '2px' }}>
                                            LOCKED
                                        </div>
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>

                    {(roguelikeRun?.bank?.length || 0) > 0 && (
                        <>
                            <div className="mono" style={{ fontSize: '1.1rem', margin: '40px 0 20px', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px' }}>DEIN ENCRYPTION VAULT</div>
                            <div className="tactics-draft-grid">
                                {roguelikeRun.bank.map((c, i) => {
                                    const fullData = getFullCardData(c);
                                    const isSelected = replaceIdx===i && replaceIn==='bank';
                                    return (
                                    <div key={i} onClick={() => { setReplaceIdx(i); setReplaceIn('bank'); }} 
                                         style={{ cursor: 'pointer', border: isSelected ? `4px solid ${step===5 ? 'var(--ep)' : '#bc13fe'}` : '2px solid #2a3a4a', borderRadius: '10px', background: isSelected ? 'rgba(188,19,254,0.1)' : 'rgba(0,0,0,0.5)', position: 'relative', width: '180px', height: '252px', overflow: 'hidden', transition: 'all 0.2s', boxShadow: isSelected ? `0 0 30px rgba(188,19,254,0.5)` : 'none' }}
                                         onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                         onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                                    >
                                        <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                                            <Card card={fullData} context="hand" />
                                        </div>
                                    </div>
                                )})}
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '20px', width: '100%', marginTop: '50px' }}>
                        <button disabled={replaceIdx === null} onClick={onConfirm} className="menu-btn" style={{ flex: 1, padding: '22px', fontSize: '1.3rem', fontWeight: 'bold', borderColor: replaceIdx !== null ? (step===5 ? 'var(--ep)' : 'var(--win)') : '#444', background: replaceIdx !== null ? (step===5 ? 'rgba(255,0,127,0.1)' : 'rgba(0,229,255,0.1)') : 'transparent', color: replaceIdx !== null ? (step===5 ? 'var(--ep)' : 'var(--win)') : '#444' }}>
                            {step===5 ? 'KARTE ÜBERNEHMEN' : 'SLOT BESTÄTIGEN'}
                        </button>
                        {(step === 2 || step === 5) && (() => {
                            const vaultSize = 2 + (roguelikeRun?.augments?.filter(a => a.type === 'vault_expander').length || 0);
                            const bankFull = (roguelikeRun?.bank?.length || 0) >= vaultSize;
                            return (
                                <button onClick={() => {
                                    playSound('win');
                                    onApplyDraft(cardToPlace, null, null, false, true);
                                    if (step === 2) {
                                        finishPhase1(cardToPlace);
                                    } else {
                                        finishPhase2();
                                    }
                                }} disabled={bankFull} className="menu-btn" style={{ flex: 1, padding: '22px', fontSize: '1.3rem', fontWeight: 'bold', borderColor: bankFull ? '#444' : '#bc13fe', background: bankFull ? 'transparent' : 'rgba(188,19,254,0.1)', color: bankFull ? '#444' : '#bc13fe' }}>
                                    🔒 IN DEN VAULT ({roguelikeRun?.bank?.length || 0}/{vaultSize})
                                </button>
                            );
                        })()}
                    </div>
                </div>
            </div>
          </div>
        </div>
      );
  };

  // --- PHASE RENDERERS ---

  // ── LEVEL-UP ANIMATION OVERLAY ──────────────────────────────────────────
  if (levelUpCard) {
    const { card, fromLevel, toLevel } = levelUpCard;
    const isIn     = levelUpPhase >= 1;
    const isClimax = levelUpPhase >= 2;
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(5,0,12,0.97)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: levelUpPhase === 3 ? 'levelUpFadeOut 0.8s ease-out forwards' : 'levelUpFadeIn 0.4s ease-out forwards',
      }}>
        <style>{`
          @keyframes levelUpFadeIn  { from { opacity:0 } to { opacity:1 } }
          @keyframes levelUpFadeOut { from { opacity:1 } to { opacity:0 } }
          @keyframes lvlRing { 0%{transform:scale(0.6);opacity:0.9} 100%{transform:scale(2.2);opacity:0} }
          @keyframes lvlShine { 0%{opacity:0;transform:scaleX(0)} 40%{opacity:1} 100%{opacity:0;transform:scaleX(1)} }
          @keyframes lvlNum { 0%{transform:translateY(30px);opacity:0} 100%{transform:translateY(0);opacity:1} }
          @keyframes lvlParticle { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0} }
        `}</style>

        {/* Radiale Partikel */}
        {isClimax && Array.from({length: 16}).map((_, i) => {
          const angle = (i / 16) * 360;
          const dist = 160 + Math.random() * 80;
          const tx = `${Math.cos(angle * Math.PI/180) * dist}px`;
          const ty = `${Math.sin(angle * Math.PI/180) * dist}px`;
          return (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: i % 3 === 0 ? '6px' : '3px', height: i % 3 === 0 ? '6px' : '3px',
              borderRadius: '50%', background: '#bc13fe',
              '--tx': tx, '--ty': ty,
              animation: 'lvlParticle 0.9s ease-out forwards',
              animationDelay: `${i * 0.03}s`,
            }}/>
          );
        })}

        {/* Expandierende Ringe */}
        {isClimax && [0, 0.15, 0.3].map((delay, i) => (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '340px', height: '340px',
            marginLeft: '-170px', marginTop: '-170px',
            border: `${3 - i}px solid #bc13fe`,
            borderRadius: '50%',
            animation: `lvlRing 0.8s ease-out forwards`,
            animationDelay: `${delay}s`,
            opacity: 0,
          }}/>
        ))}

        {/* Karte */}
        <div style={{
          position: 'relative', zIndex: 2,
          transform: isClimax ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
          boxShadow: isClimax ? '0 0 80px #bc13fe, 0 0 160px rgba(188,19,254,0.4)' : '0 0 30px rgba(188,19,254,0.2)',
          borderRadius: '12px',
        }}>
          <div style={{ width: '300px', height: '420px', overflow: 'hidden', borderRadius: '12px' }}>
            <div style={{ transform: 'scale(0.833)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
              <Card card={{ ...card, level: toLevel }} context="hand" />
            </div>
          </div>
        </div>

        {/* Level-Up Badge */}
        <div style={{
          marginTop: '36px', display: 'flex', alignItems: 'center', gap: '20px',
          opacity: isClimax ? 1 : 0,
          transition: 'opacity 0.3s 0.2s',
        }}>
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Shine sweep */}
            {isClimax && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)', animation: 'lvlShine 0.7s ease-out 0.1s forwards', opacity: 0 }}/>}
            <div className="mono" style={{
              padding: '14px 40px',
              background: 'linear-gradient(135deg, rgba(188,19,254,0.3), rgba(188,19,254,0.1))',
              border: '2px solid #bc13fe',
              fontSize: '1.4rem', fontWeight: 900, letterSpacing: '6px', color: '#fff',
              textShadow: '0 0 20px #bc13fe',
              clipPath: 'polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%)',
            }}>
              ⬡ LEVEL UP
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="mono" style={{ fontSize: '1.8rem', color: 'rgba(255,255,255,0.35)', animation: 'lvlNum 0.3s ease-out forwards' }}>L{fromLevel}</div>
            <div className="mono" style={{ fontSize: '1.2rem', color: '#bc13fe' }}>→</div>
            <div className="mono" style={{ fontSize: '2.2rem', fontWeight: 900, color: '#bc13fe', textShadow: '0 0 20px #bc13fe', animation: 'lvlNum 0.4s ease-out 0.15s both' }}>L{toLevel}</div>
          </div>
        </div>

        {/* Kartenname */}
        <div style={{
          marginTop: '16px',
          fontFamily: "'Rajdhani',sans-serif", fontSize: '1.1rem', fontWeight: 700,
          color: 'rgba(255,255,255,0.5)', letterSpacing: '3px',
          opacity: isClimax ? 1 : 0, transition: 'opacity 0.3s 0.3s',
        }}>
          {card.name.toUpperCase()}
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="screen active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
        <style>{`
          @keyframes shimmerBtn {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
        <div style={{ width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', textAlign: 'center', marginBottom: '30px' }}>
            <div>
              <div className="game-title-small" style={{ color: 'var(--win)', fontSize: '2.5rem', marginBottom: '5px' }}>⬡ RUN UPGRADE</div>
              <div className="mono" style={{ fontSize: '1rem', color: 'rgba(0,229,255,0.5)', letterSpacing: '3px' }}>DECK-DRAFT VERFÜGBAR</div>
            </div>
          </div>
          
          {isCoop && (
            <>
              <div className="game-title-small" style={{ color: 'var(--win)', fontSize: '1.8rem', marginBottom: '10px' }}>⬡ PHASE 1: INDIVIDUELLE AUSWAHL</div>
              <div className="mono" style={{ fontSize: '1rem', color: 'rgba(0,229,255,0.5)', letterSpacing: '3px', marginBottom: '50px' }}>WÄHLE EINE KARTE. DER REST GEHT IN DEN SQUAD-POOL.</div>
            </>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', flexWrap: 'wrap' }}>
            {draftCards.map((c, i) => {
              const existing = [...deck.chars, ...deck.effs].find(dk => dk.name === c.name);
              return (
              <div key={i} onClick={() => handleSelectSelfCard(c)} style={{ width: '342px', height: '478px', cursor: 'pointer', position: 'relative', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', borderRadius: '12px', boxShadow: '0 0 30px rgba(0,0,0,0.6)' }} onMouseEnter={(e)=>e.currentTarget.style.transform='translateY(-15px) scale(1.03)'} onMouseLeave={(e)=>e.currentTarget.style.transform='none'}>
                <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '12px', border: '3px solid transparent', transition: 'border 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.border='3px solid var(--win)'} onMouseLeave={(e)=>e.currentTarget.style.border='3px solid transparent'}>
                  <div style={{ transform: 'scale(0.95)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                    <Card card={c} context="hand" />
                  </div>
                </div>
                {existing && (
                  <div className="mono" style={{ position: 'absolute', top: -18, right: -18, background: '#bc13fe', color: '#000', padding: '8px 18px', fontSize: '0.9rem', fontWeight: 900, borderRadius: '6px', zIndex: 10, boxShadow: '0 0 20px #bc13fe', border: '1px solid #fff' }}>UPGRADE MÖGLICH</div>
                )}
              </div>
            )})}
          </div>

          <div style={{ marginTop: '70px', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <button 
              onClick={handleSkipSelfDraft} 
              style={{
                position: 'relative', overflow: 'hidden',
                width: '420px', padding: '22px 0',
                background: 'linear-gradient(90deg, rgba(0,229,255,0.18) 0%, rgba(0,229,255,0.08) 100%)',
                border: '2px solid var(--win)',
                color: '#fff',
                fontFamily: "'Roboto Mono', monospace",
                fontSize: '1.15rem', fontWeight: 900, letterSpacing: '8px',
                cursor: 'pointer',
                boxShadow: '0 0 40px rgba(0,229,255,0.25), 0 0 80px rgba(0,229,255,0.1), inset 0 0 20px rgba(0,229,255,0.08)',
                textShadow: '0 0 12px rgba(0,229,255,0.8)',
                transition: 'all 0.2s ease-out',
                clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.12) 50%, transparent 100%)',
                animation: 'shimmerBtn 2s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
              ÜBERSPRINGEN ›
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
      return renderReplaceScreen('EIGENE KARTE PLATZIEREN', `WÄHLE EINEN SLOT ZUM ERSETZEN FÜR: ${pendingSelfCard?.name}`, pendingSelfCard, confirmSelfReplace, cancelSelfReplace, 'DOCH NICHT BEHALTEN');
  }

  if (step === 3) {
    return (
      <div className="screen active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 30px' }}>
        <div style={{ width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <div className="game-title-small" style={{ color: 'var(--ep)', fontSize: '2.5rem', marginBottom: '5px', animation: 'pulse 2s infinite' }}>📡 NEURAL BRIDGE: LINKED</div>
            <div className="mono" style={{ fontSize: '1.2rem', color: 'rgba(188,19,254,0.6)', letterSpacing: '4px' }}>WARTE AUF SQUAD ({phase1Readies}/{squadSize})...</div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="screen active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '1400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <div className="game-title-small" style={{ color: '#bc13fe', fontSize: '2.5rem', marginBottom: '5px' }}>⬡ PHASE 2: SQUAD POOL</div>
            <div className="mono" style={{ fontSize: '1rem', color: 'rgba(188,19,254,0.5)', letterSpacing: '3px' }}>FIRST COME, FIRST SERVE! WÄHLE EINE KARTE ODER SKIP.</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', minHeight: '480px' }}>
            {sharedPool.length === 0 ? (
                <div className="mono" style={{ alignSelf: 'center', color: '#444', fontSize: '1.5rem', letterSpacing: '4px' }}>[ POOL IST LEER ]</div>
            ) : (
                sharedPool.map((c, i) => {
                  return (
                    <div key={c.instId} onClick={() => pickResidual(c)} 
                         style={{ width: '280px', height: '392px', cursor: 'pointer', position: 'relative', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', borderRadius: '12px', boxShadow: '0 0 30px rgba(0,0,0,0.6)' }} onMouseEnter={(e)=>e.currentTarget.style.transform='translateY(-10px) scale(1.03)'} onMouseLeave={(e)=>e.currentTarget.style.transform='none'}>
                      <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '12px', border: '2px solid transparent', transition: 'border 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.border='2px solid #bc13fe'} onMouseLeave={(e)=>e.currentTarget.style.border='2px solid transparent'}>
                        <div style={{ transform: 'scale(0.77)', transformOrigin: 'top left', width: '360px', height: '504px', pointerEvents: 'none' }}>
                          <Card card={c} context="hand" />
                        </div>
                      </div>
                      <div className="mono" style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', color: '#bc13fe', fontSize: '0.7rem', letterSpacing: '2px', opacity: 0.8 }}>KLICK ZUM ÜBERNEHMEN</div>
                    </div>
                  );
                })
            )}
          </div>

          <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'center', gap: '30px', width: '100%' }}>
            <button 
              onClick={skipResidual} 
              style={{
                width: '240px', padding: '18px 0',
                background: 'rgba(0,0,0,0.6)', border: '1px solid #444',
                color: '#888', fontFamily: "'Roboto Mono', monospace",
                fontSize: '0.9rem', fontWeight: 700, letterSpacing: '4px',
                cursor: 'pointer', transition: 'all 0.2s',
                clipPath: 'polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#888'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#888'; }}
            >
              ÜBERSPRINGEN
            </button>

            <button 
              onClick={() => { playSound('win'); skipResidual(); }} 
              style={{
                position: 'relative', overflow: 'hidden',
                width: '420px', padding: '20px 0',
                background: 'linear-gradient(90deg, rgba(255,215,0,0.18) 0%, rgba(255,215,0,0.08) 100%)',
                border: '2px solid var(--ep)',
                color: '#fff',
                fontFamily: "'Roboto Mono', monospace",
                fontSize: '1.1rem', fontWeight: 900, letterSpacing: '6px',
                cursor: 'pointer',
                boxShadow: '0 0 40px rgba(255,215,0,0.2), inset 0 0 20px rgba(255,215,0,0.08)',
                textShadow: '0 0 10px rgba(255,215,0,0.8)',
                transition: 'all 0.2s ease-out',
                clipPath: 'polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%)',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.15) 50%, transparent 100%)',
                animation: 'shimmerBtn 2.5s ease-in-out infinite',
                pointerEvents: 'none',
              }} />
              ♻ RECYCLE FÜR +50 💳
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 5) {
      return renderReplaceScreen('ASSET GEFUNDEN', `MÖCHTEST DU DIESES ASSET ÜBERNEHMEN?`, pendingSelfCard, confirmResidualReplace, skipResidual, 'VERWERFEN');
  }

  if (step === 6) {
    return (
      <div className="screen active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div className="game-title-small" style={{ color: 'var(--ep)', fontSize: '3rem', marginBottom: '15px', animation: 'pulse 2s infinite' }}>📡 SYNCING SQUAD...</div>
        <div className="mono" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', marginBottom: '50px', letterSpacing: '4px' }}>WARTE AUF PARTNER ({phase2Readies}/{squadSize})</div>
      </div>
    );
  }

  return null;
}

function AugmentStage({ augments, onSelect }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '30px', padding: '20px', textAlign: 'center' }}>
      <CyberConfetti />
      <div className="glass-panel animate-panel-in" style={{ borderColor: '#bc13fe', padding: '40px', maxWidth: '800px', width: '100%', background: 'rgba(5, 2, 14, 0.95)' }}>
        <Corners color="#bc13fe" size={12}/>
        <div className="mono" style={{ fontSize: '0.8rem', color: '#bc13fe', letterSpacing: '6px', marginBottom: '15px' }}>▸ SECTOR BOSS DEFEATED</div>
        <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '2.5rem', fontWeight: 900, color: '#fff', letterSpacing: '4px', margin: '0 0 20px 0', textShadow: '0 0 30px rgba(188,19,254,0.3)' }}>
          NEURAL AUGMENTATION
        </h1>
        <p className="mono" style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '40px' }}>
          Wähle ein permanentes System-Upgrade für deinen Ghost Agent.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {augments.map(aug => (
            <div key={aug.id} onClick={() => { playSound('upgrade'); onSelect(aug); }} style={{ padding: '25px 20px', background: 'rgba(188,19,254,0.08)', border: '1px solid rgba(188,19,254,0.3)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <div style={{ fontSize: '2rem' }}>{aug.type === 'ep_start' ? '⚡' : '🧠'}</div>
              <div className="mono" style={{ fontSize: '1rem', color: '#bc13fe', fontWeight: 'bold' }}>{aug.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{aug.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TranscendenceStage({ onEndless, onExit }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '30px', padding: '20px', textAlign: 'center' }}>
      <CyberConfetti />
      <div className="glass-panel animate-panel-in" style={{ borderColor: 'var(--ep)', padding: '40px', maxWidth: '600px', background: 'rgba(5, 2, 14, 0.95)' }}>
        <Corners color="var(--ep)" size={12}/>
        <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--ep)', letterSpacing: '6px', marginBottom: '15px' }}>▸ SYSTEM LIMIT REACHED</div>
        <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: '3rem', fontWeight: 900, color: '#fff', letterSpacing: '4px', margin: '0 0 20px 0', textShadow: '0 0 30px rgba(255,215,0,0.3)' }}>
          TRANSCENDENCE
        </h1>
        <p className="mono" style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '40px' }}>
          Du hast den Kern des Systems erreicht. Die Simulation wurde erfolgreich validiert.<br/><br/>
          Beende den Run jetzt für einen sicheren Exit oder übertakte deinen Avatar, um in den endlosen <b>OVERCLOCK MODE</b> vorzustoßen.
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="menu-btn" style={{ borderColor: 'var(--lose)', color: 'var(--lose)', padding: '15px 30px', flex: 1, minWidth: '240px' }} onClick={onExit}>
            SYSTEM SHUTDOWN (ENDE)
          </button>
          <button className="menu-btn btn-primary" style={{ padding: '15px 30px', flex: 1, minWidth: '240px' }} onClick={onEndless}>
            OVERCLOCK NODE (ENDLESS)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ──────────────────────────────────────────
export default function RoguelikeReward({ rewardData, roguelikeRun, onApplyDraft, onSkip, onFinishRun, isCoop = false, conn, squadSize = 2, broadcast }) {
  const [stage, setStage] = useState('summary'); 

  if (!rewardData || !roguelikeRun) return null;

  const handleDraftComplete = () => {
    if (rewardData.augments && rewardData.augments.length > 0) {
      setStage('augment');
    } else if (rewardData.isTranscendenceTrigger) {
      setStage('transcendence');
    } else {
      onSkip(); // Zurück zur Map
    }
  };

  const handleAugmentComplete = (chosenAugment) => {
    // FIX: chosenAugment ist jetzt das 6. Argument (isUpgrade=false, sendToBank=false)
    onApplyDraft(null, null, null, false, false, chosenAugment);
    if (rewardData.isTranscendenceTrigger) {
      setStage('transcendence');
    } else {
      onSkip();
    }
  };

  return (
    <div style={{position:'fixed', inset:0, background:'#05020e', zIndex:10000, overflowY:'auto'}}>
       {stage === 'summary' && rewardData.hpUpdate && (
          <LootSummaryStage 
             rewardData={rewardData} 
             roguelikeRun={roguelikeRun} 
             onNext={() => setStage('draft')} 
          />
       )}
       
       {stage === 'draft' && (
          <CardDraftStage 
             rewardData={rewardData} 
             roguelikeRun={roguelikeRun}
             onApplyDraft={onApplyDraft} 
             onSkip={handleDraftComplete}
             isCoop={isCoop}
             conn={conn}
             squadSize={squadSize}
             broadcast={broadcast}
          />
       )}

       {stage === 'augment' && rewardData.augments && (
          <AugmentStage 
             augments={rewardData.augments}
             onSelect={handleAugmentComplete}
          />
       )}

       {stage === 'transcendence' && (
          <TranscendenceStage 
             onEndless={() => onSkip()} 
             onExit={() => { playSound('click'); onFinishRun(); }} 
          />
       )}
    </div>
  );
}