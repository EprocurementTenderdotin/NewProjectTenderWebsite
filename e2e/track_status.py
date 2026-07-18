"""E2E: Track Status page — form validation & error states.

Run locally:  python3 e2e/track_status.py
Override URL: BASE_URL=http://localhost:8080 python3 e2e/track_status.py
"""
import asyncio, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BROWSER = os.environ.get("BROWSER", "chromium").lower()
if BROWSER not in ("chromium", "firefox", "webkit"):
    print(f"Unknown BROWSER={BROWSER!r}"); sys.exit(2)

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
SHOTS = Path(__file__).parent / "shots" / BROWSER / "track"
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

        # ---- Load
        await page.goto(BASE + "/track", wait_until="networkidle")
        await page.wait_for_selector("#appId")
        await page.wait_for_selector("#mobile")
        submit = page.get_by_role("button", name="Track Status")
        check(await submit.count() >= 1, "Track Status submit button present")
        await page.screenshot(path=str(SHOTS / "1_loaded.png"))

        # ---- Empty submit → invalid message
        await submit.first.click()
        await page.wait_for_timeout(400)
        alert = page.locator('[role="alert"]').first
        check(await alert.count() >= 1, "empty submit surfaces an alert")
        text_empty = (await alert.inner_text()).lower() if await alert.count() else ""
        check("check your details" in text_empty or "must look like" in text_empty,
              f"empty submit shows validation message (got: {text_empty[:120]!r})")
        await page.screenshot(path=str(SHOTS / "2_empty_submit.png"))

        # ---- Invalid app ID format
        await page.fill("#appId", "notanid")
        await page.fill("#mobile", "12345")
        await submit.first.click()
        await page.wait_for_timeout(400)
        text_invalid = (await page.locator('[role="alert"]').first.inner_text()).lower()
        check("must look like" in text_invalid or "check your details" in text_invalid,
              f"invalid format shows validation message (got: {text_invalid[:120]!r})")
        await page.screenshot(path=str(SHOTS / "3_invalid_format.png"))

        # ---- Field normalization: app ID uppercases, mobile digits-only
        await page.fill("#appId", "")
        await page.fill("#mobile", "")
        await page.type("#appId", "ept-2099-99999")
        await page.type("#mobile", "9a8b7c6d5e4f3g2h1i0j")
        app_val = await page.input_value("#appId")
        mob_val = await page.input_value("#mobile")
        check(app_val == "EPT-2099-99999", f"Application ID auto-uppercased (got {app_val!r})")
        check(mob_val.isdigit() and len(mob_val) == 10,
              f"Mobile stripped to 10 digits (got {mob_val!r})")

        # ---- Valid-format but non-existent → 'not found' message
        await submit.first.click()
        # Wait for the RPC round-trip (be generous for cold networks in CI)
        await page.wait_for_timeout(3500)
        alert_text = (await page.locator('[role="alert"]').first.inner_text()).lower()
        check("couldn't find" in alert_text or "no application" in alert_text,
              f"non-existent id shows not-found message (got: {alert_text[:160]!r})")
        await page.screenshot(path=str(SHOTS / "4_not_found.png"))

        # ---- No uncaught page errors
        page_errors = [l for l in console_lines if l.startswith("[pageerror]")]
        check(not page_errors, f"no uncaught page errors ({page_errors!r})")

        await browser.close()

    print(f"\n=== SUMMARY track_status ({BROWSER}) ===")
    if failures:
        for f in failures: print(" -", f)
        sys.exit(1)
    print("All track-status E2E assertions passed.")


asyncio.run(main())
