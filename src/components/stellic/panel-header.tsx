import { cn } from "cn"
import type { ReactNode } from "react"

import { Icon } from "@/components/icon"

/* The head of every sidebar that opens beside the plan: a placeholder, the
 * course search, a course. The title, with the close — and whatever else the
 * panel keeps there, a bookmark — on its own line at the right, and under it
 * what it is. Where there is somewhere to go back to, that is one more line
 * above the title and nothing else moves.
 *
 * Fixed at the top while the panel scrolls, down to its rule. */

export function PanelHeader({
  backLabel,
  onBack,
  onClose,
  closeLabel,
  title,
  subline,
  action,
  controls,
  footer,
  className
}: {
  /** What the way back is to, where there is somewhere to go back to. */
  backLabel?: string
  onBack?: () => void
  onClose: () => void
  closeLabel: string
  /** The name, which may carry its own controls — a rename — beside it. */
  title: ReactNode
  /** What the name is, in a line: a code and its credits, say. */
  subline?: ReactNode
  /** The panel's own controls, at the end of the title's row. */
  action?: ReactNode
  /** Controls in the top bar, beside the close: a bookmark, say. */
  controls?: ReactNode
  /** What goes under the title, still part of the head: where the course is. */
  footer?: ReactNode
  /** The ground the head stands on. */
  className?: string
}) {
  return (
    /* Stays where it is as the panel scrolls, down to its rule, so the way back,
       the close and where the course is are never further than the top. */
    <header
      className={cn("sticky top-0 z-10 flex w-full shrink-0 flex-col bg-card px-6 py-6", className)}
    >
      {/* The way back is a line of its own above the title, and only there
          when there is somewhere to go back to. */}
      {backLabel && (
        <button
          type="button"
          onClick={onBack}
          className="mb-1 flex w-fit min-w-0 cursor-pointer items-center gap-1 text-label-md font-medium text-gray-80"
        >
          <Icon name="chevron-left" size={14} className="shrink-0" />
          <span className="min-w-0 truncate text-left">Back to {backLabel}</span>
        </button>
      )}
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1 pr-20">
          {title}
          {subline && (
            <p className="flex flex-wrap items-center gap-3 text-body-md text-gray-100">
              {subline}
            </p>
          )}
        </div>
        {action}
      </div>
      {/* In the top right corner of the head, level with its first line — the
          way back where there is one, the title where there is not — rather
          than down the middle of what stands beside it. */}
      <div className="absolute top-5 right-6 flex items-center gap-1">
        {controls}
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-100 hover:bg-gray-5"
        >
          <Icon name="close" size={20} />
        </button>
      </div>
      {footer && <div className="pt-3">{footer}</div>}
    </header>
  )
}

/** "◷ 3 Credits", the way every head says it. */
export function CreditsLine({ credits }: { credits: number | string }) {
  return (
    <span className="flex items-center gap-1">
      <Icon name="watch-later" size={14} />
      {credits} Credits
    </span>
  )
}
