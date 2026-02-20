/**
 * USE SCROLL Y HOOK
 * 
 * Returns current vertical scroll position.
 * Used for sticky nav transitions, scroll-based effects.
 */

import { useState, useEffect } from "react";

export function useScrollY(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    handleScroll(); // Initial value
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return scrollY;
}
