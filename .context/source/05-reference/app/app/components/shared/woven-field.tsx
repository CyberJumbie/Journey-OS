/**
 * WOVEN FIELD — Brand Texture Element
 * 
 * Canvas-drawn woven thread pattern for subtle organic warmth.
 * Used on brand panels, hero sections, inverted bookmarks.
 * Always position: absolute with pointer-events: none
 */

import { useEffect, useRef } from "react";

interface WovenFieldProps {
  color?: string;
  opacity?: number;
  density?: number;
}

export function WovenField({ 
  color = "var(--navy-deep)", 
  opacity = 0.03, 
  density = 16 
}: WovenFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    function draw() {
      const cw = canvas!.offsetWidth;
      const ch = canvas!.offsetHeight;
      ctx!.clearRect(0, 0, cw * 2, ch * 2);
      
      const spacing = cw / density;
      
      // Horizontal threads
      for (let y = 0; y < ch; y += spacing) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        for (let x = 0; x < cw; x += 4) {
          ctx!.lineTo(x, y + Math.sin(x * 0.015 + y * 0.01) * 1.5);
        }
        ctx!.strokeStyle = color;
        ctx!.globalAlpha = opacity;
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }
      
      // Vertical threads
      for (let x = 0; x < cw; x += spacing * 2) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        for (let y = 0; y < ch; y += 4) {
          ctx!.lineTo(x + Math.sin(y * 0.012 + x * 0.008) * 1.5, y);
        }
        ctx!.strokeStyle = color;
        ctx!.globalAlpha = opacity * 0.7;
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }
      
      ctx!.globalAlpha = 1;
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [color, opacity, density]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
