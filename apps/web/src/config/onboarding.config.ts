import type { OnboardingConfig } from "@journey-os/types";

/**
 * Data-driven onboarding step definitions per role.
 * [STORY-U-13] Each role gets a personalized welcome + 3 steps.
 */
export const ONBOARDING_CONFIGS: Record<string, OnboardingConfig> = {
  superadmin: {
    role: "superadmin",
    welcome_title: "Welcome to Journey OS",
    welcome_subtitle:
      "You have full platform access. Here's what you can do to get started.",
    steps: [
      {
        id: "platform-overview",
        title: "Platform Overview",
        description:
          "Get a bird's-eye view of your entire Journey OS deployment — institutions, users, and system health.",
        icon: "LayoutDashboard",
        action_label: "Go to Dashboard",
        action_href: "/admin",
      },
      {
        id: "pending-applications",
        title: "Pending Applications",
        description:
          "Review and approve institution applications waiting in the queue.",
        icon: "ClipboardList",
        action_label: "View Queue",
        action_href: "/admin/applications",
      },
      {
        id: "user-management",
        title: "User Management",
        description:
          "Manage platform users, assign roles, and handle reassignments across institutions.",
        icon: "Users",
        action_label: "Manage Users",
        action_href: "/admin/users",
      },
    ],
  },
  institutional_admin: {
    role: "institutional_admin",
    welcome_title: "Welcome to Your Institution",
    welcome_subtitle:
      "Let's set up your institution for success. Follow these steps to get started.",
    steps: [
      {
        id: "institution-setup",
        title: "Institution Setup Checklist",
        description:
          "Configure your institution's profile, departments, and academic calendar.",
        icon: "Building2",
        action_label: "Configure Institution",
        action_href: "/institution/settings",
      },
      {
        id: "framework-import",
        title: "Import Curriculum Frameworks",
        description:
          "Import USMLE, COMLEX, or custom frameworks to power AI-driven content generation.",
        icon: "FileInput",
        action_label: "Import Frameworks",
        action_href: "/institution/frameworks",
      },
      {
        id: "user-invitations",
        title: "Invite Your Team",
        description:
          "Send invitations to faculty, advisors, and students to join your institution.",
        icon: "UserPlus",
        action_label: "Invite Users",
        action_href: "/institution/users",
      },
    ],
  },
  faculty: {
    role: "faculty",
    welcome_title: "Welcome, Faculty",
    welcome_subtitle:
      "Journey OS helps you create high-quality assessments and track student mastery.",
    steps: [
      {
        id: "course-overview",
        title: "Course Assignment Overview",
        description:
          "See the courses you've been assigned and their current content status.",
        icon: "BookOpen",
        action_label: "View Courses",
        action_href: "/faculty/courses",
      },
      {
        id: "content-tools",
        title: "Content Creation Tools",
        description:
          "Explore the tools for creating, editing, and managing assessment items.",
        icon: "PenTool",
        action_label: "Explore Tools",
        action_href: "/faculty/content",
      },
      {
        id: "generation-workbench",
        title: "Generation Workbench",
        description:
          "Preview the AI-powered workbench for generating assessment items from learning objectives.",
        icon: "Sparkles",
        action_label: "Open Workbench",
        action_href: "/faculty/generate",
      },
    ],
  },
  student: {
    role: "student",
    welcome_title: "Welcome to Your Learning Journey",
    welcome_subtitle:
      "Journey OS adapts to your strengths and helps you master the material at your own pace.",
    steps: [
      {
        id: "enrolled-courses",
        title: "Your Enrolled Courses",
        description:
          "See the courses you're enrolled in and your current progress.",
        icon: "GraduationCap",
        action_label: "View Courses",
        action_href: "/student/courses",
      },
      {
        id: "learning-path",
        title: "Learning Path Overview",
        description:
          "Explore your personalized learning path based on your performance and goals.",
        icon: "Route",
        action_label: "View Path",
        action_href: "/student/path",
      },
      {
        id: "practice-tools",
        title: "Practice Tools",
        description:
          "Get started with adaptive practice sessions, flashcards, and self-assessment quizzes.",
        icon: "Dumbbell",
        action_label: "Start Practicing",
        action_href: "/student/practice",
      },
    ],
  },
  advisor: {
    role: "advisor",
    welcome_title: "Welcome, Advisor",
    welcome_subtitle:
      "Monitor student progress, set up alerts, and intervene when students need support.",
    steps: [
      {
        id: "student-roster",
        title: "Student Roster",
        description:
          "Preview your assigned student roster and their current academic standing.",
        icon: "Users",
        action_label: "View Roster",
        action_href: "/advisor/students",
      },
      {
        id: "monitoring-tools",
        title: "Monitoring Tools",
        description:
          "Set up dashboards to track student engagement, performance trends, and at-risk indicators.",
        icon: "Activity",
        action_label: "Configure Monitoring",
        action_href: "/advisor/monitoring",
      },
      {
        id: "alert-settings",
        title: "Alert Settings",
        description:
          "Configure automated alerts for low engagement, failing grades, or missed milestones.",
        icon: "Bell",
        action_label: "Set Up Alerts",
        action_href: "/advisor/alerts",
      },
    ],
  },
};
