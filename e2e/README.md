# End-to-end tests

Real-browser Playwright checks that run against the built app.

## Run locally

```bash
# 1. Start the dev server (in another terminal)
bun run dev

# 2. Install python deps once
python3 -m pip install --user playwright
python3 -m playwright install --with-deps chromium

# 3. Run
python3 e2e/cta_focus_restoration.py
```

Set `BASE_URL` to point at a different origin (e.g. a preview build):

```bash
BASE_URL=http://localhost:4173 python3 e2e/cta_focus_restoration.py
```

## What's covered

- `cta_focus_restoration.py` — verifies that `CTALink` restores focus to the
  previously activated CTA after browser Back, does not carry stale focus on
  Forward, and falls back to `<main>` when memory is consumed.
- `track_status.py` — Track page: empty submit → validation alert, invalid
  format → validation alert, field normalization (uppercase app ID, digits-only
  mobile), valid-format-but-non-existent ID → "not found" alert, no uncaught
  page errors.
- `apply_wizard.py` — Apply wizard: Back disabled on step 1, empty Continue
  keeps you on step 1 with visible errors, filled step 1 advances to step 2,
  Back returns to step 1 with data retained.
- `admin_dashboard.py` — Admin: `/admin` and `/admin/applications` redirect
  unauthenticated users to `/admin/login`; login form has masked password and
  Sign in button; bad credentials show a toast and keep the user on `/admin/login`.

Screenshots for each step land in `e2e/shots/` (git-ignored).

## CI

`.github/workflows/e2e.yml` runs these on every pull request.
