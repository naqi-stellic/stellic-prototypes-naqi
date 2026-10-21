import { cn } from "cn"

/* Where the student is in a run of questions: which of how many, and a bar for
 * each, filled as far as they have got. The label sits in a panel's head under
 * its name; the bars run edge to edge and touch the head's rule, in one piece, over what it
 * asks. */

export function StepLabel({ step, total }: { step: number; total: number }) {
  return (
    <span className="text-body-md font-medium text-gray-80">
      Step {step} of {total}
    </span>
  )
}

export function StepBars({ step, total }: { step: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-label={`Step ${step} of ${total}`}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
      className="flex w-full shrink-0 items-start"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          /* A white hairline between steps, as the progress bar's shares have,
              so two filled ones still read as two. */
          className={cn(
            "h-1 min-w-0 flex-1",
            i < total - 1 && "border-r border-white",
            i < step ? "bg-primary-50" : "bg-gray-40"
          )}
        />
      ))}
    </div>
  )
}
