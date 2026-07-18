import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from "react";
import { rememberFocus } from "@/lib/focus-restore";

type CTALinkProps = LinkProps & {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  loadingLabel?: string;
  announceLabel?: string;
  /** Stable identifier used to restore focus when the user comes back to this page. */
  focusId?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

function getHistoryKey(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const state = window.history.state as { key?: string } | null;
  return state?.key ?? `${window.location.pathname}${window.location.search}`;
}

function defaultFocusId(props: LinkProps): string {
  const to = typeof props.to === "string" ? props.to : "link";
  return `cta:${to}`;
}

/**
 * Link with built-in loading, disabled, ARIA and focus-restoration behavior.
 * On activation it remembers this CTA against the current history entry so
 * the RouteAnnouncer can restore focus to it when the user navigates back.
 */
export function CTALink({
  children,
  className,
  disabled,
  loadingLabel,
  announceLabel,
  focusId,
  onClick,
  ...linkProps
}: CTALinkProps) {
  const [pending, setPending] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const armed = useRef(false);
  const pendingTimer = useRef<number | null>(null);
  const isRouterLoading = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });
  const resolvedFocusId = focusId ?? defaultFocusId(linkProps);

  useEffect(() => {
    if (armed.current && !isRouterLoading) {
      armed.current = false;
      if (pendingTimer.current != null) {
        window.clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
      }
      setPending(false);
      const id = window.setTimeout(() => setLiveMessage(""), 400);
      return () => window.clearTimeout(id);
    }
  }, [isRouterLoading]);

  useEffect(() => {
    return () => {
      if (pendingTimer.current != null) window.clearTimeout(pendingTimer.current);
    };
  }, []);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (disabled || pending) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      onClick?.(e);
      return;
    }
    // Remember this CTA against the CURRENT history entry so that when the
    // user comes back (browser back / router history) focus restores here.
    rememberFocus(getHistoryKey(), resolvedFocusId);

    const label =
      announceLabel ??
      loadingLabel ??
      (typeof children === "string" ? children : "the next page");
    armed.current = true;
    // Delay the spinner so fast navigations feel instant — only show
    // "Opening…" if the next route is still loading after 350ms.
    if (pendingTimer.current != null) window.clearTimeout(pendingTimer.current);
    pendingTimer.current = window.setTimeout(() => {
      if (armed.current) {
        setPending(true);
        setLiveMessage(`Loading ${label}, please wait…`);
      }
    }, 350);
    onClick?.(e);
  };


  const isBusy = pending || disabled;

  return (
    <>
      <Link
        {...(linkProps as LinkProps)}
        className={className}
        onClick={handleClick}
        aria-disabled={isBusy || undefined}
        aria-busy={pending || undefined}
        data-loading={pending ? "true" : undefined}
        data-focus-id={resolvedFocusId}
        tabIndex={disabled ? -1 : undefined}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            <span>{loadingLabel ?? "Loading…"}</span>
          </>
        ) : (
          children
        )}
      </Link>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMessage}
      </span>
    </>
  );
}
