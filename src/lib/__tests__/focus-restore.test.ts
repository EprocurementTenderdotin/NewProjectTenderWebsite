// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeFocus,
  focusById,
  peekFocus,
  rememberFocus,
} from "@/lib/focus-restore";

/**
 * These tests simulate the full "click a CTA → navigate → press back →
 * focus is restored" lifecycle without booting React or TanStack Router.
 * The behavior under test is the contract between CTALink (which calls
 * rememberFocus on click) and RouteAnnouncer (which calls
 * consumeFocus + focusById after navigation).
 */

function setHistoryKey(key: string) {
  // Model TanStack Router's per-entry key living on history.state.
  window.history.replaceState({ key }, "", window.location.href);
}

function mountCTA(focusId: string, label = "Apply Now"): HTMLAnchorElement {
  const a = document.createElement("a");
  a.setAttribute("href", "/apply");
  a.setAttribute("data-focus-id", focusId);
  a.textContent = label;
  document.body.appendChild(a);
  return a;
}

beforeEach(() => {
  document.body.innerHTML = "";
  window.sessionStorage.clear();
  setHistoryKey("home-key");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("focus-restore module", () => {
  it("remembers and consumes a focus id for a history entry", () => {
    rememberFocus("k1", "cta:/apply");
    expect(peekFocus("k1")).toBe("cta:/apply");
    expect(consumeFocus("k1")).toBe("cta:/apply");
    // consume is one-shot
    expect(peekFocus("k1")).toBeNull();
    expect(consumeFocus("k1")).toBeNull();
  });

  it("returns null for unknown keys and no-op on empty inputs", () => {
    expect(peekFocus("nope")).toBeNull();
    expect(consumeFocus("nope")).toBeNull();
    rememberFocus("", "cta:x");
    rememberFocus(undefined, "cta:x");
    rememberFocus("k", "");
    expect(peekFocus("k")).toBeNull();
  });

  it("scopes memory per history key so unrelated pages don't collide", () => {
    rememberFocus("page-a", "cta:hero-apply");
    rememberFocus("page-b", "cta:card-apply");
    expect(consumeFocus("page-a")).toBe("cta:hero-apply");
    expect(consumeFocus("page-b")).toBe("cta:card-apply");
  });

  it("caps stored entries so it can't grow unbounded across a long session", () => {
    for (let i = 0; i < 120; i++) rememberFocus(`k${i}`, `cta:${i}`);
    // Earliest entries were evicted; latest ones survive.
    expect(peekFocus("k0")).toBeNull();
    expect(peekFocus("k119")).toBe("cta:119");
  });

  it("survives corrupt sessionStorage payloads without throwing", () => {
    window.sessionStorage.setItem("lovable:focus-restore", "not-json");
    expect(peekFocus("k")).toBeNull();
    rememberFocus("k", "cta:x"); // should recover by overwriting
    expect(peekFocus("k")).toBe("cta:x");
  });
});

describe("focusById", () => {
  it("focuses the element carrying the matching data-focus-id", () => {
    const el = mountCTA("cta:/apply");
    const scrollSpy = vi.spyOn(el, "scrollIntoView").mockImplementation(() => {});
    expect(focusById("cta:/apply")).toBe(true);
    expect(document.activeElement).toBe(el);
    expect(scrollSpy).toHaveBeenCalled();
  });

  it("returns false when no element matches the id", () => {
    mountCTA("cta:/apply");
    expect(focusById("cta:/does-not-exist")).toBe(false);
  });

  it("safely handles ids containing CSS-special characters (colons, slashes)", () => {
    const el = mountCTA("cta:/tenders/state/maharashtra");
    expect(focusById("cta:/tenders/state/maharashtra")).toBe(true);
    expect(document.activeElement).toBe(el);
  });

});

describe("back / forward navigation lifecycle", () => {
  it("restores focus to the previously activated CTA on browser back", () => {
    // ── Page A (home) ──────────────────────────────────────────────
    setHistoryKey("home-key");
    const heroCta = mountCTA("cta:hero-apply", "Apply Now");
    heroCta.focus();
    expect(document.activeElement).toBe(heroCta);

    // User activates the CTA → CTALink.rememberFocus fires against current key
    rememberFocus("home-key", "cta:hero-apply");

    // ── Navigate to Page B (/apply) ────────────────────────────────
    setHistoryKey("apply-key");
    document.body.innerHTML = "";
    const submit = document.createElement("button");
    submit.textContent = "Submit";
    document.body.appendChild(submit);
    submit.focus();
    expect(document.activeElement).toBe(submit);

    // ── User presses browser Back → router restores home ──────────
    setHistoryKey("home-key");
    document.body.innerHTML = "";
    mountCTA("cta:hero-apply", "Apply Now"); // page re-mounts
    // Baseline focus is on body until RouteAnnouncer runs
    expect(document.activeElement === document.body || document.activeElement === null).toBe(true);

    // RouteAnnouncer effect: read current history key, restore CTA focus
    const currentKey = (window.history.state as { key: string }).key;
    const focusId = consumeFocus(currentKey);
    expect(focusId).toBe("cta:hero-apply");
    expect(focusById(focusId!)).toBe(true);
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe("cta:hero-apply");

    // One-shot: navigating back again to the same key does not re-restore.
    expect(consumeFocus(currentKey)).toBeNull();
  });

  it("restores the CTA that matches the returned-to history entry, not the last one activated", () => {
    // Home has one CTA the user clicks
    setHistoryKey("home-key");
    mountCTA("cta:hero-apply");
    rememberFocus("home-key", "cta:hero-apply");

    // Navigate to Tenders and click a card CTA there
    setHistoryKey("tenders-key");
    document.body.innerHTML = "";
    mountCTA("cta:card-apply-1");
    rememberFocus("tenders-key", "cta:card-apply-1");

    // Navigate to /apply
    setHistoryKey("apply-key");
    document.body.innerHTML = "";

    // Back to Tenders → restores card CTA, NOT hero CTA
    setHistoryKey("tenders-key");
    document.body.innerHTML = "";
    mountCTA("cta:card-apply-1");
    mountCTA("cta:hero-apply"); // also present, must not steal focus
    let restoreId = consumeFocus((window.history.state as { key: string }).key);
    expect(restoreId).toBe("cta:card-apply-1");
    expect(focusById(restoreId!)).toBe(true);
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe("cta:card-apply-1");

    // Back again to Home → restores hero CTA
    setHistoryKey("home-key");
    document.body.innerHTML = "";
    mountCTA("cta:hero-apply");
    restoreId = consumeFocus((window.history.state as { key: string }).key);
    expect(restoreId).toBe("cta:hero-apply");
    expect(focusById(restoreId!)).toBe(true);
    expect(document.activeElement?.getAttribute("data-focus-id")).toBe("cta:hero-apply");
  });

  it("restores focus on forward navigation to a previously-visited entry", () => {
    // Visit /apply from home, memory is stored against home-key
    setHistoryKey("home-key");
    mountCTA("cta:hero-apply");
    rememberFocus("home-key", "cta:hero-apply");

    setHistoryKey("apply-key");
    document.body.innerHTML = "";

    // Back to home — restore consumes the entry
    setHistoryKey("home-key");
    document.body.innerHTML = "";
    mountCTA("cta:hero-apply");
    expect(consumeFocus("home-key")).toBe("cta:hero-apply");

    // User clicks CTA again → new memory recorded against home-key
    rememberFocus("home-key", "cta:hero-apply");

    // Forward to /apply, then Back again → focus still restores
    setHistoryKey("apply-key");
    document.body.innerHTML = "";
    setHistoryKey("home-key");
    document.body.innerHTML = "";
    mountCTA("cta:hero-apply");
    const id = consumeFocus("home-key");
    expect(id).toBe("cta:hero-apply");
    expect(focusById(id!)).toBe(true);
  });

  it("falls back cleanly when the previously activated CTA no longer exists", () => {
    setHistoryKey("home-key");
    rememberFocus("home-key", "cta:removed");

    // Page re-mounts WITHOUT the CTA (feature toggled off, list changed, etc.)
    setHistoryKey("home-key");
    document.body.innerHTML = "";
    mountCTA("cta:other");

    const id = consumeFocus("home-key");
    expect(id).toBe("cta:removed");
    // focusById reports false so caller (RouteAnnouncer) falls back to <main>.
    expect(focusById(id!)).toBe(false);
    expect(document.activeElement?.getAttribute("data-focus-id")).not.toBe("cta:removed");
  });
});
