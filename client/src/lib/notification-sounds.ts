/**
 * Notification Sound System — BLACK ROSE CAFE
 *
 * Strategy:
 * - Uses a single pre-loaded HTMLAudioElement with the real notification MP4.
 * - The element is "unlocked" on the first user interaction (click/touch), after
 *   which it can be replayed even from async callbacks or WebSocket events.
 * - Falls back to Web Audio API beeps if the MP4 file fails to load.
 * - Deduplication via localStorage prevents multi-tab double-plays (2s window).
 * - soundEnabled preference is persisted in localStorage per page key.
 */

export type NotificationSoundType =
  | 'newOrder'
  | 'onlineOrderVoice'
  | 'cashierOrder'
  | 'statusChange'
  | 'success'
  | 'alert';

// ─── Pre-loaded Audio Element ─────────────────────────────────────────────────

let notificationAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;
let audioLoadFailed = false;

function getNotificationAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!notificationAudio) {
    try {
      notificationAudio = new Audio('/notification-sound.mp4');
      notificationAudio.preload = 'auto';
      notificationAudio.volume = 1.0;
      notificationAudio.onerror = () => {
        audioLoadFailed = true;
      };
      notificationAudio.load();
    } catch {
      return null;
    }
  }
  return notificationAudio;
}

// Initialize on module load
if (typeof window !== 'undefined') {
  getNotificationAudio();
}

// ─── Unlock on first user interaction ────────────────────────────────────────

async function unlockAudio(): Promise<void> {
  if (audioUnlocked) return;
  const audio = getNotificationAudio();
  if (!audio) return;
  try {
    audio.volume = 0.001;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1.0;
    audioUnlocked = true;
  } catch {
    // will retry on next interaction
  }
}

// Listen for any user interaction to unlock
if (typeof window !== 'undefined') {
  const unlock = () => {
    unlockAudio();
  };
  ['click', 'keydown', 'touchstart', 'mousedown', 'pointerdown'].forEach(evt =>
    document.addEventListener(evt, unlock, { capture: true, passive: true })
  );
}

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

export async function initAudioUnlock(): Promise<void> {
  await unlockAudio();
}

// ─── Sound preference persistence ───────────────────────────────────────────

const SOUND_PREF_KEY = 'qirox_sound_enabled';

export function getSoundEnabled(pageKey = 'default'): boolean {
  try {
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    if (!raw) return true;
    const map = JSON.parse(raw) as Record<string, boolean>;
    return map[pageKey] !== false;
  } catch {
    return true;
  }
}

export function setSoundEnabled(pageKey: string, enabled: boolean): void {
  try {
    const raw = localStorage.getItem(SOUND_PREF_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    map[pageKey] = enabled;
    localStorage.setItem(SOUND_PREF_KEY, JSON.stringify(map));
  } catch {}
}

// ─── Deduplication: per-type, 2 second window ────────────────────────────────

const DEDUP_KEY = 'qirox_sound_dedup';
const DEDUP_WINDOW_MS = 2000;

function isDuplicate(type: NotificationSoundType): boolean {
  try {
    const raw = localStorage.getItem(DEDUP_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, number>;
    return !!map[type] && Date.now() - map[type] < DEDUP_WINDOW_MS;
  } catch {
    return false;
  }
}

function markPlayed(type: NotificationSoundType): void {
  try {
    const raw = localStorage.getItem(DEDUP_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[type] = Date.now();
    localStorage.setItem(DEDUP_KEY, JSON.stringify(map));
  } catch {}
}

// ─── Web Audio API beep (fallback) ───────────────────────────────────────────

interface BeepConfig {
  freqs: number[];
  duration: number;
  type?: OscillatorType;
  volume?: number;
}

const SOUND_CONFIGS: Record<NotificationSoundType, BeepConfig[]> = {
  newOrder: [
    { freqs: [523], duration: 0.2, type: 'sine', volume: 0.9 },
    { freqs: [659], duration: 0.2, type: 'sine', volume: 0.9 },
    { freqs: [784], duration: 0.35, type: 'sine', volume: 0.9 },
  ],
  onlineOrderVoice: [
    { freqs: [880, 1100], duration: 0.15, type: 'sine', volume: 1.0 },
    { freqs: [880, 1100], duration: 0.15, type: 'sine', volume: 0.9 },
    { freqs: [1046, 1318], duration: 0.4, type: 'sine', volume: 1.0 },
  ],
  cashierOrder: [
    { freqs: [1318], duration: 0.55, type: 'sine', volume: 0.9 },
    { freqs: [1318], duration: 0.55, type: 'sine', volume: 0.9 },
  ],
  statusChange: [
    { freqs: [440], duration: 0.3, type: 'sine', volume: 0.7 },
  ],
  success: [
    { freqs: [523], duration: 0.18, type: 'sine', volume: 0.8 },
    { freqs: [659], duration: 0.28, type: 'sine', volume: 0.8 },
  ],
  alert: [
    { freqs: [880], duration: 0.2, type: 'sine', volume: 0.9 },
    { freqs: [659], duration: 0.3, type: 'sine', volume: 0.9 },
  ],
};

async function playBeepFallback(type: NotificationSoundType, volume: number): Promise<void> {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    await ctx.resume().catch(() => {});
    if ((ctx.state as string) !== 'running') return;

    const configs = SOUND_CONFIGS[type] ?? SOUND_CONFIGS.newOrder;
    let startTime = ctx.currentTime;

    for (const config of configs) {
      const duration = config.duration;
      const vol = (config.volume ?? 1.0) * volume;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, startTime);
      master.gain.linearRampToValueAtTime(vol, startTime + 0.01);
      master.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      master.connect(ctx.destination);
      for (const freq of config.freqs) {
        const osc = ctx.createOscillator();
        osc.type = config.type ?? 'sine';
        osc.frequency.value = freq;
        osc.connect(master);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
      }
      startTime += duration + 0.05;
    }
  } catch {
    // ignore
  }
}

// ─── Core play function ───────────────────────────────────────────────────────

async function playSound(type: NotificationSoundType, volume: number): Promise<void> {
  // POS cashier orders always use the ting-ting Web Audio bell sound
  if (type === 'cashierOrder') {
    await playBeepFallback('cashierOrder', volume);
    return;
  }

  const audio = getNotificationAudio();

  if (audio && !audioLoadFailed) {
    try {
      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, volume));
      await audio.play();
      return;
    } catch {
      // fall through to Web Audio
    }
  }

  // Web Audio API fallback
  await playBeepFallback(type, volume);
}

// ─── Test sound (bypasses dedup, forces unlock) ───────────────────────────────

export async function testSound(type: NotificationSoundType = 'success', volume = 0.8): Promise<boolean> {
  try {
    await unlockAudio();
    await playSound(type, volume);
    return true;
  } catch {
    return false;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function playNotificationSound(
  type: NotificationSoundType = 'newOrder',
  volume: number = 0.85
): Promise<void> {
  if (isDuplicate(type)) return;
  markPlayed(type);
  await playSound(type, volume);
}

export async function playNotificationSequence(
  types: NotificationSoundType[],
  delayMs = 300
): Promise<void> {
  for (const type of types) {
    await playNotificationSound(type);
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }
}
