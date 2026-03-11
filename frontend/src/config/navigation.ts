import type { UserRole } from '@journey-os/shared-types';

export interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  section?: string;
  badge?: string;
}

function facultyNav(isCourseDirector: boolean): NavItem[] {
  const items: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
    { key: 'workbench', label: 'QUEST Workbench', icon: 'Sparkles', path: '/generation/wizard' },
    { key: 'courses', label: 'My Courses', icon: 'BookOpen', path: '/courses' },
    { key: 'review', label: 'Review Queue', icon: 'ClipboardList', path: '/questions/review', section: 'Items' },
    { key: 'repository', label: 'Item Bank', icon: 'Library', path: '/repository' },
    { key: 'history', label: 'Generation History', icon: 'FileText', path: '/history', section: 'Items' },
    { key: 'batches', label: 'Batches', icon: 'Layers', path: '/batches', section: 'Items' },
    { key: 'exams', label: 'Build Exam', icon: 'FileCheck', path: '/exams', section: 'Exams' },
    { key: 'coverage', label: 'Coverage Map', icon: 'Network', path: '/analytics/coverage', section: 'Analytics' },
    { key: 'gaps', label: 'Gap Priorities', icon: 'Target', path: '/analytics/gaps', section: 'Analytics' },
    { key: 'heatmap', label: 'USMLE Heatmap', icon: 'BarChart3', path: '/analytics/heatmap', section: 'Analytics' },
  ];

  if (isCourseDirector) {
    items.push(
      { key: 'faculty-mgmt', label: 'Faculty', icon: 'Users', path: '/courses/faculty', section: 'Director' },
    );
  }

  return items;
}

function studentNav(): NavItem[] {
  return [
    { key: 'student-dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/student-dashboard' },
    { key: 'practice', label: 'Practice', icon: 'Sparkles', path: '/student/practice' },
    { key: 'progress', label: 'My Progress', icon: 'TrendingUp', path: '/student/progress' },
    { key: 'student-analytics', label: 'Analytics', icon: 'BarChart3', path: '/student/analytics' },
    { key: 'student-exams', label: 'My Exams', icon: 'FileCheck', path: '/student/exams' },
  ];
}

function institutionAdminNav(): NavItem[] {
  return [
    { key: 'inst-dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/institution/dashboard' },
    { key: 'inst-courses', label: 'Courses', icon: 'BookOpen', path: '/institution/courses', section: 'Management' },
    { key: 'inst-faculty', label: 'Faculty', icon: 'Users', path: '/institution/faculty', section: 'Management' },
    { key: 'inst-students', label: 'Students', icon: 'GraduationCap', path: '/institution/students', section: 'Management' },
    { key: 'inst-usmle', label: 'USMLE Coverage', icon: 'Target', path: '/institution/usmle-coverage', section: 'Coverage' },
    { key: 'inst-fac-cov', label: 'Faculty Coverage', icon: 'BarChart3', path: '/institution/faculty-coverage', section: 'Coverage' },
    { key: 'inst-sequence', label: 'Sequence Modeler', icon: 'Network', path: '/institution/sequence', section: 'Coverage' },
    { key: 'inst-lcme', label: 'LCME Heatmap', icon: 'Shield', path: '/institution/lcme-heatmap', section: 'Compliance' },
    { key: 'inst-accred', label: 'Accreditation', icon: 'CheckSquare', path: '/institution/accreditation', section: 'Compliance' },
    { key: 'inst-frameworks', label: 'Frameworks', icon: 'Layers', path: '/institution/frameworks', section: 'Config' },
    { key: 'inst-users', label: 'Users', icon: 'UserCog', path: '/institution/users', section: 'Config' },
  ];
}

function superadminNav(): NavItem[] {
  return [
    { key: 'admin-dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/admin' },
    { key: 'admin-institutions', label: 'Institutions', icon: 'Building2', path: '/admin/institutions', section: 'Management' },
    { key: 'admin-applications', label: 'Applications', icon: 'ClipboardList', path: '/admin/applications', section: 'Management' },
    { key: 'admin-users', label: 'Users', icon: 'Users', path: '/admin/users', section: 'Management' },
    { key: 'admin-knowledge', label: 'Knowledge Browser', icon: 'Network', path: '/admin/knowledge', section: 'Content' },
    { key: 'admin-frameworks', label: 'Frameworks', icon: 'Layers', path: '/admin/frameworks', section: 'Content' },
    { key: 'admin-ilos', label: 'ILO Management', icon: 'BookOpen', path: '/admin/ilos', section: 'Content' },
    { key: 'admin-fulfills', label: 'FULFILLS Queue', icon: 'ListChecks', path: '/admin/fulfills-review', section: 'Content' },
    { key: 'admin-lcme', label: 'LCME Heatmap', icon: 'Shield', path: '/admin/lcme-compliance-heatmap', section: 'Compliance' },
    { key: 'admin-integrity', label: 'Data Integrity', icon: 'Database', path: '/admin/data-integrity', section: 'System' },
    { key: 'admin-setup', label: 'Setup Wizard', icon: 'Wand2', path: '/admin/setup', section: 'System' },
  ];
}

function advisorNav(): NavItem[] {
  return [
    { key: 'advisor-cohort', label: 'My Cohort', icon: 'Users', path: '/advisor/cohort' },
    { key: 'advisor-atrisk', label: 'At-Risk', icon: 'AlertTriangle', path: '/advisor/at-risk' },
    { key: 'advisor-reports', label: 'Reports', icon: 'BarChart3', path: '/advisor/reports' },
  ];
}

export function getNavItems(role: UserRole, isCourseDirector: boolean): NavItem[] {
  switch (role) {
    case 'faculty':
      return facultyNav(isCourseDirector);
    case 'student':
      return studentNav();
    case 'institutional_admin':
      return institutionAdminNav();
    case 'superadmin':
      return superadminNav();
    case 'advisor':
      return advisorNav();
    default:
      return [];
  }
}

export function getBottomNavItems(): NavItem[] {
  return [
    { key: 'settings', label: 'Settings', icon: 'Settings', path: '/settings' },
    { key: 'notifications', label: 'Notifications', icon: 'Bell', path: '/notifications' },
    { key: 'profile', label: 'Profile', icon: 'UserCircle', path: '/profile' },
  ];
}
