'use client';

import { useState, useEffect } from "react";
import { Plus, Megaphone, Users as UsersIcon, Calendar, Eye } from "lucide-react";
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — ANNOUNCEMENT SYSTEM (STORY-C-3)
// Page content only — layout provided by (faculty)/layout.tsx
// ═══════════════════════════════════════════════════════════════

interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: "all" | "faculty" | "students" | "admins";
  priority: "low" | "normal" | "high" | "urgent";
  published_at: string;
  views: number;
  status: "draft" | "published" | "scheduled";
}

export default function AnnouncementSystem() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [_showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockAnnouncements: Announcement[] = [
      {
        id: "1",
        title: "System Maintenance Scheduled",
        content: "The Journey-OS platform will undergo scheduled maintenance on February 25, 2026, from 2:00 AM to 6:00 AM EST. During this time, the system will be temporarily unavailable.",
        audience: "all",
        priority: "high",
        published_at: "2026-02-20T09:00:00Z",
        views: 342,
        status: "published",
      },
      {
        id: "2",
        title: "New Question Generation Features",
        content: "We're excited to announce new AI-powered features for question generation, including enhanced blueprint validation and automated difficulty assessment.",
        audience: "faculty",
        priority: "normal",
        published_at: "2026-02-18T14:30:00Z",
        views: 128,
        status: "published",
      },
      {
        id: "3",
        title: "Practice Exam Availability",
        content: "New practice exams for Cardiovascular and Respiratory systems are now available. Access them through your student dashboard.",
        audience: "students",
        priority: "normal",
        published_at: "2026-02-17T10:00:00Z",
        views: 567,
        status: "published",
      },
      {
        id: "4",
        title: "Q2 Analytics Report",
        content: "The Q2 analytics report is ready for review. Please check the analytics dashboard for detailed insights.",
        audience: "admins",
        priority: "low",
        published_at: "2026-02-15T16:00:00Z",
        views: 24,
        status: "published",
      },
    ];

    setAnnouncements(mockAnnouncements);
  };

  const getAudienceConfig = (audience: Announcement["audience"]) => {
    switch (audience) {
      case "all": return { label: "All Users", color: C.navyDeep };
      case "faculty": return { label: "Faculty", color: C.blueMid };
      case "students": return { label: "Students", color: C.green };
      case "admins": return { label: "Admins", color: "#fa9d33" };
    }
  };

  const getPriorityConfig = (priority: Announcement["priority"]) => {
    switch (priority) {
      case "urgent": return { label: "Urgent", color: C.red };
      case "high": return { label: "High", color: "#fa9d33" };
      case "normal": return { label: "Normal", color: C.blueMid };
      case "low": return { label: "Low", color: C.textMuted };
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* Page Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            fontFamily: serif,
            fontSize: isMobile ? 24 : 30,
            fontWeight: 700,
            color: C.navyDeep,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            margin: 0,
          }}>
            Announcements
          </h1>
          <p style={{
            fontFamily: sans,
            fontSize: 14,
            color: C.textSecondary,
            margin: "4px 0 0",
          }}>
            Broadcast messages to users
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          style={{
            padding: isMobile ? "8px 16px" : "10px 20px",
            background: C.green,
            border: "none",
            borderRadius: 8,
            fontFamily: sans,
            fontSize: 14,
            fontWeight: 700,
            color: C.white,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Plus size={16} />
          {!isMobile && "New Announcement"}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: 16,
        marginBottom: 24,
      }}>
        {[
          { label: "Total", value: announcements.length, color: C.navyDeep },
          { label: "Published", value: announcements.filter((a) => a.status === "published").length, color: C.green },
          { label: "Total Views", value: announcements.reduce((sum, a) => sum + a.views, 0), color: C.blueMid },
          { label: "Avg Views", value: announcements.length > 0 ? Math.round(announcements.reduce((sum, a) => sum + a.views, 0) / announcements.length) : 0, color: "#fa9d33" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 8,
            padding: 20,
          }}>
            <div style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.textMuted,
              marginBottom: 8,
            }}>
              {stat.label}
            </div>
            <div style={{
              fontFamily: serif,
              fontSize: 32,
              fontWeight: 700,
              color: stat.color,
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Announcements List */}
      <div style={{
        background: C.white,
        border: `1px solid ${C.borderLight}`,
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <div style={{
          padding: isMobile ? 20 : 24,
          borderBottom: `1px solid ${C.borderLight}`,
        }}>
          <h2 style={{
            fontFamily: serif,
            fontSize: 20,
            fontWeight: 700,
            color: C.navyDeep,
            margin: 0,
          }}>
            All Announcements
          </h2>
        </div>

        <div>
          {announcements.length === 0 ? (
            <div style={{
              padding: 60,
              textAlign: "center",
            }}>
              <Megaphone size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
              <p style={{
                fontFamily: sans,
                fontSize: 15,
                color: C.textMuted,
                margin: 0,
              }}>
                No announcements yet.
              </p>
            </div>
          ) : (
            announcements.map((announcement, index) => {
              const audienceConfig = getAudienceConfig(announcement.audience);
              const priorityConfig = getPriorityConfig(announcement.priority);

              return (
                <div
                  key={announcement.id}
                  style={{
                    padding: isMobile ? "16px 20px" : "24px",
                    borderBottom: index < announcements.length - 1 ? `1px solid ${C.borderLight}` : "none",
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontFamily: serif,
                        fontSize: 18,
                        fontWeight: 700,
                        color: C.navyDeep,
                        margin: "0 0 8px",
                      }}>
                        {announcement.title}
                      </h3>
                      <p style={{
                        fontFamily: sans,
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: C.textSecondary,
                        margin: "0 0 12px",
                      }}>
                        {announcement.content}
                      </p>
                      <div style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          background: `${audienceConfig.color}15`,
                          border: `1px solid ${audienceConfig.color}40`,
                          borderRadius: 6,
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 600,
                          color: audienceConfig.color,
                        }}>
                          <UsersIcon size={14} />
                          {audienceConfig.label}
                        </div>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          background: `${priorityConfig.color}15`,
                          border: `1px solid ${priorityConfig.color}40`,
                          borderRadius: 6,
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 600,
                          color: priorityConfig.color,
                        }}>
                          {priorityConfig.label}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: C.parchment,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: 12,
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                    fontFamily: mono,
                    fontSize: 11,
                    color: C.textMuted,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Calendar size={14} />
                      {formatDate(announcement.published_at)}
                    </div>
                    <span>-</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Eye size={14} />
                      {announcement.views} views
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
