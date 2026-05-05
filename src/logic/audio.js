// src/logic/audio.js

let audioCtx = null;

// Timer-Variablen, um überlappende Sounds und unsaubere Fade-Outs zu stoppen
let decryptTimeout = null;
let alarmFadeInterval = null;

const basePath = import.meta.env.BASE_URL || '/';

const audioFiles = {
  packOpen: new Audio(basePath + 'sounds/pack_open.wav'),
  packThud: new Audio(basePath + 'sounds/pack_thud.wav'),
  thudLoss: new Audio(basePath + 'sounds/thud_loss.wav'),
  crisis: new Audio(basePath + 'sounds/crisis.wav'),
  matchIntro: new Audio(basePath + 'sounds/match_intro.wav'),
  patt: new Audio(basePath + 'sounds/patt.wav')
};

// Zero-Latency Preload
Object.values(audioFiles).forEach(audio => {
  audio.preload = 'auto';
  audio.load(); 
});

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function playSound(type) {
  try {
    initAudio();
    const t = audioCtx.currentTime;

    // --- ECHTE .WAV DATEIEN ABSPIELEN ---
    
    // Pack wird geöffnet (65% Volume + Anti-Overlap-Logik)
    if (type === 'decrypt') {
      if (decryptTimeout) clearTimeout(decryptTimeout); // Stoppt alte Timeouts
      
      audioFiles.packOpen.pause(); // Erzwingt Stille
      audioFiles.packOpen.currentTime = 0; // Setzt Spule auf 0
      audioFiles.packOpen.volume = 0.65; // Exakt 65% Lautstärke
      
      audioFiles.packOpen.play().catch(e => console.warn(e));
      
      decryptTimeout = setTimeout(() => { 
        audioFiles.packOpen.pause(); 
      }, 2000);
      return;
    }

    // Karte erscheint
    if (type === 'reveal') {
      audioFiles.packThud.pause();
      audioFiles.packThud.currentTime = 0;
      audioFiles.packThud.volume = 0.8;
      audioFiles.packThud.play().catch(e => console.warn(e));
      return;
    }
    
    // Spiel verloren oder Runde verloren
    if (type === 'lose' || type === 'roundLose') {
      audioFiles.thudLoss.pause();
      audioFiles.thudLoss.currentTime = 0;
      audioFiles.thudLoss.volume = 0.8;
      audioFiles.thudLoss.play().catch(e => console.warn(e));
      return;
    }

    // Krise bricht aus (Mit sauberem Fade-Out)
    if (type === 'crisis') {
      if (alarmFadeInterval) clearInterval(alarmFadeInterval); // Verhindert doppelte Fade-Outs
      
      const alarmAudio = audioFiles.crisis;
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
      alarmAudio.volume = 0.6; 
      alarmAudio.play().catch(e => console.warn(e));

      // Startet den Fade-Out nach 3.5 Sekunden
      setTimeout(() => {
        alarmFadeInterval = setInterval(() => {
          if (alarmAudio.volume > 0.05) {
            alarmAudio.volume -= 0.05;
          } else {
            clearInterval(alarmFadeInterval);
            alarmAudio.pause();
            alarmAudio.currentTime = 0;
          }
        }, 50); 
      }, 3500); 

      return;
    }

    // Match lädt
    if (type === 'matchIntro') {
      audioFiles.matchIntro.pause();
      audioFiles.matchIntro.currentTime = 0;
      audioFiles.matchIntro.volume = 0.8; 
      audioFiles.matchIntro.play().catch(e => console.warn(e));
      return;
    }

    // Schaden geblockt (Patt)
    if (type === 'patt') {
      audioFiles.patt.pause();
      audioFiles.patt.currentTime = 0;
      audioFiles.patt.volume = 0.7; 
      audioFiles.patt.play().catch(e => console.warn(e));
      return;
    }

    // --- GENERIERTE UI-SOUNDS (Für Klicks und kleine UI-Feedbacks) ---
    
    if (type === 'click') {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(300, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.05);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      o.start(t); o.stop(t + 0.05);
    } 
    else if (type === 'win') {
      [440, 554, 659].forEach((freq, i) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination); o.type = 'sine';
        o.frequency.setValueAtTime(freq, t + (i * 0.05));
        g.gain.setValueAtTime(0, t);
        g.gain.setValueAtTime(0.1, t + (i * 0.05));
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4 + (i * 0.05));
        o.start(t + (i * 0.05)); o.stop(t + 0.5 + (i * 0.05));
      });
    }
    else if (type === 'error') {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination); o.type = 'square';
      o.frequency.setValueAtTime(100, t);
      o.frequency.exponentialRampToValueAtTime(80, t + 0.15);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.start(t); o.stop(t + 0.15);
    }
  } catch (e) {
    console.error("Audio failed:", e);
  }
}