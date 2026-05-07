// src/logic/audio.js

let audioCtx = null;
const audioBuffers = {};
const activeNodes = {}; // Speichert laufende Sounds für Fade-Outs

const basePath = import.meta.env.BASE_URL || '/';

const filesToLoad = {
  packOpen: 'sounds/pack_open.wav',
  packThud: 'sounds/pack_thud.wav',
  thudLoss: 'sounds/thud_loss.wav',
  crisis: 'sounds/crisis.wav',
  matchIntro: 'sounds/match_intro.wav',
  patt: 'sounds/patt.wav',
  heavy_impact: 'sounds/heavy_impact.mp3' // Hier ist dein neuer Sound
};

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Asynchrones Laden aller Audio-Dateien in Web Audio API Buffers
    // Dadurch blockiert das Handy nicht mehr Spotify/YouTube!
    Object.entries(filesToLoad).forEach(async ([key, path]) => {
      try {
        const response = await fetch(basePath + path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioBuffers[key] = audioBuffer;
      } catch (e) {
        console.error(`Error loading audio ${key}:`, e);
      }
    });
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Hilfsfunktion zum Abspielen von Buffern
function playBuffer(key, volume = 1.0) {
  if (!audioCtx || !audioBuffers[key]) return null;
  
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffers[key];
  
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = volume;
  
  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  source.start(0);
  return { source, gainNode };
}

let lastClickTime = 0;

export function playSound(type) {
  try {
    initAudio();
    const t = audioCtx.currentTime;

    // --- WEB AUDIO API BUFFERS ---
    
    if (type === 'decrypt') {
      if (activeNodes.decrypt) activeNodes.decrypt.source.stop();
      activeNodes.decrypt = playBuffer('packOpen', 0.65);
      setTimeout(() => {
        if (activeNodes.decrypt) {
          activeNodes.decrypt.source.stop();
          activeNodes.decrypt = null;
        }
      }, 2000);
      return;
    }

    if (type === 'reveal') { playBuffer('packThud', 0.8); return; }
    if (type === 'lose' || type === 'roundLose') { playBuffer('thudLoss', 0.8); return; }
    if (type === 'matchIntro') { playBuffer('matchIntro', 0.8); return; }
    if (type === 'patt') { playBuffer('patt', 0.7); return; }
    
    // HIER IST DEIN HEAVY IMPACT FIX!
    if (type === 'heavy_impact') { playBuffer('heavy_impact', 1.0); return; }

    if (type === 'crisis') {
      if (activeNodes.crisis) activeNodes.crisis.source.stop();
      const node = playBuffer('crisis', 0.6);
      activeNodes.crisis = node;
      
      if (node) {
         // Sanfter Fade-Out über die Web Audio API
         node.gainNode.gain.setValueAtTime(0.6, t + 3.5);
         node.gainNode.gain.linearRampToValueAtTime(0.001, t + 4.5);
         setTimeout(() => {
            if (activeNodes.crisis === node) {
                node.source.stop();
                activeNodes.crisis = null;
            }
         }, 4600);
      }
      return;
    }

    // --- GENERIERTE UI-SOUNDS (Oscillators) ---
    
    if (type === 'click') {
      // ERHÖHTER DEBOUNCE: 150ms blockieren garantiert alle doppelten Sounds (Event-Bubbling)!
      if (t - lastClickTime < 0.15) return; 
      lastClickTime = t;
      
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