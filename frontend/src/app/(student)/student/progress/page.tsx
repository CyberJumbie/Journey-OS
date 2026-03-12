'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import { BookOpen, TrendingUp, TrendingDown, Target, Award, Clock } from "lucide-react";
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — STUDENT PROGRESS/ANALYTICS (STORY-S-3)
// Content only — layout shell provided by (student)/layout.tsx
// ═══════════════════════════════════════════════════════════════

interface TopicMastery {
  topic: string;
  mastery: number;
  questions_attempted: number;
  trend: "improving" | "stable" | "declining";
}

interface RecentSession {
  id: string;
  title: string;
  date: string;
  score: number;
  questions: number;
  time_spent: number;
}

export default function StudentProgress() {
  const router = useRouter();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week");
  const [topicMastery, setTopicMastery] = useState<TopicMastery[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockTopics: TopicMastery[] = [
        { topic: "Cardiovascular Pharmacology", mastery: 0.85, questions_attempted: 142, trend: "improving" },
        { topic: "Respiratory Pathophysiology", mastery: 0.78, questions_attempted: 98, trend: "stable" },
        { topic: "Autonomic Nervous System", mastery: 0.72, questions_attempted: 76, trend: "improving" },
        { topic: "Renal Pharmacology", mastery: 0.65, questions_attempted: 54, trend: "declining" },
        { topic: "Endocrine System", mastery: 0.58, questions_attempted: 42, trend: "stable" },
        { topic: "CNS Pharmacology", mastery: 0.52, questions_attempted: 38, trend: "improving" },
      ];

      const mockSessions: RecentSession[] = [
        { id: "1", title: "Cardiovascular Pharmacology Review", date: "2026-02-20T14:30:00Z", score: 85, questions: 20, time_spent: 28 },
        { id: "2", title: "Quick Practice Session", date: "2026-02-19T10:15:00Z", score: 78, questions: 15, time_spent: 18 },
        { id: "3", title: "Respiratory System Review", date: "2026-02-18T16:45:00Z", score: 82, questions: 18, time_spent: 25 },
        { id: "4", title: "Mixed USMLE Practice", date: "2026-02-17T13:20:00Z", score: 73, questions: 30, time_spent: 42 },
        { id: "5", title: "Autonomic NS Focus", date: "2026-02-16T09:00:00Z", score: 88, questions: 12, time_spent: 16 },
      ];

      setTopicMastery(mockTopics);
      setRecentSessions(mockSessions);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.45s ease ${d}s, transform 0.45s ease ${d}s`,
  });

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 0.8) return C.green;
    if (mastery >= 0.6) return "#fa9d33";
    return C.red;
  };

  const getTrendIcon = (trend: TopicMastery["trend"]) => {
    switch (trend) {
      case "improving": return <TrendingUp size={16} style={{ color: C.green }} />;
      case "declining": return <TrendingDown size={16} style={{ color: C.red }} />;
      case "stable": return <div style={{ width: 16, height: 2, background: C.textMuted }} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
  };

  const avgScore = recentSessions.length > 0
    ? recentSessions.reduce((sum, s) => sum + s.score, 0) / recentSessions.length
    : 0;
  const totalQuestions = recentSessions.reduce((sum, s) => sum + s.questions, 0);
  const totalTime = recentSessions.reduce((sum, s) => sum + s.time_spent, 0);
  const currentStreak = 12; // Mock data

  return (
    <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
      {/* Time Range Selector */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["week", "month", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: isMobile ? "6px 12px" : "8px 16px",
                background: timeRange === range ? C.navyDeep : C.white,
                border: `1px solid ${timeRange === range ? C.navyDeep : C.border}`,
                borderRadius: 6,
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: timeRange === range ? C.white : C.textPrimary,
                cursor: "pointer",
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{
        ...fadeIn(0.05),
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: 16,
        marginBottom: 24,
      }}>
        {[
          { label: "Average Score", value: `${Math.round(avgScore)}%`, icon: <Target size={20} />, color: avgScore >= 80 ? C.green : "#fa9d33" },
          { label: "Questions Done", value: totalQuestions, icon: <BookOpen size={20} />, color: C.blueMid },
          { label: "Study Time", value: `${Math.floor(totalTime / 60)}h ${totalTime % 60}m`, icon: <Clock size={20} />, color: C.navyDeep },
          { label: "Current Streak", value: `${currentStreak} days`, icon: <Award size={20} />, color: C.green },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 8,
            padding: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: `${stat.color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: stat.color,
              flexShrink: 0,
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.textMuted,
                marginBottom: 4,
              }}>
                {stat.label}
              </div>
              <div style={{
                fontFamily: serif,
                fontSize: 28,
                fontWeight: 700,
                color: stat.color,
              }}>
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
        gap: 24,
      }}>
        {/* Topic Mastery */}
        <div style={{
          ...fadeIn(0.1),
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
              Topic Mastery
            </h2>
          </div>

          <div style={{ padding: isMobile ? 16 : 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {topicMastery.map((topic) => (
                <div key={topic.topic}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}>
                    <div style={{
                      fontFamily: sans,
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.textPrimary,
                    }}>
                      {topic.topic}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {getTrendIcon(topic.trend)}
                      <span style={{
                        fontFamily: serif,
                        fontSize: 18,
                        fontWeight: 700,
                        color: getMasteryColor(topic.mastery),
                      }}>
                        {Math.round(topic.mastery * 100)}%
                      </span>
                    </div>
                  </div>
                  <div style={{
                    width: "100%",
                    height: 8,
                    background: C.parchment,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${topic.mastery * 100}%`,
                      background: getMasteryColor(topic.mastery),
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                  <div style={{
                    fontFamily: mono,
                    fontSize: 10,
                    color: C.textMuted,
                    marginTop: 4,
                  }}>
                    {topic.questions_attempted} questions attempted
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div style={{
          ...fadeIn(0.15),
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
              Recent Sessions
            </h2>
          </div>

          <div>
            {recentSessions.map((session, index) => (
              <div
                key={session.id}
                onClick={() => router.push(`/student/results/${session.id}`)}
                style={{
                  padding: isMobile ? "16px 20px" : "20px 24px",
                  borderBottom: index < recentSessions.length - 1 ? `1px solid ${C.borderLight}` : "none",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.parchment;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}>
                  <div style={{
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: 600,
                    color: C.textPrimary,
                  }}>
                    {session.title}
                  </div>
                  <div style={{
                    fontFamily: serif,
                    fontSize: 20,
                    fontWeight: 700,
                    color: session.score >= 80 ? C.green : session.score >= 60 ? "#fa9d33" : C.red,
                  }}>
                    {session.score}%
                  </div>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontFamily: mono,
                  fontSize: 10,
                  color: C.textMuted,
                }}>
                  <span>{session.questions} questions</span>
                  <span>•</span>
                  <span>{session.time_spent} min</span>
                  <span>•</span>
                  <span>{formatDate(session.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
