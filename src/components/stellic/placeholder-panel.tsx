import { cn } from "cn"
import { useState } from "react"

import { Icon } from "@/components/icon"
import { Checklist, Fold, Heading } from "@/components/stellic/course-panel"
import { CourseSearch } from "@/components/stellic/course-search"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ELECTIVE_COURSES, ALL_ELECTIVES, type CatalogEntry } from "@/data/catalog"
import { activityFor } from "@/data/course-detail"
import {
  eligibility,
  placeholderChecklist,
  STAGE_LABEL,
  stageOf,
  TAB_MARK,
} from "@/data/course-sidebar"
import { DEGREE, type PlannedCourse, type Term } from "@/data/plan"

/* A placeholder opened on its own, read the way the course sidebar reads a
 * course: its name in the bar, its term as a tab over a gray block that says
 * where it stands, then the sections that matter. It has no course yet — no
 * catalogue entry, no sections, no prerequisites — so it shows only what a
 * placeholder has: the requirement it answers, its credits, a note, and the
 * way to fill it. Filled, the course standing in it is named in the block,
 * and everything about that course — its sections above all — is in the
 * course's own sidebar, which Choose and the course row open. */

export function PlaceholderPanel({
  course,
  term,
  plan,
  initialView = "detail",
  onOpenCourse,
  onOpenFilled,
  onEmpty,
  onRemove,
  onRegister,
  onClose,
}: {
  course: PlannedCourse
  /** The term the placeholder is held in. */
  term: Term
  /** Every term in the plan, for reading the filling course's eligibility. */
  plan: Term[]
  /** Opened from the card's search button, it starts on the courses. */
  initialView?: "detail" | "search"
  /** Opens one of the courses that could fill the placeholder, on its own. */
  onOpenCourse?: (entry: CatalogEntry) => void
  /** Opens the course standing in it, in its own sidebar, on its sections. */
  onOpenFilled?: () => void
  /** Takes the chosen course back out, leaving the placeholder as it was. */
  onEmpty?: () => void
  /** Takes the placeholder off the plan altogether. */
  onRemove?: () => void
  /** Opens the term's registration. */
  onRegister?: (term: Term) => void
  onClose: () => void
}) {
  const [searching, setSearching] = useState(initialView === "search")

  /* The placeholder as it reads: its own name while it is empty, and the
     name it held once a course is standing in it. */
  const seat = course.seat ?? { code: course.code, name: course.name }
  const filled = !course.placeholder
  const [name, setName] = useState(seat.name)
  const [renaming, setRenaming] = useState(false)
  const [credits, setCredits] = useState(String(course.credits))
  const [editingCredits, setEditingCredits] = useState(false)
  const [note, setNote] = useState("")
  const [open, setOpen] = useState({ checklist: true, counting: true, notes: false, history: false })
  const toggle = (key: keyof typeof open) => setOpen((was) => ({ ...was, [key]: !was[key] }))

  /* A finance placeholder lists finance courses; a general one lists general
     ones. Anything else falls back to every elective there is. */
  const eligible = ELECTIVE_COURSES[seat.code] ?? ALL_ELECTIVES
  const stage = stageOf(term, course)
  const mark = TAB_MARK[stage]
  /* The filling course's prerequisites decide whether it can be registered;
     an empty placeholder has none to read. */
  const met = filled
    ? eligibility({ code: course.code, name: course.name, reason: seat.name }, { term, plan }).met
    : true

  if (searching) {
    return (
      <aside className="flex h-full w-full flex-col overflow-x-clip overflow-y-auto bg-background pb-28">
        <div className="flex w-full shrink-0 items-start gap-2 border-b border-gray-40 bg-card px-6 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <button
              type="button"
              onClick={() => setSearching(false)}
              className="flex w-fit min-w-0 cursor-pointer items-center gap-1 text-label-md font-medium text-gray-80"
            >
              <Icon name="chevron-left" size={14} className="shrink-0" />
              <span className="min-w-0 truncate text-left">Back to {name}</span>
            </button>
            <h2 className="text-h400 font-semibold text-gray-100">Eligible courses</h2>
            <p className="text-body-md text-gray-80">
              For {name} · {term.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close course search"
            className="mt-[14px] flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-100 hover:bg-gray-5"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="flex w-full flex-col gap-4 p-6">
          <CourseSearch entries={eligible} onOpenCourse={onOpenCourse} />
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-x-clip overflow-y-auto bg-card pb-28">
      {/* The placeholder's name in the bar beside the close, as a course's is. */}
      <div className="flex w-full shrink-0 items-start gap-2 border-b border-gray-40 px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {renaming ? (
            <Input
              autoFocus
              aria-label="Placeholder name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setRenaming(false)}
              onKeyDown={(event) => event.key === "Enter" && setRenaming(false)}
              className="h-8 text-body-md"
            />
          ) : (
            <h2 className="flex items-center gap-2 text-h400 font-semibold text-gray-100">
              <span className="min-w-0 truncate">{name}</span>
              <button
                type="button"
                onClick={() => setRenaming(true)}
                aria-label="Rename placeholder"
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-80 hover:bg-gray-5"
              >
                <Icon name="edit" size={16} />
              </button>
            </h2>
          )}
          <p className="flex flex-wrap items-center gap-3 text-body-md text-gray-80">
            <span>Course Placeholder</span>
            <span className="flex items-center gap-1">
              <Icon name="watch-later" size={14} />
              {credits} Credits
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close placeholder"
          className="-mt-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-100 hover:bg-gray-5"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      {/* One term, so one tab: there is no catalogue for a placeholder. */}
      <div role="tablist" aria-label="Where this placeholder is" className="flex w-full gap-1 px-6 pt-4 pb-2">
        <span
          role="tab"
          aria-selected="true"
          className="flex items-center gap-2 rounded-md bg-gray-5 px-3 py-2 text-body-md text-gray-100"
        >
          <Icon name={mark.icon} size={16} className={mark.tone} />
          {term.name}
        </span>
      </div>

      <div className="mx-6 mb-6 flex flex-col gap-3 rounded-md bg-gray-0 p-4">
        <div className="flex w-full items-center gap-2">
          <h3 className="min-w-0 flex-1 text-caption-lg font-semibold text-gray-100">
            {STAGE_LABEL[stage]}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem
                onSelect={() => setOpen((was) => ({ ...was, notes: true }))}
                className="gap-2 py-1.5 text-body-md"
              >
                <Icon name="sticky-note-2" size={16} />
                Write a note
              </DropdownMenuItem>
              {onRemove && !term.locked && (
                <DropdownMenuItem onSelect={onRemove} className="gap-2 py-1.5 text-body-md">
                  <Icon name="close" size={16} />
                  Remove from plan
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex w-full items-center gap-4 text-body-md">
          <span className="w-14 shrink-0 font-semibold text-gray-100">Credits</span>
          {editingCredits ? (
            <Input
              autoFocus
              aria-label="Credits"
              value={credits}
              onChange={(event) => setCredits(event.target.value.replace(/\D/g, ""))}
              onBlur={() => setEditingCredits(false)}
              onKeyDown={(event) => event.key === "Enter" && setEditingCredits(false)}
              className="h-8 w-20 text-body-md"
            />
          ) : (
            <span className="min-w-0 flex-1 text-gray-100">{credits}</span>
          )}
          {/* A real course has its own credits; only an empty placeholder's
              are the student's to set. */}
          {!filled && !editingCredits && (
            <button
              type="button"
              onClick={() => setEditingCredits(true)}
              className="ml-auto shrink-0 cursor-pointer text-gray-100 underline [text-underline-position:from-font]"
            >
              edit
            </button>
          )}
        </div>

        {filled ? (
          <div className="flex w-full flex-col gap-2">
            <Heading>Selected course</Heading>
            {/* The course standing in it: the row opens the course's own
                sidebar; the bin gives the placeholder back. */}
            <div className="flex w-full items-stretch rounded-md border border-gray-40 bg-card">
              <button
                type="button"
                onClick={onOpenFilled}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 p-[7px] pl-3 text-left hover:bg-gray-5"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-md text-gray-80">{course.code}</span>
                  <span className="text-body-md font-semibold text-foreground">{course.name}</span>
                </span>
                <Icon name="chevron-right" size={16} className="shrink-0 text-gray-100" />
              </button>
              {onEmpty && !course.registered && (
                <button
                  type="button"
                  onClick={onEmpty}
                  aria-label={`Remove ${course.name} from this placeholder`}
                  className="flex cursor-pointer items-center border-l border-gray-40 px-3 text-gray-100 hover:bg-gray-5"
                >
                  <Icon name="delete" size={16} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <Button variant="primary" className="w-full" onClick={() => setSearching(true)}>
            <Icon name="s-search" size={16} />
            Find eligible courses
          </Button>
        )}
      </div>

      <Fold title="Planning checklist" open={open.checklist} onToggle={() => toggle("checklist")}>
        <Checklist
          steps={placeholderChecklist(term, course, met)}
          onChoose={onOpenFilled}
          onRegister={onRegister && (() => onRegister(term))}
        />
      </Fold>

      <Fold
        title="Counting for"
        summary={<Badge variant="outline">{seat.name}</Badge>}
        open={open.counting}
        onToggle={() => toggle("counting")}
      >
        <div className="flex w-full flex-col gap-1">
          <Heading>Requirement</Heading>
          <p className="text-body-md text-gray-100">
            Satisfies “{seat.name}” in{" "}
            <a href="/explain.html" className="underline [text-underline-position:from-font]">
              {DEGREE.credential}
            </a>
          </p>
        </div>
      </Fold>

      <Fold title="Notes" open={open.notes} onToggle={() => toggle("notes")}>
        <Textarea
          aria-label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add a note for yourself or your advisor"
          className="h-[88px] resize-none px-3 py-2 text-body-md placeholder:text-gray-80"
        />
      </Fold>

      <Fold title="Activity History" open={open.history} onToggle={() => toggle("history")}>
        <ul className="flex w-full flex-col gap-4">
          {activityFor(seat.code, term.name).map((event, i) => (
            <li key={i} className="flex w-full items-start gap-2">
              <Icon
                name={event.kind === "add" ? "add" : "close"}
                size={16}
                className={cn(
                  "mt-0.5 shrink-0",
                  event.kind === "add" ? "text-success-100" : "text-alert-100"
                )}
              />
              <span className="flex min-w-0 flex-col text-body-md">
                <span className="text-gray-100">
                  {event.kind === "add" ? "Added to" : "Removed from"} {event.term}
                </span>
                <span className="text-gray-80">
                  {event.when} by {event.who}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Fold>
    </aside>
  )
}
