'use client';

import { C } from '@/lib/design-tokens';

export function ThreadDivider({ color = C.warmGray }: { color?: string }) {
  return (
    <div style={{ position: "relative", height: 20, overflow: "hidden", margin: "0 auto", maxWidth: 200 }}>
      <svg width="100%" height="20" viewBox="0 0 200 20" preserveAspectRatio="none">
        <path d="M0,10 Q25,2 50,10 T100,10 T150,10 T200,10" stroke={color} strokeWidth="1.5" fill="none" />
        <path d="M0,10 Q25,18 50,10 T100,10 T150,10 T200,10" stroke={color} strokeWidth="1" fill="none" opacity="0.5" />
      </svg>
    </div>
  );
}
