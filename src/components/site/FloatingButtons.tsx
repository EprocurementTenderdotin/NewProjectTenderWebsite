import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ClipboardList } from "lucide-react";

const FLOATING_BUTTONS_OWNER_KEY = "__etFloatingButtonsOwner";
const FLOATING_BUTTONS_RELEASE_EVENT = "et-floating-buttons-release";

declare global {
  interface Window {
    [FLOATING_BUTTONS_OWNER_KEY]?: string;
  }
}

function getScrollMetrics() {
  const scrollingElement = document.scrollingElement || document.documentElement;
  const scrollTop = window.scrollY || scrollingElement.scrollTop || document.body.scrollTop || 0;
  const scrollHeight = Math.max(scrollingElement.scrollHeight, document.body.scrollHeight);
  const clientHeight = window.innerHeight || scrollingElement.clientHeight;

  return {
    canScroll: scrollHeight > clientHeight + 8,
    isNearTop: scrollTop < 120,
    isNearBottom: scrollTop + clientHeight >= scrollHeight - 120,
    scrollHeight,
  };
}

function scrollPageTo(top: number) {
  const scrollingElement = document.scrollingElement || document.documentElement;
  window.scrollTo({ top, behavior: "smooth" });
  scrollingElement.scrollTo?.({ top, behavior: "smooth" });
}

export function FloatingButtons() {
  const instanceId = useRef(`floating-buttons-${Math.random().toString(36).slice(2)}`);
  const [active, setActive] = useState(true);
  const [scrollState, setScrollState] = useState({
    canScroll: false,
    isNearTop: true,
    isNearBottom: true,
    scrollHeight: 0,
  });

  useEffect(() => {
    const claimIfAvailable = () => {
      if (!window[FLOATING_BUTTONS_OWNER_KEY]) {
        window[FLOATING_BUTTONS_OWNER_KEY] = instanceId.current;
      }
      setActive(window[FLOATING_BUTTONS_OWNER_KEY] === instanceId.current);
    };

    claimIfAvailable();
    window.addEventListener(FLOATING_BUTTONS_RELEASE_EVENT, claimIfAvailable);

    return () => {
      window.removeEventListener(FLOATING_BUTTONS_RELEASE_EVENT, claimIfAvailable);
      if (window[FLOATING_BUTTONS_OWNER_KEY] === instanceId.current) {
        delete window[FLOATING_BUTTONS_OWNER_KEY];
        window.dispatchEvent(new Event(FLOATING_BUTTONS_RELEASE_EVENT));
      }
    };
  }, []);

  useEffect(() => {
    if (!active) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrollState(getScrollMetrics()));
    };

    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });

    function onScroll() {
      update();
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed bottom-4 right-4 lg:bottom-[9px] lg:right-6 z-40 flex flex-col-reverse lg:flex-col gap-2 lg:gap-3 items-end">
      {scrollState.canScroll && !scrollState.isNearTop && (
        <button
          type="button"
          onClick={() => scrollPageTo(0)}
          aria-label="Scroll to top"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:scale-105 transition-all ring-1 ring-white/20"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
      <Link
        to="/track"
        aria-label="Check application status"
        className="group relative inline-flex items-center gap-2 rounded-full lg:rounded-lg px-5 h-12 min-w-[48px] text-sm font-semibold text-white shadow-lg shadow-violet-600/40 hover:shadow-xl hover:shadow-fuchsia-600/50 transition-all bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:scale-105 ring-1 ring-white/15"
      >
        <span className="absolute inset-0 rounded-full lg:rounded-lg bg-gradient-to-r from-fuchsia-600 via-purple-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        <ClipboardList className="relative h-5 w-5" />
        <span className="relative">Track Status</span>
      </Link>
    </div>

  );
}

