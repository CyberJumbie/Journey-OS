'use client';

/**
 * WOVEN FIELD — Canvas-based woven texture background
 *
 * Draws subtle sinusoidal horizontal + vertical lines on a canvas
 * to create a woven fabric texture. Used as decorative background.
 * Atom level: no state, no data fetching.
 */

import { useEffect, useRef } from 'react';

interface WovenFieldProps {
  /** Line color — use CSS var string e.g. "var(--navy-deep)" or hex */
  color?: string;
  /** Line opacity (0-1) */
  opacity?: number;
  /** Number of horizontal lines across the width */
  density?: number;
}

export function WovenField({
  color = 'var(--navy-deep)',
  opacity = 0.06,
  density = 14,
}: WovenFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolve CSS variable to actual color for canvas rendering
    const resolvedColor = color.startsWith('var(')
      ? window.getComputedStyle(canvas).getPropertyValue(
          color.slice(4, -1)
        ).trim() || '#002c76'
      : color;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      const sp = cw / density;

      ctx.clearRect(0, 0, cw * 2, ch * 2);

      // Horizontal woven lines
      for (let y = 0; y < ch; y += sp) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < cw; x += 4) {
          ctx.lineTo(x, y + Math.sin(x * 0.015 + y * 0.01) * 2.5);
        }
        ctx.strokeStyle = resolvedColor;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Vertical woven lines
      for (let x = 0; x < cw; x += sp * 2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = 0; y < ch; y += 4) {
          ctx.lineTo(x + Math.sin(y * 0.012) * 2.5, y);
        }
        ctx.globalAlpha = opacity * 0.7;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [color, opacity, density]);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
