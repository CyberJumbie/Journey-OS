import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, MessageSquare, Send, Paperclip, Users, Search } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — FACULTY COMMUNICATION HUB (STORY-C-1)
// Template B: Faculty Shell with messaging interface
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

interface Conversation {
  id: string;
  name: string;
  participants: string[];
  last_message: string;
  timestamp: string;
  unread: boolean;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  is_current_user: boolean;
}

export default function FacultyCommunicationHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("communications");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/faculty" || path === "/faculty/dashboard") setActiveNav("dashboard");
    else if (path.startsWith("/faculty/courses")) setActiveNav("courses");
    else if (path.startsWith("/faculty/questions")) setActiveNav("questions");
    else if (path.startsWith("/faculty/communications")) setActiveNav("communications");
    else if (path.startsWith("/faculty/settings")) setActiveNav("settings");
  }, [location.pathname]);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockConversations: Conversation[] = [
      {
        id: "1",
        name: "Pharmacology Team",
        participants: ["Dr. Sarah Chen", "Dr. Michael Torres", "Dr. Emily Johnson"],
        last_message: "Let's review the new USMLE questions for cardiovascular...",
        timestamp: "2026-02-20T10:30:00Z",
        unread: true,
      },
      {
        id: "2",
        name: "Course Coordinators",
        participants: ["Dr. Sarah Chen", "Dr. James Wilson"],
        last_message: "The midterm exam is scheduled for next week",
        timestamp: "2026-02-19T15:45:00Z",
        unread: false,
      },
      {
        id: "3",
        name: "Curriculum Development",
        participants: ["Dr. Sarah Chen", "Dr. Lisa Anderson", "Dr. Robert Martinez"],
        last_message: "I've uploaded the revised blueprint to the repository",
        timestamp: "2026-02-18T09:20:00Z",
        unread: false,
      },
    ];

    setConversations(mockConversations);
    if (mockConversations.length > 0) {
      setSelectedConversation(mockConversations[0]);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const mockMessages: Message[] = [
      {
        id: "1",
        sender: "Dr. Michael Torres",
        content: "Has everyone reviewed the draft questions I sent yesterday?",
        timestamp: "2026-02-20T09:15:00Z",
        is_current_user: false,
      },
      {
        id: "2",
        sender: "Dr. Sarah Chen",
        content: "Yes, I've reviewed them. The cardiovascular questions look great! I have a few suggestions for the pharmacology section.",
        timestamp: "2026-02-20T09:45:00Z",
        is_current_user: true,
      },
      {
        id: "3",
        sender: "Dr. Emily Johnson",
        content: "I agree with Sarah. Let's schedule a meeting to discuss the feedback.",
        timestamp: "2026-02-20T10:05:00Z",
        is_current_user: false,
      },
      {
        id: "4",
        sender: "Dr. Michael Torres",
        content: "Let's review the new USMLE questions for cardiovascular...",
        timestamp: "2026-02-20T10:30:00Z",
        is_current_user: false,
      },
    ];

    setMessages(mockMessages);
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "Dr. Sarah Chen",
      content: messageInput,
      timestamp: new Date().toISOString(),
      is_current_user: true,
    };

    setMessages([...messages, newMessage]);
    setMessageInput("");
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/faculty/dashboard" },
    { key: "courses", label: "My Courses", Icon: BookOpen, path: "/faculty/courses" },
    { key: "questions", label: "Questions", Icon: FileText, path: "/faculty/questions/generate" },
    { key: "communications", label: "Messages", Icon: MessageSquare, path: "/faculty/communications" },
    { key: "settings", label: "Settings", Icon: Settings, path: "/faculty/settings" },
  ];

  const user = { name: "Dr. Sarah Chen", initials: "SC", role: "Faculty", department: "Pharmacology" };

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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

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
          {user.department}
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

  const filteredConversations = conversations.filter((conv) =>
    searchQuery === "" || conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {sidebar}
      
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
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontFamily: serif,
                fontSize: isMobile ? 24 : 30,
                fontWeight: 700,
                color: C.navyDeep,
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
                margin: 0,
              }}>
                Messages
              </h1>
              <p style={{
                fontFamily: sans,
                fontSize: 14,
                color: C.textSecondary,
                margin: "4px 0 0",
              }}>
                Communicate with your colleagues
              </p>
            </div>
            <button style={{
              padding: "10px 20px",
              background: C.green,
              border: "none",
              borderRadius: 8,
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 700,
              color: C.white,
              cursor: "pointer",
              display: isMobile ? "none" : "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <Plus size={16} />
              New Message
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "0" : isTablet ? "24px 24px" : "28px 32px", height: "calc(100vh - 100px)" }}>
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isDesktop ? "320px 1fr" : "1fr",
            gap: 0,
            height: "100%",
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: isMobile ? 0 : 12,
            overflow: "hidden",
          }}>
            {/* Conversations List */}
            <div style={{
              borderRight: isDesktop ? `1px solid ${C.borderLight}` : "none",
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}>
              {/* Search */}
              <div style={{
                padding: 16,
                borderBottom: `1px solid ${C.borderLight}`,
              }}>
                <div style={{ position: "relative" }}>
                  <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
                  <input
                    type="search"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      height: 40,
                      background: C.parchment,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "0 16px 0 44px",
                      fontFamily: sans,
                      fontSize: 14,
                      color: C.ink,
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Conversation List */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    style={{
                      padding: 16,
                      borderBottom: `1px solid ${C.borderLight}`,
                      background: selectedConversation?.id === conv.id ? C.parchment : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedConversation?.id !== conv.id) {
                        e.currentTarget.style.background = `${C.parchment}80`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedConversation?.id !== conv.id) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 8,
                    }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: C.navyDeep,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: mono,
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.white,
                        flexShrink: 0,
                      }}>
                        <Users size={18} />
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 2,
                        }}>
                          <h3 style={{
                            fontFamily: sans,
                            fontSize: 14,
                            fontWeight: conv.unread ? 700 : 600,
                            color: C.navyDeep,
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {conv.name}
                          </h3>
                          {conv.unread && (
                            <div style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: C.green,
                              flexShrink: 0,
                            }} />
                          )}
                        </div>
                        <p style={{
                          fontFamily: sans,
                          fontSize: 13,
                          color: C.textMuted,
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {conv.last_message}
                        </p>
                        <p style={{
                          fontFamily: mono,
                          fontSize: 10,
                          color: C.textMuted,
                          margin: "4px 0 0",
                        }}>
                          {formatTime(conv.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages Panel */}
            {selectedConversation && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}>
                {/* Conversation Header */}
                <div style={{
                  padding: 20,
                  borderBottom: `1px solid ${C.borderLight}`,
                  background: C.parchment,
                }}>
                  <h2 style={{
                    fontFamily: serif,
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.navyDeep,
                    margin: "0 0 6px",
                  }}>
                    {selectedConversation.name}
                  </h2>
                  <p style={{
                    fontFamily: sans,
                    fontSize: 13,
                    color: C.textMuted,
                    margin: 0,
                  }}>
                    {selectedConversation.participants.join(", ")}
                  </p>
                </div>

                {/* Messages */}
                <div style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: message.is_current_user ? "flex-end" : "flex-start",
                      }}
                    >
                      <div style={{
                        maxWidth: "70%",
                        background: message.is_current_user ? C.navyDeep : C.parchment,
                        border: message.is_current_user ? "none" : `1px solid ${C.border}`,
                        borderRadius: 12,
                        padding: 12,
                      }}>
                        {!message.is_current_user && (
                          <p style={{
                            fontFamily: sans,
                            fontSize: 12,
                            fontWeight: 600,
                            color: C.blueMid,
                            margin: "0 0 6px",
                          }}>
                            {message.sender}
                          </p>
                        )}
                        <p style={{
                          fontFamily: sans,
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: message.is_current_user ? C.white : C.textPrimary,
                          margin: 0,
                        }}>
                          {message.content}
                        </p>
                      </div>
                      <p style={{
                        fontFamily: mono,
                        fontSize: 10,
                        color: C.textMuted,
                        margin: "4px 0 0",
                      }}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div style={{
                  padding: 16,
                  borderTop: `1px solid ${C.borderLight}`,
                  background: C.parchment,
                }}>
                  <div style={{
                    display: "flex",
                    gap: 8,
                  }}>
                    <button style={{
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      color: C.textSecondary,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}>
                      <Paperclip size={18} />
                    </button>
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      style={{
                        flex: 1,
                        height: 40,
                        background: C.white,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: "0 16px",
                        fontFamily: sans,
                        fontSize: 14,
                        color: C.ink,
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      style={{
                        width: 40,
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: messageInput.trim() ? C.green : C.textMuted,
                        border: "none",
                        borderRadius: 8,
                        color: C.white,
                        cursor: messageInput.trim() ? "pointer" : "not-allowed",
                        flexShrink: 0,
                      }}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
