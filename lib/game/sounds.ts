"use client";

const SOUND_PREFERENCE_KEY = "jogastop:sounds";
const SOUND_PREFERENCE_EVENT = "stop-sound-preference";

export type GameSound = "start" | "tick" | "stop";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  audioContext ??= new AudioContext();
  return audioContext;
}

export function areGameSoundsEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== "off";
}

export function setGameSoundsEnabled(enabled: boolean) {
  window.localStorage.setItem(SOUND_PREFERENCE_KEY, enabled ? "on" : "off");
  window.dispatchEvent(
    new CustomEvent<boolean>(SOUND_PREFERENCE_EVENT, { detail: enabled }),
  );
  if (enabled) void unlockGameAudio();
}

export function subscribeToSoundPreference(listener: (enabled: boolean) => void) {
  const handlePreference = (event: Event) => {
    listener((event as CustomEvent<boolean>).detail);
  };
  window.addEventListener(SOUND_PREFERENCE_EVENT, handlePreference);
  return () => window.removeEventListener(SOUND_PREFERENCE_EVENT, handlePreference);
}

export async function unlockGameAudio() {
  if (!areGameSoundsEnabled()) return;
  const context = getAudioContext();
  if (context.state === "suspended") await context.resume();
}

function tone(
  context: AudioContext,
  frequency: number,
  startsIn: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  const startsAt = context.currentTime + startsIn;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
}

function scheduleSound(context: AudioContext, sound: GameSound) {
  if (sound === "tick") {
    tone(context, 880, 0, 0.08, 0.07, "square");
    return;
  }

  if (sound === "start") {
    tone(context, 523.25, 0, 0.15, 0.08);
    tone(context, 659.25, 0.13, 0.15, 0.08);
    tone(context, 783.99, 0.26, 0.24, 0.1);
    return;
  }

  tone(context, 783.99, 0, 0.16, 0.11, "square");
  tone(context, 523.25, 0.13, 0.18, 0.1, "square");
  tone(context, 329.63, 0.28, 0.32, 0.11, "square");
}

export function playGameSound(sound: GameSound) {
  if (!areGameSoundsEnabled()) return;

  const context = getAudioContext();
  if (context.state === "running") {
    scheduleSound(context, sound);
    return;
  }

  void context.resume().then(() => scheduleSound(context, sound)).catch(() => {
    // Browsers may block audio until the player interacts with the page.
  });
}
