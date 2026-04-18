/**
 * Bugbl.io Sound Engine
 * Pure Web Audio API — no external files needed.
 * All sounds are synthesized in the browser.
 */

let ctx = null;

function getCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  // Resume if suspended (needed after user gesture)
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function play(fn) {
  const c = getCtx();
  if (!c) return;
  try { fn(c); } catch (e) { /* ignore */ }
}

/* ── Low-level helpers ── */

function tone(c, freq, type, startTime, duration, gainPeak = 0.3, fadeOut = true) {
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(gainPeak, startTime);
  if (fadeOut) gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function noise(c, startTime, duration, gainPeak = 0.15) {
  const bufSize = c.sampleRate * duration;
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const source = c.createBufferSource();
  source.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.7;
  const gain = c.createGain();
  gain.gain.setValueAtTime(gainPeak, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  source.start(startTime);
  source.stop(startTime + duration);
}

/* ── Exported sound effects ── */

/**
 * Tick — every second of the countdown
 */
export function soundTick() {
  play(c => {
    const t = c.currentTime;
    tone(c, 880, 'sine', t, 0.06, 0.12);
  });
}

/**
 * Urgent tick — last 10 seconds
 */
export function soundTickUrgent() {
  play(c => {
    const t = c.currentTime;
    tone(c, 1320, 'square', t, 0.07, 0.18);
  });
}

/**
 * Time's up — alarm-style descending tones
 */
export function soundTimeUp() {
  play(c => {
    const t = c.currentTime;
    [880, 660, 440, 330].forEach((freq, i) => {
      tone(c, freq, 'sawtooth', t + i * 0.13, 0.18, 0.28);
    });
  });
}

/**
 * Someone joined the room
 */
export function soundJoin() {
  play(c => {
    const t = c.currentTime;
    tone(c, 440, 'sine', t,        0.12, 0.2);
    tone(c, 660, 'sine', t + 0.12, 0.15, 0.2);
    tone(c, 880, 'sine', t + 0.24, 0.18, 0.2);
  });
}

/**
 * Someone left the room
 */
export function soundLeave() {
  play(c => {
    const t = c.currentTime;
    tone(c, 660, 'sine', t,        0.13, 0.18);
    tone(c, 440, 'sine', t + 0.12, 0.13, 0.18);
    tone(c, 330, 'sine', t + 0.24, 0.12, 0.18);
  });
}

/**
 * Room created successfully
 */
export function soundRoomCreated() {
  play(c => {
    const t = c.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      tone(c, freq, 'triangle', t + i * 0.09, 0.22, 0.22);
    });
  });
}

/**
 * Game starting — dramatic ascending
 */
export function soundGameStart() {
  play(c => {
    const t = c.currentTime;
    [262, 330, 392, 523, 659, 784].forEach((freq, i) => {
      tone(c, freq, 'triangle', t + i * 0.08, 0.25, 0.25);
    });
    tone(c, 1047, 'sine', t + 0.55, 0.5, 0.35);
  });
}

/**
 * Correct guess — happy ding-ding
 */
export function soundCorrect() {
  play(c => {
    const t = c.currentTime;
    tone(c, 784,  'sine', t,        0.2, 0.3);
    tone(c, 1047, 'sine', t + 0.13, 0.2, 0.3);
    tone(c, 1319, 'sine', t + 0.26, 0.2, 0.35);
  });
}

/**
 * Close guess — gentle wobble
 */
export function soundClose() {
  play(c => {
    const t = c.currentTime;
    tone(c, 523, 'sine', t, 0.12, 0.2);
    tone(c, 659, 'sine', t + 0.1, 0.1, 0.15, false);
  });
}

/**
 * Round end chime
 */
export function soundRoundEnd() {
  play(c => {
    const t = c.currentTime;
    [523, 415, 349, 262].forEach((freq, i) => {
      tone(c, freq, 'triangle', t + i * 0.15, 0.3, 0.2);
    });
  });
}

/**
 * Game over — fanfare
 */
export function soundGameOver() {
  play(c => {
    const t = c.currentTime;
    const freqs = [523, 523, 523, 415, 523, 622, 698];
    const delays = [0, 0.18, 0.36, 0.18, 0.18, 0.18, 0.6];
    let acc = 0;
    freqs.forEach((freq, i) => {
      acc += delays[i];
      tone(c, freq, 'triangle', t + acc, 0.22, 0.28);
    });
  });
}

/**
 * Word selected (drawing starts)
 */
export function soundWordSelected() {
  play(c => {
    const t = c.currentTime;
    noise(c, t, 0.08, 0.12);
    tone(c, 440, 'triangle', t + 0.05, 0.2, 0.2);
  });
}

/**
 * Chat message received
 */
export function soundChat() {
  play(c => {
    const t = c.currentTime;
    tone(c, 660, 'sine', t, 0.05, 0.08);
  });
}
