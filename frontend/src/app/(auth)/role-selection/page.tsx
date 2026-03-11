'use client';

import { useRouter } from 'next/navigation';

import { useState, useEffect } from "react";
import { C, sans, serif, mono, WovenField, AscSquares } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';
export default function RoleSelection() {
  const router = useRouter();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const [mounted, setMounted] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const roles = [
    {
      id: "student",
      title: "Student",
      description: "Access learning materials and practice questions",
      icon: "👨‍🎓",
      features: ["Practice USMLE questions", "Track your progress", "Review exam analytics"],
      color: C.blueMid,
      bgGradient: `linear-gradient(135deg, ${C.blueMid}08 0%, ${C.blue}06 100%)`,
    },
    {
      id: "faculty",
      title: "Faculty",
      description: "Create and manage educational content",
      icon: "👩‍🏫",
      features: ["Generate exam questions", "Manage courses", "Review question quality"],
      color: C.green,
      bgGradient: `linear-gradient(135deg, ${C.green}08 0%, ${C.greenDark}06 100%)`,
    },
    {
      id: "admin",
      title: "Institutional Admin",
      description: "Manage institution-wide settings and frameworks",
      icon: "🛡️",
      features: ["Configure frameworks", "Manage faculty", "Monitor compliance"],
      color: C.navyDeep,
      bgGradient: `linear-gradient(135deg, ${C.navyDeep}08 0%, ${C.navy}06 100%)`,
    },
  ];

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  });

  return (
    <div style={{
      fontFamily: sans, minHeight: "100vh", background: C.cream,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: isMobile ? "40px 20px" : "60px 32px", position: "relative", overflow: "hidden",
    }}>
      <WovenField color={C.navyDeep} opacity={0.025} density={18} />

      <div style={{ width: "100%", maxWidth: 1080, position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 56, ...fadeIn(0.1) }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
            <span style={{ fontFamily: serif, fontSize: isMobile ? 24 : 32, fontWeight: 700, color: C.navyDeep }}>Journey</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: C.greenDark, letterSpacing: "0.1em", border: `1.5px solid ${C.greenDark}`, padding: "2px 7px", borderRadius: 3 }}>OS</span>
          </div>
          <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
            <AscSquares colors={[C.navyDeep, C.blue, C.blueMid, C.green]} size={isMobile ? 10 : 12} gap={4} />
          </div>
          <h1 style={{
            fontFamily: serif, fontSize: isMobile ? 28 : isTablet ? 32 : 40,
            fontWeight: 700, color: C.navyDeep, marginBottom: 12, lineHeight: 1.2, letterSpacing: "-0.015em",
          }}>
            Morehouse School of Medicine
          </h1>
          <p style={{ fontFamily: sans, fontSize: isMobile ? 15 : 17, color: C.textSecondary, lineHeight: 1.6 }}>
            AI-Powered Medical Education Platform
          </p>
        </div>

        {/* Role Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "repeat(3, 1fr)",
          gap: isMobile ? 16 : 20,
          marginBottom: isMobile ? 32 : 40,
        }}>
          {roles.map((role, idx) => (
            <div
              key={role.id}
              onMouseEnter={() => setHoveredRole(role.id)}
              onMouseLeave={() => setHoveredRole(null)}
              onClick={() => router.push(`/register/${role.id}`)}
              style={{
                background: C.white,
                border: `2px solid ${hoveredRole === role.id ? role.color : C.borderLight}`,
                borderRadius: 12,
                padding: isMobile ? "24px 20px" : "28px 24px",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                boxShadow: hoveredRole === role.id
                  ? "0 12px 32px rgba(0,44,118,0.12)"
                  : "0 2px 8px rgba(0,0,0,0.04)",
                ...fadeIn(0.2 + idx * 0.1),
                transition: "all 0.25s ease",
                transform: hoveredRole === role.id ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
              }}
            >
              {/* Background gradient */}
              <div style={{
                position: "absolute", inset: 0, background: role.bgGradient,
                opacity: hoveredRole === role.id ? 1 : 0.6, transition: "opacity 0.25s",
              }} />

              {/* Icon */}
              <div style={{
                width: isMobile ? 48 : 56, height: isMobile ? 48 : 56,
                borderRadius: 10, background: `${role.color}12`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16, fontSize: isMobile ? 24 : 28,
                border: `1.5px solid ${role.color}20`,
                position: "relative",
              }}>
                {role.icon}
              </div>

              {/* Content */}
              <div style={{ position: "relative" }}>
                <h3 style={{
                  fontFamily: serif, fontSize: isMobile ? 20 : 22, fontWeight: 700,
                  color: C.navyDeep, marginBottom: 8, lineHeight: 1.3,
                }}>
                  {role.title}
                </h3>
                <p style={{
                  fontFamily: sans, fontSize: 14, color: C.textSecondary,
                  lineHeight: 1.6, marginBottom: 20,
                }}>
                  {role.description}
                </p>

                {/* Features */}
                <ul style={{ marginBottom: 20, listStyle: "none", padding: 0 }}>
                  {role.features.map((feature, i) => (
                    <li key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      fontSize: 13, color: C.textSecondary, marginBottom: 8,
                      lineHeight: 1.5,
                    }}>
                      <span style={{ color: role.color, fontWeight: 700, fontSize: 14, lineHeight: 1.4 }}>✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <button style={{
                  width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
                  fontFamily: sans, fontSize: 14, fontWeight: 600,
                  background: role.color, color: C.white,
                  cursor: "pointer", transition: "all 0.2s",
                  opacity: hoveredRole === role.id ? 1 : 0.92,
                }}>
                  Get Started as {role.title}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", ...fadeIn(0.5) }}>
          <p style={{ fontSize: 14, color: C.textMuted }}>
            Already have an account?{" "}
            <button
              onClick={() => router.push("/login")}
              style={{
                background: "none", border: "none", padding: 0,
                fontFamily: sans, fontSize: 14, fontWeight: 600,
                color: C.blueMid, cursor: "pointer", transition: "color 0.2s",
              }}
              onMouseEnter={e => (e.target as HTMLElement).style.color = C.navyDeep}
              onMouseLeave={e => (e.target as HTMLElement).style.color = C.blueMid}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
