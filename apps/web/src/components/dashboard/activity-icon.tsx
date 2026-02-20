"use client";

import {
  Sparkles,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  type LucideProps,
} from "lucide-react";
import type { ActivityEventType } from "@journey-os/types";

const ICON_MAP: Record<
  ActivityEventType,
  { icon: React.ComponentType<LucideProps>; className: string }
> = {
  question_generated: { icon: Sparkles, className: "text-blue-500" },
  question_reviewed: { icon: Eye, className: "text-yellow-500" },
  question_approved: { icon: CheckCircle, className: "text-green-500" },
  question_rejected: { icon: XCircle, className: "text-red-500" },
  coverage_gap_detected: { icon: AlertTriangle, className: "text-orange-500" },
  bulk_generation_complete: { icon: Package, className: "text-purple-500" },
};

interface ActivityIconProps {
  readonly eventType: ActivityEventType;
  readonly size?: number;
}

export function ActivityIcon({ eventType, size = 18 }: ActivityIconProps) {
  const config = ICON_MAP[eventType];
  const IconComponent = config.icon;
  return <IconComponent size={size} className={config.className} />;
}
