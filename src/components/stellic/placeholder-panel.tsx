import { useState } from "react"

import { Icon } from "@/components/icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CourseSearch } from "@/components/stellic/course-search"
import { ELECTIVE_COURSES, ALL_ELECTIVES, type CatalogEntry } from "@/data/catalog"
import {
  CREDIT_GROUP_LABEL,
  DEGREE,
  courseGroup,
  type PlannedCourse,
  type Term,
} from "@/data/plan"

/* A seat opened on its own: what it is holding a place for, which term it is
 * in, and the way to fill it. "Find eligible courses" turns the same panel
 * into the search, which comes back to this. */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <span className="text-body-md font-semibold text-foreground">{label}</span>
      {children}
    </div>
  )
}

export function PlaceholderPanel({
  course,
  term,
  initialView = "detail",
  onOpenCourse,
  onEmpty,
  onClose,
}: {
  course: PlannedCourse
  /** The term the seat is held in. */
  term: Term
  /** Opened from the card's search button, it starts on the courses. */
  initialView?: "detail" | "search"
  /** Opens one of the courses that could fill the seat, on its own. */
  onOpenCourse?: (entry: CatalogEntry) => void
  /** Takes the chosen course back out, leaving the seat as it was. */
  onEmpty?: () => void
  onClose: () => void
}) {
  const [searching, setSearching] = useState(initialView === "search")

  /* The seat as it reads: its own name while it is empty, and the name it
     held once a course is standing in it. */
  const seat = course.seat ?? { code: course.code, name: course.name }
  const filled = course.seat != null

  /* A finance seat lists finance courses; a general one lists general ones.
     Anything else falls back to every elective there is. */
  const eligible = ELECTIVE_COURSES[seat.code] ?? ALL_ELECTIVES

  if (searching) {
    return (
      /* The same grey ground the seat's own panel stands on, with the search
         and its results as two cards on it. */
      <aside className="flex h-full w-full flex-col gap-4 overflow-x-clip overflow-y-auto bg-background p-6 pb-28">
        {/* Where this came from, and the way out of it. */}
        <div className="flex w-full shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setSearching(false)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-body-md text-gray-80"
          >
            <Icon name="chevron-left" size={14} className="shrink-0" />
            <span className="min-w-0 truncate text-left">Back to {seat.name}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close course search"
            className="shrink-0 cursor-pointer rounded-md text-gray-100"
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        <CourseSearch entries={eligible} onOpenCourse={onOpenCourse} />
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-full flex-col gap-4 overflow-x-clip overflow-y-auto bg-background p-6 pb-28">
      <div className="flex w-full justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close placeholder"
          className="cursor-pointer rounded-md text-gray-100"
        >
          <Icon name="close" size={24} />
        </button>
      </div>

      <div className="flex w-full flex-col rounded-md bg-card shadow-sm">
        <div className="flex w-full flex-col gap-1 p-6">
          <h2 className="flex flex-wrap items-baseline gap-2 text-h300 font-semibold text-gray-100">
            {seat.name}
            <a
              href="#"
              className="text-body-md font-normal text-gray-80 underline [text-underline-position:from-font]"
            >
              (edit)
            </a>
          </h2>
          <p className="text-body-md text-gray-80">Course Placeholder</p>
        </div>
      </div>

      <div className="flex w-full flex-col rounded-md bg-card shadow-sm">
        {/* Which term is holding it, and what can be done to it there. */}
        <div className="flex w-full items-center gap-2 rounded-t-md bg-primary-0 px-6 py-3">
          <span className="text-body-md font-semibold text-foreground">{term.name}</span>
          <Badge variant="warning">{CREDIT_GROUP_LABEL[courseGroup(term, course)]}</Badge>
          <span className="ml-auto flex items-center gap-1">
            <Button size="sm">Actions</Button>
            <Icon name="unfold-more" size={16} className="text-gray-80" />
          </span>
        </div>

        <div className="flex w-full flex-col gap-4 p-6">
          <Section label="Requirement">
            <p className="text-body-md text-gray-80">
              Satisfies "{seat.name}" in{" "}
              <a href="#" className="underline [text-underline-position:from-font]">
                {DEGREE.credential}
              </a>
            </p>
          </Section>

          <Section label="Note">
            <a
              href="#"
              className="w-fit text-body-md text-gray-80 underline [text-underline-position:from-font]"
            >
              + Add note
            </a>
          </Section>

          <Section label="Credits placeholder">
            <Input defaultValue={String(course.credits)} className="text-body-md" />
          </Section>

          {/* What is standing in it, where something is. The bin gives the
              seat back rather than taking the requirement off the plan. */}
          {filled && (
            <Section label="Selected course">
              <div className="flex w-full items-stretch rounded-md border border-gray-40 bg-card">
                <div className="flex min-w-0 flex-1 flex-col p-[7px]">
                  <span className="text-body-md text-gray-80">{course.code}</span>
                  <span className="text-body-md font-semibold text-foreground">{course.name}</span>
                  {course.section && (
                    <span className="flex items-center gap-1 text-body-md text-foreground">
                      <Icon name="calendar-today" size={14} />
                      {course.section}
                    </span>
                  )}
                </div>
                {onEmpty && (
                  <button
                    type="button"
                    onClick={onEmpty}
                    aria-label={`Remove ${course.name} from this seat`}
                    className="flex cursor-pointer items-center border-l border-gray-40 px-3 text-gray-100 hover:bg-gray-5"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Nothing to look for while something is in it. */}
      {!filled && (
        <Button variant="primary" className="w-full" onClick={() => setSearching(true)}>
          <Icon name="s-search" size={16} />
          Find eligible courses
        </Button>
      )}
    </aside>
  )
}
