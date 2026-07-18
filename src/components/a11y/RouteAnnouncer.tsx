import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { consumeFocus, focusById } from "@/lib/focus-restore";

function getHistoryKey(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const state = window.history.state as { key?: string } | null;
  return state?.key ?? `${window.location.pathname}${window.location.search}`;
}

/**
 * Announces route changes to assistive tech and manages post-navigation focus.
 * - Restores focus to the CTA that was activated for this history entry, if any
 *   (so browser-back returns keyboard/SR focus to where the user left off).
 * - Otherwise moves focus to the <main> landmark.
 * - Publishes a polite aria-live message with the new page title.
 */
export function RouteAnnouncer() {
  const location = useRouterState({ select: (s) => s.location.pathname });
  const isLoading = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });
  const [message, setMessage] = useState("");
  const firstRender = useRef(true);

  useEffect(() => {
    // Locate the primary landmark. Attributes (id, tabIndex, outline) are set
    // declaratively in each route's <main> JSX so SSR and client HTML match —
    // do NOT mutate them here, that caused hydration-mismatch warnings.
    const main =
      document.getElementById("main-content") ??
      document.querySelector<HTMLElement>("main");

    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (isLoading) return;

    // Wait a tick for React/Head to swap document.title and mount new DOM,
    // then decide where focus should land.
    const id = window.setTimeout(() => {
      const title = document.title || "Page loaded";
      const focusId = consumeFocus(getHistoryKey());
      const restored = focusId ? focusById(focusId) : false;

      if (restored) {
        setMessage(`${title} — returned to previous control`);
      } else {
        setMessage(`${title} — page loaded`);
        main?.focus({ preventScroll: false });
      }
    }, 80);

    return () => window.clearTimeout(id);
  }, [location, isLoading]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

