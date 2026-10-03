export type VoiceSound = 'join' | 'leave';

/**
 * Join/leave cues in the same family as the chat notification
 * (`public/sounds/notification.wav`): that sound is A4 → D5 → F4 from the
 * D minor chord, struck at 0, 0.08 and 0.2 s, with a soft hollow tone whose
 * only strong overtone is at 3× the pitch. These use the same notes, rhythm,
 * tone and loudness, ordered as a rising (join) or falling (leave) arpeggio
 * so they're still easy to tell apart from a message.
 */

/** Matches the notification's loudness (it peaks around 0.53). */
const MASTER_VOLUME = 0.42;

type Note = {
  frequency: number;
  /** Seconds after the sound starts. */
  offset: number;
  /** How long the note rings. */
  ring: number;
  /** How hard the note is struck, relative to the others. */
  velocity: number;
};

const F4 = 349.23;
const A4 = 440;
const D5 = 587.33;

/**
 * Like the notification, the first two notes are struck firmly and the last
 * one more softly, so it lands gently rather than building up.
 */
const ARPEGGIOS: Record<VoiceSound, Note[]> = {
  join: [
    { frequency: F4, offset: 0, ring: 0.28, velocity: 1.4 },
    { frequency: A4, offset: 0.08, ring: 0.28, velocity: 1.1 },
    { frequency: D5, offset: 0.2, ring: 0.45, velocity: 0.7 },
  ],
  leave: [
    { frequency: D5, offset: 0, ring: 0.28, velocity: 1.4 },
    { frequency: A4, offset: 0.08, ring: 0.28, velocity: 1.1 },
    { frequency: F4, offset: 0.2, ring: 0.45, velocity: 0.7 },
  ],
};

/**
 * The notification's tone: the note plus odd overtones only. The 3× overtone
 * sits about 11 dB under the note, which is what makes it sound hollow and soft.
 */
const OVERTONES: Array<{ ratio: number; gain: number }> = [
  { ratio: 1, gain: 1 },
  { ratio: 3, gain: 0.28 },
  { ratio: 5, gain: 0.05 },
];

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;
  const Ctor =
    window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!Ctor) return null;
  audioContext = new Ctor();
  return audioContext;
}

function playNote(
  context: BaseAudioContext,
  output: AudioNode,
  note: Note,
  start: number,
) {
  const end = start + note.ring;

  for (const overtone of OVERTONES) {
    const frequency = note.frequency * overtone.ratio;
    if (frequency > context.sampleRate / 2) continue;

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);

    // Sharp attack, quick drop to about a third, then a short ring — the
    // notification's envelope. Overtones fade a little faster than the note.
    const fade = overtone.ratio === 1 ? 1 : 0.6;
    const level = overtone.gain * note.velocity;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.003);
    gain.gain.setTargetAtTime(level * 0.35, start + 0.003, 0.02);
    gain.gain.setTargetAtTime(0.0001, start + 0.06, (note.ring * fade) / 4);

    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start(start);
    oscillator.stop(end + 0.05);
  }
}

/**
 * Schedules the whole cue on `context` starting at `startTime`; returns how
 * many seconds it lasts. Takes any context so it can also be rendered offline
 * (e.g. to check levels).
 */
export function scheduleVoiceSound(
  context: BaseAudioContext,
  destination: AudioNode,
  sound: VoiceSound,
  startTime: number,
): number {
  const master = context.createGain();
  master.gain.setValueAtTime(MASTER_VOLUME, startTime);
  master.connect(destination);

  const notes = ARPEGGIOS[sound];
  for (const note of notes) {
    playNote(context, master, note, startTime + note.offset);
  }
  return Math.max(...notes.map((note) => note.offset + note.ring));
}

/**
 * Plays the join/leave cue on this device only. Each person in the call plays
 * it for themselves when LiveKit reports the change, so it never goes through
 * anyone's microphone. Joining is a click, which unlocks audio for the sounds
 * that follow.
 */
export function playVoiceSound(sound: VoiceSound) {
  const context = getAudioContext();
  if (!context) return;

  const play = () => {
    scheduleVoiceSound(
      context,
      context.destination,
      sound,
      context.currentTime + 0.01,
    );
  };

  if (context.state === 'running') {
    play();
    return;
  }
  context.resume().then(play, () => undefined);
}
