import puppeteer from "puppeteer";

const BASE = "http://localhost:3000";
const CREDS = { email: "admin@journey-os.com", password: "TestPassword123!" };

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function screenshot(page, name) {
  const path = `/tmp/e2e-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`  📸 Screenshot: ${path}`);
}

async function dismissErrorOverlay(page) {
  // Next.js error overlay can block interaction — try to dismiss or hide it
  await page.evaluate(() => {
    // Hide Next.js error overlay if present
    const overlay = document.querySelector("nextjs-portal");
    if (overlay) overlay.remove();
    // Also try the shadow DOM approach
    document.querySelectorAll("[data-nextjs-dialog-overlay]").forEach((el) => el.remove());
    document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
  }).catch(() => {});
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const errors = [];
  const consoleErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Skip CSS-related errors (pre-existing tw-animate-css issue)
      if (!text.includes("globals.css") && !text.includes("tw-animate")) {
        consoleErrors.push(text);
      }
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
  });

  // ─── FLOW 1: Team Login ───
  console.log("\n═══ FLOW 1: Team Login (/team) ═══");
  try {
    await page.goto(`${BASE}/team`, { waitUntil: "networkidle2", timeout: 15000 });
    await sleep(1000);
    await dismissErrorOverlay(page);
    console.log("  ✅ /team page loaded");
    await screenshot(page, "01-team-login");

    // Wait for the input to be available
    await page.waitForSelector("#team-email", { timeout: 5000 });
    await page.type("#team-email", CREDS.email);
    await page.type("#team-password", CREDS.password);
    console.log("  ✅ Credentials entered");

    // Submit
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);

    await sleep(2000);
    await dismissErrorOverlay(page);
    const postLoginUrl = page.url();
    console.log(`  → Redirected to: ${postLoginUrl}`);
    await screenshot(page, "02-post-login");

    if (postLoginUrl.includes("/admin")) {
      console.log("  ✅ Successfully redirected to /admin");
    } else if (postLoginUrl.includes("/team")) {
      const errorText = await page.evaluate(() => {
        const ps = document.querySelectorAll("p");
        for (const p of ps) {
          if (p.style?.color === "#c9282d" || p.textContent?.includes("Invalid") || p.textContent?.includes("restricted")) {
            return p.textContent;
          }
        }
        return "";
      });
      console.log(`  ❌ Login failed — still on /team. Error: ${errorText}`);
      errors.push(`Login failed: ${errorText}`);
    } else {
      console.log(`  ⚠️  Unexpected redirect: ${postLoginUrl}`);
      errors.push(`Unexpected post-login URL: ${postLoginUrl}`);
    }
  } catch (err) {
    console.log(`  ❌ Flow 1 error: ${err.message}`);
    errors.push(`Team login: ${err.message}`);
    await screenshot(page, "01-error");
  }

  // ─── FLOW 2: Applications Page ───
  console.log("\n═══ FLOW 2: Applications (/admin/applications) ═══");
  try {
    await page.goto(`${BASE}/admin/applications`, { waitUntil: "networkidle2", timeout: 15000 });
    await sleep(2000);
    await dismissErrorOverlay(page);
    const appUrl = page.url();
    console.log(`  → Current URL: ${appUrl}`);
    await screenshot(page, "03-applications");

    if (appUrl.includes("/login") || appUrl.includes("/team")) {
      console.log("  ❌ Redirected to login — not authenticated");
      errors.push("Applications: redirected to login, auth not persisting");
    } else if (appUrl.includes("/unauthorized")) {
      console.log("  ❌ Redirected to /unauthorized — role check failing");
      errors.push("Applications: unauthorized redirect, role check failing");
    } else {
      console.log("  ✅ Applications page loaded");

      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes("Authorization header must use Bearer scheme")) {
        console.log("  ❌ API auth error: Authorization header must use Bearer scheme");
        errors.push("Applications: Bearer scheme auth error persists");
      } else if (bodyText.toLowerCase().includes("error")) {
        const errorLines = bodyText.split("\n").filter((l) => l.toLowerCase().includes("error"));
        console.log(`  ⚠️  Page contains error text: ${errorLines[0]?.substring(0, 100)}`);
      }

      const hasTable = await page.$("table").then((el) => !!el);
      console.log(`  → Has table: ${hasTable}`);
    }
  } catch (err) {
    console.log(`  ❌ Flow 2 error: ${err.message}`);
    errors.push(`Applications: ${err.message}`);
    await screenshot(page, "03-error");
  }

  // ─── FLOW 3: Institutions Page ───
  console.log("\n═══ FLOW 3: Institutions (/admin/institutions) ═══");
  try {
    await page.goto(`${BASE}/admin/institutions`, { waitUntil: "networkidle2", timeout: 15000 });
    await sleep(2000);
    await dismissErrorOverlay(page);
    const instUrl = page.url();
    console.log(`  → Current URL: ${instUrl}`);
    await screenshot(page, "04-institutions");

    if (instUrl.includes("/login") || instUrl.includes("/unauthorized")) {
      console.log(`  ❌ Redirected away: ${instUrl}`);
      errors.push(`Institutions: redirected to ${instUrl}`);
    } else {
      console.log("  ✅ Institutions page loaded");
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes("Authorization header must use Bearer scheme")) {
        console.log("  ❌ API auth error persists");
        errors.push("Institutions: Bearer scheme auth error persists");
      }
    }
  } catch (err) {
    console.log(`  ❌ Flow 3 error: ${err.message}`);
    errors.push(`Institutions: ${err.message}`);
    await screenshot(page, "04-error");
  }

  // ─── FLOW 4: Users Page ───
  console.log("\n═══ FLOW 4: Users (/admin/users) ═══");
  try {
    await page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle2", timeout: 15000 });
    await sleep(2000);
    await dismissErrorOverlay(page);
    const usersUrl = page.url();
    console.log(`  → Current URL: ${usersUrl}`);
    await screenshot(page, "05-users");

    if (usersUrl.includes("/login") || usersUrl.includes("/unauthorized")) {
      console.log(`  ❌ Redirected away: ${usersUrl}`);
      errors.push(`Users: redirected to ${usersUrl}`);
    } else {
      console.log("  ✅ Users page loaded");
      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes("Authorization header must use Bearer scheme")) {
        console.log("  ❌ API auth error persists");
        errors.push("Users: Bearer scheme auth error persists");
      }
    }
  } catch (err) {
    console.log(`  ❌ Flow 4 error: ${err.message}`);
    errors.push(`Users: ${err.message}`);
    await screenshot(page, "05-error");
  }

  // ─── Summary ───
  console.log("\n═══════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════");

  if (consoleErrors.length > 0) {
    console.log(`\n  🔴 Console errors (${consoleErrors.length}):`);
    for (const e of consoleErrors.slice(0, 10)) {
      console.log(`    - ${e.substring(0, 200)}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n  ❌ Flow errors (${errors.length}):`);
    for (const e of errors) {
      console.log(`    - ${e}`);
    }
  } else {
    console.log("\n  ✅ All flows passed!");
  }

  console.log("\n  Screenshots saved to /tmp/e2e-*.png");

  await browser.close();
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
