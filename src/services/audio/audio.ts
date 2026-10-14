import manifest from '../../content/audio-manifest.json';
import type { Locale } from '../formatting/number';

/**
 * Audio Manager (ARCH §4): narration from recorded files listed in the manifest, soft synthesized SFX,
 * an optional calm music loop. Nothing plays before the first user interaction (F-13); missing
 * narration fails silently and the on-screen text remains (AX-08).
 */

type Sfx = 'correct' | 'tryAgain' | 'pop' | 'sparkle' | 'fanfare' | 'whoosh';

let interacted = false;
let ctx: AudioContext | null = null;
let musicNodes: { stop: () => void } | null = null;
let narrationEl: HTMLAudioElement | null = null;

export const audioPrefs = { narration: true, sfx: true, music: false };

export function markUserInteraction(): void {
  interacted = true;
}

if (typeof window !== 'undefined') {
  const on = () => markUserInteraction();
  window.addEventListener('pointerdown', on, { once: true, capture: true });
  window.addEventListener('keydown', on, { once: true, capture: true });
}

function context(): AudioContext | null {
  if (!interacted || typeof AudioContext === 'undefined') return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

/** Soft chime, gentle boop (never a buzzer), pop, sparkle, short fanfare (DS §12). */
export function playSfx(name: Sfx): void {
  if (!audioPrefs.sfx) return;
  const c = context();
  if (!c) return;
  switch (name) {
    case 'correct':
      tone(c, 784, 0, 0.25);
      tone(c, 1046, 0.1, 0.35);
      break;
    case 'tryAgain':
      tone(c, 392, 0, 0.18, 'sine', 0.08);
      tone(c, 440, 0.12, 0.22, 'sine', 0.06);
      break;
    case 'pop':
      tone(c, 620, 0, 0.08, 'triangle', 0.1);
      break;
    case 'sparkle':
      [1318, 1568, 2093].forEach((f, i) => tone(c, f, i * 0.06, 0.18, 'sine', 0.05));
      break;
    case 'fanfare':
      [523, 659, 784, 1046].forEach((f, i) => tone(c, f, i * 0.14, 0.4, 'triangle', 0.08));
      break;
    case 'whoosh':
      tone(c, 300, 0, 0.15, 'sine', 0.03);
      break;
  }
}

const available = new Set<string>(manifest.files as string[]);

export function hasNarration(locale: Locale, key: string): boolean {
  return available.has(`${locale}/${key}`);
}

export function playNarration(locale: Locale, key: string): boolean {
  if (!audioPrefs.narration || !interacted || !hasNarration(locale, key)) return false;
  narrationEl?.pause();
  narrationEl = new Audio(`/audio/${locale}/${key}.mp3`);
  narrationEl.play().catch(() => undefined);
  return true;
}

export function stopNarration(): void {
  narrationEl?.pause();
  narrationEl = null;
}

/** Calm pentatonic loop for Home and Games only; off by default (DS §12). */
export function setMusic(on: boolean): void {
  if (!on || !audioPrefs.music) {
    musicNodes?.stop();
    musicNodes = null;
    return;
  }
  if (musicNodes) return;
  const c = context();
  if (!c) return;
  const notes = [392, 440, 523, 587, 659, 587, 523, 440];
  let i = 0;
  const id = window.setInterval(() => {
    tone(c, notes[i % notes.length] as number, 0, 0.9, 'sine', 0.025);
    i++;
  }, 900);
  musicNodes = { stop: () => window.clearInterval(id) };
}
