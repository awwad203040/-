'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  isSpeechRecognitionSupported,
  startVoiceListening,
  stopVoiceListening,
  VoiceCommandResult,
} from '@/lib/voice-command-engine';
import {
  speakAccessibility,
  stopAccessibilitySpeech,
  triggerHaptic,
  announceToScreenReader,
} from '@/lib/accessibility';
import {
  openNativeVoiceMatchSettings,
  checkNativeAudioPermission,
  requestNativeAudioPermission,
  openNativeAppSettings,
} from '@/lib/athkar-native-bridge';

interface BlindVoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: VoiceCommandResult) => void;
}

export default function BlindVoiceAssistantModal({
  isOpen,
  onClose,
  onExecuteCommand,
}: BlindVoiceAssistantModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [statusText, setStatusText] = useState('أنا أستمع إليك الآن... تفضل بنطق اسم السورة');
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);
  const [supported, setSupported] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startListeningSession = useCallback(() => {
    // Stop any ongoing speech synthesis so the mic doesn't capture the app's own voice
    stopAccessibilitySpeech();

    setTranscript('');
    setFeedback('');
    setStatusText('جاري فتح الميكروفون...');

    const started = startVoiceListening({
      onStart: () => {
        setIsListening(true);
        setPermissionGranted(true);
        setStatusText('أنا أستمع إليك الآن... تفضل بنطق اسم السورة');
        announceToScreenReader('المساعد الصوتي يستمع إليك الآن. تفضل بنطق اسم السورة', true);
      },
      onInterimResult: (text) => {
        setTranscript(text);
      },
      onFinalResult: (result) => {
        setIsListening(false);
        setTranscript(result.originalText);
        setFeedback(result.feedbackMessage);
        setStatusText('تم التعرف على طلبك بنجاح');
        speakAccessibility(result.feedbackMessage, { force: true });
        announceToScreenReader(result.feedbackMessage, true);

        // Execute action after short pause to let speech synthesis start
        timeoutRef.current = setTimeout(() => {
          onExecuteCommand(result);
          onClose();
        }, 1400);
      },
      onError: (errMsg) => {
        setIsListening(false);
        if (errMsg.includes('صلاحية الميكروفون') || errMsg.includes('إذن الميكروفون') || errMsg.includes('permission_denied')) {
          setPermissionGranted(false);
          setStatusText('يرجى منح صلاحية الميكروفون للتحدث');
        } else {
          setStatusText(errMsg);
        }
        speakAccessibility(errMsg, { force: true });
        announceToScreenReader(errMsg, true);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    if (!started) {
      setIsListening(false);
      setStatusText('انقر على الميكروفون للتحدث');
    }
  }, [onExecuteCommand, onClose]);

  const handleRequestPermission = useCallback(async () => {
    triggerHaptic('tap');
    speakAccessibility('جاري طلب صلاحية الميكروفون...');
    const granted = await requestNativeAudioPermission();
    if (granted) {
      setPermissionGranted(true);
      triggerHaptic('success');
      setStatusText('تم تفعيل الميكروفون بنجاح، أستمع إليك الآن...');
      speakAccessibility('تم تفعيل الميكروفون بنجاح، تفضل بنطق اسم السورة', { force: true });
      startListeningSession();
    } else {
      setPermissionGranted(false);
      setStatusText('يرجى تفعيل صلاحية الميكروفون من إعدادات الهاتف');
      speakAccessibility('يرجى تفعيل صلاحية الميكروفون من إعدادات الهاتف');
      await openNativeAppSettings();
    }
  }, [startListeningSession]);

  useEffect(() => {
    let isCancelled = false;

    if (isOpen) {
      setSupported(isSpeechRecognitionSupported());
      announceToScreenReader('تم فتح المساعد الصوتي للمكفوفين', true);
      speakAccessibility('المساعد الصوتي، تفضل بنطق اسم السورة', { force: true });
      setStatusText('أنا أستمع إليك الآن... تفضل بنطق اسم السورة');

      // Verify permission in background; only if explicitly false, show permission banner
      checkNativeAudioPermission().then((granted) => {
        if (isCancelled) return;
        setPermissionGranted(granted);
        if (!granted) {
          setStatusText('يرجى النقر على زر منح الصلاحية لتشغيل الميكروفون');
          speakAccessibility('يرجى منح صلاحية الميكروفون لتشغيل المساعد الصوتي', { force: true });
        }
      });

      // Start listening session smoothly after greeting
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (!isCancelled) {
          startListeningSession();
        }
      }, 1900);

      return () => {
        isCancelled = true;
        stopVoiceListening();
        stopAccessibilitySpeech();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    } else {
      isCancelled = true;
      stopVoiceListening();
      stopAccessibilitySpeech();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [isOpen, startListeningSession]);

  if (!isOpen) return null;

  const handleManualMicClick = () => {
    if (permissionGranted === false) {
      handleRequestPermission();
      return;
    }

    if (isListening) {
      stopVoiceListening();
      setIsListening(false);
      setStatusText('تم إيقاف الاستماع، اضغط للتحدث');
      triggerHaptic('pause');
      speakAccessibility('تم إيقاف الاستماع');
    } else {
      stopAccessibilitySpeech();
      triggerHaptic('tap');
      startListeningSession();
    }
  };

  const sampleCommands = [
    'سورة الكهف',
    'سورة البقرة',
    'سورة يس بصوت العفاسي',
    'سورة الرحمن بصوت المعيقلي',
    'أين توقفت',
    'إيقاف مؤقت',
  ];

  const handleSampleClick = (cmd: string) => {
    triggerHaptic('tap');
    speakAccessibility(`جاري طلب: ${cmd}`, { force: true });
    // Parse sample directly
    import('@/lib/voice-command-engine').then(({ parseVoiceCommand }) => {
      const res = parseVoiceCommand(cmd);
      setTranscript(cmd);
      setFeedback(res.feedbackMessage);
      speakAccessibility(res.feedbackMessage, { force: true });
      setTimeout(() => {
        onExecuteCommand(res);
        onClose();
      }, 1000);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-assistant-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-[#123B2A] to-[#0A2318] border-2 border-[#C8A85B] rounded-3xl w-full max-w-md p-6 text-white shadow-2xl flex flex-col items-center gap-5 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            stopVoiceListening();
            triggerHaptic('tap');
            onClose();
          }}
          aria-label="إغلاق المساعد الصوتي"
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 cursor-pointer transition"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8A85B]/20 border border-[#C8A85B]/40 text-[#F7EED8] text-xs font-semibold mb-2">
            <span>🎙️</span>
            <span>المساعد الصوتي الذكي للمكفوفين</span>
          </div>
          <h2 id="voice-assistant-title" className="text-xl font-bold text-[#F7EED8]">
            انطق اسم السورة للاستماع فوراً
          </h2>
        </div>

        {/* Big Central Mic Button */}
        <div className="relative my-2">
          {/* Animated pulsing wave rings */}
          {isListening && (
            <>
              <div className="absolute -inset-4 rounded-full bg-[#C8A85B]/25 animate-ping opacity-75" />
              <div className="absolute -inset-8 rounded-full bg-[#0B5B43]/30 animate-pulse" />
            </>
          )}

          <button
            type="button"
            onClick={handleManualMicClick}
            aria-label={isListening ? 'جاري الاستماع، انقر للإيقاف' : 'انقر للبدء بنطق اسم السورة'}
            className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all cursor-pointer transform active:scale-95 ${
              isListening
                ? 'bg-gradient-to-br from-[#C8A85B] to-[#997732] ring-4 ring-[#C8A85B]/60 scale-105'
                : 'bg-gradient-to-br from-[#0B5B43] to-[#123B2A] border-2 border-[#C8A85B]/50 hover:border-[#C8A85B]'
            }`}
          >
            <span className="text-4xl mb-1">{isListening ? '🎙️' : '🎤'}</span>
            <span className="text-[11px] font-bold text-white tracking-wide">
              {isListening ? 'أستمع إليك...' : 'تحدث الآن'}
            </span>
          </button>
        </div>

        {/* Status & Live Transcript */}
        <div className="w-full bg-black/40 border border-[#C8A85B]/30 rounded-2xl p-4 text-center min-h-[90px] flex flex-col items-center justify-center gap-1.5">
          <p className="text-xs text-[#C8A85B] font-semibold flex items-center gap-1.5" aria-live="polite">
            <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
            <span>{statusText}</span>
          </p>

          {transcript ? (
            <p className="text-base font-bold text-white mt-1 px-2 py-0.5 rounded bg-white/10" dir="rtl">
              &ldquo;{transcript}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-white/60">
              قل مثلاً: &ldquo;سورة الكهف&rdquo; أو &ldquo;سورة الرحمن بصوت المعيقلي&rdquo;
            </p>
          )}

          {feedback && (
            <p className="text-xs text-emerald-300 font-bold mt-1" dir="rtl">
              {feedback}
            </p>
          )}
        </div>

        {/* Permission Action Banner if not granted */}
        {permissionGranted === false && (
          <div className="w-full bg-[#2A1515] border-2 border-red-400/50 rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center shadow-lg animate-in fade-in">
            <span className="text-sm font-bold text-red-200 flex items-center gap-1.5">
              <span>🎙️</span>
              <span>يلزم تفعيل إذن الميكروفون</span>
            </span>
            <p className="text-[11px] text-white/80 leading-relaxed">
              لتتمكن من نطق اسم أي سورة والاستماع إليها فوراً، يرجى السماح بصلاحية الميكروفون.
            </p>
            <div className="flex w-full gap-2 pt-1">
              <button
                type="button"
                onClick={handleRequestPermission}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#C8A85B] via-[#dfc278] to-[#C8A85B] text-[#123B2A] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition cursor-pointer hover:brightness-105"
              >
                <span>🎙️</span>
                <span>منح الصلاحية الآن</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  triggerHaptic('tap');
                  await openNativeAppSettings();
                }}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold cursor-pointer transition"
              >
                ⚙️ الإعدادات
              </button>
            </div>
          </div>
        )}

        {/* Quick Sample Voice Pills */}
        <div className="w-full">
          <p className="text-[11px] text-[#F7EED8]/80 mb-2 font-semibold">أو اختر سورة بنقرة سريعة:</p>
          <div className="grid grid-cols-2 gap-2">
            {sampleCommands.slice(0, 4).map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => handleSampleClick(cmd)}
                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-[#C8A85B]/20 border border-white/10 hover:border-[#C8A85B]/50 text-xs text-white text-center transition cursor-pointer"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Match One-Click Banner */}
        <div className="w-full bg-[#0A2318] p-2.5 rounded-xl border border-[#C8A85B]/40 flex items-center justify-between gap-2 text-[11px] text-white">
          <div className="flex items-center gap-1.5 truncate">
            <span>🗣️</span>
            <span className="truncate">بصمة الصوت (Hey Google) لفتح التطبيق:</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              stopVoiceListening();
              triggerHaptic('tap');
              speakAccessibility('جاري فتح إعدادات بصمة الصوت في هاتفك...');
              await openNativeVoiceMatchSettings();
            }}
            className="px-2.5 py-1 rounded-lg bg-[#C8A85B] text-[#123B2A] font-extrabold text-[11px] cursor-pointer hover:bg-[#dfc278] transition shadow-xs whitespace-nowrap shrink-0"
          >
            تفعيل بنقرة واحدة
          </button>
        </div>

        {/* Guidance Footer */}
        <div className="w-full bg-[#0D281C]/90 p-2.5 rounded-xl border border-white/10 text-[11px] text-white/80 flex items-center justify-between">
          <span>💡 يمكنك نطق: &ldquo;سورة الكهف بصوت العفاسي&rdquo;</span>
          <button
            type="button"
            onClick={() => {
              stopVoiceListening();
              onClose();
            }}
            className="text-xs text-[#C8A85B] font-bold underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
