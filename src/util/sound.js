// 大螢幕音效：全部用 Web Audio API 即時合成（無音檔、無版權問題、輕量自包）。
// 瀏覽器自動播放政策：AudioContext 需在使用者互動後才能發聲，故有 resumeAudio()。

let ctx = null;
let enabled = true;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) { try { ctx = new AC(); } catch { ctx = null; } }
  }
  return ctx;
}

export function resumeAudio() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume();
}
export function setSoundEnabled(v) { enabled = v; if (v) resumeAudio(); }
export function isSoundEnabled() { return enabled; }

// 單音（含音量包絡，可滑音）
function tone(freq, start, dur, opts = {}) {
  const { type = 'sine', gain = 0.18, slideTo = null } = opts;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

// 短噪音（骰子/沙沙聲）
function noise(start, dur, gain = 0.12) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g).connect(c.destination);
  src.start(t0);
}

function play(notes) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  if (c.state === 'suspended') c.resume();
  notes.forEach((n) => tone(...n));
}

export const SFX = {
  roll() { if (!enabled) return; resumeAudio(); noise(0, 0.1, 0.1); noise(0.08, 0.09, 0.08); },
  coins() { play([[660, 0, 0.12, { type: 'triangle' }], [880, 0.1, 0.12, { type: 'triangle' }], [1175, 0.2, 0.2, { type: 'triangle', gain: 0.2 }]]); },
  excited() { play([[523, 0, 0.1, { type: 'triangle' }], [784, 0.09, 0.16, { type: 'triangle' }]]); },
  market() { play([[494, 0, 0.1], [466, 0.1, 0.12]]); },
  expense() { play([[330, 0, 0.18, { type: 'sawtooth', gain: 0.16, slideTo: 150 }]]); },
  charity() { play([[523, 0, 0.16], [659, 0.1, 0.16], [784, 0.2, 0.26, { gain: 0.16 }]]); },
  baby() { play([[784, 0, 0.1, { type: 'triangle' }], [988, 0.1, 0.16, { type: 'triangle' }]]); },
  downsized() { play([[300, 0, 0.2, { type: 'square', gain: 0.14, slideTo: 120 }]]); },
  bankrupt() { play([[440, 0, 0.2, { type: 'sawtooth', slideTo: 300 }], [300, 0.2, 0.24, { type: 'sawtooth', slideTo: 180 }], [180, 0.44, 0.5, { type: 'sawtooth', gain: 0.2, slideTo: 80 }]]); },
  freed() { play([[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1047, 0.36, 0.36, { type: 'triangle', gain: 0.24 }]]); },
  cha() { play([[988, 0, 0.08, { type: 'triangle' }], [1319, 0.07, 0.16, { type: 'triangle', gain: 0.2 }]]); },
};

// 依停到的格子播事件音效
export function playEventSound(square, paydays) {
  if (square === 'payday' || paydays > 0) return SFX.coins();
  switch (square) {
    case 'opportunity': return SFX.excited();
    case 'market': return SFX.market();
    case 'doodad': return SFX.expense();
    case 'charity': return SFX.charity();
    case 'baby': return SFX.baby();
    case 'downsized': return SFX.downsized();
    default: return undefined;
  }
}
