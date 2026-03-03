"use client";

/**
 * AdminPanel — devkit
 *
 * Responsive modal wrapper for admin-facing screens (logs, product upload, etc.).
 *
 * Behavior:
 *  - Mobile  (< md): full-screen modal (covers entire viewport safely with dvh)
 *  - Desktop (≥ md): centered dialog with max-w-4xl, scrollable content area
 *
 * Content area is always scrollable so nothing is hidden behind safe-area insets.
 */

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Icon emoji or small element displayed left of the title */
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Disable close (e.g. while an upload is in progress) */
  disableClose?: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  disableClose = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
      {/* Click-outside to close */}
      <div
        className="absolute inset-0"
        onClick={disableClose ? undefined : onClose}
      />

      {/* Panel */}
      <div
        className={[
          "relative z-10 flex flex-col w-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl",
          // Mobile: bottom-sheet style (full width, up to ~95dvh, rounded top)
          "rounded-t-3xl md:rounded-2xl",
          "max-h-[95dvh] md:max-w-4xl md:max-h-[90dvh]",
          "animate-fade-in-up",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
          {/* Drag handle (mobile hint) */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/20 md:hidden" />

          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            {icon && (
              <span className="w-9 h-9 flex items-center justify-center bg-white/10 rounded-lg text-lg">
                {icon}
              </span>
            )}
            {title}
          </h2>

          <button
            onClick={disableClose ? undefined : onClose}
            disabled={disableClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Cerrar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
};
