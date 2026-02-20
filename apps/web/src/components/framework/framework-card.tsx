"use client";

import Link from "next/link";
import {
  Stethoscope,
  BookOpen,
  ClipboardList,
  ShieldCheck,
  Award,
  GraduationCap,
  Target,
  Layers,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  "book-open": BookOpen,
  "clipboard-list": ClipboardList,
  "shield-check": ShieldCheck,
  award: Award,
  "graduation-cap": GraduationCap,
  target: Target,
  layers: Layers,
};

interface FrameworkCardProps {
  readonly frameworkKey: string;
  readonly name: string;
  readonly description: string;
  readonly nodeCount: number;
  readonly hierarchyDepth: number;
  readonly icon: string;
}

export function FrameworkCard({
  frameworkKey,
  name,
  description,
  nodeCount,
  hierarchyDepth,
  icon,
}: FrameworkCardProps) {
  const IconComponent = ICON_MAP[icon];

  return (
    <Link href={`/institution/frameworks/${frameworkKey}`}>
      <div className="rounded-lg border border-border-light bg-white p-6 shadow-sm transition hover:border-blue-mid hover:shadow-md">
        <div className="flex items-start gap-3">
          {IconComponent && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-mid/10">
              <IconComponent className="h-5 w-5 text-blue-mid" />
            </div>
          )}
          <h3 className="font-serif text-lg font-semibold text-text-primary">
            {name}
          </h3>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-text-secondary">
          {description}
        </p>
        <div className="mt-4 flex gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider rounded-full bg-blue-mid/10 px-2 py-1 text-blue-mid">
            {nodeCount} nodes
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider rounded-full bg-parchment px-2 py-1 text-text-secondary">
            {hierarchyDepth} {hierarchyDepth === 1 ? "level" : "levels"}
          </span>
        </div>
      </div>
    </Link>
  );
}
