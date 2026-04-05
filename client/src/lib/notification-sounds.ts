/**
 * Notification Sound System — BLACK ROSE CAFE
 *
 * Rules:
 * - Only staff pages (dashboard, POS, kitchen, cashier) call playNotificationSound
 * - websocket.ts NEVER plays sounds
 * - Deduplication via localStorage prevents multi-tab double-plays (3s window)
 * - onlineOrderVoice: plays the real MP4 alert sound twice
 * - newOrder: double ascending 3-note beep
 * - cashierOrder: short double-beep
 * - statusChange: single pulse
 * - success: short 2-note rise
 * - alert: descending 2-note
 */

export type NotificationSoundType =
  | 'newOrder'
  | 'onlineOrderVoice'
  | 'cashierOrder'
  | 'statusChange'
  | 'success'
  | 'alert';

// ─── AudioContext singleton ───────────────────────────────────────────────────

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume().catch(() => {});
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

// Resume AudioContext on user interaction (browser autoplay policy)
if (typeof window !== 'undefined') {
  const resume = () => {
    if (sharedCtx && sharedCtx.state === 'suspended') {
      sharedCtx.resume().catch(() => {});
    }
  };
  ['click', 'keydown', 'touchstart', 'mousedown'].forEach(evt =>
    document.addEventListener(evt, resume, { capture: true, passive: true })
  );
}

// ─── Audio unlock state (for backward compat with audio-unlock-banner) ────────

let audioUnlocked = false;

export function isAudioUnlocked(): boolean {
  return audioUnlocked || (sharedCtx?.state === 'running');
}

export async function initAudioUnlock(): Promise<void> {
  try {
    const ctx = getCtx();
    if (ctx) {
      await ctx.resume();
      audioUnlocked = ctx.state === 'running';
    }
  } catch {}
}

// ─── Sound preference persistence ────────────────────────────────────────────

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

// ─── Deduplication: per-type, 3 second window ────────────────────────────────

const DEDUP_KEY = 'qirox_sound_dedup';
const DEDUP_WINDOW_MS = 3000;

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

// ─── Play the real alert file at maximum volume ───────────────────────────────
// Uses HTML Audio (media channel) so it respects device MEDIA volume,
// not notification volume — exactly what the user wants.

const ALERT_FILES = ['/online-order-alert.mp4', '/notification-sound.mp3'];

async function playFileSound(): Promise<void> {
  for (const src of ALERT_FILES) {
    const played = await new Promise<boolean>((resolve) => {
      try {
        const audio = new Audio(src);
        audio.volume = 1.0; // maximum
        const timer = setTimeout(() => resolve(false), 10000);
        audio.onended = () => { clearTimeout(timer); resolve(true); };
        audio.onerror = () => { clearTimeout(timer); resolve(false); };
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => { clearTimeout(timer); resolve(false); });
        }
      } catch {
        resolve(false);
      }
    });
    if (played) return; // success — stop trying fallbacks
  }
}

// ─── WAV Beep Generator ───────────────────────────────────────────────────────

function generateBeepWav(frequencies: number[], durationMs: number, sampleRate = 22050): string {
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const write = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, i / (sampleRate * 0.01));
    const fade = Math.min(1, (numSamples - i) / (numSamples * 0.25));
    const env = attack * fade;
    let sample = 0;
    for (const f of frequencies) {
      sample += Math.sin(2 * Math.PI * f * t) / frequencies.length;
    }
    view.setInt16(44 + i * 2, Math.round(sample * env * 28000), true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

const audioCache: Partial<Record<NotificationSoundType, string>> = {};

function getAudioDataUrl(type: NotificationSoundType): string {
  if (!audioCache[type]) {
    switch (type) {
      case 'newOrder':
        audioCache[type] = generateBeepWav([523, 659, 784], 350);
        break;
      case 'cashierOrder':
        audioCache[type] = generateBeepWav([660, 880], 180);
        break;
      case 'success':
        audioCache[type] = generateBeepWav([523, 659], 250);
        break;
      case 'statusChange':
        audioCache[type] = generateBeepWav([440], 300);
        break;
      case 'alert':
        audioCache[type] = generateBeepWav([880, 659], 300);
        break;
      default:
        audioCache[type] = generateBeepWav([523, 659, 784], 350);
    }
  }
  return audioCache[type]!;
}

// ─── Web Audio API beep (primary for non-online orders) ──────────────────────

function playBeepWebAudio(type: NotificationSoundType, volume: number): boolean {
  try {
    const ctx = getCtx();
    if (!ctx || ctx.state !== 'running') return false;

    const freqMap: Record<string, number[]> = {
      newOrder: [523, 659, 784],
      cashierOrder: [660, 880],
      success: [523, 659],
      statusChange: [440],
      alert: [880, 659],
    };
    const freqs = freqMap[type] || [523, 659, 784];
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(master);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(1 / freqs.length, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.start(start);
      osc.stop(start + 0.3);
    });

    audioUnlocked = true;
    return true;
  } catch {
    return false;
  }
}

async function playBeep(type: NotificationSoundType, volume: number): Promise<void> {
  if (playBeepWebAudio(type, volume)) return;

  try {
    const audio = new Audio(getAudioDataUrl(type));
    audio.volume = Math.max(0, Math.min(1, volume));
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      setTimeout(resolve, 800);
    });
  } catch {}
}

// ─── Test sound (bypasses dedup, forces unlock) ───────────────────────────────

export async function testSound(type: NotificationSoundType = 'success', volume = 0.8): Promise<boolean> {
  try {
    await initAudioUnlock();
    await playBeep(type, volume);
    return true;
  } catch {
    return false;
  }
}

// ─── Main export: playNotificationSound ──────────────────────────────────────

export async function playNotificationSound(
  type: NotificationSoundType = 'newOrder',
  volume: number = 0.85
): Promise<void> {
  if (isDuplicate(type)) return;
  markPlayed(type);

  if (type === 'onlineOrderVoice') {
    // Play the real alert sound 3× at max volume for online orders
    await playFileSound();
    await new Promise(r => setTimeout(r, 400));
    await playFileSound();
    await new Promise(r => setTimeout(r, 400));
    await playFileSound();
  } else if (type === 'newOrder') {
    await playBeep('newOrder', volume);
    await new Promise(r => setTimeout(r, 400));
    await playBeep('newOrder', volume * 0.7);
  } else if (type === 'cashierOrder') {
    await playBeep('cashierOrder', volume);
    await new Promise(r => setTimeout(r, 200));
    await playBeep('cashierOrder', volume * 0.8);
  } else {
    await playBeep(type, volume);
  }
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
