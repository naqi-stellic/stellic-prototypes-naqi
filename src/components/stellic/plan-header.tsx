import { cn } from "cn"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { Icon, type IconName } from "@/components/icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DEGREE, STUDENT } from "@/data/plan"

/* The top of every plan screen: which plan, what it is for, and which years
 * are in view. The planner and a term share it — only the actions and the
 * selected year differ. */

export type PlanAction = {
  label: string
  icon: IconName
  toggles?: boolean
  /** Given, the action opens a menu of details to show on or hide from the
   *  course cards, rather than acting on its own. */
  fields?: { id: string; label: string; shown: boolean }[]
  /** The requirements panel's toggle, drawn pressed while it is open. Left
   *  out of the row where the page has no panel to open. */
  sidebar?: boolean
  /** Given, the action opens a menu of ways to do the one thing, and the page
   *  is told which was picked. */
  choices?: { id: string; label: string; icon: IconName }[]
}

/** What the degree still wants, to be dragged into the plan. Where the page
 *  can generate too, the two are one action's choices — the plan filled for
 *  you, or by hand — and this stands alone only where it is the only way. */
export const ADD_REMAINING: PlanAction = {
  label: "Add remaining courses",
  icon: "checklist",
  sidebar: true,
}

/** Request review, or — once a request is out on the plan as it stands —
 *  Requested, which opens the request rather than making another. Any change
 *  to the plan makes it something to ask about again. */
export function reviewAction(requested: boolean): PlanAction {
  return requested
    ? { label: "Requested", icon: "check-circle-outline" }
    : { label: "Request review", icon: "assignment" }
}

/** A term as the year filter offers it: its own state, not its year's. */
export type TabTerm = {
  id: string
  label: string
  icon: IconName
  tone: string
}

export type YearTab = {
  label: string
  icon?: IconName
  tone?: string
  selected?: boolean
  onSelect?: () => void
  /** Given, the tab opens onto the year's terms rather than acting on its own. */
  terms?: TabTerm[]
  onSelectTerm?: (termId: string) => void
}

/** Where the planner was opened from, if it was opened from anywhere:
 *  `?from=compliance` on the URL, put there by the record that sent you. */
export function cameFrom(): string | null {
  if (typeof window === "undefined") return null
  const from = new URLSearchParams(window.location.search).get("from")
  /* A page name and nothing else, so the value on the URL cannot point the
     link at somewhere it was not meant to. */
  return from && /^[a-z-]+$/.test(from) ? from : null
}

function CameFrom() {
  const back = cameFrom()

  const inside = (
    <>
      {STUDENT.name}
      <Icon name="chevron-right" size={16} />
    </>
  )

  if (!back) return null

  return (
    <a
      href={`/${back}.html`}
      className="flex items-center gap-1 text-gray-80 hover:text-gray-100"
    >
      {inside}
    </a>
  )
}

export function PlanHeader({
  actions,
  tabs,
  term,
  progress,
  banner,
  pressed,
  onAction,
  onToggleField,
  onChoose,
  sidebar,
}: {
  actions: PlanAction[]
  /** The years, which the breadcrumb's "All Years" opens onto. */
  tabs: YearTab[]
  /** The term the page is on, where it is on one: the last crumb. */
  term?: string
  /** Where the student stands, as the two meters under the bar. */
  progress?: PlanProgressData
  /** A banner that holds at the top with the toolbar rather than scrolling
   *  away under it. The registration window is the one thing worth keeping in
   *  reach the whole way down a term: everything on the page is something you
   *  might register, and the button that does it should not be a scroll away.
   *
   *  It is given whether the toolbar is holding, because a banner sitting in
   *  the page and a banner pinned to the top of it are not the same shape: one
   *  is a card among cards, the other is a strip across the top. */
  banner?: (stuck: boolean) => ReactNode
  /** Whether the toggling action is currently showing its panel. */
  pressed?: boolean
  onAction?: (action: PlanAction) => void
  onToggleField?: (id: string) => void
  /** Which way of doing an action with choices was picked. */
  onChoose?: (choiceId: string) => void
  /** The requirements panel this header's sidebar button opens.
   *  Omitted where there is nothing to open. */
  sidebar?: { open: boolean; onToggle: () => void }
}) {
  const sentinel = useRef<HTMLSpanElement>(null)
  const [stuck, setStuck] = useState(false)

  /* Holding at the top, once the page has scrolled under it: the bar takes a
     ground and a rule then, and has none at rest. */
  useEffect(() => {
    const pane = sentinel.current?.closest("main")
    if (!pane) return
    const read = () => setStuck(pane.scrollTop > 4)
    read()
    pane.addEventListener("scroll", read, { passive: true })
    return () => pane.removeEventListener("scroll", read)
  }, [])

  /* Narrow, the actions lose their words rather than their line.
   *
   * The toolbar is two groups — which years are in view, and what can be done
   * to the plan — and a second row of buttons pushes the plan itself further
   * down the page every time it holds at the top. The years cannot shorten:
   * "2027-2028" is the whole of what that button says. The actions can, because
   * each already carries the glyph that names it.
   *
   * Against the toolbar's own width rather than the window's: the planner's
   * pane is resizable and the panel beside it opens and closes, so the window
   * is not what decides how much room this row has.
   *
   * Where each step happens depends on how many actions there are, Add
   * remaining courses not counted: two of them are 377px of buttons, three
   * are 560px — a term view carries Generate
   * Schedule, which is the longest label any of them has — and the years are
   * 541px beside them. All four widths are measured off the rendered rows
   * rather than guessed, and written out in full because Tailwind reads the
   * source for class names and cannot see one assembled at runtime. */
  /* Only the actions this page will draw: Add remaining goes where there is
     no panel for it to open. */
  const shown = actions.filter((action) => !action.sidebar || sidebar)
  /* The plan switcher stands in the row as well, so three actions here are four. */
  const crowded = shown.length >= 3

  /* Step one: the actions keep their glyphs and lose their words. */
  /* Add remaining courses carries its words too, which is 148px more row
     (its label measures 130 at button-md, plus the gap and the padding an
     icon button does not have), so each step comes that much sooner. */
  const labelsGo = crowded ? "@max-[1280px]/toolbar:hidden" : "@max-[1110px]/toolbar:hidden"
  const iconOnly = crowded ? "@max-[1280px]/toolbar:size-9" : "@max-[1110px]/toolbar:size-9"
  /* Whether the actions have lost their words, which is when a button needs
     another way to say what it is. Read off the label itself, since the
     toolbar's own width is what hid it and CSS is the only thing that knows
     where that happens. */
  const actionsRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    const row = actionsRef.current
    const bar = row?.parentElement
    if (!row || !bar) return
    const read = () => {
      const label = row.querySelector<HTMLElement>("[data-action-label]")
      setCollapsed(label != null && label.offsetParent === null)
    }
    read()
    const watch = new ResizeObserver(read)
    watch.observe(bar)
    return () => watch.disconnect()
  }, [stuck])

  const actionButtons = (
        /* Named for anything that has to find the plan's actions on the page —
           the onboarding spotlight, which points at them. */
        <TooltipProvider delayDuration={200}>
        <div ref={actionsRef} data-tour="plan-actions" className="flex flex-wrap items-center gap-2">
          <PlanSwitcher labelsGo={labelsGo} iconOnly={iconOnly} collapsed={collapsed} />
          {shown.map((action) => {
            const button = (
              <Button
                aria-pressed={
                  action.toggles ? pressed : action.sidebar ? sidebar?.open : undefined
                }
                aria-label={action.label}
                onClick={() => (action.sidebar ? sidebar?.onToggle() : onAction?.(action))}
                className={cn("data-[state=open]:bg-gray-5", iconOnly)}
              >
                <Icon name={action.icon} size={16} />
                <span data-action-label className={labelsGo}>{action.label}</span>
                {/* How many of the details are on, so the button says what
                    the cards are carrying without opening it. */}
                {action.fields && (
                  <Badge variant="primary" className={labelsGo}>
                    {action.fields.filter((field) => field.shown).length}
                  </Badge>
                )}
              </Button>
            )

            /* Said on hover once the words are gone, with the count where the
               button carries one. */
            const tip = (
              <TooltipContent>
                {action.label}
                {action.fields &&
                  ` (${action.fields.filter((field) => field.shown).length} of ${action.fields.length})`}
              </TooltipContent>
            )

            if (action.choices) {
              return (
                <DropdownMenu key={action.label}>
                  <Tooltip>
                    <DropdownMenuTrigger asChild>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                    </DropdownMenuTrigger>
                    {collapsed && tip}
                  </Tooltip>
                  <DropdownMenuContent align="start" className="w-[260px]">
                    {action.choices.map((choice) => (
                      <DropdownMenuItem
                        key={choice.id}
                        onSelect={() => onChoose?.(choice.id)}
                        className="gap-2 py-1.5 text-body-md"
                      >
                        <Icon name={choice.icon} size={16} />
                        {choice.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }

            if (!action.fields) {
              return (
                <span key={action.label}>
                  <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    {collapsed && tip}
                  </Tooltip>
                </span>
              )
            }

            return (
              <DropdownMenu key={action.label}>
                <Tooltip>
                  <DropdownMenuTrigger asChild>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                  </DropdownMenuTrigger>
                  {collapsed && tip}
                </Tooltip>
                <DropdownMenuContent align="end" className="w-[200px]">
                  {action.fields.map((field) => (
                    <DropdownMenuItem
                      key={field.id}
                      /* Switching one detail on is rarely the only one you
                         want, so the menu stays open to take the next. */
                      onSelect={(event) => {
                        event.preventDefault()
                        onToggleField?.(field.id)
                      }}
                      className="gap-2 py-1.5 pr-2 pl-8 text-body-md"
                    >
                      <Icon
                        name={field.shown ? "remove-red-eye" : "visibility-off"}
                        size={16}
                        className={cn(
                          "absolute left-2 shrink-0",
                          field.shown ? "text-gray-100" : "text-gray-40"
                        )}
                      />
                      {field.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          })}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" aria-label="More options">
                <Icon name="more-horiz" size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>More options</TooltipContent>
          </Tooltip>
        </div>
        </TooltipProvider>
  )

  return (
    <>
      {/* Where you are, and what can be done to the plan: one bar, which holds
          at the top. Under it, where the plan stands. */}
      <div className="sticky -top-6 z-20 -m-6 flex flex-col">
        <div
          className={cn(
            "@container/toolbar flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b px-6 pt-6 pb-4 transition-colors",
            /* The edge belongs to the bottom of the block, not to this row: where
               a banner is held under it, the banner carries it. */
            stuck && !banner ? "border-gray-40" : "border-transparent",
            stuck && "bg-card"
          )}
        >
          <Crumbs tabs={tabs} term={term} />
          {actionButtons}
        </div>
        {banner?.(stuck)}
      </div>
      <span ref={sentinel} aria-hidden="true" className="hidden" />
      {progress && <PlanProgress progress={progress} />}
    </>
  )
}

/** The plans this student has, each with the programs it is for. First in the
 *  row, since everything after it is about that plan. Only the one exists, and
 *  making another goes nowhere yet. */
function PlanSwitcher({
  labelsGo,
  iconOnly,
  collapsed,
}: {
  labelsGo: string
  iconOnly: string
  collapsed: boolean
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button aria-label="Switch plan" className={cn("data-[state=open]:bg-gray-5", iconOnly)}>
              <Icon name="calendar-today" size={16} />
              <span data-action-label className={labelsGo}>
                Primary Plan
              </span>
              <Icon name="expand-more" size={16} className={labelsGo} />
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        {collapsed && <TooltipContent>Primary Plan</TooltipContent>}
      </Tooltip>
      <DropdownMenuContent align="start" className="w-[420px]">
        <DropdownMenuItem className="items-start gap-2 py-2 text-body-md">
          <Icon name="check" size={16} className="mt-0.5 shrink-0" />
          <span className="flex min-w-0 flex-col gap-2">
            <span className="font-semibold text-foreground">Primary Plan</span>
            <span className="flex flex-wrap items-center gap-1">
              {[`${DEGREE.credential} (${DEGREE.concentration})`, `Minor in ${DEGREE.minor}`].map(
                (program) => (
                  <Badge key={program} variant="outline" className="max-w-full">
                    <span className="min-w-0 truncate">{program}</span>
                  </Badge>
                )
              )}
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 py-1.5 text-body-md">
          <Icon name="plus" size={16} className="shrink-0" />
          Create new plan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Where you are: the student, for staff, then the years, then the term. On a
 *  term, "All Years" is the way back out to the whole plan. */
function Crumbs({ tabs, term }: { tabs: YearTab[]; term?: string }) {
  const overview = tabs[0]
  const label = overview?.label ?? "All Years"

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-h400 font-semibold">
      <CameFrom />
      {term ? (
        <>
          <button
            type="button"
            onClick={() => overview?.onSelect?.()}
            className="cursor-pointer rounded-md text-gray-80 outline-none hover:text-gray-100 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {label}
          </button>
          <Icon name="chevron-right" size={16} className="shrink-0 text-gray-80" />
          <span className="text-gray-100">{term}</span>
        </>
      ) : (
        <span className="text-gray-100">{label}</span>
      )}
    </nav>
  )
}

/** What the student has done, is doing and has left, as two meters: the
 *  courses, and the milestones on the way to the degree. */
export type PlanProgressData = {
  courses: { done: number; going: number; planned: number; remaining: number }
  milestones: { done: number; planned: number; remaining: number }
}

function Meter({
  title,
  icon,
  shares,
  className,
}: {
  title: string
  icon?: IconName
  shares: { label: string; count: number; bar: string }[]
  className?: string
}) {
  const total = shares.reduce((sum, share) => sum + share.count, 0)
  const held = shares.filter((share) => share.count > 0)
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="flex items-center gap-1 text-body-md font-semibold text-gray-100">
          {icon && <Icon name={icon} size={16} />}
          {title}
        </span>
        <span className="text-body-md text-gray-100">
          {held.map((share) => `${share.count} ${share.label}`).join(", ")}
        </span>
      </div>
      <span className="flex h-2 w-full overflow-hidden rounded-md bg-gray-40">
        {held.map((share) => (
          <span
            key={share.label}
            className={share.bar}
            style={{ width: `${total === 0 ? 0 : (share.count / total) * 100}%` }}
          />
        ))}
      </span>
    </div>
  )
}

function PlanProgress({ progress }: { progress: PlanProgressData }) {
  const { courses, milestones } = progress
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-4 pt-2 @3xl:grid-cols-[2fr_1fr]">
      <Meter
        title="Courses"
        shares={[
          { label: "completed", count: courses.done, bar: "bg-success-50" },
          { label: "in progress", count: courses.going, bar: "bg-warning-50" },
          { label: "planned", count: courses.planned, bar: "bg-warning-25" },
          { label: "remaining", count: courses.remaining, bar: "bg-gray-40" },
        ]}
      />
      <Meter
        title="Milestones"
        icon="outlined-flag"
        shares={[
          { label: "completed", count: milestones.done, bar: "bg-success-50" },
          { label: "planned", count: milestones.planned, bar: "bg-warning-25" },
          { label: "remaining", count: milestones.remaining, bar: "bg-gray-40" },
        ]}
      />
    </div>
  )
}
