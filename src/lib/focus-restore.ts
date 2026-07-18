/**
 * Per-history-entry focus memory.
 * Remembers which CTA was activated on each page so that when the user
 * comes back to it (via browser back / router history), focus can be
 * restored to that exact control for keyboard + screen reader users.
 */

const STORAGE_KEY = "lovable:focus-restore";

type FocusMap = Record<string, string>;

function readMap(): FocusMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FocusMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: FocusMap) {
  if (typeof window === "undefined") return;
  try {
    // Cap the map to the last ~50 entries to avoid unbounded growth.
    const entries = Object.entries(map);
    const trimmed = entries.slice(-50);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
  } catch {
    /* quota / disabled — ignore */
  }
}

export function rememberFocus(historyKey: string | undefined, focusId: string) {
  if (!historyKey || !focusId) return;
  const map = readMap();
  map[historyKey] = focusId;
  writeMap(map);
}

export function peekFocus(historyKey: string | undefined): string | null {
  if (!historyKey) return null;
  return readMap()[historyKey] ?? null;
}

export function consumeFocus(historyKey: string | undefined): string | null {
  if (!historyKey) return null;
  const map = readMap();
  const id = map[historyKey] ?? null;
  if (id) {
    delete map[historyKey];
    writeMap(map);
  }
  return id;
}

export function focusById(focusId: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.querySelector<HTMLElement>(
    `[data-focus-id="${CSS.escape(focusId)}"]`,
  );
  if (!el) return false;
  el.focus({ preventScroll: false });
  // Nudge into view for sighted keyboard users.
  el.scrollIntoView({ block: "center", behavior: "auto" });
  return document.activeElement === el;
}
