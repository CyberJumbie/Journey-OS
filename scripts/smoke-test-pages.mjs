#!/usr/bin/env node
/**
 * Puppeteer smoke test — visits every frontend route and checks for render errors.
 * Starts its own Next.js dev server with SMOKE_TEST=true to bypass auth.
 *
 * Usage: node scripts/smoke-test-pages.mjs
 *        node scripts/smoke-test-pages.mjs --use-running   # skip server start, use existing on :3000
 */
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

const USE_RUNNING = process.argv.includes('--use-running');
const PORT = USE_RUNNING ? 3000 : 3099;
const BASE_URL = `http://localhost:${PORT}`;
const TIMEOUT_MS = 60_000; // 60s — dev server compiles on first visit

// All routes from frontend/src/app/**/page.tsx — dynamic segments use placeholders
const ROUTES = [
  '/',
  '/auth/email-verification',
  '/auth/forgot-password',
  '/auth/invitation/test-token',
  '/auth/persona-onboarding',
  '/auth/register',
  '/auth/register/admin',
  '/auth/register/faculty',
  '/auth/register/student',
  '/auth/role-selection',
  '/onboarding',
  '/onboarding/admin',
  '/onboarding/faculty',
  '/onboarding/student',
  '/institution-application',
  '/help',
  '/notifications',
  '/profile',
  '/settings',
  '/settings/roles',
  '/settings/system',
  '/unauthorized',
  '/admin',
  '/admin/applications',
  '/admin/data-integrity',
  '/admin/faculty',
  '/admin/frameworks',
  '/admin/fulfills-review',
  '/admin/ilos',
  '/admin/institutions',
  '/admin/institutions/test-id',
  '/admin/knowledge',
  '/admin/knowledge/test-uuid',
  '/admin/lcme-compliance-heatmap',
  '/admin/lcme-element-drill-down',
  '/admin/setup',
  '/admin/users',
  '/dashboard',
  '/analytics',
  '/analytics/blueprint',
  '/analytics/course/test-course',
  '/analytics/institutional',
  '/analytics/performance',
  '/analytics/personal',
  '/collaboration',
  '/communications/announcements',
  '/communications/hub',
  '/communications/support',
  '/courses',
  '/courses/test-course',
  '/courses/test-course/concepts/review',
  '/courses/test-course/lectures/processing',
  '/courses/test-course/lectures/upload',
  '/courses/test-course/outcomes',
  '/courses/test-course/questions',
  '/courses/test-course/ready',
  '/courses/test-course/syllabus/editor',
  '/courses/test-course/syllabus/processing',
  '/courses/test-course/syllabus/review',
  '/courses/test-course/syllabus/upload',
  '/courses/test-course/week/test-week',
  '/courses/test-course/week/test-week/upload',
  '/courses/create',
  '/exams/assembly',
  '/exams/assignment',
  '/exams/retired-upload',
  '/generation/batch/test-batch',
  '/generation/handout',
  '/generation/quiz',
  '/generation/syllabus',
  '/generation/test',
  '/generation/topic',
  '/generation/wizard',
  '/operations/bulk',
  '/questions/test-question',
  '/questions/test-question/ai-refine',
  '/questions/test-question/detail',
  '/questions/test-question/history',
  '/questions/test-question/refine',
  '/questions/review',
  '/repository',
  '/repository/browse',
  '/templates',
  '/uploads/faculty',
  '/faculty/courses',
  '/faculty/courses/test-course',
  '/faculty/courses/test-course/roster',
  '/faculty/courses/create',
  '/faculty/dashboard',
  '/faculty/quest-workbench',
  '/faculty/usmle-coverage',
  '/institution/accreditation',
  '/institution/coverage',
  '/institution/dashboard',
  '/institution/frameworks',
  '/institution/sequence-modeler',
  '/institution/users',
  '/institution/usmle-coverage',
  '/student-dashboard',
  '/student/analytics',
  '/student/practice',
  '/student/practice/session',
  '/student/progress',
  '/student/results',
  '/workbench-test',
];

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function startDevServer() {
  return new Promise((resolve, reject) => {
    console.log(`${DIM}Starting Next.js dev server on port ${PORT} with SMOKE_TEST=true...${RESET}`);

    const child = spawn('pnpm', ['--filter', 'frontend', 'exec', 'next', 'dev', '-p', String(PORT)], {
      cwd: process.cwd(),
      env: { ...process.env, SMOKE_TEST: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        reject(new Error('Dev server did not start within 60s'));
        child.kill();
      }
    }, 60_000);

    child.stdout.on('data', (data) => {
      const text = data.toString();
      if (!started && (text.includes('Ready') || text.includes('ready') || text.includes(`localhost:${PORT}`))) {
        started = true;
        clearTimeout(timeout);
        // Give it a moment to fully compile
        setTimeout(() => resolve(child), 2000);
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      if (!started && (text.includes('Ready') || text.includes('ready') || text.includes(`localhost:${PORT}`))) {
        started = true;
        clearTimeout(timeout);
        setTimeout(() => resolve(child), 2000);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function waitForServer(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (resp.ok || resp.status < 500) return;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server at ${url} not responding after ${maxRetries}s`);
}

async function main() {
  let devServer = null;

  try {
    if (!USE_RUNNING) {
      devServer = await startDevServer();
      await waitForServer(BASE_URL);
      console.log(`${GREEN}Dev server ready.${RESET}\n`);
    }

    console.log(`${CYAN}Puppeteer Smoke Test${RESET}`);
    console.log(`${DIM}Base URL: ${BASE_URL}${RESET}`);
    console.log(`${DIM}Routes to test: ${ROUTES.length}${RESET}\n`);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const results = { pass: [], fail: [], redirect: [] };

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      const page = await browser.newPage();

      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => {
        consoleErrors.push(err.message);
      });

      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: TIMEOUT_MS,
        });

        const status = response?.status() ?? 0;
        const finalUrl = page.url();
        const wasRedirected = new URL(finalUrl).pathname !== route;

        // Check for Next.js error overlay or error page
        const hasErrorOverlay = await page.evaluate(() => {
          const html = document.documentElement.id;
          return (
            html === '__next_error__' ||
            !!document.querySelector('nextjs-portal') ||
            !!document.querySelector('[data-nextjs-dialog]') ||
            !!document.getElementById('__next-build-error') ||
            !!document.querySelector('body')?.innerText?.includes('Unhandled Runtime Error') ||
            !!document.querySelector('body')?.innerText?.includes('Application error: a client-side exception has occurred')
          );
        });

        const bodyText = await page.evaluate(() => document.body?.innerText?.trim() || '');
        const isBlank = bodyText.length === 0;

        const realErrors = consoleErrors.filter(
          (e) =>
            !e.includes('favicon') &&
            !e.includes('Failed to load resource') &&
            !e.includes('net::ERR') &&
            !e.includes('hydration')
        );

        if (status >= 500 || hasErrorOverlay) {
          results.fail.push({ route, reason: status >= 500 ? `HTTP ${status}` : 'Error overlay', consoleErrors: realErrors });
          console.log(`  ${RED}FAIL${RESET} ${route} — ${status >= 500 ? `HTTP ${status}` : 'Error overlay'}`);
        } else if (isBlank && !wasRedirected) {
          results.fail.push({ route, reason: 'Blank page', consoleErrors: realErrors });
          console.log(`  ${RED}FAIL${RESET} ${route} — Blank page`);
        } else if (wasRedirected) {
          const redirectPath = new URL(finalUrl).pathname;
          results.redirect.push({ route, redirectedTo: redirectPath, status });
          console.log(`  ${YELLOW}REDIRECT${RESET} ${route} → ${redirectPath}`);
        } else {
          results.pass.push({ route, status });
          console.log(`  ${GREEN}PASS${RESET} ${route} ${DIM}(${status})${RESET}`);
        }
      } catch (err) {
        results.fail.push({ route, reason: err.message });
        console.log(`  ${RED}FAIL${RESET} ${route} — ${err.message.slice(0, 100)}`);
      } finally {
        await page.close();
      }
    }

    await browser.close();

    // Summary
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${GREEN}PASS: ${results.pass.length}${RESET}  ${YELLOW}REDIRECT: ${results.redirect.length}${RESET}  ${RED}FAIL: ${results.fail.length}${RESET}  Total: ${ROUTES.length}`);

    if (results.fail.length > 0) {
      console.log(`\n${RED}Failed routes:${RESET}`);
      for (const f of results.fail) {
        console.log(`  ${f.route} — ${f.reason}`);
        if (f.consoleErrors?.length) {
          for (const e of f.consoleErrors.slice(0, 3)) {
            console.log(`    ${DIM}${e.slice(0, 120)}${RESET}`);
          }
        }
      }
    }

    if (results.redirect.length > 0) {
      console.log(`\n${YELLOW}Redirected routes:${RESET}`);
      for (const r of results.redirect) {
        console.log(`  ${r.route} → ${r.redirectedTo}`);
      }
    }

    console.log('');
    process.exit(results.fail.length > 0 ? 1 : 0);
  } finally {
    if (devServer) {
      devServer.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(2);
});
