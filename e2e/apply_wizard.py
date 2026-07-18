"""E2E: Apply wizard — step navigation, validation, Back/Continue buttons.

Run locally:  python3 e2e/apply_wizard.py
"""
import asyncio, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BROWSER = os.environ.get("BROWSER", "chromium").lower()
if BROWSER not in ("chromium", "firefox", "webkit"):
    print(f"Unknown BROWSER={BROWSER!r}"); sys.exit(2)

BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
SHOTS = Path(__file__).parent / "shots" / BROWSER / "apply"
SHOTS.mkdir(parents=True, exist_ok=True)


async def main():
    failures = []
    def check(cond, msg):
        print(("PASS" if cond else "FAIL") + ": " + msg)
        if not cond: failures.append(msg)

    console_lines = []
    async with async_playwright() as pw:
        browser = await getattr(pw, BROWSER).launch(headless=True)
        # Fresh context: no localStorage from a previous run
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        page.on("console", lambda m: console_lines.append(f"[{m.type}] {m.text}"))
        page.on("pageerror", lambda e: console_lines.append(f"[pageerror] {e}"))

        # Wipe any persisted wizard state before load
        await page.goto(BASE + "/apply", wait_until="networkidle")
        await page.evaluate(
            "() => { try { localStorage.removeItem('ept_apply_wizard_v1'); } catch(e){} }"
        )
        await page.reload(wait_until="networkidle")
        await page.wait_for_selector("#fullName", timeout=10000)

        # ---- Step indicator + Back disabled on step 1
        body = (await page.locator("body").inner_text()).replace("\n", " ")
        check("step 1 of 7" in body.lower(), f"progress reads 'Step 1 of 7' (found: {body[:200]!r})")

        back_btn = page.get_by_role("button", name="Back")
        continue_btn = page.get_by_role("button", name="Continue")
        check(await back_btn.count() >= 1, "Back button present")
        check(await continue_btn.count() >= 1, "Continue button present")
        check(await back_btn.first.is_disabled(), "Back is disabled on step 1")
        await page.screenshot(path=str(SHOTS / "1_step1.png"))

        # ---- Empty Continue → validation keeps us on step 1
        await continue_btn.first.click()
        await page.wait_for_timeout(300)
        body2 = (await page.locator("body").inner_text()).replace("\n", " ")
        check("step 1 of 7" in body2.lower(), "empty Continue stays on step 1")
        # Some field-level error visible
        errors = await page.locator("p.text-destructive, .text-destructive").count()
        check(errors > 0, f"validation error(s) shown ({errors})")
        await page.screenshot(path=str(SHOTS / "2_step1_errors.png"))

        # ---- Fill valid step 1 → advance to step 2
        await page.fill("#fullName", "Test User")
        await page.fill("#mobile", "9999900000")
        await page.fill("#email", "test.user@example.com")
        await page.fill("#companyName", "Acme Traders Pvt Ltd")
        await continue_btn.first.click()
        # wait for step 2 marker
        for _ in range(20):
            await page.wait_for_timeout(150)
            b = (await page.locator("body").inner_text()).replace("\n", " ")
            if "step 2 of 7" in b.lower(): break
        check("step 2 of 7" in b.lower(), f"advanced to step 2 (got: {b[:200]!r})")
        await page.screenshot(path=str(SHOTS / "3_step2.png"))

        # Back button now enabled + returns to step 1 with data retained
        back_btn = page.get_by_role("button", name="Back")
        check(not await back_btn.first.is_disabled(), "Back enabled on step 2")
        await back_btn.first.click()
        await page.wait_for_timeout(300)
        b3 = (await page.locator("body").inner_text()).replace("\n", " ")
        check("step 1 of 7" in b3.lower(), "Back returns to step 1")
        full = await page.input_value("#fullName")
        check(full == "Test User", f"step 1 data retained on Back (got {full!r})")
        await page.screenshot(path=str(SHOTS / "4_back_to_step1.png"))

        # ---- No uncaught page errors
        page_errors = [l for l in console_lines if l.startswith("[pageerror]")]
        check(not page_errors, f"no uncaught page errors ({page_errors!r})")

        await browser.close()

    print(f"\n=== SUMMARY apply_wizard ({BROWSER}) ===")
    if failures:
        for f in failures: print(" -", f)
        sys.exit(1)
    print("All apply-wizard E2E assertions passed.")


asyncio.run(main())
