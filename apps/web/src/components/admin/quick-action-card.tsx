"use client";

import Link from "next/link";

interface QuickActionCardProps {
  readonly label: string;
  readonly href: string;
  readonly icon: string;
  readonly description: string;
}

export function QuickActionCard({
  label,
  href,
  icon,
  description,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-blue-mid/20 p-4 transition-colors hover:border-blue-mid"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" role="img" aria-label={label}>
          {icon}
        </span>
        <div>
          <p className="font-serif font-medium text-text-primary">{label}</p>
          <p className="text-sm text-text-secondary">{description}</p>
        </div>
      </div>
    </Link>
  );
}
