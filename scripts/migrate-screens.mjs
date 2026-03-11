#!/usr/bin/env node

/**
 * migrate-screens.mjs
 *
 * Migrates prototype Vite+React Router pages → Next.js 15 App Router pages.
 * Transforms: use client, react-router → next/navigation, import paths,
 * strip layout wrappers, replace inline C/useBreakpoint with imports.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'fs';
import { join, dirname } from 'path';

const PROTO_DIR = '/tmp/prototype-extract/src/app/pages';
const FRONTEND_DIR = join(import.meta.dirname, '..', 'frontend', 'src', 'app');

// ─── ROUTE MAP ──────────────────────────────────────────────────
// Format: [sourceRelPath, destRelPath] (relative to pages dir / app dir)
const ROUTE_MAP = [
  // Public
  ['Landing.tsx', '(public)/page.tsx'],
  ['InstitutionApplication.tsx', '(public)/institution-application/page.tsx'],

  // Auth
  ['auth/Login.tsx', '(auth)/login/page.tsx'],
  ['auth/Registration.tsx', '(auth)/register/page.tsx'],
  ['auth/StudentRegistration.tsx', '(auth)/register/student/page.tsx'],
  ['auth/FacultyRegistration.tsx', '(auth)/register/faculty/page.tsx'],
  ['auth/AdminRegistration.tsx', '(auth)/register/admin/page.tsx'],
  ['auth/ForgotPassword.tsx', '(auth)/forgot-password/page.tsx'],
  ['auth/EmailVerification.tsx', '(auth)/email-verification/page.tsx'],
  ['auth/RoleSelection.tsx', '(auth)/role-selection/page.tsx'],
  ['auth/InvitationAccept.tsx', '(auth)/invitation/[token]/page.tsx'],
  ['auth/PersonaOnboarding.tsx', '(auth)/persona-onboarding/page.tsx'],

  // Onboarding
  ['onboarding/Onboarding.tsx', '(onboarding)/onboarding/page.tsx'],
  ['onboarding/FacultyOnboarding.tsx', '(onboarding)/onboarding/faculty/page.tsx'],
  ['onboarding/StudentOnboarding.tsx', '(onboarding)/onboarding/student/page.tsx'],
  ['onboarding/AdminOnboarding.tsx', '(onboarding)/onboarding/admin/page.tsx'],

  // Faculty — courses
  ['courses/AllCourses.tsx', '(faculty)/courses/page.tsx'],
  ['courses/CreateCourse.tsx', '(faculty)/courses/create/page.tsx'],
  ['courses/CourseDashboard.tsx', '(faculty)/courses/[courseId]/page.tsx'],
  ['courses/UploadSyllabus.tsx', '(faculty)/courses/[courseId]/syllabus/upload/page.tsx'],
  ['courses/SyllabusProcessing.tsx', '(faculty)/courses/[courseId]/syllabus/processing/page.tsx'],
  ['courses/SyllabusEditor.tsx', '(faculty)/courses/[courseId]/syllabus/editor/page.tsx'],
  ['courses/ReviewSyllabusMapping.tsx', '(faculty)/courses/[courseId]/syllabus/review/page.tsx'],
  ['courses/CourseReady.tsx', '(faculty)/courses/[courseId]/ready/page.tsx'],
  ['courses/LectureUpload.tsx', '(faculty)/courses/[courseId]/lectures/upload/page.tsx'],
  ['courses/LectureProcessing.tsx', '(faculty)/courses/[courseId]/lectures/processing/page.tsx'],
  ['courses/SubConceptReviewQueue.tsx', '(faculty)/courses/[courseId]/concepts/review/page.tsx'],
  ['courses/OutcomeMapping.tsx', '(faculty)/courses/[courseId]/outcomes/page.tsx'],
  ['courses/WeekView.tsx', '(faculty)/courses/[courseId]/week/[weekId]/page.tsx'],
  ['courses/WeekMaterialsUpload.tsx', '(faculty)/courses/[courseId]/week/[weekId]/upload/page.tsx'],

  // Faculty — generation
  ['generation/GenerationSpecificationWizard.tsx', '(faculty)/generation/wizard/page.tsx'],
  ['generation/BatchProgress.tsx', '(faculty)/generation/batch/[batchId]/page.tsx'],
  ['generation/GenerateQuestionsTopic.tsx', '(faculty)/generation/topic/page.tsx'],
  ['generation/GenerateQuestionsSyllabus.tsx', '(faculty)/generation/syllabus/page.tsx'],
  ['generation/GenerateTest.tsx', '(faculty)/generation/test/page.tsx'],
  ['generation/GenerateQuiz.tsx', '(faculty)/generation/quiz/page.tsx'],
  ['generation/GenerateHandout.tsx', '(faculty)/generation/handout/page.tsx'],

  // Faculty — questions
  ['questions/FacultyReviewQueue.tsx', '(faculty)/questions/review/page.tsx'],
  ['questions/ItemDetail.tsx', '(faculty)/questions/[questionId]/page.tsx'],
  ['questions/QuestionDetailView.tsx', '(faculty)/questions/[questionId]/detail/page.tsx'],
  ['questions/ConversationalRefinement.tsx', '(faculty)/questions/[questionId]/refine/page.tsx'],
  ['questions/AIRefinement.tsx', '(faculty)/questions/[questionId]/ai-refine/page.tsx'],
  ['questions/QuestionHistory.tsx', '(faculty)/questions/[questionId]/history/page.tsx'],
  ['questions/QuestionReviewList.tsx', '(faculty)/courses/[courseId]/questions/page.tsx'],

  // Faculty — exams
  ['exams/ExamAssembly.tsx', '(faculty)/exams/assembly/page.tsx'],
  ['exams/ExamAssignment.tsx', '(faculty)/exams/assignment/page.tsx'],
  ['exams/RetiredExamUpload.tsx', '(faculty)/exams/retired-upload/page.tsx'],

  // Faculty — other
  ['repository/Repository.tsx', '(faculty)/repository/page.tsx'],
  ['repository/ItemBankBrowser.tsx', '(faculty)/repository/browse/page.tsx'],
  ['analytics/Analytics.tsx', '(faculty)/analytics/page.tsx'],
  ['analytics/BlueprintCoverage.tsx', '(faculty)/analytics/blueprint/page.tsx'],
  ['analytics/CourseAnalytics.tsx', '(faculty)/analytics/course/[courseId]/page.tsx'],
  ['analytics/PersonalDashboard.tsx', '(faculty)/analytics/personal/page.tsx'],
  ['analytics/InstitutionalAnalytics.tsx', '(faculty)/analytics/institutional/page.tsx'],
  ['analytics/QuestionPerformanceMetrics.tsx', '(faculty)/analytics/performance/page.tsx'],
  ['collaboration/Collaborators.tsx', '(faculty)/collaboration/page.tsx'],
  ['templates/QuestionTemplates.tsx', '(faculty)/templates/page.tsx'],
  ['uploads/FacultyQuestionUpload.tsx', '(faculty)/uploads/faculty/page.tsx'],
  ['operations/BulkOperations.tsx', '(faculty)/operations/bulk/page.tsx'],

  // Faculty — communications
  ['communications/FacultyCommunicationHub.tsx', '(faculty)/communications/hub/page.tsx'],
  ['communications/StudentSupportCenter.tsx', '(faculty)/communications/support/page.tsx'],
  ['communications/AnnouncementSystem.tsx', '(faculty)/communications/announcements/page.tsx'],

  // Student
  ['dashboard/StudentDashboard.tsx', '(student)/student-dashboard/page.tsx'],
  ['student/StudentPractice.tsx', '(student)/student/practice/page.tsx'],
  ['student/StudentQuestionView.tsx', '(student)/student/practice/session/page.tsx'],
  ['student/StudentResults.tsx', '(student)/student/results/page.tsx'],
  ['student/StudentProgress.tsx', '(student)/student/progress/page.tsx'],
  ['student/StudentAnalytics.tsx', '(student)/student/analytics/page.tsx'],

  // Admin
  ['admin/AdminDashboard.tsx', '(admin)/admin/page.tsx'],
  ['admin/SetupWizard.tsx', '(admin)/admin/setup/page.tsx'],
  ['admin/FrameworkManagement.tsx', '(admin)/admin/frameworks/page.tsx'],
  ['admin/ILOManagement.tsx', '(admin)/admin/ilos/page.tsx'],
  ['admin/KnowledgeBrowser.tsx', '(admin)/admin/knowledge/page.tsx'],
  ['admin/SubConceptDetail.tsx', '(admin)/admin/knowledge/[uuid]/page.tsx'],
  ['admin/FacultyManagement.tsx', '(admin)/admin/faculty/page.tsx'],
  ['admin/FULFILLSReviewQueue.tsx', '(admin)/admin/fulfills-review/page.tsx'],
  ['admin/LCMEComplianceHeatmap.tsx', '(admin)/admin/lcme-compliance-heatmap/page.tsx'],
  ['admin/LCMEElementDrillDown.tsx', '(admin)/admin/lcme-element-drill-down/page.tsx'],
  ['admin/DataIntegrityDashboard.tsx', '(admin)/admin/data-integrity/page.tsx'],
  ['admin/ApplicationReviewQueue.tsx', '(admin)/admin/applications/page.tsx'],
  ['admin/AdminUserDirectory.tsx', '(admin)/admin/users/page.tsx'],
  ['admin/InstitutionListDashboard.tsx', '(admin)/admin/institutions/page.tsx'],
  ['admin/InstitutionDetailView.tsx', '(admin)/admin/institutions/[id]/page.tsx'],

  // Institution
  ['institution/InstitutionalAdminDashboard.tsx', '(institution)/institution/dashboard/page.tsx'],
  ['institution/UserManagement.tsx', '(institution)/institution/users/page.tsx'],
  ['institution/FrameworkConfiguration.tsx', '(institution)/institution/frameworks/page.tsx'],
  ['institution/CoverageDashboard.tsx', '(institution)/institution/coverage/page.tsx'],
  ['institution/AccreditationReports.tsx', '(institution)/institution/accreditation/page.tsx'],
  ['institution/SectionSequenceModeler.tsx', '(institution)/institution/sequence-modeler/page.tsx'],
  ['institution/InstitutionalUSMLECoverage.tsx', '(institution)/institution/usmle-coverage/page.tsx'],

  // Faculty Portal
  ['faculty/FacultyDashboard.tsx', '(faculty-portal)/faculty/dashboard/page.tsx'],
  ['faculty/CourseList.tsx', '(faculty-portal)/faculty/courses/page.tsx'],
  ['faculty/CourseDetailView.tsx', '(faculty-portal)/faculty/courses/[courseId]/page.tsx'],
  ['faculty/CreateEditCourse.tsx', '(faculty-portal)/faculty/courses/create/page.tsx'],
  ['faculty/CourseRoster.tsx', '(faculty-portal)/faculty/courses/[courseId]/roster/page.tsx'],
  ['faculty/QuestWorkbench.tsx', '(faculty-portal)/faculty/quest-workbench/page.tsx'],
  ['institution/FacultyUSMLECoverage.tsx', '(faculty-portal)/faculty/usmle-coverage/page.tsx'],

  // Shared
  ['profile/Profile.tsx', '(shared)/profile/page.tsx'],
  ['settings/Settings.tsx', '(shared)/settings/page.tsx'],
  ['settings/SystemConfigurationDashboard.tsx', '(shared)/settings/system/page.tsx'],
  ['settings/UserRoleManagement.tsx', '(shared)/settings/roles/page.tsx'],
  ['notifications/Notifications.tsx', '(shared)/notifications/page.tsx'],
  ['help/Help.tsx', '(shared)/help/page.tsx'],

  // Special
  ['errors/NotFound.tsx', 'not-found.tsx'],
];

// ─── TRANSFORM FUNCTIONS ────────────────────────────────────────

function addUseClient(code) {
  if (code.startsWith("'use client'") || code.startsWith('"use client"')) return code;
  return "'use client';\n\n" + code;
}

function transformReactRouterImports(code) {
  // Collect what's imported from react-router
  const rrImportRegex = /import\s*\{([^}]+)\}\s*from\s*["']react-router["'];?\n?/g;
  let hasNavigate = false, hasParams = false, hasLocation = false, hasSearchParams = false;

  code = code.replace(rrImportRegex, (match, imports) => {
    const items = imports.split(',').map(s => s.trim()).filter(Boolean);
    items.forEach(item => {
      if (item === 'useNavigate') hasNavigate = true;
      if (item === 'useParams') hasParams = true;
      if (item === 'useLocation') hasLocation = true;
      if (item === 'useSearchParams') hasSearchParams = true;
    });
    return ''; // Remove the react-router import
  });

  // Also handle: import { useNavigate } from "react-router-dom"
  const rrdImportRegex = /import\s*\{([^}]+)\}\s*from\s*["']react-router-dom["'];?\n?/g;
  code = code.replace(rrdImportRegex, (match, imports) => {
    const items = imports.split(',').map(s => s.trim()).filter(Boolean);
    items.forEach(item => {
      if (item === 'useNavigate') hasNavigate = true;
      if (item === 'useParams') hasParams = true;
      if (item === 'useLocation') hasLocation = true;
      if (item === 'useSearchParams') hasSearchParams = true;
    });
    return '';
  });

  // Build next/navigation import
  const nextImports = [];
  if (hasNavigate) nextImports.push('useRouter');
  if (hasParams) nextImports.push('useParams');
  if (hasLocation) nextImports.push('usePathname');
  if (hasSearchParams) nextImports.push('useSearchParams');

  if (nextImports.length > 0) {
    // Insert after 'use client' or at top
    const insertImport = `import { ${nextImports.join(', ')} } from 'next/navigation';\n`;
    if (code.includes("'use client'")) {
      code = code.replace("'use client';", "'use client';\n\n" + insertImport);
    } else {
      code = insertImport + code;
    }
  }

  // Replace useNavigate() → useRouter()
  if (hasNavigate) {
    code = code.replace(/const\s+navigate\s*=\s*useNavigate\(\)\s*;?/g, 'const router = useRouter();');
    // navigate("/path") → router.push("/path")
    code = code.replace(/navigate\((-1)\)/g, 'router.back()');
    code = code.replace(/navigate\((`[^`]+`)\)/g, 'router.push($1)');
    code = code.replace(/navigate\(("\/[^"]*")\)/g, 'router.push($1)');
    code = code.replace(/navigate\(('\/[^']*')\)/g, 'router.push($1)');
    // Handle navigate with variable: navigate(path) → router.push(path)
    code = code.replace(/navigate\(([^)]+)\)/g, 'router.push($1)');
  }

  // Replace useLocation() → usePathname()
  if (hasLocation) {
    code = code.replace(/const\s+location\s*=\s*useLocation\(\)\s*;?/g, 'const pathname = usePathname();');
    code = code.replace(/location\.pathname/g, 'pathname');
  }

  return code;
}

function transformImportPaths(code) {
  // DashboardComponents → design-tokens
  code = code.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']\.\.\/\.\.\/components\/shared\/DashboardComponents["'];?\n?/g,
    (match, imports) => `import { ${imports.trim()} } from '@/lib/design-tokens';\n`
  );
  code = code.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']\.\.\/components\/shared\/DashboardComponents["'];?\n?/g,
    (match, imports) => `import { ${imports.trim()} } from '@/lib/design-tokens';\n`
  );

  // components/ui/ paths — replace full quoted path
  code = code.replace(/from\s*["']\.\.\/\.\.\/components\/ui\/([^"']+)["']/g, "from '@/components/ui/$1'");
  code = code.replace(/from\s*["']\.\.\/components\/ui\/([^"']+)["']/g, "from '@/components/ui/$1'");

  // components/shared/ paths
  code = code.replace(/from\s*["']\.\.\/\.\.\/components\/shared\/([^"']+)["']/g, "from '@/components/shared/$1'");
  code = code.replace(/from\s*["']\.\.\/components\/shared\/([^"']+)["']/g, "from '@/components/shared/$1'");

  // hooks
  code = code.replace(/from\s*["']\.\.\/\.\.\/hooks\/useBreakpoint["']/g, "from '@/hooks/useBreakpoint'");
  code = code.replace(/from\s*["']\.\.\/hooks\/useBreakpoint["']/g, "from '@/hooks/useBreakpoint'");
  code = code.replace(/from\s*["']\.\.\/\.\.\/hooks\/useScrollY["']/g, "from '@/hooks/useScrollY'");
  code = code.replace(/from\s*["']\.\.\/hooks\/useScrollY["']/g, "from '@/hooks/useScrollY'");

  return code;
}

function stripLayoutWrappers(code) {
  // Remove DashboardLayout import
  code = code.replace(/import\s+DashboardLayout\s+from\s*["'][^"']+["'];?\n?/g, '');
  // Remove AdminDashboardLayout import
  code = code.replace(/import\s+AdminDashboardLayout\s+from\s*["'][^"']+["'];?\n?/g, '');

  // Remove <DashboardLayout ...> and </DashboardLayout>
  code = code.replace(/<DashboardLayout[^>]*>/g, '');
  code = code.replace(/<\/DashboardLayout>/g, '');

  // Remove <AdminDashboardLayout ...> and </AdminDashboardLayout>
  code = code.replace(/<AdminDashboardLayout[^>]*>/g, '');
  code = code.replace(/<\/AdminDashboardLayout>/g, '');

  return code;
}

function replaceInlineC(code) {
  // Check if page has inline `const C = {` definition (multi-line)
  const inlineCRegex = /const C = \{[^}]+\};?\n?/g;
  if (inlineCRegex.test(code)) {
    code = code.replace(inlineCRegex, '');
    // Add import if not already present
    if (!code.includes("from '@/lib/design-tokens'")) {
      // Insert after last import or after 'use client'
      code = addImportLine(code, "import { C } from '@/lib/design-tokens';");
    } else {
      // Already importing from design-tokens, ensure C is in the import
      if (!code.match(/import\s*\{[^}]*\bC\b[^}]*\}\s*from\s*'@\/lib\/design-tokens'/)) {
        code = code.replace(
          /import\s*\{([^}]+)\}\s*from\s*'@\/lib\/design-tokens'/,
          (m, imports) => `import { C, ${imports.trim()} } from '@/lib/design-tokens'`
        );
      }
    }
  }
  return code;
}

function replaceInlineUseBreakpoint(code) {
  // Remove inline useBreakpoint function declarations
  // Pattern: function useBreakpoint() { ... return bp; }
  // This is multi-line, so we need a different approach
  const fnStartRegex = /function useBreakpoint\(\)\s*\{/;
  if (fnStartRegex.test(code)) {
    // Find the function and remove it (track braces)
    const match = code.match(fnStartRegex);
    if (match) {
      const startIdx = match.index;
      let braceCount = 0;
      let endIdx = startIdx;
      let inFunction = false;
      for (let i = startIdx; i < code.length; i++) {
        if (code[i] === '{') { braceCount++; inFunction = true; }
        if (code[i] === '}') { braceCount--; }
        if (inFunction && braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
      // Remove the function + any preceding comment line
      let removeStart = startIdx;
      // Check for preceding comment/separator line
      const preceding = code.substring(Math.max(0, startIdx - 200), startIdx);
      const lines = preceding.split('\n');
      const lastLine = lines[lines.length - 1];
      if (lastLine.trim() === '' || lastLine.trim().startsWith('//')) {
        // Also remove that line
        removeStart = startIdx - lastLine.length - 1;
        if (removeStart < 0) removeStart = 0;
      }
      code = code.substring(0, removeStart) + code.substring(endIdx);

      // Add import if not present
      if (!code.includes("from '@/hooks/useBreakpoint'")) {
        code = addImportLine(code, "import { useBreakpoint } from '@/hooks/useBreakpoint';");
      }
    }
  }
  return code;
}

function addImportLine(code, importLine) {
  // Find last import statement and add after it
  const lines = code.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].match(/^\s*import\s/)) {
      lastImportIdx = i;
    }
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine);
  } else {
    // After 'use client'
    const ucIdx = lines.findIndex(l => l.includes("'use client'") || l.includes('"use client"'));
    if (ucIdx >= 0) {
      lines.splice(ucIdx + 1, 0, '', importLine);
    } else {
      lines.unshift(importLine);
    }
  }
  return lines.join('\n');
}

function cleanupEmptyLines(code) {
  // Remove excessive blank lines (3+ → 2)
  return code.replace(/\n{4,}/g, '\n\n\n');
}

function transformFile(sourceCode) {
  let code = sourceCode;
  code = addUseClient(code);
  code = transformReactRouterImports(code);
  code = transformImportPaths(code);
  code = stripLayoutWrappers(code);
  code = replaceInlineC(code);
  code = replaceInlineUseBreakpoint(code);
  code = cleanupEmptyLines(code);
  return code;
}

// ─── LAYOUT FILES ───────────────────────────────────────────────

const LAYOUTS = {
  '(public)': `export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
`,
  '(auth)': `export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
      {children}
    </div>
  );
}
`,
  '(onboarding)': `export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
`,
  '(student)': `import DashboardTemplate from '@/components/templates/DashboardTemplate';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardTemplate>{children}</DashboardTemplate>;
}
`,
  '(institution)': `import DashboardTemplate from '@/components/templates/DashboardTemplate';

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  return <DashboardTemplate>{children}</DashboardTemplate>;
}
`,
  '(faculty-portal)': `import DashboardTemplate from '@/components/templates/DashboardTemplate';

export default function FacultyPortalLayout({ children }: { children: React.ReactNode }) {
  return <DashboardTemplate>{children}</DashboardTemplate>;
}
`,
  '(shared)': `import DashboardTemplate from '@/components/templates/DashboardTemplate';

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return <DashboardTemplate>{children}</DashboardTemplate>;
}
`,
};

// ─── MAIN ───────────────────────────────────────────────────────

console.log('Starting migration...\n');

let migrated = 0;
let skipped = 0;
let errors = [];

// Create layout files for new route groups
for (const [group, content] of Object.entries(LAYOUTS)) {
  const layoutPath = join(FRONTEND_DIR, group, 'layout.tsx');
  if (!existsSync(layoutPath)) {
    mkdirSync(dirname(layoutPath), { recursive: true });
    writeFileSync(layoutPath, content, 'utf-8');
    console.log(`  LAYOUT  ${group}/layout.tsx`);
  } else {
    console.log(`  EXISTS  ${group}/layout.tsx (keeping)`);
  }
}

console.log('');

// Migrate each page
for (const [srcRel, destRel] of ROUTE_MAP) {
  const srcPath = join(PROTO_DIR, srcRel);
  const destPath = join(FRONTEND_DIR, destRel);

  if (!existsSync(srcPath)) {
    console.log(`  MISS    ${srcRel} — source not found`);
    errors.push(`Missing: ${srcRel}`);
    continue;
  }

  // Skip if destination already exists and is not a stub
  if (existsSync(destPath)) {
    const existing = readFileSync(destPath, 'utf-8');
    // Skip existing wired pages (more than a placeholder)
    if (existing.length > 200) {
      console.log(`  SKIP    ${destRel} — already exists (${existing.length} chars)`);
      skipped++;
      continue;
    }
  }

  try {
    const source = readFileSync(srcPath, 'utf-8');
    const transformed = transformFile(source);
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, transformed, 'utf-8');
    migrated++;
    console.log(`  OK      ${srcRel} → ${destRel}`);
  } catch (err) {
    console.log(`  ERROR   ${srcRel}: ${err.message}`);
    errors.push(`${srcRel}: ${err.message}`);
  }
}

console.log(`\n━━━ DONE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  Migrated: ${migrated}`);
console.log(`  Skipped:  ${skipped}`);
console.log(`  Errors:   ${errors.length}`);
if (errors.length) {
  console.log('\nErrors:');
  errors.forEach(e => console.log(`  - ${e}`));
}
console.log('');
