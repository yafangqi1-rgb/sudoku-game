// sound.js — WebAudio 轻音效,无需音频文件
let ctx = null;
let enabled = true;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur = 0.08, type = 'sine', vol = 0.15) {
  if (!enabled) return;
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g); g.connect(c.destination);
  const t = c.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur);
}

export const sound = {
  setEnabled(v) { enabled = v; },
  isEnabled() { return enabled; },
  place() { tone(660, 0.06, 'sine', 0.12); },
  erase() { tone(300, 0.06, 'triangle', 0.1); },
  note() { tone(520, 0.05, 'sine', 0.08); },
  error() { tone(180, 0.18, 'sawtooth', 0.12); },
  win() {
    tone(523, 0.12); setTimeout(() => tone(659, 0.12), 110);
    setTimeout(() => tone(784, 0.22), 220);
  },
  lose() { tone(220, 0.18, 'sawtooth', 0.12); setTimeout(() => tone(150, 0.3, 'sawtooth', 0.12), 160); },
};
