import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="text-center">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-semibold text-[var(--navy)]">
          Journey OS
        </h1>
        <p className="mt-4 text-lg text-[var(--gray-600)]">
          AI-powered competency-based medical education
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-md bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--blue)]"
        >
          Faculty Dashboard
        </Link>
        <Link
          href="/admin"
          className="rounded-md border border-[var(--navy)] px-6 py-3 text-sm font-semibold text-[var(--navy)] transition-colors hover:bg-[var(--parchment)]"
        >
          Admin Dashboard
        </Link>
      </div>
    </main>
  );
}
