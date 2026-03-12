'use client';

import { useState, useEffect } from "react";
import { Plus, HelpCircle, AlertCircle, CheckCircle, Clock, Filter } from "lucide-react";
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — STUDENT SUPPORT CENTER (STORY-C-2)
// Page content only — layout provided by (faculty)/layout.tsx
// ═══════════════════════════════════════════════════════════════

interface Ticket {
  id: string;
  subject: string;
  category: "technical" | "academic" | "account" | "other";
  status: "open" | "in-progress" | "resolved";
  priority: "low" | "medium" | "high";
  created_at: string;
  last_updated: string;
}

export default function StudentSupportCenter() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [_showNewTicketModal, setShowNewTicketModal] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const fetchTickets = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockTickets: Ticket[] = [
      {
        id: "1",
        subject: "Unable to access practice exam",
        category: "technical",
        status: "in-progress",
        priority: "high",
        created_at: "2026-02-19T14:30:00Z",
        last_updated: "2026-02-20T09:15:00Z",
      },
      {
        id: "2",
        subject: "Question about cardiovascular exam scoring",
        category: "academic",
        status: "resolved",
        priority: "medium",
        created_at: "2026-02-18T10:20:00Z",
        last_updated: "2026-02-19T16:45:00Z",
      },
      {
        id: "3",
        subject: "Reset password request",
        category: "account",
        status: "resolved",
        priority: "low",
        created_at: "2026-02-17T08:00:00Z",
        last_updated: "2026-02-17T10:30:00Z",
      },
      {
        id: "4",
        subject: "Missing study materials for PHAR 501",
        category: "academic",
        status: "open",
        priority: "medium",
        created_at: "2026-02-20T11:00:00Z",
        last_updated: "2026-02-20T11:00:00Z",
      },
    ];

    const filtered = filterStatus === "all" ? mockTickets : mockTickets.filter((t) => t.status === filterStatus);
    setTickets(filtered);
  };

  const getStatusConfig = (status: Ticket["status"]) => {
    switch (status) {
      case "open":
        return { label: "Open", color: C.blueMid, icon: <AlertCircle size={16} /> };
      case "in-progress":
        return { label: "In Progress", color: "#fa9d33", icon: <Clock size={16} /> };
      case "resolved":
        return { label: "Resolved", color: C.green, icon: <CheckCircle size={16} /> };
    }
  };

  const getCategoryLabel = (category: Ticket["category"]) => {
    switch (category) {
      case "technical": return "Technical";
      case "academic": return "Academic";
      case "account": return "Account";
      case "other": return "Other";
    }
  };

  const getPriorityColor = (priority: Ticket["priority"]) => {
    switch (priority) {
      case "high": return C.red;
      case "medium": return "#fa9d33";
      case "low": return C.textMuted;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
            Support Center
          </h1>
          <p style={{
            fontFamily: sans,
            fontSize: 14,
            color: C.textSecondary,
            margin: "4px 0 0",
          }}>
            Get help with your questions and issues
          </p>
        </div>
        <button
          onClick={() => setShowNewTicketModal(true)}
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
          {!isMobile && "New Ticket"}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: 16,
        marginBottom: 24,
      }}>
        {[
          { label: "Open Tickets", value: tickets.filter((t) => t.status === "open").length, color: C.blueMid },
          { label: "In Progress", value: tickets.filter((t) => t.status === "in-progress").length, color: "#fa9d33" },
          { label: "Resolved", value: tickets.filter((t) => t.status === "resolved").length, color: C.green },
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

      {/* Filter Bar */}
      <div style={{
        background: C.white,
        border: `1px solid ${C.borderLight}`,
        borderRadius: 12,
        padding: isMobile ? 16 : 20,
        marginBottom: 20,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}>
          <Filter size={18} style={{ color: C.textMuted }} />
          {[
            { key: "all", label: "All Tickets" },
            { key: "open", label: "Open" },
            { key: "in-progress", label: "In Progress" },
            { key: "resolved", label: "Resolved" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterStatus(filter.key)}
              style={{
                padding: "8px 16px",
                background: filterStatus === filter.key ? C.navyDeep : "transparent",
                border: `1px solid ${filterStatus === filter.key ? C.navyDeep : C.border}`,
                borderRadius: 8,
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 600,
                color: filterStatus === filter.key ? C.white : C.textPrimary,
                cursor: "pointer",
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
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
            Your Tickets
          </h2>
        </div>

        <div>
          {tickets.length === 0 ? (
            <div style={{
              padding: 60,
              textAlign: "center",
            }}>
              <HelpCircle size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
              <p style={{
                fontFamily: sans,
                fontSize: 15,
                color: C.textMuted,
                margin: 0,
              }}>
                No tickets found. Create a new ticket to get support.
              </p>
            </div>
          ) : (
            tickets.map((ticket, index) => {
              const statusConfig = getStatusConfig(ticket.status);

              return (
                <div
                  key={ticket.id}
                  style={{
                    padding: isMobile ? "16px 20px" : "24px",
                    borderBottom: index < tickets.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    cursor: "pointer",
                  }}
                  onClick={() => console.log("View ticket:", ticket.id)}
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
                        fontSize: 16,
                        fontWeight: 700,
                        color: C.navyDeep,
                        margin: "0 0 8px",
                      }}>
                        {ticket.subject}
                      </h3>
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
                          background: `${statusConfig.color}15`,
                          border: `1px solid ${statusConfig.color}40`,
                          borderRadius: 6,
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 600,
                          color: statusConfig.color,
                        }}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </div>
                        <span style={{
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          color: C.textMuted,
                        }}>
                          {getCategoryLabel(ticket.category)}
                        </span>
                        <span style={{
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 600,
                          color: getPriorityColor(ticket.priority),
                        }}>
                          {ticket.priority.toUpperCase()} PRIORITY
                        </span>
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
                    fontFamily: mono,
                    fontSize: 11,
                    color: C.textMuted,
                  }}>
                    <span>Created: {formatDate(ticket.created_at)}</span>
                    <span>-</span>
                    <span>Updated: {formatDate(ticket.last_updated)}</span>
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
