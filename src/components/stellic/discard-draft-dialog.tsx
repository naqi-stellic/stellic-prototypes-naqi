import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/* Leaving a generated plan behind. Closing the generator or exiting the draft
 * throws away every option it made, so it asks first. Nothing in the plan the
 * student already has is touched either way, and it says so. */

const COUNT = ["no", "one", "two", "three", "four", "five"]

/** What goes, named: the option on screen and how many others it came with. */
function discarded(selected: string | null, others: number): string {
  if (!selected) return "The plan being generated will be discarded."
  if (others === 0) return `${selected} will be discarded.`
  const n = COUNT[others] ?? String(others)
  return `${selected} and the ${n} alternative${others === 1 ? "" : "s"} will be discarded.`
}

export function DiscardDraftDialog({
  open,
  selected,
  others,
  onKeep,
  onDiscard,
}: {
  open: boolean
  /** The option on screen, or null while the first one is still arriving. */
  selected: string | null
  /** How many other options would go with it. */
  others: number
  onKeep: () => void
  onDiscard: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onKeep()}>
      <DialogContent className="gap-4 sm:max-w-[460px]" showCloseButton={false}>
        <DialogHeader className="gap-1.5">
          <DialogTitle>Leave without saving this plan?</DialogTitle>
          <DialogDescription>
            {discarded(selected, others)} Nothing in your current plan changes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex w-full gap-2 sm:flex-row">
          <Button className="flex-1" onClick={onKeep}>
            Keep reviewing
          </Button>
          <Button variant="primary" className="flex-1" onClick={onDiscard}>
            Discard and leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
