"""End-to-end test: CTALink focus restoration on browser Back/Forward.

Run locally:  python3 e2e/cta_focus_restoration.py
CI:           .github/workflows/e2e.yml starts the dev server and runs this.
Override URL: BASE_URL=http://localhost:3000 python3 e2e/cta_focus_restoration.py
"""
import asyncio, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BROWSER = os.environ.get("BROWSER", "chromium").lower()
if BROWSER not in ("chromium", "firefox", "webkit"):
    print(f"Unknown BROWSER={BROWSER!r}; expected chromium|firefox|webkit")
    sys.exit(2)

SHOTS = Path(__file__).parent / "shots" / BROWSER
SHOTS.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")

# Debug artifacts: trace + console log written to shots/<browser>/.
TRACE_PATH = SHOTS / "trace.zip"
CONSOLE_LOG_PATH = SHOTS / "console.log"
NETWORK_LOG_PATH = SHOTS / "network-failures.log"
# KEEP_TRACE=always (default: only on failure) to always keep trace.zip.
KEEP_TRACE = os.environ.get("KEEP_TRACE", "on-failure").lower()


async def main():
    failures = []
    def check(cond, msg):
        print(("PASS" if cond else "FAIL") + ": " + msg)
        if not cond: failures.append(msg)

    console_lines = []
    network_failures = []

    async with async_playwright() as pw:
        browser_type = getattr(pw, BROWSER)
        print(f"Launching {BROWSER} against {BASE}")
        browser = await browser_type.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})

        # Full Playwright trace: screenshots per action, DOM snapshots, sources.
        await ctx.tracing.start(screenshots=True, snapshots=True, sources=True)

        page = await ctx.new_page()

        # Capture every console message with type + text + location.
        def on_console(msg):
            loc = msg.location or {}
            where = f"{loc.get('url','?')}:{loc.get('lineNumber','?')}"
            console_lines.append(f"[{msg.type}] {msg.text}  @ {where}")
        page.on("console", on_console)

        # Capture uncaught page errors.
        page.on("pageerror", lambda err: console_lines.append(f"[pageerror] {err}"))

        # Capture failed requests (network errors, 4xx/5xx responses).
        def on_requestfailed(req):
            network_failures.append(f"FAILED {req.method} {req.url} — {req.failure}")
        def on_response(resp):
            if resp.status >= 400:
                network_failures.append(f"HTTP {resp.status} {resp.request.method} {resp.url}")
        page.on("requestfailed", on_requestfailed)
        page.on("response", on_response)



        async def live_regions():
            """Return the trimmed text of every polite/status aria-live region.

            Both RouteAnnouncer (page-level) and each CTALink render a
            role="status" aria-live="polite" node — this reads them all so
            we can assert whichever one the change landed in.
            """
            return await page.evaluate("""
              () => Array.from(
                document.querySelectorAll(
                  '[role="status"][aria-live="polite"], [aria-live="polite"][role="status"]'
                )
              ).map(n => (n.textContent || '').trim()).filter(Boolean)
            """)


        # 1. Home
        await page.goto(BASE + "/", wait_until="networkidle")
        await page.wait_for_selector('a[data-focus-id="cta:/apply"]')
        ctas = await page.locator('a[data-focus-id="cta:/apply"]').all()
        print(f"Found {len(ctas)} '/apply' CTAs on home")
        check(len(ctas) >= 1, "at least one Apply Now CTA on home")

        hero_cta = page.locator('a[data-focus-id="cta:/apply"]').first
        await hero_cta.scroll_into_view_if_needed()
        # Focus via keyboard to mimic a real keyboard user
        await hero_cta.focus()
        focused_id_before = await page.evaluate(
            "() => document.activeElement && document.activeElement.getAttribute('data-focus-id')"
        )
        check(focused_id_before == "cta:/apply", f"hero CTA focused before nav (got {focused_id_before!r})")
        await page.screenshot(path=str(SHOTS / "1_home_focused.png"))

        # 2. Click → /apply
        await hero_cta.click()
        await page.wait_for_url("**/apply", timeout=10000)
        await page.wait_for_load_state("networkidle")
        check("/apply" in page.url, f"navigated to /apply (url={page.url})")
        await page.screenshot(path=str(SHOTS / "2_apply.png"))

        # 3. Back
        await page.go_back(wait_until="networkidle")
        # Give RouteAnnouncer's ~80ms setTimeout time to restore focus
        await page.wait_for_timeout(400)
        check(page.url.rstrip("/") == BASE, f"back to home (url={page.url})")

        restored = await page.evaluate("""
          () => {
            const el = document.activeElement;
            return {
              tag: el && el.tagName,
              focusId: el && el.getAttribute && el.getAttribute('data-focus-id'),
              text: el && el.textContent && el.textContent.trim().slice(0, 40),
            };
          }
        """)
        print("activeElement after back:", restored)
        check(restored["focusId"] == "cta:/apply", "focus restored to previously activated CTA after Back")

        # 3a. Assert the polite live region announced the restoration.
        messages_back = await live_regions()
        print("live regions after back:", messages_back)
        restore_msg = next((m for m in messages_back if "returned to previous control" in m.lower()), None)
        check(
            restore_msg is not None,
            f"polite live region announces 'returned to previous control' (got {messages_back!r})",
        )
        await page.screenshot(path=str(SHOTS / "3_back_restored.png"))


        # 4. Forward → /apply, focus should NOT restore to hero (one-shot consume)
        await page.go_forward(wait_until="networkidle")
        await page.wait_for_timeout(400)
        check("/apply" in page.url, "forward to /apply")
        active_on_apply = await page.evaluate(
            "() => document.activeElement && (document.activeElement.id || document.activeElement.tagName)"
        )
        print("activeElement on /apply after forward:", active_on_apply)
        # Should be main landmark or body, not a data-focus-id CTA on home
        after_focus_id = await page.evaluate(
            "() => document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-focus-id')"
        )
        check(after_focus_id is None, f"forward nav does not carry stale focus (got focusId={after_focus_id!r})")

        # 4a. Forward nav (no stored focus) should announce plain "page loaded",
        # NOT "returned to previous control".
        messages_forward = await live_regions()
        print("live regions after forward:", messages_forward)
        forward_msg = next((m for m in messages_forward if "page loaded" in m.lower()), None)
        check(
            forward_msg is not None,
            f"polite live region announces 'page loaded' on forward nav (got {messages_forward!r})",
        )
        check(
            not any("returned to previous control" in m.lower() for m in messages_forward),
            f"forward nav must NOT announce restoration (got {messages_forward!r})",
        )


        # 5. Back again — memory was consumed, focus should fall back to <main>
        await page.go_back(wait_until="networkidle")
        await page.wait_for_timeout(400)
        second_back = await page.evaluate("""
          () => {
            const el = document.activeElement;
            return {
              id: el && el.id,
              focusId: el && el.getAttribute && el.getAttribute('data-focus-id'),
              tag: el && el.tagName,
            };
          }
        """)
        print("activeElement after 2nd back:", second_back)
        check(second_back["focusId"] is None, "one-shot: 2nd back does not re-restore CTA")
        check(second_back["id"] == "main-content" or second_back["tag"] == "MAIN",
              f"fallback focus lands on <main> (got {second_back})")

        # 5a. Fallback path should announce plain "page loaded", not restoration.
        messages_second_back = await live_regions()
        print("live regions after 2nd back:", messages_second_back)
        check(
            any("page loaded" in m.lower() for m in messages_second_back),
            f"fallback nav announces 'page loaded' (got {messages_second_back!r})",
        )
        check(
            not any("returned to previous control" in m.lower() for m in messages_second_back),
            f"fallback nav must NOT claim restoration (got {messages_second_back!r})",
        )
        await page.screenshot(path=str(SHOTS / "4_second_back.png"))


        # 6. Test a distinct CTA — Browse Tenders — round-trip
        browse = page.locator('a[data-focus-id="cta:/tenders"]').first
        await browse.scroll_into_view_if_needed()
        await browse.focus()
        await browse.click()
        await page.wait_for_function("() => location.pathname.indexOf('/tenders') === 0", timeout=10000)
        await page.wait_for_load_state("networkidle")
        await page.go_back(wait_until="networkidle")
        await page.wait_for_timeout(400)
        restored2 = await page.evaluate(
            "() => document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-focus-id')"
        )
        print("activeElement after Browse round-trip:", restored2)
        check(restored2 == "cta:/tenders", "focus restored to Browse Tenders CTA after Back")

        # 6a. And the polite region announced this second restoration too.
        messages_browse_back = await live_regions()
        print("live regions after browse back:", messages_browse_back)
        check(
            any("returned to previous control" in m.lower() for m in messages_browse_back),
            f"polite live region announces restoration on 2nd round-trip (got {messages_browse_back!r})",
        )
        await page.screenshot(path=str(SHOTS / "5_browse_restored.png"))


        # 7. Keyboard-only flow: Tab to a CTA, press Enter, then Back/Forward.
        # Mirrors a real keyboard / screen-reader user — no mouse click.
        await page.goto(BASE + "/", wait_until="networkidle")
        await page.wait_for_selector('a[data-focus-id="cta:/apply"]')
        # Reset focus so Tab order is deterministic from the top of the doc.
        await page.evaluate(
            "() => { document.activeElement && document.activeElement.blur(); document.body.focus(); }"
        )

        target_id = "cta:/apply"
        max_tabs = 40
        landed = False
        for i in range(max_tabs):
            await page.keyboard.press("Tab")
            current = await page.evaluate(
                "() => document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-focus-id')"
            )
            if current == target_id:
                landed = True
                print(f"Tab landed on {target_id} after {i+1} presses")
                break
        check(landed, f"keyboard Tab reaches {target_id} within {max_tabs} presses")
        await page.screenshot(path=str(SHOTS / "6_kbd_focused.png"))

        # Activate with Enter (native anchor activation).
        await page.keyboard.press("Enter")
        await page.wait_for_url("**/apply", timeout=10000)
        await page.wait_for_load_state("networkidle")
        check("/apply" in page.url, f"keyboard Enter navigated to /apply (url={page.url})")
        await page.screenshot(path=str(SHOTS / "7_kbd_apply.png"))

        # Back — focus should restore to the keyboard-activated CTA.
        await page.go_back(wait_until="networkidle")
        await page.wait_for_timeout(400)
        kbd_restored = await page.evaluate(
            "() => document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-focus-id')"
        )
        print("activeElement after keyboard Back:", kbd_restored)
        check(kbd_restored == "cta:/apply", "focus restored to keyboard-activated CTA after Back")

        kbd_msgs_back = await live_regions()
        print("live regions after keyboard back:", kbd_msgs_back)
        check(
            any("returned to previous control" in m.lower() for m in kbd_msgs_back),
            f"polite region announces restoration after keyboard Back (got {kbd_msgs_back!r})",
        )
        await page.screenshot(path=str(SHOTS / "8_kbd_back_restored.png"))

        # The restored element must be immediately usable: pressing Enter again
        # (no extra Tab) should re-navigate to /apply.
        await page.keyboard.press("Enter")
        await page.wait_for_url("**/apply", timeout=10000)
        check("/apply" in page.url, "Enter on restored focus re-activates the CTA")

        # Forward path: go back to home, then forward to /apply, and confirm
        # no stale CTA focus is carried and the region says "page loaded".
        await page.go_back(wait_until="networkidle")
        await page.wait_for_timeout(400)
        await page.go_forward(wait_until="networkidle")
        await page.wait_for_timeout(400)
        check("/apply" in page.url, f"keyboard forward reached /apply (url={page.url})")
        fwd_focus_id = await page.evaluate(
            "() => document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-focus-id')"
        )
        check(fwd_focus_id is None, f"keyboard Forward carries no stale CTA focus (got {fwd_focus_id!r})")
        kbd_msgs_fwd = await live_regions()
        print("live regions after keyboard forward:", kbd_msgs_fwd)
        check(
            any("page loaded" in m.lower() for m in kbd_msgs_fwd),
            f"keyboard Forward announces 'page loaded' (got {kbd_msgs_fwd!r})",
        )
        check(
            not any("returned to previous control" in m.lower() for m in kbd_msgs_fwd),
            f"keyboard Forward must NOT announce restoration (got {kbd_msgs_fwd!r})",
        )
        await page.screenshot(path=str(SHOTS / "9_kbd_forward.png"))

        # --- Always-on cleanup: stop trace and dump debug logs. ---
        try:
            await ctx.tracing.stop(path=str(TRACE_PATH))
            print(f"trace written: {TRACE_PATH}")
        except Exception as e:
            print(f"tracing.stop failed: {e}")

        CONSOLE_LOG_PATH.write_text(
            "\n".join(console_lines) if console_lines else "(no console messages)"
        )
        NETWORK_LOG_PATH.write_text(
            "\n".join(network_failures) if network_failures else "(no failed requests)"
        )
        print(f"console log ({len(console_lines)} lines): {CONSOLE_LOG_PATH}")
        print(f"network failures ({len(network_failures)}): {NETWORK_LOG_PATH}")

        # Keep trace only on failure by default; KEEP_TRACE=always keeps it either way.
        if KEEP_TRACE != "always" and not failures and TRACE_PATH.exists():
            TRACE_PATH.unlink()
            print("trace discarded (all assertions passed; set KEEP_TRACE=always to retain)")

        await browser.close()

    print(f"\n=== SUMMARY ({BROWSER}) ===")
    if failures:
        print(f"{len(failures)} FAILURE(S) on {BROWSER}:")
        for f in failures: print(" -", f)
        print(f"\nDebug artifacts under {SHOTS}/:")
        print("  - trace.zip           (open with: playwright show-trace trace.zip)")
        print("  - console.log         (browser console + page errors)")
        print("  - network-failures.log")
        print("  - *.png               (per-step screenshots)")
        sys.exit(1)
    print(f"All focus-restoration E2E assertions passed on {BROWSER}.")


asyncio.run(main())

