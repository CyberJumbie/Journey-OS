"use client";

import { Lock, Users, Building, Globe } from "lucide-react";
import { Badge } from "@web/components/ui/badge";
import type { TemplateSharingLevel } from "@journey-os/types";

const SHARING_CONFIG: Record<
  TemplateSharingLevel,
  { icon: typeof Lock; label: string; className: string }
> = {
  private: {
    icon: Lock,
    label: "Private",
    className: "bg-muted text-muted-foreground",
  },
  shared_course: {
    icon: Users,
    label: "Course",
    className: "bg-blue-pale/30 text-blue-mid",
  },
  shared_institution: {
    icon: Building,
    label: "Institution",
    className: "bg-purple-100 text-purple-700",
  },
  public: {
    icon: Globe,
    label: "Public",
    className: "bg-green/10 text-green-dark",
  },
};

interface SharingLevelBadgeProps {
  readonly level: TemplateSharingLevel;
}

export function SharingLevelBadge({ level }: SharingLevelBadgeProps) {
  const config = SHARING_CONFIG[level];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
