import { offeredIn, type CatalogEntry } from "@/data/catalog"
import { courseDetail, meetingLines, type PrereqNode, type PrereqState } from "@/data/course-detail"
import type { Meeting, PlannedCourse, Term } from "@/data/plan"
import { NOW } from "@/data/review"

/* What the course sidebar knows about a course at each point in its life: not
 * planned, planned, registered, under way, taken. The sidebar shows only what
 * matters at the point the course is at, so each of these is worked out here
 * once and read by the panel, rather than decided row by row in the markup. */

/* ------------------------------------------------------------------ stage */

/** Where one instance of a course is in its life. */
export type Stage = "planned" | "registered" | "progress" | "taken"

export function stageOf(term: Term, course: PlannedCourse): Stage {
  if (term.state === "completed") return "taken"
  if (term.state === "registered") return "progress"
  return course.registered ? "registered" : "planned"
}

export const STAGE_LABEL: Record<Stage, string> = {
  planned: "Planned",
  registered: "Registered",
  progress: "In Progress",
  taken: "Taken",
}

/** One place a course sits in the plan. A course taken twice — failed and
 *  retaken, say — has two, and the sidebar gives each its own tab. */
export type Instance = { course: PlannedCourse; term: Term }

/** Every place the plan holds this course, newest first: the attempt that
 *  matters now leads, and the ones behind it follow. */
export function instancesOf(code: string, plan: Term[]): Instance[] {
  return plan
    .flatMap((term) =>
      term.courses
        .filter(
          (course) =>
            !course.placeholder &&
            course.code === code &&
            /* A course a draft is taking away is on its way out, not a
               place the course is. */
            course.draft?.mark !== "moved" &&
            course.draft?.mark !== "removed"
        )
        .map((course) => ({ course, term }))
    )
    .reverse()
}

/* ------------------------------------------------------------------ dates */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function at(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute)
}

/** "1 Nov 2026, 12:00am" — the way the checklist says a date. */
export function longDate(date: Date): string {
  const hour = date.getHours()
  const shown = hour % 12 === 0 ? 12 : hour % 12
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${shown}:${minutes}${hour >= 12 ? "pm" : "am"}`
}

/** How long until a date, said the way a countdown chip says it. */
export function countdown(to: Date, from: Date = NOW): string | null {
  const ms = to.getTime() - from.getTime()
  if (ms <= 0) return null
  const days = Math.floor(ms / 86_400_000)
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":")
}

/** When a term's classes come out, when registering opens and closes, and the
 *  last day to add or drop. The registrar publishes these per term; the
 *  prototype keeps them on the same calendar every year. A term with its
 *  registration window open says when it closes, and that date wins. */
export function termDates(term: Term): {
  sections: Date
  registerOpens: Date
  registerCloses: Date
  addDrop: Date
  /** The closing date as the term's own banner words it, where it has one. */
  closesLabel?: string
} {
  const [season, yearText] = term.name.split(" ")
  const year = Number(yearText)
  const dates =
    season === "Fall"
      ? {
          sections: at(year, 3, 1),
          registerOpens: at(year, 3, 15, 9),
          registerCloses: at(year, 4, 2, 23, 59),
          addDrop: at(year, 8, 15, 21),
        }
      : season === "Summer"
        ? {
            sections: at(year, 2, 1),
            registerOpens: at(year, 2, 15, 9),
            registerCloses: at(year, 4, 1, 23, 59),
            addDrop: at(year, 5, 10, 21),
          }
        : {
            sections: at(year - 1, 10, 1),
            registerOpens: at(year - 1, 10, 17, 13),
            registerCloses: at(year, 0, 18, 23, 59),
            addDrop: at(year, 1, 1, 21),
          }
  return { ...dates, closesLabel: term.alert?.closes }
}

/* -------------------------------------------------------------- checklist */

export type StepState = "done" | "current" | "todo" | "blocked"

export type Step = { label: string; state: StepState; chip?: string }

/** The four things between planning a course and sitting in it, each with the
 *  date it turns on. Done, the one to do now, the ones still to come — and a
 *  countdown on whichever date is next to arrive. */
export function planningChecklist(term: Term, course: PlannedCourse, met: boolean): Step[] {
  const dates = termDates(term)
  const sectionsOut = term.scheduled === true || term.locked === true
  const picked = course.section != null
  const open = term.alert != null
  const registered = course.registered === true
  const deadline = dates.closesLabel ?? longDate(dates.registerCloses)

  const select: Step = picked
    ? { label: "Select sections", state: "done" }
    : sectionsOut
      ? { label: "Select sections", state: "current" }
      : { label: `Select sections, available ${longDate(dates.sections)}`, state: "todo" }

  const register: Step = registered
    ? { label: "Register course", state: "done" }
    : open
      ? { label: `Register now, deadline ${deadline}`, state: picked ? "current" : "todo" }
      : {
          label: `Register ${longDate(dates.registerOpens)}`,
          state: "todo",
          /* Counting down only once there is a class to register for. */
          chip: picked ? (countdown(dates.registerOpens) ?? undefined) : undefined,
        }

  const addDrop: Step = {
    label: `Add/drop deadline ${longDate(dates.addDrop)}`,
    state: "todo",
    chip: registered ? (countdown(dates.addDrop) ?? undefined) : undefined,
  }

  return [
    met
      ? { label: "Meet eligibility: prerequisites", state: "done" }
      : { label: "Meet eligibility: prerequisites not met", state: "blocked" },
    select,
    register,
    addDrop,
  ]
}

/* ------------------------------------------------------------ eligibility */

/** A prerequisite as the sidebar lists it: what is asked for, and where the
 *  student stands against it. */
export type PrereqLine = { label: string; met: boolean; status: string }

const STANDING: Record<PrereqState, string> = {
  earned: "Earned",
  progress: "In progress",
  planned: "Planned",
  remaining: "Not taken",
  blocked: "Can't be met",
  neutral: "Not taken",
}

/** The prerequisites on the route the student is on — the first option — as
 *  one flat list. A group where any one will do shows the best of its
 *  members, because that is the one that answers it. */
export function eligibility(entry: CatalogEntry): { met: boolean; lines: PrereqLine[] } {
  const { options } = courseDetail(entry).prerequisites
  if (options.length === 0) return { met: true, lines: [] }
  /* Met once some route is earned or on its way: a course under way now is
     done before any term the plan is still choosing for. */
  const met = options.some((option) => option.state === "earned" || option.state === "progress")
  const rank = (state?: PrereqState) =>
    state === "earned" ? 3 : state === "progress" ? 2 : state === "planned" ? 1 : 0
  const flat = (nodes: PrereqNode[]): PrereqNode[] =>
    nodes.flatMap((node) => {
      if (!node.children) return [node]
      const inside = flat(node.children)
      return node.any ? [inside.reduce((a, b) => (rank(b.state) > rank(a.state) ? b : a))] : inside
    })
  const route = options.find((o) => o.state === "earned" || o.state === "progress") ?? options[0]
  const lines = flat(route.children).map((node) => {
    const state = node.state ?? "remaining"
    const ok = state === "earned" || state === "progress" || state === "planned"
    return {
      label: [node.code ?? node.label, node.note].filter(Boolean).join(", "),
      met: ok,
      status: state === "remaining" || state === "neutral" ? STANDING[state] : (node.meta ?? STANDING[state]),
    }
  })
  return { met, lines }
}

/** "Usually offered: Fall, Spring". */
export function usuallyOffered(code: string): string {
  return offeredIn(code).join(", ")
}

/* --------------------------------------------------------------- sections */

export type SidebarSection = {
  code: string
  meetings: Meeting[]
  when: string[]
  instructors: string[]
  available: number
  capacity: number
  /** Whether the student meets what this section asks over and above the
   *  course — some are held for a cohort, or ask for a GPA or a standing. */
  eligible: boolean
  classNo: string
  building: string
  room: string
  notes: string
}

const BUILDINGS = ["Jarvis Hall-SW", "Hale Business Center", "Mercer Library", "Okafor Hall"]
const NOTES =
  "Seats are held for declared majors until the first week of registration, then open to " +
  "everyone. Students on the waitlist are enrolled in order as seats come free, up to the " +
  "add/drop deadline. Attendance at the first class is required to keep a seat."

/** The classes on offer for a course: the ones the catalogue lists, and the
 *  ones it leaves out — full, or held for students who meet something more —
 *  which the sidebar keeps behind "see more". Same code, same sections. */
export function sectionsFor(entry: CatalogEntry): SidebarSection[] {
  const detail = courseDetail(entry)
  const seed = [...entry.code].reduce((n, c) => n + c.charCodeAt(0), 0)
  const listed = detail.sections.map((section, i) => {
    const [available, capacity] = section.seats.split("/").map(Number)
    return { section, available, capacity, eligible: true, i }
  })
  /* What is held back: the first one full, the next held for students who
     meet a section requirement, alternating after that. */
  const held = Array.from({ length: detail.hidden }, (_, h) => {
    const i = listed.length + h
    const meetings = detail.sections[h % detail.sections.length]?.meetings ?? []
    return {
      section: {
        code: `Lec-0${i + 1}`,
        when: meetingLines(meetings),
        meetings,
        who: detail.instructors[h % detail.instructors.length].name,
        seats: "",
      },
      available: h % 2 === 0 ? 0 : 12 + ((seed + h) % 20),
      capacity: 40,
      eligible: h % 2 === 0,
      i,
    }
  })
  return [...listed, ...held]
    .map(({ section, available, capacity, eligible, i }) => ({
      code: section.code,
      meetings: section.meetings ?? [],
      when: section.when,
      instructors: [section.who, detail.instructors[(i + 1) % detail.instructors.length].name].filter(
        (name, at, all) => all.indexOf(name) === at
      ),
      available,
      capacity,
      eligible,
      classNo: String(9000 + ((seed * 7 + i * 113) % 999)),
      building: BUILDINGS[(seed + i) % BUILDINGS.length],
      room: `Room ${100 + ((seed + i * 13) % 60)}`,
      notes: NOTES,
    }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

/** What a section asks for over and above the course, for one that the
 *  student does not meet. */
export const SECTION_REQUIREMENTS = [
  { label: "Minimum 3.1 GPA", status: "Below requirement" },
  { label: "Junior standing", status: "Below requirement" },
]

const DAY_NAME = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** "Mon Wed 10:30am - 12:50pm" — a section's hours with the days spelled out,
 *  which is how its detail reads. Days that keep the same hours share a line,
 *  the same way the row's short form does. */
export function meetingDays(meetings: Meeting[]): string[] {
  const groups: { days: number[]; from: number; to: number }[] = []
  for (const meeting of meetings) {
    const same = groups.find((g) => g.from === meeting.from && g.to === meeting.to)
    if (same) same.days.push(meeting.day)
    else groups.push({ days: [meeting.day], from: meeting.from, to: meeting.to })
  }
  return groups.map((g) => {
    const hours = meetingLines([{ day: g.days[0], from: g.from, to: g.to }])[0]
    return `${g.days.map((d) => DAY_NAME[d]).join(" ")} ${hours.slice(hours.indexOf(" ") + 1)}`
  })
}

/* --------------------------------------------------------- grades, canvas */

const SEEDED_GRADES = ["A", "A-", "B+", "A", "B", "A-"]

function seedOf(code: string): number {
  return [...code].reduce((n, c) => n + c.charCodeAt(0), 0)
}

/** The grade so far in a course under way, or the grade it ended on. A taken
 *  course that failed does not count for anything. */
export function gradeOf(course: PlannedCourse): string {
  return course.grade ?? SEEDED_GRADES[seedOf(course.code) % SEEDED_GRADES.length]
}

export type Assignment = {
  name: string
  status: string
  tone: "late" | "lateSubmitted" | "onTime"
  score: string
}

const ASSIGNMENTS = ["Problem set", "Case write-up", "Quiz", "Lab report", "Reading response"]

/** What Canvas has on the course: the latest three assignments, newest
 *  first, with how and when each went in. A course under way can have one
 *  outstanding; a finished one has everything in. */
export function canvasActivity(course: PlannedCourse, finished: boolean): Assignment[] {
  const seed = seedOf(course.code)
  const name = (i: number) => `${ASSIGNMENTS[(seed + i) % ASSIGNMENTS.length]} ${3 - i}`
  const score = (i: number) => `${88 + ((seed + i * 5) % 13)}/100`
  return [
    finished
      ? { name: name(0), status: "Submitted Dec 10", tone: "onTime", score: score(0) }
      : { name: name(0), status: "Due Nov 28 (Late)", tone: "late", score: "–/100" },
    { name: name(1), status: "Submitted Nov 21 (Late)", tone: "lateSubmitted", score: score(1) },
    { name: name(2), status: "Submitted Nov 14", tone: "onTime", score: score(2) },
  ]
}

/** The last thing that happened in the course on Canvas. */
export function lastCanvasActivity(course: PlannedCourse): string {
  return `Nov ${21 + (seedOf(course.code) % 9)}`
}
