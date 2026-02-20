"use client";

import { useState } from "react";
import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { WovenField } from "@web/components/brand/woven-field";
import { AscendingSquares } from "@web/components/brand/ascending-squares";
import { Reveal } from "@web/components/landing/reveal";
import { C, pillarColors } from "@web/components/landing/landing-data";

function ThreadDivider({ color = C.warmGray }: { color?: string }) {
  return (
    <div
      className="relative mx-auto overflow-hidden"
      style={{ height: 20, maxWidth: 200 }}
    >
      <svg
        width="100%"
        height="20"
        viewBox="0 0 200 20"
        preserveAspectRatio="none"
      >
        <path
          d="M0,10 Q25,2 50,10 T100,10 T150,10 T200,10"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M0,10 Q25,18 50,10 T100,10 T150,10 T200,10"
          stroke={color}
          strokeWidth="1"
          fill="none"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

export function WaitlistSection() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isDesktop = bp === "desktop";

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [institution, setInstitution] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email && role) setSubmitted(true);
  }

  const roleOptions = [
    { value: "admin", label: "Institutional Leader" },
    { value: "faculty", label: "Faculty" },
    { value: "advisor", label: "Advisor" },
    { value: "student", label: "Student" },
  ];

  return (
    <section
      id="waitlist"
      className="relative overflow-hidden"
      style={{
        padding: isMobile ? "64px 0" : "100px 0",
        background: C.white,
      }}
    >
      <WovenField
        color={C.navyDeep}
        opacity={0.015}
        density={isMobile ? 10 : 16}
      />
      <div
        className="relative z-[1] mx-auto"
        style={{
          maxWidth: 1120,
          padding: isMobile ? "0 18px" : "0 28px",
        }}
      >
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: isDesktop ? "1fr 420px" : "1fr",
            gap: isMobile ? 32 : 56,
          }}
        >
          {/* Copy */}
          <Reveal>
            <div>
              <AscendingSquares
                colors={pillarColors}
                size={isMobile ? 12 : 14}
                gap={4}
                style={{ marginBottom: 20 }}
              />
              <h2
                className="mb-4 font-serif font-bold"
                style={{
                  fontSize: isMobile ? 26 : 34,
                  lineHeight: 1.25,
                  color: C.navyDeep,
                }}
              >
                Be part of the journey.
              </h2>
              <p
                className="mb-5"
                style={{
                  fontSize: isMobile ? 15 : 16,
                  color: C.textSecondary,
                  lineHeight: 1.75,
                }}
              >
                We&apos;re building Journey OS with the people who&apos;ll use
                it — not in isolation. Join the waitlist to get early access and
                help shape a platform that works for your institution, your
                faculty, your students.
              </p>
              <ThreadDivider color={C.warmGray} />
              <p
                className="mt-4 italic"
                style={{
                  fontSize: 14,
                  color: C.textMuted,
                  lineHeight: 1.7,
                }}
              >
                A single thread is fragile. Many, woven together, gain strength.
              </p>
            </div>
          </Reveal>

          {/* Form */}
          {submitted ? (
            <Reveal>
              <div
                className="rounded-xl text-center"
                style={{
                  background: C.parchment,
                  border: `1px solid ${C.green}30`,
                  padding: isMobile ? 24 : 32,
                }}
              >
                <div
                  className="mx-auto mb-4 flex items-center justify-center rounded-[10px]"
                  style={{
                    width: 44,
                    height: 44,
                    background: `${C.green}15`,
                    fontSize: 22,
                    color: C.green,
                  }}
                >
                  ✓
                </div>
                <h3
                  className="mb-2 font-serif font-bold"
                  style={{ fontSize: 20, color: C.navyDeep }}
                >
                  You&apos;re on the list.
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: C.textSecondary,
                    lineHeight: 1.65,
                  }}
                >
                  We&apos;ll reach out when your spot opens. In the meantime,
                  keep doing what you do — we&apos;re building this for you.
                </p>
              </div>
            </Reveal>
          ) : (
            <Reveal delay={0.1}>
              <div
                className="rounded-xl"
                style={{
                  background: C.parchment,
                  border: `1px solid ${C.borderLight}`,
                  padding: isMobile ? 20 : 28,
                  boxShadow: "0 8px 32px rgba(0,44,118,0.04)",
                }}
              >
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label
                      className="mb-1.5 block font-mono uppercase"
                      style={{
                        fontSize: 10,
                        color: C.textMuted,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@institution.edu"
                      className="w-full rounded-md font-sans outline-none transition-colors"
                      style={{
                        padding: "12px 14px",
                        background: C.white,
                        border: `1px solid ${C.border}`,
                        color: C.textPrimary,
                        fontSize: 15,
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = C.blueMid;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = C.border;
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="mb-1.5 block font-mono uppercase"
                      style={{
                        fontSize: 10,
                        color: C.textMuted,
                        letterSpacing: "0.08em",
                      }}
                    >
                      My role
                    </label>
                    <div
                      className="grid gap-1.5"
                      style={{
                        gridTemplateColumns: isMobile
                          ? "1fr 1fr"
                          : "repeat(4, 1fr)",
                      }}
                    >
                      {roleOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRole(opt.value)}
                          className="cursor-pointer rounded-md text-center font-sans transition-all"
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            padding: isMobile ? "10px 8px" : "8px 12px",
                            background:
                              role === opt.value ? `${C.navyDeep}0A` : C.white,
                            border: `1.5px solid ${role === opt.value ? C.navyDeep : C.border}`,
                            color:
                              role === opt.value ? C.navyDeep : C.textSecondary,
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      className="mb-1.5 block font-mono uppercase"
                      style={{
                        fontSize: 10,
                        color: C.textMuted,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Institution{" "}
                      <span style={{ opacity: 0.5 }}>(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      placeholder="Morehouse School of Medicine"
                      className="w-full rounded-md font-sans outline-none transition-colors"
                      style={{
                        padding: "12px 14px",
                        background: C.white,
                        border: `1px solid ${C.border}`,
                        color: C.textPrimary,
                        fontSize: 15,
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = C.blueMid;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = C.border;
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!email || !role}
                    className="mt-1 rounded-[7px] border-none font-sans font-bold transition-all"
                    style={{
                      fontSize: 15,
                      padding: isMobile ? "14px 24px" : "13px 24px",
                      cursor: !email || !role ? "default" : "pointer",
                      background: !email || !role ? C.warmGray : C.navyDeep,
                      color: !email || !role ? C.textMuted : C.white,
                    }}
                    onMouseEnter={(e) => {
                      if (email && role)
                        e.currentTarget.style.background = C.blue;
                    }}
                    onMouseLeave={(e) => {
                      if (email && role)
                        e.currentTarget.style.background = C.navyDeep;
                    }}
                  >
                    Join the Waitlist
                  </button>
                </form>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
