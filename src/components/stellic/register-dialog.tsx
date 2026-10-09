import { useEffect, useState } from "react"

import { Icon } from "@/components/icon"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "cn"

import { Checkbox } from "@/components/ui/checkbox"
import { useCourseIssues, useRegistrable } from "@/components/stellic/plan-issues"
import type { TermIssue } from "@/data/issues"
import { type PlannedCourse, type Term } from "@/data/plan"

/* Putting a term's classes through registration: what is about to go, the wait
 * while it does, and what came back. One dialog in three states, because it is
 * one action — closing it halfway through would leave the question of whether
 * it happened. */

/** How long the request appears to take. Long enough to read, short enough
 *  that nobody on stage is waiting on it. */
const SENDING_MS = 1600

/** Why a course in this term is not going through, or null where it is. A seat
 *  has no course in it to register; a course with no class has nothing to
 *  attend; a course whose prerequisites are not met is not allowed. */
function blocking(course: PlannedCourse, issue: TermIssue | null): string | null {
  if (course.placeholder) return "No course chosen yet"
  if (issue?.severity === "error") return issue.says
  if (!course.section) return "No section selected"
  return null
}

function CourseCard({
  course,
  term,
  picked,
  onPick,
  onOpen,
}: {
  course: PlannedCourse
  term: Term
  /** Opens what would clear the way, where something is in the way: the seat,
   *  to choose a course for it, or the course itself. */
  onOpen?: () => void
  /** Absent where there is nothing to pick — the course cannot go, or the
   *  request is already in the air and the card is only reporting it. */
  picked?: boolean
  onPick?: (next: boolean) => void
}) {
  const issue = useCourseIssues(term, course.id)[0] ?? null
  const why = blocking(course, issue)

  return (
    <label
      className={cn(
        "flex w-full items-start gap-3 rounded-md border border-gray-40 bg-card p-3",
        picked != null && "cursor-pointer"
      )}
    >
      {picked != null && (
        <Checkbox
          checked={picked}
          onCheckedChange={(next) => onPick?.(next === true)}
          className="mt-0.5 shrink-0"
          aria-label={`Register ${course.name}`}
        />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-body-md text-gray-80">
          {course.placeholder ? "Placeholder" : course.code}
        </span>
        <span className="text-body-md font-semibold text-gray-100">{course.name}</span>
        {course.section && (
          <span className="flex items-center gap-1 text-body-md text-gray-100">
            <Icon name="calendar-today" size={14} className="shrink-0" />
            {course.section}
          </span>
        )}
        {/* What stands in its way, where something does. The term's own action
            line says the same thing; here it is beside the tick it explains. */}
        {why && (
          <span className="flex items-center gap-1 text-body-md text-gray-80">
            <Icon
              name={issue?.severity === "error" ? "error-outline" : "warning"}
              size={14}
              className={cn(
                "shrink-0",
                issue?.severity === "error" ? "text-alert-100" : "text-warning-100"
              )}
            />
            <span>
              {why.replace(/\.$/, "")}
              {onOpen && (
                <>
                  ,{" "}
                  <button
                    type="button"
                    onClick={onOpen}
                    className="cursor-pointer underline [text-underline-position:from-font]"
                  >
                    {course.placeholder ? "select course" : "view details"}
                  </button>
                </>
              )}
            </span>
          </span>
        )}
      </span>
    </label>
  )
}

/** One of the dialog's two lists, under its heading. */
function CourseGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-2">
      <h3 className="text-caption-md font-medium text-gray-100">{heading}</h3>
      {children}
    </section>
  )
}

export function RegisterDialog({
  term,
  onClose,
  onRegister,
  onOpenCourse,
}: {
  /** The term being registered, or null when the dialog is closed. */
  term: Term | null
  onClose: () => void
  onRegister: (termId: string, courseIds: string[]) => void
  /** Opens a course or seat that cannot go through, beside the plan. */
  onOpenCourse?: (course: PlannedCourse) => void
}) {
  const [stage, setStage] = useState<"confirm" | "sending" | "done">("confirm")
  /* What is ticked. Held by id rather than by course, so it survives the term
     re-rendering underneath it, and unticked by hand rather than by rule —
     everything that can go is ticked when the dialog opens. */
  const [dropped, setDropped] = useState<string[]>([])
  /* Held from the moment Confirm is pressed: registering them changes what is
     registrable, and the dialog has to go on showing what it just sent. */
  const [sent, setSent] = useState<PlannedCourse[]>([])

  /* A fresh term is a fresh question — but only a different term. Registering
     rewrites the term this is holding, and starting over on that would throw
     away the answer the moment it arrived. */
  const termId = term?.id
  useEffect(() => {
    if (termId) {
      setStage("confirm")
      setSent([])
      setDropped([])
    }
  }, [termId])

  useEffect(() => {
    if (stage !== "sending" || !term) return
    const timer = window.setTimeout(() => {
      onRegister(
        term.id,
        sent.map((c) => c.id)
      )
      setStage("done")
    }, SENDING_MS)
    return () => window.clearTimeout(timer)
    /* Deliberately not watching `term`: it changes as a result of this. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, termId])

  if (!term) return null

  const ready = useRegistrable(term)
  /* Everything the term is holding that has not already gone through — the
     seats and the blocked courses included, because a dialog that lists three
     courses when the term shows five leaves the other two unaccounted for. */
  const offered = term.courses.filter((course) => !course.registered && course.draft == null)
  /* What would go: everything registrable that has not been unticked. */
  const picked = ready.filter((course) => !dropped.includes(course.id))
  /* Everything offered that cannot go, each with its reason. */
  const blocked = offered.filter((course) => !ready.some((r) => r.id === course.id))
  const count = stage === "confirm" ? picked.length : sent.length

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-4 sm:max-w-[460px]" showCloseButton={false}>
        {/* The design puts the close on its own line above everything, at the
            left — not floating in the top corner, which is where the shadcn
            dialog has it. Nothing to close while the request is in the air. */}
        {stage !== "sending" && (
          <DialogClose className="cursor-pointer justify-self-start rounded-md text-gray-80 transition-colors hover:text-gray-100">
            <Icon name="close" size={24} />
            <span className="sr-only">Close</span>
          </DialogClose>
        )}

        {stage === "done" ? (
          <div className="flex w-full flex-col items-center gap-4 pt-2 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-success-5 text-success-100">
              <Icon name="event-available" size={24} />
            </span>
            <DialogHeader className="items-center gap-1.5 text-center sm:text-center">
              <DialogTitle className="text-h400">
                {count} Course{count === 1 ? "" : "s"} Registered
              </DialogTitle>
              <DialogDescription>
                Your selected courses were successfully registered. You may return to Registration
                to continue to register new courses while the registration window is still open.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="w-full">
              <Button className="w-full" onClick={onClose}>
                Back to {term.name}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {stage === "sending" ? (
              <div className="flex w-full flex-col items-center gap-1.5 text-center">
                <span className="size-6 animate-spin rounded-full border-2 border-gray-40 border-t-gray-80" />
                <DialogTitle>Registering…</DialogTitle>
                <DialogDescription>
                  Sending request to register the following courses
                </DialogDescription>
              </div>
            ) : (
              <DialogHeader className="gap-1.5">
                <DialogTitle>
                  Register {count} Course{count === 1 ? "" : "s"}
                </DialogTitle>
                <DialogDescription>
                  {ready.length === 0
                    ? "Nothing in this term can be registered yet. A course needs a class before it can go through."
                    : count > 0
                      ? "Confirm registration for the following courses:"
                      : "Tick at least one course to register."}
                </DialogDescription>
              </DialogHeader>
            )}

            {stage === "confirm" ? (
              /* Two lists rather than one with some ticks greyed out: what
                 can go has a tick, and what cannot has its reason and nothing
                 to press. */
              <>
                {ready.length > 0 && (
                  <CourseGroup heading="Ready to register">
                    {ready.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        term={term}
                        picked={!dropped.includes(course.id)}
                        onPick={(next) =>
                          setDropped((current) =>
                            next
                              ? current.filter((id) => id !== course.id)
                              : [...current, course.id]
                          )
                        }
                      />
                    ))}
                  </CourseGroup>
                )}
                {blocked.length > 0 && (
                  <CourseGroup heading="Can't register yet">
                    {blocked.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        term={term}
                        onOpen={onOpenCourse && (() => onOpenCourse(course))}
                      />
                    ))}
                  </CourseGroup>
                )}
              </>
            ) : (
              /* Nothing to tick once the request is in the air. */
              <div className="flex w-full flex-col gap-2">
                {sent.map((course) => (
                  <CourseCard key={course.id} course={course} term={term} />
                ))}
              </div>
            )}

            {stage === "confirm" && ready.length > 0 && (
              <DialogFooter className="w-full">
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={count === 0}
                  onClick={() => {
                    setSent(picked)
                    setStage("sending")
                  }}
                >
                  Confirm
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
