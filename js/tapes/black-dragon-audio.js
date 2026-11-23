/**
 * Tape-only Web Audio for black-dragon-01.
 * Ordinary wooden knuckle knocks (sped up), soft footsteps, quiet breath.
 * Does not touch the gameplay AudioDirector.
 */

/**
 * @typedef {object} BlackDragonAudioConfig
 * @property {number} [knockLevel]
 * @property {number} [knockInterval] Default seconds between knocks in a burst.
 * @property {number} [knockCount] Default knock count per burst.
 * @property {number} [footLevel]
 * @property {number} [breathLevel]
 */

export function createBlackDragonTapeAudio(config = {}) {
  const cfg = {
    knockLevel: 0.36,
    knockInterval: 0.092,
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
  let enabled = false;
  let lastFootAt = -999;
  let disposed = false;

  function ensure() {
    if (disposed) return null;
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
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

  async function setEnabled(on) {
    enabled = Boolean(on);
    const c = ensure();
    if (!c || !master) return enabled;
    if (enabled) await unlock();
    const t = c.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(enabled ? 1 : 0, t + 0.06);
    if (enabled) startBreath();
    return enabled;
  }

  /**
   * One shared polite knuckle sample — same pitch/timbre every hit.
   * Only tiny amplitude / noise grain varies so it isn't a literal clone.
   */
  let knockTemplate = null;

  function buildKnockTemplate() {
    const c = ensure();
    if (!c) return null;
    const dur = 0.19;
    const n = Math.ceil(c.sampleRate * dur);
    const buffer = c.createBuffer(1, n, c.sampleRate);
    const data = buffer.getChannelData(0);

    // Lower, heavier board tone — still a polite knuckle, just deeper.
    const boardHz = 102;
    const cavityHz = 275;
    const tickHz = 820;
    let boardPhase = 0;
    let cavityPhase = 0;
    let tickPhase = 0;
    let woodNoise = 0;

    for (let i = 0; i < n; i++) {
      const t = i / c.sampleRate;
      const tipEnv = Math.min(1, t / 0.00045) * Math.exp(-t * 280);
      const tip = (Math.random() * 2 - 1) * tipEnv;

      boardPhase += 2 * Math.PI * boardHz / c.sampleRate;
      const boardEnv = Math.min(1, t / 0.0022) * Math.exp(-t * 18);
      const board = (
        Math.sin(boardPhase)
        + 0.42 * Math.sin(boardPhase * 2.01)
        + 0.18 * Math.sin(boardPhase * 3.05)
      ) * boardEnv;

      cavityPhase += 2 * Math.PI * cavityHz / c.sampleRate;
      const cavEnv = Math.min(1, t / 0.0016) * Math.exp(-t * 30);
      const cavity = Math.sin(cavityPhase) * cavEnv * 0.55;

      tickPhase += 2 * Math.PI * tickHz / c.sampleRate;
      const tickEnv = Math.min(1, t / 0.0008) * Math.exp(-t * 90);
      const tick = Math.sin(tickPhase) * tickEnv * 0.22;

      woodNoise = woodNoise * 0.86 + (Math.random() * 2 - 1) * 0.14;
      const grain = woodNoise * boardEnv * 0.28;

      data[i] = tip * 0.38 + board * 0.78 + cavity * 0.4 + tick * 0.55 + grain;
    }
    return buffer;
  }

  function getKnockBuffer() {
    if (!knockTemplate) knockTemplate = buildKnockTemplate();
    return knockTemplate;
  }

  /**
   * Play one wooden knock burst at the front door.
   * @param {{x:number,y:number,z:number}} doorPos
   * @param {{x:number,y:number,z:number}|null} [listenerPos]
   * @param {number} [when] ctx time offset from now
   * @param {{count?:number,interval?:number}} [opts] Per-burst overrides.
   */
  function playKnockSequence(doorPos, listenerPos = null, when = 0, opts = {}) {
    if (!enabled) return;
    const c = ensure();
    if (!c || !master) return;
    void unlock();
    if (listenerPos) setListener(listenerPos);
    const count = Math.max(1, Math.round(opts.count ?? cfg.knockCount));
    const interval = Math.max(0.05, opts.interval ?? cfg.knockInterval);
    const t0 = c.currentTime + Math.max(0, when);

    const buffer = getKnockBuffer();
    if (!buffer) return;

    for (let i = 0; i < count; i++) {
      const src = c.createBufferSource();
      src.buffer = buffer;
      // Keep pitch locked and a bit lower than the authored buffer.
      src.playbackRate.value = 0.8;

      // Shape toward a domestic wooden door, not a metallic click.
      const low = c.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 3200;
      low.Q.value = 0.55;

      const body = c.createBiquadFilter();
      body.type = 'peaking';
      body.frequency.value = 210;
      body.Q.value = 0.85;
      body.gain.value = 5.5;

      const presence = c.createBiquadFilter();
      presence.type = 'peaking';
      presence.frequency.value = 780;
      presence.Q.value = 0.7;
      presence.gain.value = 2.2;

      const gain = c.createGain();
      // Tiny level wobble only — same note every hit.
      gain.gain.value = cfg.knockLevel * (0.96 + Math.random() * 0.08);

      const panner = c.createPanner?.();
      let tail = gain;
      src.connect(low).connect(body).connect(presence).connect(gain);
      if (panner) {
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 2.5;
        panner.maxDistance = 24;
        panner.rolloffFactor = 0.85;
        if (typeof panner.positionX !== 'undefined') {
          panner.positionX.value = doorPos.x;
          panner.positionY.value = doorPos.y;
          panner.positionZ.value = doorPos.z;
        } else {
          panner.setPosition?.(doorPos.x, doorPos.y, doorPos.z);
        }
        gain.connect(panner);
        panner.connect(master);
        tail = panner;
      } else {
        const pan = c.createStereoPanner?.();
        let panVal = 0;
        if (listenerPos) {
          const dx = doorPos.x - listenerPos.x;
          const dz = doorPos.z - listenerPos.z;
          panVal = Math.max(-0.75, Math.min(0.75, Math.atan2(dx, -dz) * 0.55));
        }
        if (pan) {
          pan.pan.value = panVal;
          gain.connect(pan);
          pan.connect(master);
          tail = pan;
        } else {
          gain.connect(master);
        }
      }

      const jitter = (Math.random() - 0.5) * interval * 0.18;
      src.start(t0 + i * interval + jitter);
      src.onended = () => {
        try {
          src.disconnect();
          low.disconnect();
          body.disconnect();
          presence.disconnect();
          gain.disconnect();
          tail?.disconnect?.();
        } catch { /* ignore */ }
      };
    }
  }

  function playFootstep(side = 1) {
    if (!enabled) return;
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
    if (!enabled || !breathGain || !ctx) return;
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

  /** @param {{x:number,y:number,z:number}} pos @param {{x:number,y:number,z:number}|null} [forward] */
  function setListener(pos, forward = null) {
    if (!ctx?.listener || !pos) return;
    const L = ctx.listener;
    if (typeof L.positionX !== 'undefined') {
      L.positionX.value = pos.x;
      L.positionY.value = pos.y;
      L.positionZ.value = pos.z;
    } else {
      L.setPosition?.(pos.x, pos.y, pos.z);
    }
    if (forward) {
      if (typeof L.forwardX !== 'undefined') {
        L.forwardX.value = forward.x;
        L.forwardY.value = forward.y;
        L.forwardZ.value = forward.z;
        L.upX.value = 0;
        L.upY.value = 1;
        L.upZ.value = 0;
      } else {
        L.setOrientation?.(forward.x, forward.y, forward.z, 0, 1, 0);
      }
    }
  }

  return {
    config: cfg,
    get enabled() { return enabled; },
    unlock,
    setEnabled,
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
      knockTemplate = null;
      ctx = null;
    },
  };
}
