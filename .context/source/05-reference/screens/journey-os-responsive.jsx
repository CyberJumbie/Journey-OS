import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — LANDING PAGE v3 (Responsive)
// MSM Brand-Aligned: Education Pillar (Evergreens) + True Blues
// Light, professional, woven thread motif
// Breakpoints: mobile <640, tablet 640-1024, desktop >1024
// ═══════════════════════════════════════════════════════════════

const C = {
  navyDeep: "#002c76", navy: "#003265", blue: "#004ebc",
  blueMid: "#2b71b9", blueLight: "#00a8e1", bluePale: "#a3d9ff",
  greenDark: "#5d7203", green: "#69a338", lime: "#d8d812",
  ink: "#1b232a", warmGray: "#d7d3c8", cream: "#f5f3ef",
  parchment: "#faf9f6", white: "#ffffff",
  textPrimary: "#1b232a", textSecondary: "#4a5568", textMuted: "#718096",
  border: "#e2dfd8", borderLight: "#edeae4",
};

// ─── Responsive hook ────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState("desktop");
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return bp;
}

// ─── Woven thread background ────────────────────────────────────
function WovenField({ color = C.navyDeep, opacity = 0.03, density = 18 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = canvas.offsetWidth * dpr;
      h = canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      const spacing = cw / density;
      for (let y = 0; y < ch; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < cw; x += 4) {
          ctx.lineTo(x, y + Math.sin(x * 0.015 + y * 0.01) * 1.5);
        }
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      for (let x = 0; x < cw; x += spacing * 2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = 0; y < ch; y += 4) {
          ctx.lineTo(x + Math.sin(y * 0.012 + x * 0.008) * 1.5, y);
        }
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity * 0.7;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [color, opacity, density]);
  return (
    <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
  );
}

// ─── Ascending squares ──────────────────────────────────────────
function AscendingSquares({ colors, size = 28, gap = 6, style = {} }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap, ...style }}>
      {colors.map((c, i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: Math.max(2, size * 0.14),
          background: c, transform: `translateY(${(colors.length - 1 - i) * -6}px)`,
        }} />
      ))}
    </div>
  );
}

// ─── Reveal on scroll ───────────────────────────────────────────
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(16px)",
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Counter ────────────────────────────────────────────────────
function Counter({ value, suffix = "", prefix = "" }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !go) { setGo(true); obs.disconnect(); }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [go]);
  useEffect(() => {
    if (!go) return;
    const dur = 1100, start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [go, value]);
  return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>;
}

// ─── Thread divider ─────────────────────────────────────────────
function ThreadDivider({ color = C.warmGray }) {
  return (
    <div style={{ position: "relative", height: 20, overflow: "hidden", margin: "0 auto", maxWidth: 200 }}>
      <svg width="100%" height="20" viewBox="0 0 200 20" preserveAspectRatio="none">
        <path d="M0,10 Q25,2 50,10 T100,10 T150,10 T200,10" stroke={color} strokeWidth="1.5" fill="none" />
        <path d="M0,10 Q25,18 50,10 T100,10 T150,10 T200,10" stroke={color} strokeWidth="1" fill="none" opacity="0.5" />
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function JourneyOSLanding() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [activePersona, setActivePersona] = useState("faculty");
  const [activeStep, setActiveStep] = useState(0);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [institution, setInstitution] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [hoveredResearch, setHoveredResearch] = useState(null);
  const [scrollY, setScrollY] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => { setActiveStep(0); }, [activePersona]);
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Close mobile nav on resize to desktop
  useEffect(() => { if (isDesktop) setMobileNav(false); }, [isDesktop]);

  const sans = "'Source Sans 3', 'Source Sans Pro', -apple-system, system-ui, sans-serif";
  const serif = "'Lora', 'Georgia', serif";
  const mono = "'DM Mono', 'Menlo', monospace";

  const wrap = {
    maxWidth: 1120, margin: "0 auto",
    padding: isMobile ? "0 18px" : "0 28px",
  };

  const sectionPad = isMobile ? "64px 0" : isTablet ? "76px 0" : "90px 0";

  // ─── Persona data ─────────────────────────────────────────────
  const personas = {
    faculty: {
      label: "Faculty & Course Directors",
      short: "Faculty",
      color: C.green,
      tagline: "You became an educator to teach — not to spend weekends writing exams.",
      benefits: [
        { title: "From 40 hours to 40 minutes", desc: "AI generates assessment items grounded in your actual syllabus. You review, refine, and approve. Your expertise stays central — the busywork doesn't." },
        { title: "See the reasoning, not just the output", desc: "Every generated question shows which concept it targets, why each distractor exists, and what cognitive level it assesses. Full transparency, always." },
        { title: "Questions that actually measure learning", desc: "Evidence-Centered Design validates items against psychometric standards before they reach students. No more guessing whether a question is good enough." },
        { title: "A question bank that stays current", desc: "Every item is linked to your live curriculum. When content changes, the system flags questions that need updating. No more stale banks drifting out of alignment." },
      ],
      steps: [
        { title: "Share your materials", desc: "Upload your syllabus, lecture slides, or course outline. Journey reads and maps your content to the knowledge graph — no manual tagging required." },
        { title: "Generate in one click", desc: "Choose a topic, cognitive level, and quantity. AI produces NBME-format items grounded in exactly what you teach — not generic clinical scenarios." },
        { title: "Review with full context", desc: "Each item comes with a reasoning trace: why this stem, why these distractors, which concept it targets. Approve it, refine it, or ask the AI to try again." },
        { title: "Deliver and improve over time", desc: "Export to your LMS or deliver through Journey. As students respond, the system learns which items discriminate well and flags those that need attention." },
      ],
    },
    admin: {
      label: "Institutional Leaders",
      short: "Admin",
      color: C.blue,
      tagline: "You've built something exceptional. Now you can show the evidence.",
      benefits: [
        { title: "Accreditation readiness, not scramble", desc: "Six competency frameworks aligned in one system. Coverage gaps surface automatically. Reports generate from real data — not retroactive spreadsheet assembly." },
        { title: "See your curriculum as it really is", desc: "Real-time visibility into what's being taught, how concepts connect, and where the gaps hide. Not an annual audit — a living dashboard." },
        { title: "An evidence chain you can trace", desc: "From what was taught, through what was assessed, to what students demonstrated. Every claim backed by data. Every link in the graph." },
        { title: "A platform that grows with you", desc: "Start with curriculum mapping. Unlock psychometric measurement, predictive advising, and institutional analytics as your data deepens." },
      ],
      steps: [
        { title: "Map the curriculum", desc: "Upload syllabi, course outlines, and competency frameworks. Journey builds the knowledge graph — every concept, connection, and standard in one place." },
        { title: "See the full picture", desc: "Your dashboard shows curriculum coverage, assessment alignment, and accreditation readiness across every program. Gaps are visible, not buried." },
        { title: "Evidence accumulates naturally", desc: "As faculty create and deliver assessments through Journey, compliance data builds itself. No end-of-year scramble to pull reports." },
        { title: "Report with confidence", desc: "Generate accreditation-ready reports that trace from learning objectives through assessments to demonstrated student competency." },
      ],
    },
    advisors: {
      label: "Academic Advisors",
      short: "Advisors",
      color: C.blueLight,
      tagline: "What if you could see where a student needs help before they ask?",
      benefits: [
        { title: "Early signals, not late alarms", desc: "Performance drops and mastery plateaus surface in real time — not after a failing grade. You see the pattern before the student feels the consequences." },
        { title: "Precision, not intuition", desc: "See exactly which concepts a student has and hasn't mastered, at what cognitive level, across which courses. Advising grounded in data, not just conversation." },
        { title: "Intervention workflows built in", desc: "Flag a concern, notify the right people, recommend resources, and track follow-through — all within the system. Not a separate spreadsheet." },
        { title: "The full student picture", desc: "A Digital Twin models each student's mastery journey. You see patterns across courses, over time, in context. One view, complete understanding." },
      ],
      steps: [
        { title: "Open the student view", desc: "Each student's mastery profile shows concept-level understanding across all their courses. Color-coded, sortable, and always current." },
        { title: "Spot the pattern", desc: "Automated alerts surface students showing early signs of struggle — drops in mastery velocity, widening gaps, or patterns across related concepts." },
        { title: "Intervene with specifics", desc: "Instead of 'you need to study more,' you can say 'your cardiovascular pharmacology concepts are below threshold — here's a targeted practice set.'" },
        { title: "Track the outcome", desc: "Follow each student's trajectory after intervention. See whether mastery improves, plateaus, or needs a different approach." },
      ],
    },
    students: {
      label: "Students",
      short: "Students",
      color: C.green,
      tagline: "Study what your professors actually teach — and know exactly where you stand.",
      benefits: [
        { title: "Practice that matches your courses", desc: "Every practice question is generated from what your professors actually teach — not generic Step prep from a company that's never seen your syllabus." },
        { title: "Know your gaps before the exam", desc: "A personal mastery map shows what you've demonstrated competency in and where you're still building. No surprises on test day." },
        { title: "Smarter study, not longer study", desc: "Spaced repetition and adaptive difficulty target your specific weak spots. Your study time goes where it actually moves the needle." },
        { title: "Learn the way medicine connects", desc: "Because the knowledge graph models how concepts relate, your practice sessions surface connections between topics — the way clinical reasoning actually works." },
      ],
      steps: [
        { title: "Pick a topic or let Journey choose", desc: "Browse by course, organ system, or concept — or let the adaptive engine surface what you need most based on your mastery profile." },
        { title: "Practice with real context", desc: "Each question is tagged to your curriculum and comes with an explanation that connects back to what you've been taught. Not just 'the answer is C.'" },
        { title: "Watch your mastery grow", desc: "Your personal dashboard tracks concept-level understanding over time. See exactly where you're strong and where another pass would help." },
        { title: "Let the system adapt to you", desc: "Spaced repetition resurfaces concepts at the right intervals. Weak areas get more attention automatically. Your study plan evolves as you learn." },
      ],
    },
  };

  const features = [
    { icon: "◈", title: "A knowledge graph at the center", desc: "Your curriculum modeled as a connected network — not isolated rows in a database.", detail: "75+ node types, 80+ relationship types. Concepts, lectures, questions, competencies, and standards — all linked in one traversable graph." },
    { icon: "◆", title: "AI that knows what you actually teach", desc: "Generated content grounded in your syllabus, your courses, your institution's curriculum.", detail: "Multi-model pipeline validated against Evidence-Centered Design. Every question traceable to curriculum content." },
    { icon: "◇", title: "Measurement that grows with your data", desc: "Start with knowledge tracing. Graduate to psychometric models as evidence accumulates.", detail: "Bayesian Knowledge Tracing → Item Response Theory → Multidimensional IRT. Student Digital Twins model mastery at the concept level." },
    { icon: "▣", title: "Compliance as a natural byproduct", desc: "Stop assembling accreditation evidence. Let it accumulate from the work you're already doing.", detail: "USMLE, ACGME, EPA, Bloom's, Miller's, LCME — all mapped into the graph. Reports self-generate." },
    { icon: "▢", title: "Advising powered by real data", desc: "Faculty and advisors see exactly where students need support — before grades tell the story.", detail: "Early warning systems, concept-level mastery dashboards, and intervention workflows." },
    { icon: "✦", title: "Fits into what you already use", desc: "Journey integrates with your LMS, SIS, and existing workflows — not the other way around.", detail: "LTI-compatible exports, gradebook sync, and SIS integration. Start using Journey without replacing anything you already have." },
  ];

  const chainSteps = [
    { label: "TEACHES", desc: "Faculty connect content to concepts", color: C.navyDeep },
    { label: "VERIFIED", desc: "System confirms curriculum alignment", color: C.blue },
    { label: "ADDRESSED", desc: "Assessment items target each concept", color: C.blueMid },
    { label: "ASSESSES", desc: "Students demonstrate understanding", color: C.green },
    { label: "FULFILLS", desc: "Accreditation standards are satisfied", color: C.greenDark },
  ];

  const stats = [
    { value: 80, suffix: "%", label: "less time on exams" },
    { value: 6, suffix: "", label: "frameworks aligned" },
    { value: 45, suffix: "+", label: "research foundations" },
    { value: 75, suffix: "+", label: "knowledge node types" },
  ];

  const currentPersona = personas[activePersona];
  const personaKeys = Object.keys(personas);
  const pillarColors = [C.navyDeep, C.blue, C.blueMid, C.green];

  function handleSubmit(e) {
    e.preventDefault();
    if (email && role) setSubmitted(true);
  }

  return (
    <div style={{
      background: C.white, color: C.textPrimary, fontFamily: sans,
      minHeight: "100vh", overflowX: "hidden", lineHeight: 1.72,
      fontSize: isMobile ? 15 : 16,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 40 ? `${C.white}F0` : C.white,
        backdropFilter: scrollY > 40 ? "blur(12px)" : "none",
        borderBottom: `1px solid ${scrollY > 40 ? C.borderLight : "transparent"}`,
        transition: "all 0.3s ease",
      }}>
        <div style={{
          ...wrap, display: "flex", alignItems: "center",
          justifyContent: "space-between", height: isMobile ? 56 : 64,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: serif, fontSize: isMobile ? 19 : 22, fontWeight: 700, color: C.navyDeep }}>Journey</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: C.greenDark, letterSpacing: "0.1em", border: `1.5px solid ${C.greenDark}`, padding: "2px 7px", borderRadius: 3 }}>OS</span>
          </div>

          {/* Desktop nav links */}
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <a href="#how-it-works" style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, textDecoration: "none", fontWeight: 500 }}>How It Works</a>
              <a href="#waitlist" style={{
                fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.white,
                background: C.navyDeep, padding: "8px 20px", borderRadius: 6, textDecoration: "none",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => e.target.style.background = C.blue}
                onMouseLeave={e => e.target.style.background = C.navyDeep}>
                Request Early Access
              </a>
            </div>
          )}

          {/* Mobile hamburger */}
          {isMobile && (
            <button
              onClick={() => setMobileNav(!mobileNav)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 8,
                display: "flex", flexDirection: "column", gap: 5, justifyContent: "center",
              }}
              aria-label="Menu"
            >
              <span style={{ display: "block", width: 22, height: 2, background: C.navyDeep, borderRadius: 1, transition: "all 0.2s", transform: mobileNav ? "rotate(45deg) translateY(7px)" : "none" }} />
              <span style={{ display: "block", width: 22, height: 2, background: C.navyDeep, borderRadius: 1, transition: "all 0.2s", opacity: mobileNav ? 0 : 1 }} />
              <span style={{ display: "block", width: 22, height: 2, background: C.navyDeep, borderRadius: 1, transition: "all 0.2s", transform: mobileNav ? "rotate(-45deg) translateY(-7px)" : "none" }} />
            </button>
          )}
        </div>

        {/* Mobile dropdown */}
        {isMobile && mobileNav && (
          <div style={{
            background: C.white, borderTop: `1px solid ${C.borderLight}`,
            padding: "16px 18px 20px", display: "flex", flexDirection: "column", gap: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          }}>
            <a href="#how-it-works" onClick={() => setMobileNav(false)}
              style={{ fontFamily: sans, fontSize: 16, color: C.textSecondary, textDecoration: "none", fontWeight: 500, padding: "8px 0" }}>
              How It Works
            </a>
            <a href="#waitlist" onClick={() => setMobileNav(false)}
              style={{
                fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.white,
                background: C.navyDeep, padding: "12px 20px", borderRadius: 6,
                textDecoration: "none", textAlign: "center",
              }}>
              Request Early Access
            </a>
          </div>
        )}
      </nav>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section style={{
        position: "relative", overflow: "hidden",
        minHeight: isMobile ? "auto" : "100vh",
        display: "flex", alignItems: "center",
        paddingTop: isMobile ? 80 : 0,
        paddingBottom: isMobile ? 48 : 0,
        background: `linear-gradient(170deg, ${C.white} 0%, ${C.cream} 40%, ${C.parchment} 100%)`,
      }}>
        <WovenField color={C.navyDeep} opacity={0.025} density={isMobile ? 12 : 22} />

        {/* Decorative squares — hidden on mobile */}
        {!isMobile && (
          <>
            <div style={{ position: "absolute", top: 120, right: 60, opacity: 0.12 }}>
              <AscendingSquares colors={[C.navyDeep, C.blue, C.blueMid, C.green]} size={32} gap={8} />
            </div>
            <div style={{ position: "absolute", bottom: 80, left: 40, opacity: 0.08 }}>
              <AscendingSquares colors={[C.greenDark, C.green, C.blueLight, C.bluePale]} size={20} gap={5} />
            </div>
          </>
        )}

        <div style={{ ...wrap, position: "relative", zIndex: 1, paddingTop: isMobile ? 24 : 100, paddingBottom: isMobile ? 24 : 80 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "1fr 340px" : "1fr",
            gap: isMobile ? 36 : 60,
            alignItems: "center",
          }}>
            {/* Left: Copy */}
            <div>
              <Reveal>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 14 : 20 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: C.green }} />
                  <span style={{ fontFamily: mono, fontSize: isMobile ? 10 : 11, color: C.greenDark, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Built at Morehouse School of Medicine
                  </span>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <h1 style={{
                  fontFamily: serif,
                  fontSize: isMobile ? 30 : isTablet ? 38 : 54,
                  fontWeight: 700, lineHeight: 1.18, marginBottom: 20,
                  letterSpacing: "-0.015em", color: C.navyDeep,
                  maxWidth: isMobile ? "100%" : 600,
                }}>
                  Every thread of your curriculum, woven into one connected system.
                </h1>
              </Reveal>

              <Reveal delay={0.15}>
                <p style={{
                  fontSize: isMobile ? 16 : 18, color: C.textSecondary,
                  lineHeight: 1.8, maxWidth: isMobile ? "100%" : 520, marginBottom: 12,
                }}>
                  Faculty create better assessments in less time. Advisors see where students need help before grades tell the story. Institutions prove educational quality with evidence that traces itself.
                </p>
              </Reveal>
              <Reveal delay={0.18}>
                <p style={{
                  fontSize: isMobile ? 15 : 16, color: C.textMuted,
                  lineHeight: 1.75, maxWidth: isMobile ? "100%" : 520, marginBottom: isMobile ? 28 : 36,
                }}>
                  And students? They get practice aligned to what they're actually learning, with a mastery map that grows alongside them.
                </p>
              </Reveal>

              <Reveal delay={0.22}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <a href="#waitlist" style={{
                    fontFamily: sans, fontSize: isMobile ? 14 : 15, fontWeight: 600,
                    color: C.white, background: C.navyDeep,
                    padding: isMobile ? "12px 24px" : "13px 28px", borderRadius: 7,
                    textDecoration: "none", transition: "all 0.2s", display: "inline-block",
                    flex: isMobile ? "1 1 100%" : "none", textAlign: "center",
                  }}
                    onMouseEnter={e => { e.target.style.background = C.blue; }}
                    onMouseLeave={e => { e.target.style.background = C.navyDeep; }}>
                    Request Early Access
                  </a>
                  <a href="#how-it-works" style={{
                    fontFamily: sans, fontSize: isMobile ? 14 : 15, fontWeight: 500,
                    color: C.navyDeep, border: `1.5px solid ${C.border}`,
                    padding: isMobile ? "12px 24px" : "13px 28px", borderRadius: 7,
                    textDecoration: "none", transition: "all 0.2s", display: "inline-block",
                    flex: isMobile ? "1 1 100%" : "none", textAlign: "center",
                  }}
                    onMouseEnter={e => { e.target.style.borderColor = C.blueMid; e.target.style.color = C.blue; }}
                    onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.navyDeep; }}>
                    See How It Works
                  </a>
                </div>
              </Reveal>
            </div>

            {/* Right: Woven grid visual — visible tablet & desktop */}
            {!isMobile && (
              <Reveal delay={0.25}>
                <div style={{ position: "relative", maxWidth: isTablet ? 280 : 340, margin: isTablet ? "0 auto" : undefined }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, transform: "rotate(2deg)" }}>
                    {[
                      { bg: C.navyDeep, label: "Curriculum", sub: "Knowledge Graph" },
                      { bg: C.blue, label: "Assessment", sub: "AI-Generated" },
                      { bg: C.green, label: "Measurement", sub: "Student Mastery" },
                      { bg: C.blueMid, label: "Compliance", sub: "Accreditation" },
                    ].map((sq, i) => (
                      <div key={i} style={{
                        background: sq.bg, borderRadius: 10, padding: isTablet ? 16 : 20,
                        aspectRatio: "1", display: "flex", flexDirection: "column",
                        justifyContent: "flex-end", position: "relative", overflow: "hidden",
                      }}>
                        <div style={{
                          position: "absolute", inset: 0, opacity: 0.08,
                          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px),
                            repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px)`,
                        }} />
                        <span style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2, position: "relative" }}>{sq.sub}</span>
                        <span style={{ fontFamily: serif, fontSize: isTablet ? 14 : 16, color: C.white, fontWeight: 600, position: "relative" }}>{sq.label}</span>
                      </div>
                    ))}
                  </div>
                  <svg style={{ position: "absolute", top: -20, left: -20, right: -20, bottom: -20, pointerEvents: "none" }} viewBox="0 0 380 380">
                    <path d="M0,190 Q95,170 190,190 T380,190" stroke={C.warmGray} strokeWidth="1" fill="none" opacity="0.4" />
                    <path d="M190,0 Q170,95 190,190 T190,380" stroke={C.warmGray} strokeWidth="1" fill="none" opacity="0.3" />
                  </svg>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ THE PROBLEM ═══════════════════════ */}
      <section style={{ position: "relative", padding: sectionPad, background: C.white, borderTop: `1px solid ${C.borderLight}` }}>
        <div style={wrap}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "380px 1fr" : "1fr",
            gap: isMobile ? 32 : isTablet ? 40 : 56,
            alignItems: "start",
          }}>
            {/* Section intro */}
            <Reveal>
              <div style={{ position: isDesktop ? "sticky" : "static", top: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 1, background: C.navyDeep }} />
                  <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>The problem</span>
                </div>
                <h2 style={{ fontFamily: serif, fontSize: isMobile ? 24 : 30, fontWeight: 700, lineHeight: 1.25, color: C.navyDeep, marginBottom: 16 }}>
                  Medical education runs on disconnected threads.
                </h2>
                <p style={{ fontSize: isMobile ? 15 : 16, color: C.textSecondary, lineHeight: 1.75 }}>
                  Faculty plan in one system, write exams in another, deliver in a third, grade in a fourth, and report to accreditors from a fifth. Nothing is woven together.
                </p>
              </div>
            </Reveal>

            {/* Pain cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { stat: "40+", unit: "hours", desc: "to create a single quality exam. Faculty expertise spent on formatting and logistics instead of teaching and mentoring." },
                { stat: "0", unit: "connections", desc: "between your curriculum plan and your assessment data. They exist in separate systems, maintained by separate people, on separate timelines." },
                { stat: "62%", unit: "gap", desc: "between what institutions intend to teach and what their assessments actually measure. Most schools don't know this gap exists until an accreditation visit." },
              ].map((item, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <div style={{
                    background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 10,
                    padding: isMobile ? "20px" : "24px 28px",
                    display: isMobile ? "block" : "flex",
                    gap: 20, alignItems: "flex-start", transition: "border-color 0.2s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = C.blueMid}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.borderLight}>
                    <div style={{ flexShrink: 0, marginBottom: isMobile ? 8 : 0 }}>
                      <span style={{ fontFamily: serif, fontSize: isMobile ? 32 : 36, fontWeight: 700, color: C.navyDeep, lineHeight: 1 }}>{item.stat}</span>
                      <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.06em", display: "block", marginTop: 2 }}>{item.unit}</span>
                    </div>
                    <p style={{ fontSize: isMobile ? 14 : 15, color: C.textSecondary, lineHeight: 1.7, paddingTop: isMobile ? 0 : 4 }}>{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ WHAT IT DOES ═══════════════════════ */}
      <section style={{ position: "relative", padding: sectionPad, background: C.cream, borderTop: `1px solid ${C.borderLight}`, overflow: "hidden" }}>
        <WovenField color={C.greenDark} opacity={0.015} density={isMobile ? 10 : 24} />
        <div style={{ ...wrap, position: "relative", zIndex: 1 }}>
          <Reveal>
            <div style={{ textAlign: isMobile ? "left" : "center", maxWidth: 560, margin: isMobile ? "0" : "0 auto 56px", marginBottom: isMobile ? 36 : 56 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "flex-start" : "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: C.green }} />
                <span style={{ fontFamily: mono, fontSize: 10, color: C.greenDark, letterSpacing: "0.1em", textTransform: "uppercase" }}>What Journey does</span>
              </div>
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 24 : 32, fontWeight: 700, lineHeight: 1.25, color: C.navyDeep, marginBottom: 12 }}>
                One system. Every connection.
              </h2>
              <p style={{ fontSize: isMobile ? 15 : 16, color: C.textSecondary, lineHeight: 1.75 }}>
                Journey OS weaves curriculum, assessment, measurement, and compliance into a single knowledge graph — so every part of your educational mission connects.
              </p>
            </div>
          </Reveal>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)",
            gap: isMobile ? 12 : 16,
          }}>
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div
                  style={{
                    background: C.white,
                    border: `1px solid ${hoveredFeature === i ? C.blueMid : C.borderLight}`,
                    borderRadius: 10, padding: isMobile ? 20 : 24, cursor: "default",
                    transition: "all 0.25s", minHeight: isMobile ? 0 : 180,
                    display: "flex", flexDirection: "column",
                    boxShadow: hoveredFeature === i ? "0 4px 20px rgba(0,44,118,0.06)" : "none",
                  }}
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <span style={{ fontFamily: serif, fontSize: 18, color: C.navyDeep, display: "block", marginBottom: 10 }}>{f.icon}</span>
                  <h3 style={{ fontFamily: sans, fontSize: isMobile ? 15 : 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.35, color: C.navyDeep }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.65, flex: 1 }}>
                    {hoveredFeature === i ? f.detail : f.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ STATS ═══════════════════════ */}
      <section style={{ padding: isMobile ? "40px 0" : "56px 0", background: C.navyDeep }}>
        <div style={{
          ...wrap, display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: isMobile ? 28 : 24, textAlign: "center",
        }}>
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div>
                <div style={{ fontFamily: serif, fontSize: isMobile ? 34 : 42, fontWeight: 700, color: C.white, marginBottom: 4 }}>
                  <Counter value={s.value} suffix={s.suffix} />
                </div>
                <div style={{ fontFamily: mono, fontSize: isMobile ? 10 : 11, color: C.bluePale, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.8 }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <section id="how-it-works" style={{ position: "relative", padding: sectionPad, background: C.white, borderBottom: `1px solid ${C.borderLight}` }}>
        <div style={wrap}>
          <Reveal>
            <div style={{ marginBottom: isMobile ? 32 : 48 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: C.navyDeep }} />
                <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>How it works</span>
              </div>
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 24 : 32, fontWeight: 700, lineHeight: 1.25, color: C.navyDeep, marginBottom: 8 }}>
                Designed for everyone in the ecosystem
              </h2>
              <p style={{ fontSize: isMobile ? 15 : 16, color: C.textSecondary, maxWidth: 520 }}>
                Different roles, different needs, one connected system.
              </p>
            </div>
          </Reveal>

          {/* Persona tabs — scrollable on mobile */}
          <Reveal delay={0.08}>
            <div style={{
              display: "flex", gap: 4, marginBottom: isMobile ? 28 : 40,
              background: C.parchment, borderRadius: 8, padding: 4,
              border: `1px solid ${C.borderLight}`,
              width: isMobile ? "100%" : "fit-content",
              overflowX: isMobile ? "auto" : "visible",
              WebkitOverflowScrolling: "touch",
            }}>
              {personaKeys.map(key => (
                <button key={key} onClick={() => setActivePersona(key)} style={{
                  fontFamily: sans, fontSize: isMobile ? 13 : 13, fontWeight: activePersona === key ? 700 : 500,
                  color: activePersona === key ? C.white : C.textSecondary,
                  background: activePersona === key ? (personas[key].color === C.green ? C.navyDeep : personas[key].color) : "transparent",
                  border: "none", padding: isMobile ? "10px 16px" : "9px 20px",
                  borderRadius: 5, cursor: "pointer", transition: "all 0.2s",
                  whiteSpace: "nowrap", flex: isMobile ? "1 0 auto" : "none",
                }}>
                  {personas[key].short}
                </button>
              ))}
            </div>
          </Reveal>

          {/* Tagline */}
          <Reveal key={`tagline-${activePersona}`}>
            <p style={{
              fontFamily: serif, fontSize: isMobile ? 18 : 22, fontWeight: 500,
              color: C.navyDeep, marginBottom: isMobile ? 24 : 36,
              maxWidth: 540, lineHeight: 1.45,
            }}>
              "{currentPersona.tagline}"
            </p>
          </Reveal>

          {/* Step-through */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "1fr 400px" : "1fr",
            gap: isMobile ? 20 : 40, alignItems: "start",
          }}>
            {/* Steps list */}
            <div>
              {currentPersona.steps.map((step, i) => (
                <div
                  key={`${activePersona}-step-${i}`}
                  onClick={() => setActiveStep(i)}
                  style={{
                    display: "flex", gap: isMobile ? 12 : 16, alignItems: "flex-start",
                    padding: isMobile ? "12px" : "14px 16px",
                    borderRadius: 8, cursor: "pointer", marginBottom: 6,
                    background: activeStep === i ? C.parchment : "transparent",
                    border: `1px solid ${activeStep === i ? C.borderLight : "transparent"}`,
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, paddingTop: 2 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: activeStep === i ? `${C.navyDeep}10` : "transparent",
                      border: `1.5px solid ${activeStep === i ? C.navyDeep : C.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: mono, fontSize: 11,
                      color: activeStep === i ? C.navyDeep : C.textMuted,
                      fontWeight: activeStep === i ? 600 : 400, transition: "all 0.2s",
                    }}>
                      {i + 1}
                    </div>
                    {i < currentPersona.steps.length - 1 && (
                      <div style={{ width: 1.5, height: 16, background: C.borderLight, marginTop: 4, borderRadius: 1 }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      fontFamily: sans, fontSize: 15, fontWeight: 700, marginBottom: 2,
                      color: activeStep === i ? C.navyDeep : C.textSecondary, transition: "color 0.2s",
                    }}>
                      {step.title}
                    </h4>
                    {/* On mobile/tablet show description inline when active */}
                    {activeStep === i && !isDesktop && (
                      <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.65, marginTop: 4 }}>{step.desc}</p>
                    )}
                    {/* On desktop only show title inline, description in the sticky card */}
                    {activeStep === i && isDesktop && (
                      <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.65, marginTop: 4 }}>{step.desc}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Step detail card — sticky on desktop, stacked on mobile/tablet */}
            <div style={{
              background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 12,
              padding: isMobile ? 20 : 28,
              position: isDesktop ? "sticky" : "static", top: 100,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <AscendingSquares
                  colors={currentPersona.steps.map((_, i) => i <= activeStep ? C.navyDeep : C.borderLight)}
                  size={8} gap={3}
                />
                <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", marginLeft: 8 }}>
                  STEP {activeStep + 1} OF {currentPersona.steps.length}
                </span>
              </div>
              <h3 style={{ fontFamily: serif, fontSize: isMobile ? 18 : 20, fontWeight: 700, marginBottom: 10, lineHeight: 1.3, color: C.navyDeep }}>
                {currentPersona.steps[activeStep].title}
              </h3>
              <p style={{ fontSize: isMobile ? 14 : 15, color: C.textSecondary, lineHeight: 1.75 }}>
                {currentPersona.steps[activeStep].desc}
              </p>
              <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
                <button onClick={() => setActiveStep(Math.max(0, activeStep - 1))} disabled={activeStep === 0}
                  style={{
                    fontFamily: sans, fontSize: 13, fontWeight: 500,
                    padding: isMobile ? "10px 16px" : "8px 16px", borderRadius: 6,
                    cursor: activeStep === 0 ? "default" : "pointer",
                    background: "transparent",
                    border: `1px solid ${activeStep === 0 ? C.borderLight : C.border}`,
                    color: activeStep === 0 ? C.textMuted : C.textSecondary,
                    transition: "all 0.2s",
                  }}>← Back</button>
                <button onClick={() => setActiveStep(Math.min(currentPersona.steps.length - 1, activeStep + 1))}
                  disabled={activeStep === currentPersona.steps.length - 1}
                  style={{
                    fontFamily: sans, fontSize: 13, fontWeight: 600,
                    padding: isMobile ? "10px 16px" : "8px 16px", borderRadius: 6,
                    cursor: activeStep === currentPersona.steps.length - 1 ? "default" : "pointer",
                    background: activeStep === currentPersona.steps.length - 1 ? "transparent" : C.navyDeep,
                    border: `1px solid ${activeStep === currentPersona.steps.length - 1 ? C.borderLight : C.navyDeep}`,
                    color: activeStep === currentPersona.steps.length - 1 ? C.textMuted : C.white,
                    transition: "all 0.2s",
                  }}>Next →</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ PERSONA BENEFITS ═══════════════════════ */}
      <section style={{ position: "relative", padding: sectionPad, background: C.cream, borderBottom: `1px solid ${C.borderLight}`, overflow: "hidden" }}>
        <WovenField color={C.navyDeep} opacity={0.012} density={isMobile ? 10 : 20} />
        <div style={{ ...wrap, position: "relative", zIndex: 1 }}>
          <Reveal>
            <div style={{ marginBottom: isMobile ? 28 : 48 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: C.green }} />
                <span style={{ fontFamily: mono, fontSize: 10, color: C.greenDark, letterSpacing: "0.1em", textTransform: "uppercase" }}>Benefits</span>
              </div>
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 24 : 32, fontWeight: 700, lineHeight: 1.25, color: C.navyDeep }}>
                What changes for {currentPersona.short.toLowerCase()}
              </h2>
            </div>
          </Reveal>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: isMobile ? 12 : 16,
          }}>
            {currentPersona.benefits.map((b, i) => (
              <Reveal key={`${activePersona}-benefit-${i}`} delay={i * 0.08}>
                <div style={{
                  background: C.white, border: `1px solid ${C.borderLight}`,
                  borderRadius: 10, padding: isMobile ? 20 : 24,
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.blueMid; e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,44,118,0.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.boxShadow = "none"; }}>
                  <h3 style={{ fontFamily: sans, fontSize: isMobile ? 15 : 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.35, color: C.navyDeep }}>{b.title}</h3>
                  <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Student callout — only when viewing non-student personas */}
          {activePersona !== "students" && (
          <Reveal delay={0.3}>
            <div style={{
              marginTop: isMobile ? 20 : 32,
              background: `linear-gradient(135deg, ${C.navyDeep} 0%, ${C.blue} 100%)`,
              borderRadius: 12,
              padding: isMobile ? "20px" : "28px 32px",
              display: isMobile ? "block" : "flex",
              gap: 24, alignItems: "center",
            }}>
              <div style={{
                flexShrink: 0, width: 48, height: 48, borderRadius: 10,
                background: "rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: isMobile ? 12 : 0,
              }}>
                <span style={{ fontSize: 22 }}>🎓</span>
              </div>
              <div>
                <h4 style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.white, marginBottom: 4 }}>And for students?</h4>
                <p style={{ fontSize: 14, color: C.bluePale, lineHeight: 1.65 }}>
                  Practice materials aligned to their actual courses. A mastery map that shows where they stand — concept by concept — before exam day. Adaptive study that targets weak spots. Learning that connects the way medicine actually connects.
                </p>
              </div>
            </div>
          </Reveal>
          )}
        </div>
      </section>

      {/* ═══════════════════════ COVERAGE CHAIN ═══════════════════════ */}
      <section style={{ position: "relative", padding: sectionPad, background: C.white }}>
        <div style={wrap}>
          <Reveal>
            <div style={{ textAlign: isMobile ? "left" : "center", maxWidth: 540, margin: isMobile ? "0" : "0 auto", marginBottom: isMobile ? 32 : 48 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "flex-start" : "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: C.navyDeep }} />
                <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>The coverage chain</span>
              </div>
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 24 : 30, fontWeight: 700, lineHeight: 1.25, color: C.navyDeep, marginBottom: 12 }}>
                From what you teach to what you can prove
              </h2>
              <p style={{ fontSize: isMobile ? 15 : 16, color: C.textSecondary, lineHeight: 1.75 }}>
                Five links. One unbroken thread. Every step lives in the knowledge graph and traces back to the ones before it.
              </p>
            </div>
          </Reveal>

          {/* Chain — horizontal on desktop, vertical on mobile */}
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 32 }}>
              {chainSteps.map((step, i) => (
                <Reveal key={i} delay={i * 0.06}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {/* Vertical line connector */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%", background: step.color,
                        flexShrink: 0,
                      }} />
                      {i < chainSteps.length - 1 && (
                        <div style={{ width: 2, height: 36, background: C.borderLight, borderRadius: 1 }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: i < chainSteps.length - 1 ? 16 : 0 }}>
                      <div style={{
                        fontFamily: mono, fontSize: 11, fontWeight: 600, color: step.color,
                        letterSpacing: "0.08em", marginBottom: 2,
                      }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>{step.desc}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          ) : (
            <div style={{
              display: "flex", alignItems: "stretch", justifyContent: "center",
              gap: 0, marginBottom: 40, flexWrap: isTablet ? "wrap" : "nowrap",
            }}>
              {chainSteps.map((step, i) => (
                <Reveal key={i} delay={i * 0.08}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{
                      textAlign: "center", padding: isTablet ? "16px 12px" : "20px 16px",
                      background: C.parchment, borderRadius: 10,
                      border: `1px solid ${C.borderLight}`, minWidth: isTablet ? 130 : 150,
                    }}>
                      <div style={{
                        fontFamily: mono, fontSize: 11, fontWeight: 600, color: step.color,
                        letterSpacing: "0.08em", marginBottom: 6,
                        background: `${step.color}0A`, padding: "3px 10px", borderRadius: 4,
                        display: "inline-block",
                      }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{step.desc}</div>
                    </div>
                    {i < chainSteps.length - 1 && (
                      <div style={{ padding: "0 4px", color: C.warmGray, fontSize: 16 }}>
                        <svg width="20" height="12" viewBox="0 0 24 12">
                          <path d="M0,6 Q6,2 12,6 T24,6" stroke={C.warmGray} strokeWidth="1.5" fill="none" />
                        </svg>
                      </div>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          <Reveal delay={0.4}>
            <div style={{
              background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 10,
              padding: isMobile ? "18px 20px" : "20px 24px",
              maxWidth: 600, margin: "0 auto", textAlign: isMobile ? "left" : "center",
            }}>
              <p style={{ fontSize: isMobile ? 14 : 15, color: C.textSecondary, lineHeight: 1.7 }}>
                When accreditation reviewers ask <strong style={{ color: C.navyDeep }}>"how do you know your students can do this?"</strong> — the answer is already woven into the system. No scrambling across five platforms. One thread, traced from start to finish.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ RESEARCH ═══════════════════════ */}
      <section style={{
        padding: isMobile ? "52px 0" : "72px 0",
        background: C.cream, borderTop: `1px solid ${C.borderLight}`,
        borderBottom: `1px solid ${C.borderLight}`,
      }}>
        <div style={wrap}>
          <Reveal>
            <div style={{ textAlign: isMobile ? "left" : "center", marginBottom: isMobile ? 24 : 36 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: isMobile ? "flex-start" : "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: C.greenDark }} />
                <span style={{ fontFamily: mono, fontSize: 10, color: C.greenDark, letterSpacing: "0.1em", textTransform: "uppercase" }}>Research-grounded</span>
              </div>
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 22 : 26, fontWeight: 700, lineHeight: 1.3, color: C.navyDeep }}>
                Built on real science, not just AI hype
              </h2>
            </div>
          </Reveal>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: isMobile ? 10 : 12,
          }}>
            {[
              { author: "Mislevy et al.", framework: "Evidence-Centered Design", area: "Assessment Validity", detail: "A framework for designing assessments where every question is built from a chain of claims about what students know, evidence that would support those claims, and tasks that produce that evidence." },
              { author: "Corbett & Anderson", framework: "Bayesian Knowledge Tracing", area: "Mastery Estimation", detail: "A probabilistic model that estimates what a student knows based on their response history — tracking the likelihood of mastery for each concept over time." },
              { author: "Roediger & Karpicke", framework: "Testing Effect", area: "Learning Science", detail: "The finding that actively retrieving information from memory strengthens long-term retention more effectively than re-reading or passive review." },
              { author: "Van der Linden", framework: "Item Response Theory", area: "Psychometric Measurement", detail: "A statistical framework that models how individual test questions behave — their difficulty, how well they distinguish strong from weak students, and how to score adaptively." },
            ].map((r, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div
                  style={{
                    background: hoveredResearch === i ? C.white : C.white,
                    border: `1px solid ${hoveredResearch === i ? C.blueMid : C.borderLight}`,
                    borderRadius: 8, padding: isMobile ? 14 : 18, textAlign: "center",
                    cursor: "default", transition: "all 0.25s",
                    minHeight: isMobile ? 0 : 140, display: "flex", flexDirection: "column", justifyContent: "center",
                    boxShadow: hoveredResearch === i ? "0 4px 20px rgba(0,44,118,0.06)" : "none",
                  }}
                  onMouseEnter={() => setHoveredResearch(i)}
                  onMouseLeave={() => setHoveredResearch(null)}
                >
                  <div style={{ fontFamily: mono, fontSize: 9, color: C.greenDark, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{r.area}</div>
                  <div style={{ fontFamily: serif, fontSize: isMobile ? 13 : 14, fontWeight: 600, color: C.navyDeep, marginBottom: hoveredResearch === i ? 8 : 4, lineHeight: 1.35, transition: "margin 0.2s" }}>{r.framework}</div>
                  {hoveredResearch === i ? (
                    <div style={{ fontSize: isMobile ? 11 : 12, color: C.textSecondary, lineHeight: 1.6 }}>{r.detail}</div>
                  ) : (
                    <div style={{ fontSize: isMobile ? 11 : 12, color: C.textMuted }}>{r.author}</div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ WAITLIST ═══════════════════════ */}
      <section id="waitlist" style={{ position: "relative", padding: isMobile ? "64px 0" : "100px 0", background: C.white, overflow: "hidden" }}>
        <WovenField color={C.navyDeep} opacity={0.015} density={isMobile ? 10 : 16} />
        <div style={{ ...wrap, position: "relative", zIndex: 1 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "1fr 420px" : "1fr",
            gap: isMobile ? 32 : 56,
            alignItems: "center",
          }}>
            {/* Copy */}
            <Reveal>
              <div>
                <AscendingSquares colors={pillarColors} size={isMobile ? 12 : 14} gap={4} style={{ marginBottom: 20 }} />
                <h2 style={{
                  fontFamily: serif, fontSize: isMobile ? 26 : 34,
                  fontWeight: 700, lineHeight: 1.25, color: C.navyDeep, marginBottom: 16,
                }}>
                  Be part of the journey.
                </h2>
                <p style={{ fontSize: isMobile ? 15 : 16, color: C.textSecondary, lineHeight: 1.75, marginBottom: 20 }}>
                  We're building Journey OS with the people who'll use it — not in isolation. Join the waitlist to get early access and help shape a platform that works for your institution, your faculty, your students.
                </p>
                <ThreadDivider color={C.warmGray} />
                <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, marginTop: 16, fontStyle: "italic" }}>
                  A single thread is fragile. Many, woven together, gain strength.
                </p>
              </div>
            </Reveal>

            {/* Form */}
            {submitted ? (
              <Reveal>
                <div style={{
                  background: C.parchment, border: `1px solid ${C.green}30`, borderRadius: 12,
                  padding: isMobile ? 24 : 32, textAlign: "center",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, background: `${C.green}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px", fontSize: 22, color: C.green,
                  }}>✓</div>
                  <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>You're on the list.</h3>
                  <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.65 }}>
                    We'll reach out when your spot opens. In the meantime, keep doing what you do — we're building this for you.
                  </p>
                </div>
              </Reveal>
            ) : (
              <Reveal delay={0.1}>
                <div style={{
                  background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 12,
                  padding: isMobile ? 20 : 28, boxShadow: "0 8px 32px rgba(0,44,118,0.04)",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@institution.edu"
                        style={{
                          width: "100%", boxSizing: "border-box", padding: "12px 14px",
                          background: C.white, border: `1px solid ${C.border}`, borderRadius: 6,
                          color: C.textPrimary, fontFamily: sans, fontSize: 15, outline: "none",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={e => e.target.style.borderColor = C.blueMid}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>

                    <div>
                      <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>My role</label>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 6 }}>
                        {[
                          { value: "admin", label: "Institutional Leader" },
                          { value: "faculty", label: "Faculty" },
                          { value: "advisor", label: "Advisor" },
                          { value: "student", label: "Student" },
                        ].map(opt => (
                          <button key={opt.value} onClick={() => setRole(opt.value)} style={{
                            fontFamily: sans, fontSize: 13, fontWeight: 500,
                            padding: isMobile ? "10px 8px" : "8px 12px",
                            borderRadius: 6, cursor: "pointer",
                            background: role === opt.value ? `${C.navyDeep}0A` : C.white,
                            border: `1.5px solid ${role === opt.value ? C.navyDeep : C.border}`,
                            color: role === opt.value ? C.navyDeep : C.textSecondary,
                            transition: "all 0.2s", textAlign: "center",
                          }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                        Institution <span style={{ opacity: 0.5 }}>(optional)</span>
                      </label>
                      <input type="text" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Morehouse School of Medicine"
                        style={{
                          width: "100%", boxSizing: "border-box", padding: "12px 14px",
                          background: C.white, border: `1px solid ${C.border}`, borderRadius: 6,
                          color: C.textPrimary, fontFamily: sans, fontSize: 15, outline: "none",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={e => e.target.style.borderColor = C.blueMid}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>

                    <button onClick={handleSubmit} disabled={!email || !role} style={{
                      fontFamily: sans, fontSize: 15, fontWeight: 700,
                      padding: isMobile ? "14px 24px" : "13px 24px",
                      borderRadius: 7, border: "none",
                      cursor: (!email || !role) ? "default" : "pointer",
                      background: (!email || !role) ? C.warmGray : C.navyDeep,
                      color: (!email || !role) ? C.textMuted : C.white,
                      transition: "all 0.2s", marginTop: 4,
                    }}
                      onMouseEnter={e => { if (email && role) e.target.style.background = C.blue; }}
                      onMouseLeave={e => { if (email && role) e.target.style.background = C.navyDeep; }}>
                      Join the Waitlist
                    </button>
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer style={{
        padding: isMobile ? "28px 18px" : "36px 24px",
        borderTop: `1px solid ${C.borderLight}`,
        background: C.parchment, textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: C.navyDeep }}>Journey</span>
          <span style={{ fontFamily: mono, fontSize: 8, color: C.greenDark, border: `1px solid ${C.greenDark}`, padding: "1px 5px", borderRadius: 2, letterSpacing: "0.1em" }}>OS</span>
        </div>
        <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, marginBottom: 4 }}>
          The assessment intelligence platform for medical education
        </p>
        <p style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>
          Built at Morehouse School of Medicine · © {new Date().getFullYear()}
        </p>
        <a href="/login" style={{
          fontFamily: sans, fontSize: 12, color: C.textMuted, textDecoration: "none",
          display: "inline-block", marginTop: 10, transition: "color 0.2s",
        }}
          onMouseEnter={e => e.target.style.color = C.navyDeep}
          onMouseLeave={e => e.target.style.color = C.textMuted}>
          Already have access? Sign in →
        </a>
      </footer>
    </div>
  );
}
