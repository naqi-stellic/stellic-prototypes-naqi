import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

/* Retuned to the Figma badge spec: 4px radius rather than a pill, Label Medium
 * type, and the Stellic status pairs. Padding subtracts the border width for
 * the same inside-stroke reason as Button. */

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md " +
    "border border-transparent px-[7px] py-px text-label-md font-normal whitespace-nowrap " +
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        secondary: "bg-gray-5 text-gray-100",
        /* A count that is about the thing beside it being on. */
        primary: "bg-primary-0 text-primary-50",
        /* Named on the plan header's facets: the same tag on a white ground,
           drawn with an edge rather than a fill. */
        outline: "border-gray-40 bg-card text-gray-100",
        success: "bg-success-5 text-success-100",
        danger: "bg-alert-5 text-alert-100",
        warning: "bg-warning-5 text-warning-50",
        /* No ground — used for inline counts such as the note tally. */
        quiet: "text-gray-80",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
