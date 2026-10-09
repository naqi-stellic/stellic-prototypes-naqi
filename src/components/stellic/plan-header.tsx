import { cn } from "cn"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { Icon, type IconName } from "@/components/icon"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
}

/** What the degree still wants, to be dragged into the plan. It sits beside
 *  Generate plan: one is the plan filled for you, the other by hand. */
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

/** A menu that opens on hover as well as on click. Hover is the quicker way
 *  to look down a year when you are pointing at it anyway; click stays the way
 *  it works, because on a touch screen it is the only way there is.
 *
 *  Both the trigger and the menu keep it open, with a moment's grace between
 *  them so crossing the gap does not close it. */
function HoverMenu({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  /* Whether this was opened by pointing rather than pressing. A hovered menu
     must not pull focus off whatever the keyboard was on. */
  const hovered = useRef(false)
  const leaving = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(leaving.current), [])

  const enter = (event: React.PointerEvent) => {
    /* Touch reports as "touch" and fires this on tap, which would open the
       menu and then let the click close it again. */
    if (event.pointerType !== "mouse") return
    window.clearTimeout(leaving.current)
    hovered.current = true
    setOpen(true)
  }
  const leave = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return
    leaving.current = window.setTimeout(() => setOpen(false), 140)
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        hovered.current = false
        setOpen(next)
      }}
      /* Not modal: a modal menu swallows the pointer everywhere else, so
         moving from one year to the next would not reach the next tab. */
      modal={false}
    >
      <DropdownMenuTrigger asChild onPointerEnter={enter} onPointerLeave={leave}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[200px]"
        onPointerEnter={enter}
        onPointerLeave={leave}
        /* Opened by pointing, so it must not take the focus off whatever the
           keyboard was on; opened by pressing, it should. */
        onCloseAutoFocus={(event) => hovered.current && event.preventDefault()}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
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

/** How far back up the pane has to come before the toolbar lets go again.
 *  Wider than the height the bar loses when a banner under it turns from a
 *  card into a strip, so sticking can never unstick itself. */
const SLACK = 64

export function PlanHeader({
  actions,
  tabs,
  banner,
  pressed,
  onAction,
  onToggleField,
  sidebar,
}: {
  actions: PlanAction[]
  tabs: YearTab[]
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
  /** The requirements panel this header's sidebar button opens.
   *  Omitted where there is nothing to open. */
  sidebar?: { open: boolean; onToggle: () => void }
}) {
  /* The last stretch of header above the toolbar. Once all of it is out of the
     pane the toolbar has reached the top and is holding there. */
  const sentinel = useRef<HTMLSpanElement>(null)
  const [stuck, setStuck] = useState(false)

  /* Read off the scroll position rather than watched for, and with a dead band
   * between sticking and letting go.
   *
   * Holding changes what the bar is: a banner under it becomes a strip, which
   * is shorter than the card it was. On a page with barely anything to scroll
   * that is a loop — sticking shortens the plan, the shorter plan scrolls back
   * up, the bar lets go, the card returns, and it sticks again, several times
   * a second. The band is wider than the height the bar can lose, so what
   * sticking does to the page cannot undo the sticking. */
  useEffect(() => {
    const mark = sentinel.current
    const pane = mark?.closest("main")
    if (!mark || !pane) return

    /* How far down the pane's own content the toolbar sits. Fixed: everything
       above it is the plan's name and what it is for, which do not move. */
    const at =
      mark.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop

    /* The band cannot reach above the top of the pane: with only the plan's
       name above it, the toolbar sticks within SLACK of the top, and a
       threshold below zero is one scrolling back up can never cross. At the
       top, it always lets go. */
    const release = Math.max(0, at - SLACK)
    const read = () =>
      setStuck((held) => (held ? pane.scrollTop > release : pane.scrollTop >= at))

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
  const crowded = shown.length > 3

  /* Step one: the actions keep their glyphs and lose their words. */
  /* Add remaining courses carries its words too, which is 148px more row
     (its label measures 130 at button-md, plus the gap and the padding an
     icon button does not have), so each step comes that much sooner. */
  const labelsGo = crowded ? "@max-[1280px]/toolbar:hidden" : "@max-[1110px]/toolbar:hidden"
  const iconOnly = crowded ? "@max-[1280px]/toolbar:size-9" : "@max-[1110px]/toolbar:size-9"
  /* Which year tabs survive the narrowest toolbar: the overview, always, and
     the year that is open — or, where the overview is what is open, the first
     year, so the row is never just one button. */
  const keeping = new Set<number>([0])
  const openYear = tabs.findIndex((tab, i) => i > 0 && tab.selected)
  keeping.add(openYear > 0 ? openYear : 1)

  /* Step two: even as glyphs the two groups no longer fit, so the years fold
     down to the two that are worth keeping. */
  const yearsGo = crowded ? "@max-[780px]/toolbar:hidden" : "@max-[740px]/toolbar:hidden"

  const actionButtons = (
        /* Named for anything that has to find the plan's actions on the page —
           the onboarding spotlight, which points at them. */
        <div data-tour="plan-actions" className="flex flex-wrap items-center gap-2">
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
                <span className={labelsGo}>{action.label}</span>
              </Button>
            )

            if (!action.fields) return <span key={action.label}>{button}</span>

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
          })}
          <Button size="icon" aria-label="More options">
            <Icon name="more-horiz" size={16} />
          </Button>
        </div>
  )

  return (
    <>
    <section className="relative flex flex-col gap-4">
      {/* Never in the way of a click: with the header down to one row, it sits
          over the action buttons. */}
      <span
        ref={sentinel}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-6"
      />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* Which of their plans. A student knows whose plan it is; the name
            only appears for staff, as the way back to the record they came
            from, set back in gray. */}
        <h2 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-h400 font-semibold">
          <CameFrom />
          <span className="flex items-center gap-1 text-gray-100">
            Primary Plan
            <Icon name="expand-more" size={16} />
          </span>
        </h2>
        {/* They are in the toolbar once it sticks, so they are never in two
            places at once. */}
        {!stuck && actionButtons}
      </div>

    </section>

    {/* Only this much of the header holds at the top: which years are in view,
        and what can be done to the plan. Everything above it — the plan's name
        and what it is for — is read once and scrolls away.

        `-m-6 p-6` takes back the pane's own padding and puts it back inside, so
        the bar paints edge to edge when it sticks without moving anything. */}
    <div
      className={cn(
        /* -top-6 rather than top-0: the bar's margin box is pulled out by the
           pane's padding, so it has to be pinned that much higher to come to
           rest flush against the top of the pane rather than 24px inside it. */
        "sticky -top-6 z-20 -m-6 flex flex-col"
      )}
    >
    {/* The ground and the rule under it belong to the state, not the shape: at
        rest the toolbar sits on the page like everything else, and only once
        it is holding at the top does it need a band to hold the plan off it. A
        banner below it is its own strip either way. */}
      <div
      className={cn(
        "@container/toolbar flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b p-6",
        "transition-colors",
        /* The edge belongs to the bottom of the block, not to this row: where
           a banner is held under it, the banner carries it. */
        stuck && !banner ? "border-gray-40 bg-card" : "border-transparent",
        stuck && "bg-card"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab, i) => {
          /* Narrower still, and the years go too — all but two of them.
             Whichever year is open stays, because it is the one you are
             standing in; the overview stays, because it is the way back out.
             On the canvas, where the overview is what is open, the year kept
             beside it is the one the plan starts in. The rest are a menu press
             away in the nav, and a second row of buttons is not. */
          const gone = !keeping.has(i) && yearsGo

          /* Step three, and the last thing there is to give: the overview keeps
             its glyph and loses its word. Only it can — a grid means the whole
             plan, where "2026-2027" as a symbol means nothing. */
          const overview = i === 0

          const button = (
            <Button
              size="sm"
              selected={tab.selected}
              onClick={tab.onSelect}
              aria-label={overview ? tab.label : undefined}
              /* Open reads as hovered, which is how the design marks the tab
                 whose menu is showing. */
              className={cn(
                "data-[state=open]:bg-gray-5",
                gone,
                overview && "@max-[470px]/toolbar:size-8"
              )}
            >
              {tab.icon && <Icon name={tab.icon} size={16} className={tab.tone} />}
              {overview ? (
                <span className="@max-[470px]/toolbar:hidden">{tab.label}</span>
              ) : (
                tab.label
              )}
            </Button>
          )

          if (!tab.terms || tab.terms.length === 0) {
            /* The wrapper goes with it: a flex item with nothing in it still
               takes the gap on either side of it. */
            return (
              <span key={tab.label} className={cn(gone)}>
                {button}
              </span>
            )
          }

          return (
            <HoverMenu key={tab.label} trigger={button}>
              {tab.terms.map((term) => (
                <DropdownMenuItem
                  key={term.id}
                  onSelect={() => tab.onSelectTerm?.(term.id)}
                  className="gap-2 py-1.5 pr-2 pl-8 text-body-md"
                >
                  {/* In the checkmark's place, so the labels line up whether
                      or not a term carries a mark. */}
                  <Icon
                    name={term.icon}
                    size={16}
                    className={cn("absolute left-2 shrink-0", term.tone)}
                  />
                  {term.label}
                </DropdownMenuItem>
              ))}
            </HoverMenu>
          )
        })}
      </div>

      {stuck && actionButtons}
    </div>
    {banner?.(stuck)}
    </div>
    </>
  )
}
