import { useState, type ReactNode } from "react"

import { AddSlot } from "@/components/stellic/primitives"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { CatalogEntry } from "@/data/catalog"

/* What "+ Add to Term" opens: the requirements this plan is not holding a place
 * for, and the option of holding one. */

export function AddCourseMenu({
  options,
  onPick,
  trigger,
}: {
  options: CatalogEntry[]
  onPick: (entry: CatalogEntry) => void
  /** What opens it. The dashed slot at the foot of a term card by default; in
   *  a term view it is the card header's own plus. */
  trigger?: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger ?? <AddSlot>+ Add to Term</AddSlot>}</PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
        <Command>
          <CommandInput placeholder="Search courses" className="text-body-md" />
          <CommandList>
            <CommandEmpty className="p-3 text-body-md text-gray-80">
              No course by that name.
            </CommandEmpty>
            <CommandGroup>
              {options.map((entry, i) => (
                <CommandItem
                  key={`${entry.code}-${i}`}
                  value={`${entry.code} ${entry.name}`}
                  onSelect={() => {
                    onPick(entry)
                    setOpen(false)
                  }}
                  className="flex-col items-start gap-0 text-body-md"
                >
                  <span className="text-gray-100">{entry.code}</span>
                  <span className="font-semibold text-foreground">{entry.name}</span>
                  <span className="text-label-md text-gray-80">{entry.reason}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
