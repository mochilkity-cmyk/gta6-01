// Synthesized WebAudio sound for Palmera City. No audio files: every
// effect is built from oscillators and filtered noise at play time.
let audioCtx = null;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let sirenTimer = 0;
let musicTimer = 0;
let musicStep = 0;
let muted = false;

export function initAudio() {
  if (audioCtx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  } catch (e) { audioCtx = null; }
}

export function resumeAudio() {
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() { return muted; }

function tone(freq, dur, type, vol, slideTo) {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type || 'square';
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol || 0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

let noiseSeed = 1234567;
function noiseBurst(dur, vol, filterFreq) {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const len = Math.floor(audioCtx.sampleRate * dur);
  const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  // Deterministic pseudo-noise (audio texture only, never game logic).
  for (let i = 0; i < len; i++) {
    noiseSeed = (Math.imul(noiseSeed, 1103515245) + 12345) >>> 0;
    data[i] = (noiseSeed / 2147483648 - 1) * (1 - i / len);
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq || 1200;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vol || 0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(t);
}

export function playSfx(name) {
  if (!audioCtx || muted) return;
  if (name === 'shoot') { noiseBurst(0.14, 0.3, 2500); tone(180, 0.1, 'square', 0.15, 60); }
  else if (name === 'punch') { noiseBurst(0.09, 0.25, 900); }
  else if (name === 'pickup') { tone(660, 0.09, 'sine', 0.14); tone(990, 0.14, 'sine', 0.14); }
  else if (name === 'cash') { tone(880, 0.08, 'sine', 0.14); setTimeout(() => tone(1320, 0.12, 'sine', 0.14), 80); }
  else if (name === 'explosion') { noiseBurst(0.7, 0.5, 500); tone(70, 0.6, 'sine', 0.3, 30); }
  else if (name === 'crash') { noiseBurst(0.25, 0.3, 700); }
  else if (name === 'horn') { tone(370, 0.25, 'sawtooth', 0.12); tone(466, 0.25, 'sawtooth', 0.1); }
  else if (name === 'mission') { tone(523, 0.12, 'sine', 0.16); setTimeout(() => tone(659, 0.12, 'sine', 0.16), 120); setTimeout(() => tone(784, 0.22, 'sine', 0.16), 240); }
  else if (name === 'busted') { tone(220, 0.5, 'sawtooth', 0.16, 110); }
  else if (name === 'enter') { tone(300, 0.08, 'square', 0.1, 500); }
  else if (name === 'click') { tone(700, 0.05, 'square', 0.08); }
}

export function setEngine(speed, driving) {
  if (!audioCtx) return;
  if (!driving) {
    if (engineGain) engineGain.gain.value = 0;
    return;
  }
  if (!engineOsc) {
    engineOsc = audioCtx.createOscillator();
    engineGain = audioCtx.createGain();
    engineOsc.type = 'sawtooth';
    engineGain.gain.value = 0.02;
    engineOsc.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
  }
  engineOsc.frequency.value = 55 + Math.abs(speed) * 0.55;
  engineGain.gain.value = muted ? 0 : 0.02 + Math.min(0.04, Math.abs(speed) * 0.00012);
}

export function setSiren(on) {
  if (!audioCtx) return;
  if (!on) {
    if (sirenGain) sirenGain.gain.value = 0;
    return;
  }
  if (!sirenOsc) {
    sirenOsc = audioCtx.createOscillator();
    sirenGain = audioCtx.createGain();
    sirenOsc.type = 'triangle';
    sirenGain.gain.value = 0.03;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(audioCtx.destination);
    sirenOsc.start();
  }
  sirenGain.gain.value = muted ? 0 : 0.03;
  sirenTimer += 1;
  sirenOsc.frequency.value = (sirenTimer % 40 < 20) ? 700 : 950;
}

// A light two-bar sunset groove that plays while driving or on foot.
// Stepped from the game's own clock, never from wall time.
export function updateMusic(dt, playing) {
  if (!audioCtx || muted || !playing) return;
  musicTimer += dt;
  if (musicTimer < 0.24) return;
  musicTimer = 0;
  const bass = [110, 0, 110, 0, 130.8, 0, 98, 0, 110, 0, 110, 0, 146.8, 0, 130.8, 0];
  const note = bass[musicStep % bass.length];
  musicStep++;
  if (note) tone(note, 0.22, 'triangle', 0.05);
}
