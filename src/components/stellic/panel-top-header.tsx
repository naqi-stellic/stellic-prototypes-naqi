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
  /** What the way back is to, where there is somewhere to go back to. It
   *  shows as a chevron button before the title. */
  backLabel?: string
  onBack?: () => void
  closeLabel?: string
  /** The rule under the bar. Left off where a strip of tabs follows with its own. */
  ruled?: boolean
  onClose?: () => void
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 flex-col px-6 pt-3 pb-[15px]",
        ruled && "border-b border-gray-40"
      )}
    >
      <div className="flex w-full items-center gap-2">
        {onBack && (
          <button
            type="button"
            aria-label={backLabel ? `Back to ${backLabel}` : "Back"}
            onClick={onBack}
            className="-ml-2 -mr-[9px] flex shrink-0 cursor-pointer items-center text-foreground"
          >
            <Icon name="chevron-left" size={24} />
          </button>
        )}
        <h2 className="min-w-0 flex-1 truncate text-h300 font-semibold text-foreground">
          {title}
        </h2>
        {actions}
        <Button
          variant="ghost"
          size="icon"
          aria-label={closeLabel ?? `Close ${String(title)}`}
          onClick={onClose}
        >
          <Icon name="s-close" size={16} />
        </Button>
      </div>
      {typeof subline === "string" ? (
        <span className="text-body-md font-medium text-gray-80">{subline}</span>
      ) : (
        subline
      )}
    </header>
  )
}
