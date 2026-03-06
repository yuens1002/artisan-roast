"use client";

import { cn } from "@/lib/utils";
import { ArrowRight, X, Zap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const CTA_OPTIONS = [
  "Try Admin Dashboard",
  "See User Account",
] as const;

type Phase = "idle" | "exit" | "enter";

/**
 * Demo banner that invites users to try the admin dashboard.
 * Only renders when NEXT_PUBLIC_DEMO_MODE env var is set to "true" and user is not logged in.
 * CTA text cycles with a slide-up ticker animation.
 */
interface DemoBannerProps {
  isAuthenticated: boolean;
}

export function DemoBanner({ isAuthenticated }: DemoBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [ctaIndex, setCtaIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const rafRef = useRef(0);

  const cycle = useCallback(() => {
    // Phase 1: slide current text up and out
    setPhase("exit");

    setTimeout(() => {
      // Swap text, position below
      setCtaIndex((i) => (i + 1) % CTA_OPTIONS.length);
      setPhase("enter");

      // Next frame: slide new text up into place
      rafRef.current = requestAnimationFrame(() => {
        setPhase("idle");
      });
    }, 300);
  }, []);

  useEffect(() => {
    const interval = setInterval(cycle, 4000);
    return () => {
      clearInterval(interval);
      cancelAnimationFrame(rafRef.current);
    };
  }, [cycle]);

  // Only show in demo mode when not logged in
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true" || isDismissed || isAuthenticated) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2.5">
      <div className="container mx-auto flex items-center justify-center gap-2 sm:gap-4 text-sm">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium hidden sm:inline">This is a live demo.</span>
          <span className="font-medium sm:hidden">Live demo.</span>
        </div>
        <span className="hidden sm:inline text-white/80">No signup required.</span>
        <Link
          href="/auth/signin"
          className="font-semibold underline underline-offset-2 hover:no-underline inline-flex items-center"
        >
          <span className="relative inline-flex overflow-hidden">
            {/* Invisible sizer — reserves width of longest option */}
            <span className="invisible" aria-hidden="true">
              {CTA_OPTIONS.reduce((a, b) => (a.length >= b.length ? a : b))}
            </span>
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-end",
                phase === "idle" && "translate-y-0 transition-transform duration-300 ease-out",
                phase === "exit" && "-translate-y-full transition-transform duration-300 ease-in",
                phase === "enter" && "translate-y-full"
              )}
            >
              {CTA_OPTIONS[ctaIndex]}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 ml-1 shrink-0" aria-hidden="true" />
        </Link>
        <button
          onClick={() => setIsDismissed(true)}
          className={cn("p-1 rounded hover:bg-white/20 transition-colors ml-auto sm:ml-0")}
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
