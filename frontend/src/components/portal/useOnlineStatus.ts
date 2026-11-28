'use client';

import { useEffect, useState } from 'react';

/**
 * Hydration-safe network connectivity hook.
 * Always initializes `true` on SSR and first client pass to prevent hydration mismatches,
 * then synchronizes with `navigator.onLine` and browser `online`/`offline` events.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const sync = () => setIsOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return isOnline;
}
