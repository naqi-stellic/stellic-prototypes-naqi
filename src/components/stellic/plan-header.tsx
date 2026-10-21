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
import { HoverCard } from "radix-ui"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ShareBar } from "@/components/stellic/student-profile"
import { STUDENT } from "@/data/plan"

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

/** The toolbar widths at which the actions give up their words, in steps. Tailwind
 *  reads class names from the source and cannot see one assembled at runtime,
 *  so every step is written out. */
const FIT: Record<number, { labels: string; icon: string }> = {
  880: { labels: "@max-[880px]/toolbar:hidden", icon: "@max-[880px]/toolbar:size-9" },
  920: { labels: "@max-[920px]/toolbar:hidden", icon: "@max-[920px]/toolbar:size-9" },
  960: { labels: "@max-[960px]/toolbar:hidden", icon: "@max-[960px]/toolbar:size-9" },
  1000: { labels: "@max-[1000px]/toolbar:hidden", icon: "@max-[1000px]/toolbar:size-9" },
  1040: { labels: "@max-[1040px]/toolbar:hidden", icon: "@max-[1040px]/toolbar:size-9" },
  1080: { labels: "@max-[1080px]/toolbar:hidden", icon: "@max-[1080px]/toolbar:size-9" },
  1120: { labels: "@max-[1120px]/toolbar:hidden", icon: "@max-[1120px]/toolbar:size-9" },
  1160: { labels: "@max-[1160px]/toolbar:hidden", icon: "@max-[1160px]/toolbar:size-9" },
  1200: { labels: "@max-[1200px]/toolbar:hidden", icon: "@max-[1200px]/toolbar:size-9" },
  1240: { labels: "@max-[1240px]/toolbar:hidden", icon: "@max-[1240px]/toolbar:size-9" },
  1280: { labels: "@max-[1280px]/toolbar:hidden", icon: "@max-[1280px]/toolbar:size-9" },
  1320: { labels: "@max-[1320px]/toolbar:hidden", icon: "@max-[1320px]/toolbar:size-9" },
  1360: { labels: "@max-[1360px]/toolbar:hidden", icon: "@max-[1360px]/toolbar:size-9" },
  1400: { labels: "@max-[1400px]/toolbar:hidden", icon: "@max-[1400px]/toolbar:size-9" },
  1440: { labels: "@max-[1440px]/toolbar:hidden", icon: "@max-[1440px]/toolbar:size-9" },
  1480: { labels: "@max-[1480px]/toolbar:hidden", icon: "@max-[1480px]/toolbar:size-9" },
  1520: { labels: "@max-[1520px]/toolbar:hidden", icon: "@max-[1520px]/toolbar:size-9" },
  1560: { labels: "@max-[1560px]/toolbar:hidden", icon: "@max-[1560px]/toolbar:size-9" },
  1600: { labels: "@max-[1600px]/toolbar:hidden", icon: "@max-[1600px]/toolbar:size-9" },
}
const FIT_STEPS = Object.keys(FIT).map(Number)

export function PlanHeader({
  actions,
  tabs,
  term,
  status,
  view,
  progress,
  banner,
  pressed,
  onAction,
  onToggleField,
  onChoose,
  sidebar,
}: {
  actions: PlanAction[]
  /** The planner and its years: the first is the way back out to the whole plan. */
  tabs: YearTab[]
  /** The term the page is on, where it is on one: the last crumb. */
  term?: string
  /** Where the term stands with the advisor, right after its name. */
  status?: ReactNode
  /** How the page is read, beside the crumbs: a term's list or its calendar. */
  view?: (labelsGo: string) => ReactNode
  /** Where the student stands, as the two meters under the bar. */
  progress?: PlanProgressData
  /** A banner that holds at the top with the toolbar rather than scrolling
   *  away under it: the registration window, say, which is the one thing worth
   *  keeping in reach the whole way down a term. It is given whether the
   *  toolbar is holding, because a card in the page and a strip pinned to the
   *  top are not the same shape. */
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
    /* Two distances, not one: a banner turning from a card into a strip is
       shorter, and a page with little to scroll would otherwise let go the
       moment it took hold. */
    const read = () => setStuck((held) => (held ? pane.scrollTop > 2 : pane.scrollTop > 16))
    read()
    pane.addEventListener("scroll", read, { passive: true })
    return () => pane.removeEventListener("scroll", read)
  }, [])

  /* Narrow, the actions lose their words rather than their line, but only when
   * the row would not hold them.
   *
   * The bar is two groups: where you are, and what can be done to the plan. How
   * much room the actions need depends on what stands beside them — a term has
   * the list and calendar switch and sometimes a review tag, a staff member has
   * the student's name in front — and on how many actions there are, so the
   * width at which the words go is worked out from those, measured off the
   * rendered rows, and not one number for every page. Against the toolbar's own
   * width, since the pane resizes and the panel beside it comes and goes. */
  /* Only the actions this page will draw: Add remaining goes where there is
     no panel for it to open. */
  const shown = actions.filter((action) => !action.sidebar || sidebar)
  /* The plan switcher, Course details, Complete my plan, Request review and the
     more menu with their words and gaps; a fourth action takes another button. */
  const actionsWidth = 725 + (shown.length >= 4 ? 200 : 0)
  /* The crumbs alone; the term's switch beside them; the review tag; the
     student's name where staff are looking at a plan. */
  const beside = (status ? 100 : 0) + (cameFrom() ? 150 : 0)
  const stepFor = (need: number) =>
    FIT[FIT_STEPS.find((width) => width >= need) ?? FIT_STEPS[FIT_STEPS.length - 1]]
  /* The switch goes to its glyphs first: with its words it is the widest thing
     in the bar and the least needed, so the buttons keep theirs until it has
     given up its own. */
  const switchFit = stepFor((view ? 440 : 115) + beside + actionsWidth + 64)
  const fit = stepFor((view ? 330 : 115) + beside + actionsWidth + 64)
  const labelsGo = fit.labels
  const iconOnly = fit.icon

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
                {action.fields && action.fields.some((field) => field.shown) && (
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
          at the top, with the registration window held under it. */}
      <div className="sticky -top-6 z-20 -m-6 flex flex-col">
        <div
          className={cn(
            "@container/toolbar flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b px-6 pt-6 pb-6 transition-colors",
            /* The edge belongs to the bottom of the block, not to this row: where
               a banner is held under it, the banner carries it. */
            stuck && !banner ? "border-gray-40" : "border-transparent",
            stuck && "bg-card"
          )}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Crumbs tabs={tabs} term={term} />
              {status}
            </div>
            {view?.(switchFit.labels)}
          </div>
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
                My Plan
              </span>
              <Icon name="expand-more" size={16} className={labelsGo} />
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        {collapsed && <TooltipContent>My Plan</TooltipContent>}
      </Tooltip>
      <DropdownMenuContent align="start" className="w-[260px]">
        {/* The plan you are in, and that it is the main one: "Primary" is for
            whoever has others to tell it from, so it is a badge in here and the
            button just says whose plan it is. */}
        <DropdownMenuItem className="gap-2 py-2 text-body-md">
          <Icon name="check" size={16} className="shrink-0" />
          <span className="font-semibold text-foreground">My Plan</span>
          <Badge variant="success">Primary</Badge>
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
 *  term, "Planner" is the way back out to the whole plan. */
function Crumbs({ tabs, term }: { tabs: YearTab[]; term?: string }) {
  const overview = tabs[0]
  const label = overview?.label ?? "Planner"

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

/** What the student has done, is doing and has left, as one meter of the courses,
 *  with the credits behind each count for what is said on hover. */
export type PlanProgressData = {
  courses: { done: number; going: number; planned: number; remaining: number }
  credits: { done: number; going: number; planned: number; remaining: number }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

function PlanProgress({ progress }: { progress: PlanProgressData }) {
  const { courses, credits } = progress
  const rows = [
    { label: "Completed", count: courses.done, credits: credits.done, colour: "bg-success-50" },
    { label: "In progress", count: courses.going, credits: credits.going, colour: "bg-warning-50" },
    { label: "Planned", count: courses.planned, credits: credits.planned, colour: "bg-warning-25" },
    { label: "Remaining", count: courses.remaining, credits: credits.remaining, colour: "bg-gray-40" },
  ]

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex w-full flex-col gap-2 pt-2">
        <p className="text-body-md text-gray-100">Courses</p>
        {/* The bar the compliance screen draws, read off the planner's own
            counts: done, under way, placed in a term, and still to place. */}
        <ShareBar
          shares={rows.map((row) => ({ count: row.count, colour: row.colour, dot: row.colour }))}
          /* Its name, on its dot. */
          dotted={(node, i) => (
            <Tooltip>
              <TooltipTrigger asChild>{node}</TooltipTrigger>
              <TooltipContent>{rows[i].label}</TooltipContent>
            </Tooltip>
          )}
          /* Its place among the others, on its length of the bar, with the one
             being pointed at set in bold. */
          segment={(node, i) => (
            <HoverCard.Root openDelay={60} closeDelay={60}>
              <HoverCard.Trigger asChild>{node}</HoverCard.Trigger>
              <HoverCard.Portal>
                <HoverCard.Content
                  side="top"
                  align="center"
                  sideOffset={8}
                  className="z-50 w-[340px] rounded-md border border-gray-40 bg-card p-4 text-body-md shadow-lg"
                >
                  <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2">
                    {rows.map((row, j) => (
                      <div key={row.label} className="contents">
                        <dt className={j === i ? "font-semibold text-gray-100" : "text-gray-80"}>
                          {row.label}
                        </dt>
                        <dd className={j === i ? "font-semibold text-gray-100" : "text-gray-80"}>
                          {plural(row.count, "course")} ({plural(row.credits, "credit")})
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <HoverCard.Arrow className="fill-card" />
                </HoverCard.Content>
              </HoverCard.Portal>
            </HoverCard.Root>
          )}
        />
      </div>
    </TooltipProvider>
  )
}
