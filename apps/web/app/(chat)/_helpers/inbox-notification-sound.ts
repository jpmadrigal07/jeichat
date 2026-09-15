const STORAGE_KEY = 'jeichat:inbox-notification-sound:v1';
const SOUND_URL = '/sounds/notification.wav';
const DEFAULT_ENABLED = true;
const COOLDOWN_MS = 1000;

const listeners = new Set<() => void>();

let audioContext: AudioContext | null = null;
let notificationAudio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;
let unlockBound = false;

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function readStoredEnabled() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '0') return false;
    if (stored === '1') return true;
  } catch {
    // Ignore storage failures (private browsing, quota, etc.)
  }

  return DEFAULT_ENABLED;
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;

  const Ctor =
    window.AudioContext ??
    (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!Ctor) return null;

  audioContext = new Ctor();
  return audioContext;
}

function getNotificationAudio() {
  if (typeof window === 'undefined') return null;
  if (notificationAudio) return notificationAudio;

  notificationAudio = new Audio(SOUND_URL);
  notificationAudio.preload = 'auto';
  notificationAudio.volume = 1;
  return notificationAudio;
}

async function resumeAudioContext() {
  const context = getAudioContext();
  if (!context) return null;
  if (context.state === 'suspended') {
    try {
      await context.resume();
    } catch {
      return context;
    }
  }
  return context;
}

function bindUnlockListeners() {
  if (unlockBound || typeof window === 'undefined') return;
  unlockBound = true;

  const unlock = () => {
    void resumeAudioContext();
    const audio = getNotificationAudio();
    if (!audio) return;
    audio.load();
  };

  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function playTone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  volume: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playChime(context: AudioContext) {
  const start = context.currentTime;
  playTone(context, 784, start, 0.16, 0.42);
  playTone(context, 1174.66, start + 0.09, 0.22, 0.55);
  playTone(context, 1567.98, start + 0.16, 0.18, 0.32);
}

async function playSoundFile() {
  const audio = getNotificationAudio();
  if (!audio) return false;

  try {
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

bindUnlockListeners();

export function subscribeInboxNotificationSound(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getInboxNotificationSoundEnabled() {
  return readStoredEnabled();
}

export function getInboxNotificationSoundServerSnapshot() {
  return DEFAULT_ENABLED;
}

export function setInboxNotificationSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore storage failures (private browsing, quota, etc.)
  }

  emitChange();
}

export function playInboxNotificationSound() {
  if (typeof window === 'undefined') return;
  if (!getInboxNotificationSoundEnabled()) return;

  const now = Date.now();
  if (now - lastPlayedAt < COOLDOWN_MS) return;
  lastPlayedAt = now;

  void playSoundFile().then((played) => {
    if (played) return;
    void resumeAudioContext().then((context) => {
      if (!context || context.state !== 'running') return;
      playChime(context);
    });
  });
}

export const NOTIFICATION_SOUND_URL = SOUND_URL;
