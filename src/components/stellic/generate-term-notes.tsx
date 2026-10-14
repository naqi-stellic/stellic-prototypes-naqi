import { useRef } from "react"

import { Icon } from "@/components/icon"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { eligibleCourses, type PlannedCourse } from "@/data/plan"
import { useScript } from "@/lib/typing"

/* Step 2: what the generator cannot work out for itself. Free text about the
 * term, and — only where the term is holding a seat — what should fill it. */

const PLACEHOLDER =
  "Instructions for the scheduler, e.g. I work 20 hours a week — keep this term light and finish the finance core early."

/** What the student has said about one held seat. */
export type SeatNote = { filters: string[]; prefer: string }

/** The filters a seat carries before anybody narrows it. */
export const DEFAULT_FILTERS = ["Main campus", "Undergraduate", "In person"]

/** What the seat's box fills itself in with, for the same reason the plan's
 *  does: the run answers it, and a general elective that comes back as a
 *  philosophy course is only worth watching if you saw what was asked for.
 *  Short enough to type at the rate a person types. */
export const SEAT_INTEREST = "Philosophy"

/** A seat nobody has said anything about yet. */
export const defaultSeatNote = (): SeatNote => ({
  filters: DEFAULT_FILTERS,
  prefer: "",
})

function SeatBlock({
  course,
  note,
  onChange,
}: {
  course: PlannedCourse
  note: SeatNote
  onChange: (next: SeatNote) => void
}) {
  const script = useScript()
  const filled = useRef(false)

  /* The same stage affordance as the plan's own instruction box: click into
     it and the interest writes itself, once, and only into an empty box. */
  const autofill = () => {
    if (filled.current || note.prefer.trim()) return
    filled.current = true
    void script.type(SEAT_INTEREST, (prefer) => onChange({ ...note, prefer }))
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-gray-40 bg-gray-0 p-[11px]">
      <div className="flex w-full items-start gap-2">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-md text-gray-80">Elective</span>
          <span className="text-body-md font-semibold text-gray-100">{course.name}</span>
        </span>
        <span className="shrink-0 text-body-md text-gray-80">{course.credits} credits</span>
      </div>

      <p className="text-body-md text-gray-100">
        {eligibleCourses(course).toLocaleString()} courses are eligible for this requirement.
      </p>

      <div className="flex w-full flex-wrap items-center gap-1">
        {note.filters.map((filter) => (
          <Badge key={filter} variant="secondary">
            {filter}
            <button
              type="button"
              aria-label={`Remove the ${filter} filter`}
              onClick={() =>
                onChange({ ...note, filters: note.filters.filter((f) => f !== filter) })
              }
              className="flex cursor-pointer items-center"
            >
              <Icon name="close" size={12} />
            </button>
          </Badge>
        ))}
      </div>

      <label className="flex w-full flex-col gap-2">
        <span className="text-body-md text-gray-100">
          What types of courses do you want to prioritize?
        </span>
        <Textarea
          value={note.prefer}
          onFocus={autofill}
          onChange={(event) => {
            script.stop()
            onChange({ ...note, prefer: event.target.value })
          }}
          placeholder="Preferences on courses?"
          className="h-[72px] resize-none bg-card px-3 py-2 text-body-md placeholder:text-gray-80"
        />
      </label>
    </div>
  )
}

export function GenerateTermNotes({
  seats,
  notes,
  onNotesChange,
  seatNotes,
  onSeatNoteChange,
}: {
  /** The held seats in this term, which may be none. */
  seats: PlannedCourse[]
  notes: string
  onNotesChange: (next: string) => void
  seatNotes: Record<string, SeatNote>
  onSeatNoteChange: (courseId: string, next: SeatNote) => void
}) {
  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <h3 className="text-h400 font-semibold text-black">Give the scheduler instructions</h3>
        <p className="text-body-md text-gray-80">
          Optional. Say what this term should include, avoid, or work around. The more specific you are, the better your course picks.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <label htmlFor="term-instructions" className="text-body-md font-semibold text-foreground">
          Term instructions
        </label>
        <Textarea
          id="term-instructions"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder={PLACEHOLDER}
          className="h-[88px] resize-none px-3 py-2 text-body-md placeholder:text-gray-80"
        />
      </div>

      {/* Only where there is a seat to fill. A term with every course chosen
          has nothing to say here, and an empty heading is worse than none. */}
      {seats.length > 0 && (
        <div className="flex w-full flex-col gap-2">
          <p className="text-body-md font-semibold text-foreground">Elective instructions</p>
          {seats.map((course) => (
            <SeatBlock
              key={course.id}
              course={course}
              note={seatNotes[course.id] ?? defaultSeatNote()}
              onChange={(next) => onSeatNoteChange(course.id, next)}
            />
          ))}
        </div>
      )}
    </>
  )
}
