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

/** Request review, which is left out once a request is out on the plan as it
 *  stands: the request is read in its own panel, so there is nothing to make
 *  again. Any change to the plan makes it something to ask about again. */
export function reviewAction(requested: boolean): PlanAction[] {
  return requested ? [] : [{ label: "Request review", icon: "assignment" }]
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

/** The toolbar widths at which the actions give up their words, in steps, and
 *  only above the phone layout, where they take a row and keep their words. Tailwind
 *  reads class names from the source and cannot see one assembled at runtime,
 *  so every step is written out. */
const FIT: Record<number, { labels: string; icon: string }> = {
  600: { labels: "@min-[641px]/toolbar:@max-[600px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[600px]/toolbar:size-9" },
  620: { labels: "@min-[641px]/toolbar:@max-[620px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[620px]/toolbar:size-9" },
  640: { labels: "@min-[641px]/toolbar:@max-[640px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[640px]/toolbar:size-9" },
  660: { labels: "@min-[641px]/toolbar:@max-[660px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[660px]/toolbar:size-9" },
  680: { labels: "@min-[641px]/toolbar:@max-[680px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[680px]/toolbar:size-9" },
  700: { labels: "@min-[641px]/toolbar:@max-[700px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[700px]/toolbar:size-9" },
  720: { labels: "@min-[641px]/toolbar:@max-[720px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[720px]/toolbar:size-9" },
  740: { labels: "@min-[641px]/toolbar:@max-[740px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[740px]/toolbar:size-9" },
  760: { labels: "@min-[641px]/toolbar:@max-[760px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[760px]/toolbar:size-9" },
  780: { labels: "@min-[641px]/toolbar:@max-[780px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[780px]/toolbar:size-9" },
  800: { labels: "@min-[641px]/toolbar:@max-[800px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[800px]/toolbar:size-9" },
  820: { labels: "@min-[641px]/toolbar:@max-[820px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[820px]/toolbar:size-9" },
  840: { labels: "@min-[641px]/toolbar:@max-[840px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[840px]/toolbar:size-9" },
  860: { labels: "@min-[641px]/toolbar:@max-[860px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[860px]/toolbar:size-9" },
  880: { labels: "@min-[641px]/toolbar:@max-[880px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[880px]/toolbar:size-9" },
  900: { labels: "@min-[641px]/toolbar:@max-[900px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[900px]/toolbar:size-9" },
  920: { labels: "@min-[641px]/toolbar:@max-[920px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[920px]/toolbar:size-9" },
  940: { labels: "@min-[641px]/toolbar:@max-[940px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[940px]/toolbar:size-9" },
  960: { labels: "@min-[641px]/toolbar:@max-[960px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[960px]/toolbar:size-9" },
  980: { labels: "@min-[641px]/toolbar:@max-[980px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[980px]/toolbar:size-9" },
  1000: { labels: "@min-[641px]/toolbar:@max-[1000px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1000px]/toolbar:size-9" },
  1020: { labels: "@min-[641px]/toolbar:@max-[1020px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1020px]/toolbar:size-9" },
  1040: { labels: "@min-[641px]/toolbar:@max-[1040px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1040px]/toolbar:size-9" },
  1060: { labels: "@min-[641px]/toolbar:@max-[1060px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1060px]/toolbar:size-9" },
  1080: { labels: "@min-[641px]/toolbar:@max-[1080px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1080px]/toolbar:size-9" },
  1100: { labels: "@min-[641px]/toolbar:@max-[1100px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1100px]/toolbar:size-9" },
  1120: { labels: "@min-[641px]/toolbar:@max-[1120px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1120px]/toolbar:size-9" },
  1140: { labels: "@min-[641px]/toolbar:@max-[1140px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1140px]/toolbar:size-9" },
  1160: { labels: "@min-[641px]/toolbar:@max-[1160px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1160px]/toolbar:size-9" },
  1180: { labels: "@min-[641px]/toolbar:@max-[1180px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1180px]/toolbar:size-9" },
  1200: { labels: "@min-[641px]/toolbar:@max-[1200px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1200px]/toolbar:size-9" },
  1220: { labels: "@min-[641px]/toolbar:@max-[1220px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1220px]/toolbar:size-9" },
  1240: { labels: "@min-[641px]/toolbar:@max-[1240px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1240px]/toolbar:size-9" },
  1260: { labels: "@min-[641px]/toolbar:@max-[1260px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1260px]/toolbar:size-9" },
  1280: { labels: "@min-[641px]/toolbar:@max-[1280px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1280px]/toolbar:size-9" },
  1300: { labels: "@min-[641px]/toolbar:@max-[1300px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1300px]/toolbar:size-9" },
  1320: { labels: "@min-[641px]/toolbar:@max-[1320px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1320px]/toolbar:size-9" },
  1340: { labels: "@min-[641px]/toolbar:@max-[1340px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1340px]/toolbar:size-9" },
  1360: { labels: "@min-[641px]/toolbar:@max-[1360px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1360px]/toolbar:size-9" },
  1380: { labels: "@min-[641px]/toolbar:@max-[1380px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1380px]/toolbar:size-9" },
  1400: { labels: "@min-[641px]/toolbar:@max-[1400px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1400px]/toolbar:size-9" },
  1420: { labels: "@min-[641px]/toolbar:@max-[1420px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1420px]/toolbar:size-9" },
  1440: { labels: "@min-[641px]/toolbar:@max-[1440px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1440px]/toolbar:size-9" },
  1460: { labels: "@min-[641px]/toolbar:@max-[1460px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1460px]/toolbar:size-9" },
  1480: { labels: "@min-[641px]/toolbar:@max-[1480px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1480px]/toolbar:size-9" },
  1500: { labels: "@min-[641px]/toolbar:@max-[1500px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1500px]/toolbar:size-9" },
  1520: { labels: "@min-[641px]/toolbar:@max-[1520px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1520px]/toolbar:size-9" },
  1540: { labels: "@min-[641px]/toolbar:@max-[1540px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1540px]/toolbar:size-9" },
  1560: { labels: "@min-[641px]/toolbar:@max-[1560px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1560px]/toolbar:size-9" },
  1580: { labels: "@min-[641px]/toolbar:@max-[1580px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1580px]/toolbar:size-9" },
  1600: { labels: "@min-[641px]/toolbar:@max-[1600px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1600px]/toolbar:size-9" },
  1620: { labels: "@min-[641px]/toolbar:@max-[1620px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1620px]/toolbar:size-9" },
  1640: { labels: "@min-[641px]/toolbar:@max-[1640px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1640px]/toolbar:size-9" },
  1660: { labels: "@min-[641px]/toolbar:@max-[1660px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1660px]/toolbar:size-9" },
  1680: { labels: "@min-[641px]/toolbar:@max-[1680px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1680px]/toolbar:size-9" },
  1700: { labels: "@min-[641px]/toolbar:@max-[1700px]/toolbar:hidden", icon: "@min-[641px]/toolbar:@max-[1700px]/toolbar:size-9" },
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
  /* Widths of the toolbar's content, measured off the rendered rows. Words go in
     stages as the bar narrows: the switch first, then the two that say which
     plan and how it looks, and only last the ones that do something to it,
     since those are what the page is for. */
  const group1Full = 318 // My Plan and Course details, with words, a badge and carets
  const group1Icons = 80
  const group2Full = 377 + (shown.length >= 4 ? 200 : 0) // Complete my plan, Request review, more
  const divider = 33
  const gap = 16
  /* The crumbs alone; the term's switch beside them, with its words and without;
     the review tag; the student's name where staff are looking at a plan. */
  const beside = (status ? 100 : 0) + (cameFrom() ? 150 : 0)
  const leftFull = (view ? 440 : 85) + beside
  const leftSwitchIcons = (view ? 330 : 85) + beside
  const stepFor = (need: number) =>
    FIT[FIT_STEPS.find((width) => width >= need) ?? FIT_STEPS[FIT_STEPS.length - 1]]
  const switchFit = stepFor(leftFull + gap + group1Full + divider + group2Full)
  const fit1 = stepFor(leftSwitchIcons + gap + group1Full + divider + group2Full)
  const fit2 = stepFor(leftSwitchIcons + gap + group1Icons + divider + group2Full)
  /* On a phone the two buttons of the first row each take half of it. */
  const fillRow = "@max-[640px]/toolbar:flex-1"

  /* Whether a group has lost its words, which is when its buttons need another
     way to say what they are. Read off the label itself, since the toolbar's
     own width is what hid it and CSS is the only thing that knows where. */
  const actionsRef = useRef<HTMLDivElement>(null)
  const [collapsed1, setCollapsed1] = useState(false)
  const [collapsed2, setCollapsed2] = useState(false)
  useEffect(() => {
    const row = actionsRef.current
    const bar = row?.parentElement
    if (!row || !bar) return
    const hidden = (group: string) => {
      const label = row.querySelector<HTMLElement>(`[data-group="${group}"] [data-action-label]`)
      return label != null && label.offsetParent === null
    }
    const read = () => {
      setCollapsed1(hidden("1"))
      setCollapsed2(hidden("2"))
    }
    read()
    const watch = new ResizeObserver(read)
    watch.observe(bar)
    return () => watch.disconnect()
  }, [stuck])

  /* One of the plan's buttons, with the menu it opens where it opens one. */
  const renderAction = (action: PlanAction) => {
    const labelsGo = (action.fields ? fit1 : fit2).labels
    const iconOnly = (action.fields ? fit1 : fit2).icon
    const collapsed = action.fields ? collapsed1 : collapsed2
    const button = (
      <Button
        aria-pressed={
          action.toggles ? pressed : action.sidebar ? sidebar?.open : undefined
        }
        aria-label={action.label}
        onClick={() => (action.sidebar ? sidebar?.onToggle() : onAction?.(action))}
        className={cn("data-[state=open]:bg-gray-5", iconOnly, action.fields && fillRow)}
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
        {/* A button that opens a menu says so; one that acts does not. */}
        {(action.fields || action.choices) && (
          <Icon
            name="expand-more"
            size={16}
            className={cn(labelsGo, action.choices && "@max-[640px]/toolbar:hidden")}
          />
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
  }

  /* Two groups, by what a button is for: the ones that say which plan and how
     it looks, and the ones that do something to it. */
  const viewActions = shown.filter((action) => action.fields)
  const doActions = shown.filter((action) => !action.fields)

  const actionButtons = (
        /* Named for anything that has to find the plan's actions on the page —
           the onboarding spotlight, which points at them. */
        <TooltipProvider delayDuration={200}>
        <div
          ref={actionsRef}
          data-tour="plan-actions"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 @max-[640px]/toolbar:w-full @max-[640px]/toolbar:gap-x-2"
        >
          {/* On a phone the two that say which plan and how it looks share a
              row, each half of it. */}
          <div data-group="1" className="flex items-center gap-2 @max-[640px]/toolbar:w-full">
            <PlanSwitcher
              labelsGo={fit1.labels}
              iconOnly={cn(fit1.icon, fillRow)}
              collapsed={collapsed1}
            />
            {viewActions.map(renderAction)}
          </div>
          {/* The line between the two groups, which a phone does not need: the
              groups are on rows of their own. */}
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-gray-40 @max-[640px]/toolbar:hidden" />
          {/* The three that do something to the plan stay in the row with the rest.
              The moment the bar is narrow enough to put them on a line of their
              own they go, since a plan on a phone is for reading. */}
          <div data-group="2" className="flex items-center gap-2 @max-[640px]/toolbar:hidden">
            {doActions.map(renderAction)}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" aria-label="More options">
                  <Icon name="more-horiz" size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>More options</TooltipContent>
            </Tooltip>
          </div>
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
            "@container/toolbar flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b px-6 pt-6 pb-6 transition-colors max-sm:px-4",
            /* The edge belongs to the bottom of the block, not to this row: where
               a banner is held under it, the banner carries it. */
            stuck && !banner ? "border-gray-40" : "border-transparent",
            stuck && "bg-card"
          )}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-3 @max-[640px]/toolbar:w-full @max-[640px]/toolbar:gap-x-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Crumbs tabs={tabs} term={term} />
              {status}
            </div>
            {/* On a phone the switch has its words and stands at the right,
                beside the crumbs or on the line under them. */}
            <div className="@max-[640px]/toolbar:ml-auto">{view?.(switchFit.labels)}</div>
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
      <div className="flex w-full max-w-[1024px] flex-col gap-2 pt-2">
        <p className="text-caption-md font-medium text-gray-100">Courses</p>
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
