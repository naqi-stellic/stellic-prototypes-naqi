import { DUAL_ENROLMENT } from "@/data/audit"
import type { CatalogEntry } from "@/data/catalog"
import { INCOMING_CREDITS, TRANSFER_COLLEGE } from "@/data/incoming"
import { CREDITS_PER_COURSE, DEGREE, SECTION_SLOTS, type Meeting } from "@/data/plan"

/* What a course looks like when it is opened on its own: the catalogue entry
 * for it, the classes on offer, and everything the audit knows about where it
 * could count. None of this is in the plan's own data — a course the student
 * has not taken has no row anywhere — so it is built from the entry, the same
 * way every term gets its sections: deterministic from the code, so the same
 * course reads the same every time it is opened. */

export type PrereqState =
  | "earned"
  | "progress"
  | "planned"
  /** Asked for and not earned: the audit's red outline. */
  | "remaining"
  /** Asked for and now out of reach. */
  | "blocked"
  /** Nothing has happened here either way — an option nobody has started. */
  | "neutral"

export type PrereqNode = {
  /** A course by its code, or a condition in words. One or the other. */
  code?: string
  label?: string
  /** "minimum grade B" and the like, beside the code. */
  note?: string
  state?: PrereqState
  /** What it came to, on the right: a grade, a standing, a count. */
  meta?: string
  tone?: "good" | "bad"
  /** A group of its own, which is what makes this a tree. */
  children?: PrereqNode[]
  /** One of the children is enough, rather than all of them. */
  any?: boolean
  open?: boolean
}

export type PrereqOption = {
  name: string
  state: PrereqState
  meta: string
  tone?: "good" | "bad"
  open?: boolean
  /** Said in place of the children while it is folded away. */
  summary?: string
  children: PrereqNode[]
}

export type Section = {
  code: string
  when: string[]
  who: string
  seats: string
  /** The hours themselves, not only the words for them: a class can be drawn
   *  on the week from this, which is what makes hovering one worth doing. */
  meetings?: Meeting[]
}

export type CourseDetail = {
  credits: number
  campus: string
  sections: Section[]
  /** Sections not shown, because they have no seats left. */
  hidden: number
  attributes: string[]
  topics: string[]
  description: string
  requiredSections: { kind: string; available: number }[]
  instructors: { name: string; semesters: number }[]
  /** No options at all where a course asks for nothing. */
  prerequisites: { directive?: string; options: PrereqOption[] }
  equivalents: string[]
  countsFor: { name: string; under: string }[]
  /** How many times the course can be taken, as Eligibility says it. */
  repeatLimit: string
}

const INSTRUCTORS = [
  "Dr. P. Lindqvist",
  "Dr. A. Ferreira",
  "Dr. R. Okafor",
  "M. Stehlik",
  "Dr. J. Alvarez",
  "Dr. N. Haddad",
]

const ATTRIBUTES = ["Business core", "Writing intensive", "Quantitative", "Global perspective"]
const TOPICS = ["Markets", "Analysis", "Case method", "Applied practice"]

/** Same code, same details, every time — the panel is a fact about a course
 *  rather than something that changes each time it is opened. */
function seedOf(code: string): number {
  return [...code].reduce((n, c) => n + c.charCodeAt(0), 0)
}

/* What the student has, which is what the audit reads a prerequisite against.
 * They are at the start of the degree, so the only credits already theirs are
 * the ones they arrived with: the transfer work on the record next door. */
const EARNED: Record<string, string> = Object.fromEntries(
  DUAL_ENROLMENT.courses.map((course) => [course.code, `Transfer credit, ${TRANSFER_COLLEGE}`])
)

const IN_PROGRESS = ["BUS 101", "MATH 140", "MIS 120", "PSYC 101", "ENGL 210"]

/* Already in the plan for a term still to come. It is not earned and it is not
 * under way, but it is not missing either — the plan says when it happens. */
const PLANNED: Record<string, string> = {
  "ACCT 201": "Planned Spring 2027",
}

/* Courses the student has not touched, which is what the routes they are not
 * on are built from. Only one option can be the one that counts, so the others
 * have to read as untouched or out of reach rather than as a second thing
 * quietly going well. */
const UNTOUCHED = ["MGMT 210", "BLAW 301", "SOC 101", "PHIL 240", "HIST 205"]

/** A course as the audit finds it: passed, under way, planned, or still to
 *  come. */
function courseNode(code: string, note?: string): PrereqNode {
  if (EARNED[code]) return { code, note, state: "earned", meta: EARNED[code] }
  if (IN_PROGRESS.includes(code)) return { code, note, state: "progress", meta: "In progress" }
  if (PLANNED[code]) return { code, note, state: "planned", meta: PLANNED[code] }
  return { code, note, state: "remaining" }
}

/* Conditions that are not courses. The student's own standing decides how each
 * one reads: fifteen credits in hand, the first year under way, and the
 * finance concentration declared when they arrived. */
const CONDITIONS: Record<string, PrereqNode> = {
  credits: {
    label: "12 total credits",
    state: "earned",
    meta: `${INCOMING_CREDITS.flatMap((g) => g.items).reduce((n, i) => n + i.credits, 0)} completed`,
  },
  standing: {
    label: "Good academic standing",
    state: "earned",
    meta: "No holds",
  },
  sophomore: {
    label: "Sophomore standing",
    state: "progress",
    meta: "On track, Sophomore by Fall 2027",
    tone: "good",
  },
  junior: {
    label: "Junior standing",
    state: "progress",
    meta: "On track, Junior by Fall 2028",
    tone: "good",
  },
  declared: {
    label: "Declare the Finance concentration",
    state: "earned",
    meta: "Declared Sep 2026",
  },
  second: {
    label: "Declare a second major",
    state: "neutral",
    meta: "Not declared",
  },
  honors: {
    label: "Admission to the Honors College",
    state: "neutral",
    meta: "Not admitted",
  },
}

type Body = Omit<PrereqOption, "name" | "open">

/** What an option comes to, read off what is inside it. */
function summarise(children: PrereqNode[]): Body {
  /* A group where one child is enough counts as one thing, and is met by the
     best of what is inside it — otherwise a choice would read as a shortfall
     merely for having options the student did not take. */
  const rank = (state?: PrereqState) =>
    state === "earned" ? 3 : state === "progress" ? 2 : state === "planned" ? 1 : 0
  const flat = (nodes: PrereqNode[]): PrereqNode[] =>
    nodes.flatMap((node) => {
      if (!node.children) return [node]
      const inside = flat(node.children)
      if (!node.any) return inside
      const best = inside.reduce((a, b) => (rank(b.state) > rank(a.state) ? b : a))
      return [best]
    })
  const leaves = flat(children)
  const earned = leaves.filter((n) => n.state === "earned").length
  const going = leaves.filter((n) => n.state === "progress" || n.state === "planned").length
  const missing = leaves.length - earned - going

  if (missing === 0 && going === 0) {
    return { state: "earned", meta: "Earned", tone: "good", children }
  }
  if (earned === 0 && going === 0) {
    return { state: "neutral", meta: "Nothing started", children }
  }
  if (missing === 0) {
    return { state: "progress", meta: "On track", tone: "good", children }
  }
  return { state: "remaining", meta: `${missing} not earned`, tone: "bad", children }
}

/* The routes that are closed: a grade already in and under what the option
 * asks, on a course that cannot be repeated. */
const MINIMUMS = ["B", "B+", "A−"]

function closed(seed: number): Body {
  const codes = Object.keys(EARNED)
  const shut = codes[seed % codes.length]
  const minimum = MINIMUMS[seed % MINIMUMS.length]
  return {
    state: "blocked",
    meta: "Can't be met",
    tone: "bad",
    /* Transfer credit carries units and no grade points, which is the rule
       the record next door is kept under — so a minimum grade is a bar this
       route can never clear. */
    summary: `${shut} carries no grade points, so the ${minimum} minimum this option asks for cannot be met`,
    children: [
      {
        code: shut,
        note: `minimum grade ${minimum}`,
        state: "blocked",
        meta: "Transfer credit, no grade points",
        tone: "bad",
      },
      CONDITIONS.standing,
    ],
  }
}

/** Numbered and folded in the order they are given, the first one open. */
function laid(bodies: Body[]): PrereqOption[] {
  return bodies.map((body, i) => ({ ...body, name: `Option ${i + 1}`, open: i === 0 }))
}

/** The number in a course's code, which is how far into the subject it is and
 *  therefore how much it asks for. */
function level(code: string): number {
  return Number(code.replace(/\D+/g, "")) || 100
}

/* The courses a subject builds on within itself. A finance elective asks for
 * finance rather than for whatever the general pool happened to offer, which
 * is also what makes a course in the plan hold up the ones after it. */
const SUBJECT_GATE: Record<string, string[]> = {
  FIN: ["FIN 301", "FIN 340"],
  ACCT: ["ACCT 201", "ACCT 202"],
  ECON: ["ECON 201", "ECON 202"],
  DATA: ["DATA 210", "STAT 210"],
  STAT: ["MATH 140", "STAT 210"],
  MIS: ["MIS 120", "MIS 250"],
  OPS: ["STAT 210", "OPS 320"],
  BUS: ["BUS 101", "BUS 390"],
  MKTG: ["MKTG 201"],
  MGMT: ["BUS 101", "MGMT 210"],
  BLAW: ["BUS 101"],
  ENGL: ["ENGL 210"],
}

/* How much a course asks for depends on how deep it is: a first-year course
 * asks for nothing, a second-year one for a course or two, and only the later
 * ones offer more than one way in. Where there is a choice, exactly one of the
 * ways is the one the student is on. */
function prerequisites(entry: CatalogEntry, seed: number): CourseDetail["prerequisites"] {
  const depth = level(entry.code)
  /* Never ask a course for itself: the deeper lists hold courses that are
     themselves in the catalogue. */
  const pick = (from: string[]) => {
    const rest = from.filter((code) => code !== entry.code)
    return rest[seed % rest.length]
  }
  const gate = pick(Object.keys(EARNED))
  const second = pick(["MATH 140", "MIS 120", "BUS 101", "ENGL 210"])
  /* Only what comes below it in its own subject: a course cannot be asked for
     by something the student takes before it. */
  const own = (SUBJECT_GATE[entry.code.split(" ")[0]] ?? []).filter((code) => level(code) < depth)
  const later = own.length ? own[seed % own.length] : pick(["ECON 201", "MIS 250", "STAT 210", "BUS 390"])
  const untouched = pick(UNTOUCHED)

  if (depth < 200) return { options: [] }

  if (depth < 300) {
    /* One way in, so the option itself is not worth naming. */
    return { options: laid([summarise([courseNode(gate), CONDITIONS.credits])]) }
  }

  /* The way the student is on: built from what they have and what they are
     taking, so it is the one that reads well. */
  const taking = summarise([courseNode(gate), courseNode(second), CONDITIONS.credits])
  /* The way nobody has started. */
  const cold = summarise([courseNode(untouched), CONDITIONS.second])

  if (depth < 400) {
    return {
      directive: "Complete any one of 2 options",
      options: laid([taking, seed % 2 === 0 ? cold : closed(seed)]),
    }
  }

  /* A final-year course: three ways in, and only one of them open. */
  const deep = summarise([
    {
      label: "Take any one of",
      any: true,
      open: true,
      children: [courseNode(second), courseNode(later)],
    },
    courseNode(gate),
    CONDITIONS.credits,
    CONDITIONS.junior,
  ])
  const shut = closed(seed)
  const none = summarise([courseNode(untouched), CONDITIONS.honors])

  return {
    directive: "Complete any one of 3 options",
    options: laid(seed % 2 === 0 ? [deep, shut, none] : [deep, none, shut]),
  }
}

export function courseDetail(entry: CatalogEntry): CourseDetail {
  const seed = seedOf(entry.code)
  const count = 2 + (seed % 3)

  return {
    credits: CREDITS_PER_COURSE,
    campus: "Main",
    /* The classes on offer are hours out of the same list the week is drawn
       from, so a class named here and a class drawn on the calendar are the
       same class rather than two descriptions that happen to agree. */
    sections: Array.from({ length: count }, (_, i) => {
      const meetings = SECTION_SLOTS[(seed + i * 3) % SECTION_SLOTS.length]
      return {
        code: `Lec-0${i + 1}`,
        when: meetingLines(meetings),
        meetings,
        who: INSTRUCTORS[(seed + i) % INSTRUCTORS.length],
        seats: `${18 + ((seed + i * 7) % 20)}/40`,
      }
    }),
    hidden: 1 + (seed % 3),
    /* The requirement it answers is an attribute like any other; the rest come
       off the shelf, and never the same one twice. */
    attributes: [...new Set([entry.reason, ATTRIBUTES[seed % ATTRIBUTES.length]])],
    topics: [...new Set([TOPICS[seed % TOPICS.length], TOPICS[(seed + 2) % TOPICS.length]])],
    description:
      `${entry.name} is taught around the decisions the work actually turns on: what the ` +
      "numbers are for, who reads them, and what follows from getting them wrong. Coursework " +
      "runs through cases drawn from the last five years, with a term project taken from a " +
      "live brief.",
    requiredSections: [
      { kind: "Lecture", available: count },
      { kind: "Recitation", available: 2 + (seed % 4) },
    ],
    instructors: [
      { name: INSTRUCTORS[seed % INSTRUCTORS.length], semesters: 3 + (seed % 6) },
      { name: INSTRUCTORS[(seed + 3) % INSTRUCTORS.length], semesters: 1 + (seed % 4) },
    ],
    prerequisites: prerequisites(entry, seed),
    equivalents: [`${entry.code.split(" ")[0]}-${300 + (seed % 90)}`, `GEN-${100 + (seed % 80)}`],
    countsFor: [
      { name: entry.reason, under: DEGREE.credential },
      { name: "120 Total Credits", under: "Degree Checks" },
      { name: "Residency Credit", under: "Degree Checks" },
    ],
    repeatLimit: seed % 2 === 0 ? "Can be repeated up to 2 times" : "Cannot be repeated",
  }
}

/* ------------------------------------------------- what the plan makes of it */

/** The courses a prerequisite tree names on the route the student is actually
 *  on — the first option. The others are roads not taken: naming their courses
 *  would have the plan warning about requirements nobody is trying to meet. */
/** Whether the student already has this course behind them — passed before
 *  they arrived, or sitting in the term under way. Neither is in the plan's
 *  years, so a prerequisite answered this way is answered nowhere a term can
 *  see, and something has to say so. */
export function heldAlready(code: string): boolean {
  return EARNED[code] != null || IN_PROGRESS.includes(code)
}

export function prerequisiteCodes(code: string): string[] {
  const tree = prerequisites({ code, name: "", reason: "" }, seedOf(code))
  const out: string[] = []
  const walk = (nodes: PrereqNode[]) =>
    nodes.forEach((node) => {
      if (node.code) out.push(node.code)
      if (node.children) walk(node.children)
    })
  if (tree.options[0]) walk(tree.options[0].children)
  return [...new Set(out)]
}

export type Activity = {
  kind: "add" | "remove"
  term: string
  when: string
  who: string
}

/* What has happened to this course in the plan. A course that has sat where it
 * was first put has one event; one that was moved has the three that says so,
 * newest first. */
export function activityFor(code: string, term: string, moved?: string): Activity[] {
  const seed = seedOf(code)
  /* The student is reading their own plan, so they are "you" — the same way
     the last-activity line says it. The advisor is named, by the name anybody
     would use for him. */
  const student = "you"
  /* An advisor moves a course out of a term now and then; the student puts it
     back. Which of them it was is the seed's business. */
  const remover = seed % 3 === 0 ? "Mark" : student

  if (!moved || seed % 3 === 0) {
    return [{ kind: "add", term, when: "2 months ago", who: student }]
  }
  return [
    { kind: "add", term, when: "3 weeks ago", who: student },
    { kind: "remove", term: moved, when: "1 month ago", who: remover },
    { kind: "add", term: moved, when: "2 months ago", who: student },
  ]
}


const DAY_LETTER = ["", "M", "T", "W", "R", "F", "S"]

function clock(hour: number): string {
  const whole = Math.floor(hour)
  const minutes = Math.round((hour - whole) * 60)
  const suffix = whole >= 12 ? "pm" : "am"
  const shown = whole % 12 === 0 ? 12 : whole % 12
  return `${shown}:${String(minutes).padStart(2, "0")}${suffix}`
}

/** A class's hours the way a section lists them: the days that keep the same
 *  time together on one line, and any that keep another on the next. */
export function meetingLines(meetings: Meeting[] = []): string[] {
  const groups: { days: number[]; from: number; to: number }[] = []
  for (const meeting of meetings) {
    const same = groups.find((g) => g.from === meeting.from && g.to === meeting.to)
    if (same) same.days.push(meeting.day)
    else groups.push({ days: [meeting.day], from: meeting.from, to: meeting.to })
  }
  return groups.map(
    (g) => `${g.days.map((d) => DAY_LETTER[d] ?? "").join("")} ${clock(g.from)} - ${clock(g.to)}`
  )
}

/** Whether a course can be taken as things stand: some option is already
 *  earned in full, or it asks for nothing at all. Anything still waiting on a
 *  course under way has not been met yet, however close it is. */
export function prereqsMet(entry: CatalogEntry): boolean {
  const { options } = prerequisites(entry, seedOf(entry.code))
  return options.length === 0 || options.some((option) => option.state === "earned")
}

export const PREREQ_LABEL = { met: "Met", not: "Not yet" } as const
