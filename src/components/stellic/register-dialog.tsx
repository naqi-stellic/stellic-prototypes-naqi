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
import { useRegistrable } from "@/components/stellic/plan-issues"
import { type PlannedCourse, type Term } from "@/data/plan"

/* Putting a term's classes through registration: what is about to go, the wait
 * while it does, and what came back. One dialog in three states, because it is
 * one action — closing it halfway through would leave the question of whether
 * it happened. */

/** Stands in while the dialog is closed, so its hooks run the same way. */
const NO_TERM: Term = { id: "", name: "", window: "", reviewed: false, state: "planned", courses: [] }

/** How long the request appears to take. Long enough to read, short enough
 *  that nobody on stage is waiting on it. */
const SENDING_MS = 1600

function CourseCard({
  course,
  picked,
  onPick,
}: {
  course: PlannedCourse
  /** Absent once the request is in the air and the card is only reporting
   *  what went. */
  picked?: boolean
  onPick?: (next: boolean) => void
}) {
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
      </span>
    </label>
  )
}

export function RegisterDialog({
  term,
  only,
  onClose,
  onRegister,
  onOpenCourse,
}: {
  /** The term being registered, or null when the dialog is closed. */
  term: Term | null
  /** Opened for one course — from that course's own sidebar — it starts with
   *  only that course ticked, and the rest of the term there to add. */
  only?: string
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

  /* Called whether or not the dialog is up: a hook skipped on the closed
     render and called on the open one is a different list of hooks. */
  const ready = useRegistrable(term ?? NO_TERM)

  /* A fresh term is a fresh question — but only a different term, or the same
     term asked about another course. Registering rewrites the term this is
     holding, and starting over on that would throw away the answer the moment
     it arrived. Asked about one course, everything else starts unticked. */
  const termId = term?.id
  useEffect(() => {
    if (termId) {
      setStage("confirm")
      setSent([])
      setDropped(only ? ready.filter((c) => c.id !== only).map((c) => c.id) : [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId, only])

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

  /* What would go: everything registrable that has not been unticked. */
  const picked = ready.filter((course) => !dropped.includes(course.id))
  /* What still has no course once this has gone through: the elective the
     confirmation offers to choose next. */
  const unchosen = term.courses.filter((course) => course.placeholder && course.draft == null)
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
              {term.alert && (
                <DialogDescription>Registration stays open until {term.alert.closes}.</DialogDescription>
              )}
            </DialogHeader>
            {/* What is left to choose, now that registering is done: the
                elective that had no course, and the way to choose one. */}
            {unchosen.map((course) => (
              <div
                key={course.id}
                className="flex w-full items-center gap-3 rounded-md border border-gray-40 bg-card p-3 text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col text-body-md">
                  <span className="font-semibold text-gray-100">{course.name}</span>
                  <span className="text-gray-80">No course chosen yet</span>
                </span>
                {onOpenCourse && (
                  <Button size="sm" className="shrink-0" onClick={() => onOpenCourse(course)}>
                    Choose course
                  </Button>
                )}
              </div>
            ))}
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
              /* Only what can go. What cannot — a placeholder with no course,
                 a course whose prerequisites are not met — is not offered
                 here at all: it would only pull the student out of the one
                 thing they came to do. The elective waits for the
                 confirmation, once registering is done. */
              <div className="flex w-full flex-col gap-2">
                {ready.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    picked={!dropped.includes(course.id)}
                    onPick={(next) =>
                      setDropped((current) =>
                        next ? current.filter((id) => id !== course.id) : [...current, course.id]
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              /* Nothing to tick once the request is in the air. */
              <div className="flex w-full flex-col gap-2">
                {sent.map((course) => (
                  <CourseCard key={course.id} course={course} />
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
