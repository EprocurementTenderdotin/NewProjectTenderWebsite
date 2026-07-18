"""E2E: Admin dashboard — auth gate, login form, invalid credentials.

Run locally:  python3 e2e/admin_dashboard.py
"""
import asyncio, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BROWSER = os.environ.get("BROWSER", "chromium").lower()
if BROWSER not in ("chromium", "firefox", "webkit"):
    print(f"Unknown BROWSER={BROWSER!r}"); sys.exit(2)

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
SHOTS = Path(__file__).parent / "shots" / BROWSER / "admin"
SHOTS.mkdir(parents=True, exist_ok=True)


async def main():
    failures = []
    def check(cond, msg):
        print(("PASS" if cond else "FAIL") + ": " + msg)
        if not cond: failures.append(msg)

    console_lines = []
    async with async_playwright() as pw:
        browser = await getattr(pw, BROWSER).launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        page.on("console", lambda m: console_lines.append(f"[{m.type}] {m.text}"))
        page.on("pageerror", lambda e: console_lines.append(f"[pageerror] {e}"))

        # ---- Unauthenticated /admin should redirect to /admin/login
        await page.goto(BASE + "/admin", wait_until="networkidle")
        # Auth check is async — wait for the redirect to settle
        for _ in range(30):
            if "/admin/login" in page.url: break
            await page.wait_for_timeout(200)
        check("/admin/login" in page.url,
              f"unauthenticated /admin redirects to /admin/login (url={page.url})")
        await page.screenshot(path=str(SHOTS / "1_redirect_login.png"))

        # ---- Login form shape
        await page.wait_for_selector("#email")
        await page.wait_for_selector("#password")
        signin = page.get_by_role("button", name="Sign in")
        check(await signin.count() >= 1, "Sign in button present")
        # Email field is type=email; password field is type=password
        email_type = await page.get_attribute("#email", "type")
        pw_type = await page.get_attribute("#password", "type")
        check(email_type == "email", f"email input has type=email (got {email_type!r})")
        check(pw_type == "password", f"password input is masked (got {pw_type!r})")

        # ---- HTML5 required prevents empty submit
        await signin.first.click()
        await page.wait_for_timeout(300)
        check("/admin/login" in page.url,
              f"empty submit stays on login (url={page.url})")

        # ---- Invalid credentials → toast error, stays on login, no redirect to /admin
        await page.fill("#email", "not-an-admin@example.com")
        await page.fill("#password", "definitely-wrong-password-xyz")
        await signin.first.click()
        # Wait for either a toast or the button to re-enable (auth call finished)
        toast_appeared = False
        for _ in range(40):
            await page.wait_for_timeout(200)
            toast_ct = await page.locator('[data-sonner-toast], [role="status"]').count()
            if toast_ct > 0:
                toast_appeared = True
                break
        check("/admin/login" in page.url,
              f"invalid credentials stay on login (url={page.url})")
        check(toast_appeared, "an error toast/status appeared after bad credentials")
        await page.screenshot(path=str(SHOTS / "2_invalid_creds.png"))

        # ---- /admin still gated after failed attempt
        await page.goto(BASE + "/admin/applications", wait_until="networkidle")
        for _ in range(30):
            if "/admin/login" in page.url: break
            await page.wait_for_timeout(200)
        check("/admin/login" in page.url,
              f"/admin/applications also gated (url={page.url})")
        await page.screenshot(path=str(SHOTS / "3_apps_gated.png"))

        # ---- No uncaught page errors
        page_errors = [l for l in console_lines if l.startswith("[pageerror]")]
        check(not page_errors, f"no uncaught page errors ({page_errors!r})")

        await browser.close()

    print(f"\n=== SUMMARY admin_dashboard ({BROWSER}) ===")
    if failures:
        for f in failures: print(" -", f)
        sys.exit(1)
    print("All admin-dashboard E2E assertions passed.")


asyncio.run(main())
