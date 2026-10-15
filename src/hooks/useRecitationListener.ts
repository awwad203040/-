'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  type QuranWord,
  type VerificationResult,
  splitQuranWords,
  verifyRecitation,
} from '@/lib/recitation-verifier';

// Interface for Web Speech API SpeechRecognition
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

interface UseRecitationListenerProps {
  verseText: string;
  onComplete?: (result: VerificationResult) => void;
  onErrorDetected?: (error: VerificationResult['lastError']) => void;
}

export function useRecitationListener({
  verseText,
  onComplete,
  onErrorDetected,
}: UseRecitationListenerProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [lastErrorMsg, setLastErrorMsg] = useState<string | null>(null);

  // Split the Quranic words
  const verseWordsRef = useRef<QuranWord[]>([]);
  const [verification, setVerification] = useState<VerificationResult>({
    words: [],
    currentWordIndex: 0,
    correctCount: 0,
    totalWords: 0,
    accuracyPercentage: 0,
    isComplete: false,
    hasErrors: false,
    lastError: null,
    fullTranscript: '',
  });

  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  // Initialize verse words whenever verseText changes
  useEffect(() => {
    const words = splitQuranWords(verseText);
    verseWordsRef.current = words;
    const initialVerification = verifyRecitation(words, '');
    setVerification(initialVerification);
    setTranscript('');
  }, [verseText]);

  // Check browser support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as IWindow;
    const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechClass) {
      setIsSupported(false);
    }
  }, []);

  const handleResult = useCallback(
    (newTranscript: string) => {
      setTranscript(newTranscript);
      const res = verifyRecitation(verseWordsRef.current, newTranscript);
      setVerification(res);

      if (res.lastError && onErrorDetected) {
        onErrorDetected(res.lastError);
      }

      if (res.isComplete && onComplete) {
        onComplete(res);
      }
    },
    [onComplete, onErrorDetected]
  );

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as IWindow;
    const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechClass) {
      setIsSupported(false);
      setLastErrorMsg('المتصفح الحالي لا يدعم التعرف على الصوت المباشر. يُرجى استخدام متصفح حديث مثل Chrome أو Edge أو Safari.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechClass();
      recognition.lang = 'ar-SA';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let accumulated = transcript;

      recognition.onstart = () => {
        setIsListening(true);
        shouldListenRef.current = true;
        setLastErrorMsg(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += ' ' + item[0].transcript;
          } else {
            currentInterim += ' ' + item[0].transcript;
          }
        }

        if (currentFinal) {
          accumulated += ' ' + currentFinal;
        }

        const totalSpoken = (accumulated + ' ' + currentInterim).trim();
        handleResult(totalSpoken);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed') {
          setLastErrorMsg('يرجى السماح بالوصول إلى الميكروفون للبدء في الاستماع وتصحيح التلاوة.');
          setIsListening(false);
          shouldListenRef.current = false;
        } else if (event.error === 'no-speech') {
          // Keep listening
        } else {
          setLastErrorMsg(`تنبيه: ${event.error || 'تعذر التقاط الصوت'}`);
        }
      };

      recognition.onend = () => {
        // Automatically restart if user hasn't explicitly stopped
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
            shouldListenRef.current = false;
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setLastErrorMsg('تعذر تشغيل الميكروفون. يرجى التأكد من صلاحيات الميكروفون في المتصفح.');
      setIsListening(false);
    }
  }, [transcript, handleResult]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
  }, []);

  const resetRecitation = useCallback(() => {
    stopListening();
    setTranscript('');
    setLastErrorMsg(null);
    const words = splitQuranWords(verseText);
    verseWordsRef.current = words;
    setVerification(verifyRecitation(words, ''));
  }, [verseText, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    verification,
    lastErrorMsg,
    startListening,
    stopListening,
    resetRecitation,
  };
}
