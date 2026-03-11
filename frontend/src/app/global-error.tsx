'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#002c76' }}>Something went wrong</h2>
          <p style={{ color: '#4b5563' }}>{error.message}</p>
          <button
            onClick={reset}
            style={{ background: '#002c76', color: '#fff', padding: '8px 24px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
