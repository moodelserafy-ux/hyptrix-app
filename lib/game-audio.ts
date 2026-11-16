'use client';

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const browserWindow = window as AudioWindow;
  const AudioContextConstructor = window.AudioContext || browserWindow.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContextConstructor();
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume().catch(() => undefined);
  }
  return audioContext;
}

function tone(
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
  waveform: OscillatorType = 'sine',
  endFrequency?: number
) {
  const context = getAudioContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + startAt;
  const end = start + duration;
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), end);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(0.025, duration * 0.18));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.015);
}

export function playUiClick() {
  tone(620, 0, 0.055, 0.035, 'sine', 480);
}

export function playContractSigned() {
  tone(523.25, 0, 0.14, 0.055, 'sine');
  tone(659.25, 0.1, 0.16, 0.05, 'sine');
  tone(783.99, 0.21, 0.28, 0.06, 'triangle');
}

export function playCrisisAlert() {
  tone(420, 0, 0.16, 0.055, 'triangle', 310);
  tone(330, 0.2, 0.22, 0.06, 'triangle', 240);
  tone(420, 0.48, 0.14, 0.045, 'sine', 290);
}

export function playAwardFanfare() {
  tone(523.25, 0, 0.2, 0.055, 'triangle');
  tone(659.25, 0.14, 0.2, 0.055, 'triangle');
  tone(783.99, 0.28, 0.24, 0.06, 'triangle');
  tone(1046.5, 0.46, 0.42, 0.065, 'sine');
}

export function playGameSound(name: 'click' | 'contract' | 'crisis' | 'award') {
  switch (name) {
    case 'contract':
      playContractSigned();
      break;
    case 'crisis':
      playCrisisAlert();
      break;
    case 'award':
      playAwardFanfare();
      break;
    default:
      playUiClick();
  }
}
