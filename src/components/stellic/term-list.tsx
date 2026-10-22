import { cn } from "cn"

import { useDroppable } from "@dnd-kit/core"

import { Icon, type IconName } from "@/components/icon"
import { accentBar } from "@/components/stellic/course-accent"
import { AddToTerm } from "@/components/stellic/add-to-term"
import type { CatalogEntry } from "@/data/catalog"
import { DRAFT_STYLE, DraftNote } from "@/components/stellic/draft-mark"
import { AuditIcon, StatusPill } from "@/components/stellic/primitives"
import { Button } from "@/components/ui/button"
import { useCourseIssues } from "@/components/stellic/plan-issues"
import { meetingLines } from "@/data/course-detail"
import {
  CREDIT_GROUP_LABEL,
  creditGroup,
  courseStatus,
  termCredits,
  type PlannedCourse,
  type Term,
} from "@/data/plan"

/* A term as a list: every class it holds, and what still has to be settled
 * before any of it can be registered. This is all a term can show until its
 * schedule is published. */

function Empty({ children }: { children: string }) {
  return (
    <p className="border-t border-gray-40 p-4 text-center text-body-md text-gray-80">{children}</p>
  )
}

function CardHeader({
  icon,
  title,
  count,
  addable,
  onAddCourse,
  onSearchCourses,
}: {
  icon: IconName
  title: string
  count: number
  /** Given, the plus opens the same menu the planner's cards open. */
  addable?: CatalogEntry[]
  onAddCourse?: (entry: CatalogEntry) => void
  onSearchCourses?: () => void
}) {
  const plus = (
    <Button size="icon" aria-label={`Add to ${title}`}>
      <Icon name="plus" size={16} />
    </Button>
  )

  return (
    <div className="flex w-full items-center gap-2 px-[23px] py-[15px]">
      <Icon name={icon} size={24} className="shrink-0 text-gray-100" />
      <h4 className="min-w-0 flex-1 truncate text-caption-lg font-semibold text-gray-100">
        {title} ({count})
      </h4>
      {addable && onAddCourse ? (
        <AddToTerm
          options={addable}
          onPick={onAddCourse}
          onSearch={onSearchCourses}
          fieldClassName="min-w-0 flex-1"
          trigger={plus}
        />
      ) : (
        plus
      )}
    </div>
  )
}

/** The bar down the left of every row, which is where a course's colour lives. */
function Accent({ course, term }: { course?: PlannedCourse; term?: Term }) {
  return (
    <span
      aria-hidden="true"
      className={cn("w-1 shrink-0 self-stretch", accentBar(course, term))}
    />
  )
}

function CourseRow({
  course,
  term,
  onOpen,
  onOpenSeat,
}: {
  course: PlannedCourse
  term: Term
  /** Opens the course on its own. */
  onOpen?: () => void
  /** Opens the seat: the one it is held in, or the one it was put into. */
  onOpenSeat?: () => void
}) {
  const held = course.placeholder
  const missing = useCourseIssues(term, course.id)[0] ?? null
  /* Anything the plan is warning about is something to look at, whatever the
     registration state of it says — and the kind that stops the course
     happening says so in red. */
  const status = missing ? "needs review" : courseStatus(course, term)
  const pill = missing?.severity === "error" ? "blocked" : status
  /* A draft on the canvas marks its terms here as well. */
  const mark = course.draft ? DRAFT_STYLE[course.draft.mark] : null

  return (
    /* A marked course is one thing — the row and the line saying what the draft
       did to it — so the colour goes round the pair rather than along the top
       of each. An unmarked one keeps the rule between rows that the table is
       ruled by. */
    <div className={cn(mark ? cn("border", mark.card) : "border-t border-gray-40")}>
      {/* A course put into a seat goes on saying which requirement it is
          answering, in a band above it the way the canvas draws one. */}
      {!held && course.seat && (
        <div
          className={cn(
            "flex w-full items-stretch",
            mark ? mark.card : "bg-card",
            onOpenSeat && "cursor-pointer hover:bg-gray-5"
          )}
          onClick={onOpenSeat}
        >
          <Accent course={course} term={term} />
          <p className="min-w-0 flex-1 truncate px-6 py-2 text-body-md text-gray-80">
            {course.seat.name}
          </p>
        </div>
      )}
      <div
        className={cn(
          "flex w-full items-stretch",
          mark ? mark.card : held ? "bg-gray-0" : "bg-card"
        )}
      >
        <Accent course={course} term={term} />
        <div
          onClick={onOpen}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-4 pr-4 pl-6",
            onOpen && "cursor-pointer"
          )}
        >
          <Icon name="drag-indicator" size={16} className="shrink-0 text-gray-80" />
          <div className="flex w-[223px] shrink-0 flex-col gap-1 px-2 py-3">
            <span className="text-label-md text-gray-100">
              {held ? "Elective" : course.code}
            </span>
            <span className="text-body-md font-semibold text-gray-100">
              {course.name}
            </span>
          </div>

          <div className="w-[121px] shrink-0">
            {/* A class that has gone through registration is done with, which
                is what the list calls it: the planner's cards still say
                registered, because there the word is about the plan. */}
            {/* A seat has nothing to register, so it has no state to be in. */}
            {!held && (
              <StatusPill status={pill}>
                {status === "registered" ? "Complete" : status}
              </StatusPill>
            )}
          </div>

          {/* Where a rule used to divide the two halves of the row. A band
              above a filled seat and a line under a course that needs one cut
              it into pieces, so it keeps the width and drops the line. */}
          <span aria-hidden="true" className="w-px shrink-0 self-stretch" />

          {/* A held seat has nothing on this side of the rule yet: no class has
              been chosen, so there is no class number, campus or grading. */}
          {!held && (
            <div className="flex min-w-0 flex-1 items-center gap-4 text-body-md text-gray-100">
              <span className="w-[98px] shrink-0">{course.classNo}</span>
              <span className="w-[109px] shrink-0">{course.campus}</span>
              <span className="w-[109px] shrink-0">{course.modality}</span>
              <span className="w-[100px] shrink-0">{course.gradeOption}</span>
              <span className="w-[100px] shrink-0 truncate">{course.credits} Credits</span>
            </div>
          )}
        </div>
      </div>

      {/* What the draft did to this class reads under it, the same way an
          unsettled one says what it is waiting for. */}
      {course.draft && (
        <div className={cn("flex w-full items-stretch", mark?.card)}>
          <Accent course={course} term={term} />
          <span className="flex min-w-0 flex-1 items-center px-4 py-[9px]">
            <DraftNote course={course} />
          </span>
        </div>
      )}

      {/* The line belongs to the course above it, so it carries the same ground
          and the same colour down its edge. */}
      {missing && !course.draft && (
        <div className={cn("flex w-full items-stretch", held ? "bg-gray-0" : "bg-card")}>
          <Accent course={course} term={term} />
          <p className="flex min-w-0 flex-1 items-center gap-1 px-4 py-[9px] text-body-md text-gray-100">
            <Icon
              name={missing.severity === "error" ? "error-outline" : "warning"}
              size={12}
              className={cn(
                "shrink-0",
                missing.severity === "error" ? "text-alert-100" : "text-warning-50"
              )}
            />
            {missing.says}{" "}
            {missing.action && (
              <button
                type="button"
                className="cursor-pointer underline [text-underline-position:from-font]"
              >
                {missing.action}
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

export function TermList({
  term,
  addable,
  onAddCourse,
  onSearchCourses,
  onOpenCourse,
  onOpenSeat,
}: {
  term: Term
  /** What the plus can offer, and what a requirement dropped here becomes. */
  addable?: CatalogEntry[]
  onAddCourse?: (entry: CatalogEntry) => void
  /** Opens the course search beside the term. */
  onSearchCourses?: () => void
  /** Opens one of the term's courses on its own. */
  onOpenCourse?: (courseId: string) => void
  /** Opens a seat — held, or filled and opened from its band. */
  onOpenSeat?: (courseId: string) => void
}) {
  const credits = termCredits(term)
  const activities = term.activities ?? []
  /* The same droppable the planner's card registers, under the same id: a
     requirement dragged out of the panel lands in the term being read. */
  const { setNodeRef, isOver, active } = useDroppable({ id: term.id, disabled: term.locked })

  return (
    /* Same reason as the calendar: keep the natural height and let the pane
       scroll, rather than being compressed into it. */
    <div className="flex w-full shrink-0 flex-col gap-6">
      <section
        ref={setNodeRef}
        className={cn(
          "w-full overflow-hidden rounded-md border border-gray-40 bg-card transition-colors",
          isOver && active != null && "border-primary bg-primary-0/40"
        )}
      >
        <CardHeader
          icon="class"
          title="My Courses"
          count={term.courses.length}
          addable={addable}
          onAddCourse={onAddCourse}
          onSearchCourses={onSearchCourses}
        />

        {/* A term nobody has planned into has no columns worth heading. */}
        {term.courses.length === 0 ? (
          <Empty>No courses added to plan yet</Empty>
        ) : (
        /* The table scrolls on its own when the columns no longer fit, rather
           than squeezing them or pushing the page sideways. */
        <div className="w-full overflow-x-auto">
          <div className="min-w-[1000px]">
            <div className="flex w-full items-stretch pr-4 pl-6 text-body-md font-semibold text-gray-100">
              <span aria-hidden="true" className="w-1 shrink-0" />
              <span className="w-4 shrink-0 self-center" />
              <span className="ml-4 w-[223px] shrink-0 self-center px-2 py-3">Course</span>
              <span className="ml-4 w-[121px] shrink-0 self-center">Status</span>
              <span aria-hidden="true" className="ml-4 w-px shrink-0 self-stretch" />
              <span className="ml-4 w-[98px] shrink-0 self-center">Class No.</span>
              <span className="ml-4 w-[109px] shrink-0 self-center">Campus</span>
              <span className="ml-4 w-[109px] shrink-0 self-center">Modality</span>
              <span className="ml-4 w-[100px] shrink-0 self-center">Grade Option</span>
              <span className="ml-4 w-[100px] shrink-0 self-center">Credits</span>
            </div>

            <div className="flex w-full items-center gap-2 border-t border-gray-40 bg-gray-0 py-2 pr-6 pl-6">
              <AuditIcon state={creditGroup(term)} />
              <span className="text-body-md font-semibold text-gray-80">
                {CREDIT_GROUP_LABEL[creditGroup(term)]} ({credits} Credits)
              </span>
            </div>

            {term.courses.map((course) => (
              <CourseRow
                key={course.id}
                course={course}
                term={term}
                /* A seat has no course to open: it opens as what it is. */
                onOpen={
                  course.placeholder
                    ? onOpenSeat && (() => onOpenSeat(course.id))
                    : onOpenCourse && (() => onOpenCourse(course.id))
                }
                onOpenSeat={onOpenSeat && (() => onOpenSeat(course.id))}
              />
            ))}
          </div>
        </div>
        )}
      </section>

      <section className="w-full overflow-hidden rounded-md border border-gray-40 bg-card">
        <CardHeader icon="sports-basketball" title="My Activities" count={activities.length} />
        {activities.length === 0 ? (
          <Empty>No activities added to plan yet</Empty>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex w-full items-center gap-4 border-t border-gray-40 px-6 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-label-md text-gray-80">{activity.kind}</span>
                <span className="text-body-md font-semibold text-gray-100">{activity.name}</span>
              </span>
              {activity.meetings && (
                <span className="shrink-0 text-body-md text-gray-80">
                  {meetingLines(activity.meetings).join(", ")}
                </span>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  )
}
