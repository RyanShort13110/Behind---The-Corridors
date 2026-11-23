/**
 * Tape-only Web Audio for black-dragon-01.
 * Ordinary wooden knuckle knocks (sped up), soft footsteps, quiet breath.
 * Does not touch the gameplay AudioDirector.
 */

/**
 * @typedef {object} BlackDragonAudioConfig
 * @property {number} [knockLevel]
 * @property {number} [knockInterval] Seconds between knocks in a burst.
 * @property {number} [knockCount]
 * @property {number} [footLevel]
 * @property {number} [breathLevel]
 */

export function createBlackDragonTapeAudio(config = {}) {
  const cfg = {
    knockLevel: 0.22,
    knockInterval: 0.062,
    knockCount: 7,
    footLevel: 0.045,
    breathLevel: 0.028,
    ...config,
  };

  /** @type {AudioContext | null} */
  let ctx = null;
  let master = null;
  let breathGain = null;
  let breathSource = null;
  let breathFilter = null;
  let unlocked = false;
  let lastFootAt = -999;
  let disposed = false;

  function ensure() {
    if (disposed) return null;
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    return ctx;
  }

  async function unlock() {
    const c = ensure();
    if (!c) return false;
    if (c.state === 'suspended') {
      try { await c.resume(); } catch { /* ignore */ }
    }
    unlocked = c.state === 'running';
    return unlocked;
  }

  /** Soft knuckle-on-wood impact — polite, not a pound. */
  function synthesizeKnockBuffer(strength = 1) {
    const c = ensure();
    if (!c) return null;
    const dur = 0.085 + Math.random() * 0.02;
    const n = Math.ceil(c.sampleRate * dur);
    const buffer = c.createBuffer(1, n, c.sampleRate);
    const data = buffer.getChannelData(0);
    let woodPhase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / c.sampleRate;
      const attack = Math.min(1, t / 0.0012);
      const env = attack * Math.exp(-t * (38 + strength * 10));
      woodPhase += 2 * Math.PI * (620 + strength * 40) / c.sampleRate;
      const body = Math.sin(woodPhase) * 0.35
        + Math.sin(woodPhase * 2.17) * 0.12
        + (Math.random() * 2 - 1) * 0.55;
      data[i] = body * env * (0.7 + strength * 0.3);
    }
    return buffer;
  }

  /**
   * Play one rapid polite knock burst at the front door.
   * @param {{x:number,y:number,z:number}} doorPos
   * @param {{x:number,y:number,z:number}} listenerPos
   * @param {number} [when] ctx time offset from now
   */
  function playKnockSequence(doorPos, listenerPos, when = 0) {
    const c = ensure();
    if (!c || !master) return;
    void unlock();
    const count = Math.max(4, Math.round(cfg.knockCount));
    const interval = Math.max(0.04, cfg.knockInterval);
    const t0 = c.currentTime + Math.max(0, when);

    for (let i = 0; i < count; i++) {
      const strength = 0.82 + Math.random() * 0.28;
      const buffer = synthesizeKnockBuffer(strength);
      if (!buffer) continue;
      const src = c.createBufferSource();
      src.buffer = buffer;
      // Tiny pitch / rate jitter so the two bursts aren't clones.
      src.playbackRate.value = 0.96 + Math.random() * 0.08;

      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 980 + Math.random() * 220;
      filter.Q.value = 0.85;

      const gain = c.createGain();
      const hitLevel = cfg.knockLevel * (0.75 + Math.random() * 0.35);
      gain.gain.value = hitLevel;

      const panner = c.createPanner?.();
      if (panner) {
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 1.2;
        panner.maxDistance = 18;
        panner.rolloffFactor = 1.1;
        panner.setPosition?.(doorPos.x, doorPos.y, doorPos.z);
        c.listener?.setPosition?.(listenerPos.x, listenerPos.y, listenerPos.z);
        src.connect(filter).connect(gain).connect(panner).connect(master);
      } else {
        const pan = c.createStereoPanner?.();
        if (pan) {
          // Rough left/right from door relative to listener.
          const dx = doorPos.x - listenerPos.x;
          const dz = doorPos.z - listenerPos.z;
          const ang = Math.atan2(dx, -dz);
          pan.pan.value = Math.max(-0.85, Math.min(0.85, Math.sin(ang)));
          src.connect(filter).connect(gain).connect(pan).connect(master);
        } else {
          src.connect(filter).connect(gain).connect(master);
        }
      }

      // Slight human timing wobble within the sped-up pattern.
      const jitter = (Math.random() - 0.5) * interval * 0.22;
      src.start(t0 + i * interval + jitter);
      src.onended = () => {
        try {
          src.disconnect();
          filter.disconnect();
          gain.disconnect();
          panner?.disconnect?.();
        } catch { /* ignore */ }
      };
    }
  }

  function playFootstep(side = 1) {
    const c = ensure();
    if (!c || !master) return;
    const now = c.currentTime;
    if (now - lastFootAt < 0.16) return;
    lastFootAt = now;

    const dur = 0.09;
    const n = Math.ceil(c.sampleRate * dur);
    const buffer = c.createBuffer(1, n, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / c.sampleRate;
      const env = Math.min(1, t / 0.004) * Math.exp(-t * 28);
      data[i] = (Math.random() * 2 - 1) * env * 0.9;
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420 + Math.random() * 80;
    const gain = c.createGain();
    gain.gain.value = cfg.footLevel * (0.75 + Math.random() * 0.4);
    const pan = c.createStereoPanner?.();
    if (pan) {
      pan.pan.value = side * (0.12 + Math.random() * 0.08);
      src.connect(filter).connect(gain).connect(pan).connect(master);
    } else {
      src.connect(filter).connect(gain).connect(master);
    }
    src.start();
  }

  function startBreath() {
    const c = ensure();
    if (!c || !master || breathSource) return;
    const len = Math.ceil(c.sampleRate * 2.5);
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    breathSource = c.createBufferSource();
    breathSource.buffer = buffer;
    breathSource.loop = true;
    breathFilter = c.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.value = 780;
    breathFilter.Q.value = 0.55;
    breathGain = c.createGain();
    breathGain.gain.value = 0;
    breathSource.connect(breathFilter).connect(breathGain).connect(master);
    breathSource.start();
  }

  /** amount 0..1; quieter while listening, spiked on gasp. */
  function setBreath(amount, gasp = false) {
    if (!breathGain || !ctx) return;
    const t = ctx.currentTime;
    const target = Math.max(0, amount) * cfg.breathLevel;
    breathGain.gain.cancelScheduledValues(t);
    if (gasp) {
      breathGain.gain.setValueAtTime(Math.max(breathGain.gain.value, target * 0.4), t);
      breathGain.gain.linearRampToValueAtTime(cfg.breathLevel * 1.6, t + 0.08);
      breathGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, target), t + 0.55);
    } else {
      breathGain.gain.linearRampToValueAtTime(Math.max(0.0001, target), t + 0.18);
    }
  }

  function setListener(pos) {
    if (!ctx?.listener || !pos) return;
    ctx.listener.setPosition?.(pos.x, pos.y, pos.z);
  }

  return {
    config: cfg,
    unlock,
    playKnockSequence,
    playFootstep,
    startBreath,
    setBreath,
    setListener,
    dispose() {
      disposed = true;
      try {
        breathSource?.stop?.();
        breathSource?.disconnect?.();
        breathFilter?.disconnect?.();
        breathGain?.disconnect?.();
        master?.disconnect?.();
        ctx?.close?.();
      } catch { /* ignore */ }
      breathSource = null;
      ctx = null;
    },
  };
}
