"use client";

/**
 * PwaContainer — devkit
 *
 * A PWA-safe full-height layout container.
 * Uses `100dvh` (dynamic viewport height) instead of `100vh` so that
 * the mobile browser chrome (address bar) never clips the content.
 * Also applies safe-area-inset padding for notch/home-indicator devices.
 */

interface PwaContainerProps {
  children: React.ReactNode;
  /** Tailwind gradient/bg classes, e.g. "bg-gradient-to-br from-slate-900 via-red-900 to-slate-900" */
  gradient?: string;
  /** Extra Tailwind classes */
  className?: string;
  /** Whether the container scrolls vertically (default: false — fixed full-screen layout) */
  scrollable?: boolean;
}

export const PwaContainer: React.FC<PwaContainerProps> = ({
  children,
  gradient = "bg-gradient-to-br from-slate-900 via-red-900 to-slate-900",
  className = "",
  scrollable = false,
}) => {
  return (
    <div
      className={[
        "relative flex flex-col",
        scrollable ? "min-h-dvh overflow-y-auto" : "h-dvh overflow-hidden",
        "pb-safe",
        gradient,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
};
