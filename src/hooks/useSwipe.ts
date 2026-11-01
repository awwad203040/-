'use client';

import { useRef, useCallback, useEffect } from 'react';
import { triggerHaptic } from '@/lib/accessibility';

type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  preventScroll?: boolean;
  disabled?: boolean;
}

export function useSwipe(options: UseSwipeOptions) {
  const { onSwipeLeft, onSwipeRight, threshold = 35, preventScroll = false, disabled = false } = options;
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const isMultiTouch = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;
    if (e.touches.length > 1) {
      isMultiTouch.current = true;
      return;
    }
    isMultiTouch.current = false;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, [disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isMultiTouch.current) return;
    if (e.touches.length > 1) {
      isMultiTouch.current = true;
      return;
    }
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;

    if (preventScroll) {
      const dx = Math.abs(touchEndX.current - touchStartX.current);
      const dy = Math.abs(touchEndY.current - touchStartY.current);
      if (dx > dy) {
        e.preventDefault();
      }
    }
  }, [preventScroll, disabled]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || isMultiTouch.current) {
      isMultiTouch.current = false;
      touchStartX.current = 0;
      touchStartY.current = 0;
      touchEndX.current = 0;
      touchEndY.current = 0;
      return;
    }

    const dx = touchStartX.current - touchEndX.current;
    const dy = touchStartY.current - touchEndY.current;

    // Only handle horizontal swipes (dx > dy)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      const direction: SwipeDirection = dx > 0 ? 'left' : 'right';
      if (direction === 'left' && onSwipeLeft) {
        triggerHaptic('next');
        onSwipeLeft();
      } else if (direction === 'right' && onSwipeRight) {
        triggerHaptic('prev');
        onSwipeRight();
      }
    }

    // Reset
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    touchEndY.current = 0;
  }, [onSwipeLeft, onSwipeRight, threshold, disabled]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll]);

  return containerRef;
}
