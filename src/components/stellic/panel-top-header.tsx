import { cn } from "cn"
import type { ReactNode } from "react"

import { Icon } from "@/components/icon"
import { Button } from "@/components/ui/button"

/* The bar a side panel opens with: its name, the way out, and a rule under
 * them. A subline (a step count, say) goes under the name with no gap. Padding
 * subtracts the border width where a container is stroked (see button.tsx for
 * why). */

export function PanelTopHeader({
  title,
  subline,
  actions,
  backLabel,
  onBack,
  closeLabel,
  ruled = true,
  onClose,
}: {
  /** A string, or a field standing in for it while the name is being edited. */
  title: ReactNode
  /** Plain text is set as the gray caption; anything else is placed as is. */
  subline?: ReactNode
  /** Icon buttons that sit beside the close button, before it. */
  actions?: ReactNode
  /** What the way back is to, where there is somewhere to go back to. */
  backLabel?: string
  onBack?: () => void
  closeLabel?: string
  /** The rule under the bar. Left off where a strip of tabs follows with its own. */
  ruled?: boolean
  onClose?: () => void
}) {
  const controls = (
    <>
      {actions}
      <Button
        variant="ghost"
        size="icon"
        aria-label={closeLabel ?? `Close ${String(title)}`}
        onClick={onClose}
      >
        <Icon name="s-close" size={16} />
      </Button>
    </>
  )

  return (
    <header
      className={cn(
        "relative flex shrink-0 flex-col gap-0.5 px-6 pb-[15px]",
        /* With a way back above the name, the bar opens a little further down, and
           the icons at the right start at the same height as its text. */
        onBack ? "pt-4" : "pt-3",
        ruled && "border-b border-gray-40"
      )}
    >
      {onBack ? (
        <>
          {/* The way back is the first line, and the close and the panel's own
              buttons stand at the top right of the panel, level with it. */}
          <button
            type="button"
            onClick={onBack}
            className="flex w-fit min-w-0 max-w-[calc(100%-5rem)] cursor-pointer items-center gap-1 text-body-md font-medium text-gray-80 hover:text-gray-100"
          >
            <Icon name="chevron-left" size={14} className="shrink-0" />
            <span className="min-w-0 truncate">Back to {backLabel}</span>
          </button>
          <div className="absolute top-2.5 right-6 flex items-center gap-2">{controls}</div>
          <h2 className="min-w-0 truncate text-h300 font-semibold text-foreground">{title}</h2>
        </>
      ) : (
        <div className="flex w-full items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-h300 font-semibold text-foreground">
            {title}
          </h2>
          {controls}
        </div>
      )}
      {typeof subline === "string" ? (
        <span className="text-body-md font-medium text-gray-80">{subline}</span>
      ) : (
        subline
      )}
    </header>
  )
}
