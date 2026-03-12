'use client';

/**
 * StreamingText atom — renders text with append-only behavior.
 * Uses a ref to track the last rendered length, appending only new characters
 * to avoid flicker on re-render from STATE_DELTA updates.
 */

import { useRef, useEffect } from 'react';

interface StreamingTextProps {
  text: string;
  className?: string;
}

export default function StreamingText({ text, className = '' }: StreamingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedLengthRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const newContent = text.slice(renderedLengthRef.current);
    if (newContent.length === 0) return;

    // Append only the new text as a text node to avoid re-rendering existing content
    const textNode = document.createTextNode(newContent);
    container.appendChild(textNode);
    renderedLengthRef.current = text.length;
  }, [text]);

  // Reset if text is cleared (new generation)
  useEffect(() => {
    if (text.length === 0 && containerRef.current) {
      containerRef.current.textContent = '';
      renderedLengthRef.current = 0;
    }
  }, [text]);

  return <div ref={containerRef} className={className} />;
}
