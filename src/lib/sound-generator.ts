"use client";

// Web Audio API Procedural Sound Generator for GDR Master Room
// Generates high-quality, zero-latency RPG UI sound effects directly via browser oscillators.

let audioCtx: AudioContext | null = null;
let uiSoundsEnabled = true;

// Initialize state from localStorage if available
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("gdr_ui_sounds_enabled");
  if (saved !== null) {
    uiSoundsEnabled = saved === "true";
  }
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isUiSoundsEnabled(): boolean {
  return uiSoundsEnabled;
}

export function toggleUiSounds(enabled: boolean): void {
  uiSoundsEnabled = enabled;
  if (typeof window !== "undefined") {
    localStorage.setItem("gdr_ui_sounds_enabled", enabled ? "true" : "false");
  }
}

// Sound 1: Click (Interazione pulsante - Tono pietra/legno morbido)
export function playUiClick() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Connettiamo un oscillatore principale e uno di risonanza profonda
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, now);

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);

    // Rumore percussivo ad alta frequenza per simulare l'impatto fisico
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = "sine";
    clickOsc.frequency.setValueAtTime(1200, now);
    clickOsc.frequency.exponentialRampToValueAtTime(600, now + 0.015);
    clickGain.gain.setValueAtTime(0.05, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.02);
  } catch {
  }
}

// Sound 2: Hover (Passaggio del mouse - Sottile fruscio o click delicato)
export function playUiHover() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.04);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(600, now);
    filter.Q.setValueAtTime(1.0, now);

    gainNode.gain.setValueAtTime(0.03, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch (error) {
    // Silently catch audio block exceptions
  }
}

// Sound 3: Dice Rolling (Sequenza di piccoli colpi fisici)
export function playUiDiceRoll() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Generiamo 4 piccoli impatti ravvicinati ad intervalli casuali
    const delays = [0.0, 0.08, 0.15, 0.22, 0.32];
    delays.forEach((delay, idx) => {
      const hitTime = now + delay;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Pitch leggermente casuale per simulare la rotazione reale del dado
      const pitch = 220 + Math.random() * 180;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(pitch, hitTime);
      osc.frequency.exponentialRampToValueAtTime(60, hitTime + 0.06);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, hitTime);

      // L'ultimo impatto è leggermente più rumoroso
      const volume = idx === delays.length - 1 ? 0.18 : 0.12;
      gainNode.gain.setValueAtTime(volume, hitTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.06);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(hitTime);
      osc.stop(hitTime + 0.07);
    });
  } catch {
  }
}

// Sound 4: Whisper (Sussurro / Messaggio Segreto - Flusso magico)
export function playUiWhisper() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.linearRampToValueAtTime(650, now + 0.65);

    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(155, now);
    osc2.frequency.linearRampToValueAtTime(640, now + 0.65);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.linearRampToValueAtTime(1200, now + 0.65);
    filter.Q.setValueAtTime(1.5, now);

    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);
  } catch {
  }
}

// Sound 5: Successo Critico (Chime / Arpeggio magico solenne)
export function playUiCriticalSuccess() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Arpeggio di 4 note in scala maggiore (C4, E4, G4, C5)
    const notes = [261.63, 329.63, 392.0, 523.25];
    const delays = [0.0, 0.08, 0.16, 0.24];

    delays.forEach((delay, idx) => {
      const noteTime = now + delay;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(notes[idx], noteTime);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2000, noteTime);

      gainNode.gain.setValueAtTime(0.08, noteTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.6);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.65);
    });

    // Risonanza solenne a bassa frequenza (gong)
    const gong = ctx.createOscillator();
    const gongGain = ctx.createGain();
    gong.type = "triangle";
    gong.frequency.setValueAtTime(130.81, now); // C3
    gongGain.gain.setValueAtTime(0.15, now);
    gongGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    gong.connect(gongGain);
    gongGain.connect(ctx.destination);
    gong.start(now);
    gong.stop(now + 1.25);
  } catch {
  }
}

// Sound 6: Fallimento Critico (Ominoso calo di pitch cupo)
export function playUiCriticalFailure() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscLow = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.9);

    oscLow.type = "sine";
    oscLow.frequency.setValueAtTime(90, now);
    oscLow.frequency.linearRampToValueAtTime(30, now + 0.9);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(250, now);
    filter.frequency.linearRampToValueAtTime(80, now + 0.9);

    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

    osc.connect(filter);
    oscLow.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    oscLow.start(now);
    osc.stop(now + 1.0);
    oscLow.stop(now + 1.0);
  } catch {
  }
}

// Sound 7: Modal Open (Swell d'ingresso olografico o magico)
export function playUiModalOpen() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.22);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000, now);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch (error) {
    // Blocked or not supported
  }
}

// Sound 8: Modal Close (Fading rapido)
export function playUiModalClose() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.15);

    gainNode.gain.setValueAtTime(0.06, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  } catch (error) {
    // Blocked
  }
}

// Sound 9: Damage (Impatto cupo e battito cardiaco per feedback perdita HP)
export function playUiDamage() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Impatto sordo e cupo (frequenze molto basse)
    const impactOsc = ctx.createOscillator();
    const impactGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    impactOsc.type = "sine";
    impactOsc.frequency.setValueAtTime(90, now);
    impactOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, now);

    impactGain.gain.setValueAtTime(0.35, now);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    impactOsc.connect(filter);
    filter.connect(impactGain);
    impactGain.connect(ctx.destination);

    impactOsc.start(now);
    impactOsc.stop(now + 0.35);

    // Doppio battito cardiaco accelerato (0.05s e 0.25s)
    const beats = [0.05, 0.25];
    beats.forEach((delay) => {
      const beatTime = now + delay;
      const beatOsc = ctx.createOscillator();
      const beatGain = ctx.createGain();
      const beatFilter = ctx.createBiquadFilter();

      beatOsc.type = "triangle";
      beatOsc.frequency.setValueAtTime(55, beatTime);
      beatOsc.frequency.exponentialRampToValueAtTime(25, beatTime + 0.15);

      beatFilter.type = "lowpass";
      beatFilter.frequency.setValueAtTime(80, beatTime);

      beatGain.gain.setValueAtTime(0.3, beatTime);
      beatGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.15);

      beatOsc.connect(beatFilter);
      beatFilter.connect(beatGain);
      beatGain.connect(ctx.destination);
 
      beatOsc.start(beatTime);
      beatOsc.stop(beatTime + 0.18);
    });
  } catch {
  }
}

// Sound 10: Cinematic Danger (Cupo battito cardiaco accelerato + sweep cupo)
export function playUiCinematicDanger() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Sweep di sottofondo a bassa frequenza
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 1.8);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(140, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.85);

    // Battito cardiaco accelerato (6 impatti)
    const beats = [0.0, 0.35, 0.65, 0.9, 1.1, 1.25];
    beats.forEach((delay) => {
      const beatTime = now + delay;
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      const bFilter = ctx.createBiquadFilter();

      bOsc.type = "sine";
      bOsc.frequency.setValueAtTime(60, beatTime);
      bOsc.frequency.linearRampToValueAtTime(30, beatTime + 0.15);

      bFilter.type = "lowpass";
      bFilter.frequency.setValueAtTime(80, beatTime);

      bGain.gain.setValueAtTime(0.35, beatTime);
      bGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.15);

      bOsc.connect(bFilter);
      bFilter.connect(bGain);
      bGain.connect(ctx.destination);
      bOsc.start(beatTime);
      bOsc.stop(beatTime + 0.18);
    });
  } catch {
  }
}

// Sound 11: Cinematic Reveal (Arpeggio splendente che sale in frequenza)
export function playUiCinematicReveal() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
    const delays = [0.0, 0.08, 0.16, 0.24, 0.32, 0.40, 0.48];

    delays.forEach((delay, idx) => {
      const noteTime = now + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(notes[idx], noteTime);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2500, noteTime);

      gain.gain.setValueAtTime(0.12, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.55);
    });

    // Riscaldatore risonante ad alta frequenza al culmine
    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = "sine";
    chime.frequency.setValueAtTime(1318.51, now + 0.48); // E6
    chimeGain.gain.setValueAtTime(0.08, now + 0.48);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    chime.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chime.start(now + 0.48);
    chime.stop(now + 1.25);
  } catch {
  }
}

// Sound 12: Cinematic Vision (Detuned sweep sognante)
export function playUiCinematicVision() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(180, now);
    osc1.frequency.exponentialRampToValueAtTime(720, now + 1.6);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(182, now); // Detuning
    osc2.frequency.exponentialRampToValueAtTime(715, now + 1.6);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1500, now + 1.6);
    filter.Q.setValueAtTime(1.2, now);

    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.65);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.7);
    osc2.stop(now + 1.7);
  } catch {
  }
}

// Sound 13: Cinematic Chapter (Gong solenne + campana metallica con lungo rilascio)
export function playUiCinematicChapter() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Gong a bassa frequenza
    const gong = ctx.createOscillator();
    const gongGain = ctx.createGain();
    gong.type = "triangle";
    gong.frequency.setValueAtTime(82.41, now); // E2
    gongGain.gain.setValueAtTime(0.28, now);
    gongGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

    gong.connect(gongGain);
    gongGain.connect(ctx.destination);
    gong.start(now);
    gong.stop(now + 2.9);

    // Campana solenne di risonanza
    const bell1 = ctx.createOscillator();
    const bell2 = ctx.createOscillator();
    const bellGain = ctx.createGain();

    bell1.type = "sine";
    bell1.frequency.setValueAtTime(164.81, now); // E3
    bell2.type = "sine";
    bell2.frequency.setValueAtTime(329.63, now); // E4

    bellGain.gain.setValueAtTime(0.18, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

    bell1.connect(bellGain);
    bell2.connect(bellGain);
    bellGain.connect(ctx.destination);

    bell1.start(now);
    bell2.start(now);
    bell1.stop(now + 3.3);
    bell2.stop(now + 3.3);
  } catch {
  }
}

// Sound 14: Cinematic Earthquake (Scuotimento sismico procedurale basato su frequenze basse oscillate)
export function playUiCinematicEarthquake() {
  if (!uiSoundsEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Modulatore di frequenza a 9Hz per creare vibrazione
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(9, now);
    lfoGain.gain.setValueAtTime(28, now);

    // Oscillatore principale a bassa frequenza
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(45, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(75, now);

    gainNode.gain.setValueAtTime(0.36, now);
    gainNode.gain.linearRampToValueAtTime(0.28, now + 0.8);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 2.2);
    osc.stop(now + 2.2);
  } catch {
  }
}

