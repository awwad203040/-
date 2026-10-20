// Audio Engine for Voice Athkar Pronunciation & Spiritual Chime
// Combines pre-recorded studio-quality Arabic audio clips (zero stuttering, 100% natural)
// with HTML5 Web Audio harmonic chime and enhanced SpeechSynthesis fallback

let audioCtx: AudioContext | null = null;
let currentAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Stop any ongoing Thikr audio playback or speech synthesis
 */
export function stopThikrPlayback(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
    } catch {
      // Ignore cleanup error
    }
    currentAudio = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
    activeUtterance = null;
  }
}

/**
 * Plays a gentle, peaceful two-tone spiritual chime before reciting the Thikr
 */
export function playSpiritualChime(volume = 0.5): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Solfeggio frequency harmonic (528 Hz - Peace & Calm) + Quint (660 Hz)
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(528, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(660, now);

      // Smooth attack and soft exponential decay
      const targetVol = Math.max(0.05, Math.min(1.0, volume * 0.4));
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(targetVol, now + 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.95);
      osc2.stop(now + 0.95);

      setTimeout(() => {
        resolve();
      }, 700);
    } catch {
      resolve();
    }
  });
}

/**
 * Plays clear, natural pre-recorded Arabic audio with zero stuttering and natural pronunciation
 */
export function playThikrAudio(audioUrl: string, volume = 0.85): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    try {
      stopThikrPlayback();

      const audio = new Audio();
      currentAudio = audio;
      audio.preload = 'auto';
      audio.src = audioUrl;
      audio.volume = Math.max(0.1, Math.min(1.0, volume));

      let hasSettled = false;
      const cleanup = (success: boolean) => {
        if (hasSettled) return;
        hasSettled = true;
        if (currentAudio === audio) {
          currentAudio = null;
        }
        resolve(success);
      };

      audio.onended = () => cleanup(true);
      audio.onerror = () => cleanup(false);

      // Safety timeout in case audio hangs or fails silently
      const timeout = setTimeout(() => {
        cleanup(true);
      }, 12000);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          clearTimeout(timeout);
          cleanup(false);
        });
      }
    } catch {
      resolve(false);
    }
  });
}

/**
 * Pronounces the vocalized Arabic Thikr using SpeechSynthesis (fallback with GC leak prevention)
 */
export function speakThikr(textTashkeel: string, volume = 0.85): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve(false);
      return;
    }

    try {
      stopThikrPlayback();

      const utterance = new SpeechSynthesisUtterance(textTashkeel);
      // Retain utterance in module scope to prevent Chromium garbage collector cut-offs
      activeUtterance = utterance;

      utterance.lang = 'ar-SA';
      utterance.rate = 0.85; // Calm, respectful pace for Thikr
      utterance.pitch = 1.0;
      utterance.volume = Math.max(0.1, Math.min(1.0, volume));

      // Attempt to pick the highest quality Arabic male voice
      const voices = window.speechSynthesis.getVoices();
      const arabicMaleVoice = voices.find(
        (v) =>
          (v.lang.startsWith('ar') || v.lang.includes('AR')) &&
          (v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('hamed') ||
            v.name.toLowerCase().includes('shakir') ||
            v.name.toLowerCase().includes('naayf') ||
            v.name.toLowerCase().includes('maged') ||
            v.name.toLowerCase().includes('tarik') ||
            (!v.name.toLowerCase().includes('female') &&
              !v.name.toLowerCase().includes('zariyah') &&
              !v.name.toLowerCase().includes('salma') &&
              !v.name.toLowerCase().includes('fatima') &&
              !v.name.toLowerCase().includes('hoda') &&
              !v.name.toLowerCase().includes('layla') &&
              !v.name.toLowerCase().includes('sana') &&
              !v.name.toLowerCase().includes('amina') &&
              !v.name.toLowerCase().includes('reem') &&
              !v.name.toLowerCase().includes('maryam')))
      );
      const arabicVoice =
        arabicMaleVoice ||
        voices.find(
          (v) =>
            v.lang.startsWith('ar') ||
            v.lang.includes('AR') ||
            v.name.toLowerCase().includes('arabic') ||
            v.name.toLowerCase().includes('saudi')
        );
      if (arabicVoice) {
        utterance.voice = arabicVoice;
      }

      let hasEnded = false;
      const cleanup = (success: boolean) => {
        if (hasEnded) return;
        hasEnded = true;
        activeUtterance = null;
        resolve(success);
      };

      utterance.onend = () => cleanup(true);
      utterance.onerror = () => cleanup(false);

      window.speechSynthesis.speak(utterance);

      // Failsafe timeout to prevent hung promises
      setTimeout(() => {
        cleanup(true);
      }, 9000);
    } catch {
      activeUtterance = null;
      resolve(false);
    }
  });
}

/**
 * High-level player: Tries clear studio MP3 audio first, falls back gracefully to SpeechSynthesis
 */
export async function playThikrVoice(
  audioUrl?: string,
  textTashkeel?: string,
  volume = 0.85
): Promise<boolean> {
  if (audioUrl) {
    const audioOk = await playThikrAudio(audioUrl, volume);
    if (audioOk) {
      return true;
    }
  }

  if (textTashkeel) {
    return speakThikr(textTashkeel, volume);
  }

  return false;
}

/**
 * Checks if Voice Thikr is supported (always true in browser since HTML5 Audio is universal)
 */
export function isVoiceThikrSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof Audio !== 'undefined' || 'speechSynthesis' in window;
}
