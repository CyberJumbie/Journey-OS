import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Settings, BarChart3, Users, FileCheck, Building2, Search, X, CheckCircle2, Clock, Mail, Phone, Globe, Hash } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — APPLICATION REVIEW QUEUE (STORY-SA-3)
// Template B: Admin Shell with review modal
// Surface: sidebar (white) + content (cream) → white cards → parchment
// ═══════════════════════════════════════════════════════════════

function useBreakpoint() {
  const [bp, setBp] = useState("desktop");
  useEffect(() => {
    const check = () => setBp(window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop");
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return bp;
}

interface Application {
  id: string;
  institution_name: string;
  institution_type: "md" | "do" | "combined";
  accreditation_body: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  student_count: number;
  website_url: string | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total_pages: number;
  total_count: number;
}

export default function ApplicationReviewQueue() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("applications");

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total_pages: 1,
    total_count: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    status: "pending",
  });

  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [modalAction, setModalAction] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Set active nav based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/admin/users")) setActiveNav("users");
    else if (path.startsWith("/admin/applications")) setActiveNav("applications");
    else if (path.startsWith("/admin/institutions")) setActiveNav("institutions");
    else if (path.startsWith("/admin/setup")) setActiveNav("setup");
    else if (path === "/admin") setActiveNav("dashboard");
  }, [location.pathname]);

  useEffect(() => {
    fetchApplications();
  }, [filters]);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const mockApplications: Application[] = [
        {
          id: "1",
          institution_name: "Tuskegee University School of Veterinary Medicine",
          institution_type: "md",
          accreditation_body: "LCME",
          contact_name: "Dr. Patricia Williams",
          contact_email: "pwilliams@tuskegee.edu",
          contact_phone: "+1-334-727-8800",
          student_count: 320,
          website_url: "https://www.tuskegee.edu/programs-courses/colleges-schools/veterinary-medicine",
          reason: "Interested in improving assessment quality and curriculum mapping for LCME accreditation.",
          status: "pending",
          submitted_at: "2026-02-18T14:30:00Z",
          reviewed_at: null,
          reviewed_by: null,
        },
        {
          id: "2",
          institution_name: "Xavier University of Louisiana Pre-Med",
          institution_type: "combined",
          accreditation_body: "SACSCOC",
          contact_name: "Dr. James Martinez",
          contact_email: "jmartinez@xula.edu",
          contact_phone: null,
          student_count: 180,
          website_url: "https://www.xula.edu",
          reason: null,
          status: "pending",
          submitted_at: "2026-02-17T09:15:00Z",
          reviewed_at: null,
          reviewed_by: null,
        },
        {
          id: "3",
          institution_name: "Florida A&M University College of Pharmacy",
          institution_type: "do",
          accreditation_body: "ACPE",
          contact_name: "Dr. Angela Thompson",
          contact_email: "athompson@famu.edu",
          contact_phone: "+1-850-599-3000",
          student_count: 425,
          website_url: "https://pharmacy.famu.edu",
          reason: "Looking for AI-powered assessment tools to support our curriculum revision process.",
          status: "pending",
          submitted_at: "2026-02-16T11:45:00Z",
          reviewed_at: null,
          reviewed_by: null,
        },
      ];

      const filtered = mockApplications.filter((app) => {
        if (filters.status !== "all" && app.status !== filters.status) return false;
        if (filters.search) {
          const search = filters.search.toLowerCase();
          return (
            app.institution_name.toLowerCase().includes(search) ||
            app.contact_name.toLowerCase().includes(search) ||
            app.contact_email.toLowerCase().includes(search)
          );
        }
        return true;
      });

      setApplications(filtered);
      setPagination({ page: 1, limit: 25, total_pages: 1, total_count: filtered.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (application: Application, action: "approve" | "reject") => {
    setSelectedApplication(application);
    setModalAction(action);
    setRejectionReason("");
  };

  const handleCloseModal = () => {
    setSelectedApplication(null);
    setModalAction(null);
    setRejectionReason("");
  };

  const handleConfirmAction = async () => {
    if (!selectedApplication || !modalAction) return;

    setIsProcessing(true);

    try {
      const endpoint = modalAction === "approve" ? "/api/v1/admin/applications/approve" : "/api/v1/admin/applications/reject";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: selectedApplication.id,
          reason: modalAction === "reject" ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process application");
      }

      // Refresh list
      await fetchApplications();
      handleCloseModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: BarChart3, path: "/admin" },
    { key: "applications", label: "Applications", Icon: FileCheck, path: "/admin/applications" },
    { key: "institutions", label: "Institutions", Icon: Building2, path: "/admin/institutions" },
    { key: "users", label: "User Directory", Icon: Users, path: "/admin/users" },
    { key: "setup", label: "Settings", Icon: Settings, path: "/admin/setup" },
  ];

  const user = { name: "Super Admin", initials: "SA", role: "Superadmin" };

  const sidebarCollapsedWidth = 72;
  const sidebarExpandedWidth = 240;
  const sidebarWidth = isDesktop 
    ? (sidebarExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth)
    : (isTablet ? 220 : 260);

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.45s ease ${d}s, transform 0.45s ease ${d}s`,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const getTypeLabel = (type: Application["institution_type"]) => {
    switch (type) {
      case "md": return "MD (Allopathic)";
      case "do": return "DO (Osteopathic)";
      case "combined": return "Combined MD/DO";
    }
  };

  // Sidebar (reusing same pattern)
  const sidebar = (
    <div
      onMouseEnter={() => isDesktop && setSidebarExpanded(true)}
      onMouseLeave={() => isDesktop && setSidebarExpanded(false)}
      style={{
        width: sidebarWidth,
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
        background: C.white,
        borderRight: `1px solid ${C.borderLight}`,
        display: "flex",
        flexDirection: "column",
        padding: isDesktop && !sidebarExpanded ? "24px 12px 20px" : "24px 16px 20px",
        transform: (!isDesktop && !sidebarOpen) ? `translateX(-${sidebarWidth}px)` : "translateX(0)",
        transition: "all 0.25s ease",
        boxShadow: (!isDesktop && sidebarOpen) ? "4px 0 24px rgba(0,44,118,0.06)" : "none",
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start",
        gap: 8,
        padding: isDesktop && !sidebarExpanded ? "0" : "0 8px",
        marginBottom: isDesktop && !sidebarExpanded ? 20 : 8,
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}>
        {(sidebarExpanded || !isDesktop) ? (
          <>
            <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep }}>Journey</span>
            <span style={{
              fontFamily: mono,
              fontSize: 8,
              color: C.greenDark,
              letterSpacing: "0.1em",
              border: `1.2px solid ${C.greenDark}`,
              padding: "1px 5px",
              borderRadius: 2.5,
            }}>
              OS
            </span>
          </>
        ) : (
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: C.navyDeep,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: serif,
            fontSize: 14,
            fontWeight: 700,
            color: C.white,
          }}>
            J
          </div>
        )}
      </div>

      {(sidebarExpanded || !isDesktop) && (
        <p style={{
          fontFamily: mono,
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: C.textMuted,
          padding: "0 8px",
          marginBottom: 24,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          Platform Administration
        </p>
      )}

      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(({ key, label, Icon, path }) => {
          const isActive = activeNav === key;
          return (
            <button
              key={key}
              onClick={() => navigate(path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: isDesktop && !sidebarExpanded ? "10px 0" : "10px 12px",
                justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start",
                borderRadius: 6,
                background: "transparent",
                borderLeft: isActive ? `3px solid ${C.greenDark}` : "3px solid transparent",
                fontFamily: sans,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? C.navyDeep : C.textSecondary,
                cursor: "pointer",
                outline: "none",
                transition: "all 0.15s ease",
                textAlign: "left",
                border: "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = C.parchment;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {(sidebarExpanded || !isDesktop) && (
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{
        borderTop: `1px solid ${C.borderLight}`,
        paddingTop: 16,
        marginTop: 16,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: isDesktop && !sidebarExpanded ? "8px 0" : "8px",
          justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start",
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: C.navyDeep,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: mono,
            fontSize: 11,
            fontWeight: 600,
            color: C.white,
            flexShrink: 0,
          }}>
            {user.initials}
          </div>
          {(sidebarExpanded || !isDesktop) && (
            <div style={{ overflow: "hidden", flex: 1 }}>
              <p style={{
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 600,
                color: C.ink,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {user.name}
              </p>
              <p style={{
                fontFamily: mono,
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: C.textMuted,
                margin: 0,
              }}>
                {user.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Review Modal
  const modal = selectedApplication && modalAction && (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,44,118,0.12)",
      backdropFilter: "blur(4px)",
      padding: isMobile ? 16 : 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 640,
        maxHeight: "90vh",
        background: C.white,
        border: `1px solid ${C.borderLight}`,
        borderRadius: 12,
        boxShadow: "0 16px 64px rgba(0,44,118,0.12)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? "20px 24px" : "24px 32px",
          borderBottom: `1px solid ${C.borderLight}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h2 style={{
            fontFamily: serif,
            fontSize: 22,
            fontWeight: 700,
            color: C.navyDeep,
            margin: 0,
          }}>
            {modalAction === "approve" ? "Approve Application" : "Reject Application"}
          </h2>
          <button
            onClick={handleCloseModal}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: C.textMuted,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 24px" : "24px 32px" }}>
          {/* Institution Info */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.textMuted,
              marginBottom: 8,
            }}>
              Institution
            </div>
            <h3 style={{
              fontFamily: serif,
              fontSize: 20,
              fontWeight: 700,
              color: C.navyDeep,
              margin: "0 0 4px",
            }}>
              {selectedApplication.institution_name}
            </h3>
            <div style={{
              fontFamily: sans,
              fontSize: 14,
              color: C.textSecondary,
            }}>
              {getTypeLabel(selectedApplication.institution_type)} • {selectedApplication.accreditation_body}
            </div>
          </div>

          {/* Details Grid */}
          <div style={{
            background: C.parchment,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{
                  fontFamily: mono,
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.textMuted,
                  marginBottom: 4,
                }}>
                  Contact
                </div>
                <div style={{
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.ink,
                  marginBottom: 2,
                }}>
                  {selectedApplication.contact_name}
                </div>
                <div style={{
                  fontFamily: mono,
                  fontSize: 10,
                  color: C.textSecondary,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}>
                  <Mail size={12} />
                  {selectedApplication.contact_email}
                </div>
                {selectedApplication.contact_phone && (
                  <div style={{
                    fontFamily: mono,
                    fontSize: 10,
                    color: C.textSecondary,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <Phone size={12} />
                    {selectedApplication.contact_phone}
                  </div>
                )}
              </div>

              <div>
                <div style={{
                  fontFamily: mono,
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.textMuted,
                  marginBottom: 4,
                }}>
                  Details
                </div>
                <div style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.textSecondary,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}>
                  <Hash size={12} />
                  {selectedApplication.student_count.toLocaleString()} students
                </div>
                {selectedApplication.website_url && (
                  <div style={{
                    fontFamily: mono,
                    fontSize: 10,
                    color: C.blueMid,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <Globe size={12} />
                    <a href={selectedApplication.website_url} target="_blank" rel="noopener noreferrer" style={{ color: C.blueMid }}>
                      Website
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reason */}
          {selectedApplication.reason && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.textMuted,
                marginBottom: 8,
              }}>
                Reason for Interest
              </div>
              <div style={{
                fontFamily: sans,
                fontSize: 15,
                color: C.textSecondary,
                lineHeight: 1.7,
              }}>
                {selectedApplication.reason}
              </div>
            </div>
          )}

          {/* Rejection Reason Input */}
          {modalAction === "reject" && (
            <div>
              <label style={{
                display: "block",
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.textMuted,
                marginBottom: 8,
              }}>
                Reason for Rejection (Optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide context for this decision..."
                rows={3}
                style={{
                  width: "100%",
                  background: C.parchment,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontFamily: sans,
                  fontSize: 15,
                  color: C.ink,
                  resize: "none",
                  outline: "none",
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? "16px 24px" : "20px 32px",
          borderTop: `1px solid ${C.borderLight}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
        }}>
          <button
            onClick={handleCloseModal}
            disabled={isProcessing}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              fontFamily: sans,
              fontSize: 15,
              fontWeight: 700,
              color: C.navyDeep,
              cursor: isProcessing ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmAction}
            disabled={isProcessing}
            style={{
              padding: "12px 24px",
              background: isProcessing ? C.textMuted : (modalAction === "approve" ? C.green : "#c9282d"),
              border: "none",
              borderRadius: 6,
              fontFamily: sans,
              fontSize: 15,
              fontWeight: 700,
              color: C.white,
              cursor: isProcessing ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isProcessing ? "Processing..." : (modalAction === "approve" ? (
              <>
                <CheckCircle2 size={18} />
                Approve Application
              </>
            ) : (
              <>
                <X size={18} />
                Reject Application
              </>
            ))}
          </button>
        </div>
      </div>
    </div>
  );

  // Main Content
  return (
    <>
      {sidebar}
      {modal}
      
      {!isDesktop && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,44,118,0.12)",
            backdropFilter: "blur(2px)",
            zIndex: 40,
          }}
        />
      )}

      <div style={{
        marginLeft: isDesktop ? sidebarWidth : 0,
        minHeight: "100vh",
        background: C.cream,
        transition: "margin 0.25s ease",
      }}>
        {/* Top Bar */}
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.borderLight}`,
          padding: isMobile ? "16px 16px" : "20px 32px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {!isDesktop && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  style={{
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ width: 18, height: 2, background: C.navyDeep, borderRadius: 1 }} />
                    <div style={{ width: 18, height: 2, background: C.navyDeep, borderRadius: 1 }} />
                    <div style={{ width: 18, height: 2, background: C.navyDeep, borderRadius: 1 }} />
                  </div>
                </button>
              )}
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
                  Application Review
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {/* Stats */}
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { label: "Pending Review", value: applications.filter((a) => a.status === "pending").length, color: "#fa9d33", icon: <Clock size={20} /> },
              { label: "Approved", value: applications.filter((a) => a.status === "approved").length, color: C.green, icon: <CheckCircle2 size={20} /> },
              { label: "Total Applications", value: applications.length, color: C.navyDeep, icon: <FileCheck size={20} /> },
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

          {/* Filter Bar */}
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
              <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "1 1 280px", minWidth: 240 }}>
                <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
                <input
                  type="search"
                  placeholder="Search applications..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  style={{
                    width: "100%",
                    height: 40,
                    background: C.parchment,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "0 16px 0 40px",
                    fontFamily: sans,
                    fontSize: 15,
                    color: C.ink,
                    outline: "none",
                  }}
                />
              </div>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                style={{
                  width: 160,
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
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Applications List */}
          <div style={{ ...fadeIn(0.15), display: "flex", flexDirection: "column", gap: 16 }}>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} style={{
                  height: 120,
                  background: C.white,
                  border: `1px solid ${C.borderLight}`,
                  borderRadius: 12,
                  animation: "pulse 1.5s ease-in-out infinite",
                }} />
              ))
            ) : applications.length === 0 ? (
              <div style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 12,
                padding: 64,
                textAlign: "center",
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(0,44,118,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}>
                  <FileCheck size={36} color="rgba(0,44,118,0.3)" />
                </div>
                <h3 style={{
                  fontFamily: serif,
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.navyDeep,
                  marginBottom: 8,
                }}>
                  No applications found
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
              applications.map((app) => (
                <div key={app.id} style={{
                  background: C.white,
                  border: `1px solid ${C.borderLight}`,
                  borderRadius: 12,
                  padding: isMobile ? 20 : 24,
                  transition: "box-shadow 0.2s ease",
                }}>
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontFamily: serif,
                        fontSize: 20,
                        fontWeight: 700,
                        color: C.navyDeep,
                        margin: "0 0 4px",
                      }}>
                        {app.institution_name}
                      </h3>
                      <div style={{
                        fontFamily: sans,
                        fontSize: 14,
                        color: C.textSecondary,
                        marginBottom: 12,
                      }}>
                        {getTypeLabel(app.institution_type)} • {app.student_count.toLocaleString()} students
                      </div>
                      <div style={{
                        fontFamily: mono,
                        fontSize: 10,
                        color: C.textMuted,
                      }}>
                        Submitted {formatDate(app.submitted_at)}
                      </div>
                    </div>
                    
                    {app.status === "pending" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleOpenModal(app, "approve")}
                          style={{
                            padding: "8px 16px",
                            background: C.green,
                            border: "none",
                            borderRadius: 6,
                            fontFamily: sans,
                            fontSize: 14,
                            fontWeight: 700,
                            color: C.white,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <CheckCircle2 size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleOpenModal(app, "reject")}
                          style={{
                            padding: "8px 16px",
                            background: C.white,
                            border: `2px solid ${C.border}`,
                            borderRadius: 6,
                            fontFamily: sans,
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#c9282d",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{
                    background: C.parchment,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 8,
                    padding: 12,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                  }}>
                    <div style={{ flex: "1 1 200px" }}>
                      <div style={{
                        fontFamily: mono,
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: C.textMuted,
                        marginBottom: 4,
                      }}>
                        Contact
                      </div>
                      <div style={{
                        fontFamily: sans,
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.ink,
                      }}>
                        {app.contact_name}
                      </div>
                      <div style={{
                        fontFamily: mono,
                        fontSize: 10,
                        color: C.textSecondary,
                      }}>
                        {app.contact_email}
                      </div>
                    </div>
                    <div style={{ flex: "1 1 200px" }}>
                      <div style={{
                        fontFamily: mono,
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: C.textMuted,
                        marginBottom: 4,
                      }}>
                        Accreditation
                      </div>
                      <div style={{
                        fontFamily: sans,
                        fontSize: 14,
                        color: C.textSecondary,
                      }}>
                        {app.accreditation_body}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
