import { cn } from "cn"
import { useState } from "react"

import { Icon } from "@/components/icon"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/* A row of filters: one button per group, each opening onto the questions it
 * asks, and everything chosen collected underneath so the whole filter reads
 * in one line whichever button it came from.
 *
 * It knows nothing about what is being filtered — a field arrives with the
 * values it can take — so the same row narrows programs in Advanced What-If
 * and requirements in the planner. */

export type FilterField = {
  id: string
  label: string
  placeholder: string
  /** What this field can be filtered to, as the caller finds them. */
  options: string[]
  /** How the field is answered. A field whose answers can be layered gets a
   *  search box that collects them as tags; one that takes a single answer
   *  gets a select, which is the same box opening onto the answers. */
  mode?: "search" | "menu"
}

export type FilterGroup = {
  id: string
  label: string
  fields: FilterField[]
}

/** Every field with a value has to be satisfied; a field with none asks
 *  nothing. */
export type FilterState = Record<string, string[]>

export function activeFields(groups: FilterGroup[], filters: FilterState) {
  return groups.flatMap((group) =>
    group.fields
      .filter((field) => (filters[field.id]?.length ?? 0) > 0)
      .map((field) => ({ field, values: filters[field.id] ?? [] }))
  )
}

/** Whether a thing answers every field that is asking something. */
export function matches(filters: FilterState, valueOf: (fieldId: string) => string | string[]) {
  return Object.entries(filters).every(([id, values]) => {
    if (!values || values.length === 0) return true
    const held = valueOf(id)
    return Array.isArray(held) ? held.some((v) => values.includes(v)) : values.includes(held)
  })
}

/** A field inside a filter's popover: a search box that opens its options and
 *  collects the chosen ones as removable tags. */
function FilterFieldInput({
  field,
  values,
  onChange,
}: {
  field: FilterField
  values: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const available = field.options.filter((option) => !values.includes(option))

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-md font-semibold text-foreground">{field.label}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border border-gray-40 bg-card p-[7px] text-left"
          >
            <Icon name="s-search" size={16} className="mx-1 shrink-0 text-gray-60" />
            {values.length === 0 ? (
              <span className="text-body-md text-gray-80">{field.placeholder}</span>
            ) : (
              values.map((value) => (
                <span
                  key={value}
                  className="flex h-7 items-center gap-1 rounded-md border border-gray-40 bg-card px-[9px] text-body-md text-gray-100 shadow-xs"
                >
                  {value}
                  {/* A span, not a button: this is already inside the trigger,
                      and a button inside a button is not valid markup. */}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${value}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onChange(values.filter((v) => v !== value))
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return
                      event.preventDefault()
                      event.stopPropagation()
                      onChange(values.filter((v) => v !== value))
                    }}
                  >
                    <Icon name="close" size={12} />
                  </span>
                </span>
              ))
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
        >
          <Command>
            <CommandInput placeholder={field.placeholder} className="text-body-md" />
            <CommandList>
              <CommandEmpty className="p-3 text-body-md text-gray-80">
                Nothing left to add.
              </CommandEmpty>
              <CommandGroup>
                {available.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => onChange([...values, option])}
                    className="text-body-md"
                  >
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** A field with a short list of answers: the same box the search field
 *  stands in, opening onto the answers themselves rather than onto a search. */
function FilterSelectInput({
  field,
  values,
  onChange,
}: {
  field: FilterField
  values: string[]
  onChange: (next: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const chosen = values[0]

  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-md font-semibold text-foreground">{field.label}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-gray-40 bg-card px-[11px] text-left"
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-body-md",
                chosen ? "text-gray-100" : "text-gray-80"
              )}
            >
              {chosen ?? field.placeholder}
            </span>
            <Icon name="expand-more" size={16} className="shrink-0 text-gray-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="flex w-[var(--radix-popover-trigger-width)] flex-col p-1"
        >
          {field.options.map((option) => {
            const held = option === chosen
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  /* One answer at a time, and picking the one already held
                     puts it down again. */
                  onChange(held ? [] : [option])
                  setOpen(false)
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left",
                  "text-body-md text-gray-100 hover:bg-gray-5"
                )}
              >
                <Icon
                  name="check"
                  size={16}
                  className={cn("shrink-0", held ? "text-primary-50" : "opacity-0")}
                />
                {option}
              </button>
            )
          })}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function FilterButton({
  group,
  filters,
  onChange,
}: {
  group: FilterGroup
  filters: FilterState
  onChange: (next: FilterState) => void
}) {
  const [open, setOpen] = useState(false)
  const held = group.fields.some((field) => (filters[field.id]?.length ?? 0) > 0)

  const clear = () => {
    const next = { ...filters }
    group.fields.forEach((field) => delete next[field.id])
    onChange(next)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button aria-pressed={held} className="data-[state=open]:bg-gray-5">
          {group.label}
          {held && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Clear ${group.label}`}
              onClick={(event) => {
                event.stopPropagation()
                clear()
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return
                event.preventDefault()
                event.stopPropagation()
                clear()
              }}
            >
              <Icon name="close" size={12} />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-[320px] flex-col gap-4 p-4">
        {group.fields.map((field) => {
          const Input = field.mode === "menu" ? FilterSelectInput : FilterFieldInput
          return (
            <Input
              key={field.id}
              field={field}
              values={filters[field.id] ?? []}
              onChange={(next) => onChange({ ...filters, [field.id]: next })}
            />
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

/** Everything chosen, in one line, whichever button it came from. Its own
 *  component because it does not always belong under the buttons: the programs
 *  list keeps it in a band of its own, below the rule that ends the controls,
 *  where the product puts it. */
export function FilterChips({
  groups,
  filters,
  onChange,
}: {
  groups: FilterGroup[]
  filters: FilterState
  onChange: (next: FilterState) => void
}) {
  const active = activeFields(groups, filters)

  if (!active.length) return null

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {active.flatMap(({ field, values }) =>
        values.map((value) => (
          <span
            key={`${field.id}-${value}`}
            className="flex h-8 items-center gap-2 rounded-full bg-primary-0 px-3 text-body-md text-primary-50"
          >
            {field.label}: {value}
            <button
              type="button"
              aria-label={`Remove ${field.label} ${value}`}
              onClick={() =>
                onChange({
                  ...filters,
                  [field.id]: (filters[field.id] ?? []).filter((v) => v !== value),
                })
              }
              className="cursor-pointer"
            >
              <Icon name="close" size={12} />
            </button>
          </span>
        ))
      )}
      <button
        type="button"
        onClick={() => onChange({})}
        className={cn(
          "flex h-8 cursor-pointer items-center rounded-full bg-gray-5 px-3",
          "text-body-md text-gray-80 transition-colors hover:bg-gray-40"
        )}
      >
        Reset all filters
      </button>
    </div>
  )
}

export function FilterBar({
  groups,
  filters,
  onChange,
  trailing,
  chips = true,
  onlyActive = false,
}: {
  groups: FilterGroup[]
  filters: FilterState
  onChange: (next: FilterState) => void
  /** Anything that belongs beside the buttons rather than under them — the
   *  planner puts its Group by there. */
  trailing?: React.ReactNode
  /** Whether what is chosen is drawn under the buttons. Off where the page
   *  draws it somewhere else itself. */
  chips?: boolean
  /** Folded: only the buttons that are on, so what the list is narrowed by
   *  stays in view and the rest wait to be opened. */
  onlyActive?: boolean
}) {
  const on = new Set(activeFields(groups, filters).map(({ field }) => field.id))
  const shown = onlyActive
    ? groups.filter((group) => group.fields.some((field) => on.has(field.id)))
    : groups

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-wrap items-center gap-2">
        {shown.map((group) => (
          <FilterButton key={group.id} group={group} filters={filters} onChange={onChange} />
        ))}
        {trailing && <span className="ml-auto shrink-0">{trailing}</span>}
      </div>

      {chips && <FilterChips groups={groups} filters={filters} onChange={onChange} />}
    </div>
  )
}
