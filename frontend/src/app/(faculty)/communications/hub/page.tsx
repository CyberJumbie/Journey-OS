'use client';

import { useState, useEffect } from "react";
import { Plus, Send, Paperclip, Users, Search } from "lucide-react";
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — FACULTY COMMUNICATION HUB (STORY-C-1)
// Page content only — layout provided by (faculty)/layout.tsx
// ═══════════════════════════════════════════════════════════════

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
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isDesktop = bp === "desktop";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  const fetchMessages = async (_conversationId: string) => {
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

  const filteredConversations = conversations.filter((conv) =>
    searchQuery === "" || conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Page Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
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

      {/* Content */}
      <div style={{ height: "calc(100vh - 200px)" }}>
        <div style={{
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
    </>
  );
}
