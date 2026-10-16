import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "cn"
import { useState, type ReactNode } from "react"

import { Icon } from "@/components/icon"
import { RadioCard } from "@/components/stellic/primitives"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { termShape, type PlannedCourse, type Term } from "@/data/plan"

/* Step 3, and only for a term whose schedule is out: what the run should hold
 * to when it picks class times. Must haves are absolute; nice to haves are
 * ranked, and the order is the answer — the run takes them from the top and
 * gets as far down as the offerings allow. */

export type Pref = { id: string; title: string; options: string[]; chosen: string[] }

export type CoursePref = { instructor: boolean; who: string; topic: boolean; about: string }

export type SchedulePrefs = {
  must: Pref[]
  /** Narrow the campus to a named building rather than any location in it. */
  teachingLocation: boolean
  subTermBy: "term" | "dates"
  /** Nice to haves, best first. Dragging one rewrites this. */
  nice: Pref[]
  extras: "yes" | "no"
  course: Record<string, CoursePref>
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

/** Who might be teaching, for a preference that has to name somebody. */
const STAFF = ["Dr. P. Lindqvist", "Prof. D. Sullivan", "Dr. A. Petrov", "Prof. N. Adeyemi"]

export function defaultPrefs(term: Term): SchedulePrefs {
  const season = term.name.split(" ")[0]
  return {
    must: [
      {
        id: "seats",
        title: "Seat Availability",
        options: ["Only available sections", "Include full sections", "Include waitlists"],
        chosen: ["Only available sections"],
      },
      {
        id: "campus",
        title: "Campus",
        options: ["Main", "Downtown", "Online"],
        chosen: ["Main"],
      },
      {
        id: "modality",
        title: "Modality",
        options: ["In Person", "Online", "Hybrid"],
        chosen: ["In Person", "Online"],
      },
      {
        id: "subterm",
        title: "Sub-term",
        options: ["Full Term", `${season} 1`, `${season} 2`],
        chosen: [`${season} 1`, `${season} 2`],
      },
      {
        id: "career",
        title: "Career",
        options: ["Undergraduate", "Graduate"],
        chosen: ["Undergraduate"],
      },
    ],
    teachingLocation: false,
    subTermBy: "term",
    nice: [
      { id: "days", title: "Days of Week", options: DAYS, chosen: [...DAYS] },
      {
        id: "time",
        title: "Time of Day",
        options: ["Any", "Morning", "Afternoon", "Evening"],
        chosen: ["Any"],
      },
      {
        id: "density",
        title: "Class Density",
        options: ["Evenly distributed", "Back to back", "Fewest days on campus"],
        chosen: ["Evenly distributed"],
      },
    ],
    extras: "no",
    course: {},
  }
}

/** How well one generated week answers the nice to haves, nought to three per
 *  preference. Nothing here is a guess about the student: each is measured off
 *  the week itself against what they asked for. */
export function scoreSchedule(term: Term, prefs: SchedulePrefs) {
  const shape = termShape(term)
  const wanted = new Map(prefs.nice.map((p) => [p.id, p.chosen]))

  const dayNames = shape.days.map((d) => DAYS[d - 1])
  const asked = wanted.get("days") ?? DAYS
  const onAskedDays = dayNames.filter((d) => asked.includes(d)).length
  /* A day the student took off the list is not a preference they would like
     met — it is a day they cannot come in. A week that uses one has failed at
     the thing they actually said, however well it reads otherwise: four days
     out of five is not four fifths of an answer. */
  const intrudes = dayNames.some((day) => !asked.includes(day))
  const days = intrudes ? 1 : dayNames.length === 0 ? 1 : score(onAskedDays / dayNames.length)

  const time = (() => {
    const when = (wanted.get("time") ?? ["Any"])[0]
    if (!shape.earliest || when === "Any") return 3
    if (when === "Morning") return score(shape.latest! <= 12 ? 1 : shape.earliest <= 10 ? 0.6 : 0.2)
    if (when === "Afternoon") return score(shape.earliest >= 12 ? 1 : 0.4)
    return score(shape.latest! >= 17 ? 1 : 0.3)
  })()

  /* Evenly distributed wants the week used; the other two want it compressed.
   * Counted in days rather than as a ratio, because the difference between a
   * four-day week and a five-day one is the whole question here and a ratio
   * rounds it away. */
  const density = (() => {
    const how = (wanted.get("density") ?? ["Evenly distributed"])[0]
    const used = shape.days.length
    if (how === "Evenly distributed") return used >= 5 ? 3 : used === 4 ? 2 : 1
    return used <= 2 ? 3 : used === 3 ? 2 : 1
  })()

  const scores = { days, time, density }
  /* The ranking is the point: the first nice to have counts for most, so
   * reordering them can change which option comes out on top. */
  const weights = [3, 2, 1]
  const sum = prefs.nice.reduce(
    (n, pref, i) => n + (scores[pref.id as keyof typeof scores] ?? 0) * weights[i],
    0
  )
  /* And ranked below every week that did not, rather than losing a point and
     winning on tidiness. Far enough below that no amount of the rest makes up
     for it: the most the weighted sum can come to is eighteen. */
  const total = intrudes ? sum - 100 : sum
  return { ...shape, dayNames, scores, total, intrudes }
}

function score(ratio: number): 1 | 2 | 3 {
  return ratio >= 0.8 ? 3 : ratio >= 0.45 ? 2 : 1
}

/** What a row says under its title when it is closed. */
function summarise(pref: Pref, prefs: SchedulePrefs): string {
  if (pref.chosen.length === 0) return "Any"
  if (pref.id === "campus" && !prefs.teachingLocation) {
    return `${pref.chosen.join(", ")} (Any Teaching Location)`
  }
  return pref.chosen.join(", ")
}

/** One preference: what it is, what it comes to, and its options underneath. */
function PrefRow({
  title,
  value,
  open,
  onToggle,
  rank,
  handle,
  children,
}: {
  title: string
  value: string
  open: boolean
  onToggle: () => void
  rank?: number
  /** Drag props, for a nice to have that can be moved up the list. */
  handle?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex w-full items-start gap-2">
      {rank != null && (
        <span className="w-3 shrink-0 pt-[19px] text-body-md font-semibold text-gray-100">
          {rank}
        </span>
      )}
      {/* The card is the target, not the chevron on the end of it. */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-gray-40 bg-card",
          "transition-colors",
          !open && "hover:bg-gray-0"
        )}
      >
        <div className="flex w-full items-center">
          {/* Outside the button, or picking the card up would also open it. */}
          {handle && <span className="flex shrink-0 items-center pl-4">{handle}</span>}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} ${title} options`}
            className={cn(
              "flex h-[58px] min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 px-4 text-left",
              handle && "pl-2"
            )}
          >
            <span className="flex min-w-0 flex-col justify-center">
              <span className="truncate text-body-md text-gray-100">{title}</span>
              <span className="truncate text-label-md text-gray-80">{value}</span>
            </span>
            <Icon
              name={open ? "expand-more" : "chevron-right"}
              size={24}
              className="shrink-0 text-gray-100"
            />
          </button>
        </div>
        {open && <div className="flex w-full flex-col gap-2 px-4 pb-4">{children}</div>}
      </div>
    </div>
  )
}

/** The chosen values as chips, with everything else offered back. */
function Chips({
  label,
  pref,
  onChange,
}: {
  label: string
  pref: Pref
  onChange: (chosen: string[]) => void
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <span className="text-body-md font-semibold text-gray-100">{label}</span>
      <div className="flex w-full flex-wrap items-center gap-1 rounded-md border border-gray-40 p-2">
        {pref.chosen.length === 0 && <span className="text-body-md text-gray-80">Any</span>}
        {pref.chosen.map((value) => (
          <Badge key={value} variant="outline">
            {value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(pref.chosen.filter((v) => v !== value))}
              className="flex cursor-pointer items-center"
            >
              <Icon name="close" size={12} />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

function Handle({ listeners, attributes }: { listeners?: object; attributes?: object }) {
  return (
    <span
      {...listeners}
      {...attributes}
      className="flex shrink-0 cursor-grab items-center text-gray-80 active:cursor-grabbing"
    >
      <Icon name="drag-indicator" size={16} />
    </span>
  )
}

function SortableNice({
  pref,
  rank,
  prefs,
  open,
  onToggle,
  onChange,
}: {
  pref: Pref
  rank: number
  prefs: SchedulePrefs
  open: boolean
  onToggle: () => void
  onChange: (chosen: string[]) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pref.id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("w-full", isDragging && "z-10 opacity-80")}
    >
      <PrefRow
        title={pref.title}
        value={summarise(pref, prefs)}
        open={open}
        onToggle={onToggle}
        rank={rank}
        handle={<Handle listeners={listeners} attributes={attributes} />}
      >
        <Chips label={pref.title} pref={pref} onChange={onChange} />
      </PrefRow>
    </div>
  )
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (next: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-[11px] text-body-md text-gray-100 shadow-xs"
        >
          <span className="min-w-0 flex-1 truncate text-left">{value}</span>
          <Icon name="expand-more" size={16} className="shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        {options.map((option) => (
          <DropdownMenuItem key={option} onSelect={() => onChange(option)} className="text-body-md">
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** What the student wants of one course they are already taking. */
function CourseCard({
  course,
  pref,
  onChange,
}: {
  course: PlannedCourse
  pref: CoursePref
  onChange: (next: CoursePref) => void
}) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-gray-40 p-3">
      <div className="flex w-full items-start gap-2">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-label-md text-gray-100">{course.code}</span>
          <span className="text-body-md font-semibold text-gray-100">{course.name}</span>
        </span>
        <span className="shrink-0 text-label-md text-gray-80">{course.credits} credits</span>
      </div>

      <label className="flex w-full items-center justify-between gap-2">
        <span className="text-body-md text-gray-100">Preferred instructor</span>
        <Switch
          checked={pref.instructor}
          onCheckedChange={(on) => onChange({ ...pref, instructor: on })}
        />
      </label>
      {pref.instructor && (
        <Select
          value={pref.who}
          options={[course.instructor ?? STAFF[0], ...STAFF.filter((s) => s !== course.instructor)]}
          onChange={(who) => onChange({ ...pref, who })}
        />
      )}

      {/* Only a course that is taught around a topic has one to prefer. */}
      {course.topic && (
        <>
          <label className="flex w-full items-center justify-between gap-2">
            <span className="text-body-md text-gray-100">Preferred topic</span>
            <Switch
              checked={pref.topic}
              onCheckedChange={(on) => onChange({ ...pref, topic: on })}
            />
          </label>
          {pref.topic && (
            <Select
              value={pref.about}
              options={[course.topic, "Any topic"]}
              onChange={(about) => onChange({ ...pref, about })}
            />
          )}
        </>
      )}
    </div>
  )
}

export function GenerateSchedulePrefs({
  term,
  prefs,
  onChange,
}: {
  term: Term
  prefs: SchedulePrefs
  onChange: (next: SchedulePrefs) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const courses = term.courses.filter((c) => !c.placeholder)

  const toggle = (id: string) => setOpen((current) => (current === id ? null : id))
  const setPref = (list: "must" | "nice", id: string, chosen: string[]) =>
    onChange({
      ...prefs,
      [list]: prefs[list].map((p) => (p.id === id ? { ...p, chosen } : p)),
    })

  function reorder(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = prefs.nice.findIndex((p) => p.id === active.id)
    const to = prefs.nice.findIndex((p) => p.id === over.id)
    const next = [...prefs.nice]
    next.splice(to, 0, ...next.splice(from, 1))
    onChange({ ...prefs, nice: next })
  }

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <h3 className="text-h400 font-semibold text-black">What are your schedule preferences?</h3>
        <p className="text-body-md text-gray-80">
          Every schedule will meet your must haves. We'll fit in as many of your nice to haves as we
          can, starting from the top.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <h4 className="text-body-md font-semibold text-gray-100">Must Haves</h4>
        {prefs.must.map((pref) => (
          <PrefRow
            key={pref.id}
            title={pref.title}
            value={summarise(pref, prefs)}
            open={open === pref.id}
            onToggle={() => toggle(pref.id)}
          >
            {/* A sub-term can be named or bounded by dates, which is a choice
                before there is anything to choose. */}
            {pref.id === "subterm" && (
              <RadioGroup
                value={prefs.subTermBy}
                onValueChange={(next) =>
                  onChange({ ...prefs, subTermBy: next as SchedulePrefs["subTermBy"] })
                }
                className="flex-row gap-6"
              >
                <label className="flex cursor-pointer items-center gap-2 text-body-md text-gray-100">
                  <RadioGroupItem value="term" />
                  Select term
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-body-md text-gray-100">
                  <RadioGroupItem value="dates" />
                  Select date range
                </label>
              </RadioGroup>
            )}

            <Chips
              label={pref.id === "subterm" ? "Term" : pref.title}
              pref={pref}
              onChange={(chosen) => setPref("must", pref.id, chosen)}
            />

            {pref.id === "campus" && (
              <label className="flex cursor-pointer items-center gap-2 text-body-md font-semibold text-gray-100">
                <Checkbox
                  checked={prefs.teachingLocation}
                  onCheckedChange={(on) => onChange({ ...prefs, teachingLocation: on === true })}
                />
                Specify teaching location
              </label>
            )}
          </PrefRow>
        ))}

        <h4 className="pt-4 pb-2 text-body-md font-semibold text-gray-100">Nice to Haves</h4>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorder}>
          <SortableContext
            items={prefs.nice.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex w-full flex-col gap-2">
              {prefs.nice.map((pref, i) => (
                <SortableNice
                  key={pref.id}
                  pref={pref}
                  rank={i + 1}
                  prefs={prefs}
                  open={open === pref.id}
                  onToggle={() => toggle(pref.id)}
                  onChange={(chosen) => setPref("nice", pref.id, chosen)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {courses.length > 0 && (
          <>
            <h4 className="pt-4 pb-2 text-body-md font-semibold text-gray-100">
              Additional preferences for {courses.map((c) => c.code).join(", ")}
            </h4>
            <RadioGroup
              value={prefs.extras}
              onValueChange={(next) =>
                onChange({ ...prefs, extras: next as SchedulePrefs["extras"] })
              }
              className="w-full gap-2"
            >
              <RadioCard
                value="no"
                label="No"
                detail="I don't have any additional preferences"
                selected={prefs.extras === "no"}
              />
              <RadioCard
                value="yes"
                label="Yes"
                detail="e.g. specific instructor"
                selected={prefs.extras === "yes"}
              />
            </RadioGroup>

            {prefs.extras === "yes" &&
              courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  pref={
                    prefs.course[course.id] ?? {
                      instructor: false,
                      who: course.instructor ?? STAFF[0],
                      topic: false,
                      about: course.topic ?? "Any topic",
                    }
                  }
                  onChange={(next) =>
                    onChange({ ...prefs, course: { ...prefs.course, [course.id]: next } })
                  }
                />
              ))}
          </>
        )}
      </div>
    </>
  )
}
