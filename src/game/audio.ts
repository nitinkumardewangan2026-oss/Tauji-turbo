// Web Audio synth-based engine, horn, crash, and UI sounds. No asset files needed.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function ensureCtx(): AudioContext {
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ensureCtx();
}

export function setMasterVolume(v: number) {
  ensureCtx();
  if (masterGain) masterGain.gain.value = v;
}

// --- Engine loop -----------------------------------------------------------
let engineOsc: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
let engineFilter: BiquadFilterNode | null = null;
let engineRunning = false;

export function startEngine() {
  const c = ensureCtx();
  if (engineRunning) return;
  engineOsc = c.createOscillator();
  engineGain = c.createGain();
  engineFilter = c.createBiquadFilter();
  engineOsc.type = "sawtooth";
  engineOsc.frequency.value = 60;
  engineFilter.type = "lowpass";
  engineFilter.frequency.value = 600;
  engineGain.gain.value = 0.0;
  engineOsc.connect(engineFilter);
  engineFilter.connect(engineGain);
  engineGain.connect(masterGain!);
  engineOsc.start();
  engineRunning = true;
}

export function stopEngine() {
  if (engineOsc) {
    try { engineOsc.stop(); } catch {}
    engineOsc.disconnect();
    engineOsc = null;
  }
  if (engineGain) { engineGain.disconnect(); engineGain = null; }
  if (engineFilter) { engineFilter.disconnect(); engineFilter = null; }
  engineRunning = false;
}

// speedRatio: 0..1, boosting shifts pitch up
export function updateEngine(speedRatio: number, boosting: boolean) {
  if (!engineOsc || !engineGain || !engineFilter || !ctx) return;
  const base = 55 + speedRatio * 160 + (boosting ? 60 : 0);
  engineOsc.frequency.setTargetAtTime(base, ctx.currentTime, 0.05);
  engineFilter.frequency.setTargetAtTime(500 + speedRatio * 1800, ctx.currentTime, 0.05);
  engineGain.gain.setTargetAtTime(0.06 + speedRatio * 0.1, ctx.currentTime, 0.1);
}

export function setEngineMuted(muted: boolean) {
  if (engineGain && ctx) engineGain.gain.setTargetAtTime(muted ? 0 : 0.08, ctx.currentTime, 0.05);
}

// --- One-shot SFX ----------------------------------------------------------
function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const c = ensureCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.connect(g);
  g.connect(masterGain!);
  osc.start();
  osc.stop(c.currentTime + dur);
}

export function playHorn() {
  const c = ensureCtx();
  // dual-tone horn
  [330, 440].forEach((f) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "square";
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.setValueAtTime(0.12, c.currentTime + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
    osc.connect(g);
    g.connect(masterGain!);
    osc.start();
    osc.stop(c.currentTime + 0.5);
  });
}

export function playCrash() {
  const c = ensureCtx();
  // noise burst
  const bufferSize = c.sampleRate * 0.6;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  g.gain.value = 0.4;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800;
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain!);
  src.start();
  // low thud
  tone(80, 0.4, "sine", 0.3, 30);
}

export function playBoost() {
  tone(200, 0.5, "sawtooth", 0.15, 800);
}

export function playPothole() {
  tone(120, 0.15, "square", 0.2, 50);
}

export function playDrift() {
  tone(300, 0.2, "sine", 0.08, 150);
}

export function playUiClick() {
  tone(600, 0.05, "square", 0.08);
}

export function playUiSelect() {
  tone(800, 0.08, "sine", 0.1, 1200);
}

export function playCountdownBeep() {
  tone(440, 0.15, "sine", 0.2);
}

export function playCountdownGo() {
  tone(660, 0.4, "sine", 0.25, 880);
}

export function playWin() {
  const c = ensureCtx();
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => {
    setTimeout(() => tone(n, 0.3, "triangle", 0.15), i * 120);
  });
}

export function playLose() {
  const notes = [440, 392, 349, 294];
  notes.forEach((n, i) => {
    setTimeout(() => tone(n, 0.35, "sawtooth", 0.12), i * 150);
  });
}
