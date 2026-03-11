'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--navy)]">
        Something went wrong
      </h2>
      <p className="text-[var(--gray-600)]">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-md bg-[var(--navy)] px-6 py-2 text-sm font-semibold text-white hover:bg-[var(--blue)]"
      >
        Try again
      </button>
    </main>
  );
}
