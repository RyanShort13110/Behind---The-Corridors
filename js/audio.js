/**
 * Behind. audio direction.
 * All synth ambience is generated via Web Audio (no additional downloads).
 * The only external sound is the user's existing 5-second M4A recording.
 * Sound remains OFF until a deliberate button press.
 */
const BREATH_FILE = './assets/breathing-scared.m4a';
const BREATH_DURATION = 5;
const BREATH_VOLUME = 0.07;
// Scales the Level 01 psychological bed + corridor accents (breathing uses BREATH_VOLUME separately).
const CORRIDOR_GAIN = 4.6;

export function createAudioDirector() {
  let ctx = null;
  let enabled = false;
  let humGain, buzzGain, motorGain, breathingGain, breathing;
  let phoneHigh, phoneLow;
  let officeAudioOrigin = 0;
  let breathArmed = true;
  // Psychological score bed (corridor-first): room air + dissonant pad + thin anxiety.
  // Replaces the constant fluorescent sawtooth drone as the emotional bed.
  let scoreReady = false;
  let scoreAirSource = null, scoreAirGain = null, scoreAirFilter = null;
  let scorePadLow = null, scorePadHigh = null, scorePadGain = null;
  let scoreTension = null, scoreTensionGain = null;
  let scoreAnxiety = null, scoreAnxietyGain = null;
  let nightStepBuffer = null;
  let nightStepBus = null;
  let nightStepIndex = 0;
  // Level 04 only: a dissonant sub-drone and filtered, breath-like room tone.
  // Lazy initialization avoids audio work in chapters where it is not used.
  let nightAirSource = null, nightAirGain = null, nightAirFilter = null;
  let nightDroneSource = null, nightDroneGain = null;
  let unseenNoiseGain = null, unseenToneGain = null, unseenPanner = null;
  let unseenNoise = null, unseenTone = null, unseenFilter = null;
  let unseenCueBus = null, unseenFinalBus = null;
  let unseenRoarBuffer = null, unseenRoarBus = null;
  const activeUnseenRoars = new Set();
  const unseenBuffers = {};
  const heardUnseen = { tapEvents:0, cabinetEvents:0, roarEvents:0, scratchEvents:0,
    ceilingEvents:0, cartonEvents:0, finalClickEvents:0 };
  const syncUnseenCues = state => {
    for(const kind of Object.keys(heardUnseen)) heardUnseen[kind] = state[kind] ?? 0;
  };

  const createVoice = (frequency, waveform, filterHz) => {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = waveform;
    osc.frequency.value = frequency;
    filter.type = 'lowpass';
    filter.frequency.value = filterHz;
    gain.gain.value = 0;
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    gain._osc = osc;
    gain._filter = filter;
    return gain;
  };

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    // ~120 Hz triangle reads as ballast / fluorescent hum (not a sub drone).
    humGain = createVoice(120, 'triangle', 420);
    buzzGain = createVoice(240, 'triangle', 900);
    motorGain = createVoice(37, 'triangle', 120);
    // Analogue-style double ring, deliberately much quieter than dialogue.
    phoneHigh = createVoice(430, 'sine', 850);
    phoneLow = createVoice(520, 'sine', 850);

    // Construct ONE reusable, soft footfall sample. Subsequent steps allocate
    // only a short-lived source node; they don't re-synthesize a buffer.
    const stepLength = Math.ceil(ctx.sampleRate * 0.28);
    nightStepBuffer = ctx.createBuffer(1, stepLength, ctx.sampleRate);
    const stepData = nightStepBuffer.getChannelData(0);
    for (let i = 0; i < stepLength; i++) {
      const t = i / ctx.sampleRate;
      const heel = Math.sin(2 * Math.PI * 71 * t) * Math.exp(-t * 24) * 0.29;
      const grit = (Math.random() * 2 - 1) * Math.exp(-t * 32) * 0.58;
      const toe = t > 0.065
        ? (Math.random() * 2 - 1) * Math.exp(-(t - 0.065) * 42) * 0.17 : 0;
      // A short, true zero-crossing envelope prevents sharp edges at the
      // increasingly rapid cadence; it does not alter step event timing.
      const attack = Math.min(1, t / 0.009);
      const release = Math.min(1, (0.28 - t) / 0.014);
      stepData[i] = (heel + grit + toe) * Math.max(0, attack * release);
    }
    const stepFilter = ctx.createBiquadFilter();
    stepFilter.type = 'lowpass';
    stepFilter.frequency.value = 390;
    const stepGain = ctx.createGain();
    stepGain.gain.value = 0.095;
    const stepPan = ctx.createStereoPanner?.();
    if (stepPan) {
      stepPan.pan.value = -0.28;
      stepFilter.connect(stepGain).connect(stepPan).connect(ctx.destination);
    } else {
      stepFilter.connect(stepGain).connect(ctx.destination);
    }
    nightStepBus = stepFilter;

    breathing = new Audio(BREATH_FILE);
    breathing.preload = 'auto';
    breathing.loop = false;
    breathing.addEventListener('error', () => {
      console.warn(`[Behind.] Missing or unsupported breathing audio: ${BREATH_FILE}`);
    });
    // Low-pass and slight right bias place the sound behind the last door.
    const source = ctx.createMediaElementSource(breathing);
    const lowPass = ctx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 740;
    lowPass.Q.value = 0.6;
    breathingGain = ctx.createGain();
    breathingGain.gain.value = 0;
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = 0.3;
      source.connect(lowPass).connect(breathingGain).connect(panner).connect(ctx.destination);
    } else {
      source.connect(lowPass).connect(breathingGain).connect(ctx.destination);
    }
  }

  /**
   * Sparse psychological bed for Level 01. Not a melody — slow dissonance,
   * filtered room air, and a nearly subliminal high tone that tightens as
   * the corridor deepens. Event sounds (fault buzz, breathing, rear motor)
   * stay separate punctuation on top.
   */
  function ensureHorrorScore() {
    if (!ctx || scoreReady) return;
    scoreReady = true;

    const duration = 4.2;
    const count = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < count; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + white * 0.02) * 0.986;
      data[i] = brown * 0.9 + white * 0.08;
    }
    const join = Math.min(Math.floor(ctx.sampleRate * 0.1), Math.floor(count / 8));
    const head = data.slice(0, join);
    for (let i = 0; i < join; i++) {
      const blend = 0.5 - 0.5 * Math.cos(Math.PI * (i + 1) / join);
      const k = count - join + i;
      data[k] = data[k] * (1 - blend) + head[join - 1 - i] * blend;
    }
    scoreAirSource = ctx.createBufferSource();
    scoreAirSource.buffer = buffer;
    scoreAirSource.loop = true;
    scoreAirFilter = ctx.createBiquadFilter();
    scoreAirFilter.type = 'bandpass';
    scoreAirFilter.frequency.value = 240;
    scoreAirFilter.Q.value = 0.55;
    scoreAirGain = ctx.createGain();
    scoreAirGain.gain.value = 0;
    scoreAirSource.connect(scoreAirFilter).connect(scoreAirGain).connect(ctx.destination);
    scoreAirSource.start();

    // Minor-second low pad: slow beating reads as unease, not "music."
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 130;
    padFilter.Q.value = 0.7;
    scorePadGain = ctx.createGain();
    scorePadGain.gain.value = 0;
    scorePadLow = ctx.createOscillator();
    scorePadLow.type = 'sine';
    scorePadLow.frequency.value = 46.2;
    scorePadHigh = ctx.createOscillator();
    scorePadHigh.type = 'triangle';
    scorePadHigh.frequency.value = 49.1;
    scorePadLow.connect(padFilter);
    scorePadHigh.connect(padFilter);
    padFilter.connect(scorePadGain).connect(ctx.destination);
    scorePadLow.start();
    scorePadHigh.start();

    // Mid dissonance that arrives deeper in the hall (tritone color over the pad).
    const tensionFilter = ctx.createBiquadFilter();
    tensionFilter.type = 'lowpass';
    tensionFilter.frequency.value = 220;
    scoreTensionGain = ctx.createGain();
    scoreTensionGain.gain.value = 0;
    scoreTension = ctx.createOscillator();
    scoreTension.type = 'sine';
    scoreTension.frequency.value = 65.4;
    scoreTension.connect(tensionFilter).connect(scoreTensionGain).connect(ctx.destination);
    scoreTension.start();

    // Thin high anxiety — almost tinnitus, never melodic.
    const anxietyFilter = ctx.createBiquadFilter();
    anxietyFilter.type = 'bandpass';
    anxietyFilter.frequency.value = 2100;
    anxietyFilter.Q.value = 6;
    scoreAnxietyGain = ctx.createGain();
    scoreAnxietyGain.gain.value = 0;
    scoreAnxiety = ctx.createOscillator();
    scoreAnxiety.type = 'sine';
    scoreAnxiety.frequency.value = 1860;
    scoreAnxiety.connect(anxietyFilter).connect(scoreAnxietyGain).connect(ctx.destination);
    scoreAnxiety.start();
  }

  function silenceHorrorScore(seconds = 0.2) {
    setGain(scoreAirGain, 0, seconds);
    setGain(scorePadGain, 0, seconds);
    setGain(scoreTensionGain, 0, seconds);
    setGain(scoreAnxietyGain, 0, seconds);
  }

  // Level 04 / The Night Shift. Nothing plays until the FIRST footstep.
  // A looping, band-limited air texture and a slightly unstable low tone
  // gather in intensity beneath the existing directional footsteps. Keeping
  // both sources persistent avoids buffer churn and mid-loop startup clicks.
  function ensureNightAmbience() {
    if (!ctx || nightAirSource) return;
    const duration = 3.6;
    const count = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let color = 0;
    for (let i = 0; i < count; i++) {
      const white = Math.random() * 2 - 1;
      color = color * .982 + white * .018;
      samples[i] = color * .76 + white * .14;
    }
    // The earlier loop faded to literal silence over its final 70 ms and
    // first 70 ms. At the louder part of the chase this sounded like a brief
    // skip every 3.6 seconds. Join the noise *without* dipping its volume:
    // smoothly blend the tail into a reversed copy of the opening samples,
    // so the first and last sample match at the looping seam. This preserves
    // the air texture's intensity throughout the entire loop.
    const join = Math.min(Math.floor(ctx.sampleRate * .12), Math.floor(count / 8));
    const head = samples.slice(0, join);
    for (let i = 0; i < join; i++) {
      const blend = .5 - .5 * Math.cos(Math.PI * (i + 1) / join);
      const k = count - join + i;
      samples[k] = samples[k] * (1 - blend) + head[join - 1 - i] * blend;
    }
    nightAirSource = ctx.createBufferSource();
    nightAirSource.buffer = buffer;
    nightAirSource.loop = true;
    nightAirFilter = ctx.createBiquadFilter();
    nightAirFilter.type = 'bandpass';
    nightAirFilter.frequency.value = 330;
    nightAirFilter.Q.value = .42;
    nightAirGain = ctx.createGain();
    nightAirGain.gain.value = 0;
    nightAirSource.connect(nightAirFilter).connect(nightAirGain).connect(ctx.destination);

    nightDroneSource = ctx.createOscillator();
    nightDroneSource.type = 'triangle';
    nightDroneSource.frequency.value = 43;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 115;
    nightDroneGain = ctx.createGain();
    nightDroneGain.gain.value = 0;
    nightDroneSource.connect(droneFilter).connect(nightDroneGain).connect(ctx.destination);
    nightAirSource.start();
    nightDroneSource.start();
  }

  // Lazy-created for Level 06; Chapters 01–05 incur NO additional
  // processing or audio nodes until the player reaches The Unseen.
  function ensureUnseenSound() {
    if (!ctx || unseenNoise) return;
    // Level 06: an ongoing, spatialized DRAG, not footsteps or a monster.
    // Everything is synthesized once, with one 2.7s noise buffer and a quiet
    // low tone. Neither source creates new per-frame buffers or oscillators.
    const count = Math.ceil(ctx.sampleRate * 2.7);
    const scrapeBuffer = ctx.createBuffer(1, count, ctx.sampleRate);
    const scrapeData = scrapeBuffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < count; i++) {
      last = last * 0.88 + (Math.random() * 2 - 1) * 0.12;
      scrapeData[i] = last * (0.45 + 0.55 * Math.sin(i / ctx.sampleRate * 3.9) ** 2);
    }
    unseenNoise = ctx.createBufferSource();
    unseenNoise.buffer = scrapeBuffer;
    unseenNoise.loop = true;
    unseenFilter = ctx.createBiquadFilter();
    unseenFilter.type = 'bandpass';
    unseenFilter.frequency.value = 540;
    unseenFilter.Q.value = 0.56;
    unseenNoiseGain = ctx.createGain();
    unseenNoiseGain.gain.value = 0;
    unseenTone = ctx.createOscillator();
    unseenTone.type = 'triangle';
    unseenTone.frequency.value = 58;
    unseenToneGain = ctx.createGain();
    unseenToneGain.gain.value = 0;
    unseenPanner = ctx.createPanner();
    unseenPanner.panningModel = 'HRTF';
    unseenPanner.distanceModel = 'inverse';
    unseenPanner.refDistance = 2.6;
    unseenPanner.maxDistance = 46;
    unseenPanner.rolloffFactor = 0.73;
    unseenNoise.connect(unseenFilter).connect(unseenNoiseGain).connect(unseenPanner);
    unseenTone.connect(unseenToneGain).connect(unseenPanner);
    unseenPanner.connect(ctx.destination);
    unseenRoarBus = ctx.createGain();
    unseenRoarBus.gain.value = 1;
    unseenRoarBus.connect(unseenPanner);
    unseenNoise.start();
    unseenTone.start();

    // Small, reusable one-shot buffers. The wall cannot contain a creature:
    // taps, sheet-metal latches and irregular scraping are synthesized, never
    // footsteps. No allocations of sample buffers during gameplay.
    unseenCueBus = ctx.createGain();
    unseenCueBus.gain.value = 1;
    unseenCueBus.connect(ctx.destination);
    unseenFinalBus = ctx.createGain();
    unseenFinalBus.gain.value = 1;
    unseenFinalBus.connect(ctx.destination);
    const makeBuffer = (name, length, recipe) => {
      const count = Math.ceil(ctx.sampleRate * length);
      const buffer = ctx.createBuffer(1,count,ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0;i<count;i++) data[i] = recipe(i/ctx.sampleRate,i,count);
      unseenBuffers[name] = buffer;
    };
    makeBuffer('tap',.19,t => {
      const attack = Math.min(1,t/.0025);
      return attack*Math.exp(-t*43)*(Math.random()*1.65-.825 +
        .15*Math.sin(2*Math.PI*157*t));
    });
    makeBuffer('latch',.24,t => Math.min(1,t/.003)*Math.exp(-t*26)*(
      .64*(Math.random()*2-1) + .27*Math.sin(2*Math.PI*318*t)));
    makeBuffer('scrape',.70,(t,i,n) => {
      const env = Math.sin(Math.PI*i/n)**.75;
      const teeth = .58 + .42*Math.pow(Math.sin(t*55),2);
      return env*teeth*(Math.random()*2-1)*.52;
    });
    // A muted crumple/papery double snap, not another metallic latch.
    makeBuffer('cardboard',.36,t => {
      const flick1=Math.exp(-t*28);
      const flick2=t>.11 ? Math.exp(-(t-.11)*30)*.72 : 0;
      return (Math.random()*2-1)*(.58*flick1+.42*flick2);
    });
    makeBuffer('rattle',.62,t => {
      const beats = Math.max(0,Math.sin(t*78))**6;
      return Math.exp(-t*4.8)*beats*(Math.random()*2-1)*.55;
    });
    // One strained, impossible voice: pitch-warped harmonic fundamentals,
    // fluttering subharmonics, and turbulent throat noise. Distortion is
    // baked into the reusable sample, so playback stays cheap on laptops.
    // The rounded attack makes this a rising presence, not a jump-scare hit.
    const roarLength = 2.55;
    unseenRoarBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * roarLength), ctx.sampleRate);
    const roar = unseenRoarBuffer.getChannelData(0);
    let phase = 0, throatNoise = 0;
    for (let i = 0; i < roar.length; i++) {
      const t = i / ctx.sampleRate;
      const attack = Math.min(1, Math.pow(t / .34, 1.35));
      const release = Math.min(1, (roarLength - t) / .70);
      const swell = (0.77 + .23 * Math.sin(Math.PI * t / roarLength)) *
        (0.83 + .17 * Math.sin(2 * Math.PI * 5.1 * t));
      const envelope = Math.max(0, attack * release) * swell;
      // A broken, descending fundamental with unrelated slower variations.
      const fundamental = 86 - 40 * (t / roarLength)
        + 9 * Math.sin(2 * Math.PI * (2.4 * t + .41 * t * t))
        + 3.6 * Math.sin(2 * Math.PI * 13 * t);
      phase += 2 * Math.PI * fundamental / ctx.sampleRate;
      throatNoise = throatNoise * .82 + (Math.random() * 2 - 1) * .18;
      const throat = Math.sin(phase) * .58 + Math.sin(phase * 1.99) * .32
        + Math.sin(phase * 3.13) * .23 + Math.sin(phase * .497) * .24;
      // Nonlinear waveshaping produces a raspy, clearly non-human growl.
      const rasp = throat * (2.1 + .5 * Math.sin(2 * Math.PI * 7.3 * t))
        + throatNoise * .82;
      roar[i] = Math.tanh(rasp) * envelope * .80;
    }
  }

  function playUnseenCue(name, pan=0, level=0.05, delay=0, isolated=false) {
    if (!ctx || !enabled || ctx.state !== 'running' || !unseenCueBus) return;
    const source=ctx.createBufferSource();
    source.buffer=unseenBuffers[name];
    const filter=ctx.createBiquadFilter();
    filter.type='bandpass';
    filter.frequency.value = name==='scrape'?510:name==='rattle'?1120:name==='cardboard'?670:920;
    filter.Q.value=name==='scrape'?0.75:0.68;
    const gain=ctx.createGain();
    gain.gain.value=level;
    const spatial=ctx.createStereoPanner?.();
    if(spatial) {
      spatial.pan.value=pan;
      source.connect(filter).connect(gain).connect(spatial).connect(isolated?unseenFinalBus:unseenCueBus);
    } else source.connect(filter).connect(gain).connect(isolated?unseenFinalBus:unseenCueBus);
    source.start(ctx.currentTime+delay);
    source.onended=()=>{
      source.disconnect(); filter.disconnect(); gain.disconnect(); spatial?.disconnect();
    };
  }

  function playUnseenRoar(closeness = 0) {
    if (!enabled || !ctx || ctx.state !== 'running' || !unseenRoarBuffer || !unseenPanner) return;
    const voice = ctx.createBufferSource();
    voice.buffer = unseenRoarBuffer;
    // Two band-limited resonances supply a vocal quality without a human sample.
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass'; low.frequency.value = 1150;
    const throat = ctx.createBiquadFilter();
    throat.type = 'peaking'; throat.frequency.value = 340;
    throat.Q.value = 0.92; throat.gain.value = 7;
    const gain = ctx.createGain();
    gain.gain.value = 0.37 + 0.20 * closeness;
    voice.connect(low).connect(throat).connect(gain).connect(unseenRoarBus);
    activeUnseenRoars.add(voice);
    voice.onended = () => {
      activeUnseenRoars.delete(voice);
      voice.disconnect(); low.disconnect(); throat.disconnect(); gain.disconnect();
    };
    voice.start();
  }

  function stopUnseenRoars() {
    // Hard-stop voices from the previous attempt before reusing the panner.
    for (const voice of activeUnseenRoars) {
      try { voice.stop(); } catch (_) { /* already stopped */ }
    }
    activeUnseenRoars.clear();
  }

  const setGain = (node, value, seconds = 0.12) => {
    if (!node || !ctx) return;
    node.gain.setTargetAtTime(value, ctx.currentTime, seconds);
  };

  function stopBreathing() {
    if (breathing) {
      breathing.pause();
      try { breathing.currentTime = 0; } catch (_) { /* not decoded */ }
    }
    setGain(breathingGain, 0, 0.06);
  }

  async function toggle() {
    if (enabled) {
      enabled = false;
      stopBreathing();
      stopUnseenRoars();
      setGain(humGain, 0);
      setGain(buzzGain, 0);
      setGain(motorGain, 0);
      setGain(phoneHigh, 0);
      setGain(phoneLow, 0);
      silenceHorrorScore(0.08);
      setGain(nightAirGain, 0, 0.035);
      setGain(nightDroneGain, 0, 0.035);
      setGain(unseenNoiseGain, 0, 0.06);
      setGain(unseenToneGain, 0, 0.06);
      setGain(unseenRoarBus, 0, 0.025);
      setGain(unseenCueBus, 0, 0.035);
      setGain(unseenFinalBus, 0, 0.035);
      return false;
    }
    try {
      init();
      await ctx.resume();
      enabled = true;
      return true;
    } catch (err) {
      console.warn('[Behind.] Audio could not start:', err);
      enabled = false;
      return false;
    }
  }

  function update(progress, reduced, story) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    ensureHorrorScore();
    const t = ctx.currentTime;
    // Shape dread by depth: quiet near the sealed door, hollow on the return.
    const nearDoor = progress > 0.69 && progress < 0.87;
    const atDeadEnd = progress > 0.88;
    const inRearCabin = story.rearElevatorUnlocked && progress < 0.09;
    const returning = story.hasBacktracked;
    const depth = Math.max(0, Math.min(1, (progress - 0.09) / 0.8));
    const quietFactor = nearDoor ? 0.42 : atDeadEnd ? 0.2 : inRearCabin ? 0.28 : 1;
    const returnHollow = returning ? 0.72 : 1;
    const breathZone = !returning && progress >= 0.72 && progress <= 0.86;

    // Fluorescent ballast hum — higher, thinner than the psychological pad.
    humGain._osc?.frequency.setTargetAtTime(120 + Math.sin(t * 0.19) * 1.2, t, 0.4);
    humGain._filter?.frequency.setTargetAtTime(380 + depth * 90, t, 0.45);
    setGain(humGain, 0.0075 * CORRIDOR_GAIN * quietFactor, 0.3);

    // Room air — opens a little as the hall deepens.
    const airSwell = 0.88 + 0.12 * Math.sin(t * 0.11);
    setGain(
      scoreAirGain,
      (0.0028 + depth * 0.0034) * CORRIDOR_GAIN * quietFactor * returnHollow * airSwell,
      0.4
    );
    scoreAirFilter?.frequency.setTargetAtTime(
      (returning ? 190 : 230) + depth * 70 + (breathZone ? 40 : 0), t, 0.5
    );

    // Low beating pad — psychological pressure, not a soundtrack melody.
    const padPulse = 0.9 + 0.1 * Math.sin(t * 0.07);
    setGain(
      scorePadGain,
      (0.0065 + depth * 0.004) * CORRIDOR_GAIN * quietFactor * returnHollow * padPulse,
      0.45
    );
    scorePadLow?.frequency.setTargetAtTime(46.2 + Math.sin(t * 0.05) * 0.35, t, 0.6);
    scorePadHigh?.frequency.setTargetAtTime(
      (returning ? 50.8 : 49.1) + Math.sin(t * 0.053 + 1.2) * 0.45, t, 0.6
    );

    // Tritone tension arrives mid-corridor and thins at the dead end.
    const tensionAmt = Math.max(0, Math.min(1, (progress - 0.28) / 0.45));
    setGain(
      scoreTensionGain,
      (0.001 + tensionAmt * 0.0042) * CORRIDOR_GAIN * quietFactor * (returning ? 0.55 : 1) * padPulse,
      0.5
    );
    scoreTension?.frequency.setTargetAtTime(65.4 + depth * 2.2 + Math.sin(t * 0.09) * 0.8, t, 0.55);

    // High anxiety — swells toward the breathing beat, then collapses.
    const anxietyWave = 0.7 + 0.3 * Math.sin(t * 0.23);
    const anxietyDepth = breathZone ? 1 : depth * 0.55;
    setGain(
      scoreAnxietyGain,
      (0.00015 + anxietyDepth * 0.00085) * CORRIDOR_GAIN * quietFactor * (returning ? 0.35 : 1) * anxietyWave,
      0.35
    );
    scoreAnxiety?.frequency.setTargetAtTime(1860 + Math.sin(t * 0.17) * 28, t, 0.4);

    // Brief fluorescent buzz only during the lighting fault — punctuation, not bed.
    const faulty = !reduced && progress > 0.46 && progress < 0.70;
    const buzzPulse = faulty && Math.sin(progress * 29) > 0.48;
    // Fault adds a 240 Hz harmonic buzz on top of the ballast hum.
    buzzGain._osc?.frequency.setTargetAtTime(240, t, 0.2);
    setGain(buzzGain, (buzzPulse ? 0.01 : 0.0011 * quietFactor) * CORRIDOR_GAIN, 0.085);

    // The far-end elevator is silent and sealed. Only the one BEHIND you
    // produces a motor sound as you walk back toward the beginning.
    const rearMotor = story.rearElevatorUnlocked && progress < 0.21
      ? (progress < 0.028 ? 0.65 : 1) : 0;
    setGain(motorGain, 0.028 * CORRIDOR_GAIN * rearMotor, 0.22);

    // Play the recording only once on the initial forward journey.
    // Reversing after reaching the dead end permanently silences it until Restart.
    if (story.hasBacktracked) {
      if (!breathing.paused) stopBreathing();
      breathArmed = false;
    } else if (breathArmed && !story.reachedDeadEnd && breathing.paused
        && progress >= 0.74 && progress <= 0.85) {
      breathArmed = false;
      try {
        breathing.currentTime = 0;
        const promise = breathing.play();
        promise?.catch(err => console.warn('[Behind.] Breathing playback failed:', err));
      } catch (err) {
        console.warn('[Behind.] Breathing playback failed:', err);
      }
    }
    if (breathing && !breathing.paused) {
      const elapsed = breathing.currentTime;
      if (elapsed >= BREATH_DURATION) {
        stopBreathing();
      } else {
        const fadeIn = Math.min(1, elapsed / 0.55);
        const fadeOut = Math.min(1, (BREATH_DURATION - elapsed) / 0.9);
        // Muffle the recording near the sealed far elevator.
        const doorMuffle = 1 - Math.max(0, Math.min(1, (progress - 0.88) / 0.07));
        const level = BREATH_VOLUME * Math.min(fadeIn, fadeOut) * doorMuffle;
        setGain(breathingGain, Math.max(0, level), 0.04);
      }
    }
  }

  function enterOffice() {
    // Called only after the rear elevator has fully occluded the camera.
    stopBreathing();
    setGain(motorGain, 0);
    setGain(buzzGain, 0);
    silenceHorrorScore(0.35);
    officeAudioOrigin = ctx?.currentTime ?? 0;
  }

  function updateOffice(progress, state) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    setGain(humGain, 0.010, 0.32);
    setGain(buzzGain, 0.00055, 0.32);
    setGain(motorGain, 0, 0.2);
    // Two short bursts, then a long, ordinary pause. Once the protagonist
    // retraces their route, the phone does not ring again this playthrough.
    const ringActive = !state.hasBacktracked && progress > 0.10 && progress < 0.88;
    const phase = (ctx.currentTime - officeAudioOrigin) % 6.6;
    const doublePulse = phase < 0.74 || (phase > 1.08 && phase < 1.82);
    const near = 0.4 + 0.6 * Math.min(1, progress / 0.75);
    const value = ringActive && doublePulse ? 0.0025 * near : 0;
    setGain(phoneHigh, value, 0.045);
    setGain(phoneLow, value * 0.65, 0.045);
  }

  // Quiet, directional double-component latch sound, synthesized locally.
  // One call per office story event; it never loops and has no file dependency.
  function playOfficeLatch() {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const length = Math.ceil(ctx.sampleRate * 0.14);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / ctx.sampleRate;
      const attack = Math.min(1, t / 0.004);
      const decay = Math.exp(-t * 43);
      samples[i] = (Math.random() * 2 - 1) * attack * decay;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 950; filter.Q.value = 0.82;
    const clickGain = ctx.createGain();
    clickGain.gain.value = 0.05;
    const pan = ctx.createStereoPanner?.();
    if (pan) {
      pan.pan.value = 0.43; // Right-hand passage, ahead of the listener.
      noise.connect(filter).connect(clickGain).connect(pan).connect(ctx.destination);
    } else {
      noise.connect(filter).connect(clickGain).connect(ctx.destination);
    }
    noise.start(now);
    noise.stop(now + 0.14);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); clickGain.disconnect(); pan?.disconnect(); };
  }

  function enterRecords() {
    // Even when audio is muted, the chapter transition remains safe.
    // There is no new loud cue: the phone simply stops and the building
    // shifts from modern electrical buzz to near-silence.
    stopBreathing();
    setGain(phoneHigh, 0);
    setGain(phoneLow, 0);
    setGain(buzzGain, 0);
    setGain(motorGain, 0);
  }

  function updateRecords(progress, state) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    // No synthetic "scare" effects, only a low persistent air system which
    // becomes slightly quieter toward the photograph / sorting station.
    const quiet = progress > 0.50 && progress < 0.73 ? 0.48 : 1;
    setGain(humGain, 0.006 * quiet, 0.48);
    setGain(buzzGain, 0, 0.30);
    setGain(motorGain, 0, 0.30);
    setGain(phoneHigh, 0, 0.15);
    setGain(phoneLow, 0, 0.15);
  }

  function enterNight() {
    stopBreathing();
    setGain(phoneHigh, 0);
    setGain(phoneLow, 0);
    setGain(humGain, 0, 0.18);
    setGain(buzzGain, 0);
    setGain(motorGain, 0);
    // Re-entering via a developer jump must never inherit an old drone.
    setGain(nightAirGain, 0, 0.025);
    setGain(nightDroneGain, 0, 0.025);
  }

  function updateNight(progress, state) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    setGain(motorGain, 0, 0.3);
    setGain(phoneHigh, 0, 0.2);
    setGain(phoneLow, 0, 0.2);
    // The final footstep cutoff is latched in the STORY, not timed here.
    // Backtracking or standing still afterward cannot restart the sound.
    if (state.footstepsStopped) {
      // An abrupt hush is the reward: no lingering electric room tone either.
      setGain(nightAirGain, 0, 0.018);
      setGain(nightDroneGain, 0, 0.018);
      setGain(humGain, 0, 0.018);
      setGain(buzzGain, 0, 0.018);
      return;
    }
    if (state.footstepHeard) {
      ensureNightAmbience();
      const pace = Math.max(0, Math.min(1, state.followPace));
      const t = ctx.currentTime;
      // Begin almost inaudibly with the first step, then swell along with the
      // accelerating pursuit. The curved ramp delays obvious volume until the
      // footsteps become urgent, while preserving the existing peak balance.
      const buildup = Math.pow(pace, 1.45);
      const swell = .86 + .14 * Math.sin(t * 1.17);
      setGain(nightAirGain, (.0007 + .0663 * buildup) * swell, .25);
      setGain(nightDroneGain, (.0002 + .0278 * buildup) * swell, .25);
      nightAirFilter.frequency.setTargetAtTime(315 + pace * 185, t, .34);
      nightDroneSource.frequency.setTargetAtTime(43 + pace * 6.5 + Math.sin(t * .49) * 1.2, t, .34);
      // Existing institutional hum withdraws as the new atmosphere takes over.
      setGain(humGain, .0028, .3);
      setGain(buzzGain, .00015, .28);
    } else {
      // Earlier in the level, retain the ordinary air system and no horror bed.
      setGain(nightAirGain, 0, .13);
      setGain(nightDroneGain, 0, .13);
      const quiet = progress > .34 ? .55 : 1;
      setGain(humGain, .0075 * quiet, .42);
      setGain(buzzGain, .0004 * quiet, .32);
    }
  }

  function enterThreshold() {
    setGain(nightAirGain, 0, 0.025);
    setGain(nightDroneGain, 0, 0.025);
    stopBreathing();
    setGain(phoneHigh, 0);
    setGain(phoneLow, 0);
    setGain(buzzGain, 0);
    setGain(motorGain, 0);
    setGain(humGain, 0);
  }

  function updateThreshold(progress, state) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    if (state?.nightmareCleared) {
      // Same-frame cutoff as the scene reveal. A 7ms de-click prevents a
      // speaker pop without sounding like an audible fade-out.
      for (const gain of [humGain,buzzGain,motorGain,phoneHigh,phoneLow]) {
        setGain(gain, 0, 0.007);
      }
      return;
    }
    // The red hall should sound like the building is developing a slow pulse.
    // We stay fully procedural: no jumps, no music cue, just deepening dread.
    const organic = Math.max(0, Math.min(1, (progress - 0.40) / 0.32));
    const red = Math.max(0, Math.min(1, (progress - 0.62) / 0.24));
    const visceral = Math.max(0, Math.min(1, (progress - 0.78) / 0.16));
    const current = ctx.currentTime;
    const throb = 0.74 + 0.18 * Math.sin(current * (1.15 + red * 0.55));
    const shimmer = 0.55 + 0.45 * Math.sin(current * (3.2 + visceral * 1.3) + 0.8);
    const unease = organic * 0.55 + red * 0.30 + visceral * 0.15;
    setGain(humGain, (0.0072 - organic * 0.0025 - visceral * 0.0014) * (0.92 + shimmer * 0.08), 0.32);
    setGain(buzzGain, (0.00025 + red * 0.00055 + visceral * 0.00045) * (0.82 + shimmer * 0.18), 0.24);
    setGain(motorGain, (0.0014 + organic * 0.0038 + red * 0.0032 + visceral * 0.0028) * throb, 0.28);
    // Repurpose the old telephone oscillators into a high, almost-tinnitus
    // room tone and a lower sympathetic whine as the corridor becomes organic.
    setGain(phoneHigh, (red * 0.00065 + visceral * 0.00115) * (0.72 + 0.28 * shimmer), 0.26);
    setGain(phoneLow, (organic * 0.00018 + red * 0.00034 + visceral * 0.00062) * (0.76 + 0.24 * throb), 0.32);
  }

  function enterUnseen() {
    setGain(nightAirGain, 0, 0.025);
    setGain(nightDroneGain, 0, 0.025);
    stopUnseenRoars();
    if (enabled) ensureUnseenSound();
    stopBreathing();
    setGain(humGain, 0);
    setGain(buzzGain, 0);
    setGain(motorGain, 0);
    setGain(phoneHigh, 0);
    setGain(phoneLow, 0);
    setGain(unseenNoiseGain, 0);
    setGain(unseenToneGain, 0);
    setGain(unseenRoarBus, 1, 0.025);
    setGain(unseenCueBus, 1, 0.025);
    setGain(unseenFinalBus, 1, 0.025);
    for (const kind of Object.keys(heardUnseen)) heardUnseen[kind] = 0;
  }

  function updateUnseen(progress, state, camera) {
    // This still runs with SOUND: OFF: events experienced in silence must not
    // be replayed when the user later enables sound or jumps checkpoints.
    if (!enabled || !ctx || ctx.state !== 'running') {
      syncUnseenCues(state);
      return;
    }
    ensureUnseenSound();
    // At the final cutoff the building seems to hold its breath. Even the
    // ongoing electrical room tone almost disappears; ONE last click remains.
    const mute = state.silence;
    setGain(humGain, mute ? .0017 : state.reachedBarrier ? .0032 : .0071,.36);
    setGain(buzzGain, mute ? 0 : state.reachedBarrier ? .00018 : .0004,.24);
    setGain(motorGain, 0, .3);
    setGain(phoneHigh, 0,.2); setGain(phoneLow, 0,.2);

    const closeness = Math.max(0, Math.min(1,(16-state.presenceDistance)/14.2));
    const pace = Math.min(1,state.retreatSpeed/5.5);
    const stopped = state.retreatStarted && state.stillTime > .7;
    // Stopping suppresses the dragging after a moment; the wall answers with
    // a single little tap. Retreating quickly brings urgent, rougher sounds.
    const movement = stopped ? .17 : .75 + .30*pace;
    const pulse = .72 + .16*Math.sin(ctx.currentTime*2.7)
      + .11*Math.sin(ctx.currentTime*(6.7+pace*2));
    const active = state.reachedBarrier && !mute ? 1 : 0;
    setGain(unseenNoiseGain, active*(.17+.22*closeness)*pulse*movement,.11);
    setGain(unseenToneGain,active*(.004+.013*closeness)*movement,.15);
    setGain(unseenRoarBus, mute ? 0 : 1, .018);
    setGain(unseenCueBus, mute ? 0 : 1,.025); // true cutoff of wall cues
    setGain(unseenFinalBus, 1,.04); // last click has its own quiet bus
    if(unseenFilter) unseenFilter.frequency.setTargetAtTime(
      330+closeness*440+pace*85,ctx.currentTime,.13);

    const emitted = (kind,callback) => {
      if(state[kind] > heardUnseen[kind]) {
        if(!mute || kind==='finalClickEvents') callback();
        heardUnseen[kind] = state[kind];
      }
    };
    emitted('tapEvents',()=>{
      playUnseenCue('tap',.82,.095);
      if(!state.stillTapPlayed) playUnseenCue('tap',.82,.05,.28);
    });
    emitted('cabinetEvents',()=>playUnseenCue('latch',.87,.15));
    emitted('roarEvents',()=>playUnseenRoar(closeness));
    emitted('scratchEvents',()=>playUnseenCue('scrape',
      state.scratchSide>0?.92:-.88,.085+.045*pace));
    emitted('ceilingEvents',()=>playUnseenCue('rattle',-.15,.10));
    emitted('cartonEvents',()=>playUnseenCue('cardboard',.68,.065));
    // Intentionally on the RIGHT, very close to the listener. The cabinet
    // they SAW opening is now far down the hallway. An impossible location.
    emitted('finalClickEvents',()=>playUnseenCue('latch',.98,.052,0,true));

    // Place the ongoing drag IN FRONT of the visitor. Unlike Level 04's
    // pursuit, it approaches from the empty space they're forced to face.
    if (camera && unseenPanner) {
      const listener=ctx.listener;
      const px=camera.position.x, py=camera.position.y, pz=camera.position.z;
      const yaw=camera.rotation.y;
      const fx=-Math.sin(yaw), fz=-Math.cos(yaw);
      if(listener.positionX) {
        listener.positionX.setValueAtTime(px,ctx.currentTime);
        listener.positionY.setValueAtTime(py,ctx.currentTime);
        listener.positionZ.setValueAtTime(pz,ctx.currentTime);
        listener.forwardX.setValueAtTime(fx,ctx.currentTime);
        listener.forwardY.setValueAtTime(0,ctx.currentTime);
        listener.forwardZ.setValueAtTime(fz,ctx.currentTime);
        listener.upX.setValueAtTime(0,ctx.currentTime);
        listener.upY.setValueAtTime(1,ctx.currentTime);
        listener.upZ.setValueAtTime(0,ctx.currentTime);
      } else {
        listener.setPosition(px,py,pz);
        listener.setOrientation(fx,0,fz,0,1,0);
      }
      const x=.62+.22*Math.sin(ctx.currentTime*.47);
      const z=pz-state.presenceDistance;
      if(unseenPanner.positionX) {
        unseenPanner.positionX.setValueAtTime(x,ctx.currentTime);
        unseenPanner.positionY.setValueAtTime(1.25,ctx.currentTime);
        unseenPanner.positionZ.setValueAtTime(z,ctx.currentTime);
      } else unseenPanner.setPosition(x,1.25,z);
    }
  }

  function playNightStep(pace = 0, reason = 'following') {
    if (!enabled || !ctx || ctx.state !== 'running' || !nightStepBuffer) return;
    pace = Math.max(0, Math.min(1, pace));
    const source = ctx.createBufferSource();
    source.buffer = nightStepBuffer;
    const baseRate = 0.92 + pace * 0.42;
    const alt = (++nightStepIndex % 2) ? -0.03 : 0.028;
    source.playbackRate.value = baseRate + alt;
    const gain = ctx.createGain();
    // IMPORTANT: this gain feeds the existing 0.095 nightStepBus gain, so
    // per-step values must be around 1.0, NOT 0.08. The previous 005.2
    // values multiplied the signal twice and made footsteps nearly inaudible.
    // Begin at the familiar 004.1 level, then build modestly toward a run.
    gain.gain.value = 0.98 + pace * 0.32 + (reason === 'extra' ? 0.10 : 0);
    source.connect(gain).connect(nightStepBus);
    source.start();
    source.onended = () => { source.disconnect(); gain.disconnect(); };
  }

  function reset() {
    stopUnseenRoars();
    nightStepIndex = 0;
    breathArmed = true;
    stopBreathing();
    setGain(motorGain, 0);
    setGain(phoneHigh, 0);
    setGain(phoneLow, 0);
    silenceHorrorScore(0.08);
    setGain(nightAirGain, 0, 0.025);
    setGain(nightDroneGain, 0, 0.025);
    setGain(unseenNoiseGain, 0, 0.05);
    setGain(unseenToneGain, 0, 0.05);
    setGain(unseenRoarBus, 0, 0.03);
    setGain(unseenCueBus, 0, 0.03);
    setGain(unseenFinalBus, 0, 0.03);
    for(const kind of Object.keys(heardUnseen)) heardUnseen[kind]=0;
  }

  function suspend() { if (ctx?.state === 'running') ctx.suspend().catch(() => {}); }
  function resume() { if (enabled && ctx?.state === 'suspended') ctx.resume().catch(() => {}); }
  function dispose() {
    stopUnseenRoars();
    stopBreathing();
    silenceHorrorScore(0.02);
    try { scoreAirSource?.stop(); scorePadLow?.stop(); scorePadHigh?.stop(); } catch (_) { /* already stopped */ }
    try { scoreTension?.stop(); scoreAnxiety?.stop(); } catch (_) { /* already stopped */ }
    try { unseenNoise?.stop(); unseenTone?.stop(); } catch (_) { /* already stopped */ }
    try { nightAirSource?.stop(); nightDroneSource?.stop(); } catch (_) { /* already stopped */ }
    ctx?.close().catch(() => {});
  }

  return {
    toggle, update, updateOffice, updateRecords, updateNight, updateThreshold, updateUnseen,
    enterOffice, enterRecords, enterNight, enterThreshold, enterUnseen,
    playOfficeLatch, playNightStep, reset, suspend, resume, dispose,
    get enabled() { return enabled; },
  };
}
