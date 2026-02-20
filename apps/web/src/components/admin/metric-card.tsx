"use client";

export interface MetricCardProps {
  label: string;
  value: number | string;
}

function formatValue(value: number | string): string {
  if (typeof value === "string") return value;
  return value.toLocaleString();
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-lg bg-parchment p-4 shadow-sm">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl font-bold text-navy-deep">
        {formatValue(value)}
      </p>
    </div>
  );
}
