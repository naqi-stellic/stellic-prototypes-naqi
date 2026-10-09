import { useDroppable } from "@dnd-kit/core"
import { cn } from "cn"
import { useState } from "react"

import { Icon } from "@/components/icon"
import { AddToTerm } from "@/components/stellic/add-to-term"
import type { CatalogEntry } from "@/data/catalog"
import { DRAFT_STYLE, DraftNote, isStruck } from "@/components/stellic/draft-mark"
import { AuditIcon } from "@/components/stellic/primitives"
import { useCourseIssues } from "@/components/stellic/plan-issues"
import { meetingLines } from "@/data/course-detail"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CREDIT_GROUP_LABEL,
  creditGroup,
  courseStatus,
  termCredits,
  termHours,
  termWeek,
  type Meeting,
  type PlannedCourse,
  type Term,
} from "@/data/plan"

/* A term whose schedule is out: the classes down one side, the week they
 * actually meet in on the other. A course keeps its colour across both. */

const ACCENT: Record<string, string> = {
  green: "bg-accent-green",
  amber: "bg-accent-amber",
  purple: "bg-accent-purple",
  brown: "bg-accent-brown",
  teal: "bg-accent-teal",
  rose: "bg-accent-rose",
}

/** An hour of calendar, in pixels. Deep enough that a class of an hour and a
 *  quarter has room for its code, its name and its section. */
const HOUR = 64
/* Kept clear on either side of a class so Monday's block and Tuesday's
   never meet at the column line. The width subtracts both sides: an absolute
   box with a left and a width drops its right margin, which is how they came
   to touch in the first place. */
const GUTTER = 4

function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${String(h).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`
}

/* ------------------------------------------------------------- the classes */

function CourseCard({
  course,
  term,
  onOpen,
  onOpenSeat,
}: {
  course: PlannedCourse
  term: Term
  onOpen?: () => void
  /** Opens the seat this course was put into, from the band that names it. */
  onOpenSeat?: () => void
}) {
  const issue = useCourseIssues(term, course.id)[0] ?? null
  const needsReview = issue != null || courseStatus(course, term) === "needs review"
  const stopped = issue?.severity === "error"
  const mark = course.draft ? DRAFT_STYLE[course.draft.mark] : null
  /* A seat that was filled: the requirement it was held for heads the card,
     the way it heads the row on the canvas. */
  const seat = course.placeholder ? undefined : course.seat

  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-md border",
        mark ? mark.card : "border-gray-40 bg-card"
      )}
    >
      {seat && (
        <p
          onClick={onOpenSeat}
          className={cn(
            "w-full truncate border-b px-3 py-2 text-body-md font-semibold text-gray-80",
            mark ? mark.card : "border-gray-40",
            onOpenSeat && "cursor-pointer hover:bg-gray-5"
          )}
        >
          {seat.name}
        </p>
      )}
      <div className="flex w-full items-stretch pr-3">
        <span
          aria-hidden="true"
          className={cn("w-1 shrink-0", course.accent ? ACCENT[course.accent] : "bg-gray-40")}
        />
        <label onClick={onOpen} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 p-3">
          {/* A proposed class carries its mark. Which classes go through
              registration is asked once, in the dialog that does it — a tick
              on every card asks the same question five times and answers
              none of them. */}
          {mark ? (
            <Icon name="add" size={16} className={cn("mt-0.5 shrink-0", mark.note)} />
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center gap-1.5 text-body-md text-gray-80">
              {needsReview && (
                <Icon
                  name={stopped ? "error-outline" : "warning"}
                  size={14}
                  className={cn("shrink-0", stopped ? "text-alert-100" : "text-warning-100")}
                />
              )}
              {course.code}
            </span>
            <span
              className={cn(
                "text-body-md font-semibold text-gray-100",
                isStruck(course) && "line-through"
              )}
            >
              {course.name}
            </span>
            {course.section && (
              <span className="flex items-center gap-1 text-body-md text-gray-100">
                <Icon name="calendar-today" size={14} />
                {course.section}
              </span>
            )}
            <span className="flex flex-wrap items-start gap-1 pt-2">
              <Badge variant="secondary">{course.credits} credits</Badge>
              {course.campus && <Badge variant="secondary">{course.campus}</Badge>}
              {course.modality && <Badge variant="secondary">{course.modality}</Badge>}
            </span>
            {/* Under the badges, where the card has room to say why it is here. */}
            <DraftNote course={course} className="pt-1" />
          </span>
        </label>
        {/* No search on a course. A class is chosen from the course itself, or
            from the line above the list that says which course is missing one
            — two ways is already one more than the question needs, and a third
            sitting on every card says the card is the place to answer it. The
            triangle beside the code is what says there is something to answer.
            A seat keeps its own search: there the thing to find is a course,
            not a sitting of one. */}
      </div>
    </div>
  )
}

function HeldCard({ course, onOpen }: { course: PlannedCourse; onOpen?: () => void }) {
  const mark = course.draft ? DRAFT_STYLE[course.draft.mark] : null

  return (
    <div
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border border-dashed p-[7px]",
        mark ? mark.card : "border-gray-40 bg-gray-0",
        onOpen && "cursor-pointer hover:bg-gray-5"
      )}
    >
      <Icon name="drag-indicator" size={16} className="shrink-0 text-gray-80" />
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <span className="flex flex-col">
          <span className="text-body-md text-gray-80">Choose course for</span>
          <span
            className={cn(
              "truncate text-body-md font-semibold text-gray-100",
              isStruck(course) && "line-through"
            )}
          >
            {course.name}
          </span>
        </span>
        <DraftNote course={course} />
        <span>
          <Badge variant="secondary">{course.credits} credits</Badge>
        </span>
      </span>
    </div>
  )
}

function Sidebar({
  term,
  addable,
  onAddCourse,
  onSearchCourses,
  onOpenCourse,
  onOpenSeat,
}: {
  term: Term
  addable?: CatalogEntry[]
  onAddCourse?: (entry: CatalogEntry) => void
  /** Opens the course search beside the term. */
  onSearchCourses?: () => void
  onOpenCourse?: (courseId: string) => void
  onOpenSeat?: (courseId: string) => void
}) {
  const credits = termCredits(term)
  const activities = term.activities ?? []

  return (
    <div className="flex w-full shrink-0 flex-col gap-6 p-6 @3xl/term:w-[280px] @6xl/term:w-[350px]">
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-center gap-2">
          <Icon name="class" size={24} className="shrink-0 text-gray-100" />
          <h4 className="min-w-0 flex-1 truncate text-body-md font-semibold text-gray-100">
            My Courses ({term.courses.length})
          </h4>
          {/* The same menu the planner's cards open, behind the same plus —
              the same four ways in, whichever screen you are on. */}
          {addable && onAddCourse ? (
            <AddToTerm
              options={addable}
              onPick={onAddCourse}
              onSearch={onSearchCourses}
              fieldClassName="min-w-0 flex-1"
              trigger={
                <Button size="icon" aria-label="Add a course">
                  <Icon name="plus" size={16} />
                </Button>
              }
            />
          ) : (
            <Button size="icon" aria-label="Add a course">
              <Icon name="plus" size={16} />
            </Button>
          )}
        </div>

        <div className="flex w-full items-center gap-2">
          <AuditIcon state={creditGroup(term)} size={24} />
          <span className="min-w-0 flex-1 text-overline font-medium tracking-[0.5px] text-gray-100 uppercase">
            {CREDIT_GROUP_LABEL[creditGroup(term)]} ({credits} Credits)
          </span>
          <Button variant="ghost" size="icon" aria-label="Hide these on the calendar">
            <Icon name="remove-red-eye" size={16} />
          </Button>
        </div>

        {term.courses.map((course) =>
          course.placeholder ? (
            <HeldCard
              key={course.id}
              course={course}
              onOpen={onOpenSeat && (() => onOpenSeat(course.id))}
            />
          ) : (
            <CourseCard
              key={course.id}
              course={course}
              term={term}
              onOpen={onOpenCourse && (() => onOpenCourse(course.id))}
              onOpenSeat={onOpenSeat && (() => onOpenSeat(course.id))}
            />
          )
        )}
      </div>

      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-center gap-2">
          <Icon name="sports-basketball" size={24} className="shrink-0 text-gray-100" />
          <h4 className="min-w-0 flex-1 truncate text-body-md font-semibold text-gray-100">
            My Activities ({activities.length})
          </h4>
          <Button size="icon" aria-label="Add an activity">
            <Icon name="plus" size={16} />
          </Button>
        </div>
        {activities.length === 0 ? (
          <button
            type="button"
            className="w-full cursor-pointer rounded-md border border-dashed border-gray-40 bg-card p-3 text-left text-body-md text-gray-80"
          >
            + Add first activity
          </button>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex w-full items-stretch overflow-hidden rounded-md border border-gray-40 bg-card"
            >
              <span aria-hidden="true" className="w-1 shrink-0 bg-gray-40" />
              <span className="flex min-w-0 flex-1 flex-col gap-1 p-3">
                <span className="text-body-md font-semibold text-gray-100">{activity.name}</span>
                {activity.meetings && (
                  <span className="text-body-md text-gray-100">
                    {meetingLines(activity.meetings).join(", ")}
                  </span>
                )}
                {/* What kind of thing it is, tagged the way a course tags its
                    credits and campus. */}
                <span className="flex flex-wrap items-start gap-1 pt-2">
                  <Badge variant="secondary">{activity.kind}</Badge>
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- the week */

/** How much of the week the calendar draws. Classes meet Monday to Friday, so
 *  five days is the useful view and the weekend is there when it is wanted. */
const SPANS = [
  { label: "Week (5 Day)", days: 5 },
  { label: "Week (7 Day)", days: 7 },
]

/** Splits a day's classes into columns so two at the same hour sit beside each
 *  other. Drawn on top of one another the lower one is simply not there, and a
 *  class in the list that is missing from the week is worse than a narrow one. */
function intoLanes<T extends { meeting: Meeting }>(items: T[]): { item: T; lane: number }[] {
  const ends: number[] = []
  return [...items]
    .sort((a, b) => a.meeting.from - b.meeting.from)
    .map((item) => {
      let lane = ends.findIndex((end) => end <= item.meeting.from)
      if (lane === -1) {
        lane = ends.length
        ends.push(item.meeting.to)
      } else {
        ends[lane] = item.meeting.to
      }
      return { item, lane }
    })
}

function Week({
  term,
  compare = true,
  preview,
}: {
  term: Term
  compare?: boolean
  preview?: Preview
}) {
  const [span, setSpan] = useState(SPANS[0])
  const days = termWeek(term).slice(0, span.days)
  const { from, to } = termHours(term)
  const hours = Array.from({ length: to - from }, (_, i) => from + i)

  /* The week is not only classes. An activity keeps hours like a class does,
     so it is laid out like one — without a code, a section or a status, which
     it has none of. */
  /* A class the cursor is hovering over in the course panel is drawn where it
     would go, in place of the one the student is in — so the week answers
     "what would this do to my Tuesdays?" while they are still deciding.
     Hovering the row they are already in is not a preview of anything. */
  const previewing =
    preview &&
    term.courses.some((c) => c.id === preview.courseId && c.section !== preview.section)
      ? preview.courseId
      : null

  const week: PlannedCourse[] = [
    ...term.courses.map((course) =>
      previewing === course.id && preview
        ? { ...course, section: preview.section, meetings: preview.meetings }
        : course
    ),
    ...(term.activities ?? []).map((activity) => ({
      id: activity.id,
      code: activity.kind,
      name: activity.name,
      credits: 0,
      meetings: activity.meetings,
    })),
  ]

  const month = days[0].toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-6">
      <div className="flex w-full flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex shrink-0 items-center gap-2">
            <Button>Today</Button>
            <Button size="icon" aria-label="Previous week">
              <Icon name="chevron-left" size={16} />
            </Button>
            <Button size="icon" aria-label="Next week">
              <Icon name="chevron-right" size={16} />
            </Button>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body-md font-semibold text-gray-100">{month}</span>
            <span className="truncate text-body-md text-gray-100">
              (GMT-04:00) Eastern Time - New York City
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-[175px] shrink-0 cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-[11px] text-body-md text-gray-100 shadow-xs"
            >
              <span className="min-w-0 flex-1 truncate text-left">{span.label}</span>
              <Icon name="expand-more" size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[175px]">
            {SPANS.map((option) => (
              <DropdownMenuItem
                key={option.days}
                onSelect={() => setSpan(option)}
                className="gap-2 py-1.5 pr-2 pl-8 text-body-md"
              >
                {option.days === span.days && (
                  <Icon name="check" size={16} className="absolute left-2 shrink-0" />
                )}
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full overflow-x-auto rounded-md border border-gray-40">
        <div className="flex min-w-[480px] items-start p-2">
          {/* The hour gutter, which the day columns line up against. */}
          <div className="w-[65px] shrink-0">
            <div className="h-[52px] border-b border-gray-5" />
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR }}
                className="flex items-start justify-center border-b border-gray-5 px-2 py-1 text-body-md text-gray-80"
              >
                {hourLabel(hour)}
              </div>
            ))}
          </div>

          {days.map((day, i) => {
            const meetings = week.flatMap((course) =>
              (course.meetings ?? [])
                .filter((m) => m.day === i + 1)
                .map((m) => ({ course, meeting: m }))
            )
            /* Where a class used to sit before the draft moved it. Drawn
               behind and faded, so the week can be read against the one it is
               replacing — and dropped entirely when nobody asked to compare. */
            const before = compare
              ? term.courses.flatMap((course) =>
                  (course.previousMeetings ?? [])
                    .filter((m) => m.day === i + 1)
                    .map((m) => ({ course, meeting: m }))
                )
              : []
            const laid = intoLanes(meetings)
            const lanes = Math.max(1, ...laid.map((l) => l.lane + 1))
            const laidBefore = intoLanes(before)
            const beforeLanes = Math.max(1, ...laidBefore.map((l) => l.lane + 1))

            return (
              <div key={day.toISOString()} className="min-w-0 flex-1">
                <div className="flex h-[52px] flex-col items-center border-b border-gray-5 p-2 text-body-md">
                  <span className="font-semibold text-gray-100">{day.getUTCDate()}</span>
                  <span className="text-gray-80">
                    {day
                      .toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
                      .toUpperCase()}
                  </span>
                </div>

                <div className="relative" style={{ height: hours.length * HOUR }}>
                  {hours.map((hour) => (
                    <div key={hour} style={{ height: HOUR }} className="border-b border-gray-5" />
                  ))}

                  {laidBefore.map(({ item: { course, meeting }, lane }) => (
                    <div
                      key={`was-${course.id}-${meeting.from}`}
                      aria-hidden="true"
                      style={{
                        top: (meeting.from - from) * HOUR,
                        height: (meeting.to - meeting.from) * HOUR,
                        left: `calc(${(lane / beforeLanes) * 100}% + ${GUTTER}px)`,
                        width: `calc(${100 / beforeLanes}% - ${GUTTER * 2}px)`,
                      }}
                      className={cn(
                        "absolute flex items-stretch overflow-hidden rounded-md",
                        "border border-dashed border-gray-40 bg-gray-0 opacity-70 blur-[1px]"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "w-1 shrink-0 opacity-50",
                          course.accent ? ACCENT[course.accent] : "bg-gray-40"
                        )}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-1 p-2">
                        <span className="truncate text-body-md text-gray-80">{course.code}</span>
                        <span className="truncate text-body-md text-gray-80">was here</span>
                      </span>
                    </div>
                  ))}

                  {laid.map(({ item: { course, meeting }, lane }) => (
                    <div
                      key={`${course.id}-${meeting.from}`}
                      style={{
                        top: (meeting.from - from) * HOUR,
                        height: (meeting.to - meeting.from) * HOUR,
                        left: `calc(${(lane / lanes) * 100}% + ${GUTTER}px)`,
                        width: `calc(${100 / lanes}% - ${GUTTER * 2}px)`,
                      }}
                      /* Solid, even while it is a proposal: on this week the
                         faded, dashed blocks mean "this is where the class used
                         to be", and a proposed class drawn the same way reads
                         as a ghost of a schedule that never existed. What the
                         draft is offering is what you would get.
                         A class under the cursor is the exception: it is not
                         yours until you press the plus, and the dashes say so
                         while the colour says whose class it is. */
                      className={cn(
                        "absolute flex items-stretch overflow-hidden rounded-md bg-card",
                        previewing === course.id
                          ? "border border-dashed border-gray-80"
                          : "border-y border-r border-gray-40"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "w-1 shrink-0",
                          course.accent ? ACCENT[course.accent] : "bg-gray-40"
                        )}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-1 p-2">
                        <span className="flex items-center gap-1 truncate text-body-md text-gray-80">
                          {/* An activity is not a class and has no class to
                              choose, so nothing about it is outstanding. */}
                          {term.courses.includes(course) &&
                            courseStatus(course, term) === "needs review" && (
                              <Icon
                                name="warning"
                                size={14}
                                className="shrink-0 text-warning-100"
                              />
                            )}
                          {course.code}
                        </span>
                        <span className="truncate text-body-md font-semibold text-gray-100">
                          {course.name}
                        </span>
                        {course.section && (
                          <span className="flex items-center gap-1 truncate text-body-md text-gray-100">
                            <Icon name="calendar-today" size={14} className="shrink-0" />
                            {course.section}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** A class the cursor is over in the course panel: whose it would be, which
 *  class it is, and the hours it keeps. */
export type Preview = { courseId: string; section: string; meetings: Meeting[] }

export function TermCalendar({
  term,
  compare = true,
  preview,
  addable,
  onAddCourse,
  onSearchCourses,
  onOpenCourse,
  onOpenSeat,
}: {
  term: Term
  compare?: boolean
  /** Drawn in place of that course's own class while it lasts. */
  preview?: Preview
  /** What the plus offers, and what a requirement dropped here becomes. */
  addable?: CatalogEntry[]
  onAddCourse?: (entry: CatalogEntry) => void
  /** Opens the course search beside the term. */
  onSearchCourses?: () => void
  /** Opens one of the term's courses on its own. */
  onOpenCourse?: (courseId: string) => void
  /** Opens a seat: one still held, or the one a course was put into. */
  onOpenSeat?: (courseId: string) => void
}) {
  /* The same droppable the planner's card registers, under the same id. */
  const { setNodeRef, isOver, active } = useDroppable({ id: term.id, disabled: term.locked })

  return (
    /* shrink-0 because the pane it sits in is a fixed-height column: without
       it the card is squeezed to fit and the week is quietly cut off at the
       bottom instead of the pane scrolling to reach it. */
    <div
      ref={setNodeRef}
      className={cn(
        "@container/term w-full shrink-0 overflow-hidden rounded-md border border-gray-40 bg-card transition-colors",
        isOver && active != null && "border-primary bg-primary-0/40"
      )}
    >
      {/* Side by side when there is room for both; stacked when there is not. */}
      <div className="flex w-full flex-col @3xl/term:flex-row">
        <Sidebar
          term={term}
          addable={addable}
          onAddCourse={onAddCourse}
          onSearchCourses={onSearchCourses}
          onOpenCourse={onOpenCourse}
          onOpenSeat={onOpenSeat}
        />
        <span
          aria-hidden="true"
          className="shrink-0 bg-gray-40 max-@3xl/term:h-px @3xl/term:w-px"
        />
        <Week term={term} compare={compare} preview={preview} />
      </div>
    </div>
  )
}
