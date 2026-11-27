'use client';

import { useEffect, useState } from 'react';
import { isClientLocalHost } from './siteUrls';

/**
 * Hook seguro para hidratação SSR: começa como false no servidor/1.ª passagem
 * e atualiza após montagem no browser, evitando hydration mismatch.
 */
export function useIsLocalHost(): boolean {
  const [isLocal, setIsLocal] = useState(false);
  useEffect(() => {
    setIsLocal(isClientLocalHost());
  }, []);
  return isLocal;
}
