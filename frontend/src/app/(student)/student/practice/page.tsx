'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import { Dumbbell, Play, Filter, Target } from "lucide-react";
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — STUDENT PRACTICE MODE (STORY-S-2)
// Content only — layout shell provided by (student)/layout.tsx
// ═══════════════════════════════════════════════════════════════

interface PracticeSet {
  id: string;
  title: string;
  description: string;
  question_count: number;
  estimated_time: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  topics: string[];
  last_attempted?: string;
  best_score?: number;
}

export default function StudentPractice() {
  const router = useRouter();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const [mounted, setMounted] = useState(false);

  const [practiceSets, setPracticeSets] = useState<PracticeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<"quick" | "custom" | "sets">("sets");
  const [filters, setFilters] = useState({
    difficulty: "all",
    topics: "all",
  });

  // Quick Practice Config
  const [quickConfig, setQuickConfig] = useState({
    question_count: 10,
    time_limit: 15,
    include_weak_areas: true,
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetchPracticeSets();
  }, [filters]);

  const fetchPracticeSets = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockSets: PracticeSet[] = [
        {
          id: "1",
          title: "Cardiovascular Pharmacology Review",
          description: "Focus on beta-blockers, ACE inhibitors, and diuretics",
          question_count: 20,
          estimated_time: 30,
          difficulty: "Medium",
          topics: ["Cardiovascular", "Pharmacology"],
          last_attempted: "2026-02-19T14:30:00Z",
          best_score: 85,
        },
        {
          id: "2",
          title: "Respiratory System Pathophysiology",
          description: "COPD, Asthma, and Pneumonia clinical scenarios",
          question_count: 15,
          estimated_time: 25,
          difficulty: "Hard",
          topics: ["Respiratory", "Pathophysiology"],
          last_attempted: "2026-02-18T10:15:00Z",
          best_score: 73,
        },
        {
          id: "3",
          title: "Autonomic Nervous System",
          description: "Sympathetic and parasympathetic pharmacology",
          question_count: 12,
          estimated_time: 20,
          difficulty: "Medium",
          topics: ["Nervous System", "Pharmacology"],
        },
        {
          id: "4",
          title: "Renal Pharmacology Basics",
          description: "Diuretics mechanism and clinical applications",
          question_count: 18,
          estimated_time: 25,
          difficulty: "Easy",
          topics: ["Renal", "Pharmacology"],
          best_score: 92,
        },
        {
          id: "5",
          title: "Mixed USMLE Practice",
          description: "Multi-system integration questions",
          question_count: 30,
          estimated_time: 45,
          difficulty: "Mixed",
          topics: ["Cardiovascular", "Respiratory", "Renal", "Endocrine"],
          last_attempted: "2026-02-17T16:00:00Z",
          best_score: 78,
        },
      ];

      let filtered = mockSets.filter((set) => {
        if (filters.difficulty !== "all" && set.difficulty !== filters.difficulty) return false;
        if (filters.topics !== "all" && !set.topics.includes(filters.topics)) return false;
        return true;
      });

      setPracticeSets(filtered);
    } catch (err) {
      console.error("Failed to fetch practice sets", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuickPractice = () => {
    router.push("/student/practice/session/quick");
  };

  const handleStartPracticeSet = (setId: string) => {
    router.push(`/student/practice/session/${setId}`);
  };

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.45s ease ${d}s, transform 0.45s ease ${d}s`,
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return C.green;
      case "Medium": return "#fa9d33";
      case "Hard": return C.red;
      case "Mixed": return C.blueMid;
      default: return C.textMuted;
    }
  };

  return (
    <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
      {/* Mode Selector */}
      <div style={{
        ...fadeIn(0.05),
        display: "flex",
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { key: "sets", label: "Practice Sets" },
          { key: "quick", label: "Quick Practice" },
          { key: "custom", label: "Custom Session" },
        ].map((mode) => (
          <button
            key={mode.key}
            onClick={() => setSelectedMode(mode.key as "quick" | "custom" | "sets")}
            style={{
              padding: "10px 20px",
              background: selectedMode === mode.key ? C.navyDeep : C.white,
              border: `1px solid ${selectedMode === mode.key ? C.navyDeep : C.border}`,
              borderRadius: 8,
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 600,
              color: selectedMode === mode.key ? C.white : C.textPrimary,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Quick Practice */}
      {selectedMode === "quick" && (
        <div style={{
          ...fadeIn(0.1),
          background: C.white,
          border: `1px solid ${C.borderLight}`,
          borderRadius: 12,
          padding: isMobile ? 24 : 32,
          maxWidth: 600,
        }}>
          <h2 style={{
            fontFamily: serif,
            fontSize: 22,
            fontWeight: 700,
            color: C.navyDeep,
            marginBottom: 24,
          }}>
            Quick Practice Session
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Question Count */}
            <div>
              <label style={{
                display: "block",
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.textMuted,
                marginBottom: 12,
              }}>
                Number of Questions: {quickConfig.question_count}
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={quickConfig.question_count}
                onChange={(e) => setQuickConfig({ ...quickConfig, question_count: Number(e.target.value) })}
                style={{
                  width: "100%",
                  height: 6,
                  background: C.parchment,
                  borderRadius: 3,
                  outline: "none",
                  cursor: "pointer",
                }}
              />
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
                fontFamily: mono,
                fontSize: 10,
                color: C.textMuted,
              }}>
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            {/* Time Limit */}
            <div>
              <label style={{
                display: "block",
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.textMuted,
                marginBottom: 12,
              }}>
                Time Limit: {quickConfig.time_limit} minutes
              </label>
              <input
                type="range"
                min="5"
                max="60"
                step="5"
                value={quickConfig.time_limit}
                onChange={(e) => setQuickConfig({ ...quickConfig, time_limit: Number(e.target.value) })}
                style={{
                  width: "100%",
                  height: 6,
                  background: C.parchment,
                  borderRadius: 3,
                  outline: "none",
                  cursor: "pointer",
                }}
              />
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 6,
                fontFamily: mono,
                fontSize: 10,
                color: C.textMuted,
              }}>
                <span>5 min</span>
                <span>60 min</span>
              </div>
            </div>

            {/* Include Weak Areas */}
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              cursor: "pointer",
            }}>
              <input
                type="checkbox"
                checked={quickConfig.include_weak_areas}
                onChange={(e) => setQuickConfig({ ...quickConfig, include_weak_areas: e.target.checked })}
                style={{
                  width: 18,
                  height: 18,
                  cursor: "pointer",
                }}
              />
              <span style={{
                fontFamily: sans,
                fontSize: 15,
                fontWeight: 600,
                color: C.textPrimary,
              }}>
                Include questions from my weak areas
              </span>
            </label>

            {/* Start Button */}
            <button
              onClick={handleStartQuickPractice}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: C.green,
                border: "none",
                borderRadius: 8,
                fontFamily: sans,
                fontSize: 15,
                fontWeight: 700,
                color: C.white,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.greenDark;
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.green;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Play size={20} />
              Start Quick Practice
            </button>
          </div>
        </div>
      )}

      {/* Practice Sets */}
      {selectedMode === "sets" && (
        <>
          {/* Filters */}
          <div style={{
            ...fadeIn(0.1),
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            padding: isMobile ? 16 : 20,
            marginBottom: 20,
          }}>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
            }}>
              <Filter size={18} style={{ color: C.textMuted }} />

              <select
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                style={{
                  height: 40,
                  background: C.parchment,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "0 32px 0 12px",
                  fontFamily: sans,
                  fontSize: 15,
                  color: C.ink,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Mixed">Mixed</option>
              </select>

              <select
                value={filters.topics}
                onChange={(e) => setFilters({ ...filters, topics: e.target.value })}
                style={{
                  height: 40,
                  background: C.parchment,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "0 32px 0 12px",
                  fontFamily: sans,
                  fontSize: 15,
                  color: C.ink,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Topics</option>
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Nervous System">Nervous System</option>
                <option value="Renal">Renal</option>
                <option value="Endocrine">Endocrine</option>
              </select>
            </div>
          </div>

          {/* Practice Sets Grid */}
          <div style={{
            ...fadeIn(0.15),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "repeat(2, 1fr)",
            gap: 16,
          }}>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} style={{
                  background: C.white,
                  border: `1px solid ${C.borderLight}`,
                  borderRadius: 12,
                  padding: 24,
                  height: 220,
                }} />
              ))
            ) : practiceSets.length === 0 ? (
              <div style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 12,
                padding: 64,
                textAlign: "center",
                gridColumn: "1 / -1",
              }}>
                <Dumbbell size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
                <h3 style={{
                  fontFamily: serif,
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.navyDeep,
                  marginBottom: 8,
                }}>
                  No practice sets found
                </h3>
                <p style={{
                  fontFamily: sans,
                  fontSize: 15,
                  color: C.textSecondary,
                }}>
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              practiceSets.map((set) => (
                <div
                  key={set.id}
                  style={{
                    background: C.white,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 12,
                    padding: isMobile ? 20 : 24,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.blueMid;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,44,118,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.borderLight;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Header */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}>
                    <div style={{
                      fontFamily: mono,
                      fontSize: 10,
                      fontWeight: 600,
                      color: getDifficultyColor(set.difficulty),
                    }}>
                      {set.difficulty}
                    </div>
                    {set.best_score && (
                      <div style={{
                        fontFamily: mono,
                        fontSize: 11,
                        fontWeight: 600,
                        color: C.green,
                      }}>
                        Best: {set.best_score}%
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontFamily: serif,
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.navyDeep,
                    marginBottom: 8,
                  }}>
                    {set.title}
                  </h3>

                  {/* Description */}
                  <p style={{
                    fontFamily: sans,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: C.textSecondary,
                    marginBottom: 16,
                  }}>
                    {set.description}
                  </p>

                  {/* Metadata */}
                  <div style={{
                    background: C.parchment,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                  }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: 12,
                    }}>
                      <div>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 9,
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: C.textMuted,
                          marginBottom: 2,
                        }}>
                          Questions
                        </div>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.textPrimary,
                        }}>
                          {set.question_count}
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 9,
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: C.textMuted,
                          marginBottom: 2,
                        }}>
                          Est. Time
                        </div>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.textPrimary,
                        }}>
                          {set.estimated_time} min
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={() => handleStartPracticeSet(set.id)}
                    style={{
                      width: "100%",
                      padding: "12px 20px",
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
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Play size={16} />
                    Start Practice
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Custom Session (placeholder) */}
      {selectedMode === "custom" && (
        <div style={{
          ...fadeIn(0.1),
          background: C.white,
          border: `1px solid ${C.borderLight}`,
          borderRadius: 12,
          padding: 64,
          textAlign: "center",
        }}>
          <Target size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
          <h3 style={{
            fontFamily: serif,
            fontSize: 22,
            fontWeight: 700,
            color: C.navyDeep,
            marginBottom: 8,
          }}>
            Custom Session Builder
          </h3>
          <p style={{
            fontFamily: sans,
            fontSize: 15,
            color: C.textSecondary,
          }}>
            Coming soon: Build your own practice session with custom filters
          </p>
        </div>
      )}
    </div>
  );
}
