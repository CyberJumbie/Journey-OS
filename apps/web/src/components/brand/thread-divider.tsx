"use client";

interface ThreadDividerProps {
  className?: string;
}

export function ThreadDivider({ className = "" }: ThreadDividerProps) {
  return (
    <div
      className={`relative mx-auto overflow-hidden ${className}`}
      style={{ height: 20, maxWidth: 200 }}
    >
      <svg
        width="100%"
        height="20"
        viewBox="0 0 200 20"
        preserveAspectRatio="none"
      >
        <path
          d="M0,10 Q25,2 50,10 T100,10 T150,10 T200,10"
          stroke="#d7d3c8" /* token: --warm-gray */
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M0,10 Q25,18 50,10 T100,10 T150,10 T200,10"
          stroke="#d7d3c8" /* token: --warm-gray */
          strokeWidth="1"
          fill="none"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}
