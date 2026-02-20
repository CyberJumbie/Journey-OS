import { useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { Button } from "../../components/ui/button";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  FileText, 
  MessageSquare, 
  Users, 
  AlertCircle,
  Trash2,
  Filter
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

interface Notification {
  id: string;
  type: "question" | "comment" | "collaboration" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

const notifications: Notification[] = [
  {
    id: "1",
    type: "question",
    title: "New Questions Generated",
    message: "12 new questions have been generated for Advanced Cardiovascular Medicine - Week 3",
    timestamp: "2026-02-16T09:30:00",
    read: false,
    actionUrl: "/courses/1/questions",
  },
  {
    id: "2",
    type: "comment",
    title: "Review Comment Added",
    message: "Dr. Michael Chen added a comment on question #245: 'Consider adjusting the difficulty level'",
    timestamp: "2026-02-16T08:15:00",
    read: false,
    actionUrl: "/questions/245",
  },
  {
    id: "3",
    type: "collaboration",
    title: "Collaborator Invitation",
    message: "Dr. Emily Rodriguez invited you to collaborate on Internal Medicine Fundamentals",
    timestamp: "2026-02-15T16:45:00",
    read: false,
    actionUrl: "/courses/2/collaborators",
  },
  {
    id: "4",
    type: "question",
    title: "Questions Approved",
    message: "8 questions from your review queue have been approved and added to the repository",
    timestamp: "2026-02-15T14:20:00",
    read: true,
    actionUrl: "/repository",
  },
  {
    id: "5",
    type: "system",
    title: "System Maintenance Scheduled",
    message: "Platform maintenance scheduled for Saturday, February 18th from 2:00 AM - 4:00 AM EST",
    timestamp: "2026-02-15T10:00:00",
    read: true,
  },
  {
    id: "6",
    type: "comment",
    title: "AI Refinement Complete",
    message: "Your AI refinement request for question #234 has been completed. Review the suggestions.",
    timestamp: "2026-02-14T17:30:00",
    read: true,
    actionUrl: "/questions/234/refine",
  },
  {
    id: "7",
    type: "question",
    title: "Question Review Pending",
    message: "5 questions are pending your review in Clinical Diagnosis & Reasoning",
    timestamp: "2026-02-14T11:15:00",
    read: true,
    actionUrl: "/courses/3/questions",
  },
  {
    id: "8",
    type: "collaboration",
    title: "New Collaborator Added",
    message: "Dr. James Wilson has been added as a collaborator to Pharmacology in Practice",
    timestamp: "2026-02-13T15:40:00",
    read: true,
  },
];

export default function Notifications() {
  const [notificationList, setNotificationList] = useState(notifications);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = notificationList.filter(n => 
    filter === "all" || !n.read
  );

  const unreadCount = notificationList.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotificationList(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotificationList(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotificationList(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "question":
        return <FileText className="size-5 text-[#FFC645]" />;
      case "comment":
        return <MessageSquare className="size-5 text-blue-600" />;
      case "collaboration":
        return <Users className="size-5 text-green-600" />;
      case "system":
        return <AlertCircle className="size-5 text-orange-600" />;
      default:
        return <Bell className="size-5 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="size-4" />
                  {filter === "all" ? "All" : "Unread"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter("all")}>
                  All Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("unread")}>
                  Unread Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead}>
                <CheckCheck className="size-4" />
                Mark All as Read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-lg border border-gray-200 p-4 transition-all hover:border-gray-300 ${
                !notification.read ? 'bg-[#FFC645]/5 border-[#FFC645]/20' : ''
              }`}
            >
              <div className="flex gap-4">
                <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                  notification.type === "question" ? "bg-[#FFC645]/10" :
                  notification.type === "comment" ? "bg-blue-100" :
                  notification.type === "collaboration" ? "bg-green-100" :
                  "bg-orange-100"
                }`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className="font-medium text-gray-900">
                      {notification.title}
                      {!notification.read && (
                        <span className="ml-2 inline-block size-2 rounded-full bg-[#FFC645]" />
                      )}
                    </h3>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2">
                    {notification.actionUrl && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          markAsRead(notification.id);
                          // Navigate to actionUrl
                        }}
                      >
                        View
                      </Button>
                    )}
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="size-4" />
                        Mark as Read
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteNotification(notification.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredNotifications.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Bell className="size-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No notifications</p>
            <p className="text-sm text-gray-500">
              {filter === "unread" 
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications yet."}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}