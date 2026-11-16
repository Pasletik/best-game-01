// Sound, made, not fetched: a few WebAudio oscillator blips. The context is created on the
// first user gesture (browsers block audio before that), and every call is a no-op while
// muted or before the context exists, so screenshots stay silent.
export function createSound() {
  let ctx = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (ctx !== null) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (c !== null && c.state === 'suspended') c.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure();
    if (c === null || master === null) return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const now = c.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch {
      // Sound is garnish; a failure here must never break the game.
    }
  }

  function noise(dur, vol, filterFreq) {
    if (muted) return;
    const c = ensure();
    if (c === null || master === null) return;
    try {
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buffer = c.createBuffer(1, len, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const gain = c.createGain();
      gain.gain.value = vol;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
    } catch {
      // Garnish only.
    }
  }

  return {
    unlock,
    setMuted(value) { muted = value; },
    isMuted() { return muted; },
    click() { tone(660, 0.06, 'triangle', 0.5); },
    build() { tone(392, 0.1, 'triangle', 0.6); tone(523, 0.14, 'triangle', 0.5); },
    shoot(kind) {
      if (kind === 'cannon') noise(0.14, 0.5, 900);
      else tone(880, 0.05, 'square', 0.18, 440);
    },
    kill() { tone(1046, 0.08, 'sine', 0.4, 1568); },
    coin() { tone(1318, 0.07, 'sine', 0.3); },
    leak() { tone(220, 0.3, 'sawtooth', 0.5, 110); },
    horn() { tone(196, 0.5, 'triangle', 0.6, 262); tone(147, 0.6, 'triangle', 0.4, 196); },
    win() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((n, i) => setTimeout(() => tone(n, 0.22, 'triangle', 0.5), i * 120));
    },
    lose() {
      const notes = [392, 330, 262, 196];
      notes.forEach((n, i) => setTimeout(() => tone(n, 0.3, 'sawtooth', 0.35), i * 160));
    },
  };
}
