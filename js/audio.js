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
const CORRIDOR_GAIN = 5.4; // ambient bed / SFX scale
const HUM_GAIN = 0.0007; // fluorescent ballast — barely-there under the bed
const HUM_FREQ = 280; // audible buzz band (harmonic of ballast, not a low mains thump)
const MUSIC_NOTE_PEAK = 0.022; // dialed up again for clearer motif under the bed
const MUSIC_NOTE_DUR = 6.4; // long release — loneliness needs empty air after
const MUSIC_REVERB_WET = 0.85;
const MUSIC_REVERB_DRY = 0.32;

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
  // Sparse musical motif — ducks under breathing, SFX, and elevator events.
  let musicGain = null;
  let musicDryGain = null;
  let musicWetGain = null;
  let musicConvolver = null;
  let musicNextNote = 0;
  let musicNoteIndex = 0;
  // Level 02: unfinished memory music — a name on the tip of the tongue.
  let officeMusicActive = false;
  let officePadReady = false;
  let officePadGain = null;
  let officePadLow = null;
  let officePadFifth = null;
  let officePadAlmost = null;
  let officePhraseIndex = 0;
  let officePhraseNote = 0;
  // Level 03: near-silence bed — sparse unresolved fragments, long rests.
  let recordsMusicActive = false;
  let recordsNextNote = 0;
  let recordsPhraseIndex = 0;
  let recordsSettleAt = 0;
  let sfxBusyUntil = 0;
  let elevWasUnlocked = false;
  let elevOpenPrev = 0;
  let elevOpenSfxPlayed = false;
  let elevCloseSfxPlayed = false;
  // D Phrygian, mostly falling — regret / empty hallway (flat 2 aches, no bright leading tone).
  // Phrases descend and leave space; occasional wide drop = loneliness.
  const MUSIC_NOTES = [
    220.00, // A3
    174.61, // F3
    155.56, // Eb3
    146.83, // D3
    116.54, // Bb2
    196.00, // G3
    130.81, // C3
    110.00, // A2
    164.81, // E3
    138.59, // C#3 — brief sour neighbor, then fall away
    98.00,  // G2
    146.83, // D3
  ];
  // Office memory phrases: each almost becomes a name, then fails to resolve.
  // notes close together; rest is the empty air after the thought slips.
  const OFFICE_PHRASES = [
    { notes: [220.00, 246.94, 261.63], gaps: [0.62, 0.78], rest: 5.8 }, // A B C — starts the name
    { notes: [293.66, 277.18], gaps: [0.95], rest: 6.4 }, // D Db — wrong contour, almost
    { notes: [164.81, 174.61, 164.81, 155.56], gaps: [0.42, 0.48, 0.85], rest: 7.1 }, // E F E Eb — tasting it
    { notes: [196.00, 174.61], gaps: [1.15], rest: 5.2 }, // G F — gives up mid-breath
    { notes: [261.63], gaps: [], rest: 4.6 }, // lone C — empty mouth
    { notes: [220.00, 207.65, 196.00, 174.61], gaps: [0.88, 0.95, 1.25], rest: 8.2 }, // falls past the tonic
    { notes: [130.81, 146.83, 164.81], gaps: [0.7, 0.55], rest: 6.0 }, // C D E — reaches upward, never lands
  ];
  const OFFICE_NOTE_PEAK = 0.048;
  const OFFICE_NOTE_DUR = 4.8;
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
    // Higher triangle ballast — thin fluorescent buzz, not a sub drone.
    humGain = createVoice(HUM_FREQ, 'triangle', 900);
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

    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicDryGain = ctx.createGain();
    musicDryGain.gain.value = MUSIC_REVERB_DRY;
    musicWetGain = ctx.createGain();
    musicWetGain.gain.value = MUSIC_REVERB_WET;
    // Synthetic IR — long dark hall, no asset download.
    const revSec = 4.2;
    const revLen = Math.ceil(ctx.sampleRate * revSec);
    const impulse = ctx.createBuffer(2, revLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < revLen; i++) {
        const t = i / revLen;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.4) * (ch ? 0.92 : 1);
      }
    }
    musicConvolver = ctx.createConvolver();
    musicConvolver.buffer = impulse;
    musicGain.connect(musicDryGain).connect(ctx.destination);
    musicGain.connect(musicConvolver).connect(musicWetGain).connect(ctx.destination);
    musicNextNote = ctx.currentTime + 1.4;
    musicNoteIndex = 0;
  }

  function silenceHorrorScore(seconds = 0.2) {
    setGain(scoreAirGain, 0, seconds);
    setGain(scorePadGain, 0, seconds);
    setGain(scoreTensionGain, 0, seconds);
    setGain(scoreAnxietyGain, 0, seconds);
    setGain(musicGain, 0, seconds);
    setGain(officePadGain, 0, seconds);
  }

  /**
   * Soft open-fifth bed with a wavering "almost" tone — the feeling of a name
   * without its consonants. Sits under sparse unfinished phrases.
   */
  function ensureOfficeMemoryPad() {
    if (!ctx || officePadReady) return;
    officePadReady = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.55;
    officePadGain = ctx.createGain();
    officePadGain.gain.value = 0;
    officePadLow = ctx.createOscillator();
    officePadLow.type = 'sine';
    officePadLow.frequency.value = 110; // A2
    officePadFifth = ctx.createOscillator();
    officePadFifth.type = 'sine';
    officePadFifth.frequency.value = 164.81; // E3
    officePadAlmost = ctx.createOscillator();
    officePadAlmost.type = 'sine';
    // Slightly sharp of C — the wrong partial of a remembered name.
    officePadAlmost.frequency.value = 264.2;
    const almostAmp = ctx.createGain();
    almostAmp.gain.value = 0.28;
    officePadLow.connect(filter);
    officePadFifth.connect(filter);
    officePadAlmost.connect(almostAmp).connect(filter);
    filter.connect(officePadGain).connect(ctx.destination);
    officePadLow.start();
    officePadFifth.start();
    officePadAlmost.start();
  }

  /** Fragile sine with a detuned ghost — almost unison, never settled. */
  function scheduleOfficeMemoryNote(freq, when, dur = OFFICE_NOTE_DUR) {
    if (!ctx || !musicGain) return;
    const osc = ctx.createOscillator();
    const ghost = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    const ghostAmp = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    ghost.type = 'sine';
    ghost.frequency.value = freq * 1.0045; // tip-of-tongue beat, not harmony
    ghostAmp.gain.value = 0.18;
    filter.type = 'lowpass';
    filter.frequency.value = 780;
    amp.gain.value = 0;
    osc.connect(filter);
    ghost.connect(ghostAmp).connect(filter);
    filter.connect(amp).connect(musicGain);
    const peak = OFFICE_NOTE_PEAK;
    const attack = 1.55;
    const sustainEnd = when + Math.min(1.1, dur * 0.2);
    amp.gain.setValueAtTime(0, when);
    amp.gain.linearRampToValueAtTime(peak, when + attack);
    amp.gain.linearRampToValueAtTime(peak * 0.42, sustainEnd);
    amp.gain.exponentialRampToValueAtTime(0.0008, when + dur);
    osc.start(when);
    ghost.start(when);
    osc.stop(when + dur + 0.12);
    ghost.stop(when + dur + 0.12);
    osc.onended = () => {
      try {
        osc.disconnect(); ghost.disconnect(); ghostAmp.disconnect();
        filter.disconnect(); amp.disconnect();
      } catch (_) { /* ignore */ }
    };
  }

  function advanceOfficeMusic(duck) {
    if (!ctx || !officeMusicActive) return;
    ensureHorrorScore();
    ensureOfficeMemoryPad();
    const t = ctx.currentTime;
    // Pad is the ache; motif is the failed recollection.
    setGain(officePadGain, duck ? 0.008 : 0.028, duck ? 0.18 : 1.4);
    setGain(musicGain, duck ? 0.12 : 1, duck ? 0.14 : 0.85);
    // Slow drift on the "almost" partial — never locks into tune.
    if (officePadAlmost && !duck) {
      const wobble = 261.63 + Math.sin(t * 0.17) * 3.4 + Math.sin(t * 0.41) * 1.6;
      try { officePadAlmost.frequency.setTargetAtTime(wobble, t, 0.65); } catch (_) { /* ignore */ }
    }
    if (duck) return;
    if (musicNextNote < t - 0.05) musicNextNote = t + 1.4;
    const horizon = t + 0.4;
    while (musicNextNote < horizon + 5.5) {
      const phrase = OFFICE_PHRASES[officePhraseIndex % OFFICE_PHRASES.length];
      const note = phrase.notes[officePhraseNote];
      const isLast = officePhraseNote >= phrase.notes.length - 1;
      const dur = isLast ? OFFICE_NOTE_DUR * 1.15 : OFFICE_NOTE_DUR * 0.72;
      scheduleOfficeMemoryNote(note, Math.max(musicNextNote, t + 0.02), dur);
      if (isLast) {
        musicNextNote += (phrase.rest || 5.5);
        officePhraseNote = 0;
        officePhraseIndex += 1;
      } else {
        musicNextNote += phrase.gaps[officePhraseNote] ?? 0.7;
        officePhraseNote += 1;
      }
    }
  }

  function markSfx(seconds = 0.45) {
    if (!ctx) return;
    sfxBusyUntil = Math.max(sfxBusyUntil, ctx.currentTime + seconds);
  }

  /** Lone sine tones — long release into reverb; emptiness between notes is the point. */
  function scheduleMusicNote(freq, when, dur = MUSIC_NOTE_DUR) {
    if (!ctx || !musicGain) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    // Tiny flat detune ghost — regret, not harmony.
    const ghost = ctx.createOscillator();
    const ghostAmp = ctx.createGain();
    ghost.type = 'sine';
    ghost.frequency.value = freq * 0.995;
    ghostAmp.gain.value = 0.22;
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    amp.gain.value = 0;
    osc.connect(filter);
    ghost.connect(ghostAmp).connect(filter);
    filter.connect(amp).connect(musicGain);
    const peak = MUSIC_NOTE_PEAK * CORRIDOR_GAIN;
    const attack = 1.15;
    const sustainEnd = when + Math.min(1.4, dur * 0.22);
    amp.gain.setValueAtTime(0, when);
    amp.gain.linearRampToValueAtTime(peak, when + attack);
    amp.gain.linearRampToValueAtTime(peak * 0.55, sustainEnd);
    amp.gain.exponentialRampToValueAtTime(0.0008, when + dur);
    osc.start(when);
    ghost.start(when);
    osc.stop(when + dur + 0.1);
    ghost.stop(when + dur + 0.1);
    osc.onended = () => {
      try {
        osc.disconnect(); ghost.disconnect(); ghostAmp.disconnect();
        filter.disconnect(); amp.disconnect();
      } catch (_) { /* ignore */ }
    };
  }

  function advanceMusic(duck) {
    if (!ctx || !musicGain) return;
    const t = ctx.currentTime;
    const target = duck ? 0.08 : 1;
    setGain(musicGain, target, duck ? 0.12 : 0.55);
    if (duck) return;
    if (musicNextNote < t - 0.05) musicNextNote = t + 0.8;
    const horizon = t + 0.35;
    while (musicNextNote < horizon + 4.5) {
      const freq = MUSIC_NOTES[musicNoteIndex % MUSIC_NOTES.length];
      const dur = MUSIC_NOTE_DUR + (musicNoteIndex % 3) * 0.55;
      scheduleMusicNote(freq, Math.max(musicNextNote, t + 0.02), dur);
      // Wide gaps between attacks — loneliness lives in the silence.
      musicNextNote += 3.4 + (musicNoteIndex % 5) * 0.75;
      musicNoteIndex += 1;
    }
  }

  function playNoiseBurst({ duration = 0.2, band = 800, q = 0.8, level = 0.04, pan = 0 }) {
    if (!enabled || !ctx) return;
    const length = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const env = Math.exp(-i / ctx.sampleRate * (4 / duration));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = band;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = level * CORRIDOR_GAIN;
    const spatial = ctx.createStereoPanner?.();
    if (spatial) {
      spatial.pan.value = pan;
      source.connect(filter).connect(gain).connect(spatial).connect(ctx.destination);
    } else {
      source.connect(filter).connect(gain).connect(ctx.destination);
    }
    source.start();
    source.onended = () => {
      source.disconnect(); filter.disconnect(); gain.disconnect(); spatial?.disconnect();
    };
    markSfx(duration + 0.15);
  }

  function playTone({ freq = 440, freq2 = 0, duration = 0.3, level = 0.05, type = 'sine', pan = 0 }) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.value = 0;
    const spatial = ctx.createStereoPanner?.();
    if (spatial) {
      spatial.pan.value = pan;
      osc.connect(amp).connect(spatial).connect(ctx.destination);
    } else {
      osc.connect(amp).connect(ctx.destination);
    }
    const peak = level * CORRIDOR_GAIN;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0008, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.02);
    if (freq2 > 0) {
      const oscB = ctx.createOscillator();
      const ampB = ctx.createGain();
      oscB.type = type;
      oscB.frequency.value = freq2;
      ampB.gain.value = 0;
      if (spatial) oscB.connect(ampB).connect(spatial);
      else oscB.connect(ampB).connect(ctx.destination);
      ampB.gain.setValueAtTime(0, t);
      ampB.gain.linearRampToValueAtTime(peak * 0.65, t + 0.018);
      ampB.gain.exponentialRampToValueAtTime(0.0008, t + duration * 1.05);
      oscB.start(t);
      oscB.stop(t + duration + 0.03);
      oscB.onended = () => { oscB.disconnect(); ampB.disconnect(); };
    }
    osc.onended = () => { osc.disconnect(); amp.disconnect(); spatial?.disconnect(); };
    markSfx(duration + 0.1);
  }

  function playUnlock() {
    if (!enabled || !ctx) return;
    // Tumbler giving way — heavier than a deadbolt rattle.
    playTone({ freq: 380, freq2: 520, duration: 0.16, level: 0.03, type: 'triangle', pan: 0.3 });
    playNoiseBurst({ duration: 0.18, band: 1100, q: 1.1, level: 0.028, pan: 0.3 });
    window.setTimeout(() => {
      playTone({ freq: 240, duration: 0.22, level: 0.022, type: 'sine', pan: 0.28 });
    }, 90);
    // Soft hinge creak as the unused door swings into the room.
    window.setTimeout(() => {
      playNoiseBurst({ duration: 0.62, band: 260, q: 0.42, level: 0.022, pan: 0.48 });
      playTone({ freq: 78, freq2: 48, duration: 0.78, level: 0.018, type: 'triangle', pan: 0.48 });
    }, 140);
  }

  function playHallDoorCascade() {
    if (!enabled || !ctx) return;
    // Distant hallway doors answering the elevator seal — staggered, soft, uneven.
    const beats = [
      { at: 140, pan: 0.35, level: 0.016 },
      { at: 520, pan: -0.4, level: 0.014 },
      { at: 880, pan: 0.55, level: 0.018 },
      { at: 1280, pan: -0.25, level: 0.012 },
      { at: 1700, pan: 0.2, level: 0.015 },
      { at: 2100, pan: -0.5, level: 0.013 },
    ];
    for (const beat of beats) {
      window.setTimeout(() => {
        if (!enabled || !ctx) return;
        playNoiseBurst({
          duration: 0.45 + beat.level * 4,
          band: 220 + beat.pan * 40,
          q: 0.4,
          level: beat.level,
          pan: beat.pan,
        });
        playTone({
          freq: 70 + Math.abs(beat.pan) * 30,
          freq2: 42,
          duration: 0.55,
          level: beat.level * 0.7,
          type: 'triangle',
          pan: beat.pan,
        });
      }, beat.at);
    }
  }

  function playInteract(id) {
    if (!enabled || !ctx) return;
    if (id === 'brass-key') {
      playTone({ freq: 660, freq2: 990, duration: 0.12, level: 0.02, type: 'triangle', pan: 0.25 });
      playNoiseBurst({ duration: 0.1, band: 1600, q: 1.2, level: 0.016, pan: 0.25 });
      return;
    }
    if (String(id).startsWith('stuffed-dragon')) {
      // Soft fabric take — muted, close.
      playNoiseBurst({ duration: 0.14, band: 480, q: 0.7, level: 0.018, pan: -0.15 });
      playTone({ freq: 220, duration: 0.16, level: 0.012, type: 'sine', pan: -0.15 });
      return;
    }
    if (id === 'office-lighter') {
      // Plastic shell tap — dry, close, no flame.
      playNoiseBurst({ duration: 0.09, band: 900, q: 1.1, level: 0.02, pan: 0.3 });
      playTone({ freq: 310, duration: 0.08, level: 0.012, type: 'triangle', pan: 0.28 });
      return;
    }
    if (id === 'sticky-note' || id === 'office-sticky-note') {
      playNoiseBurst({ duration: 0.07, band: 700, q: 0.8, level: 0.014, pan: 0.2 });
      return;
    }
    if (id === 'office-key-fob' || id === 'key-fob') {
      playTone({ freq: 520, duration: 0.07, level: 0.014, type: 'triangle', pan: 0.22 });
      playNoiseBurst({ duration: 0.06, band: 1200, q: 1.1, level: 0.012, pan: 0.22 });
      return;
    }
    if (id === 'office-keypad') {
      playTone({ freq: 440, duration: 0.06, level: 0.012, type: 'square', pan: 0.35 });
      return;
    }
    if (id === 'keypad-digit') {
      playTone({ freq: 680, duration: 0.045, level: 0.014, type: 'square', pan: 0 });
      return;
    }
    if (id === 'keypad-clear') {
      playTone({ freq: 280, duration: 0.05, level: 0.01, type: 'triangle', pan: 0 });
      return;
    }
    if (id === 'keypad-wrong') {
      playTone({ freq: 160, freq2: 110, duration: 0.18, level: 0.02, type: 'sawtooth', pan: 0 });
      playNoiseBurst({ duration: 0.12, band: 400, q: 0.6, level: 0.016, pan: 0 });
      return;
    }
    if (id === 'locked-doorknob') {
      // Deadbolt / handle rattle — short metallic clicks.
      playTone({ freq: 920, freq2: 1380, duration: 0.09, level: 0.028, type: 'triangle', pan: 0.35 });
      playNoiseBurst({ duration: 0.12, band: 1400, q: 1.4, level: 0.022, pan: 0.35 });
      window.setTimeout(() => {
        playTone({ freq: 640, duration: 0.07, level: 0.016, type: 'square', pan: 0.32 });
      }, 55);
      return;
    }
    if (id === 'far-elevator-call') {
      // Dead call button — dull plastic tap, no chime of life.
      playNoiseBurst({ duration: 0.08, band: 520, q: 0.7, level: 0.03, pan: 0.05 });
      playTone({ freq: 180, duration: 0.11, level: 0.02, type: 'triangle', pan: 0.05 });
      return;
    }
    if (id === 'altered-door' || id === 'door-plaque' || id === 'exit-sign') {
      playTone({ freq: 410, duration: 0.08, level: 0.012, type: 'sine', pan: 0 });
      playNoiseBurst({ duration: 0.06, band: 900, q: 0.9, level: 0.01, pan: 0 });
    }
  }

  function playElevatorDing() {
    // Soft arrival/departure chime — two partials, short decay.
    playTone({ freq: 784, freq2: 1175, duration: 0.85, level: 0.038, type: 'sine', pan: -0.15 });
  }

  function playElevatorDoors(opening) {
    if (opening) {
      playNoiseBurst({ duration: 0.55, band: 420, q: 0.55, level: 0.028, pan: -0.2 });
      playTone({ freq: 95, duration: 0.45, level: 0.018, type: 'triangle', pan: -0.2 });
    } else {
      playNoiseBurst({ duration: 0.48, band: 360, q: 0.6, level: 0.03, pan: -0.15 });
      playTone({ freq: 110, freq2: 70, duration: 0.35, level: 0.02, type: 'triangle', pan: -0.15 });
    }
  }

  function syncElevatorAudio(story, elev = {}) {
    if (!enabled || !ctx) return;
    const unlocked = Boolean(story?.rearElevatorUnlocked);
    const openAmount = elev.openAmount ?? 0;
    const closure = elev.closureProgress ?? 0;

    if (unlocked && !elevWasUnlocked) {
      // No arrival ding on unlock — chime only after the doors close behind you.
      elevOpenSfxPlayed = false;
      elevCloseSfxPlayed = false;
    }
    elevWasUnlocked = unlocked;

    if (unlocked && openAmount > 0.18 && elevOpenPrev <= 0.18 && !elevOpenSfxPlayed) {
      playElevatorDoors(true);
      elevOpenSfxPlayed = true;
    }
    if (unlocked && (closure > 0.15 || (openAmount < 0.85 && elevOpenPrev >= 0.85 && story.enteredRearElevator))) {
      if (!elevCloseSfxPlayed && (closure > 0.12 || openAmount < elevOpenPrev - 0.04)) {
        playElevatorDoors(false);
        elevCloseSfxPlayed = true;
        // Second soft ding as the car commits to moving.
        window.setTimeout(() => playElevatorDing(), 280);
      }
    }
    elevOpenPrev = openAmount;
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
      officeMusicActive = false;
      musicNextNote = 0;
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

  function update(progress, reduced, story, elev = {}) {
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

    syncElevatorAudio(story, elev);

    // Fluorescent ballast hum — higher, thinner than the psychological pad.
    humGain._osc?.frequency.setTargetAtTime(HUM_FREQ + Math.sin(t * 0.19) * 3.5, t, 0.4);
    humGain._filter?.frequency.setTargetAtTime(780 + depth * 120, t, 0.45);
    setGain(humGain, HUM_GAIN * CORRIDOR_GAIN * quietFactor, 0.3);

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

    // High anxiety ring — keep present but quieter (was piercing on laptop tweeters).
    const anxietyWave = 0.7 + 0.3 * Math.sin(t * 0.23);
    const anxietyDepth = breathZone ? 1 : depth * 0.55;
    setGain(
      scoreAnxietyGain,
      (0.00006 + anxietyDepth * 0.00035) * CORRIDOR_GAIN * quietFactor * (returning ? 0.35 : 1) * anxietyWave,
      0.35
    );
    scoreAnxiety?.frequency.setTargetAtTime(1860 + Math.sin(t * 0.17) * 28, t, 0.4);

    // Light fault is visual only — no buzz/strobe sound.
    setGain(buzzGain, 0, 0.12);

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
    let breathAudible = false;
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
        breathAudible = level > 0.002;
      }
    }

    // Musical motif fades under accents so SFX / breathing stay clear.
    const duckMusic = breathAudible || rearMotor > 0.05 || t < sfxBusyUntil
      || atDeadEnd || inRearCabin;
    advanceMusic(duckMusic);
  }

  function enterOffice() {
    // Called only after the rear elevator has fully occluded the camera.
    stopBreathing();
    recordsMusicActive = false;
    setGain(motorGain, 0);
    setGain(buzzGain, 0);
    silenceHorrorScore(0.35);
    officeAudioOrigin = ctx?.currentTime ?? 0;
    officeMusicActive = true;
    officePhraseIndex = 0;
    officePhraseNote = 0;
    musicNoteIndex = 0;
    musicNextNote = (ctx?.currentTime ?? 0) + 2.6;
    if (ctx) {
      ensureHorrorScore();
      ensureOfficeMemoryPad();
      // Slightly wetter hall for unfinished thoughts.
      setGain(musicDryGain, 0.22, 0.01);
      setGain(musicWetGain, 0.92, 0.01);
    }
  }

  function updateOffice(progress, state) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    setGain(humGain, 0.007, 0.4);
    setGain(buzzGain, 0.00035, 0.4);
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
    const t = ctx.currentTime;
    const duckMusic = (ringActive && doublePulse && value > 0.0008) || t < sfxBusyUntil;
    advanceOfficeMusic(duckMusic);
  }

  // Quiet, directional double-component latch sound, synthesized locally.
  // One call per office story event; it never loops and has no file dependency.
  function playOfficeLatch() {
    // Soft distant keypad chirp — invites investigation without opening the door.
    if (!enabled || !ctx || ctx.state !== 'running') return;
    playTone({ freq: 880, duration: 0.07, level: 0.016, type: 'square', pan: 0.42 });
    window.setTimeout(() => {
      playTone({ freq: 660, duration: 0.09, level: 0.012, type: 'square', pan: 0.4 });
    }, 90);
  }

  const RECORDS_PHRASES = [
    { notes: [196.0, 207.65], gaps: [2.8], rest: 11.5 },
    { notes: [174.61], gaps: [], rest: 14.0 },
    { notes: [220.0, 233.08], gaps: [3.4], rest: 12.5 },
    { notes: [164.81, 155.56], gaps: [4.0], rest: 15.0 },
  ];

  function scheduleRecordsFragment(freq, when, dur = 5.8) {
    if (!ctx || !musicGain) return;
    const osc = ctx.createOscillator();
    const ghost = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    const ghostAmp = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    ghost.type = 'sine';
    ghost.frequency.value = freq * 1.0038;
    ghostAmp.gain.value = 0.14;
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    amp.gain.value = 0;
    osc.connect(filter);
    ghost.connect(ghostAmp).connect(filter);
    filter.connect(amp).connect(musicGain);
    const peak = 0.011;
    amp.gain.setValueAtTime(0, when);
    amp.gain.linearRampToValueAtTime(peak, when + 1.8);
    amp.gain.linearRampToValueAtTime(peak * 0.35, when + Math.min(2.2, dur * 0.35));
    amp.gain.exponentialRampToValueAtTime(0.0006, when + dur);
    osc.start(when);
    ghost.start(when);
    osc.stop(when + dur + 0.1);
    ghost.stop(when + dur + 0.1);
    osc.onended = () => {
      try {
        osc.disconnect(); ghost.disconnect(); ghostAmp.disconnect();
        filter.disconnect(); amp.disconnect();
      } catch (_) { /* ignore */ }
    };
  }

  function advanceRecordsMusic(duck) {
    if (!ctx || !recordsMusicActive) return;
    ensureHorrorScore();
    const t = ctx.currentTime;
    setGain(musicGain, duck ? 0.04 : 0.55, duck ? 0.35 : 1.2);
    setGain(scorePadGain, duck ? 0.004 : 0.012, duck ? 0.4 : 1.5);
    if (duck) return;
    if (recordsNextNote < t - 0.05) recordsNextNote = t + 2.2;
    const horizon = t + 0.35;
    while (recordsNextNote < horizon + 6.5) {
      const phrase = RECORDS_PHRASES[recordsPhraseIndex % RECORDS_PHRASES.length];
      const note = phrase.notes[0];
      // One or two notes, then a long empty rest — incomplete recollection.
      scheduleRecordsFragment(note, Math.max(recordsNextNote, t + 0.02), 5.5);
      if (phrase.notes.length > 1) {
        scheduleRecordsFragment(
          phrase.notes[1],
          Math.max(recordsNextNote, t + 0.02) + (phrase.gaps[0] || 3),
          4.8
        );
      }
      recordsNextNote += (phrase.rest || 12);
      recordsPhraseIndex += 1;
    }
  }

  function enterRecords() {
    stopBreathing();
    officeMusicActive = false;
    recordsMusicActive = true;
    recordsNextNote = 0;
    recordsPhraseIndex = 0;
    recordsSettleAt = 0;
    setGain(phoneHigh, 0);
    setGain(phoneLow, 0);
    setGain(buzzGain, 0);
    setGain(motorGain, 0);
    silenceHorrorScore(0.5);
    ensureHorrorScore();
    setGain(musicDryGain, 0.22, 0.01);
    setGain(musicWetGain, 0.9, 0.01);
    setGain(humGain, 0.0045, 0.8);
    setGain(musicGain, 0.4, 1.8);
    setGain(scorePadGain, 0.01, 1.5);
  }

  function updateRecords(progress, state) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    setGain(phoneHigh, 0, 0.15);
    setGain(phoneLow, 0, 0.15);
    setGain(motorGain, 0, 0.3);
    // Thin ballast + HVAC; quieter near the photograph.
    const atPhoto = progress > 0.50 && progress < 0.70;
    const quiet = atPhoto ? 0.42 : 1;
    setGain(humGain, 0.0048 * quiet, 0.55);
    setGain(buzzGain, 0.0012 * quiet, 0.6);
    advanceRecordsMusic(atPhoto);
    // Rare distant metal settle — never a scare, never near the photo.
    const t = ctx.currentTime;
    if (!atPhoto && progress > 0.2 && progress < 0.85
        && t > recordsSettleAt && Math.random() < 0.0035) {
      recordsSettleAt = t + 9 + Math.random() * 14;
      playNoiseBurst({
        duration: 0.55 + Math.random() * 0.35,
        band: 180 + Math.random() * 90,
        q: 0.45,
        level: 0.008,
        pan: (Math.random() * 2 - 1) * 0.55,
      });
    }
    void state;
  }

  /** Fob tap → soft beep → latch → quiet hinge. One-shot via story unlock. */
  function playRecordsFobAccess() {
    if (!enabled || !ctx) return;
    resume();
    const t = ctx.currentTime;
    // Plastic/metal contact
    playNoiseBurst({ duration: 0.05, band: 1400, q: 1.2, level: 0.014, pan: -0.25 });
    playTone({ freq: 480, duration: 0.05, level: 0.01, type: 'triangle', pan: -0.25 });
    // Soft electronic confirmation — one beep, not a chime
    window.setTimeout(() => {
      if (!enabled || !ctx) return;
      playTone({ freq: 920, duration: 0.07, level: 0.016, type: 'sine', pan: -0.22 });
    }, 90);
    // Mechanical latch
    window.setTimeout(() => {
      if (!enabled || !ctx) return;
      playTone({ freq: 210, freq2: 140, duration: 0.14, level: 0.02, type: 'triangle', pan: -0.1 });
      playNoiseBurst({ duration: 0.12, band: 700, q: 1.0, level: 0.016, pan: -0.1 });
    }, 220);
    // Quiet heavy hinge
    window.setTimeout(() => {
      if (!enabled || !ctx) return;
      playNoiseBurst({ duration: 0.7, band: 240, q: 0.4, level: 0.015, pan: 0.15 });
      playTone({ freq: 68, freq2: 42, duration: 0.85, level: 0.012, type: 'triangle', pan: 0.15 });
    }, 380);
    markSfx(1.4);
  }

  function enterNight() {
    stopBreathing();
    recordsMusicActive = false;
    setGain(phoneHigh, 0);
    setGain(phoneLow, 0);
    setGain(humGain, 0, 0.18);
    setGain(buzzGain, 0);
    setGain(motorGain, 0);
    silenceHorrorScore(0.4);
    setGain(musicDryGain, MUSIC_REVERB_DRY, 0.01);
    setGain(musicWetGain, MUSIC_REVERB_WET, 0.01);
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
    officeMusicActive = false;
    officePhraseIndex = 0;
    officePhraseNote = 0;
    recordsMusicActive = false;
    recordsNextNote = 0;
    recordsPhraseIndex = 0;
    silenceHorrorScore(0.08);
    setGain(musicDryGain, MUSIC_REVERB_DRY, 0.01);
    setGain(musicWetGain, MUSIC_REVERB_WET, 0.01);
    elevWasUnlocked = false;
    elevOpenPrev = 0;
    elevOpenSfxPlayed = false;
    elevCloseSfxPlayed = false;
    musicNoteIndex = 0;
    musicNextNote = ctx ? ctx.currentTime + 1.2 : 0;
    sfxBusyUntil = 0;
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
  let memoryRainSource = null;
  let memoryRainGain = null;
  let memoryRainFilter = null;

  function stopMemoryRain(seconds = 0.4) {
    if (!memoryRainGain) return;
    setGain(memoryRainGain, 0, seconds);
  }

  function dispose() {
    stopUnseenRoars();
    stopBreathing();
    stopMemoryRain(0.02);
    try { memoryRainSource?.stop(); } catch (_) { /* already stopped */ }
    memoryRainSource = null;
    memoryRainGain = null;
    memoryRainFilter = null;
    silenceHorrorScore(0.02);
    try { scoreAirSource?.stop(); scorePadLow?.stop(); scorePadHigh?.stop(); } catch (_) { /* already stopped */ }
    try { scoreTension?.stop(); scoreAnxiety?.stop(); } catch (_) { /* already stopped */ }
    try { officePadLow?.stop(); officePadFifth?.stop(); officePadAlmost?.stop(); } catch (_) { /* already stopped */ }
    try { unseenNoise?.stop(); unseenTone?.stop(); } catch (_) { /* already stopped */ }
    try { nightAirSource?.stop(); nightDroneSource?.stop(); } catch (_) { /* already stopped */ }
    ctx?.close().catch(() => {});
  }

  function ensureMemoryRain() {
    if (!ctx || memoryRainSource) return;
    const count = Math.ceil(ctx.sampleRate * 2.4);
    const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < count; i += 1) data[i] = (Math.random() * 2 - 1) * 0.55;
    memoryRainSource = ctx.createBufferSource();
    memoryRainSource.buffer = buffer;
    memoryRainSource.loop = true;
    memoryRainFilter = ctx.createBiquadFilter();
    memoryRainFilter.type = 'bandpass';
    memoryRainFilter.frequency.value = 1800;
    memoryRainFilter.Q.value = 0.55;
    memoryRainGain = ctx.createGain();
    memoryRainGain.gain.value = 0;
    memoryRainSource.connect(memoryRainFilter);
    memoryRainFilter.connect(memoryRainGain);
    memoryRainGain.connect(ctx.destination);
    try { memoryRainSource.start(); } catch (_) { /* already started */ }
  }

  function enterMemoryStaging() {
    stopBreathing();
    stopMemoryRain(0.3);
    officeMusicActive = false;
    silenceHorrorScore(0.35);
    setGain(phoneHigh, 0);
    setGain(phoneLow, 0);
    setGain(buzzGain, 0);
    setGain(motorGain, 0);
    setGain(humGain, 0.004, 0.4);
  }

  function enterMemoryWhite() {
    stopMemoryRain(0.5);
    officeMusicActive = false;
    silenceHorrorScore(0.5);
    setGain(humGain, 0.0006, 0.8);
    setGain(buzzGain, 0, 0.4);
    // Soft warm bed — somewhere you might stay awhile.
    ensureHorrorScore();
    setGain(musicGain, 0.22, 1.6);
    setGain(musicDryGain, 0.55, 0.01);
    setGain(musicWetGain, 0.5, 0.01);
  }

  function enterMemoryBlack() {
    officeMusicActive = false;
    silenceHorrorScore(0.55);
    setGain(humGain, 0.0008, 0.6);
    setGain(buzzGain, 0, 0.4);
    ensureHorrorScore();
    setGain(musicGain, 0.14, 1.4);
    setGain(musicDryGain, 0.28, 0.01);
    setGain(musicWetGain, 0.82, 0.01);
    ensureMemoryRain();
    setGain(memoryRainGain, 0.045, 1.8);
  }

  function updateMemoryHome(_progress, state) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    setGain(phoneHigh, 0, 0.1);
    setGain(phoneLow, 0, 0.1);
    setGain(buzzGain, 0, 0.2);
    setGain(motorGain, 0, 0.2);
    const black = state?.variant === 'black';
    if (state?.phase === 'memory') {
      setGain(humGain, black ? 0.0006 : 0.0005, 0.5);
      setGain(musicGain, black ? 0.16 : 0.24, 0.9);
      if (black) {
        ensureMemoryRain();
        setGain(memoryRainGain, 0.05, 0.8);
      } else {
        stopMemoryRain(0.6);
      }
    } else {
      setGain(humGain, 0.004, 0.4);
      setGain(musicGain, 0.06, 0.5);
      stopMemoryRain(0.5);
    }
  }

  function updateMemoryWhite(progress, state) {
    updateMemoryHome(progress, state);
  }

  function updateMemoryBlack(progress, state) {
    updateMemoryHome(progress, state);
  }

  function exitMemoryWhite() {
    stopMemoryRain(0.5);
    silenceHorrorScore(0.45);
    setGain(musicDryGain, MUSIC_REVERB_DRY, 0.01);
    setGain(musicWetGain, MUSIC_REVERB_WET, 0.01);
    setGain(humGain, 0.004, 0.4);
  }

  const exitMemoryBlack = exitMemoryWhite;

  /** Keys lift + door open/close — ordinary, not horror. Once per visit via story latch. */
  function playMemoryDoorLeave() {
    if (!enabled || !ctx) return;
    resume();
    const t = ctx.currentTime;
    // Soft key jingle
    for (let i = 0; i < 3; i += 1) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.value = 1800 + i * 420 + Math.random() * 80;
      f.type = 'bandpass';
      f.frequency.value = 2400;
      f.Q.value = 4;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.012, t + 0.02 + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18 + i * 0.05);
      osc.connect(f);
      f.connect(g);
      g.connect(ctx.destination);
      osc.start(t + i * 0.05);
      osc.stop(t + 0.25 + i * 0.05);
    }
    // Door open then close (filtered noise bursts)
    const mkDoor = (at, peak, dur) => {
      const count = Math.ceil(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < count; i += 1) data[i] = (Math.random() * 2 - 1) * 0.7;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      src.start(at);
      src.stop(at + dur + 0.02);
    };
    mkDoor(t + 0.35, 0.035, 0.45);
    mkDoor(t + 1.05, 0.05, 0.55);
  }

  return {
    toggle, update, updateOffice, updateRecords, updateNight, updateThreshold, updateUnseen,
    updateMemoryWhite, updateMemoryBlack, updateMemoryHome,
    enterOffice, enterRecords, enterNight, enterThreshold, enterUnseen,
    enterMemoryStaging, enterMemoryWhite, enterMemoryBlack, exitMemoryWhite, exitMemoryBlack,
    playMemoryDoorLeave,
    playOfficeLatch, playNightStep, playInteract, playUnlock, playHallDoorCascade,
    playRecordsFobAccess,
    reset, suspend, resume, dispose,
    get enabled() { return enabled; },
  };
}
