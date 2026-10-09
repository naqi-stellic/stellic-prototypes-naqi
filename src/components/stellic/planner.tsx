import { useDroppable } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "cn"
import type { ReactNode } from "react"

import { Icon } from "@/components/icon"
import { DRAFT_STYLE, DraftNote, isStruck } from "@/components/stellic/draft-mark"
import { CourseActivity, CourseTags, useMetadata } from "@/components/stellic/course-metadata"
import { TermActions } from "@/components/stellic/term-actions"
import { AddSlot, AuditIcon, StatusPill } from "@/components/stellic/primitives"
import { useCourseIssues } from "@/components/stellic/plan-issues"
import { usePendingReview } from "@/components/stellic/review-state"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  CREDIT_GROUP_LABEL,
  canAddTerm,
  creditGroup,
  termCredits,
  termGroups,
  termMeta,
  type PlannedCourse,
  type Term,
  type Year,
  type YearPhase,
} from "@/data/plan"

/* ============================================================ AuditRow
   One course inside a semester card. Padding subtracts the border width
   (see button.tsx for why). */

/** Stands in where a row is drawn outside a term — the card riding the drag
 *  overlay — so the hook is called either way. */
const NO_TERM: Term = {
  id: "",
  name: "",
  window: "",
  reviewed: false,
  state: "planned",
  courses: [],
}

/** How far apart the cards of a landing draft arrive. The tallies count in
 *  step with it, so the same value drives both. */
export const STREAM_MS = 130

/** The last card that gets a delay of its own; past this the tail lands
 *  together rather than keeping a long plan arriving for half a minute. */
export const STREAM_CAP = 36

/** Entrance delay. The generator places one course at a time and the cards
 *  follow it, far enough apart to be seen arriving one by one. */
function enterDelay(order: number): string {
  return `${Math.min(order, STREAM_CAP) * STREAM_MS}ms`
}

/** The same idea on the way out: accepting a draft settles the cards in the
 *  order the generator placed them rather than all at once. */
function settleDelay(order: number): string {
  return `${Math.min(order, 14) * 35}ms`
}

type AuditRowProps = {
  course: PlannedCourse
  /** The term holding it, which is what says whether anything is wrong with
   *  it: a course is only late or out of season against the plan around it. */
  term?: Term
  /** Registered courses are fixed in place: no handle, no hover affordance. */
  locked?: boolean
  /** The row left behind while its course rides the drag overlay. */
  ghosted?: boolean
  /** The copy under the cursor. */
  overlay?: boolean
  /** The draft is being accepted: marks come off, struck cards leave. */
  settling?: boolean
  /** The draft is still landing. The stagger belongs to that arrival, not to
   *  the card: once the plan is on screen a card that mounts again — dropped
   *  somewhere new, say — should appear at once. */
  streaming?: boolean
  /** Present only where the course can leave the plan; reveals the × on hover. */
  onRemove?: () => void
  /** Opens a held seat on its own — on what it is holding a place for, or
   *  straight on the courses that could fill it. */
  onOpenSeat?: (view: "detail" | "search") => void
  /** Opens a course on its own: the catalogue entry for it and what the plan
   *  has chosen about it. */
  onOpenCourse?: () => void
  /** This seat's panel is the one open. */
  selected?: boolean
}

export function AuditRow({
  course,
  term,
  locked,
  ghosted,
  overlay,
  settling,
  streaming,
  onRemove,
  onOpenSeat,
  onOpenCourse,
  selected,
}: AuditRowProps) {
  const draft = course.draft
  const style = draft ? DRAFT_STYLE[draft.mark] : null
  const struck = isStruck(course)
  /* Plan details decides whether the card carries the name and section. */
  const shown = useMetadata()
  /* What the plan has against this course sitting where it does. A seat is
     never one of them: it says what it is itself. */
  const issue = useCourseIssues(term ?? NO_TERM, course.id)[0] ?? null
  /* A seat held against a requirement, with no course chosen for it: there is
   * no code to show and nothing to register, so it is drawn as an outline
   * waiting to be filled rather than as a course. */
  const held = course.placeholder
  /* What the draft struck out is on its way off the plan; what it added is on
   * its way to being an ordinary course. */
  const leaving = settling && struck
  const joining = settling && draft?.mark === "added"
  /* Only two things earn an entrance: a draft landing, and the card you just
   * acted on, which the generator numbers zero. Anything else that happens to
   * mount again — a neighbour re-rendering after a drop — stays put rather
   * than flashing back in. */
  const entering = draft != null && (streaming || draft.order === 0)
  /* A seat that has been filled: the course stands where the seat did, under
     the name of the requirement it is answering. */
  const filled = !held ? course.seat : undefined

  const row = (
    <div
      data-draft-mark={draft?.mark}
      style={
        draft
          ? {
              animationDelay: leaving ? settleDelay(draft.order) : enterDelay(draft.order),
              transitionDelay: joining ? settleDelay(draft.order) : undefined,
            }
          : undefined
      }
      className={cn(
        "group relative flex w-full items-center gap-2 border bg-card",
        filled ? "rounded-b-md border-t-0" : "rounded-md",
        locked ? "px-[15px] py-[7px]" : "p-[7px]",
        style && !joining ? style.card : held ? "border-gray-40 bg-gray-0" : "border-gray-40",
        /* A held seat is drawn as an outline waiting to be filled, and stays
           that way while a draft is proposing it — the dashes are what say it
           is a seat rather than a course, whatever colour the draft gives it. */
        held && "border-dashed",
        ((held && onOpenSeat) || (!held && onOpenCourse)) && !overlay && "cursor-pointer",
        /* The seat whose panel is open says so. */
        selected && "border-primary-50 bg-primary-0/40",
        !locked && !draft && "cursor-grab transition-colors hover:bg-gray-5",
        locked && onOpenCourse && "transition-colors hover:bg-gray-5",
        /* Same reason as the draft bar: a marked card carries the transition
           all along, so losing its tint is something it can animate. */
        draft && "transition-colors duration-500",
        entering && "animate-rise",
        /* Listed after animate-rise so it wins the animation slot. */
        leaving && "animate-vanish overflow-hidden",
        ghosted && "opacity-40",
        overlay && "cursor-grabbing shadow-secondary"
      )}
    >
      {!locked && <Icon name="drag-indicator" size={16} className="text-foreground" />}

      <div
        className="flex min-w-0 flex-1 flex-col justify-center gap-2"
        onClick={
          overlay
            ? undefined
            : held
              ? onOpenSeat && (() => onOpenSeat("detail"))
              : onOpenCourse
        }
      >
        {held ? (
          /* Read the way a course card reads — a gray line over a bold one —
             with the gray line saying what the seat is waiting for. */
          <div>
            <p className="text-body-md text-gray-80">Choose course for</p>
            <p
              className={cn(
                "truncate text-body-md font-semibold text-foreground",
                struck && "line-through"
              )}
            >
              {course.name}
            </p>
          </div>
        ) : (
          <>
            <div>
              {/* The code carries the mark, so a card says something is wrong
                  with it before anybody opens the term's line about it. */}
              <p
                className={cn(
                  "flex items-center gap-1.5 text-body-md text-gray-80",
                  /* With the name off, the code is what gets struck. */
                  struck && !shown.includes("name") && "line-through"
                )}
              >
                {issue && (
                  <Icon
                    name={issue.severity === "error" ? "error-outline" : "warning"}
                    size={14}
                    className={cn(
                      "shrink-0",
                      issue.severity === "error" ? "text-alert-100" : "text-warning-100"
                    )}
                  />
                )}
                {course.code}
              </p>
              {shown.includes("name") && (
                <p
                  className={cn(
                    "text-body-md font-semibold text-foreground",
                    struck && "line-through"
                  )}
                >
                  {course.name}
                </p>
              )}
            </div>
            {shown.includes("section") && course.section && (
              <p className="flex items-center gap-1 text-body-md text-foreground">
                <Icon name="calendar-today" size={14} />
                {course.section}
              </p>
            )}
          </>
        )}

        {/* What Plan details is showing — nothing, until it is asked for. */}
        <CourseTags course={course} />
        <CourseActivity course={course} />
        {draft && (
          <span
            style={joining ? { animationDelay: settleDelay(draft.order) } : undefined}
            /* The reason a course was added goes with the tint that framed it,
               so the card ends up the size an ordinary one is. */
            className={cn("pt-1", joining && "animate-vanish overflow-hidden")}
          >
            <DraftNote course={course} />
          </span>
        )}
      </div>

      {/* What can be done to this row, at the end of it: anything can be written
          about or taken out, with remove last so it always ends the row. Both
          take no room until the cursor is on the row. A seat has no search button of its own — clicking the seat is
          how you look for a class to fill it. */}
      {!overlay && onRemove && (
        <span className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            aria-label={`Write a note on ${course.name}`}
            onPointerDown={(e) => e.stopPropagation()}
            className="hidden group-hover:inline-flex"
          >
            <Icon name="sticky-note-2" size={16} />
          </Button>
          <Button
            size="icon"
            aria-label={`Remove ${course.name}`}
            /* Keep the drag sensor out of it, or the press starts a drag. */
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            className="hidden group-hover:inline-flex"
          >
            <Icon name="close" size={16} />
          </Button>
        </span>
      )}

      {course.notes != null && (
        <Badge variant="quiet">
          <Icon name="sticky-note-2" size={12} />
          {course.notes}
        </Badge>
      )}
    </div>
  )

  if (!filled) return row

  /* The requirement the seat was held for, above the course that answers it.
     The two share the line between them, so the strip carries no bottom edge
     and the row below it no top one. */
  return (
    <div className="flex w-full flex-col">
      <div
        onClick={overlay ? undefined : () => onOpenSeat?.("detail")}
        className={cn(
          "flex w-full items-center rounded-t-md border bg-card p-2",
          style && !joining ? style.card : "border-gray-40",
          /* The seat is a thing of its own, so its name opens it. */
          onOpenSeat && !overlay && "cursor-pointer hover:bg-gray-5",
          draft && "transition-colors duration-500",
          entering && "animate-rise",
          leaving && "animate-vanish overflow-hidden",
          ghosted && "opacity-40"
        )}
      >
        <p className="min-w-0 flex-1 truncate text-body-md font-semibold text-gray-80">
          {filled.name}
        </p>
      </div>
      {row}
    </div>
  )
}

function SortableAuditRow({
  course,
  term,
  settling,
  streaming,
  onRemove,
  onOpenSeat,
  onOpenCourse,
  selected,
}: {
  course: PlannedCourse
  term?: Term
  settling?: boolean
  streaming?: boolean
  onRemove: () => void
  onOpenSeat?: (view: "detail" | "search") => void
  onOpenCourse?: () => void
  selected?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: course.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      /* touch-none stops the browser from claiming the gesture as a scroll. */
      className="touch-none outline-none"
      {...attributes}
      {...listeners}
    >
      <AuditRow
        course={course}
        term={term}
        ghosted={isDragging}
        settling={settling}
        streaming={streaming}
        onRemove={onRemove}
        onOpenSeat={onOpenSeat}
        onOpenCourse={onOpenCourse}
        selected={selected}
      />
    </div>
  )
}

/* ============================================================ CreditGroup
   "In Progress (12 Credits)" / "Planned (6 Credits)" — summed from the term's
   own courses, so the heading can never drift from the list beneath it. The
   badges tally what a draft proposes for this term. */

function CreditGroup({
  state,
  courses,
  settling,
  revealed,
  first = true,
}: {
  state: ReturnType<typeof creditGroup>
  /** The courses under this heading, which are what it sums. */
  courses: PlannedCourse[]
  settling?: boolean
  revealed: number
  /** The term's first heading sits off the header; a later one sits in the
   *  list, under the group before it. */
  first?: boolean
}) {
  const credits = termCredits({ courses } as Term)
  /* A card that has not arrived yet is not in the tally yet. */
  const landed = courses.filter((c) => c.draft && c.draft.order < revealed)
  const added = landed.filter((c) => c.draft!.mark === "added").length
  const dropped = landed.filter((c) => c.draft!.mark !== "added").length
  const eventual = courses.filter((c) => c.draft).length

  return (
    <div className={cn("flex w-full items-center justify-between gap-2", first ? "pt-4" : "pt-2")}>
      <p
        className={cn(
          "flex items-center gap-2 text-body-md font-semibold text-gray-80",
          /* The design gives planned groups a 24px band; registered hug at 20. */
          state === "planned" && "h-6"
        )}
      >
        <AuditIcon state={state} />
        {CREDIT_GROUP_LABEL[state]} ({credits} Credit{credits === 1 ? "" : "s"})
      </p>
      {eventual > 0 && (
        <div
          className={cn(
            "flex shrink-0 items-center gap-1 transition-opacity duration-300",
            settling && "opacity-0"
          )}
        >
          <Badge variant="success">+{added}</Badge>
          {courses.some((c) => c.draft && c.draft.mark !== "added") && (
            <Badge variant="danger">-{dropped}</Badge>
          )}
        </div>
      )}
    </div>
  )
}

/* ============================================================ DropSlot
   The space a dragged course is about to take. Sorting inside a term already
   opens a gap on its own; this is for the crossing, where the card being
   dragged belongs to another term's list and cannot. */

function DropSlot({ height }: { height: number }) {
  return (
    <div
      aria-hidden="true"
      style={{ height }}
      className="animate-fade w-full shrink-0 rounded-md border border-dashed border-input bg-gray-5"
    />
  )
}

/* ============================================================ SemesterCard
   Also the drop target: the whole card accepts a course unless it is locked. */

export function SemesterCard({
  term,
  alert,
  settling,
  revealed,
  dropAt,
  dropHeight,
  onRemoveCourse,
  onSearchCourses,
  onOpen,
  onOpenSeat,
  onOpenCourse,
  openSeatId,
  onPickSection,
}: {
  term: Term
  alert?: ReactNode
  /** The draft is being accepted. */
  settling?: boolean
  /** How much of a landing draft has arrived; Infinity once it all has. */
  revealed: number
  /** Where a course crossing into this term would land, and how tall it is. */
  dropAt?: number
  dropHeight: number
  onRemoveCourse: (courseId: string) => void
  /** Opens the course search beside the plan, for this term. */
  onSearchCourses?: () => void
  /** Opens the term on its own, with its classes and — when the schedule is
   *  out — its calendar. */
  onOpen?: () => void
  /** Opens one of this term's held seats on its own. */
  onOpenSeat?: (courseId: string, view: "detail" | "search") => void
  /** Opens one of its courses on its own. */
  onOpenCourse?: (courseId: string) => void
  /** The seat whose panel is open, if it is one of this term's. */
  openSeatId?: string | null
  /** Settles one of this term's courses on a section. */
  onPickSection?: (termId: string, courseId: string) => void
}) {
  const { setNodeRef, isOver, active } = useDroppable({ id: term.id, disabled: term.locked })

  /* Only light up while something is actually being dragged. */
  const isTarget = isOver && active != null

  /* Out with an advisor: the term says so until the request comes back. */
  const pending = usePendingReview(term.id)

  /* The design only gives the header a bottom gap when something follows it
   * other than the course list. */
  const headerHasGap = term.alert != null || term.courses.length === 0

  /* Infinity means the draft has finished arriving. */
  const streaming = revealed !== Infinity
  const activities = term.activities ?? []

  /* Registered, then planned, each under its own heading. */
  const groups = termGroups(term)
  const ordered = groups.flatMap((group) => group.courses)

  const rows: ReactNode[] = ordered.map((course) => {
    const struck = course.draft?.mark === "moved" || course.draft?.mark === "removed"
    return term.locked || struck ? (
      /* A term that is done or under way is not editable, but the courses in
         it are still courses: they open on their own like any other. */
      <AuditRow
        key={course.id}
        course={course}
        term={term}
        locked={term.locked}
        settling={settling}
        streaming={streaming}
        onOpenCourse={
          term.locked && !struck && onOpenCourse ? () => onOpenCourse(course.id) : undefined
        }
      />
    ) : (
      <SortableAuditRow
        key={course.id}
        course={course}
        term={term}
        settling={settling}
        streaming={streaming}
        onRemove={() => onRemoveCourse(course.id)}
        onOpenSeat={
          onOpenSeat ? (view) => onOpenSeat(course.id, view) : undefined
        }
        onOpenCourse={onOpenCourse && (() => onOpenCourse(course.id))}
        selected={openSeatId === course.id}
      />
    )
  })

  return (
    <Card
      ref={setNodeRef}
      data-term={term.id}
      /* Its own container: a term beside two others has to make different calls
         about what fits than the same term on its own. */
      className={cn(
        "@container/term w-full min-w-0 gap-0 rounded-md border-gray-40 p-[23px] shadow-none transition-colors",
        isTarget && "border-primary bg-primary-0/40"
      )}
    >
      <div className="flex w-full flex-col gap-2">
        <div
          className={cn(
            "flex w-full items-center justify-between gap-2",
            headerHasGap && "pb-4"
          )}
        >
          <div className="flex min-w-0 flex-col gap-1">
            <h4 className="flex min-w-0 items-center text-caption-lg font-semibold text-gray-100">
              <button
                type="button"
                onClick={onOpen}
                className="flex min-w-0 cursor-pointer items-center gap-1 rounded-md text-left hover:underline [text-underline-position:from-font]"
              >
                <span className="truncate">{term.name}</span>
                <Icon name="chevron-right" size={16} className="shrink-0 text-gray-80" />
              </button>
            </h4>
            <p className="text-body-md text-gray-80">{termMeta(term)}</p>
          </div>
          {/* A term waiting on an advisor says so; otherwise it says whether
              anyone has looked at it. */}
          <StatusPill
            status={pending ? "pending review" : term.reviewed ? "reviewed" : "unreviewed"}
            className={cn("shrink-0", !pending && !term.reviewed && "opacity-0")}
          >
            {pending ? "Pending Review" : term.reviewed ? "reviewed" : "Unreviewed"}
          </StatusPill>
        </div>

        {alert}

        {/* Under the invitation to register, the same way the term itself reads:
            here is the window, and here is what is stopping you using it. */}
        <TermActions
          term={term}
          onPickSection={onPickSection}
          onOpenCourse={onOpenCourse}
        />

        {groups[0] && (
          <CreditGroup
            state={groups[0].state}
            courses={groups[0].courses}
            settling={settling}
            revealed={revealed}
          />
        )}

        <SortableContext
          items={ordered.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {(() => {
              const list =
                dropAt == null
                  ? rows
                  : [
                      ...rows.slice(0, dropAt),
                      <DropSlot key="drop" height={dropHeight} />,
                      ...rows.slice(dropAt),
                    ]
              /* The second group's heading goes in above its first course,
                 one further down when a drop slot opened above it. A slot
                 landing right at the boundary is the planned group's first
                 place, so it goes under the heading. */
              const second = groups[1]
              if (!second) return list
              const boundary = groups[0].courses.length
              const at = boundary + (dropAt != null && dropAt < boundary ? 1 : 0)
              return [
                ...list.slice(0, at),
                <CreditGroup
                  key={`group-${second.state}`}
                  state={second.state}
                  courses={second.courses}
                  settling={settling}
                  revealed={revealed}
                  first={false}
                />,
                ...list.slice(at),
              ]
            })()}
            {activities.length > 0 && (
              /* What the term holds that is not a course. It takes no credits
                 and answers no requirement, so it is grouped under its own
                 heading rather than counted with them. */
              <>
                <p className="flex items-center gap-2 pt-4 text-body-md font-semibold text-gray-80">
                  <Icon name="sports-basketball" size={16} className="text-gray-100" />
                  Activities
                </p>
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex w-full flex-col rounded-md border border-gray-40 bg-card p-[7px]"
                  >
                    <span className="text-body-md text-gray-80">{activity.kind}</span>
                    <span className="text-body-md font-semibold text-foreground">
                      {activity.name}
                    </span>
                  </div>
                ))}
              </>
            )}

            {!term.locked && (
              /* Two things go into a term, so two ways in, each saying what it
                 adds. A course is found in the panel beside the plan — by
                 search, by number or by section — and an activity is a flow of
                 its own, drawn here and going nowhere in this prototype. */
              <div className="flex w-full gap-2">
                <AddSlot
                  onClick={() => onSearchCourses?.()}
                  className="cursor-pointer text-gray-100 transition-colors hover:bg-gray-0"
                >
                  + Add Course
                </AddSlot>
                <AddSlot className="cursor-pointer text-gray-100 transition-colors hover:bg-gray-0">
                  + Add Activity
                </AddSlot>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </Card>
  )
}

/* ============================================================ NoActionsAlert
   The quiet counterpart to the registration banner: this term needs nothing
   from you right now. */

export function NoActionsAlert() {
  return (
    <Alert variant="quiet" className="animate-fade">
      <Icon name="thumb-up" size={16} className="shrink-0 text-gray-100" />
      <span className="min-w-0 flex-1 truncate font-semibold">
        No actions required at the moment
      </span>
    </Alert>
  )
}

/* ============================================================ TimelineRail
   The spine down the left of the planner. Phase drives both the node glyph and
   the connector colour. */

const RAIL_NODE = {
  complete: { icon: "check-circle", tone: "text-success-100", line: "bg-success-100" },
  active: { icon: "timelapse", tone: "text-warning-50", line: "bg-warning-50" },
  future: { icon: "arrow-circle-right", tone: "text-gray-60", line: "bg-gray-60" },
} as const

export function TimelineRail({ phase, nodes }: { phase: YearPhase; nodes: 1 | 2 }) {
  /* The line runs between two nodes, so it is the colour of the nodes it
     joins — a finished year is green from end to end. */
  const { icon, tone, line } = RAIL_NODE[phase]

  /* One gutter and one lead whether the year is folded or not: the node sits
   * level with the year's heading either way, so unfolding moves nothing. */
  return (
    <div className="flex w-6 shrink-0 flex-col items-center self-stretch pt-2">
      <Icon name={icon} size={20} className={tone} />
      {nodes === 2 && (
        <>
          <span className={cn("w-0.5 min-h-0 flex-1", line)} />
          <Icon name={icon} size={20} className={tone} />
        </>
      )}
    </div>
  )
}

/* ============================================================ YearSection */

/** What a year amounts to, for when it is folded away. */
function yearSummary(year: Year): string {
  const courses = year.terms.reduce((n, t) => n + t.courses.length, 0)
  const credits = year.terms.reduce((n, t) => n + termCredits(t), 0)
  return `${courses} course${courses === 1 ? "" : "s"}, ${credits} credits ${
    year.phase === "complete" ? "earned" : "planned"
  }`
}

export function YearSection({
  year,
  renderAlert,
  settling,
  revealed,
  drop,
  collapsed,
  onToggleCollapse,
  onAddTerm,
  onRemoveCourse,
  onSearchCourses,
  onOpenTerm,
  onOpenSeat,
  onOpenCourse,
  openSeatId,
  onPickSection,
}: {
  year: Year
  renderAlert?: (term: Term) => ReactNode
  settling?: boolean
  revealed: number
  /** The term a dragged course is crossing into, where it would sit, and how
   *  much room it needs. */
  drop: { termId: string; index: number; height: number } | null
  /** Gives the year its summer, which is the only term it can be given. */
  onAddTerm?: () => void
  /** Opens a held seat on its own. */
  onOpenSeat?: (courseId: string, view: "detail" | "search") => void
  /** Opens a course on its own. */
  onOpenCourse?: (courseId: string) => void
  /** The seat whose panel is open. */
  openSeatId?: string | null
  /** Folded away to its heading and what it comes to. */
  collapsed?: boolean
  onToggleCollapse?: () => void
  onRemoveCourse: (courseId: string) => void
  /** Opens the course search for one of the year's terms. */
  onSearchCourses?: (termId: string) => void
  onOpenTerm?: (termId: string) => void
  onPickSection?: (termId: string, courseId: string) => void
}) {
  const heading = (
    <button
      type="button"
      onClick={onToggleCollapse}
      aria-expanded={!collapsed}
      className="flex cursor-pointer items-center gap-1 text-h300 font-semibold text-gray-100"
    >
      {year.label}
      <Icon name={collapsed ? "unfold-more" : "unfold-less"} size={16} />
    </button>
  )

  if (collapsed) {
    return (
      <section className="flex items-start gap-4">
        <TimelineRail phase={year.phase} nodes={1} />
        {/* The band is 36px tall, as the unfolded header's Add Summer button
            makes it, with the same 16px beneath — so the heading and the node
            beside it stay put when the year opens. */}
        <div className="flex min-w-0 flex-1 flex-col pb-4">
          <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h3 className="min-w-0">{heading}</h3>
            <p className="text-label-md text-gray-100">{yearSummary(year)}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="flex items-start gap-4">
      <TimelineRail phase={year.phase} nodes={2} />
      <div className="flex min-w-0 flex-1 flex-col items-start pb-8">
        {/* The band holds its 36px whether or not the year offers a term to
            add, so a finished year lines up with the rest. */}
        <div className="-mb-px flex w-full flex-col pb-4">
          <div className="flex min-h-9 w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h3 className="min-w-0">{heading}</h3>
            {/* A year already behind you takes no more terms, and neither
                does one that has its summer. */}
            {canAddTerm(year) && (
              <Button onClick={onAddTerm}>
                <Icon name="add" size={16} />
                Add Summer
              </Button>
            )}
          </div>
        </div>
        {/* A term needs ~384px to read properly: two fit from 768px, three from
            1152px. Below that they stack rather than squeeze. */}
        <div
          className={cn(
            "grid w-full grid-cols-1 gap-4 @3xl:grid-cols-2",
            year.terms.length > 2 && "@6xl:grid-cols-3"
          )}
        >
          {year.terms.map((term) => (
            <SemesterCard
              key={term.id}
              term={term}
              alert={renderAlert?.(term)}
              settling={settling}
              revealed={revealed}
              dropAt={drop?.termId === term.id ? drop.index : undefined}
              dropHeight={drop?.height ?? 64}
              onRemoveCourse={onRemoveCourse}
              onSearchCourses={onSearchCourses && (() => onSearchCourses(term.id))}
              onOpen={onOpenTerm && (() => onOpenTerm(term.id))}
              onOpenSeat={onOpenSeat}
              onOpenCourse={onOpenCourse}
              openSeatId={openSeatId}
              onPickSection={onPickSection}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
