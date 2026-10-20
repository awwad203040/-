// Audio Engine for Voice Athkar Pronunciation & Spiritual Chime
// Uses HTML5 Web Audio API for harmonic notification chime & Web Speech Synthesis for Arabic pronunciation

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
 * Pronounces the vocalized Arabic Thikr using SpeechSynthesis
 */
export function speakThikr(textTashkeel: string, volume = 0.85): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve(false);
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const utterance = new SpeechSynthesisUtterance(textTashkeel);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.85; // Calm, respectful pace for Thikr
      utterance.pitch = 1.0;
      utterance.volume = Math.max(0.1, Math.min(1.0, volume));

      // Attempt to pick the highest quality Arabic voice
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find(
        (v) => v.lang.startsWith('ar') || v.lang.includes('AR') || v.name.toLowerCase().includes('arabic')
      );
      if (arabicVoice) {
        utterance.voice = arabicVoice;
      }

      utterance.onend = () => {
        resolve(true);
      };

      utterance.onerror = () => {
        resolve(false);
      };

      window.speechSynthesis.speak(utterance);

      // Failsafe timeout to prevent hung promises
      setTimeout(() => {
        resolve(true);
      }, 7000);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Checks if Speech Synthesis is supported in the current environment
 */
export function isVoiceThikrSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}
