export interface RecentUser {
  id: string;
  name: string;
  initials: string;
  role: string;
  joinedAgo: string;
}

export interface SystemAlert {
  id: string;
  severity: "info" | "warning" | "error";
  message: string;
  timestamp: string;
}

export const mockRecentUsers: RecentUser[] = [
  {
    id: "1",
    name: "Dr. Amara Osei",
    initials: "AO",
    role: "faculty",
    joinedAgo: "2h ago",
  },
  {
    id: "2",
    name: "Marcus Chen",
    initials: "MC",
    role: "student",
    joinedAgo: "5h ago",
  },
  {
    id: "3",
    name: "Dr. Patricia Reeves",
    initials: "PR",
    role: "institutional_admin",
    joinedAgo: "1d ago",
  },
  {
    id: "4",
    name: "James Whitfield",
    initials: "JW",
    role: "advisor",
    joinedAgo: "2d ago",
  },
  {
    id: "5",
    name: "Dr. Sofia Ramirez",
    initials: "SR",
    role: "faculty",
    joinedAgo: "3d ago",
  },
];

export const mockSystemAlerts: SystemAlert[] = [
  {
    id: "a1",
    severity: "warning",
    message: "Neo4j sync queue has 12 pending items",
    timestamp: "10 min ago",
  },
  {
    id: "a2",
    severity: "info",
    message: "Scheduled backup completed successfully",
    timestamp: "1h ago",
  },
  {
    id: "a3",
    severity: "error",
    message: "3 failed login attempts from IP 192.168.1.42",
    timestamp: "2h ago",
  },
  {
    id: "a4",
    severity: "info",
    message: "USMLE knowledge graph seeding complete (227 nodes)",
    timestamp: "6h ago",
  },
];

const ROLE_BADGES: Record<string, string> = {
  faculty: "bg-blue-mid/10 text-blue-mid",
  student: "bg-green/10 text-green",
  institutional_admin: "bg-navy-deep/10 text-navy-deep",
  advisor: "bg-warning/10 text-warning",
  superadmin: "bg-error/10 text-error",
};

export function getRoleBadgeClass(role: string): string {
  return ROLE_BADGES[role] ?? "bg-warm-gray text-text-secondary";
}

const SEVERITY_STYLES: Record<string, { icon: string; color: string }> = {
  info: { icon: "\u2139", color: "text-blue-mid" },
  warning: { icon: "\u26A0", color: "text-warning" },
  error: { icon: "\u2716", color: "text-error" },
};

export function getSeverityStyle(severity: string): {
  icon: string;
  color: string;
} {
  return SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;
}
