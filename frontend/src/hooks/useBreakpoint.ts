'use client';

import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Returns the current breakpoint based on window width.
 * mobile: < 640px, tablet: 640-1023px, desktop: >= 1024px
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return bp;
}
