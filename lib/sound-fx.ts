'use client';

/**
 * Web Audio API Synthesized Sound Effects Engine for Hyptrix Daylight Studio
 * Zero external MP3 dependencies — works reliably across all browsers.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        sharedAudioCtx = new AudioContextClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * 1. Metallic Lock Drop Clank (for unlocking the 5 golden locks on the VIP Top Secret Folder)
 */
export function playMetalLockDrop(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Metallic ping + heavy drop thud
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(980, now);
    osc1.frequency.exponentialRampToValueAtTime(240, now + 0.18);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1420, now + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(110, now + 0.28);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.04);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  } catch {
    // ignore
  }
}

/**
 * 2. Vintage Polaroid Camera Shutter & Flash Sound
 */
export function playCameraShutterFlash(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // White noise burst for shutter click
    const bufferSize = ctx.sampleRate * 0.14;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    // High capacitor whine / flash charge
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(3400, now + 0.25);
    oscGain.gain.setValueAtTime(0.08, now + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now + 0.05);
    osc.stop(now + 0.26);
  } catch {
    // ignore
  }
}

/**
 * 3. Classic Cash Register "Cha-Ching!" Bell (for Radar Stat + upgrades, VIP packages, and Box Office Odometer)
 */
export function playCashRegisterChaChing(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // First drawer click ("Cha")
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(320, now);
    osc1.frequency.exponentialRampToValueAtTime(160, now + 0.06);
    g1.gain.setValueAtTime(0.12, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc1.connect(g1);
    g1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.065);

    // High bell ring ("Ching!")
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc3.type = 'triangle';
    osc2.frequency.setValueAtTime(2093, now + 0.07); // C7
    osc3.frequency.setValueAtTime(2637, now + 0.07); // E7
    g2.gain.setValueAtTime(0.2, now + 0.07);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(g2);
    osc3.connect(g2);
    g2.connect(ctx.destination);
    osc2.start(now + 0.07);
    osc3.start(now + 0.07);
    osc2.stop(now + 0.42);
    osc3.stop(now + 0.42);
  } catch {
    // ignore
  }
}

/**
 * 4. Heavy Iron Stamp / Card Printer Thud (for The Diamond Card Reveal)
 */
export function playHeavyIronStamp(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    // Deep heavy impact thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.32);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);

    // Diamond crystalline shimmer chord after stamp
    const notes = [1046.5, 1318.5, 1567.98, 2093];
    notes.forEach((freq, idx) => {
      const shimmerOsc = ctx.createOscillator();
      const sGain = ctx.createGain();
      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(freq, now + 0.22 + idx * 0.06);
      sGain.gain.setValueAtTime(0.11, now + 0.22 + idx * 0.06);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      shimmerOsc.connect(sGain);
      sGain.connect(ctx.destination);
      shimmerOsc.start(now + 0.22 + idx * 0.06);
      shimmerOsc.stop(now + 0.86);
    });
  } catch {
    // ignore
  }
}

/**
 * 5. Cinema Clapperboard Snap (for Screen Transitions)
 */
export function playClapperboardSnap(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.09);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    // ignore
  }
}

/**
 * 6. On-Set Crisis Red Alert Siren
 */
export function playCrisisRedAlert(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(680, now + 0.18);
    osc.frequency.linearRampToValueAtTime(420, now + 0.36);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  } catch {
    // ignore
  }
}

/**
 * 7. Box Office Stock Ticker Heartbeat Pulse
 */
export function playHeartbeatTick(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch {
    // ignore
  }
}

/**
 * 8. Smartphone Social Notification Pop
 */
export function playSocialNotifPop(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.11);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  } catch {
    // ignore
  }
}
