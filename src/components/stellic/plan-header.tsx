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
import { PLAN_NAME, STUDENT } from "@/data/plan"

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
  /* Widths of the toolbar's content, measured off the rendered rows. The
     buttons carry no icon, so they always keep their words and wrap to a line
     of their own when the bar is narrow; only the switch, whose buttons have
     icons, gives up its words. */
  const group1Full = 318 // My Plan and Course details, with a badge and carets
  const group2Full = 377 + (shown.length >= 4 ? 200 : 0) // Complete my plan, Request review, more
  const divider = 33
  const gap = 16
  /* The crumbs, with the review tag and the student's name where staff are
     looking at a plan, and the switch beside them, with its words and without. */
  const beside = (status ? 100 : 0) + (cameFrom() ? 150 : 0)
  const left = (view ? 240 : 85) + beside
  const switchFull = view ? 232 : 0
  const switchIcons = view ? 122 : 0
  const stepFor = (need: number) =>
    FIT[FIT_STEPS.find((width) => width >= need) ?? FIT_STEPS[FIT_STEPS.length - 1]]
  const switchFit = stepFor(left + switchFull + gap + group1Full + divider + group2Full)
  /* The width the whole row needs once the switch has dropped its words, which
     is the last thing to give. Narrower than that the controls go to a line of
     their own. */
  const rowNeeds = left + switchIcons + gap + group1Full + divider + group2Full
  /* On a phone the four buttons are a two by two grid, each the width of its column. */
  const fillRow = "@max-[640px]/toolbar:w-full"

  const hasProgress = progress != null
  /* How wide the toolbar has to lay out in, to know whether the controls have
     gone below the name. */
  const toolbar = useRef<HTMLDivElement>(null)
  const [toolbarWidth, setToolbarWidth] = useState(0)
  useEffect(() => {
    const row = toolbar.current
    if (!row) return
    const read = (entries: ResizeObserverEntry[]) => setToolbarWidth(entries[0].contentRect.width)
    const watch = new ResizeObserver(read)
    watch.observe(row)
    return () => watch.disconnect()
  }, [])
  const rowWraps = toolbarWidth > 0 && toolbarWidth < rowNeeds
  const controlsBelow = hasProgress && rowWraps
  /* One of the plan's buttons, with the menu it opens where it opens one. */
  const renderAction = (action: PlanAction) => {
    const button = (
      <Button
        aria-pressed={
          action.toggles ? pressed : action.sidebar ? sidebar?.open : undefined
        }
        aria-label={action.label}
        onClick={() => (action.sidebar ? sidebar?.onToggle() : onAction?.(action))}
        className={cn("data-[state=open]:bg-gray-5", fillRow)}
      >
        {action.label}
        {/* How many of the details are on, so the button says what
            the cards are carrying without opening it. */}
        {action.fields && action.fields.some((field) => field.shown) && (
          <Badge variant="primary">
            {action.fields.filter((field) => field.shown).length}
          </Badge>
        )}
        {/* A button that opens a menu says so; one that acts does not. */}
        {(action.fields || action.choices) && (
          <Icon name="expand-more" size={16} />
        )}
      </Button>
    )

    if (action.choices) {
      return (
        <DropdownMenu key={action.label}>
          <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
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
        <span key={action.label} className="@max-[640px]/toolbar:flex">
          {button}
        </span>
      )
    }

    return (
      <DropdownMenu key={action.label}>
        <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
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
          data-tour="plan-actions"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 @max-[640px]/toolbar:grid @max-[640px]/toolbar:w-full @max-[640px]/toolbar:grid-cols-2 @max-[640px]/toolbar:gap-2"
        >
          {/* On a phone the two that say which plan and how it looks share a
              row, each half of it. */}
          <div data-group="1" className="flex items-center gap-2 @max-[640px]/toolbar:contents">
            <PlanSwitcher className={fillRow} />
            {viewActions.map(renderAction)}
          </div>
          {/* The line between the two groups, which a phone does not need: the
              groups are on rows of their own. */}
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-gray-40 @max-[640px]/toolbar:hidden" />
          {/* The three that do something to the plan stay in the row with the rest,
              and on a phone take a row of their own. */}
          <div data-group="2" className="flex items-center gap-2 @max-[640px]/toolbar:contents">
            {doActions.map(renderAction)}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" aria-label="More options" className="@max-[640px]/toolbar:hidden">
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
          ref={toolbar}
          className={cn(
            "@container/toolbar flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b px-6 pt-6 transition-colors max-sm:px-4",
            /* With the bar and the controls under the name, the three stand an
               equal distance apart. */
            controlsBelow && "gap-y-4",
            /* The bar under the name stands a little way from it. */
            progress ? "pb-4" : "pb-6",

            /* The edge belongs to the bottom of the block, not to this row: where
               a banner is held under it, the banner carries it. */
            stuck && !banner ? "border-gray-40" : "border-transparent",
            stuck && "bg-card"
          )}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-3 @max-[640px]/toolbar:w-full">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Crumbs tabs={tabs} term={term} />
              {status}
            </div>
            {/* How the page is read, beside where it is. */}
            {view && (
              <div className="@max-[640px]/toolbar:ml-auto">
                {view(rowWraps ? "" : switchFit.labels)}
              </div>
            )}
          </div>
          {/* With the controls on a line of their own, the bar stays with the
              name and they go under it. */}
          {controlsBelow && progress && (
            /* As far from the controls as the controls are from the first year:
               the toolbar's 12px, the page's 24px and the years' 8px, less the
               16px the rows already stand apart. */
            <div className="w-full pb-7">
              <ProgressBlock progress={progress} />
            </div>
          )}
          {actionButtons}
        </div>
        {banner?.(stuck)}
      </div>
      <span ref={sentinel} aria-hidden="true" className="hidden" />
      {progress && !controlsBelow && (
        <div>
          <ProgressBlock progress={progress} />
        </div>
      )}
    </>
  )
}

/** The plans this student has, each with the programs it is for. First in the
 *  row, since everything after it is about that plan. Only the one exists, and
 *  making another goes nowhere yet. */
function PlanSwitcher({ className }: { className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Switch plan" className={cn("data-[state=open]:bg-gray-5", className)}>
          {/* Fixed in width, so a longer plan name truncates rather than moving
              the toolbar. */}
          <span className="flex w-[100px] gap-1 text-left">
            <span className="shrink-0 text-gray-80">Plan:</span>
            <span className="min-w-0 truncate">{PLAN_NAME}</span>
          </span>
          <Icon name="expand-more" size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px]">
        {/* The plan you are in, and that it is the main one: "Primary" is for
            whoever has others to tell it from, so it is a badge in here and the
            button just says whose plan it is. */}
        <DropdownMenuItem className="items-start gap-2 py-2 text-body-md">
          <Icon name="check" size={16} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 font-semibold text-foreground">{PLAN_NAME}</span>
          <Badge variant="success" className="mt-px shrink-0">
            Primary
          </Badge>
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
 *  term, "My Plan" is the way back out to the whole plan. */
function Crumbs({ tabs, term }: { tabs: YearTab[]; term?: string }) {
  const overview = tabs[0]
  const label = overview?.label ?? "My Plan"

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

/** The four shares the planner is read in: done, registered, placed in a term
 *  but not yet registered (which is where a generated plan lands), and what is
 *  still to place. */
function progressRows(progress: PlanProgressData) {
  const { courses, credits } = progress
  return [
    {
      label: "Completed",
      count: courses.done,
      credits: credits.done,
      bar: "bg-success-50",
      dot: "bg-success-50",
    },
    {
      label: "Registered",
      count: courses.going,
      credits: credits.going,
      bar: "bg-warning-75",
      dot: "bg-warning-50",
    },
    {
      label: "Planned",
      count: courses.planned,
      credits: credits.planned,
      bar: "bg-warning-25",
      dot: "bg-warning-25",
    },
    {
      label: "Remaining",
      count: courses.remaining,
      credits: credits.remaining,
      bar: "bg-gray-40",
      dot: "bg-gray-60",
    },
  ]
}

/** A bar under the page's name, rounded at its ends: done, registered,
 *  planned, and what is left. Each share says where it stands on
 *  hover, with the one being pointed at set in bold. */
function PlanProgressBar({ progress }: { progress: PlanProgressData }) {
  const rows = progressRows(progress)
  const total = rows.reduce((sum, row) => sum + row.count, 0)

  return (
    <div role="img" aria-label="Plan progress" className="flex h-2 w-full shrink-0 overflow-hidden rounded-full">
      {rows.map((row, i) => (
        <HoverCard.Root key={row.label} openDelay={60} closeDelay={60}>
          <HoverCard.Trigger asChild>
            <span
              /* A white hairline between shares, so two oranges meeting would
                 not read as one. */
              className={cn(row.bar, i < rows.length - 1 && "border-r border-white")}
              style={{ width: `${(row.count / total) * 100}%` }}
            />
          </HoverCard.Trigger>
          <HoverCard.Portal>
            <HoverCard.Content
              side="bottom"
              align="center"
              sideOffset={8}
              className="z-50 w-[340px] rounded-md border border-gray-40 bg-card p-4 text-body-md shadow-lg"
            >
              <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2">
                {rows.map((other, j) => (
                  <div key={other.label} className="contents">
                    <dt className={j === i ? "font-semibold text-gray-100" : "text-gray-80"}>
                      {other.label}
                    </dt>
                    <dd className={j === i ? "font-semibold text-gray-100" : "text-gray-80"}>
                      {plural(other.count, "course")} ({plural(other.credits, "credit")})
                    </dd>
                  </div>
                ))}
              </dl>
              <HoverCard.Arrow className="fill-card" />
            </HoverCard.Content>
          </HoverCard.Portal>
        </HoverCard.Root>
      ))}
    </div>
  )
}

/** The bar, and what it counts in words, one under the other. */
function ProgressBlock({ progress }: { progress: PlanProgressData }) {
  return (
    /* As wide as the counts under it, and a little over: the bar reaches 24px
       past where the last of them ends, but not off a phone's screen. */
    <div className="flex w-fit max-w-full flex-col gap-2">
      <div className="mr-[-24px] max-sm:mr-0">
        <PlanProgressBar progress={progress} />
      </div>
      <PlanLegend progress={progress} />
    </div>
  )
}

/** The bar's counts, in words, under it. */
function PlanLegend({ progress }: { progress: PlanProgressData }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-[17px] gap-y-1">
      {progressRows(progress).map((row) => (
        <li key={row.label} className="flex items-center gap-2 px-0.5 text-body-md text-gray-80">
          <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", row.dot)} />
          {row.count} {row.label.toLowerCase()}
        </li>
      ))}
    </ul>
  )
}
