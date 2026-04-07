import { useRef, useState, useEffect, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<unknown>;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 70, maxPull = 120 }: PullToRefreshOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      if (el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || isRefreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta < 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      const dampened = Math.min(delta * 0.45, maxPull);
      setPullDistance(dampened);
      if (dampened > 10) {
        e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= threshold) {
        handleRefresh();
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isRefreshing, pullDistance, threshold, maxPull, handleRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const isPastThreshold = pullDistance >= threshold;

  return {
    containerRef,
    pullDistance,
    isRefreshing,
    progress,
    isPastThreshold,
  };
}
