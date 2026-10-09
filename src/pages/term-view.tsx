import { cn } from "cn"
import { useEffect, useState } from "react"

import { Icon } from "@/components/icon"
import {
  ADD_REMAINING,
  PlanHeader,
  reviewAction,
  type PlanAction,
  type YearTab,
} from "@/components/stellic/plan-header"
import { TermCalendar, type Preview } from "@/components/stellic/term-calendar"
import { TermList } from "@/components/stellic/term-list"
import { ActionLines } from "@/components/stellic/term-actions"
import { useRegistrable, useTermIssues } from "@/components/stellic/plan-issues"
import { worstOf } from "@/data/issues"
import { StatusPill } from "@/components/stellic/primitives"
import { usePendingReview } from "@/components/stellic/review-state"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CatalogEntry } from "@/data/catalog"
import {
  METADATA_FIELDS,
  registrationBanner,
  type MetadataField,
  type Term,
} from "@/data/plan"

/* One term on its own. Everything a term can show depends on whether its class
 * schedule is published: until it is, there are no times to put on a calendar,
 * so the list is all there is. */

function RegistrationAlert({
  term,
  onRegister,
  stuck,
}: {
  term: Term
  onRegister?: () => void
  /** Whether it is holding at the top of the pane rather than sitting in the
   *  page. Held, it is a strip across the top; at rest it is a card among the
   *  cards, the same as the line about what is wrong with the term below it. */
  stuck?: boolean
}) {
  const banner = registrationBanner(term, useRegistrable(term).length)
  const done = banner.state === "registered"

  return (
    /* Pinned, it is a strip across the top of the pane: square, edge to edge,
       and quieter than an alert in the flow — something that is always there
       cannot also be something that shouts. At rest it is the card it always
       was, lined up with everything else on the page. */
    /* The header block's negative margin eats the gap the page would put
       after it, so a banner at rest carries its own clearance from whatever
       is under it. */
    <div className={cn("w-full", stuck ? "" : "px-6 pb-6")}>
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-2 text-body-md",
        stuck
          /* The rule the toolbar carries when it holds moves down to whatever
             is last in the stack, so the block ends on one line rather than
             two — and the plan scrolling under it has an edge to pass. */
          ? "border-y px-6 py-3"
          : "rounded-md border px-[23px] py-[15px]",
        done ? "border-success-100 bg-success-5" : "border-gray-40 bg-primary-0"
      )}
    >
      <Icon
        name={done ? "check-circle" : "event-available"}
        size={16}
        className={cn("shrink-0", done ? "text-success-100" : "text-primary-100")}
      />
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
        <span className="font-semibold">{banner.title}</span>
        <span className="whitespace-nowrap">
          {banner.closesLabel}: {term.alert?.closes}
        </span>
        {banner.note && <span className="basis-full text-gray-80">{banner.note}</span>}
      </span>
      {/* There or not there: the window stays open and the banner stays where
          it is, but a button offering to register none of them is not an
          offer, so it goes rather than greying out. */}
      {banner.register != null && (
        <Button variant="primary" size="sm" className="shrink-0" onClick={onRegister}>
          Register {banner.register} course{banner.register === 1 ? "" : "s"}
        </Button>
      )}
    </div>
    </div>
  )
}

function ActionsAlert({
  term,
  onPickSection,
  onOpenCourse,
}: {
  term: Term
  onPickSection?: (termId: string, courseId: string) => void
  /** Opens the panel that fills this term to a credit target. */
  onGenerateTerm?: () => void
  /** Asks for a review of this term alone — the plan-wide first step is
   *  already answered, so the dialog opens on its second. */
  onRequestReview?: () => void
  /** Whether this prototype offers to generate the term or its schedule. */
  generators?: boolean
  /** The requirements panel the header's sidebar button opens. */
  sidebar?: { open: boolean; onToggle: () => void }
  /** What can be planned into this term, and what to do when one is. */
  addable?: CatalogEntry[]
  onAddCourse?: (entry: CatalogEntry) => void
  /** Opens one of the term's courses on its own, beside the term. */
  onOpenCourse?: (courseId: string) => void
  /** Opens a seat in the term, held or filled. */
  onOpenSeat?: (courseId: string) => void
  /** While a draft is up: show what the term already held alongside what is
   *  proposed, rather than the proposal on its own. */
  compare?: boolean
}) {
  const actions = useTermIssues(term)
  const worst = worstOf(actions)

  return (
    <Alert
      variant={worst === "error" ? "danger" : "warning"}
      className="flex-col items-start gap-2 p-[15px]"
    >
      <p className="text-body-md font-semibold text-gray-100">
        {actions.length} action{actions.length === 1 ? "" : "s"} required
      </p>
      <ActionLines
        term={term}
        onPickSection={onPickSection}
        onOpenCourse={onOpenCourse}
      />
    </Alert>
  )
}

export function TermView({
  term,
  tabs,
  metadata,
  onToggleField,
  onRegister,
  onPickSection,
  preview,
  onGenerateTerm,
  onRequestReview,
  requested = false,
  onShowReview,
  startOn,
  generators = true,
  sidebar,
  addable,
  onAddCourse,
  onSearchCourses,
  onOpenCourse,
  onOpenSeat,
  compare = true,
}: {
  term: Term
  /** The year filter, with the term's own year marked. It is also the way out:
   *  any other year, or All Years, goes back to the whole plan. */
  tabs: YearTab[]
  /** Which details the cards are showing. The menu is the same one the whole
   *  plan uses, so a change made here holds when you go back out to it. */
  metadata: MetadataField[]
  onToggleField: (id: string) => void
  onRegister?: () => void
  onPickSection?: (termId: string, courseId: string) => void
  /** A class the course panel beside this term is hovering over, drawn on the
   *  week in place of the one the student is in. */
  preview?: Preview
  /** Opens the panel that fills this term to a credit target. */
  onGenerateTerm?: () => void
  /** Asks for a review of this term alone — the plan-wide first step is
   *  already answered, so the dialog opens on its second. */
  onRequestReview?: () => void
  /** Which view to open on, where something asked for one — the course
   *  sidebar's View in Calendar. */
  startOn?: "calendar" | "list"
  /** A request is out on this term, and nothing has moved since. */
  requested?: boolean
  /** Opens the request that is out, beside the term. */
  onShowReview?: () => void
  /** Whether this prototype offers to generate the term or its schedule. */
  generators?: boolean
  /** The requirements panel the header's sidebar button opens. */
  sidebar?: { open: boolean; onToggle: () => void }
  /** What can be planned into this term, and what to do when one is. */
  addable?: CatalogEntry[]
  onAddCourse?: (entry: CatalogEntry) => void
  /** Opens the course search beside the term. */
  onSearchCourses?: () => void
  /** Opens one of the term's courses on its own, beside the term. */
  onOpenCourse?: (courseId: string) => void
  /** Opens a seat in the term, held or filled. */
  onOpenSeat?: (courseId: string) => void
  /** While a draft is up: show what the term already held alongside what is
   *  proposed, rather than the proposal on its own. */
  compare?: boolean
}) {
  /* A term under way or already taken opens on its calendar: the week is
   * settled and the week is the thing to look at. A term still being planned
   * opens on its list, even once its schedule is published — what is being
   * done there is choosing courses, and half of them may have no class yet. */
  const [mode, setMode] = useState<string>(
    startOn ?? (term.scheduled && term.state !== "planned" ? "calendar" : "list")
  )

  /* Unless a generated week arrives, which is a week to be read against the
   * one it replaces — so the term turns to its calendar to show it. */
  const proposing = term.scheduled === true && term.courses.some((c) => c.draft != null)
  useEffect(() => {
    if (proposing) setMode("calendar")
  }, [proposing])
  const actions = useTermIssues(term)
  const pending = usePendingReview(term.id)

  /* The same order as the plan's: what the cards show, filling the term,
     and having it looked at. */
  const plannerActions: PlanAction[] = [
    {
      label: "Plan details",
      icon: "remove-red-eye",
      fields: METADATA_FIELDS.map((field) => ({
        ...field,
        shown: metadata.includes(field.id),
      })),
    },
    ...(generators
      ? [
          {
            label: term.scheduled ? "Generate Schedule" : "Generate Term",
            icon: "design-services" as const,
            toggles: true,
          },
        ]
      : /* A prototype without the generators still has the scheduler, which is
           already a product — but only where there is a schedule to generate
           against, so it is there for a term whose week is out, in either view,
           and absent from one whose calendar is still disabled. It opens
           nothing here. */
        term.scheduled
        ? [{ label: "Generate Schedule", icon: "design-services" as const }]
        : []),
    ADD_REMAINING,
    reviewAction(requested),
  ]

  return (
    <main className="@container flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <PlanHeader
        actions={plannerActions}
        tabs={tabs}
        /* The registration window holds at the top with the toolbar. Only
           this one: a warning is about a course you can scroll to, and it
           belongs beside the term it is about. */
        banner={
          term.scheduled && term.alert
            ? (stuck) => <RegistrationAlert term={term} onRegister={onRegister} stuck={stuck} />
            : undefined
        }
        sidebar={sidebar}
        onToggleField={onToggleField}
        onAction={(action) => {
          if (action.toggles) onGenerateTerm?.()
          else if (action.label === "Request review") onRequestReview?.()
          else if (action.label === "Requested") onShowReview?.()
        }}
      />

      {/* The invitation is up in the toolbar; this is what stands in its way.
          A term can have registration open and still hold courses that cannot
          go through it yet. */}
      {actions.length > 0 && (
        <ActionsAlert
          term={term}
          onPickSection={onPickSection}
          onOpenCourse={onOpenCourse}
        />
      )}

      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-h300 font-semibold text-gray-100">{term.name}</h3>
          {/* Out for review: said beside the term's name, where the planner
              says it on the term's card. */}
          {pending && <StatusPill status="pending review">Pending Review</StatusPill>}
        </div>

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="list">
              <Icon name="list" size={16} />
              List
            </TabsTrigger>
            {/* Nothing to draw until the schedule is out. */}
            <TabsTrigger value="calendar" disabled={!term.scheduled}>
              <Icon name="calendar-month" size={16} />
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {mode === "calendar" && term.scheduled ? (
        <TermCalendar
          term={term}
          compare={compare}
          preview={preview}
          addable={addable}
          onAddCourse={onAddCourse}
          onSearchCourses={onSearchCourses}
          onOpenCourse={onOpenCourse}
          onOpenSeat={onOpenSeat}
        />
      ) : (
        <TermList
          term={term}
          addable={addable}
          onSearchCourses={onSearchCourses}
          onAddCourse={onAddCourse}
          onOpenCourse={onOpenCourse}
          onOpenSeat={onOpenSeat}
        />
      )}
    </main>
  )
}
